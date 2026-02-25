import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { asaasClient } from '@/lib/asaas/client';
import { ASAAS_CONFIG } from '@/lib/asaas/config';

export async function POST() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const user = await db.user.findUnique({
            where: { clerkId: userId },
        });

        if (!user) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
        }

        let currentPlan = null;
        if (user.currentPlanId) {
            currentPlan = await db.plan.findUnique({
                where: { id: user.currentPlanId }
            });
        }

        const isFreePlan = !currentPlan || 
            currentPlan.clerkId === 'free' || 
            currentPlan.name?.toLowerCase().includes('free') ||
            currentPlan.name?.toLowerCase().includes('gratuito');

        if (isFreePlan) {
            return NextResponse.json({ 
                error: 'Você não possui uma assinatura ativa para cancelar' 
            }, { status: 400 });
        }

        if (user.cancellationScheduled) {
            return NextResponse.json({ 
                error: 'Sua assinatura já está agendada para cancelamento',
                scheduledFor: user.billingPeriodEnd?.toISOString()
            }, { status: 400 });
        }

        const isMpesaPlan = (currentPlan?.currency || '').toLowerCase() === 'mzn';
        if (isMpesaPlan) {
            await db.user.update({
                where: { id: user.id },
                data: { 
                    cancellationScheduled: true,
                    cancellationDate: new Date(),
                },
            });

            await db.subscriptionEvent.create({
                data: {
                    userId: user.id,
                    clerkUserId: userId,
                    status: 'CANCELLED',
                    eventType: 'SUBSCRIPTION_CANCELLED',
                    metadata: {
                        cancelledAt: new Date().toISOString(),
                        effectiveUntil: user.billingPeriodEnd?.toISOString() || '',
                        previousPlan: currentPlan?.name || '',
                        provider: 'mpesa',
                    },
                },
            });

            return NextResponse.json({
                success: true,
                message: 'Assinatura cancelada com sucesso',
                effectiveUntil: user.billingPeriodEnd?.toISOString(),
            });
        }

        const customerId = ASAAS_CONFIG.isSandbox 
            ? user.asaasCustomerIdSandbox 
            : user.asaasCustomerIdProduction;

        if (!customerId && !user.asaasCustomerId) {
            return NextResponse.json({ 
                error: 'Cliente Asaas não encontrado' 
            }, { status: 404 });
        }

        const effectiveCustomerId = customerId || user.asaasCustomerId;

        let cancelledSubscriptionId: string | null = null;

        if (user.asaasSubscriptionId) {
            try {
                const result = await asaasClient.cancelSubscription(user.asaasSubscriptionId);
                if (!result.deleted) {
                    console.error(`[Cancel] Asaas did not confirm deletion for ${user.asaasSubscriptionId}`);
                    return NextResponse.json({ 
                        error: 'Não foi possível cancelar a assinatura no provedor de pagamento. Tente novamente.' 
                    }, { status: 502 });
                }
                cancelledSubscriptionId = user.asaasSubscriptionId;
                console.log(`[Cancel] Cancelled subscription ${user.asaasSubscriptionId} for user ${userId}`);
            } catch (asaasError) {
                console.error('[Cancel] Asaas error:', asaasError);
                return NextResponse.json({ 
                    error: 'Erro ao comunicar com o provedor de pagamento. Tente novamente mais tarde.' 
                }, { status: 502 });
            }
        } else if (effectiveCustomerId) {
            try {
                const subscriptions = await asaasClient.listCustomerSubscriptions(effectiveCustomerId);
                const activeSubscriptions = subscriptions.data.filter(
                    (sub) => sub.id && !sub.id.includes('DELETED')
                );
                
                if (activeSubscriptions.length === 0) {
                    console.error(`[Cancel] No active subscriptions found for customer ${effectiveCustomerId}`);
                    return NextResponse.json({ 
                        error: 'Nenhuma assinatura ativa encontrada no provedor de pagamento. Entre em contato com o suporte se você acredita que isso é um erro.' 
                    }, { status: 404 });
                }

                for (const sub of activeSubscriptions) {
                    const result = await asaasClient.cancelSubscription(sub.id);
                    if (!result.deleted) {
                        console.error(`[Cancel] Asaas did not confirm deletion for ${sub.id}`);
                        return NextResponse.json({ 
                            error: 'Não foi possível cancelar a assinatura no provedor de pagamento. Tente novamente.' 
                        }, { status: 502 });
                    }
                    cancelledSubscriptionId = sub.id;
                    console.log(`[Cancel] Cancelled subscription ${sub.id} for user ${userId}`);
                }
            } catch (asaasError) {
                console.error('[Cancel] Asaas error:', asaasError);
                return NextResponse.json({ 
                    error: 'Erro ao comunicar com o provedor de pagamento. Tente novamente mais tarde.' 
                }, { status: 502 });
            }
        } else {
            console.error(`[Cancel] No subscription ID or customer ID found for user ${userId}`);
            return NextResponse.json({ 
                error: 'Não foi possível encontrar informações de assinatura. Entre em contato com o suporte.' 
            }, { status: 404 });
        }

        if (!cancelledSubscriptionId) {
            console.error(`[Cancel] Failed to cancel subscription - no confirmation received for user ${userId}`);
            return NextResponse.json({ 
                error: 'Não foi possível confirmar o cancelamento. Tente novamente.' 
            }, { status: 500 });
        }

        await db.user.update({
            where: { id: user.id },
            data: { 
                asaasSubscriptionId: null,
                cancellationScheduled: true,
                cancellationDate: new Date(),
            },
        });

        await db.subscriptionEvent.create({
            data: {
                userId: user.id,
                clerkUserId: userId,
                status: 'CANCELLED',
                eventType: 'SUBSCRIPTION_CANCELLED',
                metadata: {
                    cancelledAt: new Date().toISOString(),
                    effectiveUntil: user.billingPeriodEnd?.toISOString() || '',
                    previousPlan: currentPlan?.name || '',
                    asaasSubscriptionId: cancelledSubscriptionId || 'unknown',
                },
            },
        });

        console.log(`[Cancel] Subscription cancelled for user ${userId}. Access until: ${user.billingPeriodEnd}`);

        return NextResponse.json({
            success: true,
            message: 'Assinatura cancelada com sucesso',
            effectiveUntil: user.billingPeriodEnd?.toISOString(),
        });
    } catch (error) {
        console.error('[Cancel] Error:', error);
        return NextResponse.json(
            { error: 'Erro ao cancelar assinatura' },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { asaasClient } from '@/lib/asaas/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type AsaasEventType =
    | 'PAYMENT_CREATED'
    | 'PAYMENT_CONFIRMED'
    | 'PAYMENT_RECEIVED'
    | 'PAYMENT_OVERDUE'
    | 'PAYMENT_DELETED'
    | 'PAYMENT_UPDATED'
    | 'PAYMENT_REFUNDED';

interface AsaasPayment {
    id: string;
    customer: string;
    subscription?: string;
    value: number;
    netValue: number;
    billingType: string;
    status: string;
    dueDate: string;
    paymentDate?: string;
    invoiceUrl?: string;
    externalReference?: string;
}

interface AsaasWebhookEvent {
    id: string;
    event: AsaasEventType;
    dateCreated: string;
    payment?: AsaasPayment;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as AsaasWebhookEvent;
        const { event, payment } = body;

        console.log(`[Webhook] Received event: ${event}`);

        if (!payment) {
            console.log('[Webhook] No payment object in event');
            return NextResponse.json({ received: true });
        }

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { asaasCustomerId: payment.customer },
                    { asaasCustomerIdSandbox: payment.customer },
                    { asaasCustomerIdProduction: payment.customer }
                ]
            },
        });

        if (!user) {
            console.error(`[Webhook] User not found for Asaas customer: ${payment.customer}`);
            return NextResponse.json({ received: true });
        }

        console.log(`[Webhook] Processing for user: ${user.email}`);

        await prisma.subscriptionEvent.create({
            data: {
                userId: user.id,
                clerkUserId: user.clerkId,
                status: payment.status,
                eventType: event,
                metadata: JSON.parse(JSON.stringify(body)),
            },
        });

        if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
            console.log(`[Webhook] Processing ${event} for payment ${payment.id}`);

            let planId: string | undefined;

            if (payment.subscription) {
                try {
                    const subscription = await asaasClient.getSubscription(payment.subscription);
                    planId = subscription.externalReference;
                } catch (subError) {
                    console.error('[Webhook] Error fetching subscription:', subError);
                }
            }

            if (!planId && payment.externalReference) {
                planId = payment.externalReference;
            }

            if (planId) {
                const dbPlan = await prisma.plan.findUnique({
                    where: { id: planId }
                });

                if (dbPlan) {
                    const billingPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                    await prisma.creditBalance.upsert({
                        where: { userId: user.id },
                        create: {
                            userId: user.id,
                            clerkUserId: user.clerkId,
                            creditsRemaining: dbPlan.credits,
                            lastSyncedAt: new Date(),
                        },
                        update: {
                            creditsRemaining: dbPlan.credits,
                            lastSyncedAt: new Date(),
                        },
                    });

                    await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            asaasSubscriptionId: payment.subscription,
                            currentPlanId: dbPlan.id,
                            billingPeriodEnd: billingPeriodEnd,
                            cancellationScheduled: false,
                            cancellationDate: null,
                        }
                    });

                    console.log(`[Webhook] Credits updated: ${user.email} -> ${dbPlan.credits} credits from ${dbPlan.name}`);
                } else {
                    console.warn(`[Webhook] Plan not found: ${planId}`);
                }
            } else {
                console.error(`[Webhook] No planId found - subscription: ${payment.subscription}, externalReference: ${payment.externalReference}`);
            }
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Error processing Asaas webhook:', error);
        return NextResponse.json({ received: true });
    }
}

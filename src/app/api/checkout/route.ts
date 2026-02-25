import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db as prisma } from '@/lib/db';
import { asaasClient } from '@/lib/asaas/client';
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '@/lib/clerk/subscription-utils';
import { ASAAS_MIN_VALUE, ASAAS_CONFIG } from '@/lib/asaas/config';
import { assertMpesaConfig, MPESA_CONFIG } from '@/lib/mpesa/config';
import { mpesaC2BSingleStage } from '@/lib/mpesa/client';
import { isValidVodacomMsisdn, normalizeMsisdn } from '@/lib/mpesa/validation';

export const runtime = 'nodejs';
export const maxDuration = 70;

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        const user = await currentUser();

        if (!userId || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { planId, period, cpfCnpj, billingType = 'UNDEFINED', phoneNumber } = await request.json();

        // Try to find in static plans first
        let plan: SubscriptionPlan | undefined = SUBSCRIPTION_PLANS[planId];
        let price = plan?.priceMonthly;
        let currency = 'brl';
        let priceCents: number | null = null;

        // If not found, try to find in DB
        if (!plan) {
            const dbPlan = await prisma.plan.findUnique({
                where: { id: planId }
            });

            if (dbPlan) {
                currency = dbPlan.currency?.toLowerCase() || 'brl';

                // Construct a plan object from DB data
                plan = {
                    id: dbPlan.id,
                    name: dbPlan.name,
                    credits: dbPlan.credits,
                    features: [], // Features might be needed if we want to display them, but for checkout we just need price
                    priceMonthly: dbPlan.priceMonthlyCents ? dbPlan.priceMonthlyCents / 100 : undefined,
                };

                // Determine price based on period
                if (period === 'YEARLY' && dbPlan.priceYearlyCents) {
                    price = dbPlan.priceYearlyCents / 100;
                    priceCents = dbPlan.priceYearlyCents;
                } else {
                    price = dbPlan.priceMonthlyCents ? dbPlan.priceMonthlyCents / 100 : 0;
                    priceCents = dbPlan.priceMonthlyCents ?? 0;
                }
            }
        }

        if (!plan) {
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
        }

        if (priceCents === null && typeof price === 'number') {
            priceCents = Math.round(price * 100);
        }

        const providerSetting = (process.env.PAYMENT_PROVIDER || 'auto').toLowerCase();
        const paymentProvider = providerSetting === 'mpesa' || providerSetting === 'asaas'
            ? providerSetting
            : (currency === 'mzn' ? 'mpesa' : 'asaas');

        // Handle free plan or zero price
        if (!price || price === 0) {
            const dbUser = await prisma.user.findUnique({
                where: { clerkId: userId },
            });
            
            if (dbUser) {
                const freePlan = await prisma.plan.findFirst({
                    where: {
                        OR: [
                            { id: planId },
                            { clerkId: 'free' },
                            { name: { contains: 'gratuito', mode: 'insensitive' } }
                        ],
                        active: true
                    }
                });
                
                const credits = freePlan?.credits ?? plan.credits ?? 100;
                const billingPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                
                await prisma.creditBalance.upsert({
                    where: { userId: dbUser.id },
                    create: {
                        userId: dbUser.id,
                        clerkUserId: userId,
                        creditsRemaining: credits,
                        lastSyncedAt: new Date(),
                    },
                    update: {
                        creditsRemaining: credits,
                        lastSyncedAt: new Date(),
                    },
                });
                
                await prisma.user.update({
                    where: { id: dbUser.id },
                    data: {
                        currentPlanId: freePlan?.id ?? null,
                        billingPeriodEnd: billingPeriodEnd,
                        cancellationScheduled: false,
                        cancellationDate: null,
                    }
                });
            }
            
            return NextResponse.json({ success: true });
        }

        if (paymentProvider === 'asaas') {
            if (!cpfCnpj) {
                return NextResponse.json({ error: 'CPF/CNPJ é obrigatório' }, { status: 400 });
            }

            if (currency !== 'brl') {
                return NextResponse.json({
                    error: 'Este plano não está disponível para compra. Apenas planos em BRL (Real brasileiro) podem ser processados pelo Asaas.'
                }, { status: 400 });
            }

            // All subscriptions use UNDEFINED billing type
            // This allows customers to choose payment method (PIX, Boleto, or Credit Card) on the invoice
            if (billingType !== 'UNDEFINED') {
                return NextResponse.json({ error: 'Forma de pagamento inválida' }, { status: 400 });
            }

            // Validate minimum value required by Asaas (R$ 5.00)
            if (price < ASAAS_MIN_VALUE) {
                return NextResponse.json({
                    error: `O valor mínimo para assinaturas é R$ ${ASAAS_MIN_VALUE.toFixed(2)}. O plano selecionado tem valor de R$ ${price.toFixed(2)}.`
                }, { status: 400 });
            }
        }

        // Get or Create Asaas Customer
        const dbUser = await prisma.user.findUnique({
            where: { clerkId: userId },
        });

        if (!dbUser) {
            return NextResponse.json({ error: 'User record not found' }, { status: 404 });
        }

        if (paymentProvider === 'mpesa') {
            assertMpesaConfig();

            const normalized = normalizeMsisdn(String(phoneNumber || ''));
            if (!normalized || !isValidVodacomMsisdn(normalized)) {
                return NextResponse.json({ error: 'Número Vodacom inválido. Use formato +25884xxxxxxx ou +25885xxxxxxx.' }, { status: 400 });
            }

            if (!priceCents || priceCents <= 0) {
                return NextResponse.json({ error: 'Valor inválido para cobrança' }, { status: 400 });
            }

            if (priceCents % 100 !== 0) {
                return NextResponse.json({ error: 'O valor do plano deve ser inteiro em MZN (sem centavos).' }, { status: 400 });
            }

            const amount = String(priceCents / 100);

            const makeRef = (prefix: string) => {
                const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
                const ts = Date.now().toString(36).slice(-4).toUpperCase();
                return `${prefix}${ts}${rand}`.slice(0, 20);
            };

            const transactionReference = makeRef('T');
            const thirdPartyReference = makeRef('P');

            console.log('[Checkout] M-Pesa payment attempt:', {
                phone: normalized,
                amount,
                serviceProviderCode: MPESA_CONFIG.serviceProviderCode,
                baseUrl: MPESA_CONFIG.baseUrl,
                hasApiKey: !!MPESA_CONFIG.apiKey,
                hasPublicKey: !!MPESA_CONFIG.publicKey,
            });

            let body: { output_ResponseCode?: string; output_ResponseDesc?: string } & Record<string, unknown>;
            try {
                const result = await mpesaC2BSingleStage({
                    transactionReference,
                    customerMsisdn: normalized,
                    amount,
                    thirdPartyReference,
                    serviceProviderCode: MPESA_CONFIG.serviceProviderCode,
                });
                body = result.body as typeof body;
            } catch (err) {
                console.error('[Checkout] M-Pesa error:', err instanceof Error ? err.message : err);
                console.error('[Checkout] M-Pesa error details:', JSON.stringify((err as Error & { body?: Record<string, unknown> }).body ?? {}, null, 2));
                const status = (err as Error & { status?: number }).status ?? 502;
                const errBody = (err as Error & { body?: Record<string, unknown> }).body ?? {};

                await prisma.subscriptionEvent.create({
                    data: {
                        userId: dbUser.id,
                        clerkUserId: userId,
                        planKey: plan.id,
                        status: (errBody as { output_ResponseCode?: string })?.output_ResponseCode || 'ERROR',
                        eventType: 'MPESA_PAYMENT_ATTEMPT',
                        metadata: JSON.parse(JSON.stringify({
                            provider: 'mpesa',
                            phoneNumber: normalized,
                            amount,
                            currency,
                            transactionReference,
                            thirdPartyReference,
                            response: errBody,
                            error: err instanceof Error ? err.message : 'Unknown error',
                        })),
                    },
                });

                return NextResponse.json({
                    error: (errBody as { output_ResponseDesc?: string })?.output_ResponseDesc || 'Erro ao comunicar com o M-Pesa',
                    code: (errBody as { output_ResponseCode?: string })?.output_ResponseCode || 'ERROR',
                }, { status });
            }

            await prisma.subscriptionEvent.create({
                data: {
                    userId: dbUser.id,
                    clerkUserId: userId,
                    planKey: plan.id,
                    status: (body as { output_ResponseCode?: string })?.output_ResponseCode || 'UNKNOWN',
                    eventType: 'MPESA_PAYMENT_ATTEMPT',
                    metadata: JSON.parse(JSON.stringify({
                        provider: 'mpesa',
                        phoneNumber: normalized,
                        amount,
                        currency,
                        transactionReference,
                        thirdPartyReference,
                        response: body,
                    })),
                },
            });

            if ((body as { output_ResponseCode?: string }).output_ResponseCode !== 'INS-0') {
                return NextResponse.json({
                    error: (body as { output_ResponseDesc?: string }).output_ResponseDesc || 'Pagamento não autorizado',
                    code: (body as { output_ResponseCode?: string }).output_ResponseCode || 'UNKNOWN',
                }, { status: 400 });
            }

            const billingPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            await prisma.creditBalance.upsert({
                where: { userId: dbUser.id },
                create: {
                    userId: dbUser.id,
                    clerkUserId: userId,
                    creditsRemaining: plan.credits,
                    lastSyncedAt: new Date(),
                },
                update: {
                    creditsRemaining: plan.credits,
                    lastSyncedAt: new Date(),
                },
            });

            await prisma.user.update({
                where: { id: dbUser.id },
                data: {
                    currentPlanId: plan.id,
                    billingPeriodEnd: billingPeriodEnd,
                    cancellationScheduled: false,
                    cancellationDate: null,
                }
            });

            return NextResponse.json({ success: true });
        }

        const { isSandbox } = ASAAS_CONFIG;
        let asaasCustomerId = isSandbox ? dbUser.asaasCustomerIdSandbox : dbUser.asaasCustomerIdProduction;

        // Se já tem cliente Asaas mas não tem CPF salvo, atualiza
        if (asaasCustomerId && !dbUser.cpfCnpj) {
            await asaasClient.updateCustomer(asaasCustomerId, { cpfCnpj });
            await prisma.user.update({
                where: { id: dbUser.id },
                data: { cpfCnpj },
            });
        }

        if (!asaasCustomerId) {
            // Check if customer exists in Asaas by email
            const existingCustomer = await asaasClient.getCustomerByEmail(user.emailAddresses[0].emailAddress);

            if (existingCustomer) {
                asaasCustomerId = existingCustomer.id;
                // Atualizar CPF se não existir no cliente
                if (!existingCustomer.cpfCnpj) {
                    await asaasClient.updateCustomer(asaasCustomerId, { cpfCnpj });
                }
            } else {
                const newCustomer = await asaasClient.createCustomer({
                    name: `${user.firstName} ${user.lastName}`.trim(),
                    email: user.emailAddresses[0].emailAddress,
                    cpfCnpj,
                });
                asaasCustomerId = newCustomer.id;
            }

            // Salvar CPF no banco
            await prisma.user.update({
                where: { id: dbUser.id },
                data: { cpfCnpj },
            });

            const updateData = isSandbox 
                ? { asaasCustomerIdSandbox: asaasCustomerId, asaasCustomerId }
                : { asaasCustomerIdProduction: asaasCustomerId, asaasCustomerId };

            await prisma.user.update({
                where: { id: dbUser.id },
                data: updateData,
            });
        }

        // Create Subscription with callback URL
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000';

        // IMPORTANT: Callback behavior with Asaas
        // 1. If you have a webhook URL configured in Asaas dashboard (recommended):
        //    - The webhook URL MUST match your NEXT_PUBLIC_APP_URL base
        //    - Webhook: Receives payment EVENTS (PAYMENT_RECEIVED, etc.) at /api/webhooks/asaas
        //    - Callback: Redirects USER after payment at /dashboard?payment=success
        //    - Both URLs must be from the same domain
        //
        // 2. If you DON'T have a webhook URL configured:
        //    - Payment events won't be automatically processed
        //    - User will still be redirected after payment (callback works)
        //    - You'll need to manually check payment status or rely on user actions

        if (!process.env.NEXT_PUBLIC_APP_URL) {
            console.warn('[Checkout] WARNING: NEXT_PUBLIC_APP_URL not configured - webhook and callback may not work correctly');
        }

        const subscription = await asaasClient.createSubscription({
            customer: asaasCustomerId,
            value: price,
            nextDueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
            cycle: period === 'YEARLY' ? 'YEARLY' : 'MONTHLY',
            billingType,
            externalReference: planId, // This will be the DB ID or the static plan ID
            callback: {
                successUrl: `${appUrl}/dashboard?payment=success&plan=${planId}`,
                autoRedirect: true,
            },
        });

        // Get the first payment to redirect user
        // Asaas creates payments asynchronously, so we need to wait/retry
        let invoiceUrl: string | undefined;
        
        for (let attempt = 0; attempt < 5; attempt++) {
            const payments = await asaasClient.getSubscriptionPayments(subscription.id);
            const firstPayment = payments.data[0] as { invoiceUrl: string } | undefined;
            
            if (firstPayment?.invoiceUrl) {
                invoiceUrl = firstPayment.invoiceUrl;
                break;
            }
            
            // Wait 1 second before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (!invoiceUrl) {
            console.error('Failed to get payment URL after retries for subscription:', subscription.id);
            // Return subscription ID so frontend can show a message
            return NextResponse.json({ 
                error: 'Pagamento está sendo processado. Por favor, aguarde alguns segundos e tente novamente.',
                subscriptionId: subscription.id 
            }, { status: 202 });
        }

        return NextResponse.json({ url: invoiceUrl });

    } catch (error) {
        console.error('Checkout error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to check webhook status
 * GET /api/webhooks/asaas/debug
 */
export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user info
        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
            include: {
                creditBalance: true,
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get recent subscription events
        const recentEvents = await prisma.subscriptionEvent.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });

        // Get current plan info
        let currentPlan = null;
        if (user.currentPlanId) {
            currentPlan = await prisma.plan.findUnique({
                where: { id: user.currentPlanId }
            });
        }

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                clerkId: user.clerkId,
                asaasCustomerId: user.asaasCustomerId,
                asaasCustomerIdSandbox: user.asaasCustomerIdSandbox,
                asaasCustomerIdProduction: user.asaasCustomerIdProduction,
                asaasSubscriptionId: user.asaasSubscriptionId,
                currentPlanId: user.currentPlanId,
                billingPeriodEnd: user.billingPeriodEnd,
            },
            creditBalance: user.creditBalance ? {
                creditsRemaining: user.creditBalance.creditsRemaining,
                lastSyncedAt: user.creditBalance.lastSyncedAt,
            } : null,
            currentPlan: currentPlan ? {
                id: currentPlan.id,
                name: currentPlan.name,
                credits: currentPlan.credits,
            } : null,
            recentEvents: recentEvents.map(e => ({
                id: e.id,
                eventType: e.eventType,
                status: e.status,
                createdAt: e.createdAt,
                metadata: e.metadata,
            })),
            diagnostics: {
                hasAsaasCustomer: !!(user.asaasCustomerId || user.asaasCustomerIdSandbox || user.asaasCustomerIdProduction),
                hasSubscription: !!user.asaasSubscriptionId,
                hasPlan: !!user.currentPlanId,
                hasCredits: !!user.creditBalance,
                totalEventsReceived: recentEvents.length,
                paymentEventsReceived: recentEvents.filter(e =>
                    e.eventType === 'PAYMENT_RECEIVED' || e.eventType === 'PAYMENT_CONFIRMED'
                ).length,
            }
        });
    } catch (error) {
        console.error('Debug endpoint error:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            message: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

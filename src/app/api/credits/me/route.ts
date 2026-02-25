import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getUserFromClerkId } from '@/lib/auth-utils';
import { withApiLogging } from '@/lib/logging/api';
import { getPlanCredits } from '@/lib/credits/settings';

async function checkAndProcessCancellation(clerkUserId: string) {
  try {
    const dbUser = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      include: { creditBalance: true }
    });

    if (!dbUser) {
      return false;
    }

    if (!dbUser.cancellationScheduled) {
      return false;
    }

    const billingPeriodEnd = dbUser.billingPeriodEnd;
    if (!billingPeriodEnd) {
      return false;
    }

    const now = new Date();
    if (now < billingPeriodEnd) {
      return false;
    }

    console.log(`[Credits] Processing scheduled cancellation for user ${clerkUserId}`);

    const freePlan = await db.plan.findFirst({
      where: {
        OR: [
          { clerkId: 'free' },
          { name: { contains: 'free', mode: 'insensitive' } },
          { name: { contains: 'gratuito', mode: 'insensitive' } }
        ],
        active: true
      },
      orderBy: { credits: 'asc' }
    });

    const freeCredits = freePlan?.credits ?? await getPlanCredits('free');
    const newBillingEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await db.creditBalance.upsert({
      where: { userId: dbUser.id },
      create: {
        userId: dbUser.id,
        clerkUserId,
        creditsRemaining: freeCredits,
        lastSyncedAt: new Date(),
      },
      update: {
        creditsRemaining: freeCredits,
        lastSyncedAt: new Date(),
      },
    });

    await db.user.update({
      where: { id: dbUser.id },
      data: {
        currentPlanId: freePlan?.id ?? null,
        asaasSubscriptionId: null,
        billingPeriodEnd: newBillingEnd,
        cancellationScheduled: false,
        cancellationDate: null,
      }
    });

    console.log(`[Credits] User ${clerkUserId} downgraded to free plan with ${freeCredits} credits`);
    return true;
  } catch (error) {
    console.error('[Credits] Error processing cancellation:', error);
    return false;
  }
}

async function handleGetCredits() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await checkAndProcessCancellation(userId);

    const user = await getUserFromClerkId(userId);
    const balance = await db.creditBalance.findUnique({ where: { userId: user.id } });

    const dbUser = await db.user.findUnique({ where: { clerkId: userId } });

    let currentPlan = null;

    if (dbUser?.currentPlanId) {
      currentPlan = await db.plan.findUnique({
        where: { id: dbUser.currentPlanId }
      });
    }

    if (!currentPlan) {
      currentPlan = await db.plan.findFirst({
        where: {
          OR: [
            { clerkId: 'free' },
            { name: { contains: 'free', mode: 'insensitive' } },
            { name: { contains: 'gratuito', mode: 'insensitive' } }
          ],
          active: true
        },
        orderBy: { credits: 'asc' }
      });
    }

    const creditsRemaining = balance?.creditsRemaining ?? 0;
    const creditsTotal = currentPlan?.credits ?? 100;

    return NextResponse.json({
      creditsRemaining,
      creditsTotal,
      plan: currentPlan?.name ?? 'Gratuito',
      planId: currentPlan?.id ?? null,
      lastSyncedAt: balance?.lastSyncedAt ?? null,
      billingPeriodEnd: dbUser?.billingPeriodEnd?.toISOString() ?? null,
      cancellationScheduled: dbUser?.cancellationScheduled ?? false,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('[Credits API] Error:', errorMessage);
    console.error('[Credits API] Stack:', errorStack);
    return NextResponse.json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}

export const GET = withApiLogging(handleGetCredits, {
  method: 'GET',
  route: '/api/credits/me',
  feature: 'credits',
});

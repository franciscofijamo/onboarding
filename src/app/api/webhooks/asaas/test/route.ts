import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  return NextResponse.json({ 
    message: 'Asaas webhook test endpoint',
    webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/asaas`,
    instructions: 'POST to this endpoint with clerkUserId and planId to simulate a payment confirmation'
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clerkUserId, planId } = body;

    if (!clerkUserId || !planId) {
      return NextResponse.json({ 
        error: 'Missing clerkUserId or planId',
        example: { clerkUserId: 'user_xxx', planId: 'plan-id-from-database' }
      }, { status: 400 });
    }

    const plan = await db.plan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      const allPlans = await db.plan.findMany({ select: { id: true, name: true } });
      return NextResponse.json({ 
        error: `Plan not found: ${planId}`,
        availablePlans: allPlans
      }, { status: 404 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId }
    });

    if (!user) {
      return NextResponse.json({ 
        error: `User not found: ${clerkUserId}`
      }, { status: 404 });
    }

    console.log(`[Webhook Test] Simulating payment for user ${clerkUserId} to plan ${plan.name}`);

    const billingPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.creditBalance.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        clerkUserId: clerkUserId,
        creditsRemaining: plan.credits,
        lastSyncedAt: new Date(),
      },
      update: {
        creditsRemaining: plan.credits,
        lastSyncedAt: new Date(),
      },
    });

    await db.user.update({
      where: { id: user.id },
      data: {
        currentPlanId: plan.id,
        billingPeriodEnd: billingPeriodEnd,
        cancellationScheduled: false,
        cancellationDate: null,
      }
    });

    const updatedUser = await db.user.findUnique({
      where: { id: user.id },
      include: { creditBalance: true }
    });

    return NextResponse.json({
      success: true,
      message: `Credits updated for user ${clerkUserId}`,
      plan: plan.name,
      credits: plan.credits,
      userData: {
        currentPlanId: updatedUser?.currentPlanId,
        creditsRemaining: updatedUser?.creditBalance?.creditsRemaining,
        billingPeriodEnd: updatedUser?.billingPeriodEnd?.toISOString()
      }
    });
  } catch (error) {
    console.error('[Webhook Test] Error:', error);
    return NextResponse.json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

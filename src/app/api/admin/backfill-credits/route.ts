import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const usersWithoutBalance = await db.user.findMany({
      where: {
        creditBalance: null
      },
      include: {
        creditBalance: true
      }
    });

    console.log(`[Backfill] Found ${usersWithoutBalance.length} users without CreditBalance`);

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

    const defaultCredits = freePlan?.credits ?? 100;
    let created = 0;

    for (const user of usersWithoutBalance) {
      let credits = defaultCredits;
      
      if (user.currentPlanId) {
        const userPlan = await db.plan.findUnique({ where: { id: user.currentPlanId } });
        if (userPlan) {
          credits = userPlan.credits;
        }
      }

      await db.creditBalance.create({
        data: {
          userId: user.id,
          clerkUserId: user.clerkId,
          creditsRemaining: credits,
          lastSyncedAt: new Date(),
        }
      });
      created++;
      console.log(`[Backfill] Created CreditBalance for user ${user.email} with ${credits} credits`);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Created ${created} CreditBalance records`,
      usersProcessed: created
    });
  } catch (error) {
    console.error('[Backfill] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

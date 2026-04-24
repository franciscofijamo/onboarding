import { db } from '@/lib/db';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { DEFAULT_LOCALE } from '@/i18n';


export async function getUserFromClerkId(clerkId: string) {
  let user = await db.user.findUnique({
    where: { clerkId },
    include: { creditBalance: true },
  });

  if (!user) {
    let email: string | null = null;
    let name: string | null = null;

    try {
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(clerkId);
      email = clerkUser.emailAddresses?.find(
        (e) => e.id === clerkUser.primaryEmailAddressId
      )?.emailAddress ?? null;
      const first = clerkUser.firstName ?? '';
      const last = clerkUser.lastName ?? '';
      name = `${first} ${last}`.trim() || null;
    } catch (err) {
      console.error('[auth-utils] Failed to fetch Clerk user info:', err);
    }

    const freeCredits = Math.max(0, Math.floor(Number(process.env.FREE_CREDITS_ON_SIGNUP || '0')));

    try {
      user = await db.$transaction(async (tx) => {
        const existing = await tx.user.findUnique({
          where: { clerkId },
          include: { creditBalance: true },
        });
        if (existing) return existing;

        if (email) {
          const existingByEmail = await tx.user.findUnique({
            where: { email },
            include: { creditBalance: true },
          });
          if (existingByEmail) {
            const updated = await tx.user.update({
              where: { id: existingByEmail.id },
              data: { clerkId, name: name || existingByEmail.name },
              include: { creditBalance: true },
            });
            console.log(`[auth-utils] Linked existing user ${email} to clerkId ${clerkId}`);
            return updated;
          }
        }

        const created = await tx.user.create({
          data: { clerkId, email, name },
        });

        await tx.creditBalance.upsert({
          where: { userId: created.id },
          create: {
            userId: created.id,
            clerkUserId: clerkId,
            creditsRemaining: freeCredits,
          },
          update: {},
        });

        console.log(`[auth-utils] Auto-created user ${email ?? clerkId} with ${freeCredits} free credits`);

        return tx.user.findUnique({
          where: { clerkId },
          include: { creditBalance: true },
        });
      }) as NonNullable<typeof user>;
    } catch (err: unknown) {
      const prismaErr = err as { code?: string };
      if (prismaErr.code === 'P2002') {
        user = await db.user.findFirst({
          where: { OR: [{ clerkId }, ...(email ? [{ email }] : [])] },
          include: { creditBalance: true },
        });
        if (user && user.clerkId !== clerkId) {
          user = await db.user.update({
            where: { id: user.id },
            data: { clerkId },
            include: { creditBalance: true },
          });
          console.log(`[auth-utils] Resolved conflict: linked ${email} to clerkId ${clerkId}`);
        }
      } else {
        throw err;
      }
    }
  }

  if (user && !user.creditBalance) {
    const freeCredits = Math.max(0, Math.floor(Number(process.env.FREE_CREDITS_ON_SIGNUP || '0')));

    await db.creditBalance.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        clerkUserId: clerkId,
        creditsRemaining: freeCredits,
      },
      update: {},
    });

    console.log(`[auth-utils] Backfilled CreditBalance for user ${user.email ?? clerkId} with ${freeCredits} credits`);
  }

  return user;
}

export function createAuthErrorResponse(message: string, status: number = 401) {
  return NextResponse.json(
    { error: message, success: false },
    { status }
  );
}

export async function validateUserAuthentication() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  return userId;
}

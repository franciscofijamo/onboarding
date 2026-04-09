import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getUserFromClerkId } from '@/lib/auth-utils';
import { z } from 'zod';

const roleUpdateSchema = z.object({
  role: z.enum(['CANDIDATE', 'RECRUITER']),
});

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromClerkId(userId);
    return NextResponse.json({ role: user.role });
  } catch (error) {
    console.error('[Role API] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = roleUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const role = validation.data.role;
    const user = await getUserFromClerkId(userId);

    await db.user.update({
      where: { id: user.id },
      data: { role },
    });

    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { role },
    });

    return NextResponse.json({ success: true, role });
  } catch (error) {
    console.error('[Role API] PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

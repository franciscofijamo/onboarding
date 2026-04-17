import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const posting = await db.jobPosting.findFirst({
      where: { id, status: 'PUBLISHED' },
      include: {
        company: {
          select: { name: true, location: true, website: true, description: true, logoUrl: true, updatedAt: true },
        },
      },
    });

    if (!posting) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { userId: clerkId } = await auth();
    let userHasApplied = false;

    if (clerkId) {
      const user = await db.user.findUnique({
        where: { clerkId },
        select: { id: true },
      });

      if (user) {
        const application = await db.jobApplication.findFirst({
          where: {
            userId: user.id,
            jobPostingId: id,
          },
          select: { id: true },
        });
        userHasApplied = !!application;
      }
    }

    return NextResponse.json({ posting, userHasApplied });
  } catch (error) {
    console.error('[Jobs Public API] GET [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

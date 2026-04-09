import { NextRequest, NextResponse } from 'next/server';
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
          select: { name: true, location: true, website: true, email: true, description: true },
        },
      },
    });

    if (!posting) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ posting: { ...posting, applicationCount: 0 } });
  } catch (error) {
    console.error('[Jobs Public API] GET [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getUserFromClerkId } from '@/lib/auth-utils';
import { z } from 'zod';

const PIPELINE_STAGES = ['RECEIVED', 'REVIEWING', 'INTERVIEW', 'OFFER', 'REJECTED', 'ACCEPTED'] as const;
type PipelineStage = (typeof PIPELINE_STAGES)[number];

const MoveStageSchema = z.object({
  stage: z.enum(PIPELINE_STAGES),
  notes: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const recruiter = await getUserFromClerkId(clerkId);
    if (recruiter.role !== 'RECRUITER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: postingId, entryId } = await params;

    const company = await db.company.findUnique({ where: { userId: recruiter.id } });
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    const posting = await db.jobPosting.findFirst({
      where: { id: postingId, companyId: company.id },
    });
    if (!posting) return NextResponse.json({ error: 'Forbidden or not found' }, { status: 403 });

    const body = await request.json();
    const validation = MoveStageSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.flatten() }, { status: 400 });
    }

    const { stage, notes } = validation.data;

    const entry = await db.candidatePipelineEntry.findFirst({
      where: { id: entryId, jobPostingId: postingId },
    });
    if (!entry) return NextResponse.json({ error: 'Pipeline entry not found' }, { status: 404 });

    if (entry.currentStage === stage) {
      return NextResponse.json({ entry });
    }

    const [updated] = await db.$transaction([
      db.candidatePipelineEntry.update({
        where: { id: entryId },
        data: {
          currentStage: stage as PipelineStage,
          ...(notes !== undefined ? { notes } : {}),
        },
      }),
      db.candidateStageHistory.create({
        data: {
          entryId,
          movedBy: recruiter.id,
          fromStage: entry.currentStage,
          toStage: stage as PipelineStage,
        },
      }),
    ]);

    return NextResponse.json({ entry: updated });
  } catch (error) {
    console.error('[Recruiter Pipeline Move API] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getUserFromClerkId } from '@/lib/auth-utils';
import { z } from 'zod';

const PIPELINE_STAGES = ['RECEIVED', 'REVIEWING', 'INTERVIEW', 'OFFER', 'REJECTED', 'ACCEPTED'] as const;
type PipelineStage = (typeof PIPELINE_STAGES)[number];

async function getRecruiterPostingOrFail(clerkId: string, postingId: string) {
  const user = await getUserFromClerkId(clerkId);
  if (user.role !== 'RECRUITER') return null;
  const company = await db.company.findUnique({ where: { userId: user.id } });
  if (!company) return null;
  const posting = await db.jobPosting.findFirst({
    where: { id: postingId, companyId: company.id },
  });
  return { posting, user };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: postingId } = await params;

    const result = await getRecruiterPostingOrFail(clerkId, postingId);
    if (!result?.posting) return NextResponse.json({ error: 'Forbidden or not found' }, { status: 403 });

    const entries = await db.candidatePipelineEntry.findMany({
      where: { jobPostingId: postingId },
      include: {
        jobApplication: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            resume: { select: { id: true, title: true, fileUrl: true } },
            coverLetter: { select: { id: true, title: true } },
            analyses: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                id: true,
                fitScore: true,
                summary: true,
                skillsMatch: true,
                missingSkills: true,
                strengths: true,
                improvements: true,
                recommendations: true,
                keywordAnalysis: true,
                createdAt: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            province: true,
            experienceLevel: true,
            targetRole: true,
            currentRole: true,
          },
        },
        stageHistory: {
          orderBy: { movedAt: 'desc' },
          take: 10,
          select: {
            id: true,
            fromStage: true,
            toStage: true,
            movedAt: true,
            mover: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Sort each stage group by fitScore descending (highest first)
    const sorted = [...entries].sort((a, b) => {
      const scoreA = a.fitScore ?? -1;
      const scoreB = b.fitScore ?? -1;
      return scoreB - scoreA;
    });

    return NextResponse.json({ pipeline: sorted });
  } catch (error) {
    console.error('[Recruiter Pipeline API] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const UpdateStageSchema = z.object({
  entryId: z.string(),
  stage: z.enum(PIPELINE_STAGES),
  notes: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: postingId } = await params;

    const result = await getRecruiterPostingOrFail(clerkId, postingId);
    if (!result?.posting) return NextResponse.json({ error: 'Forbidden or not found' }, { status: 403 });

    const recruiterUser = result.user;

    const body = await request.json();
    const validation = UpdateStageSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.flatten() }, { status: 400 });
    }

    const { entryId, stage, notes } = validation.data;

    const entry = await db.candidatePipelineEntry.findFirst({
      where: { id: entryId, jobPostingId: postingId },
    });
    if (!entry) return NextResponse.json({ error: 'Pipeline entry not found' }, { status: 404 });

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
          movedBy: recruiterUser.id,
          fromStage: entry.currentStage,
          toStage: stage as PipelineStage,
        },
      }),
    ]);

    return NextResponse.json({ entry: updated });
  } catch (error) {
    console.error('[Recruiter Pipeline API] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

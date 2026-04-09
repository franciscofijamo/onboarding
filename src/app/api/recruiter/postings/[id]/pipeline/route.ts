import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getUserFromClerkId } from '@/lib/auth-utils';
import { z } from 'zod';

const PIPELINE_STAGES = ['RECEIVED', 'REVIEWING', 'INTERVIEW', 'OFFER', 'REJECTED', 'ACCEPTED'] as const;
type PipelineStage = (typeof PIPELINE_STAGES)[number];

// Default ordered stage configuration — can be extended by Module 6 without API changes
const DEFAULT_STAGE_CONFIG: { stage: PipelineStage; label: string }[] = [
  { stage: 'RECEIVED', label: 'Candidaturas Recebidas' },
  { stage: 'REVIEWING', label: 'Em Avaliação' },
  { stage: 'INTERVIEW', label: 'Entrevista' },
  { stage: 'OFFER', label: 'Oferta' },
  { stage: 'REJECTED', label: 'Rejeitado' },
  { stage: 'ACCEPTED', label: 'Aceite' },
];

async function getRecruiterAndPosting(clerkId: string, postingId: string) {
  const user = await getUserFromClerkId(clerkId);
  if (user.role !== 'RECRUITER') return null;
  const company = await db.company.findUnique({ where: { userId: user.id } });
  if (!company) return null;
  const posting = await db.jobPosting.findFirst({
    where: { id: postingId, companyId: company.id },
  });
  if (!posting) return null;
  return { user, company, posting };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: postingId } = await params;

    const result = await getRecruiterAndPosting(clerkId, postingId);
    if (!result) return NextResponse.json({ error: 'Forbidden or not found' }, { status: 403 });

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
    });

    // Sort entries within each stage by fitScore descending
    const sortByFitScore = (a: typeof entries[0], b: typeof entries[0]) => {
      const scoreA = a.fitScore ?? a.jobApplication.analyses[0]?.fitScore ?? -1;
      const scoreB = b.fitScore ?? b.jobApplication.analyses[0]?.fitScore ?? -1;
      return scoreB - scoreA;
    };

    // Get stage configuration — Module 6 can extend DEFAULT_STAGE_CONFIG
    // (future: read from db.recruitingStageConfig.findMany({ where: { postingId } }))
    const stageConfig = DEFAULT_STAGE_CONFIG;

    // Group entries by stage (server-side) — all configured stages always returned
    const grouped = stageConfig.map(({ stage, label }) => ({
      stage,
      label,
      candidates: entries.filter((e) => e.currentStage === stage).sort(sortByFitScore),
    }));

    // Also return flat sorted array for convenience
    const sortedFlat = [...entries].sort(sortByFitScore);

    return NextResponse.json({
      stages: grouped,
      pipeline: sortedFlat, // flat array for backward compat
      stageConfig,
    });
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

    const result = await getRecruiterAndPosting(clerkId, postingId);
    if (!result) return NextResponse.json({ error: 'Forbidden or not found' }, { status: 403 });

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

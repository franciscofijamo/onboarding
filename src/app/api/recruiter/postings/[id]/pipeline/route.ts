import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getUserFromClerkId } from '@/lib/auth-utils';
import { z } from 'zod';

const PIPELINE_STAGES = ['RECEIVED', 'REVIEWING', 'INTERVIEW', 'OFFER', 'REJECTED', 'ACCEPTED'] as const;
type PipelineStage = (typeof PIPELINE_STAGES)[number];

// Default ordered stage configuration
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

    const [entries, recruitmentStages] = await Promise.all([
      db.candidatePipelineEntry.findMany({
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
      }),
      db.recruitmentInterviewStage.findMany({
        where: { jobPostingId: postingId, status: 'PUBLISHED' },
        orderBy: { createdAt: 'asc' },
        include: {
          sessions: {
            select: {
              id: true,
              userId: true,
              averageScore: true,
              analyzedCount: true,
              answeredCount: true,
              totalQuestions: true,
              recruitmentStageId: true,
            },
          },
        },
      }),
    ]);

    // Sort entries within each stage by fitScore descending
    const sortByFitScore = (a: typeof entries[0], b: typeof entries[0]) => {
      const scoreA = a.fitScore ?? a.jobApplication.analyses[0]?.fitScore ?? -1;
      const scoreB = b.fitScore ?? b.jobApplication.analyses[0]?.fitScore ?? -1;
      return scoreB - scoreA;
    };

    // Build stage config: default stages + published interview stages inserted after INTERVIEW
    const stageConfig: { stage: string; label: string; isInterviewStage?: boolean; stageId?: string }[] = [
      ...DEFAULT_STAGE_CONFIG,
    ];

    // Insert published recruitment stages after INTERVIEW
    const interviewIdx = stageConfig.findIndex(s => s.stage === 'INTERVIEW');
    const interviewStageConfigs = recruitmentStages.map(rs => ({
      stage: `INTERVIEW_STAGE_${rs.id}`,
      label: rs.name,
      isInterviewStage: true,
      stageId: rs.id,
    }));
    stageConfig.splice(interviewIdx + 1, 0, ...interviewStageConfigs);

    // Group entries by currentStage + currentRecruitmentStageId
    // Candidates in a published interview-stage column are identified by
    // currentStage=INTERVIEW AND currentRecruitmentStageId === that stage's id.
    // The base INTERVIEW column only shows candidates with no currentRecruitmentStageId.
    const grouped = stageConfig.map(({ stage, label, isInterviewStage, stageId }) => ({
      stage,
      label,
      isInterviewStage: isInterviewStage ?? false,
      stageId: stageId ?? null,
      candidates: isInterviewStage && stageId
        ? entries
            .filter(e => e.currentStage === 'INTERVIEW' && e.currentRecruitmentStageId === stageId)
            .sort(sortByFitScore)
            .map(entry => {
              const rs = recruitmentStages.find(r => r.id === stageId)!;
              const session = rs?.sessions.find(s => s.userId === entry.userId) ?? null;
              return { ...entry, interviewSession: session };
            })
        : stage === 'INTERVIEW'
          // Base INTERVIEW column: only candidates not yet placed in a sub-stage
          ? entries.filter(e => e.currentStage === 'INTERVIEW' && !e.currentRecruitmentStageId).sort(sortByFitScore)
          : entries.filter(e => e.currentStage === (stage as PipelineStage)).sort(sortByFitScore),
    }));

    const sortedFlat = [...entries].sort(sortByFitScore);

    return NextResponse.json({
      posting: { id: result.posting.id, title: result.posting.title },
      stages: grouped,
      pipeline: sortedFlat,
      stageConfig,
      interviewStages: recruitmentStages,
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

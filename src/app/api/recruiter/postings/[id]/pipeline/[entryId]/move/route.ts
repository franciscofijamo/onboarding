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
  recruitmentStageId: z.string().optional(),
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
      select: { id: true, title: true },
    });
    if (!posting) return NextResponse.json({ error: 'Forbidden or not found' }, { status: 403 });

    const body = await request.json();
    const validation = MoveStageSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.flatten() }, { status: 400 });
    }

    const { stage, notes, recruitmentStageId } = validation.data;

    const entry = await db.candidatePipelineEntry.findFirst({
      where: { id: entryId, jobPostingId: postingId },
      include: { jobApplication: { select: { id: true } } },
    });
    if (!entry) return NextResponse.json({ error: 'Pipeline entry not found' }, { status: 404 });

    if (entry.currentStage === stage && !recruitmentStageId) {
      return NextResponse.json({ entry });
    }

    // Validate recruitmentStageId ownership and status BEFORE mutating anything
    if (recruitmentStageId) {
      if (stage !== 'INTERVIEW') {
        return NextResponse.json({ error: 'recruitmentStageId is only valid when moving to INTERVIEW' }, { status: 400 });
      }
      const validStage = await db.recruitmentInterviewStage.findFirst({
        where: {
          id: recruitmentStageId,
          jobPostingId: postingId,  // must belong to this posting (implicitly same company)
          status: 'PUBLISHED',      // must be published
        },
        select: { id: true },
      });
      if (!validStage) {
        return NextResponse.json(
          { error: 'recruitmentStageId is invalid, not published, or does not belong to this posting' },
          { status: 400 }
        );
      }
    }

    // When moving to INTERVIEW with a sub-stage, set currentRecruitmentStageId.
    // When moving away from INTERVIEW (or to base INTERVIEW), clear it.
    const recruitmentStageUpdate =
      stage === 'INTERVIEW' && recruitmentStageId
        ? { currentRecruitmentStageId: recruitmentStageId }
        : { currentRecruitmentStageId: null };

    // Pre-fetch interview stage data (read-only) before the atomic transaction
    let interviewStageData: {
      id: string;
      name: string;
      questions: { id: string; prompt: string; order: number }[];
      jobPosting: { title: string; company: { name: string } };
    } | null = null;
    let shouldCreateSession = false;

    if (stage === 'INTERVIEW' && recruitmentStageId) {
      interviewStageData = await db.recruitmentInterviewStage.findFirst({
        where: { id: recruitmentStageId, jobPostingId: postingId, status: 'PUBLISHED' },
        include: {
          questions: { orderBy: { order: 'asc' } },
          jobPosting: { select: { title: true, company: { select: { name: true } } } },
        },
      });

      if (interviewStageData && interviewStageData.questions.length > 0) {
        const existingSession = await db.workplaceScenarioSession.findFirst({
          where: { userId: entry.userId, recruitmentStageId: interviewStageData.id },
          select: { id: true },
        });
        shouldCreateSession = !existingSession;
      }
    }

    // Phase 1 (atomic): pipeline move + history always persisted together
    const updated = await db.$transaction(async (tx) => {
      const updatedEntry = await tx.candidatePipelineEntry.update({
        where: { id: entryId },
        data: {
          currentStage: stage as PipelineStage,
          ...recruitmentStageUpdate,
          ...(notes !== undefined ? { notes } : {}),
        },
      });

      await tx.candidateStageHistory.create({
        data: {
          entryId,
          movedBy: recruiter.id,
          fromStage: entry.currentStage,
          toStage: stage as PipelineStage,
        },
      });

      return updatedEntry;
    });

    // Phase 2 (best-effort, idempotent): session + notification creation
    // Run outside Phase 1 so a uniqueness race never rolls back the pipeline move.
    // Catch P2002 (unique constraint) and treat as idempotent success — session
    // was already created by a concurrent move, which is the desired state.
    if (shouldCreateSession && interviewStageData) {
      const companyName = interviewStageData.jobPosting.company.name;
      const jobTitle = interviewStageData.jobPosting.title;

      try {
        await db.workplaceScenarioSession.create({
          data: {
            userId: entry.userId,
            jobApplicationId: entry.jobApplicationId,
            recruitmentStageId: interviewStageData.id,
            name: `${interviewStageData.name} — ${jobTitle} @ ${companyName}`,
            totalQuestions: interviewStageData.questions.length,
            creditsUsed: 0,
            responses: {
              create: interviewStageData.questions.map((q, idx) => ({
                questionIndex: idx,
                prompt: q.prompt,
              })),
            },
          },
        });

        // Only send notification if session was newly created (not a duplicate)
        await db.inAppNotification.create({
          data: {
            userId: entry.userId,
            type: 'INTERVIEW_STAGE_ASSIGNED',
            title: `Nova sessão de entrevista: ${interviewStageData.name}`,
            body: `A empresa ${companyName} convidou-te para a fase de entrevista "${interviewStageData.name}" para a vaga de ${jobTitle}. Acede a "Prática de Entrevista" para responder.`,
            data: {
              recruitmentStageId: interviewStageData.id,
              jobPostingId: postingId,
              companyName,
              jobTitle,
              stageName: interviewStageData.name,
            },
          },
        });
      } catch (err) {
        // Phase 2 is strictly best-effort: the pipeline move already committed in Phase 1.
        // Any error here (P2002 duplicate, transient DB error, etc.) must NOT return 500 —
        // that would mislead the caller into thinking the move failed when it succeeded.
        const prismaCode = (err as { code?: string })?.code;
        if (prismaCode === 'P2002') {
          console.warn('[Recruiter Pipeline Move] Duplicate session (P2002) — idempotent, session already exists');
        } else {
          console.error('[Recruiter Pipeline Move] Non-critical phase-2 error (session/notification); pipeline move committed:', err);
        }
      }
    }

    return NextResponse.json({ entry: updated });
  } catch (error) {
    console.error('[Recruiter Pipeline Move API] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

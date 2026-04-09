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

    // If moving to INTERVIEW stage with a recruitmentStageId, create a session for the candidate
    if (stage === 'INTERVIEW' && recruitmentStageId) {
      const interviewStage = await db.recruitmentInterviewStage.findFirst({
        where: { id: recruitmentStageId, jobPostingId: postingId, status: 'PUBLISHED' },
        include: {
          questions: { orderBy: { order: 'asc' } },
          jobPosting: { select: { title: true, company: { select: { name: true } } } },
        },
      });

      if (interviewStage && interviewStage.questions.length > 0) {
        // Check if a session already exists for this candidate + stage
        const existingSession = await db.workplaceScenarioSession.findFirst({
          where: {
            userId: entry.userId,
            recruitmentStageId: interviewStage.id,
          },
        });

        if (!existingSession) {
          const companyName = interviewStage.jobPosting.company.name;
          const jobTitle = interviewStage.jobPosting.title;

          await db.workplaceScenarioSession.create({
            data: {
              userId: entry.userId,
              jobApplicationId: entry.jobApplicationId,
              recruitmentStageId: interviewStage.id,
              name: `${interviewStage.name} — ${jobTitle} @ ${companyName}`,
              totalQuestions: interviewStage.questions.length,
              creditsUsed: 0,
              responses: {
                create: interviewStage.questions.map((q, idx) => ({
                  questionIndex: idx,
                  prompt: q.prompt,
                })),
              },
            },
          });

          // Create in-app notification for the candidate
          await db.inAppNotification.create({
            data: {
              userId: entry.userId,
              type: 'INTERVIEW_STAGE_ASSIGNED',
              title: `Nova sessão de entrevista: ${interviewStage.name}`,
              body: `A empresa ${companyName} convidou-te para a fase de entrevista "${interviewStage.name}" para a vaga de ${jobTitle}. Acede a "Prática de Entrevista" para responder.`,
              data: {
                recruitmentStageId: interviewStage.id,
                jobPostingId: postingId,
                companyName,
                jobTitle,
                stageName: interviewStage.name,
              },
            },
          });
        }
      }
    }

    return NextResponse.json({ entry: updated });
  } catch (error) {
    console.error('[Recruiter Pipeline Move API] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getUserFromClerkId } from '@/lib/auth-utils';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const recruiter = await getUserFromClerkId(clerkId);
    if (recruiter.role !== 'RECRUITER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: postingId, userId: candidateUserId } = await params;

    const company = await db.company.findUnique({ where: { userId: recruiter.id } });
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    const posting = await db.jobPosting.findFirst({
      where: { id: postingId, companyId: company.id },
    });
    if (!posting) return NextResponse.json({ error: 'Posting not found or access denied' }, { status: 403 });

    const pipelineEntry = await db.candidatePipelineEntry.findFirst({
      where: { jobPostingId: postingId, userId: candidateUserId },
      include: {
        jobApplication: {
          select: {
            id: true,
            createdAt: true,
            resume: {
              select: { id: true, title: true, content: true, fileUrl: true },
            },
            coverLetter: {
              select: { id: true, title: true, content: true },
            },
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
            skills: true,
          },
        },
        stageHistory: {
          orderBy: { movedAt: 'desc' },
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

    if (!pipelineEntry) {
      return NextResponse.json({ error: 'Candidate not found in pipeline' }, { status: 404 });
    }

    return NextResponse.json({ pipelineEntry });
  } catch (error) {
    console.error('[Recruiter Candidate Analysis API] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

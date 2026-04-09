import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getUserFromClerkId } from '@/lib/auth-utils';
import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';
import { JOB_POSTING_STATUSES, JOB_POSTING_CATEGORIES, SALARY_RANGES, JOB_TYPES, type JobPostingStatus } from '@/lib/recruiter/postings';

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'h2', 'h3', 'blockquote'],
  allowedAttributes: {},
  disallowedTagsMode: 'discard',
};

const CreateJobPostingSchema = z.object({
  title: z.string().min(2).max(200),
  category: z.enum(JOB_POSTING_CATEGORIES),
  salaryRange: z.enum(SALARY_RANGES),
  jobType: z.enum(JOB_TYPES),
  description: z.string().min(10),
  status: z.enum(['DRAFT', 'PUBLISHED'] as const).optional().default('DRAFT'),
});

async function getRecruiterCompany(clerkId: string) {
  const user = await getUserFromClerkId(clerkId);
  if (user.role !== 'RECRUITER') return null;
  const company = await db.company.findUnique({ where: { userId: user.id } });
  return company;
}

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const company = await getRecruiterCompany(clerkId);
    if (!company) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const rawStatus = searchParams.get('status');

    const statusFilter: JobPostingStatus | undefined =
      rawStatus && (JOB_POSTING_STATUSES as readonly string[]).includes(rawStatus)
        ? (rawStatus as JobPostingStatus)
        : undefined;

    if (rawStatus && !statusFilter) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    const postings = await db.jobPosting.findMany({
      where: {
        companyId: company.id,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      include: {
        _count: { select: { pipelineEntries: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      postings: postings.map(({ _count, ...p }) => ({
        ...p,
        applicationCount: _count.pipelineEntries,
      })),
    });
  } catch (error) {
    console.error('[Recruiter Postings API] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const company = await getRecruiterCompany(clerkId);
    if (!company) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const validation = CreateJobPostingSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const cleanDescription = sanitizeHtml(validation.data.description, SANITIZE_OPTIONS);

    const posting = await db.jobPosting.create({
      data: {
        companyId: company.id,
        title: validation.data.title,
        category: validation.data.category,
        salaryRange: validation.data.salaryRange,
        jobType: validation.data.jobType,
        description: cleanDescription,
        status: validation.data.status,
      },
    });

    return NextResponse.json({ posting: { ...posting, applicationCount: 0 } }, { status: 201 });
  } catch (error) {
    console.error('[Recruiter Postings API] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

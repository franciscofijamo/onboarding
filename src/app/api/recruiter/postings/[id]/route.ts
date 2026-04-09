import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getUserFromClerkId } from '@/lib/auth-utils';
import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';
import { JOB_POSTING_CATEGORIES, SALARY_RANGES, JOB_TYPES } from '@/lib/recruiter/postings';

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'h2', 'h3', 'blockquote'],
  allowedAttributes: {},
  disallowedTagsMode: 'discard',
};

const UpdateJobPostingSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  category: z.enum(JOB_POSTING_CATEGORIES).optional(),
  salaryRange: z.enum(SALARY_RANGES).optional(),
  jobType: z.enum(JOB_TYPES).optional(),
  description: z.string().min(10).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED'] as const).optional(),
});

async function getCompanyForRecruiter(clerkId: string) {
  const user = await getUserFromClerkId(clerkId);
  if (user.role !== 'RECRUITER') return null;
  return db.company.findUnique({ where: { userId: user.id } });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const company = await getCompanyForRecruiter(clerkId);
    if (!company) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const posting = await db.jobPosting.findFirst({
      where: { id, companyId: company.id },
    });

    if (!posting) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ posting: { ...posting, applicationCount: 0 } });
  } catch (error) {
    console.error('[Recruiter Postings API] GET [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const company = await getCompanyForRecruiter(clerkId);
    if (!company) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const existing = await db.jobPosting.findFirst({
      where: { id, companyId: company.id },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();
    const validation = UpdateJobPostingSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const updateData = { ...validation.data };
    if (updateData.description) {
      updateData.description = sanitizeHtml(updateData.description, SANITIZE_OPTIONS);
    }

    const posting = await db.jobPosting.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ posting: { ...posting, applicationCount: 0 } });
  } catch (error) {
    console.error('[Recruiter Postings API] PUT [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const company = await getCompanyForRecruiter(clerkId);
    if (!company) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const existing = await db.jobPosting.findFirst({
      where: { id, companyId: company.id },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await db.jobPosting.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Recruiter Postings API] DELETE [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

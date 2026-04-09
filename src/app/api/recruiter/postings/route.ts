import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getUserFromClerkId } from '@/lib/auth-utils';
import { z } from 'zod';

const CreateJobPostingSchema = z.object({
  title: z.string().min(2).max(200),
  category: z.enum([
    'TECHNOLOGY', 'FINANCE', 'HEALTHCARE', 'EDUCATION', 'ENGINEERING',
    'MARKETING', 'SALES', 'HUMAN_RESOURCES', 'LEGAL', 'OPERATIONS',
    'LOGISTICS', 'HOSPITALITY', 'CONSTRUCTION', 'MEDIA', 'OTHER',
  ]),
  salaryRange: z.enum([
    'UNDER_15K', 'FROM_15K_TO_25K', 'FROM_25K_TO_40K',
    'FROM_40K_TO_60K', 'FROM_60K_TO_90K', 'ABOVE_90K', 'NEGOTIABLE',
  ]),
  jobType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE', 'HYBRID']),
  description: z.string().min(10),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional().default('DRAFT'),
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
    const status = searchParams.get('status');

    const postings = await db.jobPosting.findMany({
      where: {
        companyId: company.id,
        ...(status ? { status: status as never } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ postings });
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

    const posting = await db.jobPosting.create({
      data: {
        companyId: company.id,
        title: validation.data.title,
        category: validation.data.category,
        salaryRange: validation.data.salaryRange,
        jobType: validation.data.jobType,
        description: validation.data.description,
        status: validation.data.status,
      },
    });

    return NextResponse.json({ posting }, { status: 201 });
  } catch (error) {
    console.error('[Recruiter Postings API] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

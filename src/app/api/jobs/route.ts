import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { JOB_POSTING_CATEGORIES, SALARY_RANGES, JOB_TYPES, type JobPostingCategory, type SalaryRange, type JobType } from '@/lib/recruiter/postings';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const rawCategory = searchParams.get('category');
    const rawJobType = searchParams.get('jobType');
    const rawSalaryRange = searchParams.get('salaryRange') ?? searchParams.get('salary');
    const q = searchParams.get('q')?.trim() ?? '';
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50);

    const category =
      rawCategory && (JOB_POSTING_CATEGORIES as readonly string[]).includes(rawCategory)
        ? (rawCategory as JobPostingCategory)
        : undefined;

    const jobType =
      rawJobType && (JOB_TYPES as readonly string[]).includes(rawJobType)
        ? (rawJobType as JobType)
        : undefined;

    const salaryRange =
      rawSalaryRange && (SALARY_RANGES as readonly string[]).includes(rawSalaryRange)
        ? (rawSalaryRange as SalaryRange)
        : undefined;

    const postings = await db.jobPosting.findMany({
      where: {
        status: 'PUBLISHED',
        ...(category ? { category } : {}),
        ...(jobType ? { jobType } : {}),
        ...(salaryRange ? { salaryRange } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { company: { name: { contains: q, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        company: {
          select: { name: true, location: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = postings.length > limit;
    const results = hasMore ? postings.slice(0, limit) : postings;
    const nextCursor = hasMore ? results[results.length - 1]?.id : null;

    return NextResponse.json({
      postings: results.map((p) => ({ ...p, applicationCount: 0 })),
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error('[Jobs Public API] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

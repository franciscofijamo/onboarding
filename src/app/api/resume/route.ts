import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const CreateResumeSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1).max(50000),
  fileUrl: z.string().url().optional(),
  filePath: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { clerkId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = CreateResumeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', issues: parsed.error.flatten() }, { status: 400 })
    }

    const { title, content, fileUrl, filePath } = parsed.data

    const resume = await db.resume.create({
      data: {
        userId: user.id,
        title: title || 'My Resume',
        content,
        fileUrl,
        filePath,
      },
    })

    return NextResponse.json({ resume }, { status: 201 })
  } catch (error) {
    console.error('Error creating resume:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { clerkId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const resumes = await db.resume.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ resumes })
  } catch (error) {
    console.error('Error fetching resumes:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

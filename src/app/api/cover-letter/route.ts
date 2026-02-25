import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const CreateCoverLetterSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1).max(50000),
  fileUrl: z.string().url().optional(),
  filePath: z.string().optional(),
})

const UpdateCoverLetterSchema = z.object({
  id: z.string(),
  title: z.string().max(200).optional(),
  content: z.string().max(50000).optional(),
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
    const parsed = CreateCoverLetterSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', issues: parsed.error.flatten() }, { status: 400 })
    }

    const { title, content, fileUrl, filePath } = parsed.data

    const coverLetter = await db.coverLetter.create({
      data: {
        userId: user.id,
        title: title || 'My Cover Letter',
        content,
        fileUrl,
        filePath,
      },
    })

    return NextResponse.json({ coverLetter }, { status: 201 })
  } catch (error) {
    console.error('Error creating cover letter:', error)
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

    const coverLetters = await db.coverLetter.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ coverLetters })
  } catch (error) {
    console.error('Error fetching cover letters:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
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
    const parsed = UpdateCoverLetterSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', issues: parsed.error.flatten() }, { status: 400 })
    }

    const existing = await db.coverLetter.findFirst({
      where: { id: parsed.data.id, userId: user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Cover letter not found' }, { status: 404 })
    }

    const coverLetter = await db.coverLetter.update({
      where: { id: parsed.data.id },
      data: {
        ...(parsed.data.title !== undefined && { title: parsed.data.title }),
        ...(parsed.data.content !== undefined && { content: parsed.data.content }),
      },
    })

    return NextResponse.json({ coverLetter })
  } catch (error) {
    console.error('Error updating cover letter:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

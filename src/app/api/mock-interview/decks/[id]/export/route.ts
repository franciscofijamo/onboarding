import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

const CATEGORY_LABELS: Record<string, string> = {
    validation: 'Validação',
    deepening: 'Aprofundamento',
    situational: 'Situacional',
    consistency: 'Consistência',
}

const ESSAY_LABELS: Record<number, string> = {
    1: 'Leadership & Influencing',
    2: 'Networking',
    3: 'Course Choices',
    4: 'Career Plan',
}

// GET - Export deck as PDF (returns JSON for client-side PDF generation)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const user = await db.user.findUnique({ where: { clerkId } })
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const deck = await db.flashcardDeck.findFirst({
            where: { id, userId: user.id },
            include: {
                flashcards: {
                    orderBy: { order: 'asc' },
                },
            },
        })

        if (!deck) {
            return NextResponse.json({ error: 'Deck not found' }, { status: 404 })
        }

        // Return structured data for client-side PDF generation
        return NextResponse.json({
            export: {
                title: deck.name,
                subtitle: 'Mock Interview Flashcards - Chevening',
                createdAt: deck.createdAt,
                totalCards: deck.totalCards,
                cards: deck.flashcards.map((f, i) => ({
                    number: i + 1,
                    question: f.question,
                    answer: f.answer,
                    category: CATEGORY_LABELS[f.category] || f.category,
                    relatedEssay: f.relatedEssay ? ESSAY_LABELS[f.relatedEssay] : null,
                    tips: f.tips,
                })),
            },
        })
    } catch (error) {
        console.error('Error exporting deck:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

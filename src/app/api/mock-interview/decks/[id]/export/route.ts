import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

const CATEGORY_LABELS: Record<string, string> = {
    behavioral: 'Behavioral',
    technical: 'Technical',
    situational: 'Situational',
    culture_fit: 'Culture Fit',
    business_english: 'Business English',
}

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

        return NextResponse.json({
            export: {
                title: deck.name,
                subtitle: 'Interview Prep Flashcards',
                createdAt: deck.createdAt,
                totalCards: deck.totalCards,
                cards: deck.flashcards.map((f, i) => ({
                    number: i + 1,
                    question: f.question,
                    answer: f.answer,
                    category: CATEGORY_LABELS[f.category] || f.category,
                    relatedSkill: f.relatedSkill,
                    tips: f.tips,
                })),
            },
        })
    } catch (error) {
        console.error('Error exporting deck:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

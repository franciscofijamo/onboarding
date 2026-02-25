import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

// POST - Register study session
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: deckId } = await params
        const body = await request.json()
        const { cardsStudied, duration, mode } = body

        const user = await db.user.findUnique({ where: { clerkId } })
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const deck = await db.flashcardDeck.findFirst({
            where: { id: deckId, userId: user.id },
        })

        if (!deck) {
            return NextResponse.json({ error: 'Deck not found' }, { status: 404 })
        }

        const session = await db.studySession.create({
            data: {
                deckId,
                cardsStudied: cardsStudied || 0,
                duration: duration || 0,
                mode: mode || 'sequential',
            },
        })

        return NextResponse.json({
            session: {
                id: session.id,
                cardsStudied: session.cardsStudied,
                duration: session.duration,
                mode: session.mode,
                createdAt: session.createdAt,
            },
        })
    } catch (error) {
        console.error('Error creating study session:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

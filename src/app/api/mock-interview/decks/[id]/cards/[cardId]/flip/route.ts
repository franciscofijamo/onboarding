import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

// POST - Mark card as studied
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; cardId: string }> }
) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: deckId, cardId } = await params

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

        const card = await db.flashcard.findFirst({
            where: { id: cardId, deckId },
        })

        if (!card) {
            return NextResponse.json({ error: 'Card not found' }, { status: 404 })
        }

        // Only update if not already studied
        if (!card.studied) {
            await db.$transaction([
                db.flashcard.update({
                    where: { id: cardId },
                    data: {
                        studied: true,
                        studiedAt: new Date(),
                    },
                }),
                db.flashcardDeck.update({
                    where: { id: deckId },
                    data: {
                        studiedCards: { increment: 1 },
                    },
                }),
            ])
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error marking card as studied:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

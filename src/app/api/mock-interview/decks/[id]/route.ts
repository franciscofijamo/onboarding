import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

// GET - Get single deck with all flashcards
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
                sessions: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
            },
        })

        if (!deck) {
            return NextResponse.json({ error: 'Deck not found' }, { status: 404 })
        }

        return NextResponse.json({
            deck: {
                id: deck.id,
                name: deck.name,
                totalCards: deck.totalCards,
                studiedCards: deck.studiedCards,
                progress: deck.totalCards > 0 ? Math.round((deck.studiedCards / deck.totalCards) * 100) : 0,
                createdAt: deck.createdAt,
                updatedAt: deck.updatedAt,
            },
            flashcards: deck.flashcards.map(f => ({
                id: f.id,
                question: f.question,
                answer: f.answer,
                category: f.category,
                relatedSkill: f.relatedSkill,
                tips: f.tips,
                order: f.order,
                studied: f.studied,
                studiedAt: f.studiedAt,
            })),
            recentSessions: deck.sessions.map(s => ({
                id: s.id,
                cardsStudied: s.cardsStudied,
                duration: s.duration,
                mode: s.mode,
                createdAt: s.createdAt,
            })),
        })
    } catch (error) {
        console.error('Error fetching deck:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// PATCH - Rename deck
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const { name } = body

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        const user = await db.user.findUnique({ where: { clerkId } })
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const deck = await db.flashcardDeck.findFirst({
            where: { id, userId: user.id },
        })

        if (!deck) {
            return NextResponse.json({ error: 'Deck not found' }, { status: 404 })
        }

        const updated = await db.flashcardDeck.update({
            where: { id },
            data: { name: name.trim() },
        })

        return NextResponse.json({
            deck: {
                id: updated.id,
                name: updated.name,
            },
        })
    } catch (error) {
        console.error('Error renaming deck:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// DELETE - Delete deck (no refund)
export async function DELETE(
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
        })

        if (!deck) {
            return NextResponse.json({ error: 'Deck not found' }, { status: 404 })
        }

        // Delete deck (cascades to flashcards and sessions)
        await db.flashcardDeck.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting deck:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

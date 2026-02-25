import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { EssayType } from '../../../../../prisma/generated/client'

// GET - User's mock interview progress stats
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

        // Get all decks with stats
        const decks = await db.flashcardDeck.findMany({
            where: { userId: user.id },
            include: {
                _count: { select: { flashcards: true, sessions: true } },
            },
        })

        // Get total study sessions with duration
        const sessions = await db.studySession.findMany({
            where: { deck: { userId: user.id } },
            select: { duration: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        })

        const totalCards = decks.reduce((sum, d) => sum + d.totalCards, 0)
        const totalStudied = decks.reduce((sum, d) => sum + d.studiedCards, 0)
        const totalSessions = sessions.length
        const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0)

        // Calculate streak (consecutive days with study sessions)
        let streak = 0
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        if (sessions.length > 0) {
            const sessionDates = [...new Set(
                sessions.map(s => {
                    const d = new Date(s.createdAt)
                    d.setHours(0, 0, 0, 0)
                    return d.getTime()
                })
            )].sort((a, b) => b - a) // Sort descending

            // Check if studied today or yesterday
            const latestSession = sessionDates[0]
            const diffDays = Math.floor((today.getTime() - latestSession) / (1000 * 60 * 60 * 24))

            if (diffDays <= 1) {
                streak = 1
                for (let i = 1; i < sessionDates.length; i++) {
                    const diff = (sessionDates[i - 1] - sessionDates[i]) / (1000 * 60 * 60 * 24)
                    if (diff === 1) {
                        streak++
                    } else {
                        break
                    }
                }
            }
        }

        // Check if user can generate decks (has 4 analyzed Chevening essays)
        // Note: Essays created before scholarship field may have null or 'chevening' as default
        const cheveningEssayTypes = [
            EssayType.LEADERSHIP,
            EssayType.NETWORKING,
            EssayType.COURSE_CHOICES,
            EssayType.CAREER_PLAN,
        ]

        const analyzedEssays = await db.essay.count({
            where: {
                userId: user.id,
                type: { in: cheveningEssayTypes },
                analysisCount: { gt: 0 },
                // Don't filter by scholarship to support legacy essays
                // Chevening essays are identified by their type (4 specific types)
            },
        })

        return NextResponse.json({
            canGenerate: analyzedEssays >= 4,
            essaysAnalyzed: analyzedEssays,
            stats: {
                totalDecks: decks.length,
                totalCards,
                totalStudied,
                progressPercentage: totalCards > 0 ? Math.round((totalStudied / totalCards) * 100) : 0,
                totalSessions,
                totalMinutes: Math.round(totalDuration / 60),
                streak,
            },
        })
    } catch (error) {
        console.error('Error fetching progress:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

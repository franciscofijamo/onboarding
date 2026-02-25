import { db } from '@/lib/db'
import { Prisma } from '../../../prisma/generated/client'

function isDatabaseUnavailableError(error: unknown) {
  if (!error) return false

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true
  }

  return error instanceof Prisma.PrismaClientKnownRequestError
    && (error.code === 'P1000' || error.code === 'P1001')
}

function logPlanFallback(error: unknown) {
  const baseMessage = '[plans] Failed to load active plans from the database; returning empty list.'
  if (process.env.NODE_ENV === 'development') {
    const detail = error instanceof Error ? error.message : String(error)
    console.warn(baseMessage, detail)
    return
  }
  console.warn(baseMessage)
}

// Query interface: Plans
// Centralizes all DB access for plan reads
export async function getActivePlansSorted() {
  try {
    return await db.plan.findMany({
      where: { active: true },
      orderBy: [
        { sortOrder: 'asc' },
        { credits: 'asc' },
      ],
    })
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      logPlanFallback(error)
      return []
    }
    throw error
  }
}

import { db } from '@/lib/db'
import { getUserFromClerkId } from '@/lib/auth-utils'
import { FeatureKey, toPrismaOperationType } from './feature-config'
import { getFeatureCost, getPlanCredits } from '@/lib/credits/settings'
import { InsufficientCreditsError } from './errors'

type JsonValue = string | number | boolean | null | JsonObject | JsonArray
interface JsonObject { [key: string]: JsonValue }
type JsonArray = Array<JsonValue>

interface DeductParams {
  clerkUserId: string
  feature: FeatureKey
  details?: JsonValue
  quantity?: number
}

export async function validateCreditsForFeature(
  clerkUserId: string,
  feature: FeatureKey,
  quantity: number = 1
) {
  try {
    const user = await getUserFromClerkId(clerkUserId)
    const balance = await db.creditBalance.findUnique({ where: { userId: user.id } })
    const costPerUse = await getFeatureCost(feature)
    const needed = costPerUse * Math.max(1, quantity)
    const available = balance?.creditsRemaining ?? (await getPlanCredits('free'))
    if (available < needed) {
      throw new InsufficientCreditsError(needed, available)
    }
    return { available, needed }
  } catch (error) {
    console.error('Error validating credits:', error)
    throw error
  }
}

export async function deductCreditsForFeature({
  clerkUserId,
  feature,
  details,
  quantity = 1,
}: DeductParams): Promise<{ creditsRemaining: number }> {
  try {
    const user = await getUserFromClerkId(clerkUserId)
    const creditsToUse = (await getFeatureCost(feature)) * Math.max(1, quantity)
    const op = toPrismaOperationType(feature)

    const result = await db.$transaction(async (tx) => {
      try {
        let creditBalance = await tx.creditBalance.findUnique({ where: { userId: user.id } })
        if (!creditBalance) {
          try {
            creditBalance = await tx.creditBalance.create({
              data: {
                userId: user.id,
                clerkUserId,
                creditsRemaining: await getPlanCredits('free'),
              },
            })
          } catch (error) {
            console.error('Error creating credit balance:', error)
            throw error
          }
        }

        try {
          await tx.usageHistory.create({
            data: {
              userId: user.id,
              creditBalanceId: creditBalance.id,
              operationType: op,
              creditsUsed: creditsToUse,
              details: details ?? undefined,
            },
          })
        } catch (error) {
          console.error('Error creating usage history:', error)
          throw error
        }

        try {
          const updated = await tx.creditBalance.updateMany({
            where: { id: creditBalance.id, creditsRemaining: { gte: creditsToUse } },
            data: {
              creditsRemaining: { decrement: creditsToUse },
              lastSyncedAt: new Date(),
            },
          })
          if (updated.count === 0) {
            throw new InsufficientCreditsError(creditsToUse, creditBalance.creditsRemaining)
          }
        } catch (error) {
          console.error('Error updating credit balance:', error)
          throw error
        }

        const after = await tx.creditBalance.findUnique({ where: { id: creditBalance.id } })
        return { creditsRemaining: after!.creditsRemaining }
      } catch (error) {
        console.error('Transaction error:', error)
        throw error
      }
    })

    return result
  } catch (error) {
    console.error('Error deducting credits:', error)
    throw error
  }
}

export async function refundCreditsForFeature({
  clerkUserId,
  feature,
  quantity = 1,
  reason,
  details,
}: {
  clerkUserId: string
  feature: FeatureKey
  quantity?: number
  reason?: string
  details?: JsonValue
}): Promise<{ creditsRemaining: number } | null> {
  try {
    const user = await getUserFromClerkId(clerkUserId)
    const refundAmount = (await getFeatureCost(feature)) * Math.max(1, quantity)
    const op = toPrismaOperationType(feature)

    const result = await db.$transaction(async (tx) => {
      let creditBalance = await tx.creditBalance.findUnique({ where: { userId: user.id } })
      if (!creditBalance) {
        creditBalance = await tx.creditBalance.create({
          data: {
            userId: user.id,
            clerkUserId,
            creditsRemaining: await getPlanCredits('free'),
          },
        })
      }

      await tx.usageHistory.create({
        data: {
          userId: user.id,
          creditBalanceId: creditBalance.id,
          operationType: op,
          creditsUsed: -refundAmount,
          details: { ...(details as JsonObject | null ?? {}), refund: true, reason },
        },
      })

      const updated = await tx.creditBalance.update({
        where: { id: creditBalance.id },
        data: {
          creditsRemaining: { increment: refundAmount },
          lastSyncedAt: new Date(),
        },
      })

      return { creditsRemaining: updated.creditsRemaining }
    })

    return result
  } catch (error) {
    console.error('Error refunding credits:', error)
    return null
  }
}

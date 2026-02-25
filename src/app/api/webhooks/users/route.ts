import crypto from 'node:crypto'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '../../../../../prisma/generated/client'

import { db } from '@/lib/db'
import { withApiLogging } from '@/lib/logging/api'

const userPayloadSchema = z.object({
  id: z.string().min(1, 'User id is required'),
  email: z.string().email().nullable().optional(),
  name: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  initialCredits: z.number().int().nonnegative().optional(),
  creditsRemaining: z.number().int().nonnegative().optional(),
  creditDelta: z.number().int().optional(),
})

const webhookEventSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['user.created', 'user.updated', 'user.deleted']),
  data: userPayloadSchema.extend({
    id: z.string().min(1, 'User id is required'),
  }),
  createdAt: z.string().optional(),
  source: z.string().optional(),
})

const webhookPayloadSchema = z.union([
  webhookEventSchema,
  z.object({
    events: z.array(webhookEventSchema).min(1),
  }),
])

type UserPayload = z.infer<typeof userPayloadSchema>
type WebhookEvent = z.infer<typeof webhookEventSchema>

const SIGNATURE_HEADER = 'x-webhook-signature'
const TIMESTAMP_HEADER = 'x-webhook-timestamp'
const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60

function normalizeCredits(value: number | undefined | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return undefined
  }
  return Math.max(0, Math.floor(value))
}

function resolveAbsoluteCredits(payload: UserPayload) {
  if (fieldProvided(payload, 'creditsRemaining')) {
    return normalizeCredits(payload.creditsRemaining)
  }
  if (fieldProvided(payload, 'initialCredits')) {
    return normalizeCredits(payload.initialCredits)
  }
  return undefined
}

function resolveName(payload: UserPayload) {
  if (typeof payload.name === 'string' && payload.name.trim().length > 0) {
    return payload.name.trim()
  }

  const first = typeof payload.firstName === 'string' ? payload.firstName.trim() : ''
  const last = typeof payload.lastName === 'string' ? payload.lastName.trim() : ''
  const combined = `${first} ${last}`.trim()
  return combined.length > 0 ? combined : null
}

function fieldProvided<T extends object>(payload: T, key: keyof T) {
  return Object.prototype.hasOwnProperty.call(payload, key)
}

function verifySignature(rawBody: string, secret: string, signature: string | null, timestamp: string | null) {
  if (!signature || !timestamp) {
    return { ok: false, error: 'Missing signature headers' as const }
  }

  const numericTimestamp = Number(timestamp)
  if (!Number.isFinite(numericTimestamp)) {
    return { ok: false, error: 'Invalid timestamp header' as const }
  }

  const timestampMs = numericTimestamp < 10_000_000_000 ? numericTimestamp * 1000 : numericTimestamp
  if (Math.abs(Date.now() - timestampMs) > TIMESTAMP_TOLERANCE_SECONDS * 1000) {
    return { ok: false, error: 'Timestamp outside allowable tolerance' as const }
  }

  const expectedSignature = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')

  try {
    const expectedBuffer = Buffer.from(expectedSignature, 'hex')
    const receivedBuffer = Buffer.from(signature, 'hex')

    if (expectedBuffer.length !== receivedBuffer.length) {
      return { ok: false, error: 'Invalid signature length' as const }
    }

    if (!crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
      return { ok: false, error: 'Invalid signature' as const }
    }
  } catch {
    return { ok: false, error: 'Invalid signature encoding' as const }
  }

  return { ok: true as const }
}

async function applyCreditUpdate(
  tx: Prisma.TransactionClient,
  dbUserId: string,
  clerkUserId: string,
  payload: UserPayload,
  isNewUser = false
) {
  const absoluteCredits = resolveAbsoluteCredits(payload)
  const now = new Date()

  if (absoluteCredits !== undefined) {
    await tx.creditBalance.upsert({
      where: { userId: dbUserId },
      create: {
        userId: dbUserId,
        clerkUserId,
        creditsRemaining: absoluteCredits,
      },
      update: {
        creditsRemaining: absoluteCredits,
        lastSyncedAt: now,
      },
    })
    return
  }

  if (fieldProvided(payload, 'creditDelta')) {
    const delta = payload.creditDelta ?? 0
    const existing = await tx.creditBalance.findUnique({
      where: { userId: dbUserId },
      select: { id: true, creditsRemaining: true },
    })

    if (!existing) {
      const startingCredits = delta > 0 ? delta : 0
      await tx.creditBalance.create({
        data: {
          userId: dbUserId,
          clerkUserId,
          creditsRemaining: startingCredits,
        },
      })
      return
    }

    const updatedCredits = Math.max(0, existing.creditsRemaining + delta)

    if (updatedCredits === existing.creditsRemaining) {
      return
    }

    await tx.creditBalance.update({
      where: { id: existing.id },
      data: {
        creditsRemaining: updatedCredits,
        lastSyncedAt: now,
      },
    })
    return
  }

  const defaultCredits = isNewUser
    ? Math.max(0, Math.floor(Number(process.env.FREE_CREDITS_ON_SIGNUP || '0')))
    : 0;
  await tx.creditBalance.upsert({
    where: { userId: dbUserId },
    create: {
      userId: dbUserId,
      clerkUserId,
      creditsRemaining: defaultCredits,
    },
    update: {},
  })
}

async function handleUserCreated(event: WebhookEvent) {
  const payload = event.data
  const clerkUserId = payload.id

  await db.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    })

    const resolvedName = resolveName(payload)

    if (existing) {
      const updates: Prisma.UserUpdateInput = {}
      let hasChanges = false

      if (fieldProvided(payload, 'email')) {
        updates.email = payload.email ?? null
        hasChanges = true
      }

      if (fieldProvided(payload, 'name') || fieldProvided(payload, 'firstName') || fieldProvided(payload, 'lastName')) {
        updates.name = resolvedName
        hasChanges = true
      }

      if (fieldProvided(payload, 'isActive')) {
        updates.isActive = payload.isActive ?? true
        hasChanges = true
      }

      if (hasChanges) {
        await tx.user.update({
          where: { id: existing.id },
          data: updates,
        })
      }

      await applyCreditUpdate(tx, existing.id, clerkUserId, payload, false)
      return
    }

    const created = await tx.user.create({
      data: {
        clerkId: clerkUserId,
        email: payload.email ?? null,
        name: resolvedName,
        isActive: payload.isActive ?? true,
      },
      select: { id: true },
    })

    await applyCreditUpdate(tx, created.id, clerkUserId, payload, true)
  })
}

async function handleUserUpdated(event: WebhookEvent) {
  const payload = event.data
  const clerkUserId = payload.id

  const updates: Prisma.UserUpdateInput = {}
  let hasChanges = false

  if (fieldProvided(payload, 'email')) {
    updates.email = payload.email ?? null
    hasChanges = true
  }

  if (fieldProvided(payload, 'name') || fieldProvided(payload, 'firstName') || fieldProvided(payload, 'lastName')) {
    updates.name = resolveName(payload)
    hasChanges = true
  }

  if (fieldProvided(payload, 'isActive')) {
    updates.isActive = payload.isActive
    hasChanges = true
  }

  const hasCreditInstructions =
    fieldProvided(payload, 'initialCredits') ||
    fieldProvided(payload, 'creditsRemaining') ||
    fieldProvided(payload, 'creditDelta')

  if (!hasChanges && !hasCreditInstructions) {
    return
  }

  await db.$transaction(async (tx) => {
    let user = await tx.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    })

    if (!user) {
      user = await tx.user.create({
        data: {
          clerkId: clerkUserId,
          email: payload.email ?? null,
          name: resolveName(payload),
          isActive: payload.isActive ?? true,
        },
        select: { id: true },
      })
    } else if (hasChanges) {
      await tx.user.update({
        where: { id: user.id },
        data: updates,
      })
    }

    await applyCreditUpdate(tx, user.id, clerkUserId, payload)
  })
}

async function handleUserDeleted(event: WebhookEvent) {
  const clerkUserId = event.data.id

  await db.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    })

    if (!existing) {
      return
    }

    await tx.usageHistory.deleteMany({
      where: { userId: existing.id },
    })

    await tx.storageObject.deleteMany({
      where: { userId: existing.id },
    })

    await tx.creditBalance.deleteMany({
      where: { userId: existing.id },
    })

    await tx.subscriptionEvent.updateMany({
      where: { clerkUserId },
      data: { userId: null },
    })

    await tx.user.delete({
      where: { id: existing.id },
    })
  })
}

async function handler(req: Request) {
  const secret = process.env.USER_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('USER_WEBHOOK_SECRET is not configured')
  }

  const rawBody = await req.text()
  const headerPayload = await headers()
  const signature = headerPayload.get(SIGNATURE_HEADER)
  const timestamp = headerPayload.get(TIMESTAMP_HEADER)

  const verified = verifySignature(rawBody, secret, signature, timestamp)
  if (!verified.ok) {
    return NextResponse.json({ success: false, error: verified.error }, { status: 401 })
  }

  let parsedBody: unknown
  try {
    parsedBody = JSON.parse(rawBody)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid JSON payload',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 }
    )
  }

  const validation = webhookPayloadSchema.safeParse(parsedBody)
  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid payload',
        issues: validation.error.flatten(),
      },
      { status: 422 }
    )
  }

  const normalized = validation.data as WebhookEvent | { events: WebhookEvent[] }
  const events: WebhookEvent[] = 'events' in normalized ? normalized.events : [normalized]

  for (const event of events) {
    try {
      switch (event.type) {
        case 'user.created':
          await handleUserCreated(event)
          break
        case 'user.updated':
          await handleUserUpdated(event)
          break
        case 'user.deleted':
          await handleUserDeleted(event)
          break
        default:
          console.warn(`Unhandled user webhook event: ${event.type}`)
      }
    } catch (error) {
      console.error(`Failed to process user webhook event ${event.id} (${event.type})`, error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to process event',
          eventId: event.id,
          eventType: event.type,
        },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({
    success: true,
    processed: events.length,
  })
}

export const dynamic = 'force-dynamic'
export const POST = withApiLogging(handler, {
  route: '/api/webhooks/users',
  feature: 'user_webhook',
})

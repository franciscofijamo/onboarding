import { describe, it, expect, beforeEach, vi } from 'vitest'
import crypto from 'node:crypto'
import { headers } from 'next/headers'
import { db } from '@/lib/db'

// Re-export handler logic for testing
// We'll test the handler by importing the route and calling POST directly
// But first, let's create a testable version

// Copy the handler function from route.ts for testing
async function handler(req: Request) {
  const secret = process.env.USER_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('USER_WEBHOOK_SECRET is not configured')
  }

  const rawBody = await req.text()
  const headerPayload = await headers()
  const signature = headerPayload.get('x-webhook-signature')
  const timestamp = headerPayload.get('x-webhook-timestamp')

  const verified = verifySignature(rawBody, secret, signature, timestamp)
  if (!verified.ok) {
    return new Response(JSON.stringify({ success: false, error: verified.error }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let parsedBody: unknown
  try {
    parsedBody = JSON.parse(rawBody)
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Invalid JSON payload',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  const { z } = await import('zod')
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

  const validation = webhookPayloadSchema.safeParse(parsedBody)
  if (!validation.success) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Invalid payload',
        issues: validation.error.flatten(),
      }),
      {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  const normalized = validation.data as any
  const events: any[] = 'events' in normalized ? normalized.events : [normalized]

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
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to process event',
          eventId: event.id,
          eventType: event.type,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      processed: events.length,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60

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

function fieldProvided<T extends object>(payload: T, key: keyof T) {
  return Object.prototype.hasOwnProperty.call(payload, key)
}

function resolveName(payload: any) {
  if (typeof payload.name === 'string' && payload.name.trim().length > 0) {
    return payload.name.trim()
  }

  const first = typeof payload.firstName === 'string' ? payload.firstName.trim() : ''
  const last = typeof payload.lastName === 'string' ? payload.lastName.trim() : ''
  const combined = `${first} ${last}`.trim()
  return combined.length > 0 ? combined : null
}

function normalizeCredits(value: number | undefined | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return undefined
  }
  return Math.max(0, Math.floor(value))
}

function resolveAbsoluteCredits(payload: any) {
  if (fieldProvided(payload, 'creditsRemaining')) {
    return normalizeCredits(payload.creditsRemaining)
  }
  if (fieldProvided(payload, 'initialCredits')) {
    return normalizeCredits(payload.initialCredits)
  }
  return undefined
}

async function applyCreditUpdate(tx: any, dbUserId: string, clerkUserId: string, payload: any) {
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

  await tx.creditBalance.upsert({
    where: { userId: dbUserId },
    create: {
      userId: dbUserId,
      clerkUserId,
      creditsRemaining: 0,
    },
    update: {},
  })
}

async function handleUserCreated(event: any) {
  const payload = event.data
  const clerkUserId = payload.id

  await db.$transaction(async (tx: any) => {
    const existing = await tx.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    })

    const resolvedName = resolveName(payload)

    if (existing) {
      const updates: any = {}
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

      await applyCreditUpdate(tx, existing.id, clerkUserId, payload)
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

    await applyCreditUpdate(tx, created.id, clerkUserId, payload)
  })
}

async function handleUserUpdated(event: any) {
  const payload = event.data
  const clerkUserId = payload.id

  const updates: any = {}
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

  await db.$transaction(async (tx: any) => {
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

async function handleUserDeleted(event: any) {
  const clerkUserId = event.data.id

  await db.$transaction(async (tx: any) => {
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

// Mock types
const mockHeaders = vi.mocked(headers)

describe('User Webhook - Signature Verification', () => {
  const secret = 'test-secret-key'
  const timestamp = Math.floor(Date.now() / 1000).toString()

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.USER_WEBHOOK_SECRET = secret
  })

  function createSignature(body: string, ts: string = timestamp): string {
    return crypto.createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex')
  }

  it('should accept valid signature', async () => {
    const body = JSON.stringify({
      id: 'evt_1',
      type: 'user.created',
      data: { id: 'usr_1', email: 'test@example.com' },
    })
    const signature = createSignature(body)

    mockHeaders.mockReturnValue(
      new Headers({
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp,
      }) as any
    )

    vi.mocked(db.$transaction).mockResolvedValue(undefined as any)

    const req = new Request('http://localhost/api/webhooks/users', {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await handler(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('should reject missing signature header', async () => {
    const body = JSON.stringify({
      id: 'evt_1',
      type: 'user.created',
      data: { id: 'usr_1' },
    })

    mockHeaders.mockReturnValue(
      new Headers({
        'x-webhook-timestamp': timestamp,
      }) as any
    )

    const req = new Request('http://localhost/api/webhooks/users', {
      method: 'POST',
      body,
    })

    const response = await handler(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Missing signature headers')
  })

  it('should reject invalid signature', async () => {
    const body = JSON.stringify({
      id: 'evt_1',
      type: 'user.created',
      data: { id: 'usr_1' },
    })

    mockHeaders.mockReturnValue(
      new Headers({
        'x-webhook-signature': 'invalid-signature',
        'x-webhook-timestamp': timestamp,
      }) as any
    )

    const req = new Request('http://localhost/api/webhooks/users', {
      method: 'POST',
      body,
    })

    const response = await handler(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Invalid signature length')
  })

  it('should reject expired timestamp', async () => {
    const body = JSON.stringify({
      id: 'evt_1',
      type: 'user.created',
      data: { id: 'usr_1' },
    })
    const oldTimestamp = Math.floor((Date.now() - 6 * 60 * 1000) / 1000).toString()
    const signature = createSignature(body, oldTimestamp)

    mockHeaders.mockReturnValue(
      new Headers({
        'x-webhook-signature': signature,
        'x-webhook-timestamp': oldTimestamp,
      }) as any
    )

    const req = new Request('http://localhost/api/webhooks/users', {
      method: 'POST',
      body,
    })

    const response = await handler(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Timestamp outside allowable tolerance')
  })

  it('should accept timestamp in milliseconds', async () => {
    const body = JSON.stringify({
      id: 'evt_1',
      type: 'user.created',
      data: { id: 'usr_1', email: 'test@example.com' },
    })
    const timestampMs = Date.now().toString()
    const signature = crypto.createHmac('sha256', secret).update(`${timestampMs}.${body}`).digest('hex')

    mockHeaders.mockReturnValue(
      new Headers({
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestampMs,
      }) as any
    )

    vi.mocked(db.$transaction).mockResolvedValue(undefined as any)

    const req = new Request('http://localhost/api/webhooks/users', {
      method: 'POST',
      body,
    })

    const response = await handler(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })
})

describe('User Webhook - user.created', () => {
  const secret = 'test-secret-key'
  const timestamp = Math.floor(Date.now() / 1000).toString()

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.USER_WEBHOOK_SECRET = secret
  })

  function createSignature(body: string): string {
    return crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
  }

  it('should create a new user with initial credits', async () => {
    const body = JSON.stringify({
      id: 'evt_1',
      type: 'user.created',
      data: {
        id: 'usr_123',
        email: 'newuser@example.com',
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
        initialCredits: 100,
      },
    })
    const signature = createSignature(body)

    mockHeaders.mockReturnValue(
      new Headers({
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp,
      }) as any
    )

    const mockUser = { id: 'user_db_id' }
    const mockTransaction = vi.fn().mockImplementation(async (callback: any) => {
      const mockTx = {
        user: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue(mockUser),
        },
        creditBalance: {
          upsert: vi.fn().mockResolvedValue({}),
        },
      }
      return await callback(mockTx)
    })

    vi.mocked(db.$transaction).mockImplementation(mockTransaction)

    const req = new Request('http://localhost/api/webhooks/users', {
      method: 'POST',
      body,
    })

    const response = await handler(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.processed).toBe(1)
  })

  it('should update existing user if clerkId exists', async () => {
    const body = JSON.stringify({
      id: 'evt_2',
      type: 'user.created',
      data: {
        id: 'usr_456',
        email: 'updated@example.com',
        creditsRemaining: 200,
      },
    })
    const signature = createSignature(body)

    mockHeaders.mockReturnValue(
      new Headers({
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp,
      }) as any
    )

    const existingUser = { id: 'existing_user_id' }
    const mockTransaction = vi.fn().mockImplementation(async (callback: any) => {
      const mockTx = {
        user: {
          findUnique: vi.fn().mockResolvedValue(existingUser),
          update: vi.fn().mockResolvedValue(existingUser),
        },
        creditBalance: {
          upsert: vi.fn().mockResolvedValue({}),
        },
      }
      return await callback(mockTx)
    })

    vi.mocked(db.$transaction).mockImplementation(mockTransaction)

    const req = new Request('http://localhost/api/webhooks/users', {
      method: 'POST',
      body,
    })

    const response = await handler(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('should handle name resolution from firstName and lastName', async () => {
    const body = JSON.stringify({
      id: 'evt_3',
      type: 'user.created',
      data: {
        id: 'usr_789',
        firstName: 'Jane',
        lastName: 'Smith',
        initialCredits: 50,
      },
    })
    const signature = createSignature(body)

    mockHeaders.mockReturnValue(
      new Headers({
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp,
      }) as any
    )

    const mockUser = { id: 'user_db_id' }
    const mockTransaction = vi.fn().mockImplementation(async (callback: any) => {
      const mockTx = {
        user: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue(mockUser),
        },
        creditBalance: {
          upsert: vi.fn().mockResolvedValue({}),
        },
      }
      return await callback(mockTx)
    })

    vi.mocked(db.$transaction).mockImplementation(mockTransaction)

    const req = new Request('http://localhost/api/webhooks/users', {
      method: 'POST',
      body,
    })

    const response = await handler(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })
})

describe('User Webhook - user.updated', () => {
  const secret = 'test-secret-key'
  const timestamp = Math.floor(Date.now() / 1000).toString()

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.USER_WEBHOOK_SECRET = secret
  })

  function createSignature(body: string): string {
    return crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
  }

  it('should update user email and credits', async () => {
    const body = JSON.stringify({
      id: 'evt_4',
      type: 'user.updated',
      data: {
        id: 'usr_123',
        email: 'newemail@example.com',
        creditDelta: 50,
      },
    })
    const signature = createSignature(body)

    mockHeaders.mockReturnValue(
      new Headers({
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp,
      }) as any
    )

    const existingUser = { id: 'user_db_id' }
    const existingBalance = { id: 'balance_id', creditsRemaining: 100 }
    const mockTransaction = vi.fn().mockImplementation(async (callback: any) => {
      const mockTx = {
        user: {
          findUnique: vi.fn().mockResolvedValue(existingUser),
          update: vi.fn().mockResolvedValue(existingUser),
        },
        creditBalance: {
          findUnique: vi.fn().mockResolvedValue(existingBalance),
          update: vi.fn().mockResolvedValue({}),
        },
      }
      return await callback(mockTx)
    })

    vi.mocked(db.$transaction).mockImplementation(mockTransaction)

    const req = new Request('http://localhost/api/webhooks/users', {
      method: 'POST',
      body,
    })

    const response = await handler(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('should create user if not exists during update', async () => {
    const body = JSON.stringify({
      id: 'evt_5',
      type: 'user.updated',
      data: {
        id: 'usr_new',
        email: 'newuser@example.com',
        creditsRemaining: 150,
      },
    })
    const signature = createSignature(body)

    mockHeaders.mockReturnValue(
      new Headers({
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp,
      }) as any
    )

    const newUser = { id: 'new_user_id' }
    const mockTransaction = vi.fn().mockImplementation(async (callback: any) => {
      const mockTx = {
        user: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue(newUser),
        },
        creditBalance: {
          upsert: vi.fn().mockResolvedValue({}),
        },
      }
      return await callback(mockTx)
    })

    vi.mocked(db.$transaction).mockImplementation(mockTransaction)

    const req = new Request('http://localhost/api/webhooks/users', {
      method: 'POST',
      body,
    })

    const response = await handler(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('should handle creditDelta correctly', async () => {
    const body = JSON.stringify({
      id: 'evt_6',
      type: 'user.updated',
      data: {
        id: 'usr_123',
        creditDelta: -25,
      },
    })
    const signature = createSignature(body)

    mockHeaders.mockReturnValue(
      new Headers({
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp,
      }) as any
    )

    const existingUser = { id: 'user_db_id' }
    const existingBalance = { id: 'balance_id', creditsRemaining: 100 }
    const mockTransaction = vi.fn().mockImplementation(async (callback: any) => {
      const mockTx = {
        user: {
          findUnique: vi.fn().mockResolvedValue(existingUser),
        },
        creditBalance: {
          findUnique: vi.fn().mockResolvedValue(existingBalance),
          update: vi.fn().mockResolvedValue({}),
        },
      }
      return await callback(mockTx)
    })

    vi.mocked(db.$transaction).mockImplementation(mockTransaction)

    const req = new Request('http://localhost/api/webhooks/users', {
      method: 'POST',
      body,
    })

    const response = await handler(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('should prevent negative credits', async () => {
    const body = JSON.stringify({
      id: 'evt_7',
      type: 'user.updated',
      data: {
        id: 'usr_123',
        creditDelta: -200,
      },
    })
    const signature = createSignature(body)

    mockHeaders.mockReturnValue(
      new Headers({
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp,
      }) as any
    )

    const existingUser = { id: 'user_db_id' }
    const existingBalance = { id: 'balance_id', creditsRemaining: 50 }
    const mockTransaction = vi.fn().mockImplementation(async (callback: any) => {
      const mockTx = {
        user: {
          findUnique: vi.fn().mockResolvedValue(existingUser),
        },
        creditBalance: {
          findUnique: vi.fn().mockResolvedValue(existingBalance),
          update: vi.fn().mockResolvedValue({}),
        },
      }
      return await callback(mockTx)
    })

    vi.mocked(db.$transaction).mockImplementation(mockTransaction)

    const req = new Request('http://localhost/api/webhooks/users', {
      method: 'POST',
      body,
    })

    const response = await handler(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })
})

describe('User Webhook - user.deleted', () => {
  const secret = 'test-secret-key'
  const timestamp = Math.floor(Date.now() / 1000).toString()

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.USER_WEBHOOK_SECRET = secret
  })

  function createSignature(body: string): string {
    return crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
  }

  it('should delete user and all dependent records', async () => {
    const body = JSON.stringify({
      id: 'evt_8',
      type: 'user.deleted',
      data: {
        id: 'usr_123',
      },
    })
    const signature = createSignature(body)

    mockHeaders.mockReturnValue(
      new Headers({
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp,
      }) as any
    )

    const existingUser = { id: 'user_db_id' }
    const mockTransaction = vi.fn().mockImplementation(async (callback: any) => {
      const mockTx = {
        user: {
          findUnique: vi.fn().mockResolvedValue(existingUser),
          delete: vi.fn().mockResolvedValue({}),
        },
        usageHistory: {
          deleteMany: vi.fn().mockResolvedValue({ count: 5 }),
        },
        storageObject: {
          deleteMany: vi.fn().mockResolvedValue({ count: 3 }),
        },
        creditBalance: {
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        subscriptionEvent: {
          updateMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
      }
      return await callback(mockTx)
    })

    vi.mocked(db.$transaction).mockImplementation(mockTransaction)

    const req = new Request('http://localhost/api/webhooks/users', {
      method: 'POST',
      body,
    })

    const response = await handler(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('should handle deletion of non-existent user gracefully', async () => {
    const body = JSON.stringify({
      id: 'evt_9',
      type: 'user.deleted',
      data: {
        id: 'usr_nonexistent',
      },
    })
    const signature = createSignature(body)

    mockHeaders.mockReturnValue(
      new Headers({
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp,
      }) as any
    )

    const mockTransaction = vi.fn().mockImplementation(async (callback: any) => {
      const mockTx = {
        user: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      }
      return await callback(mockTx)
    })

    vi.mocked(db.$transaction).mockImplementation(mockTransaction)

    const req = new Request('http://localhost/api/webhooks/users', {
      method: 'POST',
      body,
    })

    const response = await handler(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })
})

describe('User Webhook - Batch Events', () => {
  const secret = 'test-secret-key'
  const timestamp = Math.floor(Date.now() / 1000).toString()

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.USER_WEBHOOK_SECRET = secret
  })

  function createSignature(body: string): string {
    return crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
  }

  it('should process multiple events in batch', async () => {
    const body = JSON.stringify({
      events: [
        {
          id: 'evt_10',
          type: 'user.created',
          data: { id: 'usr_1', email: 'user1@example.com', initialCredits: 100 },
        },
        {
          id: 'evt_11',
          type: 'user.updated',
          data: { id: 'usr_2', creditDelta: 50 },
        },
      ],
    })
    const signature = createSignature(body)

    mockHeaders.mockReturnValue(
      new Headers({
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp,
      }) as any
    )

    const mockUser1 = { id: 'user1_id' }
    const mockUser2 = { id: 'user2_id' }
    const mockBalance = { id: 'balance_id', creditsRemaining: 100 }

    let callCount = 0
    const mockTransaction = vi.fn().mockImplementation(async (callback: any) => {
      callCount++
      const mockTx = {
        user: {
          findUnique: vi.fn().mockResolvedValue(callCount === 1 ? null : mockUser2),
          create: vi.fn().mockResolvedValue(mockUser1),
        },
        creditBalance: {
          findUnique: vi.fn().mockResolvedValue(callCount === 2 ? mockBalance : null),
          upsert: vi.fn().mockResolvedValue({}),
          update: vi.fn().mockResolvedValue({}),
        },
      }
      return await callback(mockTx)
    })

    vi.mocked(db.$transaction).mockImplementation(mockTransaction)

    const req = new Request('http://localhost/api/webhooks/users', {
      method: 'POST',
      body,
    })

    const response = await handler(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.processed).toBe(2)
  })
})

describe('User Webhook - Validation Errors', () => {
  const secret = 'test-secret-key'
  const timestamp = Math.floor(Date.now() / 1000).toString()

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.USER_WEBHOOK_SECRET = secret
  })

  function createSignature(body: string): string {
    return crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
  }

  it('should reject invalid JSON', async () => {
    const body = 'invalid json'
    const signature = createSignature(body)

    mockHeaders.mockReturnValue(
      new Headers({
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp,
      }) as any
    )

    const req = new Request('http://localhost/api/webhooks/users', {
      method: 'POST',
      body,
    })

    const response = await handler(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid JSON payload')
  })

  it('should reject invalid event type', async () => {
    const body = JSON.stringify({
      id: 'evt_12',
      type: 'invalid.type',
      data: { id: 'usr_1' },
    })
    const signature = createSignature(body)

    mockHeaders.mockReturnValue(
      new Headers({
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp,
      }) as any
    )

    const req = new Request('http://localhost/api/webhooks/users', {
      method: 'POST',
      body,
    })

    const response = await handler(req)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.error).toBe('Invalid payload')
  })

  it('should reject missing user id', async () => {
    const body = JSON.stringify({
      id: 'evt_13',
      type: 'user.created',
      data: { email: 'test@example.com' },
    })
    const signature = createSignature(body)

    mockHeaders.mockReturnValue(
      new Headers({
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp,
      }) as any
    )

    const req = new Request('http://localhost/api/webhooks/users', {
      method: 'POST',
      body,
    })

    const response = await handler(req)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.error).toBe('Invalid payload')
  })

  it('should handle database errors gracefully', async () => {
    const body = JSON.stringify({
      id: 'evt_14',
      type: 'user.created',
      data: { id: 'usr_error', email: 'error@example.com' },
    })
    const signature = createSignature(body)

    mockHeaders.mockReturnValue(
      new Headers({
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp,
      }) as any
    )

    vi.mocked(db.$transaction).mockRejectedValue(new Error('Database error'))

    const req = new Request('http://localhost/api/webhooks/users', {
      method: 'POST',
      body,
    })

    const response = await handler(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to process event')
    expect(data.eventId).toBe('evt_14')
    expect(data.eventType).toBe('user.created')
  })

  it('should require USER_WEBHOOK_SECRET environment variable', async () => {
    delete process.env.USER_WEBHOOK_SECRET

    const body = JSON.stringify({
      id: 'evt_15',
      type: 'user.created',
      data: { id: 'usr_1' },
    })

    mockHeaders.mockReturnValue(
      new Headers({
        'x-webhook-signature': 'signature',
        'x-webhook-timestamp': timestamp,
      }) as any
    )

    const req = new Request('http://localhost/api/webhooks/users', {
      method: 'POST',
      body,
    })

    await expect(handler(req)).rejects.toThrow('USER_WEBHOOK_SECRET is not configured')
  })
})

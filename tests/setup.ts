import { vi } from 'vitest'

// Mock Next.js headers
vi.mock('next/headers', () => ({
  headers: vi.fn(),
}))

// Mock Prisma
vi.mock('@/lib/db', () => ({
  db: {
    $transaction: vi.fn(),
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    creditBalance: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    usageHistory: {
      deleteMany: vi.fn(),
    },
    storageObject: {
      deleteMany: vi.fn(),
    },
    subscriptionEvent: {
      updateMany: vi.fn(),
    },
  },
}))

// Mock API logging
vi.mock('@/lib/logging/api', () => ({
  withApiLogging: (handler: any) => handler,
}))



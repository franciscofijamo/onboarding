import type { StorageProvider, StorageProviderType } from './types'
import { VercelBlobStorage } from './vercel-blob'
import { ReplitAppStorage } from './replit'

/**
 * Obtém o provedor de storage configurado baseado nas variáveis de ambiente
 * 
 * Ordem de prioridade:
 * 1. STORAGE_PROVIDER (se definido explicitamente)
 * 2. Verifica se REPLIT_STORAGE_BUCKET_ID está configurado (usa Replit)
 * 3. Verifica se BLOB_READ_WRITE_TOKEN está configurado (usa Vercel Blob)
 * 4. Lança erro se nenhum estiver configurado
 */
export function getStorageProvider(): StorageProvider {
  const explicitProvider = process.env.STORAGE_PROVIDER as StorageProviderType | undefined

  if (explicitProvider === 'replit') {
    const bucketId = process.env.REPLIT_STORAGE_BUCKET_ID
    if (!bucketId) {
      throw new Error(
        'STORAGE_PROVIDER=replit mas REPLIT_STORAGE_BUCKET_ID não está configurado'
      )
    }
    return new ReplitAppStorage(bucketId)
  }

  if (explicitProvider === 'vercel_blob') {
    const token = process.env.BLOB_READ_WRITE_TOKEN
    if (!token) {
      throw new Error(
        'STORAGE_PROVIDER=vercel_blob mas BLOB_READ_WRITE_TOKEN não está configurado'
      )
    }
    return new VercelBlobStorage(token)
  }

  // Auto-detecta baseado nas variáveis de ambiente disponíveis
  const replitBucketId = process.env.REPLIT_STORAGE_BUCKET_ID
  const vercelToken = process.env.BLOB_READ_WRITE_TOKEN

  if (replitBucketId) {
    return new ReplitAppStorage(replitBucketId)
  }

  if (vercelToken) {
    return new VercelBlobStorage(vercelToken)
  }

  throw new Error(
    'Nenhum provedor de storage configurado. Configure REPLIT_STORAGE_BUCKET_ID ou BLOB_READ_WRITE_TOKEN'
  )
}

/**
 * Obtém o nome do provedor de storage atual
 */
export function getStorageProviderName(): StorageProviderType {
  try {
    const provider = getStorageProvider()
    return provider.getProviderName() as StorageProviderType
  } catch {
    return 'vercel_blob' // fallback padrão
  }
}

// Exporta tipos e classes para uso direto se necessário
export type { StorageProvider, StorageProviderType, UploadResult, UploadOptions } from './types'
export { VercelBlobStorage } from './vercel-blob'
export { ReplitAppStorage } from './replit'


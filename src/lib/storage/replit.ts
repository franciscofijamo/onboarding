import { Client } from '@replit/object-storage'
import type { StorageProvider, UploadResult, UploadOptions } from './types'

/**
 * Implementação do StorageProvider usando o Replit App Storage SDK oficial.
 * Documentação: https://docs.replit.com/reference/object-storage-javascript-sdk
 */
export class ReplitAppStorage implements StorageProvider {
  private readonly bucketId: string
  private readonly client: Client

  constructor(bucketId?: string) {
    const resolvedBucketId = bucketId || process.env.REPLIT_STORAGE_BUCKET_ID || ''

    if (!resolvedBucketId) {
      throw new Error('REPLIT_STORAGE_BUCKET_ID não configurado')
    }

    this.bucketId = resolvedBucketId
    this.client = new Client({ bucketId: this.bucketId })
  }

  private buildPublicUrl(pathname: string) {
    const customBase = process.env.REPLIT_STORAGE_PUBLIC_BASE_URL?.replace(/\/$/, '')
    if (customBase) return `${customBase}/${pathname}`
    return `https://storage.googleapis.com/${this.bucketId}/${pathname}`
  }

  private extractPath(identifier: string) {
    if (!identifier.startsWith('http://') && !identifier.startsWith('https://')) {
      return identifier.replace(/^\/+/, '')
    }

    const url = new URL(identifier)
    let pathname = url.pathname.replace(/^\/+/, '')
    const prefix = `${this.bucketId}/`

    if (pathname.startsWith(prefix)) {
      pathname = pathname.slice(prefix.length)
    }

    return pathname
  }

  async upload(
    key: string,
    file: File | Blob,
    _options?: UploadOptions
  ): Promise<UploadResult> {
    void _options
    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await this.client.uploadFromBytes(key, buffer)

    if (!result.ok) {
      const message = result.error?.message ?? 'erro desconhecido'
      throw new Error(`Falha ao enviar arquivo para o Replit App Storage: ${message}`)
    }

    return {
      url: this.buildPublicUrl(key),
      pathname: key,
    }
  }

  async delete(identifier: string): Promise<void> {
    const objectName = this.extractPath(identifier)
    const result = await this.client.delete(objectName, { ignoreNotFound: true })

    if (!result.ok) {
      if (result.error?.statusCode === 404) {
        return
      }

      const message = result.error?.message ?? 'erro desconhecido'
      throw new Error(`Falha ao deletar arquivo do Replit App Storage: ${message}`)
    }
  }

  getProviderName(): string {
    return 'replit'
  }
}

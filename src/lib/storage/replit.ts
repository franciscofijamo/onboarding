import { Storage } from '@google-cloud/storage'
import type { StorageProvider, UploadResult, UploadOptions } from './types'

export class ReplitAppStorage implements StorageProvider {
  private readonly bucketId: string
  private readonly storage: Storage
  private readonly bucket: ReturnType<Storage['bucket']>

  constructor(bucketId?: string) {
    const resolvedBucketId = bucketId || process.env.REPLIT_STORAGE_BUCKET_ID || ''

    if (!resolvedBucketId) {
      throw new Error('REPLIT_STORAGE_BUCKET_ID is not configured')
    }

    this.bucketId = resolvedBucketId
    this.storage = new Storage()
    this.bucket = this.storage.bucket(this.bucketId)
  }

  async upload(
    key: string,
    file: File | Blob,
    _options?: UploadOptions
  ): Promise<UploadResult> {
    const buffer = Buffer.from(await file.arrayBuffer())
    const gcsFile = this.bucket.file(key)

    await gcsFile.save(buffer, {
      contentType: (file as File).type || 'application/octet-stream',
      resumable: false,
    })

    return {
      url: `https://storage.googleapis.com/${this.bucketId}/${key}`,
      pathname: key,
    }
  }

  async delete(identifier: string): Promise<void> {
    const objectName = this.extractPath(identifier)
    const gcsFile = this.bucket.file(objectName)
    try {
      await gcsFile.delete({ ignoreNotFound: true })
    } catch (error: unknown) {
      const status = (error as { code?: number })?.code
      if (status === 404) return
      throw error
    }
  }

  async getSignedUrl(key: string, expiresInMs = 60 * 60 * 1000): Promise<string> {
    const gcsFile = this.bucket.file(key)
    const [url] = await gcsFile.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresInMs,
    })
    return url
  }

  async downloadAsBuffer(key: string): Promise<Buffer> {
    const gcsFile = this.bucket.file(key)
    const [contents] = await gcsFile.download()
    return contents
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

  getProviderName(): string {
    return 'replit'
  }
}

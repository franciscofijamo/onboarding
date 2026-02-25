import { put, del } from '@vercel/blob'
import type { StorageProvider, UploadResult, UploadOptions } from './types'

/**
 * Implementação do StorageProvider usando Vercel Blob
 */
export class VercelBlobStorage implements StorageProvider {
  private token: string | undefined

  constructor(token?: string) {
    this.token = token || process.env.BLOB_READ_WRITE_TOKEN
  }

  async upload(
    key: string,
    file: File | Blob,
    _options?: UploadOptions
  ): Promise<UploadResult> {
    void _options
    if (!this.token) {
      throw new Error('BLOB_READ_WRITE_TOKEN não configurado')
    }

    const uploaded = await put(key, file, {
      access: 'public',
      token: this.token,
    })

    return {
      url: uploaded.url,
      pathname: uploaded.pathname,
    }
  }

  async delete(url: string): Promise<void> {
    if (!this.token) {
      throw new Error('BLOB_READ_WRITE_TOKEN não configurado')
    }

    await del(url, { token: this.token })
  }

  getProviderName(): string {
    return 'vercel_blob'
  }
}

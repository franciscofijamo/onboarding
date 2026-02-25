/**
 * Resultado de um upload de arquivo
 */
export interface UploadResult {
  url: string
  pathname: string
}

/**
 * Opções para upload de arquivo
 */
export interface UploadOptions {
  access?: 'public' | 'private'
}

/**
 * Interface para provedores de storage
 */
export interface StorageProvider {
  /**
   * Faz upload de um arquivo
   * @param key - Caminho/chave onde o arquivo será armazenado
   * @param file - Arquivo a ser enviado
   * @param options - Opções de upload
   * @returns Resultado do upload com URL e pathname
   */
  upload(key: string, file: File | Blob, options?: UploadOptions): Promise<UploadResult>

  /**
   * Deleta um arquivo do storage
   * @param url - URL do arquivo a ser deletado
   * @returns Promise que resolve quando a deleção for concluída
   */
  delete(url: string): Promise<void>

  /**
   * Retorna o nome do provedor
   */
  getProviderName(): string
}

/**
 * Tipos de provedores de storage suportados
 */
export type StorageProviderType = 'vercel_blob' | 'replit'


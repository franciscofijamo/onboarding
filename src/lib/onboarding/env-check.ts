export type EnvCategory = 'Clerk' | 'Segurança' | 'Infra' | 'Aplicativo' | 'Admin';

export interface EnvChecklistItem {
  key: string;
  label: string;
  description: string;
  docsPath?: string;
  category: EnvCategory;
  value: string;
  isConfigured: boolean;
}

export const CLERK_ENV_KEYS = [
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'CLERK_WEBHOOK_SECRET',
] as const;

export type ClerkEnvKey = typeof CLERK_ENV_KEYS[number];

const REQUIRED_ENV_VARS: Omit<EnvChecklistItem, 'value' | 'isConfigured'>[] = [
  {
    key: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    label: 'Clerk Publishable Key',
    description: 'Chave pública usada pelo frontend para inicializar o Clerk.',
    docsPath: '.context/docs/authentication.md',
    category: 'Clerk',
  },
  {
    key: 'CLERK_SECRET_KEY',
    label: 'Clerk Secret Key',
    description: 'Chave privada necessária para operações server-side e webhooks.',
    docsPath: '.context/docs/authentication.md',
    category: 'Clerk',
  },
  {
    key: 'CLERK_WEBHOOK_SECRET',
    label: 'Clerk Webhook Secret',
    description: 'Usada para validar eventos de billing recebidos do Clerk.',
    docsPath: '.context/docs/authentication.md',
    category: 'Clerk',
  },
  {
    key: 'DATABASE_URL',
    label: 'Database URL',
    description: 'String de conexão PostgreSQL usada pelo Prisma.',
    docsPath: '.context/docs/database.md',
    category: 'Infra',
  },
  {
    key: 'BLOB_READ_WRITE_TOKEN',
    label: 'Blob Read Write Token',
    description: 'Token do Vercel Blob Storage usado para uploads de arquivos no chat AI. Alternativa: use REPLIT_STORAGE_BUCKET_ID.',
    docsPath: '.context/docs/uploads.md',
    category: 'Infra',
  },
  {
    key: 'REPLIT_STORAGE_BUCKET_ID',
    label: 'Replit Storage Bucket ID',
    description: 'ID do bucket do Replit App Storage usado para uploads de arquivos no chat AI. Alternativa: use BLOB_READ_WRITE_TOKEN.',
    docsPath: '.context/docs/uploads.md',
    category: 'Infra',
  },
  {
    key: 'OPENROUTER_API_KEY',
    label: 'OpenRouter API Key',
    description: 'Chave da API do OpenRouter usada para geração de conteúdo e chat AI.',
    docsPath: '.context/docs/ai-chat.md',
    category: 'Aplicativo',
  },
  {
    key: 'NEXT_PUBLIC_APP_URL',
    label: 'App URL',
    description: 'URL base usada para callbacks e links no frontend.',
    docsPath: '.context/docs/development-guidelines.md',
    category: 'Aplicativo',
  },
  {
    key: 'ADMIN_EMAILS',
    label: 'Admin Emails',
    description: 'Lista de emails separados por vírgula que terão acesso ao painel admin (/admin). Alternativa: use ADMIN_USER_IDS.',
    docsPath: '.context/docs/admin.md',
    category: 'Admin',
  },
  {
    key: 'ADMIN_USER_IDS',
    label: 'Admin User IDs',
    description: 'Lista de IDs do Clerk separados por vírgula que terão acesso ao painel admin (/admin). Alternativa: use ADMIN_EMAILS.',
    docsPath: '.context/docs/admin.md',
    category: 'Admin',
  },
];

/**
 * Obtém a lista de verificação de variáveis de ambiente.
 * 
 * IMPORTANTE: Esta função DEVE ser executada no servidor (Server Component ou API Route)
 * para ter acesso às variáveis de ambiente server-side (CLERK_SECRET_KEY, DATABASE_URL, etc.).
 * 
 * Segurança: Valores sensíveis não são expostos ao cliente - apenas variáveis NEXT_PUBLIC_*
 * terão seus valores expostos. Outras variáveis mostrarão "***configurado***" se estiverem configuradas.
 */
export function getEnvChecklist(): EnvChecklistItem[] {
  // Check storage configuration: at least one must be configured (BLOB_READ_WRITE_TOKEN or REPLIT_STORAGE_BUCKET_ID)
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim() || '';
  const replitBucketId = process.env.REPLIT_STORAGE_BUCKET_ID?.trim() || '';
  const hasStorageConfig = blobToken.length > 0 || replitBucketId.length > 0;

  return REQUIRED_ENV_VARS.map((item) => {
    // Special handling for ADMIN variables: at least one must be configured
    if (item.key === 'ADMIN_EMAILS' || item.key === 'ADMIN_USER_IDS') {
      const adminEmails = process.env.ADMIN_EMAILS?.trim() || '';
      const adminUserIds = process.env.ADMIN_USER_IDS?.trim() || '';
      const isConfigured = adminEmails.length > 0 || adminUserIds.length > 0;
      
      return {
        ...item,
        // Only expose values for admin vars (safe to show)
        value: item.key === 'ADMIN_EMAILS' ? adminEmails : adminUserIds,
        isConfigured,
      };
    }

    // Special handling for storage variables: at least one must be configured
    if (item.key === 'BLOB_READ_WRITE_TOKEN' || item.key === 'REPLIT_STORAGE_BUCKET_ID') {
      const raw = process.env[item.key];
      const value = typeof raw === 'string' ? raw : '';
      // Both are considered configured if at least one is configured
      const isConfigured = hasStorageConfig;
      
      // For security: don't expose actual values of sensitive env vars to client
      const shouldExposeValue = item.key.startsWith('NEXT_PUBLIC_');
      const displayValue = shouldExposeValue ? value : (isConfigured ? '***configurado***' : '');

      return {
        ...item,
        value: displayValue,
        isConfigured,
      };
    }
    
    const raw = process.env[item.key];
    const value = typeof raw === 'string' ? raw : '';
    const isConfigured = value.trim().length > 0;

    // For security: don't expose actual values of sensitive env vars to client
    // Only expose values for NEXT_PUBLIC_* vars (safe) and show masked/empty for others
    const shouldExposeValue = item.key.startsWith('NEXT_PUBLIC_');
    const displayValue = shouldExposeValue ? value : (isConfigured ? '***configurado***' : '');

    return {
      ...item,
      value: displayValue,
      isConfigured,
    };
  });
}

export function getEnvChecklistSummary() {
  const items = getEnvChecklist();
  const configuredCount = items.filter((item) => item.isConfigured).length;

  return {
    items,
    configuredCount,
    total: items.length,
    missingKeys: items.filter((item) => !item.isConfigured).map((item) => item.key),
  };
}

export function isEnvConfigured(key: string) {
  const value = process.env[key];
  return typeof value === 'string' && value.trim().length > 0;
}

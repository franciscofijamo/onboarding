const DEFAULT_SANDBOX_URL = 'https://sandbox.asaas.com/api/v3';
const PRODUCTION_URL = 'https://api.asaas.com/v3';

const apiUrl = process.env.ASAAS_API_URL || DEFAULT_SANDBOX_URL;
const isSandbox = apiUrl.includes('sandbox');

// Asaas minimum charge value (R$ 5.00)
export const ASAAS_MIN_VALUE = 5.00;

export const ASAAS_CONFIG = {
    apiKey: process.env.ASAAS_API_KEY || '',
    apiUrl,
    isSandbox,
    environment: isSandbox ? 'sandbox' : 'production',
};

// Log environment on initialization (server-side only, in development/sandbox)
if (typeof window === 'undefined' && (process.env.NODE_ENV !== 'production' || isSandbox)) {
    console.log(`[Asaas] Environment: ${ASAAS_CONFIG.environment.toUpperCase()}`);
    console.log(`[Asaas] API URL: ${ASAAS_CONFIG.apiUrl}`);
    if (!process.env.ASAAS_API_KEY) {
        console.warn('[Asaas] ⚠️  ASAAS_API_KEY is not set!');
    } else {
        console.log(`[Asaas] API Key: ${process.env.ASAAS_API_KEY.substring(0, 5)}...`);
    }
}

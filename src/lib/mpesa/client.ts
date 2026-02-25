import crypto from 'crypto';
import { MPESA_CONFIG } from './config';

export type MpesaC2BRequest = {
  transactionReference: string;
  customerMsisdn: string;
  amount: string;
  thirdPartyReference: string;
  serviceProviderCode: string;
};

export type MpesaC2BResponse = {
  output_ConversationID?: string;
  output_TransactionID?: string;
  output_ResponseDesc?: string;
  output_ResponseCode?: string;
  output_ThirdPartyReference?: string;
  output_error?: string;
};

/**
 * Convert raw DER base64 public key to PEM format
 * This matches the working PHP/TypeScript production code approach
 */
function toPemFromRawDerBase64(rawDerBase64: string): string {
  // Decode then re-encode to ensure consistent formatting
  const der = Buffer.from(rawDerBase64, 'base64');
  const b64 = der.toString('base64');
  const lines = b64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----`;
}

/**
 * Encrypt API key using RSA public key to generate Bearer token
 */
export function generateMpesaBearer(apiKey: string, publicKey: string): string {
  const publicKeyPem = toPemFromRawDerBase64(publicKey);
  const keyObj = crypto.createPublicKey(publicKeyPem);
  const encrypted = crypto.publicEncrypt(
    {
      key: keyObj,
      padding: crypto.constants.RSA_PKCS1_PADDING, // matches PHP openssl_public_encrypt default
    },
    Buffer.from(apiKey, 'utf8')
  );
  return encrypted.toString('base64');
}

/**
 * Extract host from base URL for Host header
 */
function getHostFromUrl(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    return url.host; // includes port if present
  } catch {
    return 'api.vm.co.mz';
  }
}

export async function mpesaC2BSingleStage(payload: MpesaC2BRequest) {
  const token = generateMpesaBearer(MPESA_CONFIG.apiKey, MPESA_CONFIG.publicKey);
  const url = `${MPESA_CONFIG.baseUrl}${MPESA_CONFIG.c2bPath}`;
  const host = getHostFromUrl(MPESA_CONFIG.baseUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MPESA_CONFIG.timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Host': host,
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Origin': MPESA_CONFIG.origin,
      },
      body: JSON.stringify({
        input_TransactionReference: payload.transactionReference,
        input_CustomerMSISDN: payload.customerMsisdn,
        input_Amount: payload.amount,
        input_ThirdPartyReference: payload.thirdPartyReference,
        input_ServiceProviderCode: payload.serviceProviderCode,
      }),
      signal: controller.signal,
    });

    const body = await response.json().catch(() => ({})) as MpesaC2BResponse;

    if (!response.ok) {
      const error = body?.output_ResponseDesc || body?.output_error || JSON.stringify(body);
      const err = new Error(`Mpesa API Error: ${response.status} - ${error}`);
      (err as Error & { status?: number; body?: MpesaC2BResponse }).status = response.status;
      (err as Error & { status?: number; body?: MpesaC2BResponse }).body = body;
      throw err;
    }

    return { status: response.status, body };
  } finally {
    clearTimeout(timeout);
  }
}

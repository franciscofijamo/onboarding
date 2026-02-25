/**
 * M-Pesa API Integration Test Script
 * 
 * Usage: npx tsx scripts/test-mpesa.ts <phone_number> [amount]
 * Example: npx tsx scripts/test-mpesa.ts 841234567 10
 */

import 'dotenv/config';
import crypto from 'crypto';

// Config
const MPESA_CONFIG = {
    apiKey: process.env.MPESA_API_KEY || '',
    publicKey: process.env.MPESA_PUBLIC_KEY || '',
    baseUrl: process.env.MPESA_BASE_URL || 'https://api.vm.co.mz:18352',
    c2bPath: process.env.MPESA_C2B_PATH || '/ipg/v1x/c2bPayment/singleStage/',
    origin: process.env.MPESA_ORIGIN || 'developer.mpesa.vm.co.mz',
    serviceProviderCode: process.env.MPESA_SERVICE_PROVIDER_CODE || '',
    timeoutMs: Number(process.env.MPESA_TIMEOUT_MS || 65000),
};

// Types
type MpesaC2BRequest = {
    transactionReference: string;
    customerMsisdn: string;
    amount: string;
    thirdPartyReference: string;
    serviceProviderCode: string;
};

type MpesaC2BResponse = {
    output_ConversationID?: string;
    output_TransactionID?: string;
    output_ResponseDesc?: string;
    output_ResponseCode?: string;
    output_ThirdPartyReference?: string;
    output_error?: string;
};

// Utility functions
function normalizeMsisdn(input: string) {
    const digits = input.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('258')) return digits;
    if (digits.startsWith('84') || digits.startsWith('85')) {
        return `258${digits}`;
    }
    return digits;
}

function isValidVodacomMsisdn(msisdn: string) {
    return /^258(84|85)\d{7}$/.test(msisdn);
}

/**
 * Convert raw DER base64 public key to PEM format
 * This matches the working PHP/TypeScript production code approach
 */
function toPemFromRawDerBase64(rawDerBase64: string): string {
    const der = Buffer.from(rawDerBase64, 'base64');
    const b64 = der.toString('base64');
    const lines = b64.match(/.{1,64}/g) ?? [];
    return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----`;
}

function generateMpesaBearer(apiKey: string, publicKey: string): string {
    const publicKeyPem = toPemFromRawDerBase64(publicKey);
    const keyObj = crypto.createPublicKey(publicKeyPem);
    const encrypted = crypto.publicEncrypt(
        {
            key: keyObj,
            padding: crypto.constants.RSA_PKCS1_PADDING,
        },
        Buffer.from(apiKey, 'utf8')
    );
    return encrypted.toString('base64');
}

function getHostFromUrl(baseUrl: string): string {
    try {
        const url = new URL(baseUrl);
        return url.host;
    } catch {
        return 'api.vm.co.mz';
    }
}

async function mpesaC2BSingleStage(payload: MpesaC2BRequest) {
    const token = generateMpesaBearer(MPESA_CONFIG.apiKey, MPESA_CONFIG.publicKey);
    const url = `${MPESA_CONFIG.baseUrl}${MPESA_CONFIG.c2bPath}`;
    const host = getHostFromUrl(MPESA_CONFIG.baseUrl);

    console.log('\n📡 Making request to:', url);
    console.log('🔗 Host header:', host);
    console.log('📦 Payload:', JSON.stringify({
        input_TransactionReference: payload.transactionReference,
        input_CustomerMSISDN: payload.customerMsisdn,
        input_Amount: payload.amount,
        input_ThirdPartyReference: payload.thirdPartyReference,
        input_ServiceProviderCode: payload.serviceProviderCode,
    }, null, 2));

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

        return { status: response.status, ok: response.ok, body };
    } finally {
        clearTimeout(timeout);
    }
}

function generateThirdPartyReference(onId: string = '1') {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `ON${onId}Time${hh}h${mm}`;
}

// Main test function
async function testMpesaPayment() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    🔧 M-Pesa API Test                          ');
    console.log('═══════════════════════════════════════════════════════════════');

    // Check configuration
    console.log('\n📋 Checking configuration...');

    const configCheck = {
        apiKey: MPESA_CONFIG.apiKey ? `✅ Set (${MPESA_CONFIG.apiKey.substring(0, 8)}...)` : '❌ Missing',
        publicKey: MPESA_CONFIG.publicKey ? `✅ Set (${MPESA_CONFIG.publicKey.substring(0, 20)}...)` : '❌ Missing',
        baseUrl: MPESA_CONFIG.baseUrl,
        serviceProviderCode: MPESA_CONFIG.serviceProviderCode || '❌ Missing',
    };

    console.log('\nConfiguration:');
    console.log('  API Key:', configCheck.apiKey);
    console.log('  Public Key:', configCheck.publicKey);
    console.log('  Base URL:', configCheck.baseUrl);
    console.log('  Service Provider Code:', configCheck.serviceProviderCode);
    console.log('  Origin:', MPESA_CONFIG.origin);
    console.log('  Timeout:', MPESA_CONFIG.timeoutMs, 'ms');

    // Check for missing config
    const missing: string[] = [];
    if (!MPESA_CONFIG.apiKey) missing.push('MPESA_API_KEY');
    if (!MPESA_CONFIG.publicKey) missing.push('MPESA_PUBLIC_KEY');
    if (!MPESA_CONFIG.serviceProviderCode) missing.push('MPESA_SERVICE_PROVIDER_CODE');

    if (missing.length > 0) {
        console.log('\n❌ Error: Missing configuration:', missing.join(', '));
        console.log('Please check your .env file');
        process.exit(1);
    }

    // Get test parameters from command line
    const phoneArg = process.argv[2];
    const amountArg = process.argv[3] || '1';

    if (!phoneArg) {
        console.log('\n⚠️  Usage: npx tsx scripts/test-mpesa.ts <phone_number> [amount]');
        console.log('   Example: npx tsx scripts/test-mpesa.ts 841234567 10');
        console.log('   Phone must be a valid Vodacom Mozambique number (84/85 prefix)');
        process.exit(1);
    }

    const normalizedPhone = normalizeMsisdn(phoneArg);

    if (!isValidVodacomMsisdn(normalizedPhone)) {
        console.log('\n❌ Invalid phone number:', phoneArg);
        console.log('   Normalized:', normalizedPhone);
        console.log('   Must be a Vodacom Mozambique number (starting with 84 or 85)');
        process.exit(1);
    }

    const amount = amountArg;
    // M-Pesa requires transaction reference to be between 1-20 characters
    const transactionRef = `TST${Date.now().toString().slice(-8)}`;
    const thirdPartyRef = generateThirdPartyReference('1');

    console.log('\n📱 Test Payment Details:');
    console.log('  Phone (normalized):', normalizedPhone);
    console.log('  Amount:', amount, 'MZN');
    console.log('  Transaction Ref:', transactionRef);
    console.log('  Third Party Ref:', thirdPartyRef);

    console.log('\n⏳ Initiating M-Pesa C2B payment...');
    console.log('   (This may take up to 65 seconds for timeout)');

    try {
        const result = await mpesaC2BSingleStage({
            transactionReference: transactionRef,
            customerMsisdn: normalizedPhone,
            amount: amount,
            thirdPartyReference: thirdPartyRef,
            serviceProviderCode: MPESA_CONFIG.serviceProviderCode,
        });

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('                      📨 Response                              ');
        console.log('═══════════════════════════════════════════════════════════════');

        console.log('\nHTTP Status:', result.status, result.ok ? '✅' : '❌');
        console.log('\nResponse Body:');
        console.log(JSON.stringify(result.body, null, 2));

        if (result.ok && result.body.output_ResponseCode === 'INS-0') {
            console.log('\n✅ SUCCESS! Payment initiated successfully.');
            console.log('   Conversation ID:', result.body.output_ConversationID);
            console.log('   Transaction ID:', result.body.output_TransactionID);
            console.log('   The customer should receive an STK push to confirm payment.');
        } else if (result.body.output_error) {
            console.log('\n❌ API Error:', result.body.output_error);
        } else {
            console.log('\n⚠️  Payment request completed but may not be successful.');
            console.log('   Response Code:', result.body.output_ResponseCode);
            console.log('   Description:', result.body.output_ResponseDesc);
        }

    } catch (error) {
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('                      ❌ Error                                 ');
        console.log('═══════════════════════════════════════════════════════════════');

        if (error instanceof Error) {
            console.log('\nError:', error.message);
            if ('cause' in error && error.cause) {
                console.log('Cause:', error.cause);
            }
        } else {
            console.log('\nUnknown error:', error);
        }
        process.exit(1);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
}

testMpesaPayment();

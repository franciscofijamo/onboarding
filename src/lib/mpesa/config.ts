export const MPESA_CONFIG = {
  apiKey: process.env.MPESA_API_KEY || "",
  publicKey: process.env.MPESA_PUBLIC_KEY || "",
  baseUrl: process.env.MPESA_BASE_URL || "https://api.vm.co.mz:18352",
  c2bPath: process.env.MPESA_C2B_PATH || "/ipg/v1x/c2bPayment/singleStage/",
  origin: process.env.MPESA_ORIGIN || "developer.mpesa.vm.co.mz",
  serviceProviderCode: process.env.MPESA_SERVICE_PROVIDER_CODE || "",
  timeoutMs: Number(process.env.MPESA_TIMEOUT_MS || 65000),
};

export function assertMpesaConfig() {
  const missing: string[] = [];
  if (!MPESA_CONFIG.apiKey) missing.push("MPESA_API_KEY");
  if (!MPESA_CONFIG.publicKey) missing.push("MPESA_PUBLIC_KEY");
  if (!MPESA_CONFIG.serviceProviderCode)
    missing.push("MPESA_SERVICE_PROVIDER_CODE");
  if (missing.length) {
    throw new Error(`Mpesa config missing: ${missing.join(", ")}`);
  }
}

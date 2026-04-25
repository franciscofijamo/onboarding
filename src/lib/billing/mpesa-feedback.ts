type CheckoutErrorPayload = {
  error?: string;
  code?: string;
};

function normalize(value: string | undefined) {
  return (value || "").trim().toLowerCase();
}

export function isLikelyMpesaDismissal(payload: CheckoutErrorPayload) {
  const code = normalize(payload.code);
  const error = normalize(payload.error);

  return (
    code.includes("cancel") ||
    code.includes("declin") ||
    code.includes("reject") ||
    code.includes("abort") ||
    error.includes("cancel") ||
    error.includes("dismiss") ||
    error.includes("declin") ||
    error.includes("reject") ||
    error.includes("abort")
  );
}

export async function postCheckoutWithTimeout(body: Record<string, unknown>, timeoutMs = 30_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    return { response, data };
  } finally {
    clearTimeout(timer);
  }
}

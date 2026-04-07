# Security Check

Run this review mindset before shipping auth, billing, uploads, or admin changes.

## Checklist
1. Confirm protected and admin routes enforce server-side identity checks.
2. Confirm secrets stay server-side and are never exposed to the client.
3. Confirm webhook and external callback routes validate signatures.
4. Confirm credit/billing mutations remain server-authoritative and transactional where possible.
5. Confirm uploads and external URLs are scoped, validated, and least-privilege by default.

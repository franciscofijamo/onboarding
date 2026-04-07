# Asaas Webhooks

Asaas webhook handling is implemented under `src/app/api/webhooks/asaas`.

## Responsibilities
- Validate incoming webhook authenticity.
- Map payment/subscription events into local billing state.
- Trigger plan activation or credit release after successful payment events.

## Editing Guidance
- Keep signature validation as the first gate in the route.
- Make event handling idempotent where possible because providers can retry.
- Update this doc and any billing/admin docs if webhook contracts or env vars change.

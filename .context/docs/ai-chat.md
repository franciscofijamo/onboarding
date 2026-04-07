# AI Chat

AI features are available from the protected app and powered by the Vercel AI SDK plus OpenRouter.

## Core Flow
- Text chat is handled by `POST /api/ai/chat`.
- Image generation is handled by `POST /api/ai/image`.
- The protected page in `src/app/(protected)/ai-chat` provides model/provider selection and streaming UI.

## Requirements
- `OPENROUTER_API_KEY`
- Credit settings must allow the requested operation.
- Optional upload storage config if attachments are enabled.

## Implementation Notes
- Keep provider and model handling on the server side.
- Refund or rollback credits when a charged AI request fails after deduction.
- If model lists or defaults change, update the UI and any static model config together.

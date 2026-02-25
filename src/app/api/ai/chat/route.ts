import { NextResponse } from 'next/server'
import { streamText, convertToModelMessages } from 'ai'
import type { ModelMessage, UIMessage } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod'
import { validateUserAuthentication } from '@/lib/auth-utils'
import { InsufficientCreditsError } from '@/lib/credits/errors'
import { validateCreditsForFeature, deductCreditsForFeature, refundCreditsForFeature } from '@/lib/credits/deduct'
import { type FeatureKey } from '@/lib/credits/feature-config'
import { withApiLogging } from '@/lib/logging/api'

// OpenRouter is OpenAI-compatible
const PROVIDER = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

const AttachmentSchema = z.object({ name: z.string().min(1).max(500), url: z.string().url() })

// Schema para as partes das mensagens
const MessagePartSchema = z.union([
  z.object({ type: z.literal('text'), text: z.string() }),
  z.object({ type: z.literal('reasoning'), text: z.string() }),
  z.object({ type: z.string(), text: z.string().optional() }) // Fallback para outros tipos
])

// Schema para mensagens UI
const UIMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  parts: z.array(MessagePartSchema)
})

const BodySchema = z
  .object({
    model: z.string().min(1),
    messages: z.array(UIMessageSchema).min(1),
    temperature: z.number().min(0).max(2).optional(),
    attachments: z.array(AttachmentSchema).optional(),
    id: z.string().optional(), // ID da conversa
    trigger: z.string().optional(), // Trigger do evento (submit-message, etc)
  })
  .strict()

function isAllowedModel(model: string) {
  // Basic sanity for OpenRouter model IDs: vendor/model and restricted charset
  return /^[a-z0-9-]+\/[a-z0-9_.:-]+$/i.test(model) && model.length <= 100
}

async function handleChatPost(req: Request) {
  try {
    // AuthN: require logged-in user for chat usage
    try {
      // clerk user id
      const userId = await validateUserAuthentication()
      // Pre-parse to also include in credits usage details if valid
      const parsed = BodySchema.safeParse(await req.json())
      if (!parsed.success) {
        return NextResponse.json({ error: 'Corpo da requisição inválido', issues: parsed.error.flatten() }, { status: 400 })
      }
      const { model, messages, temperature = 0.4, attachments } = parsed.data

      if (!isAllowedModel(model)) {
        return NextResponse.json({ error: 'Modelo não permitido' }, { status: 400 })
      }

      // quick key presence check
      if (!process.env.OPENROUTER_API_KEY) {
        return NextResponse.json({ error: 'Chave API ausente para OpenRouter.' }, { status: 400 })
      }

      // If there are attachments, append a user message listing them so the model can reference the files
      const modelMessages: ModelMessage[] = convertToModelMessages(messages as UIMessage[])
      if (attachments && attachments.length > 0) {
        const lines = attachments.map(a => `- ${a.name}: ${a.url}`).join('\n')
        const attachNote = `Anexos:\n${lines}`
        modelMessages.push({
          role: 'user',
          content: [{ type: 'text', text: attachNote }],
        })
      }

      // Credits: 1 credit per LLM request
      const feature: FeatureKey = 'ai_text_chat'
      try {
        await validateCreditsForFeature(userId, feature)
        await deductCreditsForFeature({
          clerkUserId: userId,
          feature,
          details: { model },
        })
      } catch (err: unknown) {
        if (err instanceof InsufficientCreditsError) {
          return NextResponse.json(
            { error: 'insufficient_credits', required: err.required, available: err.available },
            { status: 402 }
          )
        }
        throw err
      }

      try {
        const result = streamText({
          model: PROVIDER(model),
          messages: modelMessages,
          temperature,
        })
        return result.toUIMessageStreamResponse({ originalMessages: messages as UIMessage[] })
      } catch (providerErr: unknown) {
        // Provider call failed after deduction — reimburse user
        await refundCreditsForFeature({
          clerkUserId: userId,
          feature,
          quantity: 1,
          reason: (providerErr as { message?: string })?.message || 'chat_provider_error',
          details: { model },
        })
        return NextResponse.json({ error: 'Erro do provedor' }, { status: 502 })
      }
    } catch (e: unknown) {
      if ((e as { message?: string })?.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
      }
      throw e
    }
  } catch (e: unknown) {
    // Avoid leaking provider errors verbosely
    console.error('Erro interno do servidor', e)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export const POST = withApiLogging(handleChatPost, {
  method: 'POST',
  route: '/api/ai/chat',
  feature: 'ai_chat',
})

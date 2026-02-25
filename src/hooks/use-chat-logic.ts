import { useEffect, useCallback, useMemo, useState } from 'react'
import type { UIMessage } from 'ai'

export const STATIC_MODELS: { id: string; label: string }[] = [
  { id: 'openai/gpt-5', label: 'OpenAI · gpt-5' },
  { id: 'anthropic/claude-3.5-sonnet', label: 'Anthropic · Claude 3.5 Sonnet' },
]

export const STATIC_IMAGE_MODELS_OPENROUTER: { id: string; label: string }[] = [
  { id: 'google/gemini-2.5-flash-image-preview', label: 'Nano Banana' }
]

export const generateMessageId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`

export const createTextMessage = (
  role: 'user' | 'assistant' | 'system', 
  text: string
): UIMessage => ({
  id: generateMessageId(),
  role,
  parts: [{ type: 'text', text }]
})

export function useChatLogic() {
  const [model, setModel] = useState(STATIC_MODELS[0].id)
  const [mode, setMode] = useState<'text' | 'image'>('text')
  const [dynamicOpenRouterModels, setDynamicOpenRouterModels] = useState<
    { id: string; label: string }[] | null
  >(null)

  const currentModels = dynamicOpenRouterModels ?? (mode === 'image' ? STATIC_IMAGE_MODELS_OPENROUTER : STATIC_MODELS)

  const modelItems = useMemo(
    () => (currentModels ?? []).map((m) => ({ value: m.id, label: m.label })),
    [currentModels]
  )

  const extractTextFromMessage = useCallback((message: UIMessage) => {
    if (!message?.parts) return ''
    return message.parts
      .map(part => {
        if (part.type === 'text') return part.text
        if (part.type === 'reasoning') return part.text
        return ''
      })
      .filter(Boolean)
      .join('\n\n')
  }, [])

  // Switch model when mode changes
  useEffect(() => {
    if (mode === 'image') {
      const firstImageModel = (dynamicOpenRouterModels ?? STATIC_IMAGE_MODELS_OPENROUTER)[0]?.id
      if (firstImageModel) setModel(firstImageModel)
    } else {
      const fallback = (dynamicOpenRouterModels ?? STATIC_MODELS)[0]?.id
      if (fallback) setModel(fallback)
    }
  }, [mode, dynamicOpenRouterModels])

  return {
    model,
    setModel,
    mode,
    setMode,
    dynamicOpenRouterModels,
    setDynamicOpenRouterModels,
    currentModels,
    modelItems,
    extractTextFromMessage
  }
}

"use client"

import React, { useEffect, useDeferredValue, useMemo, useCallback, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import { Card } from '@/components/ui/card'
import { usePageConfig } from '@/hooks/use-page-config'
import { useCredits } from '@/hooks/use-credits'
import { useOpenRouterModels } from '@/hooks/use-openrouter-models'
import { useGenerateImage } from '@/hooks/use-ai-image'
import { useFileUpload } from '@/hooks/use-file-upload'
import { 
  useChatLogic, 
  STATIC_MODELS, 
  STATIC_IMAGE_MODELS_OPENROUTER,
  createTextMessage 
} from '@/hooks/use-chat-logic'
import { ChatHeader } from '@/components/ai-chat/ChatHeader'
import { ChatMessages } from '@/components/ai-chat/ChatMessages'
import { ChatInput } from '@/components/ai-chat/ChatInput'
import type { UploadItem } from '@/components/ai-chat/FileAttachments'

export default function AIChatPage() {
  usePageConfig('Chat com IA', 'Converse com diferentes LLMs via OpenRouter.', [
    { label: 'Início', href: '/dashboard' },
    { label: 'Chat com IA' },
  ])

  // Chat logic hook
  const {
    model,
    setModel,
    mode,
    setMode,
    setDynamicOpenRouterModels,
    modelItems,
    extractTextFromMessage
  } = useChatLogic()

  // File upload hook
  const {
    fileInputRef,
    attachments,
    readyAttachments,
    hasUploadingAttachments,
    dragActive,
    handleAttachFile,
    removeAttachment,
    cancelUpload,
    onFileSelected,
    onDrop,
    onDragOver,
    onDragLeave,
    clearAttachments
  } = useFileUpload()

  // Input state
  const [input, setInput] = useState('')

  const modelRef = useRef(model)
  useEffect(() => {
    modelRef.current = model
  }, [model])

  const attachmentPayloadRef = useRef<{ name: string; url: string }[]>([])
  useEffect(() => {
    attachmentPayloadRef.current = readyAttachments.map(a => ({ name: a.name, url: a.url }))
  }, [readyAttachments])

  // Chat transport
  const transportRef = useRef<DefaultChatTransport<UIMessage> | null>(null)
  if (!transportRef.current) {
    transportRef.current = new DefaultChatTransport<UIMessage>({
      api: '/api/ai/chat',
      body: () => ({
        model: modelRef.current,
        attachments: attachmentPayloadRef.current,
      }),
    })
  }

  // useChat hook
  const { messages, status, sendMessage, setMessages, stop, regenerate } = useChat({
    transport: transportRef.current,
    experimental_throttle: 60,
  })

  const isLoading = status === 'submitted' || status === 'streaming'
  const deferredMessages = useDeferredValue(messages)

  // Credits hook
  const { credits, canPerformOperation, getCost, refresh } = useCredits()

  // Helper functions
  const appendAssistantMessage = useCallback(
    (text: string, idOverride?: string) => {
      const message = createTextMessage('assistant', text)
      if (idOverride) {
        message.id = idOverride
      }
      setMessages(prev => [...prev, message])
    },
    [setMessages]
  )

  const handleChatError = useCallback(
    (error: unknown) => {
      if (error instanceof Error) {
        try {
          const data = JSON.parse(error.message)
          if (data?.error === 'insufficient_credits') {
            const required = data?.required ?? ''
            const available = data?.available ?? ''
            appendAssistantMessage(
              `Você não tem créditos. Necessário ${required}, disponível ${available}.\n\n[Ir para cobrança →](/billing)`,
              `sys-nocred-${Date.now()}`
            )
            refresh()
            return
          }
        } catch {
          // fall through to generic error message
        }
        appendAssistantMessage('Não foi possível obter uma resposta. Tente novamente em instantes.')
        return
      }
      appendAssistantMessage('Não foi possível obter uma resposta. Tente novamente em instantes.')
    },
    [appendAssistantMessage, refresh]
  )

  // OpenRouter models
  const {
    data: openRouterModelsData,
    isLoading: isLoadingModels
  } = useOpenRouterModels(
    mode === 'image' ? 'image' : 'text'
  )

  useEffect(() => {
    if (openRouterModelsData?.models && openRouterModelsData.models.length > 0) {
      const formattedModels = openRouterModelsData.models.map(model => ({
        id: model.id,
        label: model.label
      }))
      setDynamicOpenRouterModels(formattedModels)
      setModel(openRouterModelsData.models[0].id)
    } else if (!isLoadingModels) {
      setDynamicOpenRouterModels(null)
      const fallback = (mode === 'image' ? STATIC_IMAGE_MODELS_OPENROUTER : STATIC_MODELS)[0]?.id
      if (fallback) setModel(fallback)
    }
  }, [mode, openRouterModelsData, isLoadingModels, setDynamicOpenRouterModels, setModel])

  // Image generation
  const generateImage = useGenerateImage()

  const handleSubmitImage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const prompt = input.trim()
    if (!prompt) return

    setInput('')

    try {
      const result = await generateImage.mutateAsync({
        model,
        prompt,
        size: '1024x1024',
        count: 1,
        attachments: readyAttachments.map(a => ({ name: a.name, url: a.url })),
      })

      refresh()
      const images: string[] = Array.isArray(result?.images) ? result.images : []
      const attachmentCount = readyAttachments.length
      const promptWithMeta = prompt + (attachmentCount ? `\n\n(Anexada${attachmentCount > 1 ? 's' : ''} ${attachmentCount} imagem${attachmentCount > 1 ? 'ns' : ''})` : '')
      setMessages(prev => [
        ...prev,
        createTextMessage('user', promptWithMeta),
        createTextMessage('assistant', JSON.stringify({ images })),
      ])
      clearAttachments()
    } catch (error) {
      if ((error as Error)?.message?.includes('402') || (error as Error)?.message?.includes('crédito')) {
        setMessages(prev => [
          ...prev,
          createTextMessage('user', prompt),
          createTextMessage('assistant', 'Você não tem créditos suficientes. [Ir para cobrança →](/billing)'),
        ])
      } else {
        setMessages(prev => [
          ...prev,
          createTextMessage('user', prompt),
          createTextMessage('assistant', 'Não foi possível gerar a imagem. Tente novamente.'),
        ])
      }
    }
  }

  const handleSubmitText = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const prompt = input.trim()
    if (!prompt || hasUploadingAttachments) {
      return
    }
    try {
      await sendMessage({ text: prompt })
      setInput('')
      clearAttachments()
      setTimeout(() => refresh(), 300)
    } catch (error) {
      handleChatError(error)
    }
  }

  const handleRetry = useCallback((assistantIndex: number) => {
    const target = messages[assistantIndex]
    if (!target || target.role !== 'assistant') {
      return
    }
    void regenerate({ messageId: target.id }).catch(handleChatError)
  }, [messages, regenerate, handleChatError])

  const handleCancelUpload = useCallback((attachment: UploadItem, index: number) => {
    cancelUpload(attachment)
    removeAttachment(index)
  }, [cancelUpload, removeAttachment])

  // Credits transition effect
  const prevCreditsRef = useRef<number | null>(null)
  useEffect(() => {
    const current = credits?.creditsRemaining ?? null
    const prev = prevCreditsRef.current
    prevCreditsRef.current = current
    if (prev != null && prev > 0 && current === 0) {
      const hasTip = messages.some(m => m.id?.toString().startsWith('sys-nocred-'))
      if (!hasTip) {
        const id = `sys-nocred-${Date.now()}`
        appendAssistantMessage('Você não tem mais créditos. [Ir para cobrança →](/billing)', id)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credits?.creditsRemaining])

  // Submit handler
  const handleSubmit = mode === 'image' ? handleSubmitImage : handleSubmitText

  // Can submit check
  const canSubmit = useMemo(() => {
    if (hasUploadingAttachments) return false
    if (mode === 'image' && readyAttachments.length === 0) return false
    if (!input.trim()) return false
    if (mode === 'image') {
      return canPerformOperation('image_generation')
    }
    return canPerformOperation('ai_chat')
  }, [hasUploadingAttachments, mode, readyAttachments.length, input, canPerformOperation])

  return (
    <Card className="mx-auto flex w-full flex-1 flex-col gap-4 rounded-2xl p-3 sm:gap-6 sm:p-6 lg:min-h-[70dvh] shadow-none">
      <ChatHeader
        credits={credits}
        onClearChat={() => setMessages([])}
      />

      <ChatMessages
        messages={deferredMessages}
        isLoading={isLoading}
        isPendingImage={generateImage.isPending}
        onRetry={handleRetry}
        extractTextFromMessage={extractTextFromMessage}
      />

      <ChatInput
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        mode={mode}
        model={model}
        modelItems={modelItems}
        onModeChange={setMode}
        onModelChange={setModel}
        attachments={attachments}
        onAttachFile={handleAttachFile}
        onRemoveAttachment={removeAttachment}
        onCancelUpload={handleCancelUpload}
        isLoading={isLoading}
        isPendingImage={generateImage.isPending}
        hasUploadingAttachments={hasUploadingAttachments}
        canSubmit={canSubmit}
        creditCost={getCost(mode === 'image' ? 'image_generation' : 'ai_chat')}
        creditLabel={mode === 'image' ? 'créditos' : 'crédito'}
        onStop={() => void stop()}
        fileInputRef={fileInputRef}
        onFileSelected={onFileSelected}
        dragActive={dragActive}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      />
    </Card>
  )
}

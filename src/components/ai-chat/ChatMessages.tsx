import * as React from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageBubble } from '@/components/chat/message-bubble'
import { Loader2 } from 'lucide-react'
import type { UIMessage } from 'ai'

interface ChatMessagesProps {
  messages: UIMessage[]
  isLoading: boolean
  isPendingImage?: boolean
  onRetry: (assistantIndex: number) => void
  extractTextFromMessage: (message: UIMessage) => string
}

export function ChatMessages({
  messages,
  isLoading,
  isPendingImage = false,
  onRetry,
  extractTextFromMessage
}: ChatMessagesProps) {
  const listRef = React.useRef<HTMLDivElement>(null)
  const endRef = React.useRef<HTMLDivElement>(null)
  const scrollRafRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    // auto-scroll to bottom when messages update
    if (scrollRafRef.current != null) {
      cancelAnimationFrame(scrollRafRef.current)
    }
    scrollRafRef.current = requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ block: 'end' })
      scrollRafRef.current = null
    })
    return () => {
      if (scrollRafRef.current != null) {
        cancelAnimationFrame(scrollRafRef.current)
        scrollRafRef.current = null
      }
    }
  }, [messages])

  return (
    <ScrollArea className="flex-1">
      <div
        ref={listRef}
        className="flex min-h-full flex-col gap-3 px-3 py-4 sm:gap-4 sm:px-0 sm:py-6"
      >
        {messages.length === 0 && (
          <p className="max-w-xl text-xs text-muted-foreground sm:text-sm">
            Selecione o provedor e o modelo, envie uma mensagem e acompanhe a resposta em tempo real.
          </p>
        )}
        {messages.map((m, idx) => {
          const normalizedRole = (m.role === 'user' || m.role === 'assistant' || m.role === 'system')
            ? m.role
            : 'assistant'
          const disableMarkdown =
            normalizedRole === 'assistant' &&
            isLoading &&
            idx === messages.length - 1
          const content = extractTextFromMessage(m)

          return (
            <MessageBubble
              key={m.id}
              message={{
                id: m.id,
                role: normalizedRole,
                content
              }}
              onRetry={normalizedRole !== 'user' ? onRetry : undefined}
              retryIndex={idx}
              disableMarkdown={disableMarkdown}
            />
          )
        })}
        {(isLoading || isPendingImage) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin sm:h-3.5 sm:w-3.5" />
            {isPendingImage ? 'Gerando imagem...' : 'Gerando resposta...'}
          </div>
        )}
        <div ref={endRef} />
      </div>
    </ScrollArea>
  )
}

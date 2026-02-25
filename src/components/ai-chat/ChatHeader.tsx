import * as React from 'react'
import { Button } from '@/components/ui/button'
import { CreditStatus } from '@/components/credits/credit-status'
import { cn } from '@/lib/utils'
import { Trash2 } from 'lucide-react'

interface ChatHeaderProps {
   credits?: {
    creditsRemaining: number
  }
   onClearChat: () => void
}

export function ChatHeader({
  credits,
   onClearChat
}: ChatHeaderProps) {
  const hasCreditsData = credits?.creditsRemaining != null

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-background/90 px-3 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5 sm:py-4">
      <div className="flex flex-col gap-2">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground sm:text-[12px]">
          Sessão atual
        </span>
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
        <CreditStatus
          className={cn(
            'shrink-0 rounded-full border border-border/60 bg-muted/60 px-3 py-1.5 text-[11px] font-medium text-foreground transition-opacity sm:text-xs',
            !hasCreditsData && 'opacity-70'
          )}
          showUpgradeButton={false}
        />
        <Button
          variant="ghost"
           aria-label="Limpar chat"
          onClick={onClearChat}
          className="ml-auto sm:ml-0"
        >
          Reiniciar <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

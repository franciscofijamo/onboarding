"use client"

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = React.ComponentProps<typeof Button> & {
  isOpen?: boolean
}

export function DropdownTriggerButton({ isOpen, className, children, ...props }: Props) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        'relative h-8 gap-2 overflow-hidden rounded-lg px-2 text-xs group',
        isOpen && 'bg-muted/60',
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  )
}


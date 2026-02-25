import * as React from 'react'
import { Button } from '@/components/ui/button'
import { DropdownTriggerButton } from '@/components/ui/dropdown-trigger-button'
import { Autocomplete } from '@/components/ui/autocomplete'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MessageSquare, Image as ImageIcon, Sparkles, Paperclip } from 'lucide-react'

interface ModelSelectorProps {
  mode: 'text' | 'image'
  model: string
  modelItems: { value: string; label: string }[]
  onModeChange: (mode: 'text' | 'image') => void
  onModelChange: (model: string) => void
  onAttachFile: () => void
}

export function ModelSelector({
  mode,
  model,
  modelItems,
  onModeChange,
  onModelChange,
  onAttachFile
}: ModelSelectorProps) {

  const [modeMenuOpen, setModeMenuOpen] = React.useState(false)

  return (
    <div className="flex flex-wrap items-center gap-1 sm:flex-nowrap sm:gap-2">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onAttachFile}
        aria-label="Anexar"
        className="shrink-0"
      >
        <Paperclip className="h-4 w-4" />
      </Button>

      {/* Mode selector */}
      <DropdownMenu open={modeMenuOpen} onOpenChange={setModeMenuOpen}>
        <DropdownMenuTrigger asChild>
          <DropdownTriggerButton
            isOpen={modeMenuOpen}
            aria-label="Selecionar modo"
            className="min-w-0"
          >
            {mode === 'image' ? (
              <ImageIcon className="h-4 w-4 shrink-0" />
            ) : (
              <MessageSquare className="h-4 w-4 shrink-0" />
            )}
            <span className="hidden sm:inline truncate max-w-[100px]">{mode === 'text' ? 'Texto' : 'Imagem'}</span>
          </DropdownTriggerButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onModeChange('text')}>
            <MessageSquare className="h-4 w-4 mr-2" /> Texto
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onModeChange('image')}>
            <ImageIcon className="h-4 w-4 mr-2" /> Imagem
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Model selector */}
      <Autocomplete
        items={modelItems}
        value={model}
        onChange={onModelChange}
        icon={<Sparkles className="h-4 w-4" />}
        buttonAriaLabel="Selecionar modelo"
        placeholder="Buscar modelo..."
        className="w-full min-w-0 sm:flex-1 sm:min-w-[220px]"
      />
    </div>
  )
}

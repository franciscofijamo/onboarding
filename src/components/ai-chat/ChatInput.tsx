import * as React from 'react'
import { Button } from '@/components/ui/button'
import { FileAttachments, type UploadItem } from './FileAttachments'
import { ModelSelector } from './ModelSelector'
import { Send, Square, Loader2 } from 'lucide-react'

interface ChatInputProps {
  input: string
  onInputChange: (value: string) => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  mode: 'text' | 'image'
  model: string
  modelItems: { value: string; label: string }[]
  onModeChange: (mode: 'text' | 'image') => void
  onModelChange: (model: string) => void
  attachments: UploadItem[]
  onAttachFile: () => void
  onRemoveAttachment: (index: number) => void
  onCancelUpload?: (attachment: UploadItem, index: number) => void
  isLoading: boolean
  isPendingImage?: boolean
  hasUploadingAttachments: boolean
  canSubmit: boolean
  creditCost: number
  creditLabel: string
  onStop: () => void
  fileInputRef: React.RefObject<HTMLInputElement>
  onFileSelected: (e: React.ChangeEvent<HTMLInputElement>) => void
  dragActive: boolean
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void
}

export function ChatInput({
  input,
  onInputChange,
  onSubmit,
  mode,
  model,
  modelItems,
  onModeChange,
  onModelChange,
  attachments,
  onAttachFile,
  onRemoveAttachment,
  onCancelUpload,
  isLoading,
  isPendingImage = false,
  canSubmit,
  creditCost,
  creditLabel,
  onStop,
  fileInputRef,
  onFileSelected,
  dragActive,
  onDrop,
  onDragOver,
  onDragLeave
}: ChatInputProps) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const form = (e.currentTarget as HTMLTextAreaElement).form
      form?.requestSubmit()
    }
  }

  return (
    <div 
      className={`relative rounded-2xl border bg-background/90 ${
        dragActive ? 'border-primary ring-2 ring-primary/30' : 'border-border/60'
      }`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <form onSubmit={onSubmit} className="p-2 sm:p-3">
        <textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Digite sua mensagem... (Shift+Enter para nova linha)"
          rows={2}
          className="min-h-[60px] w-full resize-none rounded-md bg-transparent px-2 sm:px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        
        <input 
          ref={fileInputRef} 
          type="file" 
          className="hidden" 
          onChange={onFileSelected} 
          multiple 
          accept={mode === 'image' ? 'image/*' : undefined} 
        />
        
        <FileAttachments 
          attachments={attachments} 
          onRemove={onRemoveAttachment}
          onCancel={onCancelUpload}
        />

        <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t pt-3">
          <ModelSelector
            mode={mode}
            model={model}
            modelItems={modelItems}
            onModeChange={onModeChange}
            onModelChange={onModelChange}
            onAttachFile={onAttachFile}
          />
          
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            <span className="text-xs text-muted-foreground">
              Custo: {creditCost} {creditLabel}
            </span>
            
            {isLoading ? (
              <Button
                type="button"
                onClick={onStop}
                variant="secondary"
                size="sm"
                className="gap-1 sm:gap-2"
                aria-label="Parar geração"
              >
                <Square className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Parar</span>
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!canSubmit}
                size="sm"
                className="gap-1 sm:gap-2"
              >
                {isPendingImage ? (
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                ) : (
                  <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                )}
                <span className="hidden sm:inline">Enviar</span>
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}

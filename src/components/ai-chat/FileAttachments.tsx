import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X as XIcon } from 'lucide-react'

export interface UploadItem {
  id: string
  name: string
  size: number
  url?: string
  status: 'uploading' | 'done' | 'error'
  progress: number
  error?: string
}

interface FileAttachmentsProps {
  attachments: UploadItem[]
  onRemove: (index: number) => void
  onCancel?: (attachment: UploadItem, index: number) => void
}

export function FileAttachments({ attachments, onRemove, onCancel }: FileAttachmentsProps) {
  if (attachments.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        className="mt-2 flex flex-wrap gap-1 sm:gap-2"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
      >
        {attachments.map((att, i) => (
          <motion.div
            key={att.id}
            className="flex items-center gap-1 sm:gap-2 rounded-lg bg-muted px-2 sm:px-3 py-1 sm:py-1.5 text-xs"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            {att.url ? (
              <a href={att.url} target="_blank" rel="noreferrer" className="underline hover:no-underline">
                {att.name}
              </a>
            ) : (
              <span>{att.name}</span>
            )}
            {att.status === 'uploading' && (
              <span className="text-muted-foreground">{att.progress}%</span>
            )}
            {att.status === 'error' && (
              <span className="text-destructive">{att.error || 'Falhou'}</span>
            )}
            <button
              type="button"
              onClick={() => {
                if (att.status === 'uploading' && onCancel) {
                  onCancel(att, i)
                } else {
                  onRemove(i)
                }
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <XIcon className="h-3 w-3" />
            </button>
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  )
}

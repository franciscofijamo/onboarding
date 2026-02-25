import * as React from 'react'
import type { UploadItem } from '@/components/ai-chat/FileAttachments'

export function useFileUpload() {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const uploadRefs = React.useRef<Record<string, XMLHttpRequest>>({})
  const [attachments, setAttachments] = React.useState<UploadItem[]>([])
  const [dragActive, setDragActive] = React.useState(false)

  const readyAttachments = React.useMemo(
    () => attachments.filter((a): a is UploadItem & { url: string } => 
      a.status === 'done' && typeof a.url === 'string'
    ),
    [attachments]
  )

  const hasUploadingAttachments = React.useMemo(
    () => attachments.some(a => a.status === 'uploading'),
    [attachments]
  )

  const startUpload = React.useCallback((file: File) => {
    const id = `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const item: UploadItem = { 
      id, 
      name: file.name, 
      size: file.size, 
      status: 'uploading', 
      progress: 0 
    }
    
    setAttachments(prev => [...prev, item])
    
    const fd = new FormData()
    fd.set('file', file)
    
    const xhr = new XMLHttpRequest()
    uploadRefs.current[id] = xhr
    
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        const pct = Math.min(99, Math.round((ev.loaded / ev.total) * 100))
        setAttachments(prev => prev.map(a => 
          a.id === id ? { ...a, progress: pct } : a
        ))
      }
    }
    
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        delete uploadRefs.current[id]
        
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText)
            setAttachments(prev => prev.map(a => 
              a.id === id 
                ? { ...a, url: data?.url, status: 'done', progress: 100 } 
                : a
            ))
          } catch {
            setAttachments(prev => prev.map(a => 
              a.id === id 
                ? { ...a, status: 'error', error: 'Resposta inválida do servidor' } 
                : a
            ))
          }
        } else {
          let msg = 'Falha no upload'
          try { 
            msg = (JSON.parse(xhr.responseText)?.error) || msg 
          } catch {}
          setAttachments(prev => prev.map(a => 
            a.id === id 
              ? { ...a, status: 'error', error: msg } 
              : a
          ))
        }
      }
    }
    
    xhr.open('POST', '/api/upload')
    xhr.send(fd)
  }, [])

  const handleAttachFile = React.useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const removeAttachment = React.useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, idx) => idx !== index))
  }, [])

  const cancelUpload = React.useCallback((attachment: UploadItem) => {
    const xhr = uploadRefs.current[attachment.id]
    try { 
      xhr?.abort() 
    } catch {}
    delete uploadRefs.current[attachment.id]
  }, [])

  const onFileSelected = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach(f => startUpload(f))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [startUpload])

  const onDrop = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const files = Array.from(e.dataTransfer.files || [])
    files.forEach(f => startUpload(f))
  }, [startUpload])

  const onDragOver = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }, [])

  const onDragLeave = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }, [])

  const clearAttachments = React.useCallback(() => {
    setAttachments([])
  }, [])

  return {
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
  }
}

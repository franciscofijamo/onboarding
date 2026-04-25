"use client"

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function normalizeMsisdn(value: string) {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('258')) return digits
  if (digits.startsWith('84') || digits.startsWith('85')) return `258${digits}`
  return digits
}

function isValidVodacomMsisdn(value: string) {
  return /^258(84|85)\d{7}$/.test(value)
}

type MpesaModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (msisdn: string) => void
  isLoading?: boolean
}

export function MpesaModal({ open, onOpenChange, onConfirm, isLoading }: MpesaModalProps) {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')

  /* Removed unused handleChange */

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault()
    const normalized = normalizeMsisdn(phone)
    if (!isValidVodacomMsisdn(normalized)) {
      setError('Invalid Vodacom number. Use +25884xxxxxxx or +25885xxxxxxx')
      return
    }
    onConfirm(normalized)
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (isLoading) return
      onOpenChange(nextOpen)
    }}>
      <DialogContent
        className="sm:max-w-[525px]"
        onEscapeKeyDown={(event) => {
          if (isLoading) event.preventDefault()
        }}
        onInteractOutside={(event) => {
          if (isLoading) event.preventDefault()
        }}
      >
        <div className="grid gap-4">
          <DialogHeader>
            <DialogTitle>M-Pesa Payment</DialogTitle>
            <DialogDescription>
              Enter your Vodacom phone number to receive the payment request.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="space-y-4">
              <Label htmlFor="digit-0">Vodacom Number</Label>
              <div className="flex items-center gap-2 justify-center">
                <span className="text-muted-foreground font-semibold text-lg select-none">+258</span>
                <div className="flex gap-1.5">
                  {Array.from({ length: 9 }).map((_, index) => (
                    <Input
                      key={index}
                      id={`digit-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      disabled={isLoading}
                      className="w-9 h-12 text-center text-lg font-bold p-0"
                      value={phone[index] || ''}
                      onChange={(e) => {
                        if (isLoading) return
                        const val = e.target.value.replace(/\D/g, '')
                        if (!val && e.target.value !== '') return // prevent non-digit

                        const newPhone = phone.split('')
                        newPhone[index] = val
                        const newPhoneStr = newPhone.join('')
                        setPhone(newPhoneStr)
                        setError('') // clear error on change

                        // Auto-focus next input
                        if (val && index < 8) {
                          const nextInput = document.getElementById(`digit-${index + 1}`)
                          nextInput?.focus()
                        }
                      }}
                      onKeyDown={(e) => {
                        if (isLoading) return
                        if (e.key === 'Backspace' && !phone[index] && index > 0) {
                          // Move back on backspace if empty
                          const prevInput = document.getElementById(`digit-${index - 1}`)
                          prevInput?.focus()
                        }
                      }}
                      onPaste={(e) => {
                        if (isLoading) {
                          e.preventDefault()
                          return
                        }
                        e.preventDefault()
                        const pasted = e.clipboardData.getData('text').replace(/\D/g, '')
                        // If pasted includes 258 prefix, strip it maybe? 
                        // But user might just paste 84... 
                        // Let's assume they paste the 9 digits or full number
                        let cleanPasted = pasted
                        if (cleanPasted.startsWith('258') && cleanPasted.length > 9) {
                          cleanPasted = cleanPasted.slice(3)
                        }

                        const truncated = cleanPasted.slice(0, 9)
                        setPhone(truncated)

                        // Focus based on length
                        const targetIndex = Math.min(truncated.length, 8)
                        document.getElementById(`digit-${targetIndex}`)?.focus()
                      }}
                    />
                  ))}
                </div>
              </div>
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              className="text-white hover:bg-red-700 border-0"
              disabled={isLoading}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || phone.length < 9}
              className="bg-zinc-900 text-white hover:bg-zinc-800"
            >
              {isLoading ? 'Processing...' : 'Continue'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

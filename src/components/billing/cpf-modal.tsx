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

// All subscriptions use UNDEFINED billing type
// This allows customers to choose payment method (PIX, Boleto, or Credit Card) on the invoice
export type BillingType = 'UNDEFINED'

type CpfModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (cpfCnpj: string, billingType: BillingType) => void
  isLoading?: boolean
}

function formatCpfCnpj(value: string): string {
  const numbers = value.replace(/\D/g, '')

  if (numbers.length <= 11) {
    // CPF: 000.000.000-00
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  } else {
    // CNPJ: 00.000.000/0000-00
    return numbers
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
  }
}

function validateCpfCnpj(value: string): boolean {
  const numbers = value.replace(/\D/g, '')
  return numbers.length === 11 || numbers.length === 14
}

export function CpfModal({ open, onOpenChange, onConfirm, isLoading }: CpfModalProps) {
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [error, setError] = useState('')
  const billingType: BillingType = 'UNDEFINED' // Always use UNDEFINED

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCpfCnpj(e.target.value)
    if (formatted.length <= 18) {
      setCpfCnpj(formatted)
      setError('')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateCpfCnpj(cpfCnpj)) {
      setError('CPF ou CNPJ inválido')
      return
    }

    const numbers = cpfCnpj.replace(/\D/g, '')
    onConfirm(numbers, billingType)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Informações de pagamento</DialogTitle>
            <DialogDescription>
              Para prosseguir com o pagamento, precisamos do seu CPF ou CNPJ.
              Você poderá escolher a forma de pagamento (PIX, Boleto ou Cartão) na próxima etapa.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cpfCnpj">CPF ou CNPJ</Label>
              <Input
                id="cpfCnpj"
                placeholder="000.000.000-00"
                value={cpfCnpj}
                onChange={handleChange}
                autoFocus
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Processando...' : 'Continuar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

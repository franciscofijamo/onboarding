"use client"

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export function PendingAnalysisHandler() {
  const [isImporting, setIsImporting] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Only attempt on client and not already doing it
    if (typeof window === 'undefined' || isImporting) return

    const pendingDataRaw = localStorage.getItem('pendingGuestAnalysis')
    if (!pendingDataRaw) return

    const importData = async (retryCount = 0) => {
      setIsImporting(true)
      try {
        const payload = JSON.parse(pendingDataRaw)
        const response = await fetch('/api/job-application/import-guest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          // If the user isn't found yet (Clerk webhook race condition)
          if (response.status === 404 && errorData.code === 'USER_NOT_FOUND' && retryCount < 5) {
            setTimeout(() => importData(retryCount + 1), 2000)
            return
          }
          throw new Error('Failed to import guest analysis')
        }

        const data = await response.json()
        
        // Remove from storage to prevent loops
        localStorage.removeItem('pendingGuestAnalysis')
        
        // Ensure we are redirecting away from generic layouts into the newly created application
        router.push(`/onboarding?applicationId=${data.jobApplicationId}`)
      } catch (err) {
        console.error(err)
        // Cleanup on fail so user isn't permanently locked, but ONLY on non-transient errors
        localStorage.removeItem('pendingGuestAnalysis')
        setIsImporting(false)
      }
    }

    importData()
  }, [router, isImporting, pathname])

  if (isImporting) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background/80 backdrop-blur-md flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
        <h2 className="text-xl font-semibold">Salvando a sua análise...</h2>
        <p className="text-muted-foreground mt-2">Estamos a preparar o seu ambiente pessoal.</p>
      </div>
    )
  }

  return null
}

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAdminPlans, useCreatePlan, useUpdatePlan, useDeletePlan } from "@/hooks/use-admin-plans";
import { PlansTable } from "@/components/admin/plans/plans-table";
import { PlanEditDrawer } from "@/components/admin/plans/plan-edit-drawer";
import { PlanSummaryCards } from "@/components/admin/plans/plan-summary-cards";
import { PlanHeaderActions } from "@/components/admin/plans/plan-header-actions";
import { PlanEmptyState } from "@/components/admin/plans/plan-empty-state";
import { PlanLoadingSkeleton } from "@/components/admin/plans/plan-loading-skeleton";
import type { BillingPlan } from "@/components/admin/plans/types";
import {
  mapFeaturesFromApi,
  serializePlanForPersistence,
  createNewCustomPlan,
} from "@/components/admin/plans/utils";

export default function BillingPlansPage() {
  const { toast } = useToast()
  const [billingPlans, setBillingPlans] = useState<Record<string, BillingPlan>>({})
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<{ id: string; plan: BillingPlan } | null>(null)

  // Use TanStack Query hooks
  const { data: plansData, isLoading: loading } = useAdminPlans()
  const createPlan = useCreatePlan()
  const updatePlan = useUpdatePlan()
  const deletePlan = useDeletePlan()

  const saving = createPlan.isPending || updatePlan.isPending || deletePlan.isPending

  // Convert plans data to the format expected by the component
  useEffect(() => {
    if (plansData?.plans) {
      const nextPlans: Record<string, BillingPlan> = {}
      for (const p of plansData.plans) {
        const features = mapFeaturesFromApi(p.features ?? null)
        const billingPlan: BillingPlan = {
          planId: p.id ?? undefined,
          clerkId: p.clerkId ?? null,
          billingSource: (p.billingSource as 'clerk' | 'manual' | undefined) ?? 'clerk',
          name: p.name,
          credits: p.credits,
          active: p.active,
          clerkName: p.clerkName ?? null,
          currency: p.currency ?? null,
          priceMonthlyCents: p.priceMonthlyCents ?? null,
          priceYearlyCents: p.priceYearlyCents ?? null,
          description: p.description ?? '',
          features,
          badge: p.badge ?? null,
          highlight: p.highlight ?? false,
          ctaType: (p.ctaType as 'checkout' | 'contact' | null) ?? 'checkout',
          ctaLabel: p.ctaLabel ?? null,
          ctaUrl: p.ctaUrl ?? null,
          isNew: false,
        }
        const key = billingPlan.planId ?? p.clerkId ?? `plan-${p.name}`
        nextPlans[key] = billingPlan
      }
      setBillingPlans(nextPlans)
    }
  }, [plansData])

  const handleEditPlan = (planId: string, plan: BillingPlan) => {
    setEditingPlan({ id: planId, plan })
    setEditDrawerOpen(true)
  }

  const handleSavePlan = async (editedPlan: BillingPlan) => {
    if (!editingPlan) return

    try {
      const payload = serializePlanForPersistence(editedPlan)
      
      if (editedPlan.isNew) {
        // Create new plan
          await createPlan.mutateAsync({
          clerkId: editedPlan.clerkId ?? undefined,
            billingSource: payload.billingSource,
            ...payload,
          })
        // Remove from local state since it will be refetched
        setBillingPlans(prev => {
          const next = { ...prev }
          delete next[editingPlan.id]
          return next
          })
        } else {
        // Update existing plan
        const targetId = editedPlan.planId ?? editingPlan.id
            await updatePlan.mutateAsync({
              planId: targetId,
          clerkId: editedPlan.clerkId ?? undefined,
              ...payload,
            })
      }

      toast({ title: 'Plano salvo com sucesso' })
      setEditDrawerOpen(false)
      setEditingPlan(null)
    } catch (err) {
      toast({ 
        title: 'Falha ao salvar plano', 
        description: err instanceof Error ? err.message : 'Erro desconhecido', 
        variant: 'destructive' 
      })
    }
  }

  const handleDeletePlan = async (planId: string) => {
    try {
      const plan = billingPlans[planId]
      const targetId = plan?.planId ?? planId
      await deletePlan.mutateAsync(targetId)
      toast({ title: 'Plano removido com sucesso' })
    } catch (err) {
      toast({ 
        title: 'Falha ao remover plano', 
        description: err instanceof Error ? err.message : 'Erro desconhecido', 
        variant: 'destructive' 
      })
    }
  }

  const handleToggleActive = async (planId: string) => {
    try {
      const plan = billingPlans[planId]
      if (!plan) return

      const payload = serializePlanForPersistence({
        ...plan,
        active: !(plan.active ?? true)
      })
      
      const targetId = plan.planId ?? planId
      await updatePlan.mutateAsync({
        planId: targetId,
        clerkId: plan.clerkId ?? undefined,
        ...payload,
      })

      toast({ 
        title: `Plano ${payload.active ? 'ativado' : 'desativado'} com sucesso` 
      })
    } catch (err) {
      toast({ 
        title: 'Falha ao alterar status', 
        description: err instanceof Error ? err.message : 'Erro desconhecido', 
        variant: 'destructive' 
      })
    }
  }

  const addCustomPlan = () => {
    const key = `temp-${Date.now()}`
    const newPlan = createNewCustomPlan()

    setBillingPlans(prev => ({
      ...prev,
      [key]: newPlan,
    }))

    handleEditPlan(key, newPlan)
  }

  if (loading) {
    return <PlanLoadingSkeleton />
  }

  const planCount = Object.keys(billingPlans).length
  const activePlanCount = Object.values(billingPlans).filter(plan => plan.active !== false).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Planos de Assinatura</h1>
        <p className="text-muted-foreground mt-2">Gerencie os planos de assinatura e configure créditos mensais</p>
      </div>

      <PlanSummaryCards totalPlans={planCount} activePlans={activePlanCount} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Planos ativos</CardTitle>
              <CardDescription className="mt-1">
                Cadastre planos de assinatura e configure ofertas personalizadas para seus clientes.
              </CardDescription>
            </div>
          </div>
          <PlanHeaderActions
            onAddCustomPlan={addCustomPlan}
          />
        </CardHeader>
        <CardContent>
          {Object.keys(billingPlans).length === 0 ? (
            <PlanEmptyState />
          ) : (
            <PlansTable
              plans={billingPlans}
              loading={loading}
              onEdit={handleEditPlan}
              onDelete={handleDeletePlan}
              onToggleActive={handleToggleActive}
            />
          )}
        </CardContent>
      </Card>

      {/* Edit Drawer */}
      <PlanEditDrawer
        isOpen={editDrawerOpen}
        onClose={() => {
          // Remove temporary plan if it wasn't saved
          if (editingPlan?.plan.isNew) {
            setBillingPlans(prev => {
              const next = { ...prev }
              delete next[editingPlan.id]
              return next
            })
          }
          setEditDrawerOpen(false)
          setEditingPlan(null)
        }}
        plan={editingPlan?.plan || null}
        clerkPlanDetails={undefined}
        onSave={handleSavePlan}
        isSaving={saving}
      />
    </div>
  )
}

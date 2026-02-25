"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAdminSettings, useUpdateAdminSettings } from "@/hooks/use-admin-settings";

type FeatureCosts = Record<string, number>

export default function FeatureCostsPage() {
  const { toast } = useToast()
  const { data: settings, isLoading, error } = useAdminSettings()
  const updateSettingsMutation = useUpdateAdminSettings()
  const [featureCosts, setFeatureCosts] = useState<FeatureCosts>({})

  React.useEffect(() => {
    if (settings?.featureCosts) {
      setFeatureCosts(settings.featureCosts)
    }
  }, [settings])

  React.useEffect(() => {
    if (error) {
      toast({
        title: 'Network error',
        description: 'Could not load settings',
        variant: 'destructive'
      })
    }
  }, [error, toast])

  const updateFeature = (key: string, val: string) => {
    const n = Number(val)
    setFeatureCosts((prev) => ({ ...prev, [key]: Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0 }))
  }

  const onSave = async () => {
    try {
      await updateSettingsMutation.mutateAsync({
        featureCosts,
        planCredits: settings?.planCredits || {}
      })
      toast({ title: 'Settings saved' })
    } catch (err) {
      toast({
        title: 'Failed to save',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive'
      })
    }
  }

  const hasUnsavedChanges = JSON.stringify(settings?.featureCosts || {}) !== JSON.stringify(featureCosts)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Feature Costs</h1>
        <p className="text-muted-foreground mt-2">Configure credit costs for each system feature</p>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Credit Costs per Feature</h2>
        <div className="space-y-4">
          {Object.entries(featureCosts).map(([key, value]) => (
            <div key={key} className="grid grid-cols-1 sm:grid-cols-3 items-center gap-3">
              <Label className="sm:col-span-1 capitalize">{key.replaceAll('_', ' ')}</Label>
              <Input
                type="number"
                className="sm:col-span-2"
                value={String(value)}
                onChange={(e) => updateFeature(key, e.target.value)}
                min={0}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center mt-6">
          {hasUnsavedChanges && <span className="text-sm text-muted-foreground">Unsaved changes</span>}
          <Button
            className="ml-auto"
            onClick={onSave}
            disabled={updateSettingsMutation.isPending}
          >
            {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

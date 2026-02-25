"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { 
  AlertTriangle, 
  Save, 
  Package, 
  CreditCard, 
  FileText, 
  Sparkles,
  MousePointer,
  Settings,
  DollarSign,
  Hash,
  Globe,
  Link2,
  CheckCircle2,
  XCircle
} from "lucide-react";
import type { ClerkPlan } from "@/hooks/use-admin-plans";
import { DrawerSection, InfoBox, FieldGroup } from "./drawer-sections";
import { FeatureEditor } from "./feature-editor";

type BillingPlan = {
  planId?: string;
  clerkId?: string | null;
  billingSource?: 'clerk' | 'manual';
  name: string;
  credits: number;
  active?: boolean;
  clerkName?: string | null;
  currency?: string | null;
  priceMonthlyCents?: number | null;
  priceYearlyCents?: number | null;
  description?: string | null;
  features?: PlanFeatureForm[];
  badge?: string | null;
  highlight?: boolean;
  ctaType?: 'checkout' | 'contact';
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  sortOrder?: number | null;
  isNew?: boolean;
}

type PlanFeatureForm = {
  id: string;
  name: string;
  description: string;
  included: boolean;
}

interface PlanEditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  plan: BillingPlan | null;
  clerkPlanDetails?: ClerkPlan;
  onSave: (plan: BillingPlan) => void;
  isSaving?: boolean;
}

const generateFeatureId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

const formatPriceInput = (value: number | null | undefined) => {
  if (value == null) return ''
  return (value / 100).toString()
}

const parsePriceInput = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return null
  const numeric = Number.parseFloat(trimmed.replace(',', '.'))
  if (!Number.isFinite(numeric)) return null
  return Math.max(0, Math.round(numeric * 100))
}



export function PlanEditDrawer({ 
  isOpen, 
  onClose, 
  plan, 
  clerkPlanDetails, 
  onSave, 
  isSaving = false 
}: PlanEditDrawerProps) {
  const [editedPlan, setEditedPlan] = useState<BillingPlan | null>(plan);

  // Reset edited plan when plan changes
  React.useEffect(() => {
    if (plan) {
      setEditedPlan({
        ...plan,
        currency: plan.currency || 'brl',
        features: plan.features ? plan.features.map(f => ({ ...f })) : []
      });
    }
  }, [plan]);

  if (!editedPlan) return null;

  const isClerkPlan = (editedPlan.billingSource ?? 'clerk') === 'clerk';
  const currencyDisplay = editedPlan.currency ? editedPlan.currency.toUpperCase() : '';
  const currencyNormalized = (editedPlan.currency || 'brl').toLowerCase();
  const isBrCurrency = currencyNormalized === 'brl';
  const monthlyInput = formatPriceInput(editedPlan.priceMonthlyCents);
  const yearlyInput = formatPriceInput(editedPlan.priceYearlyCents);
  const ctaValue = editedPlan.ctaType ?? (isClerkPlan ? 'checkout' : 'contact');

  // Asaas minimum value validation (R$ 5.00 = 500 cents)
  const ASAAS_MIN_CENTS = 500;
  const hasPriceError = (cents: number | null | undefined) => {
    if (!isBrCurrency) return false;
    if (cents === null || cents === undefined || cents === 0) return false; // Free plans are OK
    return cents > 0 && cents < ASAAS_MIN_CENTS; // Between 1-499 is invalid
  };

  const hasNameError = !editedPlan.name || !editedPlan.name.trim();
  const hasCreditsError = !Number.isFinite(editedPlan.credits) || editedPlan.credits < 0;
  const hasCtaUrlError = ctaValue === 'contact' && !editedPlan.ctaUrl?.trim();
  const hasMonthlyPriceError = hasPriceError(editedPlan.priceMonthlyCents);
  const hasYearlyPriceError = hasPriceError(editedPlan.priceYearlyCents);

  const patchPlan = (patch: Partial<BillingPlan> | ((current: BillingPlan) => BillingPlan)) => {
    setEditedPlan(prev => {
      if (!prev) return null;
      return typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
    });
  };

  const addPlanFeature = () => {
    setEditedPlan(prev => {
      if (!prev) return null;
      const nextFeatures = [...(prev.features ?? []), {
        id: generateFeatureId(),
        name: '',
        description: '',
        included: true,
      }];
      return {
        ...prev,
        features: nextFeatures,
      };
    });
  };

  const updatePlanFeature = (featureId: string, patch: Partial<PlanFeatureForm>) => {
    setEditedPlan(prev => {
      if (!prev || !prev.features) return prev;
      const nextFeatures = prev.features.map(feature =>
        feature.id === featureId ? { ...feature, ...patch } : feature
      );
      return {
        ...prev,
        features: nextFeatures,
      };
    });
  };

  const removePlanFeature = (featureId: string) => {
    setEditedPlan(prev => {
      if (!prev || !prev.features) return prev;
      const nextFeatures = prev.features.filter(feature => feature.id !== featureId);
      return {
        ...prev,
        features: nextFeatures,
      };
    });
  };

  const handleSave = () => {
    if (hasNameError || hasCreditsError || hasCtaUrlError || hasMonthlyPriceError || hasYearlyPriceError) return;
    onSave(editedPlan);
  };

  const featuresPreview = clerkPlanDetails?.features?.slice(0, 3)?.filter(f => f?.name || f?.description) ?? [];
  const hasMoreFeatures = (clerkPlanDetails?.features?.length || 0) > featuresPreview.length;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[600px] sm:w-[800px] p-0 flex flex-col h-screen max-h-screen">
        <SheetHeader className="px-6 py-6 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-xl">
                {editedPlan.isNew ? 'Create New Plan' : editedPlan.name}
              </SheetTitle>
              <SheetDescription>
                {editedPlan.isNew 
                  ? 'Configure a new subscription plan' 
                  : 'Edit the plan settings'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 space-y-8">
            {/* Plan Source */}
            <DrawerSection 
              title="Plan Source"
              icon={<Settings className="h-4 w-4" />}
              helpText={isClerkPlan 
                ? "This plan is synced with Clerk and some fields cannot be edited" 
                : "Manual plan allows full configuration of all fields"}
            >
              <div className="flex items-center flex-wrap gap-3">
                <Badge 
                  variant={isClerkPlan ? 'default' : 'secondary'}
                  className="gap-1.5"
                >
                  {isClerkPlan ? (
                    <><CheckCircle2 className="h-3 w-3" /> Sincronizado com Clerk</>
                  ) : (
                    <><XCircle className="h-3 w-3" /> Plano Manual</>
                  )}
                </Badge>
                {isClerkPlan && editedPlan.clerkId && (
                  <code className="text-xs font-mono bg-muted px-2.5 py-1 rounded-md">
                    ID: {editedPlan.clerkId}
                  </code>
                )}
              </div>
              <InfoBox variant={isClerkPlan ? "default" : "warning"}>
                {isClerkPlan
                  ? 'Pricing and some metadata are managed by Clerk Dashboard.'
                  : 'Configure all fields manually. Ideal for custom offers.'}
              </InfoBox>
            </DrawerSection>

            {/* Basic Information */}
            <DrawerSection 
              title="Basic Information"
              icon={<FileText className="h-4 w-4" />}
              description="Set the plan name and monthly credits"
            >
              <FieldGroup className="grid-cols-1 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="plan-name" className="flex items-center gap-1">
                    Plan Name
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="plan-name"
                    value={editedPlan.name}
                    onChange={(e) => patchPlan({ name: e.target.value })}
                    placeholder="Ex.: Professional"
                    className={hasNameError ? 'border-destructive focus-visible:ring-destructive' : ''}
                  />
                  {hasNameError && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Required field
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan-credits" className="flex items-center gap-1">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                    Monthly Credits
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="plan-credits"
                    type="number"
                    min={0}
                    value={String(editedPlan.credits)}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      patchPlan({ credits: Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0 });
                    }}
                    className={hasCreditsError ? 'border-destructive focus-visible:ring-destructive' : ''}
                  />
                  {hasCreditsError && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Must be ≥ 0
                    </p>
                  )}
                </div>
              </FieldGroup>
            </DrawerSection>

            {/* Pricing */}
            <DrawerSection 
              title="Pricing Configuration"
              icon={<DollarSign className="h-4 w-4" />}
              description={isClerkPlan ? "Pricing synced from Clerk" : "Configure plan pricing"}
            >
              {isClerkPlan ? (
                <div className="space-y-3">
                  <FieldGroup className="grid-cols-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Currency</Label>
                      <Input disabled className="bg-muted font-mono" value={currencyDisplay || '—'} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Monthly Price</Label>
                      <Input 
                        disabled 
                        className="bg-muted font-mono" 
                        value={editedPlan.priceMonthlyCents != null ? `${currencyDisplay} ${(editedPlan.priceMonthlyCents/100).toFixed(2)}` : '—'} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Yearly Price</Label>
                      <Input 
                        disabled 
                        className="bg-muted font-mono" 
                        value={editedPlan.priceYearlyCents != null ? `${currencyDisplay} ${(editedPlan.priceYearlyCents/100).toFixed(2)}` : '—'} 
                      />
                    </div>
                  </FieldGroup>
                  <InfoBox>
                    Pricing managed by Clerk Dashboard. To change, access the Clerk panel.
                  </InfoBox>
                </div>
              ) : (
                <div className="space-y-3">
                  <FieldGroup className="grid-cols-1 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        Currency
                      </Label>
                      <Select
                        value={currencyNormalized}
                        onValueChange={(value) => patchPlan({ currency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="brl">BRL - Real</SelectItem>
                          <SelectItem value="mzn">MZN - Metical</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {isBrCurrency
                          ? 'Asaas accepts only payments in Real (BRL)'
                          : 'M-Pesa accepts payments in Metical (MZN)'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Monthly Price</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          {currencyDisplay}
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={monthlyInput}
                          onChange={(e) => patchPlan({ priceMonthlyCents: parsePriceInput(e.target.value) })}
                          placeholder="49.90"
                          className={`pl-12 ${hasMonthlyPriceError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                        />
                      </div>
                      {hasMonthlyPriceError && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Minimum: R$ 5.00 (use R$ 0.00 for free)
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Yearly Price</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          {currencyDisplay}
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={yearlyInput}
                          onChange={(e) => patchPlan({ priceYearlyCents: parsePriceInput(e.target.value) })}
                          placeholder="499.00"
                          className={`pl-12 ${hasYearlyPriceError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                        />
                      </div>
                      {hasYearlyPriceError && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Minimum: R$ 5.00 (use R$ 0.00 for free)
                        </p>
                      )}
                    </div>
                  </FieldGroup>
                  {isBrCurrency && (
                    <InfoBox>
                      <strong>Asaas restriction:</strong> Minimum accepted value is R$ 5.00. Use R$ 0.00 for free plans (no charge).
                    </InfoBox>
                  )}
                </div>
              )}
            </DrawerSection>

          {/* Clerk Details */}
          {isClerkPlan && clerkPlanDetails && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Clerk Details</Label>
              <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/40 p-3 text-xs space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {clerkPlanDetails.publiclyVisible != null && (
                    <Badge variant={clerkPlanDetails.publiclyVisible ? 'outline' : 'secondary'}>
                      {clerkPlanDetails.publiclyVisible ? 'Public' : 'Private'}
                    </Badge>
                  )}
                  {clerkPlanDetails.isDefault && <Badge variant="outline">Default plan</Badge>}
                  {clerkPlanDetails.isRecurring === false && <Badge variant="outline">Non-recurring</Badge>}
                </div>
                {featuresPreview.length > 0 && (
                  <div className="space-y-1 text-muted-foreground">
                    <p className="font-medium text-foreground">Features ({clerkPlanDetails.features.length})</p>
                    <ul className="list-disc space-y-1 pl-4">
                      {featuresPreview.map((feature, idx) => (
                        <li key={feature?.id ?? `feature-${idx}`}>
                          {feature?.name || feature?.slug || 'Unnamed'}
                          {feature?.description ? ` – ${feature.description}` : ''}
                        </li>
                      ))}
                    </ul>
                    {hasMoreFeatures && (
                      <p>+{(clerkPlanDetails?.features?.length || 0) - featuresPreview.length} more</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

            {/* Description */}
            <DrawerSection 
              title="Plan Description"
              icon={<FileText className="h-4 w-4" />}
              description="Text shown on the pricing page"
            >
              <div className="space-y-2">
                <Textarea
                  id="plan-description"
                  value={editedPlan.description ?? ''}
                  onChange={(e) => patchPlan({ description: e.target.value })}
                  placeholder="Describe the key benefits and differentiators of this plan..."
                  className="min-h-[100px] resize-none"
                  maxLength={500}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Shown on landing page and checkout</span>
                  <span>{editedPlan.description?.length || 0}/500</span>
                </div>
              </div>
            </DrawerSection>

            {/* Visual Customization */}
            <DrawerSection 
              title="Visual Customization"
              icon={<Sparkles className="h-4 w-4" />}
              description="Highlight this plan on the pricing page"
            >
              <FieldGroup className="grid-cols-1 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="plan-badge">Highlight Badge</Label>
                  <Input
                    id="plan-badge"
                    value={editedPlan.badge ?? ''}
                    onChange={(e) => patchPlan({ badge: e.target.value })}
                    placeholder="e.g., Most Popular"
                    maxLength={20}
                  />
                  <p className="text-xs text-muted-foreground">
                    {editedPlan.badge ? `${20 - (editedPlan.badge?.length || 0)} characters remaining` : 'Optional'}
                  </p>
                </div>
                <div className="space-y-3">
                  <Label>Highlight Options</Label>
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-background">
                    <div className="space-y-0.5">
                      <Label htmlFor="highlight-switch" className="text-sm font-normal cursor-pointer">
                        Highlight plan
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Apply highlight styling
                      </p>
                    </div>
                    <Switch
                      id="highlight-switch"
                      checked={editedPlan.highlight ?? false}
                      onCheckedChange={(checked) => patchPlan({ highlight: checked })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan-sort-order">Display Order</Label>
                  <Input
                    id="plan-sort-order"
                    type="number"
                    value={String(editedPlan.sortOrder ?? 0)}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      patchPlan({ sortOrder: Number.isFinite(n) ? n : 0 });
                    }}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Lower number = appears first
                  </p>
                </div>
              </FieldGroup>
            </DrawerSection>

            {/* Features */}
            <DrawerSection 
              title="Plan Features"
              icon={<Package className="h-4 w-4" />}
            >
              <FeatureEditor
                features={editedPlan.features || []}
                onAdd={addPlanFeature}
                onUpdate={updatePlanFeature}
                onRemove={removePlanFeature}
              />
            </DrawerSection>

            {/* CTA Configuration */}
            <DrawerSection 
              title="Call to Action (CTA)"
              icon={<MousePointer className="h-4 w-4" />}
              description="Configure how users interact with this plan"
            >
              <FieldGroup>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    Action Type
                    {!isClerkPlan && <Badge variant="outline" className="ml-2 text-xs">Fixed: Contact</Badge>}
                  </Label>
                  <Select
                    value={ctaValue}
                    onValueChange={(value) => patchPlan({ ctaType: value as 'checkout' | 'contact' })}
                    disabled={!isClerkPlan}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checkout">
                        <span className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Automatic Checkout
                        </span>
                      </SelectItem>
                      <SelectItem value="contact">
                        <span className="flex items-center gap-2">
                          <Link2 className="h-4 w-4" />
                          Contact Link
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Button Text</Label>
                    <Input
                      value={editedPlan.ctaLabel ?? ''}
                      onChange={(e) => patchPlan({ ctaLabel: e.target.value })}
                      placeholder={ctaValue === 'checkout' ? 'Subscribe Now' : 'Contact Us'}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                      Contact URL
                      {ctaValue === 'contact' && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      value={editedPlan.ctaUrl ?? ''}
                      onChange={(e) => patchPlan({ ctaUrl: e.target.value })}
                      placeholder="https://example.com/contact"
                      disabled={ctaValue !== 'contact'}
                      className={hasCtaUrlError ? 'border-destructive focus-visible:ring-destructive' : ''}
                    />
                    {hasCtaUrlError && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        URL required for contact mode
                      </p>
                    )}
                  </div>
                </div>

                {ctaValue === 'contact' && (
                  <InfoBox variant="warning">
                    In contact mode, users will be redirected to the specified URL instead of checkout.
                  </InfoBox>
                )}
              </FieldGroup>
            </DrawerSection>

            {/* Status */}
            <DrawerSection 
              title="Plan Status"
              icon={<Settings className="h-4 w-4" />}
            >
              <div className="flex items-center justify-between p-4 rounded-lg border bg-background">
                <div className="space-y-0.5">
                  <Label htmlFor="status-switch" className="text-base font-normal cursor-pointer">
                    Active Plan
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {editedPlan.active 
                      ? 'This plan is visible on the pricing page' 
                      : 'This plan is hidden from the pricing page'}
                  </p>
                </div>
                <Switch
                  id="status-switch"
                  checked={editedPlan.active ?? true}
                  onCheckedChange={(checked) => patchPlan({ active: checked })}
                />
              </div>
            </DrawerSection>
          </div>
        </ScrollArea>

        <div className="border-t bg-background shrink-0">
          <SheetFooter className="px-6 py-4">
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-muted-foreground">
                {hasNameError || hasCreditsError || hasCtaUrlError ? (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Fix errors before saving
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Ready to save
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} disabled={isSaving}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving || hasNameError || hasCreditsError || hasCtaUrlError}
                  className="min-w-[120px]"
                >
                  {isSaving ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </div>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}

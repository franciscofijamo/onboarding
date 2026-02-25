"use client";

import { useUser } from "@clerk/nextjs";
import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export type OperationType = 
  | "generate_content"
  | "analyze_data"
  | "export_report"
  | "ai_chat"
  | "image_generation";

const DEFAULT_UI_CREDIT_COSTS: Record<OperationType, number> = {
  generate_content: 10,
  analyze_data: 5,
  export_report: 2,
  ai_chat: 1,
  image_generation: 5,
};

export interface CreditData {
  plan: string;
  creditsRemaining: number;
  creditsTotal: number;
  billingPeriodEnd: string | null;
  percentage: number;
  isLow: boolean;
  isEmpty: boolean;
  cancellationScheduled: boolean;
}

export function useCredits(): {
  credits: CreditData | null;
  isLoading: boolean;
  canPerformOperation: (operation: OperationType) => boolean;
  getCost: (operation: OperationType) => number;
  refresh: () => void;
} {
  const { user, isLoaded } = useUser();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery<{ featureCosts?: Record<string, number>; planCredits?: Record<string, number> } | null>({
    queryKey: ['credit-settings'],
    queryFn: () => api.get('/api/credits/settings'),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  interface CreditsResponse {
    creditsRemaining: number;
    creditsTotal: number;
    plan: string;
    planId: string | null;
    lastSyncedAt: string | null;
    billingPeriodEnd: string | null;
    cancellationScheduled: boolean;
  }

  const { data, isLoading: loadingServer } = useQuery<CreditsResponse | null>({
    queryKey: ['credits', user?.id],
    enabled: isLoaded && !!user,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
    queryFn: () => api.get('/api/credits/me'),
  });

  const credits = useMemo(() => {
    if (!isLoaded || !user) {
      return null;
    }

    const creditsRemaining = data?.creditsRemaining ?? 0;
    const creditsTotal = data?.creditsTotal ?? 100;
    const percentage = creditsTotal > 0 ? (creditsRemaining / creditsTotal) * 100 : 0;

    return {
      plan: data?.plan || "Gratuito",
      creditsRemaining,
      creditsTotal,
      billingPeriodEnd: data?.billingPeriodEnd || null,
      percentage,
      isLow: percentage < 20,
      isEmpty: creditsRemaining === 0,
      cancellationScheduled: data?.cancellationScheduled || false,
    };
  }, [isLoaded, user, data]);

  const getDynamicCosts = (): Record<OperationType, number> => {
    const base = { ...DEFAULT_UI_CREDIT_COSTS };
    const fc = settings?.featureCosts || {};
    if (typeof fc['ai_text_chat'] === 'number') base.ai_chat = Math.max(0, Math.floor(fc['ai_text_chat']));
    if (typeof fc['ai_image_generation'] === 'number') base.image_generation = Math.max(0, Math.floor(fc['ai_image_generation']));
    return base;
  };

  const canPerformOperation = (operation: OperationType) => {
    if (!credits) return false;
    const costs = getDynamicCosts();
    const cost = costs[operation];
    return credits.creditsRemaining >= cost;
  };

  const getCost = (operation: OperationType) => {
    const costs = getDynamicCosts();
    return costs[operation];
  };

  const refresh = () => {
    if (user?.id) queryClient.invalidateQueries({ queryKey: ['credits', user.id] });
  };

  if (!isLoaded) {
    return {
      credits: null,
      isLoading: true,
      canPerformOperation: () => false,
      getCost: (operation) => DEFAULT_UI_CREDIT_COSTS[operation],
      refresh,
    };
  }

  return {
    credits,
    isLoading: loadingServer,
    canPerformOperation,
    getCost,
    refresh,
  };
}

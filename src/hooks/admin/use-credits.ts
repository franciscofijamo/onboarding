"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAdminCredits, useAdjustCredits as useAdjustCreditsBase } from "./use-admin-credits";
import type { CreditBalance } from "./use-admin-credits";

export type { CreditBalance };

export function useCreditBalances() {
  const query = useAdminCredits({ includeUsageCount: true, pageSize: 1000 });
  return {
    ...query,
    data: query.data?.creditBalances ?? [],
    isLoading: query.isLoading,
  };
}

export function useAdjustCredits() {
  const base = useAdjustCreditsBase();
  return {
    ...base,
    mutate: (
      { balanceId, amount }: { balanceId: string; amount: number },
      options?: Parameters<typeof base.mutate>[1]
    ) => base.mutate({ creditBalanceId: balanceId, adjustment: amount }, options),
    mutateAsync: (
      { balanceId, amount }: { balanceId: string; amount: number },
      options?: Parameters<typeof base.mutateAsync>[1]
    ) => base.mutateAsync({ creditBalanceId: balanceId, adjustment: amount }, options),
  };
}

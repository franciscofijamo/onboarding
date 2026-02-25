"use client";

import { useUser } from "@clerk/nextjs";
import { useCredits } from "@/hooks/use-credits";
import { useLanguage } from "@/contexts/language";
import { Coins } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CreditStatusProps {
  className?: string;
  showUpgradeButton?: boolean;
}

export function CreditStatus({ className, showUpgradeButton = true }: CreditStatusProps) {
  const { user, isLoaded } = useUser();
  const { credits, isLoading } = useCredits();
  const { t } = useLanguage();

  if (!isLoaded || isLoading) {
    return <Skeleton className={cn("h-8 w-24", className)} />;
  }

  if (!user || !credits) {
    return null;
  }

  const totalCredits = credits.creditsTotal;
  const remaining = credits.creditsRemaining;
  const percentage = (remaining / totalCredits) * 100;
  const isLow = percentage < 20;
  const isEmpty = remaining === 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-2", className)}>
            <Coins
              className={cn(
                "h-4 w-4",
                isEmpty && "text-destructive",
                isLow && !isEmpty && "text-orange-500"
              )}
            />
            <span
              className={cn(
                "text-sm font-medium",
                isEmpty && "text-destructive",
                isLow && !isEmpty && "text-orange-500"
              )}
            >
              {remaining}
            </span>
            {showUpgradeButton && (isLow || isEmpty) && (
              <Button size="sm" variant={isEmpty ? "destructive" : "outline"} asChild>
                <Link href="/billing">
                  {isEmpty ? t("creditStatus.buyCredits") : t("creditStatus.upgrade")}
                </Link>
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("creditStatus.creditBalance")}</p>
            <p className="text-xs text-muted-foreground">
              {remaining} {t("creditStatus.credits")} / {totalCredits}
            </p>
            {credits.billingPeriodEnd && (
              <p className="text-xs text-muted-foreground">
                {t("creditStatus.resetsOn", { date: new Date(credits.billingPeriodEnd).toLocaleDateString() })}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {t("creditStatus.plan")}: {credits.plan || "Free"}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface CreditCostProps {
  cost: number;
  operation: string;
  className?: string;
}

export function CreditCost({ cost, operation, className }: CreditCostProps) {
  const { t } = useLanguage();

  return (
    <div className={cn("flex items-center gap-1 text-sm text-muted-foreground", className)}>
      <Coins className="h-3 w-3" />
      <span>{cost} {t("creditStatus.credits")}</span>
      <span>{t("creditStatus.for")} {operation}</span>
    </div>
  );
}
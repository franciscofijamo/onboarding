"use client";

import { useUser } from "@clerk/nextjs";
import { usePublicPlans } from "@/hooks/use-public-plans";
import { Skeleton } from "@/components/ui/skeleton";
import { useCredits } from "@/hooks/use-credits";
import { useSetPageMetadata } from "@/contexts/page-metadata";
import { useLanguage } from "@/contexts/language";
import { Coins, Check, Zap, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { MpesaModal } from "@/components/billing/mpesa-modal";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { selectMpesaCreditPlan } from "@/lib/billing/select-mpesa-plan";
import { getMpesaCreditPackPlan } from "@/lib/billing/mpesa-credit-pack";
import { isLikelyMpesaDismissal, postCheckoutWithTimeout } from "@/lib/billing/mpesa-feedback";

export default function BillingPage() {
  const { user, isLoaded } = useUser();
  const { credits, isLoading } = useCredits();
  const { data: plansData, isLoading: isLoadingPlans } = usePublicPlans();
  const { data: creditSettings } = useQuery<{ featureCosts?: Record<string, number> }>({
    queryKey: ["credit-settings"],
    queryFn: () => fetch("/api/credits/settings").then((r) => r.json()),
    staleTime: 60_000,
  });
  const { t } = useLanguage();
  const [mpesaModalOpen, setMpesaModalOpen] = useState(false);
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState<{ planId: string; period: 'MONTHLY' | 'YEARLY' } | null>(null);

  useSetPageMetadata({
    title: t("billing.title"),
    description: t("billing.description"),
    breadcrumbs: [
      { label: t("billing.home"), href: "/dashboard" },
      { label: t("billing.title") }
    ]
  });

  const creditPlans = useMemo(() => {
    if (!plansData?.plans) return [];

    return plansData.plans.filter(p => {
      const price = p.priceMonthlyCents || p.priceYearlyCents || 0;
      return price > 0;
    });
  }, [plansData]);

  const creditPlan = useMemo(
    () => selectMpesaCreditPlan(creditPlans) ?? getMpesaCreditPackPlan(),
    [creditPlans]
  );

  const handleBuyCredits = () => {
    if (!creditPlan) {
      toast.error(t("billing.planNotAvailable"));
      return;
    }

    setPendingCheckout({ planId: creditPlan.id, period: 'MONTHLY' });
    setMpesaModalOpen(true);
  };

  if (!isLoaded || !user || isLoading || isLoadingPlans) {
    return (
      <div className="space-y-6 w-full max-w-5xl mx-auto py-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full mx-auto py-6">

      {/* Current Balance & Status Section */}
      <section className="grid gap-6 md:grid-cols-2">
        {/* Balance Card */}
        <div className="relative overflow-hidden bg-card rounded-2xl border border-border/60 p-6 shadow-sm">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white">
                <Coins className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">{t("billing.currentBalance")}</h2>
            </div>
            <div className="space-y-1">
              <span className="text-4xl font-bold tracking-tight text-foreground">
                {credits?.creditsRemaining || 0}
              </span>
              <p className="text-sm text-muted-foreground">{t("billing.creditsAvailable")}</p>
            </div>
          </div>
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full pointer-events-none" />
        </div>

        {/* Status Card */}
        <div className="relative overflow-hidden bg-card rounded-2xl border border-border/60 p-6 shadow-sm">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">{t("billing.accountStatus")}</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="px-3 py-1 text-sm font-medium bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-200">
                  {t("billing.active")}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {t("billing.verifiedAccount")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("billing.fullAccessMessage")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Buy Credits Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t("billing.buyCredits")}</h2>
            <p className="text-sm text-muted-foreground">{t("billing.rechargeMessage")}</p>
          </div>
        </div>

        {creditPlan ? (
          <div className="relative bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden transition-all hover:border-border hover:shadow-md">
            <div className="grid md:grid-cols-3">
              {/* Plan Details */}
              <div className="p-8 md:col-span-2 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">{creditPlan.name}</h3>
                  <p className="text-muted-foreground">{t("billing.packageDescription")}</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Feature List - hardcoded as these serve as the value prop for the credits */}
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{creditPlan.credits} {t("billing.credits")}</p>
                      <p className="text-xs text-muted-foreground">{t("billing.addedInstantly")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{t("billing.lifetimeAccess")}</p>
                      <p className="text-xs text-muted-foreground">{t("billing.creditsNeverExpire")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{t("billing.premiumAnalyses")}</p>
                      <p className="text-xs text-muted-foreground">{t("billing.detailedAiCorrections")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{t("billing.instantFeedback")}</p>
                      <p className="text-xs text-muted-foreground">{t("billing.resultsInSeconds")}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing & Action */}
              <div className="bg-muted/30 p-8 flex flex-col justify-center items-center border-t md:border-t-0 md:border-l border-border/60">
                <div className="text-center mb-6">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("billing.creditsFor")}</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-sm font-medium text-muted-foreground -translate-y-4">MZN</span>
                    <span className="text-5xl font-bold text-foreground">
                      {((creditPlan.priceMonthlyCents || creditPlan.priceYearlyCents || 0) / 100).toLocaleString('pt-MZ', { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{t("billing.paymentViaMpesa")}</p>
                </div>

                <Button
                  onClick={handleBuyCredits}
                  size="lg"
                  className="w-full bg-foreground text-background hover:bg-foreground/90 shadow-lg hover:shadow-xl transition-all h-12 text-base font-semibold"
                >
                  <Zap className="w-4 h-4 mr-2 fill-current" />
                  {t("billing.buyNow")}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground">{t("billing.noPlanAvailable")}</p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("billing.actionCostsTitle")}</h2>
        </div>
        <div className="mt-5 flex flex-col gap-3">
          {([
            { key: "cv_analysis", label: t("billing.actionCosts.cvAnalysis") },
            { key: "scenario_simulation", label: t("billing.actionCosts.scenarioSimulation") },
          ] as const).map((item) => {
            const cost = creditSettings?.featureCosts?.[item.key] ?? (item.key === "scenario_simulation" ? 15 : 10);
            return (
              <div key={item.key} className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
                <span className="text-sm font-medium text-foreground whitespace-nowrap">{item.label}</span>
                <span className="text-sm text-muted-foreground whitespace-nowrap">{cost} {t("common.credits")}</span>
              </div>
            );
          })}
        </div>
      </section>

      <MpesaModal
        open={mpesaModalOpen}
        onOpenChange={setMpesaModalOpen}
        isLoading={isLoadingPayment}
        onConfirm={async (msisdn) => {
          if (!pendingCheckout) return;

          setIsLoadingPayment(true);
          try {
            const { response, data } = await postCheckoutWithTimeout({
                planId: pendingCheckout.planId,
                period: pendingCheckout.period,
                phoneNumber: msisdn,
            });

            if (data.url) {
              window.location.href = data.url;
            } else if (data.success) {
              window.location.reload();
            } else if (isLikelyMpesaDismissal(data)) {
              toast.error(t("billing.paymentDismissed"));
            } else if (!response.ok) {
              toast.error(data.error || t("billing.paymentError"));
            } else {
              toast.error(data.error || t("billing.paymentError"));
            }
          } catch (error) {
            const isAbort =
              error instanceof DOMException && error.name === "AbortError";
            toast.error(
              isAbort ? t("billing.paymentDismissed") : t("billing.serverError")
            );
          } finally {
            setIsLoadingPayment(false);
            setMpesaModalOpen(false);
            setPendingCheckout(null);
          }
        }}
      />
    </div>
  );
}

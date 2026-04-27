"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanGrid } from "@/components/billing/plan-grid";
import { usePublicPlans } from "@/hooks/use-public-plans";
import { SimpleTopbar } from "@/components/app/simple-topbar";
import { CreditCard, Sparkles, Shield, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function SubscribePage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    posthog.capture("subscribe_page_viewed");
  }, []);

  React.useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh w-full bg-background">
      <SimpleTopbar />
      <main className="container mx-auto max-w-5xl px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold tracking-tight mb-3 text-foreground">Choose your plan</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Select the plan that fits your needs. All plans include full platform access.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          <div className="flex items-center gap-4 p-5 rounded-xl bg-card border shadow-sm">
            <div className="flex items-center justify-center p-2.5 rounded-lg bg-primary/5">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Instant Access</p>
              <p className="text-sm text-muted-foreground">Start using right away</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-5 rounded-xl bg-card border shadow-sm">
            <div className="flex items-center justify-center p-2.5 rounded-lg bg-primary/5">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Secure Payment</p>
              <p className="text-sm text-muted-foreground">M-Pesa or Card</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-5 rounded-xl bg-card border shadow-sm">
            <div className="flex items-center justify-center p-2.5 rounded-lg bg-primary/5">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Cancel Anytime</p>
              <p className="text-sm text-muted-foreground">No commitment</p>
            </div>
          </div>
        </div>

        <Card className="shadow-sm border-0 bg-transparent ring-0">
          <CardHeader className="px-0 pt-0 pb-6">
            <CardTitle className="flex items-center gap-2 text-xl">
              <CreditCard className="h-5 w-5" />
              Available Plans
            </CardTitle>
            <CardDescription className="text-base">
              Compare plans and choose the best one for you.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <SubscribePlans />
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-8">
          By subscribing, you agree to our terms of service and privacy policy.
        </p>
      </main>
    </div>
  );
}

function SubscribePlans() {
  const { data, isLoading } = usePublicPlans()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-center">
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  return <PlanGrid plans={data?.plans || []} />
}

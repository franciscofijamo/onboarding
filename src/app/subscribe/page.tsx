"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
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
          <h1 className="text-3xl font-semibold tracking-tight mb-3 text-foreground">Escolha seu plano</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Selecione o plano ideal para suas necessidades. Todos os planos incluem acesso completo à plataforma.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          <div className="flex items-center gap-4 p-5 rounded-xl bg-card border shadow-sm">
            <div className="flex items-center justify-center p-2.5 rounded-lg bg-primary/5">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Acesso Imediato</p>
              <p className="text-sm text-muted-foreground">Comece a usar agora</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-5 rounded-xl bg-card border shadow-sm">
            <div className="flex items-center justify-center p-2.5 rounded-lg bg-primary/5">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Pagamento Seguro</p>
              <p className="text-sm text-muted-foreground">PIX, Boleto ou Cartão</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-5 rounded-xl bg-card border shadow-sm">
            <div className="flex items-center justify-center p-2.5 rounded-lg bg-primary/5">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Cancele a Qualquer Momento</p>
              <p className="text-sm text-muted-foreground">Sem fidelidade</p>
            </div>
          </div>
        </div>

        <Card className="shadow-sm border-0 bg-transparent ring-0">
          <CardHeader className="px-0 pt-0 pb-6">
            <CardTitle className="flex items-center gap-2 text-xl">
              <CreditCard className="h-5 w-5" />
              Planos Disponíveis
            </CardTitle>
            <CardDescription className="text-base">
              Compare os planos e escolha o melhor para você.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <SubscribePlans />
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Ao assinar, você concorda com nossos termos de serviço e política de privacidade.
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

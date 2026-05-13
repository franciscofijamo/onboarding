"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api-client";
import { useProfile } from "@/hooks/use-profile";

const RECRUITER_RETURN_URL = "/recruiter";

const steps = [
  {
    title: "Criar perfil de recrutador",
    description: "A conta entra diretamente no fluxo de empresa.",
    icon: ShieldCheck,
  },
  {
    title: "Completar empresa",
    description: "Nome, contacto, localização e logotipo ficam prontos antes das vagas.",
    icon: Building2,
  },
  {
    title: "Publicar vagas",
    description: "Depois do onboarding, o recrutador entra na gestão de vagas.",
    icon: BriefcaseBusiness,
  },
];

export default function RecruiterEntryPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { session } = useClerk();
  const queryClient = useQueryClient();
  const {
    role,
    hasRole,
    hasCompany,
    hasCompanyLogo,
    isLoading: isProfileLoading,
  } = useProfile({ enabled: isLoaded && !!isSignedIn });
  const [error, setError] = React.useState<string | null>(null);
  const [isRouting, setIsRouting] = React.useState(false);
  const processingRef = React.useRef(false);

  React.useEffect(() => {
    if (!isLoaded || !isSignedIn || isProfileLoading || processingRef.current) {
      return;
    }

    const routeRecruiter = async () => {
      processingRef.current = true;
      setIsRouting(true);
      setError(null);

      try {
        if (hasRole && role !== "RECRUITER") {
          setError(
            "Esta conta já está configurada como candidato. Para testar o fluxo de recrutador, use uma conta nova ou uma conta já marcada como recrutador."
          );
          setIsRouting(false);
          return;
        }

        if (!hasRole) {
          await api.put("/api/role", { role: "RECRUITER" });
          await session?.reload();
          await queryClient.invalidateQueries({ queryKey: ["profile"] });
          window.location.assign("/company/onboarding");
          return;
        }

        if (!hasCompany || !hasCompanyLogo) {
          window.location.assign(hasCompany ? "/company/profile" : "/company/onboarding");
          return;
        }

        window.location.assign("/recruiter/postings");
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          setError(
            "Esta conta já tem outro perfil bloqueado. Use uma conta nova para entrar no fluxo de recrutador."
          );
        } else {
          setError("Não foi possível preparar o fluxo de recrutador. Tente novamente.");
        }
        setIsRouting(false);
      }
    };

    routeRecruiter();
  }, [
    hasCompany,
    hasCompanyLogo,
    hasRole,
    isLoaded,
    isProfileLoading,
    isSignedIn,
    queryClient,
    role,
    session,
  ]);

  const authQuery = `redirect_url=${encodeURIComponent(RECRUITER_RETURN_URL)}`;

  if (!isLoaded || (isSignedIn && (isProfileLoading || isRouting))) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">
              A preparar o fluxo de recrutador
            </h1>
            <p className="text-sm text-muted-foreground">
              Estamos a encaminhar esta conta para a área de empresas.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl gap-10 px-4 py-10 md:grid-cols-[minmax(0,1fr)_420px] md:items-center md:px-6">
        <div className="space-y-8">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Entrada dedicada
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Comece diretamente pelo fluxo de recrutador.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                Use esta URL para testar ou partilhar apenas a jornada de empresas:
                criação de conta, perfil da empresa e gestão de vagas.
              </p>
            </div>
          </div>

          {error ? (
            <div className="max-w-2xl rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm leading-6 text-destructive">
              {error}
            </div>
          ) : null}

          {!isSignedIn ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="rounded-full px-6">
                <Link href={`/sign-up?${authQuery}`}>
                  Criar conta de recrutador
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-6">
                <Link href={`/sign-in?${authQuery}`}>Entrar como recrutador</Link>
              </Button>
            </div>
          ) : error ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="rounded-full px-6">
                <Link href="/dashboard">Voltar ao dashboard</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-6">
                <Link href={`/sign-up?${authQuery}`}>Usar outra conta</Link>
              </Button>
            </div>
          ) : null}
        </div>

        <div className="rounded-[28px] border border-border bg-card p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4 border-b border-border pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Fluxo dedicado
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                Recrutador
              </h2>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
          </div>

          <div className="space-y-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="grid grid-cols-[auto_1fr] gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-background text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <p className="font-medium">{step.title}</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Briefcase, User, ArrowRight, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useClerk } from "@clerk/nextjs";
import { useProfile } from "@/hooks/use-profile";

export default function RoleSelectPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useClerk();
  const { role, hasRole, hasCompany, hasCompanyLogo, isLoading } = useProfile();
  const [loading, setLoading] = React.useState<"CANDIDATE" | "RECRUITER" | null>(null);

  React.useEffect(() => {
    if (isLoading || !hasRole) return;

    if (role === "RECRUITER" && !hasCompany) {
      router.replace("/company/onboarding");
      return;
    }

    if (role === "RECRUITER" && hasCompany && !hasCompanyLogo) {
      router.replace("/company/profile");
      return;
    }

    router.replace("/dashboard");
  }, [hasCompany, hasCompanyLogo, hasRole, isLoading, role, router]);

  const selectRole = async (role: "CANDIDATE" | "RECRUITER") => {
    setLoading(role);
    try {
      await api.put("/api/role", { role });
      await session?.reload();
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      // Use a full page reload so the middleware reads the updated Clerk JWT
      // (client-side router.replace may carry the old JWT before propagation)
      if (role === "RECRUITER") {
        window.location.assign("/company/onboarding");
      } else {
        window.location.assign("/dashboard");
      }
    } catch {
      setLoading(null);
    }
  };

  if (isLoading || hasRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <div className="w-full rounded-[2rem] border border-border/70 bg-card/95 p-6 shadow-xl backdrop-blur sm:p-10">
          <div className="mx-auto max-w-2xl space-y-8">
            <div className="text-center space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
                Configuração inicial
              </p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Escolha o seu perfil</h1>
              <p className="text-base text-muted-foreground sm:text-lg">
                Esta é a primeira definição da sua conta. Depois de escolhida, a conta fica dedicada a um único perfil para evitar incoerências na plataforma.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <button
                onClick={() => selectRole("CANDIDATE")}
                disabled={loading !== null}
                className="group relative flex min-h-[260px] flex-col items-start gap-4 rounded-3xl border-2 border-border bg-card p-8 text-left transition-all hover:border-primary hover:shadow-lg disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 transition-colors group-hover:bg-blue-500/20">
                  {loading === "CANDIDATE" ? (
                    <Loader2 className="h-7 w-7 animate-spin" />
                  ) : (
                    <User className="h-7 w-7" />
                  )}
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">Sou candidato</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Quero procurar vagas, preparar CV, treinar entrevistas e acompanhar candidaturas.
                  </p>
                </div>
                <ArrowRight className="absolute right-6 top-6 h-5 w-5 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary" />
              </button>

              <button
                onClick={() => selectRole("RECRUITER")}
                disabled={loading !== null}
                className="group relative flex min-h-[260px] flex-col items-start gap-4 rounded-3xl border-2 border-border bg-card p-8 text-left transition-all hover:border-primary hover:shadow-lg disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 transition-colors group-hover:bg-emerald-500/20">
                  {loading === "RECRUITER" ? (
                    <Loader2 className="h-7 w-7 animate-spin" />
                  ) : (
                    <Briefcase className="h-7 w-7" />
                  )}
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">Sou recrutador</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Quero representar uma empresa, publicar vagas e gerir candidatos num pipeline de recrutamento.
                  </p>
                </div>
                <ArrowRight className="absolute right-6 top-6 h-5 w-5 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary" />
              </button>
            </div>

            <div className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Um utilizador pode ter apenas um perfil activo. Contas de recrutador não podem operar como candidato, e contas de candidato não podem operar como recrutador.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

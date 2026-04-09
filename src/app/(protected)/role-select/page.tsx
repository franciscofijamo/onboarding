"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Briefcase, User, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useClerk } from "@clerk/nextjs";

export default function RoleSelectPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useClerk();
  const [loading, setLoading] = React.useState<"CANDIDATE" | "RECRUITER" | null>(null);

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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Bem-vindo à StandOut</h1>
          <p className="text-muted-foreground text-lg">
            Como pretende usar a plataforma?
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => selectRole("CANDIDATE")}
            disabled={loading !== null}
            className="group relative flex flex-col items-start gap-4 rounded-2xl border-2 border-border bg-card p-8 text-left transition-all hover:border-primary hover:shadow-lg disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 group-hover:bg-blue-500/20 transition-colors">
              {loading === "CANDIDATE" ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : (
                <User className="h-7 w-7" />
              )}
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Sou candidato</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Estou à procura de emprego. Quero preparar o meu CV, praticar entrevistas e candidatar-me a vagas.
              </p>
            </div>
            <ArrowRight className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </button>

          <button
            onClick={() => selectRole("RECRUITER")}
            disabled={loading !== null}
            className="group relative flex flex-col items-start gap-4 rounded-2xl border-2 border-border bg-card p-8 text-left transition-all hover:border-primary hover:shadow-lg disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500/20 transition-colors">
              {loading === "RECRUITER" ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : (
                <Briefcase className="h-7 w-7" />
              )}
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Sou recrutador</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Represento uma empresa e quero publicar vagas, receber candidaturas e gerir o processo de recrutamento.
              </p>
            </div>
            <ArrowRight className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Esta escolha determina as funcionalidades disponíveis na sua conta.
        </p>
      </div>
    </div>
  );
}

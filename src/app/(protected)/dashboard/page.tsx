"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useSetPageMetadata } from "@/contexts/page-metadata";
import { useLanguage } from "@/contexts/language";
import { useCredits } from "@/hooks/use-credits";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { WelcomeCreditsDialog } from "@/components/app/welcome-credits-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  Upload,
  MessageSquare,
  Mic,
  Coins,
  BarChart3,
  BrainCircuit,
  Briefcase,
  LayoutGrid,
  PlusCircle,
  Building2,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useUser();
  const { t } = useLanguage();
  const { credits, isLoading: creditsLoading } = useCredits();
  const { role } = useProfile();

  useSetPageMetadata({
    title: t("dashboard.hello", { name: user?.firstName || t("dashboard.defaultUser") }),
    description: t("dashboard.welcomeSubtitle"),
  });

  if (role === "RECRUITER") {
    return (
      <div className="space-y-8 w-full">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-sm">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_35%)]" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Bem-vindo, {user?.firstName || "Recrutador"}!
              </h1>
              <p className="text-sm text-muted-foreground sm:text-base">
                Publique vagas, receba candidaturas com pontuação IA e gira o seu pipeline de recrutamento.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Button asChild size="lg" className="rounded-xl w-full sm:w-auto">
                <Link href="/recruiter/postings">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Nova vaga
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-xl w-full sm:w-auto">
                <Link href="/company/profile">
                  <Building2 className="h-4 w-4 mr-2" />
                  Perfil da empresa
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Funcionalidades
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link href="/recruiter/postings" className="block group">
              <div className="relative overflow-hidden bg-card rounded-3xl border border-border p-6 transition-all duration-300 hover:shadow-lg hover:border-primary/30 h-full cursor-pointer">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600/10 text-emerald-600">
                        <LayoutGrid className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">Publicações</h3>
                        <p className="text-sm text-muted-foreground">Gerencie as suas vagas</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Crie e publique vagas com descrição detalhada. Receba candidaturas com pontuação IA automática.
                  </p>
                </div>
              </div>
            </Link>

            <Link href="/company/profile" className="block group">
              <div className="relative overflow-hidden bg-card rounded-3xl border border-border p-6 transition-all duration-300 hover:shadow-lg hover:border-primary/30 h-full cursor-pointer">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">Perfil da Empresa</h3>
                        <p className="text-sm text-muted-foreground">Actualizar informações</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Mantenha o perfil da sua empresa actualizado para atrair os melhores candidatos.
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_35%)]" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("dashboard.heroTitle")}
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              {t("dashboard.heroDescription")}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Button asChild size="lg" className="rounded-xl w-full sm:w-auto">
              <Link href="/onboarding?new=1">
                <Upload className="h-4 w-4 mr-2" />
                {t("dashboard.newApplication")}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-xl w-full sm:w-auto">
              <Link href="/applications">
                <Briefcase className="h-4 w-4 mr-2" />
                {t("dashboard.viewPipeline")}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          {t("dashboard.unlockedFeatures")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/applications" className="block group">
            <div className="relative overflow-hidden bg-card rounded-3xl border border-border p-6 transition-all duration-300 hover:shadow-lg hover:border-primary/30 h-full cursor-pointer">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600">
                      <Briefcase className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{t("dashboard.boardTitle")}</h3>
                      <p className="text-sm text-muted-foreground">{t("dashboard.boardSummary")}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("dashboard.boardDescription")}
                </p>
              </div>
            </div>
          </Link>

          <div className="grid grid-rows-2 gap-4">
            <div className="bg-card rounded-3xl border border-border p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                  <Coins className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t("dashboard.creditsAvailable")}</p>
                  {creditsLoading ? (
                    <Skeleton className="h-6 w-12 mt-1" />
                  ) : (
                    <p className="text-xl font-bold text-foreground">{credits?.creditsRemaining ?? 0}</p>
                  )}
                </div>
              </div>
              <Button asChild variant="ghost" size="icon" className="rounded-full">
                <Link href="/billing"><ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="bg-card rounded-3xl border border-border p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
                  <BarChart3 className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t("dashboard.analysesPerformed")}</p>
                  <p className="text-xl font-bold text-foreground">—</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          {t("dashboard.comingSoon")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              title: t("dashboard.interviewTitle"),
              icon: MessageSquare,
              color: "amber",
              desc: t("dashboard.interviewSummary"),
            },
            {
              title: t("dashboard.scenariosTitle"),
              icon: Mic,
              color: "purple",
              desc: t("dashboard.scenariosSummary"),
            },
            {
              title: t("dashboard.aiCoachTitle"),
              icon: BrainCircuit,
              color: "emerald",
              desc: t("dashboard.aiCoachSummary"),
            },
          ].map((item, i) => (
            <div key={i} className="relative overflow-hidden bg-card/60 rounded-3xl border border-border/80 p-5 opacity-80 transition-all hover:opacity-100">
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-${item.color}-500/10 to-transparent rounded-bl-full`} />
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-${item.color}-500/10 text-${item.color}-600`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="rounded bg-gradient-to-br from-amber-500/10 to-orange-500/10 px-1.5 py-[2px] text-[9px] font-medium uppercase tracking-widest text-amber-600 ring-1 ring-inset ring-amber-500/20 shadow-sm">
                    {t("dashboard.soonBadge")}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <WelcomeCreditsDialog />
    </div>
  );
}

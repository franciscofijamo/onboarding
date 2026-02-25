"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useSetPageMetadata } from "@/contexts/page-metadata";
import { useLanguage } from "@/contexts/language";
import { useCredits } from "@/hooks/use-credits";
import { Button } from "@/components/ui/button";
import { WelcomeCreditsDialog } from "@/components/app/welcome-credits-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  ArrowRight,
  Upload,
  MessageSquare,
  Mic,
  Coins,
  BarChart3,
  BrainCircuit,
  Lightbulb,
  BookOpen,
  Briefcase,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useUser();
  const { t } = useLanguage();
  const { credits, isLoading: creditsLoading } = useCredits();

  useSetPageMetadata({
    title: t("dashboard.hello", { name: user?.firstName || t("dashboard.defaultUser") }),
    description: t("dashboard.welcomeSubtitle"),
  });

  return (
    <div className="space-y-8 w-full">

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          {t("dashboard.gettingStarted")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { step: 1, icon: Upload, titleKey: "step1Title", descKey: "step1Desc", bgColor: "bg-blue-600", iconColor: "text-white" },
            { step: 2, icon: MessageSquare, titleKey: "step2Title", descKey: "step2Desc", bgColor: "bg-amber-500", iconColor: "text-white" },
            { step: 3, icon: Sparkles, titleKey: "step3Title", descKey: "step3Desc", bgColor: "bg-emerald-600", iconColor: "text-white" },
          ].map(({ step, icon: Icon, titleKey, descKey, bgColor, iconColor }) => (
            <div
              key={step}
              className="group relative bg-card rounded-2xl border border-border/60 p-5 transition-all duration-200 hover:shadow-md hover:border-border"
            >
              <div className="flex items-start gap-3.5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bgColor}`}>
                  <Icon className={`h-5 w-5 ${iconColor}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground">{step}</span>
                    <h3 className="text-sm font-semibold text-foreground">{t(`dashboard.${titleKey}`)}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t(`dashboard.${descKey}`)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          {t("dashboard.quickActions")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/onboarding" className="block group">
            <div className="relative overflow-hidden bg-card rounded-2xl border border-border/60 p-6 transition-all duration-200 hover:shadow-lg hover:border-border h-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{t("dashboard.profileTitle")}</h3>
                      <p className="text-xs text-muted-foreground">{t("dashboard.profileSummary")}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("dashboard.profileDesc")}
                </p>
                <div className="mt-4">
                  <Button size="sm" variant="outline" className="text-xs">
                    {t("dashboard.startAnalysis")}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/interview-prep" className="block group">
            <div className="relative overflow-hidden bg-card rounded-2xl border border-border/60 p-6 transition-all duration-200 hover:shadow-lg hover:border-border h-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-white">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{t("dashboard.interviewTitle")}</h3>
                      <p className="text-xs text-muted-foreground">{t("dashboard.interviewSummary")}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("dashboard.interviewDesc")}
                </p>
                <div className="mt-4">
                  <Button size="sm" variant="outline" className="text-xs">
                    {t("dashboard.startPractice")}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/scenarios" className="block group">
            <div className="relative overflow-hidden bg-card rounded-2xl border border-border/60 p-6 transition-all duration-200 hover:shadow-lg hover:border-border h-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-bl-full" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-600 text-white">
                      <Mic className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{t("dashboard.scenariosTitle")}</h3>
                      <p className="text-xs text-muted-foreground">{t("dashboard.scenariosSummary")}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("dashboard.scenariosDesc")}
                </p>
                <div className="mt-4">
                  <Button size="sm" variant="outline" className="text-xs">
                    {t("dashboard.startScenario")}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/ai-chat" className="block group">
            <div className="relative overflow-hidden bg-card rounded-2xl border border-border/60 p-6 transition-all duration-200 hover:shadow-lg hover:border-border h-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white">
                      <BrainCircuit className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{t("dashboard.aiCoachTitle")}</h3>
                      <p className="text-xs text-muted-foreground">{t("dashboard.aiCoachSummary")}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("dashboard.aiCoachDesc")}
                </p>
                <div className="mt-4">
                  <Button size="sm" variant="outline" className="text-xs">
                    {t("dashboard.startChat")}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          {t("dashboard.yourUsage")}
        </h2>
        <div className="grid gap-3 grid-cols-2">
          <div className="bg-card rounded-2xl border border-border/60 p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                <Coins className="h-4 w-4 text-amber-600" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{t("dashboard.creditsAvailable")}</span>
            </div>
            {creditsLoading ? (
              <Skeleton className="h-8 w-14" />
            ) : (
              <p className="text-2xl font-bold text-foreground">{credits?.creditsRemaining ?? 0}</p>
            )}
          </div>

          <div className="bg-card rounded-2xl border border-border/60 p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                <BarChart3 className="h-4 w-4 text-violet-600" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{t("dashboard.analysesPerformed")}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">—</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          {t("dashboard.usefulLinks")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              titleKey: "interviewTipsTitle",
              descKey: "interviewTipsDesc",
              icon: BookOpen,
              bgColor: "bg-blue-100",
              iconColor: "text-blue-600",
            },
            {
              titleKey: "businessEnglishTitle",
              descKey: "businessEnglishDesc",
              icon: Briefcase,
              bgColor: "bg-emerald-100",
              iconColor: "text-emerald-600",
            },
            {
              titleKey: "careerTipsTitle",
              descKey: "careerTipsDesc",
              icon: Lightbulb,
              bgColor: "bg-amber-100",
              iconColor: "text-amber-600",
            },
          ].map(({ titleKey, descKey, icon: Icon, bgColor, iconColor }) => (
            <div
              key={titleKey}
              className="bg-card rounded-2xl border border-border/60 p-5 transition-all duration-200 hover:shadow-sm flex flex-col"
            >
              <div className="flex items-start gap-3 h-full">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bgColor}`}>
                  <Icon className={`h-4 w-4 ${iconColor}`} />
                </div>
                <div className="min-w-0 flex flex-col h-full">
                  <h3 className="text-sm font-medium text-foreground">{t(`dashboard.${titleKey}`)}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{t(`dashboard.${descKey}`)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <WelcomeCreditsDialog />
    </div>
  );
}

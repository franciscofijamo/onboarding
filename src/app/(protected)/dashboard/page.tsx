"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useSetPageMetadata } from "@/contexts/page-metadata";
import { useLanguage } from "@/contexts/language";
import { useCredits } from "@/hooks/use-credits";
import { Button } from "@/components/ui/button";
import { WelcomeCreditsDialog } from "@/components/app/welcome-credits-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  ArrowRight,
  GraduationCap,
  PenLine,
  BarChart3,
  Coins,
  FileText,
  ExternalLink,
  Lightbulb,
  BookOpen,
  Globe,
} from "lucide-react";

interface EssayData {
  id: string;
  type: string;
  status: string;
  wordCount: number;
  latestScore: number | null;
  analysisCount: number;
}

interface EssaysResponse {
  essays: Record<string, EssayData | null>;
}

export default function DashboardPage() {
  const { user } = useUser();
  const { t } = useLanguage();
  const { credits, isLoading: creditsLoading } = useCredits();

  useSetPageMetadata({
    title: t("dashboard.hello", { name: user?.firstName || t("dashboard.defaultUser") }),
    description: t("dashboard.welcomeSubtitle"),
  });

  const { data: cheveningData, isLoading: cheveningLoading } = useQuery<EssaysResponse>({
    queryKey: ["essays"],
    queryFn: () => api.get("/api/essays"),
  });

  const { data: fulbrightData, isLoading: fulbrightLoading } = useQuery<EssaysResponse>({
    queryKey: ["fulbright-essays"],
    queryFn: () => api.get("/api/fulbright/essays"),
  });

  const cheveningEssays = cheveningData?.essays || {};
  const fulbrightEssays = fulbrightData?.essays || {};

  const totalEssaysWritten =
    Object.values(cheveningEssays).filter((e) => e && e.wordCount > 0).length +
    Object.values(fulbrightEssays).filter((e) => e && e.wordCount > 0).length;

  const totalAnalyses =
    Object.values(cheveningEssays).reduce((sum, e) => sum + (e?.analysisCount || 0), 0) +
    Object.values(fulbrightEssays).reduce((sum, e) => sum + (e?.analysisCount || 0), 0);

  const isLoading = cheveningLoading || fulbrightLoading;

  return (
    <div className="space-y-8 w-full">

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          {t("dashboard.gettingStarted")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { step: 1, icon: GraduationCap, titleKey: "step1Title", descKey: "step1Desc", bgColor: "bg-blue-600", iconColor: "text-white" },
            { step: 2, icon: PenLine, titleKey: "step2Title", descKey: "step2Desc", bgColor: "bg-amber-500", iconColor: "text-white" },
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
          {t("dashboard.scholarships")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/chevening" className="block group">
            <div className="relative overflow-hidden bg-card rounded-2xl border border-border/60 p-6 transition-all duration-200 hover:shadow-lg hover:border-border h-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-red-500/10 to-transparent rounded-bl-full" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-white">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{t("nav.chevening")}</h3>
                      <p className="text-xs text-muted-foreground">{t("dashboard.cheveningSummary")}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("dashboard.cheveningDesc")}
                </p>
                <div className="mt-4">
                  <Button size="sm" variant="outline" className="text-xs">
                    {t("dashboard.startEssays")}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/fulbright" className="block group">
            <div className="relative overflow-hidden bg-card rounded-2xl border border-border/60 p-6 transition-all duration-200 hover:shadow-lg hover:border-border h-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{t("nav.fulbright")}</h3>
                      <p className="text-xs text-muted-foreground">{t("dashboard.fulbrightSummary")}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("dashboard.fulbrightDesc")}
                </p>
                <div className="mt-4">
                  <Button size="sm" variant="outline" className="text-xs">
                    {t("dashboard.startEssays")}
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
        <div className="grid gap-3 grid-cols-3">
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
            {isLoading ? (
              <Skeleton className="h-8 w-14" />
            ) : (
              <p className="text-2xl font-bold text-foreground">{totalAnalyses}</p>
            )}
          </div>

          <div className="bg-card rounded-2xl border border-border/60 p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100">
                <FileText className="h-4 w-4 text-teal-600" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{t("dashboard.essaysWritten")}</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-14" />
            ) : (
              <p className="text-2xl font-bold text-foreground">{totalEssaysWritten}</p>
            )}
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
              titleKey: "cheveningOfficialTitle",
              descKey: "cheveningOfficialDesc",
              href: "https://www.chevening.org",
              icon: BookOpen,
              bgColor: "bg-red-100",
              iconColor: "text-red-600",
            },
            {
              titleKey: "fulbrightOfficialTitle",
              descKey: "fulbrightOfficialDesc",
              href: "https://foreign.fulbrightonline.org",
              icon: Globe,
              bgColor: "bg-blue-100",
              iconColor: "text-blue-600",
            },
            {
              titleKey: "essayTipsTitle",
              descKey: "essayTipsDesc",
              href: null,
              icon: Lightbulb,
              bgColor: "bg-amber-100",
              iconColor: "text-amber-600",
            },
          ].map(({ titleKey, descKey, href, icon: Icon, bgColor, iconColor }) => {
            const CardContent = (
              <div className="flex items-start gap-3 h-full">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bgColor}`}>
                  <Icon className={`h-4 w-4 ${iconColor}`} />
                </div>
                <div className="min-w-0 flex flex-col h-full">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-medium text-foreground">{t(`dashboard.${titleKey}`)}</h3>
                    {href && <ExternalLink className="h-3 w-3 text-muted-foreground transition-colors group-hover:text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{t(`dashboard.${descKey}`)}</p>
                  {href && (
                    <span className="inline-block text-xs text-primary group-hover:underline mt-auto pt-2">
                      {href.replace("https://", "").replace("www.", "")}
                    </span>
                  )}
                </div>
              </div>
            );

            if (href) {
              return (
                <a
                  key={titleKey}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-card rounded-2xl border border-border/60 p-5 transition-all duration-200 hover:shadow-md hover:border-border cursor-pointer group flex flex-col"
                >
                  {CardContent}
                </a>
              );
            }

            return (
              <div
                key={titleKey}
                className="bg-card rounded-2xl border border-border/60 p-5 transition-all duration-200 hover:shadow-sm flex flex-col"
              >
                {CardContent}
              </div>
            );
          })}
        </div>
      </section>
      <WelcomeCreditsDialog />
    </div>
  );
}

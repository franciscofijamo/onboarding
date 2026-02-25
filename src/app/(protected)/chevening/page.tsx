"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useSetPageMetadata } from "@/contexts/page-metadata";
import { useLanguage } from "@/contexts/language";
import { useCredits } from "@/hooks/use-credits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Star,
  Users,
  BookOpen,
  Briefcase,
  Coins,
  ArrowRight,
  Eye,
  PenLine,
  CheckCircle2,
  FileText,
  TrendingUp,
  MessageSquareText,
  Sparkles,
  Lock,
  Mic,
} from "lucide-react";

const ESSAY_TYPES = [
  { key: "LEADERSHIP", slug: "leadership", icon: Star, color: "bg-amber-100 text-amber-700" },
  { key: "NETWORKING", slug: "networking", icon: Users, color: "bg-blue-100 text-blue-700" },
  { key: "COURSE_CHOICES", slug: "course-choices", icon: BookOpen, color: "bg-emerald-100 text-emerald-700" },
  { key: "CAREER_PLAN", slug: "career-plan", icon: Briefcase, color: "bg-purple-100 text-purple-700" },
] as const;

type EssayStatus = "DRAFT" | "ANALYZING" | "ANALYZED" | "FINALIZED";

interface EssayData {
  id: string;
  type: string;
  status: EssayStatus;
  content: string;
  wordCount: number;
  latestScore: number | null;
  analysisCount: number;
  analyses: { id: string; score: number; createdAt: string }[];
}

interface EssaysResponse {
  essays: Record<string, EssayData | null>;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 10) * circumference;
  const color = score >= 7 ? "text-emerald-500" : score >= 5 ? "text-amber-500" : "text-red-400";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
        <circle cx="28" cy="28" r={radius} fill="none" strokeWidth="4" className="stroke-muted" />
        <circle
          cx="28" cy="28" r={radius} fill="none" strokeWidth="4"
          strokeDasharray={circumference} strokeDashoffset={circumference - progress}
          strokeLinecap="round" className={`${color} stroke-current transition-all duration-500`}
        />
      </svg>
      <span className="absolute text-sm font-bold text-foreground">{score.toFixed(1)}</span>
    </div>
  );
}

export default function CheveningDashboardPage() {
  const router = useRouter();
  const { t } = useLanguage();

  useSetPageMetadata({
    title: "",
    description: "",
    showBreadcrumbs: true,
  });

  const { credits, isLoading: creditsLoading } = useCredits();

  const { data, isLoading } = useQuery<EssaysResponse>({
    queryKey: ["essays"],
    queryFn: () => api.get("/api/essays"),
  });

  const essays = data?.essays;

  const analyzedCount = ESSAY_TYPES.filter(
    (et) => essays?.[et.key]?.analysisCount && essays[et.key]!.analysisCount > 0
  ).length;

  const allAnalyzed = analyzedCount === 4;
  const consolidatedScore = allAnalyzed
    ? ESSAY_TYPES.reduce((sum, et) => sum + (essays?.[et.key]?.latestScore ?? 0), 0) / 4
    : null;

  function getStatusLabel(status?: EssayStatus): string {
    if (!status) return t("common.notStarted");
    switch (status) {
      case "DRAFT": return t("common.draft");
      case "ANALYZING": return t("common.analyzing");
      case "ANALYZED": return t("common.analyzed");
      case "FINALIZED": return t("common.finalized");
      default: return t("common.notStarted");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-3">
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-xl bg-lime/60 flex items-center justify-center">
              <FileText className="h-4 w-4 text-lime-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">{t("common.progress")}</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{analyzedCount}<span className="text-base font-normal text-muted-foreground">/4</span></p>
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${(analyzedCount / 4) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-amber-700" />
            </div>
            <span className="text-sm text-muted-foreground">{t("common.averageScore")}</span>
          </div>
          {consolidatedScore !== null ? (
            <p className="text-2xl font-bold text-foreground">{consolidatedScore.toFixed(1)}<span className="text-base font-normal text-muted-foreground">/10</span></p>
          ) : (
            <p className="text-sm text-muted-foreground">{t("chevening.analyzeAll", { count: 4 })}</p>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <Coins className="h-4 w-4 text-blue-700" />
            </div>
            <span className="text-sm text-muted-foreground">{t("common.credits")}</span>
          </div>
          {creditsLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-2xl font-bold text-foreground">{credits?.creditsRemaining ?? 0}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">10 {t("common.perAnalysis")}</p>
        </div>
      </div>

      <div className="space-y-3">
        {ESSAY_TYPES.map((essayType) => {
          const essay = essays?.[essayType.key];
          const status = essay?.status;
          const hasAnalysis = essay && essay.analysisCount > 0;
          const Icon = essayType.icon;
          const isAnalyzed = status === "ANALYZED" || status === "FINALIZED";
          const label = t(`chevening.essayTypes.${essayType.key}`);

          return (
            <div
              key={essayType.key}
              className="group bg-card rounded-2xl border border-border p-5 flex items-center gap-5 transition-all duration-200 hover:shadow-md hover:border-border/80"
            >
              <div className={`h-11 w-11 rounded-xl ${essayType.color} flex items-center justify-center shrink-0`}>
                <Icon className="h-5 w-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <h3 className="font-semibold text-foreground text-[15px]">{label}</h3>
                  {status && status !== "DRAFT" && (
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${isAnalyzed ? "text-emerald-600" : "text-muted-foreground"}`}>
                      {isAnalyzed && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {getStatusLabel(status)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {!essay
                    ? t("common.notStarted")
                    : `${essay.wordCount} ${t("common.words")}${hasAnalysis ? ` · ${essay.analysisCount} ${t("common.analyses")}` : ""}`}
                </p>
              </div>

              {hasAnalysis && essay.latestScore !== null && (
                <div className="shrink-0">
                  <ScoreRing score={essay.latestScore} />
                </div>
              )}

              <div className="shrink-0 flex items-center gap-2">
                {hasAnalysis ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/chevening/essay/${essayType.slug}/feedback`)}
                    >
                      <Eye className="h-4 w-4" />
                      {t("feedback.feedback")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/chevening/essay/${essayType.slug}`)}
                    >
                      <PenLine className="h-4 w-4" />
                      {t("common.edit")}
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => router.push(`/chevening/essay/${essayType.slug}`)}
                  >
                    {essay ? t("common.continue") : t("common.write")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mock Interview Card */}
      <div
        className={`bg-card rounded-2xl border p-5 transition-all duration-200 ${allAnalyzed
            ? "border-primary/30 bg-gradient-to-r from-primary/5 to-transparent hover:shadow-md cursor-pointer"
            : "border-border opacity-70"
          }`}
        onClick={() => allAnalyzed && router.push("/chevening/mock-interview")}
      >
        <div className="flex items-center gap-5">
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${allAnalyzed ? "bg-primary/10" : "bg-muted"
            }`}>
            {allAnalyzed ? (
              <MessageSquareText className="h-5 w-5 text-primary" />
            ) : (
              <Lock className="h-5 w-5 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground text-[15px]">Mock Interview</h3>
              {allAnalyzed && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Novo
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {allAnalyzed
                ? "Flashcards personalizados para preparar sua entrevista"
                : `Complete os 4 essays para desbloquear (${analyzedCount}/4)`
              }
            </p>
          </div>

          {allAnalyzed && (
            <Button size="sm">
              Preparar Entrevista
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Audio Mock Interview Card */}
      <div
        className={`bg-card rounded-2xl border p-5 transition-all duration-200 ${allAnalyzed
            ? "border-primary/30 bg-gradient-to-r from-purple-500/5 to-transparent hover:shadow-md cursor-pointer"
            : "border-border opacity-70"
          }`}
        onClick={() => allAnalyzed && router.push("/chevening/mock-interview/audio")}
      >
        <div className="flex items-center gap-5">
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${allAnalyzed ? "bg-purple-100" : "bg-muted"
            }`}>
            {allAnalyzed ? (
              <Mic className="h-5 w-5 text-purple-700" />
            ) : (
              <Lock className="h-5 w-5 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground text-[15px]">{t("audioMock.title") || "Entrevista em Áudio"}</h3>
              {allAnalyzed && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-600">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t("common.new") || "Novo"}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {allAnalyzed
                ? (t("audioMock.generateDesc") || "5 perguntas personalizadas baseadas nos seus 4 essays analisados")
                : `Complete os 4 essays para desbloquear (${analyzedCount}/4)`
              }
            </p>
          </div>

          {allAnalyzed && (
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
              {t("audioMock.startRecording") || "Gravar"}
              <Mic className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

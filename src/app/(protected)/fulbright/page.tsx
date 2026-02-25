"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useSetPageMetadata } from "@/contexts/page-metadata";
import { useLanguage } from "@/contexts/language";
import { useCredits } from "@/hooks/use-credits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Star,
  Coins,
  ArrowRight,
  Eye,
  PenLine,
  CheckCircle2,
  FileText,
  TrendingUp,
  GraduationCap,
  Building2,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ESSAY_TYPES = [
  {
    key: "GRANT_PURPOSE",
    slug: "grant-purpose",
    icon: FileText,
    color: "bg-blue-100 text-blue-700",
  },
  {
    key: "PERSONAL_STATEMENT",
    slug: "personal-statement",
    icon: Globe,
    color: "bg-purple-100 text-purple-700",
  },
] as const;

const CATEGORIES = [
  { value: "STUDENT" },
  { value: "YOUNG_PROFESSIONAL" },
  { value: "RESEARCHER" },
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
  fulbrightCategory: string | null;
  hostInstitution: string | null;
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

export default function FulbrightDashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [hostInstitution, setHostInstitution] = useState("");

  useSetPageMetadata({
    title: "",
    description: "",
    showBreadcrumbs: true,
  });

  const { credits, isLoading: creditsLoading } = useCredits();

  const { data, isLoading } = useQuery<EssaysResponse>({
    queryKey: ["fulbright-essays"],
    queryFn: () => api.get("/api/fulbright/essays"),
  });

  const essays = data?.essays;

  const currentCategory = selectedCategory ||
    essays?.GRANT_PURPOSE?.fulbrightCategory ||
    essays?.PERSONAL_STATEMENT?.fulbrightCategory || "";

  const currentHost = hostInstitution ||
    essays?.GRANT_PURPOSE?.hostInstitution ||
    essays?.PERSONAL_STATEMENT?.hostInstitution || "";

  const saveCategoryMutation = useMutation({
    mutationFn: (data: { type: string; content: string; fulbrightCategory?: string; hostInstitution?: string }) =>
      api.post("/api/fulbright/essays", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fulbright-essays"] });
    },
  });

  const navigateToEssay = (slug: string, essayType: string) => {
    const essayData = essays?.[essayType];
    if (currentCategory || currentHost) {
      saveCategoryMutation.mutate({
        type: essayType,
        content: essayData?.content || "",
        ...(currentCategory ? { fulbrightCategory: currentCategory } : {}),
        ...(currentHost ? { hostInstitution: currentHost } : {}),
      });
    }
    router.push(`/fulbright/essay/${slug}`);
  };

  const analyzedCount = ESSAY_TYPES.filter(
    (et) => essays?.[et.key]?.analysisCount && essays[et.key]!.analysisCount > 0
  ).length;

  const allAnalyzed = analyzedCount === 2;
  const consolidatedScore = allAnalyzed
    ? ESSAY_TYPES.reduce((sum, et) => sum + (essays?.[et.key]?.latestScore ?? 0), 0) / 2
    : null;

  const getStatusLabel = (status?: EssayStatus): string => {
    if (!status) return t("common.notStarted");
    switch (status) {
      case "DRAFT": return t("common.draft");
      case "ANALYZING": return t("common.analyzing");
      case "ANALYZED": return t("common.analyzed");
      case "FINALIZED": return t("common.finalized");
      default: return t("common.notStarted");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-xl bg-blue-100 flex items-center justify-center">
            <GraduationCap className="h-4 w-4 text-blue-700" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{t("fulbright.applicationConfig")}</h2>
            <p className="text-xs text-muted-foreground">{t("fulbright.selectCategory")}</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t("fulbright.category")}</label>
            <Select
              value={currentCategory || ""}
              onValueChange={(v) => setSelectedCategory(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("fulbright.selectCategoryPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {t(`fulbright.categories.${cat.value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t("fulbright.hostInstitution")}</label>
            <input
              type="text"
              value={currentHost || ""}
              onChange={(e) => setHostInstitution(e.target.value)}
              placeholder={t("fulbright.hostPlaceholder")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-3">
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-xl bg-lime/60 flex items-center justify-center">
              <FileText className="h-4 w-4 text-lime-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">{t("common.progress")}</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{analyzedCount}<span className="text-base font-normal text-muted-foreground">/2</span></p>
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${(analyzedCount / 2) * 100}%` }}
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
            <p className="text-sm text-muted-foreground">{t("fulbright.analyzeBoth")}</p>
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

      {allAnalyzed && consolidatedScore !== null && (
        <div className={cn(
          "rounded-2xl border p-5",
          consolidatedScore >= 7
            ? "bg-emerald-50 border-emerald-200"
            : consolidatedScore >= 5
            ? "bg-amber-50 border-amber-200"
            : "bg-red-50 border-red-200"
        )}>
          <div className="flex items-center gap-3 mb-2">
            <Star className={cn(
              "h-5 w-5",
              consolidatedScore >= 7 ? "text-emerald-600" : consolidatedScore >= 5 ? "text-amber-600" : "text-red-600"
            )} />
            <h3 className="font-semibold text-foreground">{t("fulbright.consolidatedAssessment")}</h3>
            <Badge className={cn(
              "text-xs",
              consolidatedScore >= 7
                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                : consolidatedScore >= 5
                ? "bg-amber-100 text-amber-700 border-amber-200"
                : "bg-red-100 text-red-700 border-red-200"
            )}>
              {consolidatedScore >= 7 ? t("common.competitive") : consolidatedScore >= 5 ? t("common.promising") : t("common.needsImprovement")}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("fulbright.bothAnalyzed", { score: consolidatedScore.toFixed(1) })}
            {consolidatedScore >= 7
              ? ` ${t("fulbright.strongApplication")}`
              : ` ${t("fulbright.keepRefining")}`}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {ESSAY_TYPES.map((essayType) => {
          const essay = essays?.[essayType.key];
          const status = essay?.status;
          const hasAnalysis = essay && essay.analysisCount > 0;
          const Icon = essayType.icon;
          const isAnalyzed = status === "ANALYZED" || status === "FINALIZED";

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
                  <h3 className="font-semibold text-foreground text-[15px]">{t(`fulbright.essayTypes.${essayType.key}`)}</h3>
                  {status && status !== "DRAFT" && (
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${isAnalyzed ? "text-emerald-600" : "text-muted-foreground"}`}>
                      {isAnalyzed && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {getStatusLabel(status)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {!essay
                    ? t(`fulbright.essayDescriptions.${essayType.key}`)
                    : `${essay.wordCount}/1000 ${t("common.words")}${hasAnalysis ? ` · ${essay.analysisCount} ${t("common.analyses")}` : ""}`}
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
                      onClick={() => router.push(`/fulbright/essay/${essayType.slug}/feedback`)}
                    >
                      <Eye className="h-4 w-4" />
                      {t("feedback.feedback")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateToEssay(essayType.slug, essayType.key)}
                    >
                      <PenLine className="h-4 w-4" />
                      {t("common.edit")}
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => navigateToEssay(essayType.slug, essayType.key)}
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
    </div>
  );
}

"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useSetPageMetadata } from "@/contexts/page-metadata";
import { useLanguage } from "@/contexts/language";
import { useCredits } from "@/hooks/use-credits";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Mic,
  Clock,
  Target,
  TrendingUp,
  Play,
  CheckCircle2,
  Coins,
  CircleDot,
  AlertCircle,
  Briefcase,
  Building2,
  Plus,
  Loader2,
  Search,
  X,
  BookOpen,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import Link from "next/link";

interface ResponseData {
  id: string;
  questionIndex: number;
  question: string;
  status: string;
  score: number | null;
  duration: number | null;
}

interface JobApplicationInfo {
  id: string;
  jobTitle: string | null;
  companyName: string | null;
  status: string;
}

interface RecruitmentStageInfo {
  id: string;
  name: string;
  focusType: string;
  jobTitle: string;
  companyName: string;
}

interface SessionData {
  id: string;
  name: string;
  jobApplicationId: string | null;
  jobApplication: JobApplicationInfo | null;
  recruitmentStageId: string | null;
  recruitmentStage: RecruitmentStageInfo | null;
  totalQuestions: number;
  answeredCount: number;
  analyzedCount: number;
  averageScore: number | null;
  createdAt: string;
  responses: ResponseData[];
}

interface SessionsResponse {
  sessions: SessionData[];
  stats: {
    totalSessions: number;
    totalAnalyzed: number;
    averageScore: number | null;
  };
}

const GENERATION_STEPS = [
  "scenarios.generationSteps.analyzingJob",
  "scenarios.generationSteps.reviewingProfile",
  "scenarios.generationSteps.craftingBehavioral",
  "scenarios.generationSteps.generatingSituational",
  "scenarios.generationSteps.finalizingSession",
];

function getStatusBadge(session: SessionData, t: any) {
  if (session.analyzedCount === session.totalQuestions && session.totalQuestions > 0) {
    return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">{t("scenarios.completedBadge") || "Completed"}</Badge>;
  }
  if (session.answeredCount > 0) {
    return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">{t("scenarios.inProgressBadge") || "In Progress"}</Badge>;
  }
  return <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">{t("scenarios.newBadge") || "New"}</Badge>;
}

function ScenariosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { locale, t } = useLanguage();
  const { credits, isLoading: creditsLoading } = useCredits();
  const { data: creditSettings } = useQuery<{ featureCosts?: Record<string, number> }>({
    queryKey: ["credit-settings"],
    queryFn: () => api.get("/api/credits/settings"),
    staleTime: 60_000,
  });

  const jobApplicationId = searchParams.get("jobApplicationId");

  const [confirmJobId, setConfirmJobId] = useState<string | null>(
    jobApplicationId ?? null
  );
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [search, setSearch] = useState("");

  useSetPageMetadata({
    title: t("scenarios.practiceTitle"),
    description: t("scenarios.practiceDescription"),
    breadcrumbs: [{ label: t("scenarios.practiceTitle") }],
  });

  const { data, isLoading } = useQuery<SessionsResponse>({
    queryKey: ["scenario-sessions"],
    queryFn: () => api.get("/api/scenarios/sessions"),
  });

  const { data: confirmJobData } = useQuery<{ jobApplication: JobApplicationInfo & { jobDescription: string } }>({
    queryKey: ["job-application", confirmJobId],
    queryFn: () => api.get(`/api/job-application/${confirmJobId}`),
    enabled: Boolean(confirmJobId),
  });

  const generateMutation = useMutation({
    mutationFn: (jobId: string) =>
      api.post("/api/scenarios/sessions", { language: locale, jobApplicationId: jobId }),
    onSuccess: (data: { session: SessionData }) => {
      setGenerating(false);
      setConfirmJobId(null);
      // Clear jobApplicationId from URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete("jobApplicationId");
      window.history.replaceState({}, "", url.toString());
      queryClient.invalidateQueries({ queryKey: ["scenario-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["credits"] });
      toast({
        title: t("scenarios.sessionCreated"),
        description: t("scenarios.sessionCreatedDesc"),
      });
      router.push(`/scenarios/${data.session.id}`);
    },
    onError: (error: Error) => {
      setGenerating(false);
      toast({
        title: t("scenarios.errorGenerating"),
        description: error.message || t("recruiterCandidates.tryAgain"),
        variant: "destructive",
      });
    },
  });

  const handleGenerate = (jobId: string) => {
    setConfirmJobId(null);
    setGenerating(true);
    setGenerationStep(0);

    const stepInterval = setInterval(() => {
      setGenerationStep((prev) => (prev < GENERATION_STEPS.length - 1 ? prev + 1 : prev));
    }, 8000);

    generateMutation.mutate(jobId, {
      onSettled: () => clearInterval(stepInterval),
    });
  };

  const scenarioCost = creditSettings?.featureCosts?.scenario_simulation ?? 15;
  const hasCredits = (credits?.creditsRemaining ?? 0) >= scenarioCost;

  const sessions = data?.sessions ?? [];
  const stats = data?.stats;

  // Find job info for confirm dialog — from existing sessions or from direct API fetch
  const confirmJob =
    sessions.find((s) => s.jobApplicationId === confirmJobId)?.jobApplication ??
    confirmJobData?.jobApplication ??
    null;

  // Group sessions by jobApplicationId
  const grouped = sessions.reduce<
    Record<string, { jobApplication: JobApplicationInfo | null; sessions: SessionData[] }>
  >((acc, session) => {
    const key = session.jobApplicationId ?? "__no_job__";
    if (!acc[key]) {
      acc[key] = { jobApplication: session.jobApplication, sessions: [] };
    }
    acc[key].sessions.push(session);
    return acc;
  }, {});

  const groupEntries = Object.entries(grouped)
    .sort(([, a], [, b]) => {
      const aLatest = new Date(a.sessions[0]?.createdAt ?? 0).getTime();
      const bLatest = new Date(b.sessions[0]?.createdAt ?? 0).getTime();
      return bLatest - aLatest;
    })
    .filter(([, group]) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (group.jobApplication?.jobTitle ?? "").toLowerCase().includes(q) ||
        (group.jobApplication?.companyName ?? "").toLowerCase().includes(q)
      );
    });

  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="space-y-4 text-center">
          {GENERATION_STEPS.map((step, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 transition-opacity duration-500",
                i <= generationStep ? "opacity-100" : "opacity-30"
              )}
            >
              {i < generationStep ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : i === generationStep ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <div className="h-5 w-5 rounded-full border border-muted-foreground/30" />
              )}
              <span className="text-sm">{t(step)}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t("scenarios.generatingWait")}</p>
      </div>
    );
  }

  return (
    <>
      {/* Confirm generate dialog */}
      <Dialog
        open={Boolean(confirmJobId)}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmJobId(null);
            const url = new URL(window.location.href);
            url.searchParams.delete("jobApplicationId");
            window.history.replaceState({}, "", url.toString());
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("scenarios.confirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("scenarios.confirmDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {confirmJob && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("scenarios.roleLabel")}</span>
                <span className="font-medium">
                  {confirmJob.jobTitle || t("scenarios.untitledRole")} @ {confirmJob.companyName || t("scenarios.companyFallback")}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("scenarios.costLabel")}</span>
              <Badge>{scenarioCost} {t("common.credits")}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("scenarios.balanceLabel")}</span>
              <span className="flex items-center gap-1 font-medium">
                <Coins className="h-4 w-4 text-yellow-500" />
                {credits?.creditsRemaining ?? 0}
              </span>
            </div>
            {!hasCredits && !creditsLoading && (
              <p className="text-sm text-red-500 flex items-center gap-1 pt-1">
                <AlertCircle className="h-4 w-4" />
                {t("scenarios.noCredits")}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmJobId(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              disabled={!hasCredits || creditsLoading}
              onClick={() => confirmJobId && handleGenerate(confirmJobId)}
            >
              <Sparkles className="h-4 w-4" />
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-xl bg-purple-100 flex items-center justify-center">
                <Briefcase className="h-4 w-4 text-purple-700" />
              </div>
              <span className="text-sm text-muted-foreground">{t("scenarios.totalSessionsLabel")}</span>
            </div>
            <p className="text-2xl font-bold">{stats?.totalSessions ?? 0}</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Target className="h-4 w-4 text-emerald-700" />
              </div>
              <span className="text-sm text-muted-foreground">{t("scenarios.questionsAnalyzedLabel")}</span>
            </div>
            <p className="text-2xl font-bold">{stats?.totalAnalyzed ?? 0}</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-xl bg-blue-100 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-blue-700" />
              </div>
              <span className="text-sm text-muted-foreground">{t("scenarios.avgScore")}</span>
            </div>
            <p className="text-2xl font-bold">
              {stats?.averageScore != null ? `${stats.averageScore}/10` : "—"}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-yellow-500" />
              <span>{t("scenarios.costPerSessionLabel")}</span>
            </div>
            <Badge variant="outline">{scenarioCost} {t("common.credits")}</Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("scenarios.costChargedOnSuccess")}
          </p>
        </div>

        {/* Search bar — only when there are sessions */}
        {!isLoading && sessions.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("scenarios.searchPlaceholder")}
              className="pl-9 pr-9 rounded-2xl"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Empty state */}
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-10 w-64 rounded-xl" />
                <Skeleton className="h-20 rounded-2xl" />
                <Skeleton className="h-20 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Mic className="h-10 w-10 text-primary/60" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{t("scenarios.noSessions") || "Sem sessões de entrevista"}</h2>
            <p className="text-muted-foreground max-w-sm mx-auto mb-8">
              {t("scenarios.noSessionsDesc") || "Abra uma candidatura e clique em Praticar Entrevista para iniciar."}
            </p>
            <Button asChild size="lg" className="rounded-2xl">
              <Link href="/applications">
                <Briefcase className="h-4 w-4 mr-2" />
                {t("scenarios.goToApplications")}
              </Link>
            </Button>
          </div>
        ) : groupEntries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{t("scenarios.noResults")} &ldquo;{search}&rdquo;</p>
            <button onClick={() => setSearch("")} className="text-sm text-primary mt-2 hover:underline">
              {t("scenarios.clearSearch")}
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {groupEntries.map(([key, group]) => {
              const job = group.jobApplication;
              return (
                <div key={key}>
                  {/* Job header */}
                  <div className="flex items-center justify-between mb-3 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Briefcase className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold leading-tight">
                          {job?.jobTitle || t("scenarios.untitledRole")}
                        </p>
                        {job?.companyName && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            <span>{job.companyName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {job?.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-300 shrink-0"
                        onClick={() => setConfirmJobId(job.id)}
                      >
                        <Plus className="h-4 w-4" />
                        {t("scenarios.newSessionBtn")}
                      </Button>
                    )}
                  </div>

                  {/* Sessions */}
                  <div className="space-y-2">
                    {group.sessions.map((session) => (
                      <div
                        key={session.id}
                        className={cn(
                          "bg-card rounded-2xl border p-4 flex items-center gap-4",
                          session.recruitmentStageId
                            ? "border-purple-200 bg-purple-50/30"
                            : "border-border"
                        )}
                      >
                        <div className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                          session.recruitmentStageId ? "bg-purple-100" : "bg-primary/10"
                        )}>
                          {session.recruitmentStageId
                            ? <BookOpen className="h-4 w-4 text-purple-700" />
                            : <Mic className="h-4 w-4 text-primary" />
                          }
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <h4 className="font-medium text-sm truncate min-w-0">{session.name}</h4>
                            <div className="flex items-center gap-2 shrink-0">
                              {session.recruitmentStageId && (
                                <Badge className="text-xs bg-purple-100 text-purple-700 border-purple-200">
                                  {t("scenarios.companyInterviewBadge")}
                                </Badge>
                              )}
                              {getStatusBadge(session, t)}
                              {session.averageScore != null && (
                                <Badge variant="outline" className="text-xs">
                                  {Math.round((session.averageScore || 0) * 10)}/100
                                </Badge>
                              )}
                            </div>
                          </div>
                          {session.recruitmentStage && (
                            <p className="text-xs text-purple-600 mt-0.5">
                              {session.recruitmentStage.jobTitle} @ {session.recruitmentStage.companyName}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CircleDot className="h-3 w-3" />
                              {session.answeredCount}/{session.totalQuestions} {t("scenarios.answeredList")}
                            </span>
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              {session.analyzedCount}/{session.totalQuestions} {t("scenarios.analysedList")}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(session.createdAt)}
                            </span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => router.push(`/scenarios/${session.id}`)}
                          className="shrink-0"
                        >
                          <Play className="h-4 w-4" />
                          {session.analyzedCount === session.totalQuestions && session.totalQuestions > 0
                            ? t("scenarios.viewDetails")
                            : t("scenarios.continueBtn")}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export default function ScenariosPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="grid gap-3 grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    }>
      <ScenariosContent />
    </Suspense>
  );
}

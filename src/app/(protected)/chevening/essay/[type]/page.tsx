"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useSetPageMetadata } from "@/contexts/page-metadata";
import { useLanguage } from "@/contexts/language";
import { useCredits } from "@/hooks/use-credits";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Save,
  Sparkles,
  Coins,
  Loader2,
  CheckCircle2,
  Eye,
  Clock,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_MAP: Record<string, { enum: string; label: string }> = {
  leadership: { enum: "LEADERSHIP", label: "Leadership & Influencing" },
  networking: { enum: "NETWORKING", label: "Networking" },
  "course-choices": { enum: "COURSE_CHOICES", label: "Course Choices" },
  "career-plan": { enum: "CAREER_PLAN", label: "Career Plan" },
};

interface EssayData {
  id: string;
  type: string;
  status: string;
  content: string;
  wordCount: number;
  latestScore: number | null;
  analysisCount: number;
  versions?: { id: string; version: number; content: string; wordCount: number; createdAt: string }[];
  analyses?: {
    id: string;
    versionNumber: number;
    score: number;
    status: string;
    feedback: Record<string, unknown>;
    wordCount: number;
    createdAt: string;
  }[];
}

interface EssaysResponse {
  essays: Record<string, EssayData | null>;
}

interface SaveResponse {
  essay: EssayData;
}

interface AnalyzeResponse {
  analysis: {
    id: string;
    score: number;
    feedback: Record<string, unknown>;
    versionNumber: number;
    createdAt: string;
  };
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function EssayEditorPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t, tArray, locale } = useLanguage();
  const typeInfo = TYPE_MAP[type];
  const [content, setContent] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [showVersions, setShowVersions] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const essayIdRef = useRef<string | null>(null);

  const { credits } = useCredits();

  const analysisSteps = tArray("editor.analysisSteps.chevening");

  useSetPageMetadata({
    title: typeInfo ? t(`chevening.essayTypes.${typeInfo.enum}`) : "Essay",
    description: "",
    breadcrumbs: [
      { label: t("chevening.title"), href: "/chevening" },
      { label: typeInfo ? t(`chevening.essayTypes.${typeInfo.enum}`) : "Essay" },
    ],
  });

  const { data, isLoading } = useQuery<EssaysResponse>({
    queryKey: ["essays"],
    queryFn: () => api.get("/api/essays"),
  });

  const essay = data?.essays?.[typeInfo?.enum ?? ""];
  const essayId = essay?.id;

  const { data: essayDetail } = useQuery<{ essay: EssayData }>({
    queryKey: ["essay-detail", essayId],
    queryFn: () => api.get(`/api/essays/${essayId}`),
    enabled: !!essayId,
  });

  useEffect(() => {
    if (essay?.content && !content) {
      setContent(essay.content);
    }
  }, [essay?.content]);

  useEffect(() => {
    if (essayId) {
      essayIdRef.current = essayId;
    }
  }, [essayId]);

  const saveMutation = useMutation<SaveResponse, Error, { type: string; content: string }>({
    mutationFn: (data) => api.post("/api/essays", data),
    onSuccess: (result) => {
      essayIdRef.current = result.essay.id;
      setLastSaved(new Date());
      queryClient.invalidateQueries({ queryKey: ["essays"] });
    },
  });

  const analyzeMutation = useMutation<AnalyzeResponse, Error, string>({
    mutationFn: (id) => api.post(`/api/essays/${id}/analyze`, { language: locale }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["essays"] });
      queryClient.invalidateQueries({ queryKey: ["essay-detail"] });
      queryClient.invalidateQueries({ queryKey: ["credits"] });
      setAnalyzing(false);
      router.push(`/chevening/essay/${type}/feedback`);
    },
    onError: (error) => {
      setAnalyzing(false);
      toast({
        title: t("editor.errorAnalysis"),
        description: error.message || t("editor.somethingWrong"),
        variant: "destructive",
      });
    },
  });

  const handleSave = useCallback(() => {
    if (!typeInfo) return;
    saveMutation.mutate({ type: typeInfo.enum, content });
  }, [content, typeInfo]);

  useEffect(() => {
    if (!typeInfo || !content) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveMutation.mutate({ type: typeInfo.enum, content });
    }, 30000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [content, typeInfo]);

  const handleAnalyze = useCallback(async () => {
    setConfirmOpen(false);
    setAnalyzing(true);
    setAnalysisStep(0);

    try {
      await saveMutation.mutateAsync({ type: typeInfo.enum, content });
    } catch {
      setAnalyzing(false);
      toast({
        title: t("editor.errorSaving"),
        description: t("editor.couldNotSave"),
        variant: "destructive",
      });
      return;
    }
    const id = essayIdRef.current;
    if (!id) {
      setAnalyzing(false);
      toast({
        title: t("common.error"),
        description: t("editor.essayNotFound"),
        variant: "destructive",
      });
      return;
    }

    const stepInterval = setInterval(() => {
      setAnalysisStep((prev) => {
        if (prev < analysisSteps.length - 1) return prev + 1;
        return prev;
      });
    }, 3000);

    try {
      await analyzeMutation.mutateAsync(id);
    } finally {
      clearInterval(stepInterval);
    }
  }, [content, typeInfo]);

  const wordCount = countWords(content);
  const wordCountColor =
    wordCount > 300 || (wordCount > 0 && wordCount < 100)
      ? "text-red-500"
      : wordCount >= 250 && wordCount <= 300
        ? "text-green-500"
        : "text-yellow-500";

  const canAnalyze =
    wordCount >= 100 && wordCount <= 300 && (credits?.creditsRemaining ?? 0) >= 10;

  const latestAnalysis = essayDetail?.essay?.analyses?.[0];
  const feedback = latestAnalysis?.feedback as {
    comentario_final?: { top_3_prioridades?: string[] };
  } | undefined;
  const versions = essayDetail?.essay?.versions;

  if (!typeInfo) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">{t("editor.invalidType")}</p>
        <Button variant="secondary" className="mt-4" onClick={() => router.push("/chevening")}>
          {t("common.back")}
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (analyzing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="space-y-4 text-center">
          {analysisSteps.map((step, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 transition-opacity duration-500",
                i <= analysisStep ? "opacity-100" : "opacity-30"
              )}
            >
              {i < analysisStep ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : i === analysisStep ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <div className="h-5 w-5 rounded-full border border-muted-foreground/30" />
              )}
              <span className="text-sm">{step}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t("editor.analysisTime")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/chevening")}>
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <Textarea
                placeholder={t(`editor.placeholders.${type === "course-choices" ? "courseChoices" : type === "career-plan" ? "careerPlan" : type}`)}
                className="min-h-[400px] resize-y text-base leading-relaxed"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <div className="flex items-center justify-between mt-3">
                <div className={cn("text-sm font-medium", wordCountColor)}>
                  {wordCount}/300 {t("common.words")}
                  {wordCount > 300 && ` (${t("chevening.exceedsLimit")})`}
                  {wordCount > 0 && wordCount < 100 && ` (${t("chevening.minimum")})`}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {lastSaved && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {t("common.savedAt")} {lastSaved.toLocaleTimeString()}
                    </span>
                  )}
                  {saveMutation.isPending && (
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {t("common.saving")}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              <Save className="h-4 w-4" />
              {t("editor.saveDraft")}
            </Button>

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <DialogTrigger asChild>
                <Button disabled={!canAnalyze}>
                  <Sparkles className="h-4 w-4" />
                  {t("editor.analyzeEssay", { credits: 10 })}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("editor.confirmAnalysis")}</DialogTitle>
                  <DialogDescription>
                    {t("editor.analysisDescription")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t("editor.analysisCost")}</span>
                    <Badge>10 {t("common.credits")}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t("editor.currentBalance")}</span>
                    <span className="flex items-center gap-1 font-medium">
                      <Coins className="h-4 w-4 text-yellow-500" />
                      {credits?.creditsRemaining ?? 0} {t("common.credits")}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t("editor.balanceAfter")}</span>
                    <span className="font-medium">
                      {(credits?.creditsRemaining ?? 0) - 10} {t("common.credits")}
                    </span>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
                    {t("common.cancel")}
                  </Button>
                  <Button onClick={handleAnalyze}>
                    <Sparkles className="h-4 w-4" />
                    {t("editor.confirmAnalysis")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {wordCount > 0 && wordCount < 100 && (
              <p className="text-xs text-red-500">{t("chevening.minWords")}</p>
            )}
            {wordCount > 300 && (
              <p className="text-xs text-red-500">{t("chevening.maxWordsExceeded", { max: 300 })}</p>
            )}
            {(credits?.creditsRemaining ?? 0) < 10 && wordCount >= 100 && wordCount <= 300 && (
              <p className="text-xs text-red-500">{t("editor.insufficientCredits")}</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {latestAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("editor.lastAnalysis")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700",
                        latestAnalysis.score >= 7 ? "bg-emerald-500" : latestAnalysis.score >= 5 ? "bg-amber-400" : "bg-red-400"
                      )}
                      style={{ width: `${latestAnalysis.score * 10}%` }}
                    />
                  </div>
                  <div className="flex items-baseline gap-0.5 shrink-0">
                    <span className={cn(
                      "text-xl font-bold tabular-nums",
                      latestAnalysis.score >= 7 ? "text-emerald-600" : latestAnalysis.score >= 5 ? "text-amber-600" : "text-red-500"
                    )}>
                      {latestAnalysis.score.toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground">/10</span>
                  </div>
                </div>
                <Separator />
                {feedback?.comentario_final?.top_3_prioridades && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">{t("editor.top3Priorities")}</p>
                    <ol className="space-y-1">
                      {feedback.comentario_final.top_3_prioridades.map((p: string, i: number) => (
                        <li key={i} className="text-xs flex items-start gap-2">
                          <span className="font-bold text-primary">{i + 1}.</span>
                          {p}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                <Link href={`/chevening/essay/${type}/feedback`}>
                  <Button variant="secondary" size="sm" className="w-full mt-2">
                    <Eye className="h-4 w-4" />
                    {t("editor.viewFullFeedback")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {versions && versions.length > 0 && (
            <Card>
              <CardHeader>
                <button
                  className="flex items-center justify-between w-full text-left"
                  onClick={() => setShowVersions(!showVersions)}
                >
                  <CardTitle className="text-sm">{t("editor.versionHistory")}</CardTitle>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      showVersions && "rotate-180"
                    )}
                  />
                </button>
              </CardHeader>
              {showVersions && (
                <CardContent className="space-y-2">
                  {versions.map((v) => (
                    <button
                      key={v.id}
                      className="w-full flex items-center justify-between p-2 rounded-lg text-left text-xs hover:bg-accent transition-colors"
                      onClick={() => {
                        setContent(v.content);
                        toast({
                          title: t("editor.versionLoaded"),
                          description: t("editor.versionRestored", { version: v.version }),
                        });
                      }}
                    >
                      <span>{t("common.version")} {v.version}</span>
                      <span className="text-muted-foreground">
                        {v.wordCount} {t("common.words")}
                      </span>
                    </button>
                  ))}
                </CardContent>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

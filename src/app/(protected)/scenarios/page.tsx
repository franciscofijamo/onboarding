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
} from "lucide-react";
import { cn } from "@/lib/utils";
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

interface SessionData {
  id: string;
  name: string;
  jobApplicationId: string | null;
  jobApplication: JobApplicationInfo | null;
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
  "Analysing job description...",
  "Reviewing your CV and profile...",
  "Crafting behavioural questions...",
  "Generating situational scenarios...",
  "Finalising interview session...",
];

function getStatusBadge(session: SessionData) {
  if (session.analyzedCount === session.totalQuestions && session.totalQuestions > 0) {
    return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Completed</Badge>;
  }
  if (session.answeredCount > 0) {
    return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">In Progress</Badge>;
  }
  return <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">New</Badge>;
}

function ScenariosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { locale } = useLanguage();
  const { credits, isLoading: creditsLoading } = useCredits();

  const jobApplicationId = searchParams.get("jobApplicationId");

  const [confirmJobId, setConfirmJobId] = useState<string | null>(
    jobApplicationId ?? null
  );
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);

  useSetPageMetadata({
    title: "Interview Practice",
    description: "All your interview practice sessions, organised by job application",
    breadcrumbs: [{ label: "Interview Practice" }],
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
        title: "Interview session created!",
        description: "5 personalised interview questions are ready.",
      });
      router.push(`/scenarios/${data.session.id}`);
    },
    onError: (error: Error) => {
      setGenerating(false);
      toast({
        title: "Error generating questions",
        description: error.message || "Please try again.",
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

  const hasCredits = (credits?.creditsRemaining ?? 0) >= 15;

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

  const groupEntries = Object.entries(grouped).sort(([, a], [, b]) => {
    const aLatest = new Date(a.sessions[0]?.createdAt ?? 0).getTime();
    const bLatest = new Date(b.sessions[0]?.createdAt ?? 0).getTime();
    return bLatest - aLatest;
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
              <span className="text-sm">{step}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">This may take up to 60 seconds...</p>
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
            <DialogTitle>Generate Interview Session</DialogTitle>
            <DialogDescription>
              5 AI-generated questions tailored to this job application. 15 credits will be deducted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {confirmJob && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Job:</span>
                <span className="font-medium">
                  {confirmJob.jobTitle || "Untitled"} @ {confirmJob.companyName || "Company"}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Cost:</span>
              <Badge>15 credits</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Balance:</span>
              <span className="flex items-center gap-1 font-medium">
                <Coins className="h-4 w-4 text-yellow-500" />
                {credits?.creditsRemaining ?? 0}
              </span>
            </div>
            {!hasCredits && !creditsLoading && (
              <p className="text-sm text-red-500 flex items-center gap-1 pt-1">
                <AlertCircle className="h-4 w-4" />
                Insufficient credits. Please purchase more.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmJobId(null)}>
              Cancel
            </Button>
            <Button
              disabled={!hasCredits || creditsLoading}
              onClick={() => confirmJobId && handleGenerate(confirmJobId)}
            >
              <Sparkles className="h-4 w-4" />
              Confirm
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
              <span className="text-sm text-muted-foreground">Total Sessions</span>
            </div>
            <p className="text-2xl font-bold">{stats?.totalSessions ?? 0}</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Target className="h-4 w-4 text-emerald-700" />
              </div>
              <span className="text-sm text-muted-foreground">Questions Analysed</span>
            </div>
            <p className="text-2xl font-bold">{stats?.totalAnalyzed ?? 0}</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-xl bg-blue-100 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-blue-700" />
              </div>
              <span className="text-sm text-muted-foreground">Average Score</span>
            </div>
            <p className="text-2xl font-bold">
              {stats?.averageScore != null ? `${stats.averageScore}/10` : "—"}
            </p>
          </div>
        </div>

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
        ) : groupEntries.length === 0 ? (
          <div className="text-center py-20">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Mic className="h-10 w-10 text-primary/60" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No interview sessions yet</h2>
            <p className="text-muted-foreground max-w-sm mx-auto mb-8">
              Open a job application and click <strong>Practice Interview</strong> to generate your first session.
            </p>
            <Button asChild size="lg" className="rounded-2xl">
              <Link href="/applications">
                <Briefcase className="h-4 w-4 mr-2" />
                Go to Applications
              </Link>
            </Button>
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
                          {job?.jobTitle || "Untitled Role"}
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
                        New Session
                      </Button>
                    )}
                  </div>

                  {/* Sessions */}
                  <div className="space-y-2">
                    {group.sessions.map((session) => (
                      <div
                        key={session.id}
                        className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4"
                      >
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Mic className="h-4 w-4 text-primary" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <h4 className="font-medium text-sm truncate min-w-0">{session.name}</h4>
                            <div className="flex items-center gap-2 shrink-0">
                              {getStatusBadge(session)}
                              {session.averageScore != null && (
                                <Badge variant="outline" className="text-xs">
                                  {session.averageScore}/10
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CircleDot className="h-3 w-3" />
                              {session.answeredCount}/{session.totalQuestions} answered
                            </span>
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              {session.analyzedCount}/{session.totalQuestions} analysed
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(session.createdAt).toLocaleDateString()}
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
                            ? "View"
                            : "Continue"}
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

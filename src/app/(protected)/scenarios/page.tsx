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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Mic,
  Clock,
  Target,
  TrendingUp,
  MoreVertical,
  Play,
  Trash2,
  Loader2,
  CheckCircle2,
  Coins,
  CircleDot,
  AlertCircle,
  Briefcase,
  ArrowLeft,
  Building2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

interface JobApplicationDetail {
  id: string;
  jobTitle: string | null;
  companyName: string | null;
  status: string;
  jobDescription: string;
}

interface JobApplicationResponse {
  jobApplication: JobApplicationDetail;
}

const GENERATION_STEPS = [
  "Analysing job description...",
  "Reviewing your CV and profile...",
  "Crafting behavioural questions...",
  "Generating situational scenarios...",
  "Finalising interview session...",
];

function ScenariosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { t, locale } = useLanguage();
  const { credits, isLoading: creditsLoading } = useCredits();

  const jobApplicationId = searchParams.get("jobApplicationId");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState<string | null>(null);

  useSetPageMetadata({
    title: "Interview Practice",
    description: "Practice interview questions tailored to your job applications",
    breadcrumbs: [
      { label: "Interview Practice" },
    ],
  });

  const { data, isLoading } = useQuery<SessionsResponse>({
    queryKey: ["scenario-sessions", jobApplicationId],
    queryFn: () => {
      const url = jobApplicationId
        ? `/api/scenarios/sessions?jobApplicationId=${jobApplicationId}`
        : `/api/scenarios/sessions`;
      return api.get(url);
    },
  });

  const { data: jobAppData, isLoading: jobAppLoading } = useQuery<JobApplicationResponse>({
    queryKey: ["job-application", jobApplicationId],
    queryFn: () => api.get(`/api/job-application/${jobApplicationId}`),
    enabled: Boolean(jobApplicationId),
  });

  const jobApp = jobAppData?.jobApplication;

  const generateMutation = useMutation({
    mutationFn: () => api.post("/api/scenarios/sessions", {
      language: locale,
      jobApplicationId,
    }),
    onSuccess: (data: { session: SessionData }) => {
      setGenerating(false);
      setConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["scenario-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["credits"] });
      toast({
        title: "Interview session created!",
        description: "5 personalised interview questions are ready for you to practise.",
      });
      router.push(`/scenarios/${data.session.id}`);
    },
    onError: (error: Error) => {
      setGenerating(false);
      toast({
        title: "Error generating interview questions",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/scenarios/sessions/${id}`),
    onSuccess: () => {
      setDeleteOpen(null);
      queryClient.invalidateQueries({ queryKey: ["scenario-sessions"] });
      toast({ title: "Session removed" });
    },
  });

  const handleGenerate = () => {
    setConfirmOpen(false);
    setGenerating(true);
    setGenerationStep(0);

    const stepInterval = setInterval(() => {
      setGenerationStep((prev) => {
        if (prev < GENERATION_STEPS.length - 1) return prev + 1;
        return prev;
      });
    }, 8000);

    generateMutation.mutate(undefined, {
      onSettled: () => clearInterval(stepInterval),
    });
  };

  const hasCredits = (credits?.creditsRemaining ?? 0) >= 15;

  if (!jobApplicationId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <Briefcase className="h-10 w-10 text-primary/60" />
        </div>
        <h2 className="text-2xl font-semibold mb-3">Select a Job to Practice For</h2>
        <p className="text-muted-foreground max-w-md mb-2">
          Interview practice sessions are tailored to a specific job application. The AI uses the job description and your CV to generate relevant interview questions.
        </p>
        <p className="text-sm text-muted-foreground max-w-md mb-8">
          Go to your Applications, open a job card, and click <strong>Practice Interview</strong>.
        </p>
        <Button asChild size="lg" className="rounded-2xl">
          <Link href="/applications">
            <Briefcase className="h-4 w-4 mr-2" />
            Go to Applications
          </Link>
        </Button>
      </div>
    );
  }

  if (isLoading || jobAppLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3 grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

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

  const sessions = data?.sessions ?? [];
  const stats = data?.stats;

  function getStatusBadge(session: SessionData) {
    if (session.analyzedCount === session.totalQuestions) {
      return <Badge className="bg-green-100 text-green-700 border-green-200">Completed</Badge>;
    }
    if (session.answeredCount > 0) {
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">In Progress</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-700 border-blue-200">New</Badge>;
  }

  return (
    <div className="space-y-6">
      {jobApp && (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-xl border-border/60 shrink-0"
            onClick={() => router.push("/applications")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="bg-card rounded-2xl border border-border px-4 py-3 flex items-center gap-3 flex-1">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Briefcase className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold leading-tight truncate">
                {jobApp.jobTitle || "Untitled Role"}
              </p>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{jobApp.companyName || "Company not defined"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-xl bg-purple-100 flex items-center justify-center">
              <Briefcase className="h-4 w-4 text-purple-700" />
            </div>
            <span className="text-sm text-muted-foreground">Sessions</span>
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

      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl border border-primary/20 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-lg mb-1">Generate Interview Questions</h3>
            <p className="text-sm text-muted-foreground">
              5 AI-generated questions based on the job description and your CV
            </p>
          </div>
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger asChild>
              <Button disabled={!jobApplicationId || !hasCredits || creditsLoading}>
                <Sparkles className="h-4 w-4" />
                Generate (15 credits)
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Interview Session</DialogTitle>
                <DialogDescription>
                  15 credits will be deducted to generate 5 interview questions tailored to this job application.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-4">
                {jobApp && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Job:</span>
                    <span className="text-sm font-medium">
                      {jobApp.jobTitle || "Untitled"} @ {jobApp.companyName || "Company"}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm">Cost:</span>
                  <Badge>15 credits</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Current balance:</span>
                  <span className="flex items-center gap-1 font-medium">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    {credits?.creditsRemaining ?? 0} credits
                  </span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleGenerate}>
                  <Sparkles className="h-4 w-4" />
                  Confirm
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {!hasCredits && !creditsLoading && (
          <p className="text-sm text-red-500 mt-3 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            Insufficient credits. Purchase more to generate interview sessions.
          </p>
        )}
      </div>

      {sessions.length > 0 ? (
        <div className="space-y-3">
          <h3 className="font-semibold">Your Practice Sessions</h3>
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-card rounded-2xl border border-border p-5 flex items-center gap-5"
            >
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Mic className="h-5 w-5 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold">{session.name}</h4>
                  {getStatusBadge(session)}
                  {session.averageScore != null && (
                    <Badge variant="outline" className="text-xs">
                      {session.averageScore}/10
                    </Badge>
                  )}
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

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => router.push(`/scenarios/${session.id}`)}
                >
                  <Play className="h-4 w-4" />
                  {session.analyzedCount === session.totalQuestions ? "View Results" : "Continue"}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-red-500"
                      onClick={() => setDeleteOpen(session.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Mic className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No practice sessions yet</p>
          <p className="text-sm mt-1">Generate your first interview session to start practising.</p>
        </div>
      )}

      <Dialog open={!!deleteOpen} onOpenChange={() => setDeleteOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Session</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Credits will not be refunded.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteOpen(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteOpen && deleteMutation.mutate(deleteOpen)}
              disabled={deleteMutation.isPending}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ScenariosPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3 grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    }>
      <ScenariosContent />
    </Suspense>
  );
}

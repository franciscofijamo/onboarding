"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ResponseData {
  id: string;
  questionIndex: number;
  question: string;
  status: string;
  score: number | null;
  duration: number | null;
}

interface SessionData {
  id: string;
  name: string;
  scenarioType: string | null;
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
  canGenerate: boolean;
}

const SCENARIO_TYPE_LABELS: Record<string, string> = {
  TEAM_MEETING: "Team Meeting",
  CLIENT_CALL: "Client Call",
  PRESENTATION: "Presentation",
  EMAIL_DICTATION: "Email Dictation",
  CONFLICT_RESOLUTION: "Conflict Resolution",
  PERFORMANCE_REVIEW: "Performance Review",
  NEGOTIATION: "Negotiation",
};

const GENERATION_STEPS = [
  "Analyzing your profile...",
  "Selecting scenario types...",
  "Generating workplace situations...",
  "Personalizing for your industry...",
  "Finalizing session...",
];

export default function ScenariosPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t, locale } = useLanguage();
  const { credits, isLoading: creditsLoading } = useCredits();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState<string | null>(null);

  useSetPageMetadata({
    title: t("scenarios.title") || "Workplace Scenarios",
    description: t("scenarios.description") || "Practice real workplace situations through audio",
    breadcrumbs: [
      { label: t("scenarios.title") || "Scenarios" },
    ],
  });

  const { data, isLoading } = useQuery<SessionsResponse>({
    queryKey: ["scenario-sessions"],
    queryFn: () => api.get("/api/scenarios/sessions"),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.post("/api/scenarios/sessions", { language: locale }),
    onSuccess: (data: { session: SessionData }) => {
      setGenerating(false);
      setConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["scenario-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["credits"] });
      toast({
        title: t("scenarios.sessionCreated") || "Session created!",
        description: t("scenarios.sessionCreatedDesc") || "5 workplace scenarios ready for you to practice.",
      });
      router.push(`/scenarios/${data.session.id}`);
    },
    onError: (error: Error) => {
      setGenerating(false);
      toast({
        title: t("scenarios.errorGenerating") || "Error generating scenarios",
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
      toast({ title: t("scenarios.sessionDeleted") || "Session removed" });
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

  const canGenerate = data?.canGenerate ?? false;
  const hasCredits = (credits?.creditsRemaining ?? 0) >= 15;

  if (isLoading) {
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
        <p className="text-xs text-muted-foreground">
          {t("scenarios.generatingWait") || "This may take up to 60 seconds..."}
        </p>
      </div>
    );
  }

  const sessions = data?.sessions ?? [];
  const stats = data?.stats;

  function getStatusBadge(session: SessionData) {
    if (session.analyzedCount === session.totalQuestions) {
      return <Badge className="bg-green-100 text-green-700 border-green-200">{t("scenarios.completed") || "Completed"}</Badge>;
    }
    if (session.answeredCount > 0) {
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">{t("scenarios.inProgress") || "In Progress"}</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-700 border-blue-200">{t("scenarios.new") || "New"}</Badge>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-xl bg-purple-100 flex items-center justify-center">
              <Briefcase className="h-4 w-4 text-purple-700" />
            </div>
            <span className="text-sm text-muted-foreground">{t("scenarios.sessions") || "Sessions"}</span>
          </div>
          <p className="text-2xl font-bold">{stats?.totalSessions ?? 0}</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Target className="h-4 w-4 text-emerald-700" />
            </div>
            <span className="text-sm text-muted-foreground">{t("scenarios.analyzed") || "Responses Analyzed"}</span>
          </div>
          <p className="text-2xl font-bold">{stats?.totalAnalyzed ?? 0}</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-blue-700" />
            </div>
            <span className="text-sm text-muted-foreground">{t("scenarios.avgScore") || "Average Score"}</span>
          </div>
          <p className="text-2xl font-bold">
            {stats?.averageScore != null ? `${stats.averageScore}/10` : "—"}
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl border border-primary/20 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg mb-1">
              {t("scenarios.generateTitle") || "Generate Workplace Scenarios"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("scenarios.generateDesc") || "5 personalized scenarios based on your industry and role"}
            </p>
          </div>
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger asChild>
              <Button disabled={!canGenerate || !hasCredits}>
                <Sparkles className="h-4 w-4" />
                {t("scenarios.generateBtn") || "Generate Scenarios (15 credits)"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("scenarios.confirmTitle") || "Confirm Generation"}</DialogTitle>
                <DialogDescription>
                  {t("scenarios.confirmDesc") || "15 credits will be deducted to generate 5 new workplace scenarios."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t("common.cost") || "Cost"}:</span>
                  <Badge>15 {t("common.credits") || "credits"}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t("common.currentBalance") || "Current balance"}:</span>
                  <span className="flex items-center gap-1 font-medium">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    {credits?.creditsRemaining ?? 0} {t("common.credits") || "credits"}
                  </span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
                  {t("common.cancel") || "Cancel"}
                </Button>
                <Button onClick={handleGenerate}>
                  <Sparkles className="h-4 w-4" />
                  {t("common.confirm") || "Confirm"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {!canGenerate && (
          <p className="text-sm text-red-500 mt-3 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {t("scenarios.needProfile") || "Complete your profile with career information to unlock scenario generation."}
          </p>
        )}
        {canGenerate && !hasCredits && (
          <p className="text-sm text-red-500 mt-3 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {t("scenarios.noCredits") || "Insufficient credits."}
          </p>
        )}
      </div>

      {sessions.length > 0 ? (
        <div className="space-y-3">
          <h3 className="font-semibold">{t("scenarios.yourSessions") || "Your Sessions"}</h3>
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-card rounded-2xl border border-border p-5 flex items-center gap-5"
            >
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Mic className="h-5 w-5 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{session.name}</h4>
                  {getStatusBadge(session)}
                  {session.scenarioType && (
                    <Badge variant="outline" className="text-xs">
                      {SCENARIO_TYPE_LABELS[session.scenarioType] || session.scenarioType}
                    </Badge>
                  )}
                  {session.averageScore != null && (
                    <Badge variant="outline" className="text-xs">
                      {session.averageScore}/10
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CircleDot className="h-3 w-3" />
                    {session.answeredCount}/{session.totalQuestions} {t("scenarios.answered") || "answered"}
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {session.analyzedCount}/{session.totalQuestions} {t("scenarios.analyzedLabel") || "analyzed"}
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
                  {session.analyzedCount === session.totalQuestions
                    ? (t("scenarios.viewResults") || "View Results")
                    : (t("scenarios.continue") || "Continue")}
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
                      {t("common.remove") || "Remove"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>{t("scenarios.noSessions") || "No sessions created yet."}</p>
          <p className="text-sm">{t("scenarios.noSessionsDesc") || "Generate your first scenarios to start practicing workplace communication."}</p>
        </div>
      )}

      <Dialog open={!!deleteOpen} onOpenChange={() => setDeleteOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("scenarios.deleteTitle") || "Remove Session"}</DialogTitle>
            <DialogDescription>
              {t("scenarios.deleteDesc") || "This action cannot be undone. Credits will not be refunded."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteOpen(null)}>
              {t("common.cancel") || "Cancel"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteOpen && deleteMutation.mutate(deleteOpen)}
              disabled={deleteMutation.isPending}
            >
              {t("common.remove") || "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

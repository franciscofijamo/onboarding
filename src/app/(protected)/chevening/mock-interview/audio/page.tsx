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
  ArrowLeft,
  CircleDot,
  AlertCircle,
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
  essaysAnalyzed: number;
}

const GENERATION_STEPS = [
  "Analisando os 4 essays...",
  "Identificando pontos-chave...",
  "Gerando perguntas de entrevista...",
  "Adaptando perguntas ao perfil...",
  "Finalizando sessão...",
];

export default function AudioMockInterviewPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t, locale } = useLanguage();
  const { credits, isLoading: creditsLoading } = useCredits();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState<string | null>(null);

  useSetPageMetadata({
    title: t("audioMock.title") || "Entrevista em Áudio",
    description: t("audioMock.description") || "Pratique suas respostas de entrevista em áudio",
    breadcrumbs: [
      { label: "Chevening", href: "/chevening" },
      { label: "Mock Interview", href: "/chevening/mock-interview" },
      { label: t("audioMock.title") || "Entrevista em Áudio" },
    ],
  });

  const { data, isLoading } = useQuery<SessionsResponse>({
    queryKey: ["audio-mock-sessions"],
    queryFn: () => api.get("/api/chevening/audio-mock/sessions"),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.post("/api/chevening/audio-mock/sessions", { language: locale }),
    onSuccess: (data: { session: SessionData }) => {
      setGenerating(false);
      setConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["audio-mock-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["credits"] });
      toast({
        title: t("audioMock.sessionCreated") || "Sessão criada!",
        description: t("audioMock.sessionCreatedDesc") || "5 perguntas prontas para você responder em áudio.",
      });
      router.push(`/chevening/mock-interview/audio/${data.session.id}`);
    },
    onError: (error: Error) => {
      setGenerating(false);
      toast({
        title: t("audioMock.errorGenerating") || "Erro ao gerar perguntas",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/chevening/audio-mock/sessions/${id}`),
    onSuccess: () => {
      setDeleteOpen(null);
      queryClient.invalidateQueries({ queryKey: ["audio-mock-sessions"] });
      toast({ title: t("audioMock.sessionDeleted") || "Sessão removida" });
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
          {t("audioMock.generatingWait") || "Isto pode demorar até 60 segundos..."}
        </p>
      </div>
    );
  }

  const sessions = data?.sessions ?? [];
  const stats = data?.stats;

  function getStatusBadge(session: SessionData) {
    if (session.analyzedCount === session.totalQuestions) {
      return <Badge className="bg-green-100 text-green-700 border-green-200">{t("audioMock.completed") || "Completa"}</Badge>;
    }
    if (session.answeredCount > 0) {
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">{t("audioMock.inProgress") || "Em progresso"}</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-700 border-blue-200">{t("audioMock.new") || "Nova"}</Badge>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/chevening/mock-interview")}>
          <ArrowLeft className="h-4 w-4" />
          {t("common.back") || "Voltar"}
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-xl bg-purple-100 flex items-center justify-center">
              <Mic className="h-4 w-4 text-purple-700" />
            </div>
            <span className="text-sm text-muted-foreground">{t("audioMock.sessions") || "Sessões"}</span>
          </div>
          <p className="text-2xl font-bold">{stats?.totalSessions ?? 0}</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Target className="h-4 w-4 text-emerald-700" />
            </div>
            <span className="text-sm text-muted-foreground">{t("audioMock.analyzed") || "Respostas Analisadas"}</span>
          </div>
          <p className="text-2xl font-bold">{stats?.totalAnalyzed ?? 0}</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-blue-700" />
            </div>
            <span className="text-sm text-muted-foreground">{t("audioMock.avgScore") || "Nota Média"}</span>
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
              {t("audioMock.generateTitle") || "Gerar Perguntas de Entrevista"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("audioMock.generateDesc") || "5 perguntas personalizadas baseadas nos seus 4 essays analisados"}
            </p>
          </div>
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger asChild>
              <Button disabled={!canGenerate || !hasCredits}>
                <Sparkles className="h-4 w-4" />
                {t("audioMock.generateBtn") || "Gerar Perguntas (15 créditos)"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("audioMock.confirmTitle") || "Confirmar Geração"}</DialogTitle>
                <DialogDescription>
                  {t("audioMock.confirmDesc") || "15 créditos serão deduzidos para gerar 5 novas perguntas de entrevista."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t("common.cost") || "Custo"}:</span>
                  <Badge>15 {t("common.credits") || "créditos"}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t("common.currentBalance") || "Saldo atual"}:</span>
                  <span className="flex items-center gap-1 font-medium">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    {credits?.creditsRemaining ?? 0} {t("common.credits") || "créditos"}
                  </span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
                  {t("common.cancel") || "Cancelar"}
                </Button>
                <Button onClick={handleGenerate}>
                  <Sparkles className="h-4 w-4" />
                  {t("common.confirm") || "Confirmar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {!canGenerate && (
          <p className="text-sm text-red-500 mt-3 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {t("audioMock.needEssays") || `Complete a análise dos 4 essays para desbloquear. (${data?.essaysAnalyzed ?? 0}/4 analisados)`}
          </p>
        )}
        {canGenerate && !hasCredits && (
          <p className="text-sm text-red-500 mt-3 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {t("audioMock.noCredits") || "Créditos insuficientes."}
          </p>
        )}
      </div>

      {sessions.length > 0 ? (
        <div className="space-y-3">
          <h3 className="font-semibold">{t("audioMock.yourSessions") || "Suas Sessões"}</h3>
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
                  {session.averageScore != null && (
                    <Badge variant="outline" className="text-xs">
                      {session.averageScore}/10
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CircleDot className="h-3 w-3" />
                    {session.answeredCount}/{session.totalQuestions} {t("audioMock.answered") || "respondidas"}
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {session.analyzedCount}/{session.totalQuestions} {t("audioMock.analyzedLabel") || "analisadas"}
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
                  onClick={() => router.push(`/chevening/mock-interview/audio/${session.id}`)}
                >
                  <Play className="h-4 w-4" />
                  {session.analyzedCount === session.totalQuestions
                    ? (t("audioMock.viewResults") || "Ver Resultados")
                    : (t("audioMock.continue") || "Continuar")}
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
                      {t("common.remove") || "Remover"}
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
          <p>{t("audioMock.noSessions") || "Nenhuma sessão criada ainda."}</p>
          <p className="text-sm">{t("audioMock.noSessionsDesc") || "Gere suas primeiras perguntas para começar a praticar."}</p>
        </div>
      )}

      <Dialog open={!!deleteOpen} onOpenChange={() => setDeleteOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("audioMock.deleteTitle") || "Remover Sessão"}</DialogTitle>
            <DialogDescription>
              {t("audioMock.deleteDesc") || "Esta ação não pode ser desfeita. Créditos não serão reembolsados."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteOpen(null)}>
              {t("common.cancel") || "Cancelar"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteOpen && deleteMutation.mutate(deleteOpen)}
              disabled={deleteMutation.isPending}
            >
              {t("common.remove") || "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

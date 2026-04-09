"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Briefcase,
  ChevronRight,
  FileText,
  Loader2,
  Sparkles,
  User,
  Plus,
  Pencil,
  RefreshCw,
  CheckCircle2,
  Mic,
  Clock,
  Star,
  BookOpen,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useSetPageMetadata } from "@/contexts/page-metadata";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

// ─── Types ───────────────────────────────────────────────────────────────────

type PipelineStage = "RECEIVED" | "REVIEWING" | "INTERVIEW" | "OFFER" | "REJECTED" | "ACCEPTED";

type AnalysisData = {
  id: string;
  fitScore: number | null;
  summary: string | null;
  skillsMatch: unknown;
  missingSkills: unknown;
  strengths: unknown;
  improvements: unknown;
  recommendations: unknown;
  keywordAnalysis: unknown;
  createdAt: string;
};

type StageHistoryEntry = {
  id: string;
  fromStage: PipelineStage;
  toStage: PipelineStage;
  movedAt: string;
  mover: { id: string; name: string | null };
};

type CandidateUser = {
  id: string;
  name: string | null;
  email: string | null;
  province: string | null;
  experienceLevel: string | null;
  targetRole: string | null;
  currentRole: string | null;
  skills?: string[];
};

type InterviewSession = {
  id: string;
  userId: string;
  averageScore: number | null;
  analyzedCount: number;
  answeredCount: number;
  totalQuestions: number;
  recruitmentStageId: string | null;
};

type PipelineEntry = {
  id: string;
  currentStage: PipelineStage;
  fitScore: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  user: CandidateUser;
  jobApplication: {
    id: string;
    status: string;
    createdAt: string;
    resume: { id: string; title: string | null; fileUrl: string | null } | null;
    coverLetter: { id: string; title: string | null } | null;
    analyses: AnalysisData[];
  };
  stageHistory: StageHistoryEntry[];
  interviewSession?: InterviewSession | null;
};

type StageGroupConfig = {
  stage: string;
  label: string;
  isInterviewStage: boolean;
  stageId: string | null;
  candidates: PipelineEntry[];
};

type InterviewQuestion = {
  id: string;
  prompt: string;
  questionType: string;
  order: number;
  isEdited: boolean;
};

type InterviewStage = {
  id: string;
  name: string;
  questionCount: number;
  focusType: "TECHNICAL" | "BEHAVIORAL" | "MIXED";
  status: "DRAFT" | "PUBLISHED";
  questions: InterviewQuestion[];
  _count?: { sessions: number };
};

type StageConfigItem = { stage: string; label: string; isInterviewStage?: boolean; stageId?: string | null };

type PipelineResponse = {
  stages: StageGroupConfig[];
  pipeline: PipelineEntry[];
  stageConfig: StageConfigItem[];
  interviewStages: InterviewStage[];
};

type CandidateSessionsResponse = {
  sessions: {
    id: string;
    name: string;
    recruitmentStageId: string | null;
    recruitmentStage: { id: string; name: string; focusType: string } | null;
    totalQuestions: number;
    answeredCount: number;
    analyzedCount: number;
    averageScore: number | null;
    responses: {
      id: string;
      questionIndex: number;
      prompt: string;
      status: string;
      score: number | null;
      transcript: string | null;
      feedback: unknown;
      duration: number | null;
    }[];
  }[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<PipelineStage, string> = {
  RECEIVED: "Candidaturas Recebidas",
  REVIEWING: "Em Avaliação",
  INTERVIEW: "Entrevista",
  OFFER: "Oferta",
  REJECTED: "Rejeitado",
  ACCEPTED: "Aceite",
};

const STAGE_COLORS: Record<string, { accent: string; badge: string }> = {
  RECEIVED: {
    accent: "from-blue-500/20 via-blue-500/5 to-transparent",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
  },
  REVIEWING: {
    accent: "from-amber-500/20 via-amber-500/5 to-transparent",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  INTERVIEW: {
    accent: "from-violet-500/20 via-violet-500/5 to-transparent",
    badge: "bg-violet-50 text-violet-700 border-violet-200",
  },
  OFFER: {
    accent: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  REJECTED: {
    accent: "from-red-500/20 via-red-500/5 to-transparent",
    badge: "bg-red-50 text-red-700 border-red-200",
  },
  ACCEPTED: {
    accent: "from-emerald-600/20 via-emerald-600/5 to-transparent",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  INTERVIEW_STAGE: {
    accent: "from-purple-500/20 via-purple-500/5 to-transparent",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
  },
};

const NEXT_STAGE: Partial<Record<PipelineStage, PipelineStage>> = {
  RECEIVED: "REVIEWING",
  REVIEWING: "INTERVIEW",
  INTERVIEW: "OFFER",
  OFFER: "ACCEPTED",
};

// ─── Helper functions ─────────────────────────────────────────────────────────

function toStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string");
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).filter((v) => typeof v === "string") as string[];
  return [];
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-MZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function getFitScoreColor(score: number | null) {
  if (score === null) return "text-muted-foreground";
  if (score >= 70) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-500";
}

function getFitScoreRingColor(score: number | null) {
  if (score === null) return "stroke-muted";
  if (score >= 70) return "stroke-emerald-500";
  if (score >= 50) return "stroke-amber-500";
  return "stroke-red-400";
}

// ─── Analysis Modal ───────────────────────────────────────────────────────────

function AnalysisModal({
  postingId,
  entry,
  onClose,
}: {
  postingId: string;
  entry: PipelineEntry | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery<{ pipelineEntry: PipelineEntry }>({
    queryKey: ["recruiterCandidateAnalysis", postingId, entry?.user.id],
    queryFn: () => api.get(`/api/recruiter/postings/${postingId}/candidates/${entry!.user.id}/analysis`),
    enabled: Boolean(entry),
    staleTime: 30_000,
  });

  if (!entry) return null;

  const fullEntry = data?.pipelineEntry ?? entry;
  const analysis = fullEntry.jobApplication.analyses[0] ?? null;
  const candidate = fullEntry.user;
  const fitScore = fullEntry.fitScore ?? analysis?.fitScore ?? null;

  const skillsMatch = toStringArray(analysis?.skillsMatch);
  const missingSkills = toStringArray(analysis?.missingSkills);
  const strengths = toStringArray(analysis?.strengths);
  const improvements = toStringArray(analysis?.improvements);
  const recommendations = toStringArray(analysis?.recommendations);

  const circumference = 2 * Math.PI * 50;
  const dashOffset = analysis ? circumference * (1 - (fitScore ?? 0) / 100) : circumference;

  return (
    <Dialog open={Boolean(entry)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {candidate.name ?? candidate.email ?? "Candidato"}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && (
          <div className="space-y-6 pb-2">
            <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-2">
              <div className="flex flex-wrap gap-3 text-sm">
                {candidate.email && (
                  <span className="text-muted-foreground">{candidate.email}</span>
                )}
                {candidate.province && (
                  <Badge variant="outline" className="rounded-full text-xs">{candidate.province}</Badge>
                )}
                {candidate.experienceLevel && (
                  <Badge variant="outline" className="rounded-full text-xs">{candidate.experienceLevel}</Badge>
                )}
                {candidate.currentRole && (
                  <span className="text-muted-foreground">{candidate.currentRole}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>Candidatura: {formatDate(fullEntry.jobApplication.createdAt)}</span>
                <span>·</span>
                <span>Fase: <strong className="text-foreground">{STAGE_LABELS[fullEntry.currentStage] ?? fullEntry.currentStage}</strong></span>
              </div>
              {fullEntry.jobApplication.resume?.fileUrl && (
                <a
                  href={fullEntry.jobApplication.resume.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <FileText className="h-3 w-3" />
                  Ver CV
                </a>
              )}
            </div>

            {!analysis && (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
                <Sparkles className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="text-sm font-medium text-muted-foreground">Análise IA ainda não disponível</p>
                <p className="text-xs text-muted-foreground mt-1">
                  A análise é processada em segundo plano após a candidatura.
                </p>
              </div>
            )}

            {analysis && (
              <>
                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                    <div className="relative shrink-0">
                      <svg width="120" height="120" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                        <circle
                          cx="60" cy="60" r="50"
                          fill="none"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={dashOffset}
                          className={cn("transition-all duration-700", getFitScoreRingColor(fitScore))}
                          transform="rotate(-90 60 60)"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={cn("text-2xl font-bold", getFitScoreColor(fitScore))}>
                          {fitScore !== null ? Math.round(fitScore) : "—"}
                        </span>
                        <span className="text-xs text-muted-foreground">/100</span>
                      </div>
                    </div>

                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="font-semibold">Score de Compatibilidade</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {(fitScore ?? 0) >= 70
                            ? "Excelente compatibilidade com a vaga."
                            : (fitScore ?? 0) >= 50
                            ? "Compatibilidade razoável — vale a pena entrevistar."
                            : "Compatibilidade baixa — reveja os gaps antes de avançar."}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-xl bg-emerald-50 p-3">
                          <div className="text-lg font-bold text-emerald-600">{skillsMatch.length}</div>
                          <div className="text-xs text-muted-foreground">Skills alinhadas</div>
                        </div>
                        <div className="rounded-xl bg-orange-50 p-3">
                          <div className="text-lg font-bold text-orange-500">{missingSkills.length}</div>
                          <div className="text-xs text-muted-foreground">Gaps</div>
                        </div>
                        <div className="rounded-xl bg-primary/5 p-3">
                          <div className="text-lg font-bold text-primary/70">{recommendations.length}</div>
                          <div className="text-xs text-muted-foreground">Recomendações</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {analysis.summary && (
                    <p className="mt-4 text-sm text-muted-foreground border-t border-border pt-4">
                      {analysis.summary}
                    </p>
                  )}
                </div>

                {(skillsMatch.length > 0 || missingSkills.length > 0) && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {skillsMatch.length > 0 && (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                        <h4 className="text-sm font-semibold text-emerald-700 mb-3">Skills Compatíveis</h4>
                        <div className="flex flex-wrap gap-2">
                          {skillsMatch.map((skill, i) => (
                            <Badge key={i} variant="outline" className="rounded-full text-xs bg-emerald-100 text-emerald-700 border-emerald-200">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {missingSkills.length > 0 && (
                      <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-4">
                        <h4 className="text-sm font-semibold text-orange-700 mb-3">Gaps Identificados</h4>
                        <div className="flex flex-wrap gap-2">
                          {missingSkills.map((skill, i) => (
                            <Badge key={i} variant="outline" className="rounded-full text-xs bg-orange-100 text-orange-700 border-orange-200">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {strengths.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <h4 className="text-sm font-semibold mb-3">Pontos Fortes</h4>
                    <ul className="space-y-2">
                      {strengths.map((s, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">✓</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {improvements.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <h4 className="text-sm font-semibold mb-3">Áreas de Melhoria</h4>
                    <ul className="space-y-2">
                      {improvements.map((s, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">!</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {recommendations.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <h4 className="text-sm font-semibold mb-3">Recomendações</h4>
                    <ul className="space-y-2">
                      {recommendations.map((s, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{i + 1}</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {fullEntry.stageHistory.length > 0 && (
              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <h4 className="text-sm font-semibold mb-3">Histórico de Fases</h4>
                <div className="space-y-2">
                  {fullEntry.stageHistory.map((h) => (
                    <div key={h.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{STAGE_LABELS[h.fromStage] ?? h.fromStage}</span>
                      <ChevronRight className="h-3 w-3 shrink-0" />
                      <span className="font-medium text-foreground">{STAGE_LABELS[h.toStage] ?? h.toStage}</span>
                      <span className="ml-auto">{formatDate(h.movedAt)}</span>
                      {h.mover.name && <span>por {h.mover.name}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Interview Sessions Modal ─────────────────────────────────────────────────

function InterviewSessionsModal({
  postingId,
  entry,
  onClose,
}: {
  postingId: string;
  entry: PipelineEntry | null;
  onClose: () => void;
}) {
  const [expandedSession, setExpandedSession] = React.useState<string | null>(null);

  const { data, isLoading } = useQuery<CandidateSessionsResponse>({
    queryKey: ["recruiterCandidateSessions", postingId, entry?.user.id],
    queryFn: () => api.get(`/api/recruiter/postings/${postingId}/candidates/${entry!.user.id}/sessions`),
    enabled: Boolean(entry),
    staleTime: 10_000,
  });

  if (!entry) return null;

  const sessions = data?.sessions ?? [];

  function getSessionStatusLabel(session: CandidateSessionsResponse["sessions"][0]) {
    if (session.analyzedCount === session.totalQuestions && session.totalQuestions > 0) return "Concluído";
    if (session.answeredCount > 0) return "Em progresso";
    return "Pendente";
  }

  function getSessionStatusColor(session: CandidateSessionsResponse["sessions"][0]) {
    if (session.analyzedCount === session.totalQuestions && session.totalQuestions > 0) return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (session.answeredCount > 0) return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-blue-100 text-blue-700 border-blue-200";
  }

  function getResponseStatusIcon(status: string) {
    if (status === "ANALYZED") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    if (status === "ANALYZED" || status === "RECORDED") return <Mic className="h-3.5 w-3.5 text-amber-500" />;
    return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
  }

  return (
    <Dialog open={Boolean(entry)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-purple-600" />
            Sessões de Entrevista — {entry.user.name ?? entry.user.email ?? "Candidato"}
          </DialogTitle>
          <DialogDescription>
            Respostas de áudio do candidato às perguntas das fases de entrevista.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && sessions.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
            <Mic className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm font-medium text-muted-foreground">Sem sessões de entrevista</p>
            <p className="text-xs text-muted-foreground mt-1">
              O candidato ainda não foi movido para uma fase de entrevista publicada.
            </p>
          </div>
        )}

        {!isLoading && sessions.length > 0 && (
          <div className="space-y-4 pb-2">
            {sessions.map((session) => (
              <div key={session.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                <button
                  className="w-full p-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                      <Mic className="h-4 w-4 text-purple-700" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="font-medium text-sm truncate">{session.recruitmentStage?.name ?? session.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className={cn("text-xs", getSessionStatusColor(session))}>
                          {getSessionStatusLabel(session)}
                        </Badge>
                        {session.averageScore !== null && (
                          <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                            <Star className="h-3 w-3" />
                            {session.averageScore}/10
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {session.answeredCount}/{session.totalQuestions} respondidas
                        </span>
                      </div>
                    </div>
                  </div>
                  {expandedSession === session.id
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  }
                </button>

                {expandedSession === session.id && (
                  <div className="border-t border-border">
                    {session.responses.map((resp) => (
                      <div key={resp.id} className="p-4 border-b border-border/50 last:border-0">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">{getResponseStatusIcon(resp.status)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Pergunta {resp.questionIndex + 1} · {resp.status === "ANALYZED" ? "Analisada" : resp.status === "RECORDED" ? "Gravada" : "Pendente"}
                              {resp.score !== null && (
                                <span className="ml-2 text-amber-600 font-bold">{resp.score}/10</span>
                              )}
                            </p>
                            <p className="text-sm text-foreground leading-snug mb-2">{resp.prompt}</p>
                            {resp.transcript && (
                              <div className="rounded-xl bg-muted/40 border border-border p-3 text-xs text-muted-foreground">
                                <p className="font-medium text-foreground mb-1">Transcrição:</p>
                                <p className="line-clamp-4">{resp.transcript}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Interview Stage Modal ────────────────────────────────────────────────────

function InterviewStageModal({
  postingId,
  open,
  onClose,
}: {
  postingId: string;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [step, setStep] = React.useState<"config" | "questions" | "done">("config");
  const [stageName, setStageName] = React.useState("");
  const [questionCount, setQuestionCount] = React.useState<5 | 10>(5);
  const [focusType, setFocusType] = React.useState<"TECHNICAL" | "BEHAVIORAL" | "MIXED">("MIXED");
  const [stageId, setStageId] = React.useState<string | null>(null);
  const [questions, setQuestions] = React.useState<InterviewQuestion[]>([]);
  const [generating, setGenerating] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);

  function reset() {
    setStep("config");
    setStageName("");
    setQuestionCount(5);
    setFocusType("MIXED");
    setStageId(null);
    setQuestions([]);
    setGenerating(false);
    setPublishing(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleCreateAndGenerate() {
    if (!stageName.trim()) return;
    setGenerating(true);
    try {
      const createRes = await api.post(`/api/recruiter/postings/${postingId}/stages`, {
        name: stageName.trim(),
        questionCount,
        focusType,
      }) as { stage: InterviewStage };
      const newStageId = createRes.stage.id;
      setStageId(newStageId);

      const genRes = await api.post(
        `/api/recruiter/postings/${postingId}/stages/${newStageId}/generate`, {}
      ) as { stage: InterviewStage };
      setQuestions(genRes.stage.questions ?? []);
      setStep("questions");
    } catch (err) {
      toast({
        title: "Erro ao gerar perguntas",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  }

  async function handleRegenerate() {
    if (!stageId) return;
    setGenerating(true);
    try {
      const genRes = await api.post(
        `/api/recruiter/postings/${postingId}/stages/${stageId}/generate`, {}
      ) as { stage: InterviewStage };
      setQuestions(genRes.stage.questions ?? []);
      toast({ title: "Perguntas regeneradas!" });
    } catch (err) {
      toast({
        title: "Erro ao regenerar",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  }

  async function handleEditQuestion(questionId: string, newPrompt: string) {
    if (!stageId) return;
    try {
      const res = await api.put(`/api/recruiter/stages/${stageId}/questions/${questionId}`, {
        prompt: newPrompt,
      }) as { question: InterviewQuestion };
      setQuestions(prev => prev.map(q => q.id === questionId ? res.question : q));
    } catch (err) {
      toast({
        title: "Erro ao guardar pergunta",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  }

  async function handlePublish() {
    if (!stageId) return;
    setPublishing(true);
    try {
      await api.post(`/api/recruiter/stages/${stageId}/publish`, {});
      toast({
        title: "Fase publicada!",
        description: "A nova coluna de entrevista aparece agora no kanban.",
      });
      queryClient.invalidateQueries({ queryKey: ["recruiterPipeline", postingId] });
      setStep("done");
      setTimeout(() => handleClose(), 1500);
    } catch (err) {
      toast({
        title: "Erro ao publicar",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setPublishing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-purple-600" />
            {step === "config" ? "Nova Fase de Entrevista" : step === "questions" ? "Rever Perguntas" : "Fase Publicada!"}
          </DialogTitle>
          {step === "config" && (
            <DialogDescription>
              Configure a fase de entrevista. A IA irá gerar perguntas baseadas na descrição da vaga.
            </DialogDescription>
          )}
        </DialogHeader>

        {step === "config" && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="stageName">Nome da fase</Label>
              <Input
                id="stageName"
                placeholder="ex. Entrevista Técnica, Entrevista RH..."
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número de perguntas</Label>
                <Select
                  value={String(questionCount)}
                  onValueChange={(v) => setQuestionCount(Number(v) as 5 | 10)}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 perguntas</SelectItem>
                    <SelectItem value="10">10 perguntas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Foco da entrevista</Label>
                <Select value={focusType} onValueChange={(v) => setFocusType(v as typeof focusType)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MIXED">Misto</SelectItem>
                    <SelectItem value="TECHNICAL">Técnico</SelectItem>
                    <SelectItem value="BEHAVIORAL">Comportamental</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button
                onClick={handleCreateAndGenerate}
                disabled={!stageName.trim() || generating}
              >
                {generating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> A gerar perguntas...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Gerar perguntas</>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "questions" && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {questions.length} perguntas geradas. Edite conforme necessário antes de publicar.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={generating}
                className="rounded-xl gap-1"
              >
                {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Regenerar
              </Button>
            </div>

            <div className="space-y-3">
              {questions.map((q, i) => (
                <EditableQuestion
                  key={q.id}
                  index={i}
                  question={q}
                  onSave={(newPrompt) => handleEditQuestion(q.id, newPrompt)}
                />
              ))}
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setStep("config")}>Voltar</Button>
              <Button onClick={handlePublish} disabled={publishing || questions.length === 0}>
                {publishing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> A publicar...</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4" /> Publicar fase</>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "done" && (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <p className="font-semibold">Fase publicada com sucesso!</p>
            <p className="text-sm text-muted-foreground">
              A nova coluna aparece no kanban. Mova candidatos para lá para enviar as perguntas.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditableQuestion({
  index,
  question,
  onSave,
}: {
  index: number;
  question: InterviewQuestion;
  onSave: (newPrompt: string) => Promise<void>;
}) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(question.prompt);
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    if (value.trim() === question.prompt) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(value.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-lg bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0">
            {index + 1}
          </span>
          <Badge variant="outline" className="text-xs rounded-full">
            {question.questionType}
          </Badge>
          {question.isEdited && (
            <Badge variant="outline" className="text-xs rounded-full bg-amber-50 text-amber-700 border-amber-200">
              Editada
            </Badge>
          )}
        </div>
        {!editing && (
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl h-7 px-2"
            onClick={() => { setValue(question.prompt); setEditing(true); }}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="min-h-[80px] text-sm rounded-xl resize-none"
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => { setValue(question.prompt); setEditing(false); }}
            >
              <X className="h-3 w-3" />
              Cancelar
            </Button>
            <Button size="sm" className="rounded-xl" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              Guardar
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-foreground leading-relaxed">{question.prompt}</p>
      )}
    </div>
  );
}

// ─── Candidate Card ───────────────────────────────────────────────────────────

function CandidateCard({
  entry,
  postingId,
  isInterviewStageColumn,
  interviewStageId,
  publishedInterviewStages,
  onViewAnalysis,
  onViewSessions,
  onMove,
  onMoveToInterviewStage,
  isMoving,
}: {
  entry: PipelineEntry;
  postingId: string;
  isInterviewStageColumn: boolean;
  interviewStageId: string | null;
  publishedInterviewStages: InterviewStage[];
  onViewAnalysis: (entry: PipelineEntry) => void;
  onViewSessions: (entry: PipelineEntry) => void;
  onMove: (entryId: string, toStage: PipelineStage) => void;
  onMoveToInterviewStage: (entryId: string, stageId: string) => void;
  isMoving: boolean;
}) {
  const fitScore = entry.fitScore ?? entry.jobApplication.analyses[0]?.fitScore ?? null;
  const nextStage = NEXT_STAGE[entry.currentStage];
  const hasAnalysis = entry.jobApplication.analyses.length > 0;
  const session = entry.interviewSession ?? null;

  return (
    <article className="rounded-2xl border border-border bg-background p-4 space-y-3 transition-colors hover:border-primary/30">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold truncate leading-tight">
            {entry.user.name ?? entry.user.email ?? "Candidato"}
          </p>
          {entry.user.currentRole && (
            <p className="text-xs text-muted-foreground truncate">{entry.user.currentRole}</p>
          )}
        </div>
        {fitScore !== null ? (
          <div className={cn("shrink-0 text-right", getFitScoreColor(fitScore))}>
            <span className="text-xl font-bold">{Math.round(fitScore)}</span>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground shrink-0">Sem score</span>
        )}
      </div>

      <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
        <span>{formatDate(entry.jobApplication.createdAt)}</span>
        {entry.user.province && (
          <>
            <span>·</span>
            <span>{entry.user.province}</span>
          </>
        )}
        {hasAnalysis && (
          <>
            <span>·</span>
            <span className="inline-flex items-center gap-0.5 text-primary">
              <Sparkles className="h-3 w-3" />
              Analisado
            </span>
          </>
        )}
      </div>

      {/* Interview session status (for regular INTERVIEW stage) */}
      {isInterviewStageColumn && session && (
        <div className="rounded-xl bg-purple-50 border border-purple-200 p-3 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-purple-700">Sessão de entrevista</span>
            {session.averageScore !== null && (
              <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
                <Star className="h-3 w-3" />
                {session.averageScore}/10
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-purple-600">
            <Mic className="h-3 w-3" />
            <span>{session.answeredCount}/{session.totalQuestions} respondidas</span>
            <span>·</span>
            <span>{session.analyzedCount} analisadas</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl flex-1 text-xs"
          onClick={() => onViewAnalysis(entry)}
        >
          <BarChart3 className="h-3 w-3" />
          Ver análise
        </Button>

        {isInterviewStageColumn && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl flex-1 text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
            onClick={() => onViewSessions(entry)}
          >
            <Mic className="h-3 w-3" />
            Respostas
          </Button>
        )}

        {/* Move to next default stage */}
        {!isInterviewStageColumn && nextStage && (
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl flex-1 text-xs border-primary/30 text-primary hover:bg-primary/5"
            onClick={() => onMove(entry.id, nextStage)}
            disabled={isMoving}
          >
            {isMoving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                Mover
                <ArrowRight className="h-3 w-3" />
              </>
            )}
          </Button>
        )}

        {/* Move to published interview stages (only shown in REVIEWING stage) */}
        {!isInterviewStageColumn && entry.currentStage === "REVIEWING" && publishedInterviewStages.length > 0 && (
          <div className="w-full flex flex-wrap gap-1 pt-1 border-t border-border/50">
            {publishedInterviewStages.map(stage => (
              <Button
                key={stage.id}
                size="sm"
                variant="outline"
                className="rounded-xl text-xs border-purple-200 text-purple-700 hover:bg-purple-50 flex-1"
                onClick={() => onMoveToInterviewStage(entry.id, stage.id)}
                disabled={isMoving}
              >
                {isMoving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mic className="h-3 w-3" />}
                {stage.name}
              </Button>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RecruiterCandidatesPage() {
  const { id: postingId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  useSetPageMetadata({
    title: "Pipeline de Candidatos",
    description: "Gerencie os candidatos à sua vaga",
    showBreadcrumbs: true,
  });

  const [selectedEntry, setSelectedEntry] = React.useState<PipelineEntry | null>(null);
  const [sessionEntry, setSessionEntry] = React.useState<PipelineEntry | null>(null);
  const [movingEntryId, setMovingEntryId] = React.useState<string | null>(null);
  const [stageModalOpen, setStageModalOpen] = React.useState(false);

  const { data, isLoading } = useQuery<PipelineResponse>({
    queryKey: ["recruiterPipeline", postingId],
    queryFn: () => api.get(`/api/recruiter/postings/${postingId}/pipeline`),
    enabled: Boolean(postingId),
  });

  const moveMutation = useMutation({
    mutationFn: ({ entryId, stage, recruitmentStageId }: { entryId: string; stage: PipelineStage; recruitmentStageId?: string }) =>
      api.patch(`/api/recruiter/postings/${postingId}/pipeline/${entryId}/move`, { stage, recruitmentStageId }),
    onMutate: ({ entryId }) => {
      setMovingEntryId(entryId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruiterPipeline", postingId] });
    },
    onError: (err) => {
      toast({
        title: "Erro ao mover candidato",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setMovingEntryId(null);
    },
  });

  const pipeline = data?.pipeline ?? [];
  const stageGroups = data?.stages ?? [];
  const interviewStages = data?.interviewStages ?? [];
  const publishedInterviewStages = interviewStages.filter(s => s.status === "PUBLISHED");

  const totalCount = pipeline.length;
  const analyzedCount = pipeline.filter((e) => e.fitScore !== null || e.jobApplication.analyses.length > 0).length;
  const avgScore = React.useMemo(() => {
    const scores = pipeline
      .map((e) => e.fitScore ?? e.jobApplication.analyses[0]?.fitScore ?? null)
      .filter((s): s is number => s !== null);
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  }, [pipeline]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-3xl" />
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <>
      <AnalysisModal
        postingId={postingId}
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />
      <InterviewSessionsModal
        postingId={postingId}
        entry={sessionEntry}
        onClose={() => setSessionEntry(null)}
      />
      <InterviewStageModal
        postingId={postingId}
        open={stageModalOpen}
        onClose={() => setStageModalOpen(false)}
      />

      <div className="space-y-6">
        {/* Header */}
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.08),transparent_35%)]" />
          <div className="relative space-y-4">
            <Button asChild variant="ghost" size="sm" className="rounded-xl -ml-2">
              <Link href="/recruiter/postings">
                <ArrowLeft className="h-4 w-4" />
                Voltar às publicações
              </Link>
            </Button>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">Pipeline de Candidatos</h1>
                <p className="text-sm text-muted-foreground">
                  Gerencie e avalie os candidatos à vaga
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-3 text-sm">
                  <div className="rounded-2xl border border-border bg-background px-4 py-2 text-center">
                    <div className="text-xl font-bold">{totalCount}</div>
                    <div className="text-xs text-muted-foreground">Candidatos</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-background px-4 py-2 text-center">
                    <div className="text-xl font-bold">{analyzedCount}</div>
                    <div className="text-xs text-muted-foreground">Analisados</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-background px-4 py-2 text-center">
                    <div className={cn("text-xl font-bold", avgScore !== null ? getFitScoreColor(avgScore) : "")}>
                      {avgScore !== null ? `${avgScore}` : "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">Score médio</div>
                  </div>
                </div>
                <Button
                  onClick={() => setStageModalOpen(true)}
                  className="rounded-2xl gap-2 bg-purple-600 hover:bg-purple-700 text-white shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  Fase de entrevista
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Published interview stages summary */}
        {publishedInterviewStages.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {publishedInterviewStages.map(stage => (
              <div key={stage.id} className="flex items-center gap-2 rounded-2xl border border-purple-200 bg-purple-50 px-3 py-1.5 text-sm text-purple-700">
                <Mic className="h-3.5 w-3.5" />
                <span className="font-medium">{stage.name}</span>
                <Badge variant="outline" className="text-xs bg-purple-100 border-purple-300 text-purple-700">
                  {stage.questions?.length ?? 0} perguntas
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {totalCount === 0 && (
          <section className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Briefcase className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold">Sem candidaturas ainda</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Quando candidatos se candidatarem à sua vaga, aparecerão aqui organizados por fase.
            </p>
          </section>
        )}

        {/* Kanban */}
        {stageGroups.length > 0 && (
          <div className="overflow-x-auto pb-4">
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${stageGroups.length}, minmax(280px, 1fr))` }}
            >
              {stageGroups.map(({ stage, label, isInterviewStage, stageId, candidates: entries }) => {
                const colorKey = isInterviewStage ? "INTERVIEW_STAGE" : (STAGE_COLORS[stage] ? stage : "RECEIVED");
                const { accent, badge } = STAGE_COLORS[colorKey] ?? STAGE_COLORS.RECEIVED;

                return (
                  <div key={stage} className="rounded-3xl border border-border bg-card p-4 min-w-[280px]">
                    <div className={cn("mb-4 rounded-2xl bg-gradient-to-br p-[1px]", accent)}>
                      <div className="rounded-[15px] bg-card p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {isInterviewStage && <Mic className="h-3.5 w-3.5 text-purple-600 shrink-0" />}
                            <h2 className="text-sm font-semibold truncate">{label}</h2>
                          </div>
                          <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-xs shrink-0", badge)}>
                            {entries.length}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {entries.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-xs text-muted-foreground">
                          Sem candidatos nesta fase
                        </div>
                      ) : (
                        entries.map((entry) => (
                          <CandidateCard
                            key={entry.id}
                            entry={entry}
                            postingId={postingId}
                            isInterviewStageColumn={isInterviewStage}
                            interviewStageId={stageId}
                            publishedInterviewStages={publishedInterviewStages}
                            onViewAnalysis={setSelectedEntry}
                            onViewSessions={setSessionEntry}
                            onMove={(entryId, toStage) => moveMutation.mutate({ entryId, stage: toStage })}
                            onMoveToInterviewStage={(entryId, rsId) =>
                              moveMutation.mutate({ entryId, stage: "INTERVIEW", recruitmentStageId: rsId })
                            }
                            isMoving={movingEntryId === entry.id && moveMutation.isPending}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

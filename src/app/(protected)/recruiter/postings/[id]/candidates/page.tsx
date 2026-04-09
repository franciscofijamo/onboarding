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
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useSetPageMetadata } from "@/contexts/page-metadata";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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
};

type PipelineResponse = { pipeline: PipelineEntry[] };

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGES: PipelineStage[] = ["RECEIVED", "REVIEWING", "INTERVIEW", "OFFER", "REJECTED", "ACCEPTED"];

const STAGE_LABELS: Record<PipelineStage, string> = {
  RECEIVED: "Candidaturas Recebidas",
  REVIEWING: "Em Avaliação",
  INTERVIEW: "Entrevista",
  OFFER: "Oferta",
  REJECTED: "Rejeitado",
  ACCEPTED: "Aceite",
};

const STAGE_COLORS: Record<PipelineStage, { accent: string; badge: string }> = {
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
            {/* Candidate Info */}
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
                <span>Fase: <strong className="text-foreground">{STAGE_LABELS[fullEntry.currentStage]}</strong></span>
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

            {/* Analysis — no data */}
            {!analysis && (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
                <Sparkles className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="text-sm font-medium text-muted-foreground">Análise IA ainda não disponível</p>
                <p className="text-xs text-muted-foreground mt-1">
                  A análise é processada em segundo plano após a candidatura.
                </p>
              </div>
            )}

            {/* Analysis — score circle + stats */}
            {analysis && (
              <>
                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                    {/* Score ring */}
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

                {/* Skills + Gaps */}
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

                {/* Strengths */}
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

                {/* Improvements */}
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

                {/* Recommendations */}
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

            {/* Stage History */}
            {fullEntry.stageHistory.length > 0 && (
              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <h4 className="text-sm font-semibold mb-3">Histórico de Fases</h4>
                <div className="space-y-2">
                  {fullEntry.stageHistory.map((h) => (
                    <div key={h.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{STAGE_LABELS[h.fromStage]}</span>
                      <ChevronRight className="h-3 w-3 shrink-0" />
                      <span className="font-medium text-foreground">{STAGE_LABELS[h.toStage]}</span>
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

// ─── Candidate Card ───────────────────────────────────────────────────────────

function CandidateCard({
  entry,
  postingId,
  onViewAnalysis,
  onMove,
  isMoving,
}: {
  entry: PipelineEntry;
  postingId: string;
  onViewAnalysis: (entry: PipelineEntry) => void;
  onMove: (entryId: string, toStage: PipelineStage) => void;
  isMoving: boolean;
}) {
  const fitScore = entry.fitScore ?? entry.jobApplication.analyses[0]?.fitScore ?? null;
  const nextStage = NEXT_STAGE[entry.currentStage];
  const hasAnalysis = entry.jobApplication.analyses.length > 0;

  return (
    <article className="rounded-2xl border border-border bg-background p-4 space-y-3 transition-colors hover:border-primary/30">
      {/* Name + Score */}
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

      {/* Meta */}
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

      {/* Actions */}
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

        {nextStage && (
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
  const [movingEntryId, setMovingEntryId] = React.useState<string | null>(null);

  const { data, isLoading } = useQuery<PipelineResponse>({
    queryKey: ["recruiterPipeline", postingId],
    queryFn: () => api.get(`/api/recruiter/postings/${postingId}/pipeline`),
    enabled: Boolean(postingId),
  });

  const moveMutation = useMutation({
    mutationFn: ({ entryId, stage }: { entryId: string; stage: PipelineStage }) =>
      api.patch(`/api/recruiter/postings/${postingId}/pipeline/${entryId}/move`, { stage }),
    onMutate: ({ entryId, stage }) => {
      setMovingEntryId(entryId);
      queryClient.setQueryData<PipelineResponse>(["recruiterPipeline", postingId], (cur) => {
        if (!cur) return cur;
        return {
          pipeline: cur.pipeline.map((e) =>
            e.id === entryId ? { ...e, currentStage: stage } : e
          ),
        };
      });
    },
    onSettled: () => {
      setMovingEntryId(null);
      queryClient.invalidateQueries({ queryKey: ["recruiterPipeline", postingId] });
    },
  });

  const pipeline = data?.pipeline ?? [];

  const grouped = React.useMemo(() => {
    const map: Record<PipelineStage, PipelineEntry[]> = {
      RECEIVED: [], REVIEWING: [], INTERVIEW: [], OFFER: [], REJECTED: [], ACCEPTED: [],
    };
    pipeline.forEach((e) => map[e.currentStage].push(e));
    return map;
  }, [pipeline]);

  // Derive active stages from actual data — always show RECEIVED, show others only with candidates
  const activeStages = React.useMemo(
    () => STAGES.filter((s) => s === "RECEIVED" || grouped[s].length > 0),
    [grouped]
  );

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
            </div>
          </div>
        </section>

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
        {totalCount > 0 && (
          <div className="overflow-x-auto pb-4">
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${activeStages.length}, minmax(280px, 1fr))` }}
            >
              {activeStages.map((stage) => {
                const { accent, badge } = STAGE_COLORS[stage];
                const entries = grouped[stage];

                return (
                  <div key={stage} className="rounded-3xl border border-border bg-card p-4 min-w-[280px]">
                    {/* Column header */}
                    <div className={cn("mb-4 rounded-2xl bg-gradient-to-br p-[1px]", accent)}>
                      <div className="rounded-[15px] bg-card p-4">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="text-sm font-semibold">{STAGE_LABELS[stage]}</h2>
                          <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-xs", badge)}>
                            {entries.length}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Cards */}
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
                            onViewAnalysis={setSelectedEntry}
                            onMove={(entryId, stage) => moveMutation.mutate({ entryId, stage })}
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

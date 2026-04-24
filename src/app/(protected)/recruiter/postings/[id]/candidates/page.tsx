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
  Trash2,
  GripVertical,
  ExternalLink,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
} from "@dnd-kit/core";
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
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatDate } from "@/lib/utils";
import { type PipelineStage } from "@/lib/recruiter/pipeline";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language";

// ─── Types ───────────────────────────────────────────────────────────────────



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
  posting: { id: string; title: string };
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

function getStageLabel(t: (key: string, vars?: Record<string, string | number>) => string, stage: PipelineStage) {
  return t(`recruiterCandidates.stageLabels.${stage}`);
}

function getInterviewFocusLabel(t: (key: string, vars?: Record<string, string | number>) => string, focusType: "TECHNICAL" | "BEHAVIORAL" | "MIXED") {
  return t(`recruiterCandidates.focusType.${focusType}`);
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
  const { t } = useLanguage();
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
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Header banner */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold leading-tight truncate">
                  {candidate.name ?? candidate.email ?? t("common.candidate")}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  {candidate.currentRole && (
                    <span className="text-xs text-muted-foreground truncate">{candidate.currentRole}</span>
                  )}
                  {candidate.province && (
                    <Badge variant="outline" className="rounded-full text-xs px-1.5 py-0">{candidate.province}</Badge>
                  )}
                  {fullEntry.jobApplication.resume?.fileUrl && (
                    <a
                      href={fullEntry.jobApplication.resume.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-[11px] text-primary hover:underline"
                    >
                      <FileText className="h-2.5 w-2.5" />
                      {t("recruiterCandidates.analysis.resumeLink")}
                    </a>
                  )}
                </div>
              </div>
            </div>
            <Badge variant="outline" className="rounded-full text-xs shrink-0">
              {getStageLabel(t, fullEntry.currentStage)}
            </Badge>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && !analysis && (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
              <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-sm font-medium text-muted-foreground">{t("recruiterCandidates.analysis.emptyTitle")}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("recruiterCandidates.analysis.emptyDescription")}
              </p>
            </div>
          )}

          {!isLoading && analysis && (
            <>
              {/* Score hero */}
              <div className="rounded-2xl border border-border bg-gradient-to-br from-muted/40 to-muted/10 overflow-hidden">
                <div className="flex flex-col sm:flex-row">
                  {/* Score ring */}
                  <div className="flex flex-col items-center justify-center p-6 sm:border-r border-border sm:min-w-[180px]">
                    <div className="relative">
                      <svg width="140" height="140" viewBox="0 0 140 140">
                        <circle cx="70" cy="70" r="58" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/20" />
                        <circle
                          cx="70" cy="70" r="58"
                          fill="none"
                          strokeWidth="10"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 58}
                          strokeDashoffset={2 * Math.PI * 58 * (1 - (fitScore ?? 0) / 100)}
                          className={cn("transition-all duration-1000", getFitScoreRingColor(fitScore))}
                          transform="rotate(-90 70 70)"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={cn("text-4xl font-bold tabular-nums", getFitScoreColor(fitScore))}>
                          {fitScore !== null ? Math.round(fitScore) : "—"}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">/100</span>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground mt-2 text-center">{t("recruiterCandidates.analysis.fitScoreLabel")}</p>
                  </div>

                  {/* Score details */}
                  <div className="flex-1 p-5 space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {(fitScore ?? 0) >= 70
                        ? t("recruiterCandidates.analysis.scoreSummaries.high")
                        : (fitScore ?? 0) >= 50
                        ? t("recruiterCandidates.analysis.scoreSummaries.medium")
                        : t("recruiterCandidates.analysis.scoreSummaries.low")}
                    </p>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
                        <div className="text-2xl font-bold text-emerald-600 tabular-nums">{skillsMatch.length}</div>
                        <div className="text-[11px] text-emerald-700 font-medium mt-0.5">{t("recruiterCandidates.analysis.stats.skillsMatch")}</div>
                      </div>
                      <div className="rounded-xl bg-orange-50 border border-orange-100 p-3 text-center">
                        <div className="text-2xl font-bold text-orange-500 tabular-nums">{missingSkills.length}</div>
                        <div className="text-[11px] text-orange-700 font-medium mt-0.5">{t("recruiterCandidates.analysis.stats.missingSkills")}</div>
                      </div>
                      <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-center">
                        <div className="text-2xl font-bold text-blue-600 tabular-nums">{recommendations.length}</div>
                        <div className="text-[11px] text-blue-700 font-medium mt-0.5">{t("recruiterCandidates.analysis.stats.recommendations")}</div>
                      </div>
                    </div>

                    {analysis.summary && (
                      <p className="text-sm text-foreground/80 leading-relaxed border-t border-border pt-3">
                        {analysis.summary}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Skills grid */}
              {(skillsMatch.length > 0 || missingSkills.length > 0) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {skillsMatch.length > 0 && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                        <h4 className="text-sm font-semibold text-emerald-800">{t("recruiterCandidates.analysis.skillsMatchTitle")}</h4>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {skillsMatch.map((skill, i) => (
                          <span key={i} className="inline-flex items-center rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs px-2.5 py-0.5 font-medium">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {missingSkills.length > 0 && (
                    <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-5 w-5 rounded-full bg-orange-400 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">!</span>
                        </div>
                        <h4 className="text-sm font-semibold text-orange-800">{t("recruiterCandidates.analysis.missingSkillsTitle")}</h4>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {missingSkills.map((skill, i) => (
                          <span key={i} className="inline-flex items-center rounded-full bg-orange-100 border border-orange-200 text-orange-800 text-xs px-2.5 py-0.5 font-medium">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Strengths + Improvements side by side when both exist */}
              {(strengths.length > 0 || improvements.length > 0) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {strengths.length > 0 && (
                    <div className="rounded-2xl border border-border bg-card p-4">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">✓</span>
                        {t("recruiterCandidates.analysis.strengthsTitle")}
                      </h4>
                      <ul className="space-y-2">
                        {strengths.map((s, i) => (
                          <li key={i} className="text-sm text-muted-foreground leading-snug flex gap-2">
                            <span className="shrink-0 mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {improvements.length > 0 && (
                    <div className="rounded-2xl border border-border bg-card p-4">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">!</span>
                        {t("recruiterCandidates.analysis.improvementsTitle")}
                      </h4>
                      <ul className="space-y-2">
                        {improvements.map((s, i) => (
                          <li key={i} className="text-sm text-muted-foreground leading-snug flex gap-2">
                            <span className="shrink-0 mt-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {recommendations.length > 0 && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                  <h4 className="text-sm font-semibold mb-3 text-blue-900 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    {t("recruiterCandidates.analysis.recommendationsTitle")}
                  </h4>
                  <ol className="space-y-2">
                    {recommendations.map((s, i) => (
                      <li key={i} className="flex gap-3 text-sm text-blue-900/80 leading-snug">
                        <span className="shrink-0 h-5 w-5 rounded-full bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </span>
                        {s}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </>
          )}

          {!isLoading && fullEntry.stageHistory.length > 0 && (
            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t("recruiterCandidates.analysis.stageHistoryTitle")}</h4>
              <div className="space-y-1.5">
                {fullEntry.stageHistory.map((h) => (
                  <div key={h.id} className="flex items-center gap-2 text-xs">
                    <span className="font-medium text-foreground">{getStageLabel(t, h.fromStage)}</span>
                    <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="font-medium text-foreground">{getStageLabel(t, h.toStage)}</span>
                    <span className="ml-auto text-muted-foreground">{formatDate(h.movedAt)}</span>
                    {h.mover.name && <span className="text-muted-foreground">· {h.mover.name}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
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
  const { t } = useLanguage();
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
    if (session.analyzedCount === session.totalQuestions && session.totalQuestions > 0) return t("recruiterCandidates.sessions.status.completed");
    if (session.answeredCount > 0) return t("recruiterCandidates.sessions.status.inProgress");
    return t("recruiterCandidates.sessions.status.pending");
  }

  function getSessionStatusColor(session: CandidateSessionsResponse["sessions"][0]) {
    if (session.analyzedCount === session.totalQuestions && session.totalQuestions > 0) return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (session.answeredCount > 0) return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-blue-100 text-blue-700 border-blue-200";
  }

  function getResponseStatusIcon(status: string) {
    if (status === "ANALYZED") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    if (status === "RECORDED") return <Mic className="h-3.5 w-3.5 text-amber-500" />;
    return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
  }

  function renderFeedback(feedback: unknown) {
    if (!feedback || typeof feedback !== "object") return null;
    const fb = feedback as Record<string, unknown>;

    const summary = typeof fb.summary === "string" ? fb.summary : null;
    const improvements: string[] = Array.isArray(fb.improvements)
      ? (fb.improvements as unknown[]).filter((x): x is string => typeof x === "string")
      : [];
    const strengths: string[] = Array.isArray(fb.strengths)
      ? (fb.strengths as unknown[]).filter((x): x is string => typeof x === "string")
      : [];

    // Extract per-criteria scores if present
    const criteria = fb.criteria && typeof fb.criteria === "object"
      ? Object.entries(fb.criteria as Record<string, unknown>).map(([key, val]) => {
          if (val && typeof val === "object") {
            const v = val as Record<string, unknown>;
            return { key, score: typeof v.score === "number" ? v.score : null, feedback: typeof v.feedback === "string" ? v.feedback : null };
          }
          return null;
        }).filter(Boolean) as { key: string; score: number | null; feedback: string | null }[]
      : [];

    if (!summary && improvements.length === 0 && strengths.length === 0 && criteria.length === 0) return null;

    return (
      <div className="mt-2 rounded-xl bg-purple-50 border border-purple-100 p-3 space-y-2">
        <p className="text-xs font-semibold text-purple-700">{t("recruiterCandidates.sessions.aiEvaluationTitle")}</p>
        {summary && <p className="text-xs text-foreground leading-snug">{summary}</p>}
        {criteria.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {criteria.map(c => c && (
              <div key={c.key} className="rounded-lg bg-white/60 border border-purple-100 p-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between gap-1">
                  <span className="capitalize font-medium text-foreground">{c.key.replace(/([A-Z])/g, " $1").trim()}</span>
                  {c.score !== null && <span className="font-bold text-purple-700 shrink-0">{c.score}/10</span>}
                </div>
                {c.feedback && <p className="text-[11px] mt-1 leading-tight text-muted-foreground">{c.feedback}</p>}
              </div>
            ))}
          </div>
        )}
        {strengths.length > 0 && (
          <div>
            <p className="text-xs font-medium text-emerald-700 mb-0.5">{t("recruiterCandidates.sessions.strengthsTitle")}</p>
            <ul className="list-disc list-inside space-y-0.5">
              {strengths.map((s, i) => <li key={i} className="text-xs text-foreground">{s}</li>)}
            </ul>
          </div>
        )}
        {improvements.length > 0 && (
          <div>
            <p className="text-xs font-medium text-amber-700 mb-0.5">{t("recruiterCandidates.sessions.improvementsTitle")}</p>
            <ul className="list-disc list-inside space-y-0.5">
              {improvements.map((imp, i) => <li key={i} className="text-xs text-foreground">{imp}</li>)}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <Dialog open={Boolean(entry)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
              <Mic className="h-4 w-4 text-purple-700" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold leading-tight truncate">
                {entry.user.name ?? entry.user.email ?? t("common.candidate")}
              </p>
              <p className="text-xs text-muted-foreground">{t("recruiterCandidates.sessions.title")}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && sessions.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
            <Mic className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm font-medium text-muted-foreground">{t("recruiterCandidates.sessions.emptyTitle")}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("recruiterCandidates.sessions.emptyDescription")}
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
                          {t("recruiterCandidates.sessions.answeredCount", { answered: session.answeredCount, total: session.totalQuestions })}
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
                              {t("recruiterCandidates.sessions.questionStatus", {
                                index: resp.questionIndex + 1,
                                status: resp.status === "ANALYZED"
                                  ? t("recruiterCandidates.sessions.responseStatus.analyzed")
                                  : resp.status === "RECORDED"
                                  ? t("recruiterCandidates.sessions.responseStatus.recorded")
                                  : t("recruiterCandidates.sessions.responseStatus.pending"),
                              })}
                              {resp.score !== null && (
                                <span className="ml-2 text-amber-600 font-bold">{resp.score}/10</span>
                              )}
                            </p>
                            <p className="text-sm text-foreground leading-snug mb-2">{resp.prompt}</p>
                            {resp.transcript && (
                              <div className="rounded-xl bg-muted/40 border border-border p-3 text-xs text-muted-foreground">
                                <p className="font-medium text-foreground mb-1">{t("recruiterCandidates.sessions.transcriptLabel")}</p>
                                <p className="line-clamp-4">{resp.transcript}</p>
                              </div>
                            )}
                            {resp.feedback && renderFeedback(resp.feedback)}
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
        </div>
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
  const { t } = useLanguage();
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
      ) as { stage: InterviewStage; warning?: string };
      setQuestions(genRes.stage.questions ?? []);
      if (genRes.warning) {
        toast({ title: t("common.warning"), description: genRes.warning });
      }
      setStep("questions");
    } catch (err) {
      toast({
        title: t("recruiterCandidates.stageModal.toasts.generateErrorTitle"),
        description: err instanceof Error ? err.message : t("recruiterCandidates.tryAgain"),
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
      ) as { stage: InterviewStage; warning?: string };
      setQuestions(genRes.stage.questions ?? []);
      if (genRes.warning) {
        toast({ title: t("common.warning"), description: genRes.warning });
      } else {
        toast({ title: t("recruiterCandidates.stageModal.toasts.regenerateSuccessTitle") });
      }
    } catch (err) {
      toast({
        title: t("recruiterCandidates.stageModal.toasts.regenerateErrorTitle"),
        description: err instanceof Error ? err.message : t("recruiterCandidates.tryAgain"),
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
        title: t("recruiterCandidates.stageModal.toasts.saveQuestionErrorTitle"),
        description: err instanceof Error ? err.message : t("recruiterCandidates.tryAgain"),
        variant: "destructive",
      });
    }
  }

  async function handleDeleteQuestion(questionId: string) {
    if (!stageId) return;
    try {
      await api.delete(`/api/recruiter/stages/${stageId}/questions/${questionId}`);

      // Compute which questions need a new order BEFORE re-indexing
      // (so we compare original order against new position, not the already-normalized value)
      const afterDelete = questions.filter(q => q.id !== questionId);
      const questionsNeedingReorder = afterDelete
        .map((q, newIdx) => ({ ...q, newOrder: newIdx }))
        .filter(q => q.order !== q.newOrder);

      // Re-indexed list for local state (optimistic update)
      const remaining = afterDelete.map((q, i) => ({ ...q, order: i }));

      // Optimistic UI update
      setQuestions(remaining);

      // Persist new order atomically via batch endpoint (only if any positions changed)
      if (questionsNeedingReorder.length > 0) {
        await api.put(`/api/recruiter/stages/${stageId}/questions/reorder`, {
          orders: remaining.map(q => ({ id: q.id, order: q.order })),
        }).catch(() => {
          toast({
            title: t("common.warning"),
            description: t("recruiterCandidates.stageModal.toasts.reorderAfterDeleteWarning"),
          });
        });
      }
    } catch (err) {
      toast({
        title: t("recruiterCandidates.stageModal.toasts.deleteQuestionErrorTitle"),
        description: err instanceof Error ? err.message : t("recruiterCandidates.tryAgain"),
        variant: "destructive",
      });
    }
  }

  async function handleMoveQuestion(questionId: string, direction: "up" | "down") {
    if (!stageId) return;

    // Compute new order outside the state updater so we can await API calls
    const idx = questions.findIndex(q => q.id === questionId);
    if (idx === -1) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= questions.length) return;

    const reordered = [...questions];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    const normalized = reordered.map((q, i) => ({ ...q, order: i }));

    // Optimistic UI update
    setQuestions(normalized);

    // Persist the full new order atomically via batch endpoint
    try {
      await api.put(`/api/recruiter/stages/${stageId}/questions/reorder`, {
        orders: normalized.map(q => ({ id: q.id, order: q.order })),
      });
    } catch {
      toast({
        title: t("recruiterCandidates.stageModal.toasts.reorderErrorTitle"),
        description: t("recruiterCandidates.stageModal.toasts.reorderErrorDescription"),
        variant: "destructive",
      });
      // Revert optimistic update on failure
      setQuestions(questions);
    }
  }

  async function handlePublish() {
    if (!stageId) return;
    // Warn recruiter if question count is below the configured target (e.g. due to deduplication)
    if (questions.length < questionCount) {
      toast({
        title: t("recruiterCandidates.stageModal.toasts.lowQuestionCountTitle"),
        description: t("recruiterCandidates.stageModal.toasts.lowQuestionCountDescription", { current: questions.length, target: questionCount }),
      });
    }
    setPublishing(true);
    try {
      await api.post(`/api/recruiter/stages/${stageId}/publish`, {});
      toast({
        title: t("recruiterCandidates.stageModal.toasts.publishSuccessTitle"),
        description: t("recruiterCandidates.stageModal.toasts.publishSuccessDescription"),
      });
      queryClient.invalidateQueries({ queryKey: ["recruiterPipeline", postingId] });
      setStep("done");
      setTimeout(() => handleClose(), 1500);
    } catch (err) {
      toast({
        title: t("recruiterCandidates.stageModal.toasts.publishErrorTitle"),
        description: err instanceof Error ? err.message : t("recruiterCandidates.tryAgain"),
        variant: "destructive",
      });
    } finally {
      setPublishing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
              {step === "done"
                ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                : <BookOpen className="h-4 w-4 text-purple-700" />
              }
            </div>
            <div>
              <p className="font-semibold leading-tight">
                {step === "config" ? t("recruiterCandidates.stageModal.titleConfig") : step === "questions" ? t("recruiterCandidates.stageModal.titleQuestions") : t("recruiterCandidates.stageModal.titleDone")}
              </p>
              {step === "config" && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("recruiterCandidates.stageModal.descriptionConfig")}
                </p>
              )}
              {step === "questions" && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("recruiterCandidates.stageModal.descriptionQuestions", { count: questions.length })}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
        {step === "config" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stageName">{t("recruiterCandidates.stageModal.stageNameLabel")}</Label>
              <Input
                id="stageName"
                placeholder={t("recruiterCandidates.stageModal.stageNamePlaceholder")}
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("recruiterCandidates.stageModal.questionCountLabel")}</Label>
                <Select
                  value={String(questionCount)}
                  onValueChange={(v) => setQuestionCount(Number(v) as 5 | 10)}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">{t("recruiterCandidates.stageModal.questionCountOption", { count: 5 })}</SelectItem>
                    <SelectItem value="10">{t("recruiterCandidates.stageModal.questionCountOption", { count: 10 })}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("recruiterCandidates.stageModal.focusTypeLabel")}</Label>
                <Select value={focusType} onValueChange={(v) => setFocusType(v as typeof focusType)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MIXED">{getInterviewFocusLabel(t, "MIXED")}</SelectItem>
                    <SelectItem value="TECHNICAL">{getInterviewFocusLabel(t, "TECHNICAL")}</SelectItem>
                    <SelectItem value="BEHAVIORAL">{getInterviewFocusLabel(t, "BEHAVIORAL")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={handleClose}>{t("common.cancel")}</Button>
              <Button
                onClick={handleCreateAndGenerate}
                disabled={!stageName.trim() || generating}
              >
                {generating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> {t("recruiterCandidates.stageModal.generating")}</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> {t("recruiterCandidates.stageModal.generateCta")}</>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "questions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={generating}
                className="rounded-xl gap-1"
              >
                {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                {t("recruiterCandidates.stageModal.regenerateCta")}
              </Button>
            </div>

            <div className="space-y-3">
              {questions.map((q, i) => (
                <EditableQuestion
                  key={q.id}
                  index={i}
                  total={questions.length}
                  question={q}
                  onSave={(newPrompt) => handleEditQuestion(q.id, newPrompt)}
                  onDelete={() => handleDeleteQuestion(q.id)}
                  onMoveUp={i > 0 ? () => handleMoveQuestion(q.id, "up") : undefined}
                  onMoveDown={i < questions.length - 1 ? () => handleMoveQuestion(q.id, "down") : undefined}
                />
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => setStep("config")}>{t("common.back")}</Button>
              <Button onClick={handlePublish} disabled={publishing || questions.length === 0}>
                {publishing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> {t("recruiterCandidates.stageModal.publishing")}</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4" /> {t("recruiterCandidates.stageModal.publishCta")}</>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <p className="font-semibold">{t("recruiterCandidates.stageModal.doneTitle")}</p>
            <p className="text-sm text-muted-foreground">
              {t("recruiterCandidates.stageModal.doneDescription")}
            </p>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditableQuestion({
  index,
  total,
  question,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  index: number;
  total: number;
  question: InterviewQuestion;
  onSave: (newPrompt: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const { t } = useLanguage();
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(question.prompt);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

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

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("recruiterCandidates.editableQuestion.deleteDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("recruiterCandidates.editableQuestion.deleteDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={async () => {
                setConfirmOpen(false);
                await handleDelete();
              }}
            >
              {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : t("common.delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              {t("recruiterCandidates.editableQuestion.editedBadge")}
            </Badge>
          )}
        </div>
        {!editing && (
          <div className="flex items-center gap-1">
            {/* Reorder up */}
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl h-7 w-7 p-0"
              disabled={!onMoveUp}
              onClick={onMoveUp}
              title={t("recruiterCandidates.editableQuestion.moveUp")}
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            {/* Reorder down */}
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl h-7 w-7 p-0"
              disabled={!onMoveDown}
              onClick={onMoveDown}
              title={t("recruiterCandidates.editableQuestion.moveDown")}
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
            {/* Edit */}
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl h-7 w-7 p-0"
              onClick={() => { setValue(question.prompt); setEditing(true); }}
              title={t("common.edit")}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            {/* Delete — only allow if more than 1 question remains */}
            {total > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={() => setConfirmOpen(true)}
                disabled={deleting}
                title={t("common.delete")}
              >
                {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              </Button>
            )}
          </div>
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
              {t("common.cancel")}
            </Button>
            <Button size="sm" className="rounded-xl" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              {t("common.save")}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-foreground leading-relaxed">{question.prompt}</p>
      )}
    </div>
    </>
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
  isDragOverlay,
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
  isDragOverlay?: boolean;
}) {
  const { t } = useLanguage();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: entry.id,
    data: { entryId: entry.id, isInterviewStage: isInterviewStageColumn, interviewStageId },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const fitScore = entry.fitScore ?? entry.jobApplication.analyses[0]?.fitScore ?? null;
  const nextStage = NEXT_STAGE[entry.currentStage];
  const hasAnalysis = entry.jobApplication.analyses.length > 0;
  const session = entry.interviewSession ?? null;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-2xl border border-border bg-background p-4 space-y-3 transition-colors hover:border-primary/30",
        isDragging && !isDragOverlay && "opacity-40 scale-[0.98]",
        isDragOverlay && "shadow-2xl ring-2 ring-primary/30 rotate-1 cursor-grabbing",
      )}
    >
      {/* Header row: drag handle + name + score */}
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0 touch-none"
          tabIndex={-1}
          aria-label={t("recruiterCandidates.card.dragCandidate")}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 flex items-start justify-between gap-2 min-w-0">
          <div className="min-w-0">
            <p className="font-semibold truncate leading-tight text-sm">
              {entry.user.name ?? entry.user.email ?? t("common.candidate")}
            </p>
            {entry.user.currentRole && (
              <p className="text-xs text-muted-foreground truncate">{entry.user.currentRole}</p>
            )}
          </div>
          {fitScore !== null ? (
            <div className={cn("shrink-0 text-right", getFitScoreColor(fitScore))}>
              <span className="text-lg font-bold leading-none">{Math.round(fitScore)}</span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground shrink-0">—</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 text-xs text-muted-foreground pl-6">
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
              {t("common.analyzed")}
            </span>
          </>
        )}
      </div>

      {/* Interview session status */}
      {isInterviewStageColumn && session && (
        <div className="rounded-xl bg-purple-50 border border-purple-200 p-2.5 space-y-1 ml-6">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-purple-700">{t("recruiterCandidates.card.sessionLabel")}</span>
            {session.averageScore !== null && (
              <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
                <Star className="h-3 w-3" />
                {session.averageScore}/10
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-purple-600">
            <Mic className="h-3 w-3" />
            <span>{t("recruiterCandidates.card.sessionSummary", { answered: session.answeredCount, total: session.totalQuestions, analyzed: session.analyzedCount })}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2 pt-1 border-t border-border/40">
        {/* Secondary view actions */}
        <div className="flex gap-1.5 flex-wrap items-center">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl h-7 px-2.5 text-xs gap-1"
            onClick={() => onViewAnalysis(entry)}
          >
            <BarChart3 className="h-3 w-3" />
            {t("common.analysis")}
          </Button>
          {isInterviewStageColumn && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl h-7 px-2.5 text-xs gap-1 border-purple-200 text-purple-700 hover:bg-purple-50"
              onClick={() => onViewSessions(entry)}
            >
              <Mic className="h-3 w-3" />
              {t("recruiterCandidates.card.responsesCta")}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl h-7 px-2.5 text-xs gap-1"
              >
                {t("common.actions")}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px]">
              <DropdownMenuLabel>{t("recruiterCandidates.card.transferTo")}</DropdownMenuLabel>
              {(["RECEIVED", "REVIEWING", "INTERVIEW", "OFFER", "REJECTED", "ACCEPTED"] as const).map((stage) => (
                <DropdownMenuItem
                  key={stage}
                  onClick={() => onMove(entry.id, stage)}
                  disabled={(entry.currentStage === stage && stage !== "INTERVIEW") || isMoving}
                >
                  {getStageLabel(t, stage)}
                </DropdownMenuItem>
              ))}
              {publishedInterviewStages.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>{t("recruiterCandidates.card.interviewStages")}</DropdownMenuLabel>
                  {publishedInterviewStages.map((stage) => (
                    <DropdownMenuItem
                      key={stage.id}
                      onClick={() => onMoveToInterviewStage(entry.id, stage.id)}
                      disabled={isMoving}
                    >
                      {stage.name}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation actions */}
        {isInterviewStageColumn ? (
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl h-7 flex-1 text-xs border-primary/30 text-primary hover:bg-primary/5 gap-1"
              onClick={() => onMove(entry.id, "OFFER")}
              disabled={isMoving}
            >
              {isMoving ? <Loader2 className="h-3 w-3 animate-spin" /> : <><span>{getStageLabel(t, "OFFER")}</span> <ArrowRight className="h-3 w-3" /></>}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/5 px-2.5"
              onClick={() => onMove(entry.id, "REJECTED")}
              disabled={isMoving}
              title={t("recruiterCandidates.card.rejectCandidate")}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : nextStage ? (
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl h-7 w-full text-xs border-primary/30 text-primary hover:bg-primary/5 gap-1"
            onClick={() => onMove(entry.id, nextStage)}
            disabled={isMoving}
          >
            {isMoving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <><span>{t("recruiterCandidates.card.advanceCta")}</span> <ArrowRight className="h-3 w-3" /></>
            )}
          </Button>
        ) : null}

        {/* Move to interview sub-stages (only in REVIEWING column) */}
        {!isInterviewStageColumn && entry.currentStage === "REVIEWING" && publishedInterviewStages.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/40">
            {publishedInterviewStages.map(stage => (
              <Button
                key={stage.id}
                size="sm"
                variant="outline"
                className="rounded-xl h-7 text-xs border-purple-200 text-purple-700 hover:bg-purple-50 gap-1"
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

// ─── Kanban Column (droppable) ────────────────────────────────────────────────

function KanbanColumn({
  columnId,
  accent,
  badge,
  label,
  isInterviewStage,
  count,
  children,
}: {
  columnId: string;
  accent: string;
  badge: string;
  label: string;
  isInterviewStage: boolean;
  count: number;
  children: React.ReactNode;
}) {
  const { t } = useLanguage();
  const { setNodeRef, isOver } = useDroppable({ id: columnId });

  return (
    <div
      className={cn(
        "rounded-3xl border border-border bg-card p-4 min-w-[280px] transition-colors",
        isOver && "border-primary/40 bg-primary/5 ring-1 ring-primary/20",
      )}
    >
      <div className={cn("mb-4 rounded-2xl bg-gradient-to-br p-[1px]", accent)}>
        <div className="rounded-[15px] bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {isInterviewStage && <Mic className="h-3.5 w-3.5 text-purple-600 shrink-0" />}
              <h2 className="text-sm font-semibold truncate">{label}</h2>
            </div>
            <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-xs shrink-0", badge)}>
              {count}
            </Badge>
          </div>
        </div>
      </div>
      <div ref={setNodeRef} className="space-y-3 min-h-[80px]">
        {count === 0 ? (
          <div className={cn(
            "rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-xs text-muted-foreground transition-colors",
            isOver && "border-primary/40 bg-primary/10 text-primary",
          )}>
            {isOver ? t("recruiterCandidates.column.dropHere") : t("recruiterCandidates.column.empty")}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RecruiterCandidatesPage() {
  const { id: postingId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { t } = useLanguage();


  const [selectedEntry, setSelectedEntry] = React.useState<PipelineEntry | null>(null);
  const [sessionEntry, setSessionEntry] = React.useState<PipelineEntry | null>(null);
  const [movingEntryId, setMovingEntryId] = React.useState<string | null>(null);
  const [stageModalOpen, setStageModalOpen] = React.useState(false);
  const [activeEntry, setActiveEntry] = React.useState<PipelineEntry | null>(null);
  const [activeColumnData, setActiveColumnData] = React.useState<{ isInterviewStage: boolean; interviewStageId: string | null } | null>(null);

  const { data, isLoading } = useQuery<PipelineResponse>({
    queryKey: ["recruiterPipeline", postingId],
    queryFn: () => api.get(`/api/recruiter/postings/${postingId}/pipeline`),
    enabled: Boolean(postingId),
  });


  const postingTitle = data?.posting?.title ?? t("recruiterCandidates.page.postingFallback");

  useSetPageMetadata({
    title: t("recruiterCandidates.page.title"),
    description: t("recruiterCandidates.page.description"),
    breadcrumbs: [
      { label: t("nav.dashboard"), href: "/dashboard" },
      { label: t("nav.recruiterPostings"), href: "/recruiter/postings" },
      { label: t("recruiterPostings.title"), href: "/recruiter/postings" },
      { label: postingTitle },
      { label: t("recruiterCandidates.page.title") },
    ],
    showBreadcrumbs: true,
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
        title: t("recruiterCandidates.toasts.moveErrorTitle"),
        description: err instanceof Error ? err.message : t("recruiterCandidates.tryAgain"),
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

  const REGULAR_STAGES = new Set(["RECEIVED", "REVIEWING", "INTERVIEW", "OFFER", "REJECTED", "ACCEPTED"]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleDragStart(event: { active: { id: string | number; data: { current?: { entryId?: string; isInterviewStage?: boolean; interviewStageId?: string | null } } } }) {
    const entryId = event.active.id as string;
    const found = pipeline.find(e => e.id === entryId) ?? null;
    setActiveEntry(found);
    const colData = event.active.data.current;
    setActiveColumnData(colData ? { isInterviewStage: colData.isInterviewStage ?? false, interviewStageId: colData.interviewStageId ?? null } : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveEntry(null);
    setActiveColumnData(null);
    const { active, over } = event;
    if (!over) return;
    const entryId = active.id as string;
    const overId = over.id as string;
    const entry = pipeline.find(e => e.id === entryId);
    if (!entry) return;
    if (REGULAR_STAGES.has(overId)) {
      if (entry.currentStage !== overId) {
        moveMutation.mutate({ entryId, stage: overId as PipelineStage });
      }
    } else {
      moveMutation.mutate({ entryId, stage: "INTERVIEW", recruitmentStageId: overId });
    }
  }

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
                {t("recruiterCandidates.page.backToPostings")}
              </Link>
            </Button>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">{t("recruiterCandidates.page.title")}</h1>
                <p className="text-sm text-muted-foreground">
                  {t("recruiterCandidates.page.description")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-2"
                >
                  <Link href={`/jobs/${postingId}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    {t("recruiterCandidates.page.viewPublicJob")}
                  </Link>
                </Button>
                <div className="flex gap-3 text-sm">
                  <div className="rounded-2xl border border-border bg-background px-4 py-2 text-center">
                    <div className="text-xl font-bold">{totalCount}</div>
                    <div className="text-xs text-muted-foreground">{t("recruiterCandidates.page.stats.candidates")}</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-background px-4 py-2 text-center">
                    <div className="text-xl font-bold">{analyzedCount}</div>
                    <div className="text-xs text-muted-foreground">{t("recruiterCandidates.page.stats.analyzed")}</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-background px-4 py-2 text-center">
                    <div className={cn("text-xl font-bold", avgScore !== null ? getFitScoreColor(avgScore) : "")}>
                      {avgScore !== null ? `${avgScore}` : "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">{t("recruiterCandidates.page.stats.averageScore")}</div>
                  </div>
                </div>
                <Button
                  onClick={() => setStageModalOpen(true)}
                  className="rounded-2xl gap-2 bg-purple-600 hover:bg-purple-700 text-white shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  {t("recruiterCandidates.page.newInterviewStage")}
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
                  {t("recruiterCandidates.stageModal.questionCountOption", { count: stage.questionCount })}
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
            <h2 className="text-xl font-semibold">{t("recruiterCandidates.page.emptyTitle")}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {t("recruiterCandidates.page.emptyDescription")}
            </p>
          </section>
        )}

        {/* Kanban */}
        {stageGroups.length > 0 && (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => { setActiveEntry(null); setActiveColumnData(null); }}
          >
            <div className="overflow-x-auto pb-4">
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${stageGroups.length}, minmax(280px, 1fr))` }}
              >
                {stageGroups.map(({ stage, label, isInterviewStage, stageId, candidates: entries }) => {
                  const colorKey = isInterviewStage ? "INTERVIEW_STAGE" : (STAGE_COLORS[stage] ? stage : "RECEIVED");
                  const { accent, badge } = STAGE_COLORS[colorKey] ?? STAGE_COLORS.RECEIVED;
                  const columnId = isInterviewStage && stageId ? stageId : stage;

                  return (
                    <KanbanColumn
                      key={stage}
                      columnId={columnId}
                      accent={accent}
                      badge={badge}
                      label={label}
                      isInterviewStage={isInterviewStage}
                      count={entries.length}
                    >
                      {entries.map((entry) => (
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
                      ))}
                    </KanbanColumn>
                  );
                })}
              </div>
            </div>

            <DragOverlay>
              {activeEntry ? (
                <CandidateCard
                  entry={activeEntry}
                  postingId={postingId}
                  isInterviewStageColumn={activeColumnData?.isInterviewStage ?? false}
                  interviewStageId={activeColumnData?.interviewStageId ?? null}
                  publishedInterviewStages={publishedInterviewStages}
                  onViewAnalysis={() => {}}
                  onViewSessions={() => {}}
                  onMove={() => {}}
                  onMoveToInterviewStage={() => {}}
                  isMoving={false}
                  isDragOverlay
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </>
  );
}

"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useSetPageMetadata } from "@/contexts/page-metadata";
import { useLanguage } from "@/contexts/language";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  PenLine,
  Sparkles,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Target,
  TrendingUp,
  ArrowRightLeft,
  Lightbulb,
  Shield,
  Microscope,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EssaysResponse {
  essays: Record<string, { id: string; type: string; status: string } | null>;
}

interface EssayDetailResponse {
  essay: {
    id: string;
    type: string;
    status: string;
    content: string;
    wordCount: number;
    latestScore: number | null;
    analysisCount: number;
    analyses: {
      id: string;
      versionNumber: number;
      score: number;
      status: string;
      feedback: Feedback;
      wordCount: number;
      createdAt: string;
    }[];
  };
}

interface Criterio {
  nome: string;
  nota: number;
  status: string;
  justificativa: string;
}

interface PontoForte {
  titulo: string;
  descricao: string;
  citacao?: string;
}

interface PontoMelhoria {
  prioridade: string;
  problema: string;
  recomendacao: string;
  exemplo_reformulacao?: string;
  impacto_esperado?: string;
}

interface SugestaoReescrita {
  original: string;
  sugerido: string;
  explicacao: string;
}

interface ViabilidadeProjeto {
  avaliacao: string;
  compatibilidade_host: string;
  alertas: string[];
}

interface ComentarioFinal {
  sintese: string;
  top_3_prioridades: string[];
  probabilidade_aprovacao: string;
  readiness_entrevista?: string;
}

interface Feedback {
  nota_geral: number;
  status: string;
  criterios: Criterio[];
  pontos_fortes: PontoForte[];
  pontos_melhoria: PontoMelhoria[];
  sugestoes_reescrita: SugestaoReescrita[];
  viabilidade_projeto?: ViabilidadeProjeto;
  alertas_criticos: string[];
  comentario_final: ComentarioFinal;
}

function ScoreBar({ score }: { score: number }) {
  const barColor = score >= 7 ? "bg-emerald-500" : score >= 5 ? "bg-amber-400" : "bg-red-400";
  const scoreColor = score >= 7 ? "text-emerald-600" : score >= 5 ? "text-amber-600" : "text-red-500";

  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-700", barColor)} style={{ width: `${score * 10}%` }} />
      </div>
      <div className="flex items-baseline gap-0.5 shrink-0">
        <span className={cn("text-2xl font-bold tabular-nums", scoreColor)}>{score}</span>
        <span className="text-sm text-muted-foreground">/10</span>
      </div>
    </div>
  );
}

function CriterioBar({ criterio }: { criterio: Criterio }) {
  const [open, setOpen] = useState(false);
  const barColor = criterio.nota >= 7 ? "bg-emerald-500" : criterio.nota >= 5 ? "bg-amber-400" : "bg-red-400";
  const scoreColor = criterio.nota >= 7 ? "text-emerald-600" : criterio.nota >= 5 ? "text-amber-600" : "text-red-500";

  return (
    <div>
      <button onClick={() => setOpen(!open)} className="w-full text-left group">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-foreground">{criterio.nome}</span>
          <div className="flex items-center gap-2">
            <span className={cn("text-sm font-bold tabular-nums", scoreColor)}>{criterio.nota}</span>
            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
          </div>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-500", barColor)} style={{ width: `${criterio.nota * 10}%` }} />
        </div>
      </button>
      {open && (
        <p className="text-sm text-muted-foreground mt-2 pl-0.5 pb-1">{criterio.justificativa}</p>
      )}
    </div>
  );
}

export default function FulbrightFeedbackPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);
  const router = useRouter();
  const { t } = useLanguage();

  const TYPE_MAP: Record<string, { enum: string; label: string }> = {
    "grant-purpose": { enum: "GRANT_PURPOSE", label: t("fulbright.essayTypes.GRANT_PURPOSE") },
    "personal-statement": { enum: "PERSONAL_STATEMENT", label: t("fulbright.essayTypes.PERSONAL_STATEMENT") },
  };

  const typeInfo = TYPE_MAP[type];

  const getApprovalInfo = (prob: string) => {
    switch (prob) {
      case "ALTA": return { label: t("feedback.approvalHigh"), color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", desc: t("feedback.approvalHighDesc") };
      case "MEDIA": return { label: t("feedback.approvalMedium"), color: "text-amber-600", bg: "bg-amber-50 border-amber-200", desc: t("feedback.approvalMediumDesc") };
      default: return { label: t("feedback.approvalLow"), color: "text-red-600", bg: "bg-red-50 border-red-200", desc: t("feedback.approvalLowDesc") };
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "COMPETITIVO": return { label: t("feedback.statusCompetitive"), color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
      case "REQUER_MELHORIAS": return { label: t("feedback.statusNeedsImprovement"), color: "text-amber-700 bg-amber-50 border-amber-200" };
      case "CRITICO": return { label: t("feedback.statusCritical"), color: "text-red-700 bg-red-50 border-red-200" };
      default: return { label: status, color: "text-muted-foreground bg-muted border-border" };
    }
  };

  const PriorityTag = ({ priority }: { priority: string }) => {
    const styles = {
      CRITICO: "bg-red-50 text-red-700 border-red-200",
      IMPORTANTE: "bg-amber-50 text-amber-700 border-amber-200",
      RECOMENDADO: "bg-blue-50 text-blue-700 border-blue-200",
    };
    const labels: Record<string, string> = {
      CRITICO: t("feedback.priorityCritical"),
      IMPORTANTE: t("feedback.priorityImportant"),
      RECOMENDADO: t("feedback.priorityRecommended"),
    };
    return (
      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", styles[priority as keyof typeof styles] || "bg-muted text-muted-foreground border-border")}>
        {labels[priority] || priority}
      </span>
    );
  };

  useSetPageMetadata({
    title: "",
    description: "",
    breadcrumbs: [
      { label: t("nav.fulbright"), href: "/fulbright" },
      { label: typeInfo?.label ?? "Essay", href: `/fulbright/essay/${type}` },
      { label: t("feedback.feedback") },
    ],
  });

  const { data: essaysData, isLoading: loadingEssays } = useQuery<EssaysResponse>({
    queryKey: ["fulbright-essays"],
    queryFn: () => api.get("/api/fulbright/essays"),
  });

  const essayId = essaysData?.essays?.[typeInfo?.enum ?? ""]?.id;

  const { data: detailData, isLoading: loadingDetail } = useQuery<EssayDetailResponse>({
    queryKey: ["fulbright-essay-detail", essayId],
    queryFn: () => api.get(`/api/fulbright/essays/${essayId}`),
    enabled: !!essayId,
  });

  const isLoading = loadingEssays || loadingDetail;

  if (!typeInfo) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">{t("editor.invalidType")}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/fulbright")}>
          {t("common.back")}
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  const essay = detailData?.essay;
  const latestAnalysis = essay?.analyses?.[0];
  const feedback = latestAnalysis?.feedback;

  if (!essay || !latestAnalysis || !feedback) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-muted-foreground">{t("feedback.noAnalysis")}</p>
        <Button onClick={() => router.push(`/fulbright/essay/${type}`)}>
          <PenLine className="h-4 w-4" />
          {t("feedback.goToEditor")}
        </Button>
      </div>
    );
  }

  const priorityOrder = { CRITICO: 0, IMPORTANTE: 1, RECOMENDADO: 2 };
  const sortedMelhorias = [...(feedback.pontos_melhoria || [])].sort(
    (a, b) =>
      (priorityOrder[a.prioridade as keyof typeof priorityOrder] ?? 3) -
      (priorityOrder[b.prioridade as keyof typeof priorityOrder] ?? 3)
  );

  const statusStyle = getStatusStyle(feedback.status);
  const approvalInfo = getApprovalInfo(feedback.comentario_final?.probabilidade_aprovacao);

  return (
    <div className="space-y-5">
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-lg font-bold text-foreground">{typeInfo.label}</h2>
              <Badge className={cn("text-xs border", statusStyle.color)}>
                {statusStyle.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("common.version")} {latestAnalysis.versionNumber} · {new Date(latestAnalysis.createdAt).toLocaleDateString()} · {essay.wordCount} {t("common.words")}
            </p>
          </div>
          <ScoreBar score={feedback.nota_geral} />
        </div>

        <div className={cn("rounded-xl border p-4 flex items-start gap-3", approvalInfo.bg)}>
          <Shield className={cn("h-5 w-5 shrink-0 mt-0.5", approvalInfo.color)} />
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-semibold text-foreground">{t("feedback.approvalProbability")}</span>
              <span className={cn("text-sm font-bold", approvalInfo.color)}>{approvalInfo.label}</span>
            </div>
            <p className="text-sm text-muted-foreground">{approvalInfo.desc}</p>
          </div>
        </div>
      </div>

      {feedback.alertas_criticos && feedback.alertas_criticos.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <h3 className="text-sm font-semibold text-red-800">{t("feedback.criticalAlerts")}</h3>
          </div>
          <ul className="space-y-2">
            {feedback.alertas_criticos.map((alerta, i) => (
              <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                <span className="text-red-400 shrink-0 mt-1">•</span>
                {alerta}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {feedback.criterios && feedback.criterios.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">{t("feedback.criteriaAssessment")}</h3>
            </div>
            <div className="space-y-4">
              {feedback.criterios.map((criterio, i) => (
                <CriterioBar key={i} criterio={criterio} />
              ))}
            </div>
          </div>
        )}

        {feedback.pontos_fortes && feedback.pontos_fortes.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-foreground">{t("feedback.strengths")}</h3>
            </div>
            <div className="space-y-3">
              {feedback.pontos_fortes.map((ponto, i) => (
                <div key={i} className="rounded-xl bg-emerald-50/50 border border-emerald-100 p-3.5">
                  <h4 className="text-sm font-medium text-foreground">{ponto.titulo}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{ponto.descricao}</p>
                  {ponto.citacao && (
                    <blockquote className="mt-2 border-l-2 border-emerald-300 pl-3 text-xs italic text-muted-foreground">
                      &ldquo;{ponto.citacao}&rdquo;
                    </blockquote>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {feedback.viabilidade_projeto && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Microscope className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-foreground">{t("feedback.projectViability")}</h3>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{feedback.viabilidade_projeto.avaliacao}</p>
            {feedback.viabilidade_projeto.compatibilidade_host && (
              <div className="rounded-xl bg-blue-50/50 border border-blue-100 p-3.5">
                <h4 className="text-sm font-medium text-foreground mb-1">{t("feedback.hostCompatibility")}</h4>
                <p className="text-sm text-muted-foreground">{feedback.viabilidade_projeto.compatibilidade_host}</p>
              </div>
            )}
            {feedback.viabilidade_projeto.alertas && feedback.viabilidade_projeto.alertas.length > 0 && (
              <div className="space-y-1.5">
                {feedback.viabilidade_projeto.alertas.map((alerta, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-amber-700">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    {alerta}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {sortedMelhorias.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">{t("feedback.improvements")}</h3>
          </div>
          <div className="space-y-3">
            {sortedMelhorias.map((melhoria, i) => (
              <div key={i} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center gap-2 mb-2">
                  <PriorityTag priority={melhoria.prioridade} />
                </div>
                <p className="text-sm font-medium text-foreground">{melhoria.problema}</p>
                <div className="mt-2 rounded-lg bg-muted/50 p-3 space-y-1.5">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{t("feedback.recommendation")}</span> {melhoria.recomendacao}
                  </p>
                  {melhoria.exemplo_reformulacao && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{t("feedback.example")}</span> {melhoria.exemplo_reformulacao}
                    </p>
                  )}
                </div>
                {melhoria.impacto_esperado && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" />
                    {melhoria.impacto_esperado}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {feedback.sugestoes_reescrita && feedback.sugestoes_reescrita.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">{t("feedback.rewriteSuggestions")}</h3>
          </div>
          <div className="space-y-4">
            {feedback.sugestoes_reescrita.map((sugestao, i) => (
              <div key={i} className="rounded-xl border border-border overflow-hidden">
                <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                  <div className="p-3.5 bg-red-50/40">
                    <p className="text-xs font-medium text-red-500 mb-1.5 uppercase tracking-wide">{t("feedback.original")}</p>
                    <p className="text-sm text-foreground">{sugestao.original}</p>
                  </div>
                  <div className="p-3.5 bg-emerald-50/40">
                    <p className="text-xs font-medium text-emerald-600 mb-1.5 uppercase tracking-wide">{t("feedback.suggested")}</p>
                    <p className="text-sm text-foreground">{sugestao.sugerido}</p>
                  </div>
                </div>
                <div className="px-3.5 py-2.5 bg-muted/30 border-t border-border">
                  <p className="text-xs text-muted-foreground">{sugestao.explicacao}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {feedback.comentario_final && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">{t("feedback.synthesis")}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{feedback.comentario_final.sintese}</p>

          {feedback.comentario_final.readiness_entrevista && (
            <div className="mt-4 rounded-xl bg-blue-50/50 border border-blue-100 p-3.5">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                <h4 className="text-sm font-medium text-foreground">{t("feedback.interviewReadiness")}</h4>
              </div>
              <p className="text-sm text-muted-foreground">{feedback.comentario_final.readiness_entrevista}</p>
            </div>
          )}

          {feedback.comentario_final.top_3_prioridades && feedback.comentario_final.top_3_prioridades.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm font-semibold text-foreground mb-2.5">{t("feedback.nextSteps")}</p>
              <ol className="space-y-2">
                {feedback.comentario_final.top_3_prioridades.map((p, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                    <span className="text-muted-foreground">{p}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 pb-4">
        <Button variant="outline" onClick={() => router.push(`/fulbright/essay/${type}`)}>
          <PenLine className="h-4 w-4" />
          {t("feedback.editEssay")}
        </Button>
        <Button onClick={() => router.push(`/fulbright/essay/${type}`)}>
          <Sparkles className="h-4 w-4" />
          {t("feedback.newAnalysis")}
        </Button>
      </div>
    </div>
  );
}

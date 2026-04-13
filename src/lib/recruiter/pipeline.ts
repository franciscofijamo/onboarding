export const PIPELINE_STAGES = [
  "RECEIVED",
  "REVIEWING",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "ACCEPTED"
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  RECEIVED: "Recebidas",
  REVIEWING: "Em Análise",
  INTERVIEW: "Entrevista",
  OFFER: "Proposta",
  REJECTED: "Rejeitado",
  ACCEPTED: "Aceite",
};

export const PIPELINE_STAGE_TRANSITIONS: Record<PipelineStage, PipelineStage | null> = {
  RECEIVED: "REVIEWING",
  REVIEWING: "INTERVIEW",
  INTERVIEW: "OFFER",
  OFFER: "ACCEPTED",
  REJECTED: null,
  ACCEPTED: null,
};

export const JOB_APPLICATION_STATUSES = [
  "DRAFT",
  "ANALYZING",
  "ANALYZED",
  "APPLIED",
  "INTERVIEWING",
  "OFFERED",
  "REJECTED",
  "ACCEPTED",
] as const;

export type JobApplicationStatus = (typeof JOB_APPLICATION_STATUSES)[number];

export const KANBAN_STAGES = ["IN_PROGRESS", "APPLIED", "INTERVIEW"] as const;

export type KanbanStage = (typeof KANBAN_STAGES)[number];

export function mapStatusToKanbanStage(
  status: JobApplicationStatus | string
): KanbanStage {
  switch (status) {
    case "APPLIED":
      return "APPLIED";
    case "INTERVIEWING":
    case "OFFERED":
    case "REJECTED":
    case "ACCEPTED":
      return "INTERVIEW";
    default:
      return "IN_PROGRESS";
  }
}

export function getStatusLabel(status: JobApplicationStatus | string): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "ANALYZING":
      return "Analyzing";
    case "ANALYZED":
      return "Ready to apply";
    case "APPLIED":
      return "Applied";
    case "INTERVIEWING":
      return "Interview";
    case "OFFERED":
      return "Offer received";
    case "REJECTED":
      return "Rejected";
    case "ACCEPTED":
      return "Accepted";
    default:
      return status;
  }
}

export function getOutcomeLabel(
  status: JobApplicationStatus | string
): string | null {
  switch (status) {
    case "OFFERED":
      return "Offer";
    case "REJECTED":
      return "Rejected";
    case "ACCEPTED":
      return "Accepted";
    default:
      return null;
  }
}

export function getStatusFromKanbanStage(
  stage: KanbanStage,
  currentStatus: JobApplicationStatus | string,
  hasAnalysis: boolean
): JobApplicationStatus {
  switch (stage) {
    case "APPLIED":
      return "APPLIED";
    case "INTERVIEW":
      return "INTERVIEWING";
    case "IN_PROGRESS":
    default:
      if (currentStatus === "ANALYZING") return "ANALYZING";
      return hasAnalysis ? "ANALYZED" : "DRAFT";
  }
}

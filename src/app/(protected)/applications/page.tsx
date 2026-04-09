"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Clock3,
  Mic,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useSetPageMetadata } from "@/contexts/page-metadata";
import { useLanguage } from "@/contexts/language";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  getStatusFromKanbanStage,
  KANBAN_STAGES,
  mapStatusToKanbanStage,
  type KanbanStage,
  type JobApplicationStatus,
} from "@/lib/job-application/kanban";

type AnalysisSummary = {
  id: string;
  fitScore: number | null;
  summary?: string | null;
  createdAt?: string;
};

type JobApplication = {
  id: string;
  jobTitle: string | null;
  companyName: string | null;
  status: JobApplicationStatus;
  updatedAt?: string;
  createdAt?: string;
  jobDescription?: string;
  analyses?: AnalysisSummary[];
};

type JobApplicationsResponse = {
  jobApplications: JobApplication[];
};

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

function getColumnMeta(t: TranslateFn): Record<
  KanbanStage,
  {
    title: string;
    description: string;
    accent: string;
    badgeClassName: string;
  }
> {
  return {
    IN_PROGRESS: {
      title: t("applicationsPage.columns.inProgress.title"),
      description: t("applicationsPage.columns.inProgress.description"),
      accent: "from-sky-500/20 via-sky-500/5 to-transparent",
      badgeClassName: "bg-sky-500/10 text-sky-700 border-sky-200",
    },
    APPLIED: {
      title: t("applicationsPage.columns.applied.title"),
      description: t("applicationsPage.columns.applied.description"),
      accent: "from-amber-500/20 via-amber-500/5 to-transparent",
      badgeClassName: "bg-amber-500/10 text-amber-700 border-amber-200",
    },
    INTERVIEW: {
      title: t("applicationsPage.columns.interview.title"),
      description: t("applicationsPage.columns.interview.description"),
      accent: "from-emerald-500/20 via-emerald-500/5 to-transparent",
      badgeClassName: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
    },
  };
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getAverageFitScore(apps: JobApplication[]) {
  const scores = apps
    .map((app) => app.analyses?.[0]?.fitScore)
    .filter((score): score is number => typeof score === "number");

  if (scores.length === 0) return null;
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

function getLocalizedStatusLabel(status: JobApplicationStatus | string, t: TranslateFn): string {
  switch (status) {
    case "DRAFT":
      return t("applicationsPage.status.draft");
    case "ANALYZING":
      return t("applicationsPage.status.analyzing");
    case "ANALYZED":
      return t("applicationsPage.status.readyToApply");
    case "APPLIED":
      return t("applicationsPage.status.applied");
    case "INTERVIEWING":
      return t("applicationsPage.status.interview");
    case "OFFERED":
      return t("applicationsPage.status.offerReceived");
    case "REJECTED":
      return t("applicationsPage.status.rejected");
    case "ACCEPTED":
      return t("applicationsPage.status.accepted");
    default:
      return status;
  }
}

function getLocalizedOutcomeLabel(status: JobApplicationStatus | string, t: TranslateFn): string | null {
  switch (status) {
    case "OFFERED":
      return t("applicationsPage.outcome.offer");
    case "REJECTED":
      return t("applicationsPage.outcome.rejected");
    case "ACCEPTED":
      return t("applicationsPage.outcome.accepted");
    default:
      return null;
  }
}

export default function ApplicationsPage() {
  const { t, locale } = useLanguage();

  useSetPageMetadata({
    title: t("applicationsPage.meta.title"),
    description: t("applicationsPage.meta.description"),
    showBreadcrumbs: true,
  });

  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = React.useState<JobApplication | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const router = useRouter();

  const { data, isLoading } = useQuery<JobApplicationsResponse>({
    queryKey: ["jobApplications"],
    queryFn: () => api.get("/api/job-application"),
  });

  const applications = React.useMemo(
    () => data?.jobApplications ?? [],
    [data?.jobApplications]
  );

  const filteredApplications = React.useMemo(() => {
    if (!search.trim()) return applications;
    const q = search.toLowerCase();
    return applications.filter(
      (a) =>
        (a.jobTitle ?? "").toLowerCase().includes(q) ||
        (a.companyName ?? "").toLowerCase().includes(q)
    );
  }, [applications, search]);

  const columnMeta = React.useMemo(() => getColumnMeta(t), [t]);

  const groupedApplications = React.useMemo(() => {
    const groups: Record<KanbanStage, JobApplication[]> = {
      IN_PROGRESS: [],
      APPLIED: [],
      INTERVIEW: [],
    };

    filteredApplications.forEach((application) => {
      groups[mapStatusToKanbanStage(application.status)].push(application);
    });

    return groups;
  }, [filteredApplications]);

  const averageFitScore = React.useMemo(
    () => getAverageFitScore(applications),
    [applications]
  );

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      nextStage,
      currentStatus,
      hasAnalysis,
    }: {
      id: string;
      nextStage: KanbanStage;
      currentStatus: JobApplicationStatus;
      hasAnalysis: boolean;
    }) => {
      const nextStatus = getStatusFromKanbanStage(nextStage, currentStatus, hasAnalysis);
      return api.patch<{ jobApplication: JobApplication }>(`/api/job-application/${id}`, {
        status: nextStatus,
      });
    },
    onMutate: async ({ id, nextStage }) => {
      await queryClient.cancelQueries({ queryKey: ["jobApplications"] });
      const previous = queryClient.getQueryData<JobApplicationsResponse>(["jobApplications"]);

      queryClient.setQueryData<JobApplicationsResponse>(["jobApplications"], (current) => {
        if (!current) return current;

        return {
          jobApplications: current.jobApplications.map((application) => {
            if (application.id !== id) return application;

            const nextStatus = getStatusFromKanbanStage(
              nextStage,
              application.status,
              Boolean(application.analyses?.[0])
            );

            return {
              ...application,
              status: nextStatus,
              updatedAt: new Date().toISOString(),
            };
          }),
        };
      });

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["jobApplications"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["jobApplications"] });
    },
  });

  const deleteApplicationMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete<{ success: boolean }>(`/api/job-application/${id}`);
    },
    onSuccess: () => {
      setDeleteTarget(null);
      setDeleteError(null);
      queryClient.invalidateQueries({ queryKey: ["jobApplications"] });
    },
    onError: (error) => {
      setDeleteError(
        error instanceof Error ? error.message : t("applicationsPage.errors.deleteFailed")
      );
    },
  });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteApplicationMutation.mutateAsync(deleteTarget.id);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-3xl" />
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <>
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleteApplicationMutation.isPending) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("applicationsPage.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("applicationsPage.delete.description")}
            </AlertDialogDescription>
            {deleteTarget && (
              <div className="text-sm text-foreground">
                <span className="font-medium">
                  {deleteTarget.jobTitle || t("applicationsPage.defaults.untitledRole")}
                </span>
                <span className="text-muted-foreground">
                  {" "}· {deleteTarget.companyName || t("applicationsPage.defaults.companyNotDefined")}
                </span>
              </div>
            )}
            {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteApplicationMutation.isPending}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteApplicationMutation.isPending}
            >
              {deleteApplicationMutation.isPending
                ? t("applicationsPage.actions.deleting")
                : t("applicationsPage.actions.delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_35%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                {t("applicationsPage.hero.badge")}
              </Badge>
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {t("applicationsPage.hero.title")}
                </h1>
                <p className="text-sm text-muted-foreground sm:text-base">
                  {t("applicationsPage.hero.description")}
                </p>
              </div>
            </div>
            <Button asChild size="lg" className="rounded-2xl">
              <Link href="/onboarding?new=1">
                <Plus className="h-4 w-4" />
                {t("applicationsPage.actions.newApplication")}
              </Link>
            </Button>
          </div>
        </section>

        {applications.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Briefcase className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold">{t("applicationsPage.empty.title")}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {t("applicationsPage.empty.description")}
            </p>
            <Button asChild className="mt-6 rounded-2xl">
              <Link href="/onboarding?new=1">
                <Plus className="h-4 w-4" />
                {t("applicationsPage.empty.cta")}
              </Link>
            </Button>
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-3xl border border-border bg-card p-5">
                <p className="text-sm text-muted-foreground">{t("applicationsPage.stats.total")}</p>
                <p className="mt-3 text-3xl font-semibold">{applications.length}</p>
              </div>
              <div className="rounded-3xl border border-border bg-card p-5">
                <p className="text-sm text-muted-foreground">{t("applicationsPage.stats.inProgress")}</p>
                <p className="mt-3 text-3xl font-semibold">{groupedApplications.IN_PROGRESS.length}</p>
              </div>
              <div className="rounded-3xl border border-border bg-card p-5">
                <p className="text-sm text-muted-foreground">{t("applicationsPage.stats.applied")}</p>
                <p className="mt-3 text-3xl font-semibold">{groupedApplications.APPLIED.length}</p>
              </div>
              <div className="rounded-3xl border border-border bg-card p-5">
                <p className="text-sm text-muted-foreground">{t("applicationsPage.stats.interview")}</p>
                <p className="mt-3 text-3xl font-semibold">{groupedApplications.INTERVIEW.length}</p>
              </div>
              <div className="rounded-3xl border border-border bg-card p-5">
                <p className="text-sm text-muted-foreground">{t("applicationsPage.stats.averageFitScore")}</p>
                <p className="mt-3 text-3xl font-semibold">
                  {averageFitScore !== null ? `${averageFitScore}/100` : "—"}
                </p>
              </div>
            </section>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by job title or company..."
                className="pl-9 pr-9 rounded-2xl"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {filteredApplications.length === 0 && search && (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No results for &ldquo;{search}&rdquo;</p>
                <button onClick={() => setSearch("")} className="text-sm text-primary mt-2 hover:underline">
                  Clear search
                </button>
              </div>
            )}

            <section className="grid gap-4 xl:grid-cols-3">
              {KANBAN_STAGES.map((stage) => {
                const meta = columnMeta[stage];
                const stageApplications = groupedApplications[stage];

                return (
                  <div
                    key={stage}
                    className="rounded-3xl border border-border bg-card p-4"
                  >
                    <div className={cn("mb-4 rounded-2xl bg-gradient-to-br p-[1px]", meta.accent)}>
                      <div className="rounded-[15px] bg-card p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h2 className="text-lg font-semibold">{meta.title}</h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {meta.description}
                            </p>
                          </div>
                          <Badge variant="outline" className={cn("rounded-full px-3 py-1", meta.badgeClassName)}>
                            {stageApplications.length}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {stageApplications.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                          {t("applicationsPage.columns.empty")}
                        </div>
                      ) : (
                        stageApplications.map((application) => {
                          const latestAnalysis = application.analyses?.[0];
                          const currentStage = mapStatusToKanbanStage(application.status);
                          const outcomeLabel = getLocalizedOutcomeLabel(application.status, t);
                          const isUpdating = updateStatusMutation.isPending &&
                            updateStatusMutation.variables?.id === application.id;
                          const isDeleting = deleteApplicationMutation.isPending &&
                            deleteTarget?.id === application.id;

                          const updatedAtText = application.updatedAt
                            ? t("applicationsPage.updatedAt", { date: formatDate(application.updatedAt, locale) })
                            : t("applicationsPage.recentlyUpdated");

                          return (
                            <article
                              key={application.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => router.push(`/onboarding?applicationId=${application.id}`)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  router.push(`/onboarding?applicationId=${application.id}`);
                                }
                              }}
                              className="cursor-pointer rounded-2xl border border-border bg-background p-4 transition-all hover:border-primary/40 hover:bg-muted/30"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 space-y-3">
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="font-semibold leading-tight">
                                        {application.jobTitle || t("applicationsPage.defaults.untitledRole")}
                                      </p>
                                      <Badge variant="outline">
                                        {getLocalizedStatusLabel(application.status, t)}
                                      </Badge>
                                      {outcomeLabel && (
                                        <Badge className="bg-emerald-500 text-white hover:bg-emerald-600">
                                          {outcomeLabel}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Building2 className="h-4 w-4" />
                                      <span className="truncate">
                                        {application.companyName || t("applicationsPage.defaults.companyNotDefined")}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                                      <Clock3 className="h-3 w-3" />
                                      {updatedAtText}
                                    </span>
                                    {latestAnalysis?.fitScore !== null && latestAnalysis?.fitScore !== undefined && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                                        <Sparkles className="h-3 w-3" />
                                        {t("applicationsPage.fitChip", { score: Math.round(latestAnalysis.fitScore) })}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 space-y-3" onClick={(event) => event.stopPropagation()}>
                                <Select
                                  value={currentStage}
                                  onValueChange={(value) => {
                                    const nextStage = value as KanbanStage;
                                    if (nextStage === currentStage) return;

                                    updateStatusMutation.mutate({
                                      id: application.id,
                                      nextStage,
                                      currentStatus: application.status,
                                      hasAnalysis: Boolean(application.analyses?.[0]),
                                    });
                                  }}
                                >
                                  <SelectTrigger className="rounded-xl">
                                    <SelectValue placeholder={t("applicationsPage.actions.moveToStage")} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="IN_PROGRESS">{t("applicationsPage.columns.inProgress.title")}</SelectItem>
                                    <SelectItem value="APPLIED">{t("applicationsPage.columns.applied.title")}</SelectItem>
                                    <SelectItem value="INTERVIEW">{t("applicationsPage.columns.interview.title")}</SelectItem>
                                  </SelectContent>
                                </Select>

                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Button asChild variant="outline" size="sm" className="rounded-xl">
                                      <Link href={`/onboarding?applicationId=${application.id}`}>
                                        Editar
                                        <ArrowRight className="h-4 w-4" />
                                      </Link>
                                    </Button>
                                    <Button asChild variant="outline" size="sm" className="rounded-xl border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 hover:border-green-300">
                                      <Link href={`/scenarios?jobApplicationId=${application.id}`}>
                                        <Mic className="h-4 w-4" />
                                        Practice Interview
                                      </Link>
                                    </Button>
                                    {isUpdating && (
                                      <span className="text-xs text-muted-foreground">
                                        {t("applicationsPage.actions.updatingStage")}
                                      </span>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-xl h-8 w-8 shrink-0 text-red-400 hover:text-red-500 hover:bg-red-50"
                                    onClick={() => {
                                      setDeleteError(null);
                                      setDeleteTarget(application);
                                    }}
                                    disabled={isDeleting}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </article>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          </>
        )}
      </div>
    </>
  );
}

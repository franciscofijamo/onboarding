"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Sparkles, ArrowRight, Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { useSetPageMetadata } from "@/contexts/page-metadata";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

type AnalysisSummary = {
  id: string;
  fitScore: number | null;
  createdAt?: string;
};

type JobApplication = {
  id: string;
  jobTitle: string | null;
  companyName: string | null;
  status: string;
  updatedAt?: string;
  analyses?: AnalysisSummary[];
};

export default function ApplicationsPage() {
  useSetPageMetadata({
    title: "Applications",
    description: "Create and manage each job application flow",
    showBreadcrumbs: true,
  });

  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = React.useState<JobApplication | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const { data, isLoading } = useQuery<{ jobApplications: JobApplication[] }>({
    queryKey: ["jobApplications"],
    queryFn: () => api.get("/api/job-application"),
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
        error instanceof Error ? error.message : "Failed to delete application"
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
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  const apps = data?.jobApplications || [];

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
            <AlertDialogTitle>Delete application?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected application and analysis history will be permanently removed.
            </AlertDialogDescription>
            {deleteTarget && (
              <div className="text-sm text-foreground">
                <span className="font-medium">{deleteTarget.jobTitle || "Untitled Role"}</span>
                <span className="text-muted-foreground"> · {deleteTarget.companyName || "Company not defined"}</span>
              </div>
            )}
            {deleteError && (
              <p className="text-sm text-destructive">{deleteError}</p>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteApplicationMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteApplicationMutation.isPending}
            >
              {deleteApplicationMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="w-full space-y-6">
        <div className="flex justify-end">
          <Button asChild>
            <Link href="/onboarding?new=1">
              <Plus className="h-4 w-4" />
              New Application
            </Link>
          </Button>
        </div>

        {apps.length === 0 && (
          <div className="bg-card rounded-2xl border border-border p-10 text-center space-y-3">
            <p className="text-base font-medium">No applications yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first application to start CV analysis.
            </p>
            <div>
              <Button asChild>
                <Link href="/onboarding?new=1">
                  <Plus className="h-4 w-4" />
                  Create First Application
                </Link>
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-4">
          {apps.map((app) => {
            const latest = app.analyses?.[0];
            const deletingCurrent =
              deleteApplicationMutation.isPending &&
              deleteTarget?.id === app.id;

            return (
              <div
                key={app.id}
                className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold truncate">
                      {app.jobTitle || "Untitled Role"}
                    </p>
                    <Badge variant="outline">{app.status}</Badge>
                    {latest?.fitScore !== null && latest?.fitScore !== undefined && (
                      <Badge variant="secondary" className="gap-1">
                        <Sparkles className="h-3 w-3" />
                        {Math.round(latest.fitScore)} / 100
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {app.companyName || "Company not defined"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteTarget(app);
                    }}
                    disabled={deleteApplicationMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                    {deletingCurrent ? "Deleting..." : "Delete"}
                  </Button>
                  <Button asChild>
                    <Link href={`/onboarding?applicationId=${app.id}`}>
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

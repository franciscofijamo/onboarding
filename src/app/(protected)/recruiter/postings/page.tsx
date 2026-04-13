"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Edit2,
  Eye,
  LayoutGrid,
  Loader2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn, formatDate } from "@/lib/utils";
import { useSetPageMetadata } from "@/contexts/page-metadata";
import {
  CATEGORY_LABELS,
  JOB_TYPE_LABELS,
  SALARY_RANGE_LABELS,
  KANBAN_COLUMNS,
  type JobPosting,
  type JobPostingStatus,
} from "@/lib/recruiter/postings";

type PostingsResponse = { postings: JobPosting[] };



export default function RecruiterPostingsPage() {
  useSetPageMetadata({
    title: "Publicações",
    description: "Gerencie as suas vagas de emprego",
    showBreadcrumbs: true,
  });

  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = React.useState<JobPosting | null>(null);
  const [closeTarget, setCloseTarget] = React.useState<JobPosting | null>(null);

  const { data, isLoading } = useQuery<PostingsResponse>({
    queryKey: ["recruiterPostings"],
    queryFn: () => api.get("/api/recruiter/postings"),
  });

  const postings = data?.postings ?? [];

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: JobPostingStatus }) =>
      api.put(`/api/recruiter/postings/${id}`, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["recruiterPostings"] });
      const previous = queryClient.getQueryData<PostingsResponse>(["recruiterPostings"]);
      queryClient.setQueryData<PostingsResponse>(["recruiterPostings"], (cur) =>
        cur ? { postings: cur.postings.map((p) => (p.id === id ? { ...p, status } : p)) } : cur
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["recruiterPostings"], ctx.previous);
      toast({ title: "Erro ao actualizar estado", variant: "destructive" });
    },
    onSuccess: () => {
      toast({ title: "Estado da vaga actualizado" });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["recruiterPostings"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/recruiter/postings/${id}`),
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["recruiterPostings"] });
      toast({ title: "Vaga eliminada com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao eliminar vaga", variant: "destructive" });
    },
  });

  const grouped = React.useMemo(() => {
    const map: Record<JobPostingStatus, JobPosting[]> = {
      DRAFT: [],
      PUBLISHED: [],
      PAUSED: [],
      CLOSED: [],
    };
    postings.forEach((p) => map[p.status].push(p));
    return map;
  }, [postings]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar vaga?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acção é permanente e não pode ser revertida.
            </AlertDialogDescription>
            {deleteTarget && (
              <p className="text-sm font-medium">{deleteTarget.title}</p>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Eliminar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(closeTarget)} onOpenChange={(open) => { if (!open) setCloseTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar vaga?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta vaga ficará indisponível para novas candidaturas. Pode reabrir mais tarde.
            </AlertDialogDescription>
            {closeTarget && (
              <p className="text-sm font-medium">{closeTarget.title}</p>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateStatusMutation.isPending}>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={updateStatusMutation.isPending}
              onClick={() => {
                if (closeTarget) updateStatusMutation.mutate({ id: closeTarget.id, status: "CLOSED" });
                setCloseTarget(null);
              }}
            >
              {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Encerrar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.15),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.10),transparent_40%)]" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-primary" />
                <h1 className="text-2xl font-semibold tracking-tight">Publicações</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                {postings.length === 0
                  ? "Ainda não tem vagas publicadas."
                  : `${postings.length} vaga${postings.length !== 1 ? "s" : ""} no total`}
              </p>
            </div>
            <Button asChild className="rounded-2xl gap-2 shrink-0">
              <Link href="/recruiter/postings/new">
                <Plus className="h-4 w-4" />
                Nova Vaga
              </Link>
            </Button>
          </div>
        </section>

        {postings.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Briefcase className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold">Nenhuma vaga criada</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Crie a sua primeira vaga e comece a receber candidaturas.
            </p>
            <Button asChild className="mt-6 rounded-2xl gap-2">
              <Link href="/recruiter/postings/new">
                <Plus className="h-4 w-4" />
                Criar primeira vaga
              </Link>
            </Button>
          </section>
        ) : (
          <section className="grid gap-4 xl:grid-cols-4">
            {KANBAN_COLUMNS.map((col) => {
              const colPostings = grouped[col.status];
              return (
                <div key={col.status} className="rounded-3xl border border-border bg-card p-4">
                  <div className={cn("mb-4 rounded-2xl bg-gradient-to-br p-[1px]", col.accent)}>
                    <div className="rounded-[15px] bg-card p-4">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-base font-semibold">{col.label}</h2>
                        <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-xs", col.badgeClass)}>
                          {colPostings.length}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {colPostings.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">
                        Sem vagas aqui
                      </div>
                    ) : (
                      colPostings.map((posting) => (
                        <PostingCard
                          key={posting.id}
                          posting={posting}
                          onStatusChange={(status) =>
                            updateStatusMutation.mutate({ id: posting.id, status })
                          }
                          onDelete={() => setDeleteTarget(posting)}
                          onRequestClose={() => setCloseTarget(posting)}
                          isPending={
                            updateStatusMutation.isPending &&
                            updateStatusMutation.variables?.id === posting.id
                          }
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </>
  );
}

function PostingCard({
  posting,
  onStatusChange,
  onDelete,
  onRequestClose,
  isPending,
}: {
  posting: JobPosting;
  onStatusChange: (status: JobPostingStatus) => void;
  onDelete: () => void;
  onRequestClose: () => void;
  isPending: boolean;
}) {
  return (
    <article className="rounded-2xl border border-border bg-background p-4 space-y-3 group">
      <div className="space-y-1.5">
        <h3 className="text-sm font-medium leading-snug line-clamp-2">{posting.title}</h3>
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center rounded-full border border-border bg-muted/30 px-2 py-0.5 text-xs text-muted-foreground">
            {CATEGORY_LABELS[posting.category]}
          </span>
          <span className="inline-flex items-center rounded-full border border-border bg-muted/30 px-2 py-0.5 text-xs text-muted-foreground">
            {JOB_TYPE_LABELS[posting.jobType]}
          </span>
        </div>
        <p className="text-[11px] text-emerald-600 font-medium">{SALARY_RANGE_LABELS[posting.salaryRange]}</p>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{formatDate(posting.createdAt)}</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
            <Users className="h-2.5 w-2.5" />
            {posting.applicationCount}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1.5 pt-3 mt-1 border-t border-border/50">
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <>
            <Button asChild variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-primary hover:bg-primary/10" aria-label="Candidatos" title="Candidatos">
              <Link href={`/recruiter/postings/${posting.id}/candidates`}>
                <Users className="h-3.5 w-3.5" />
              </Link>
            </Button>

            <Button asChild variant="ghost" size="icon" className="h-7 w-7 rounded-lg" aria-label="Editar" title="Editar">
              <Link href={`/recruiter/postings/${posting.id}/edit`}>
                <Edit2 className="h-3.5 w-3.5" />
              </Link>
            </Button>

            {posting.status === "DRAFT" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-emerald-600 hover:bg-emerald-50"
                aria-label="Publicar"
                title="Publicar"
                onClick={() => onStatusChange("PUBLISHED")}
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
            )}
            {posting.status === "PUBLISHED" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-amber-600 hover:bg-amber-50"
                aria-label="Pausar"
                title="Pausar"
                onClick={() => onStatusChange("PAUSED")}
              >
                <Pause className="h-3.5 w-3.5" />
              </Button>
            )}
            {posting.status === "PAUSED" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-emerald-600 hover:bg-emerald-50"
                aria-label="Retomar"
                title="Retomar"
                onClick={() => onStatusChange("PUBLISHED")}
              >
                <Play className="h-3.5 w-3.5" />
              </Button>
            )}
            {posting.status === "CLOSED" && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-blue-600 hover:bg-blue-50"
                  aria-label="Reabrir"
                  title="Reabrir como rascunho"
                  onClick={() => onStatusChange("DRAFT")}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-emerald-600 hover:bg-emerald-50"
                  aria-label="Reabrir e publicar"
                  title="Reabrir e publicar"
                  onClick={() => onStatusChange("PUBLISHED")}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            {posting.status !== "CLOSED" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-rose-500 hover:bg-rose-50"
                aria-label="Encerrar"
                title="Encerrar"
                onClick={onRequestClose}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10"
              aria-label="Eliminar"
              title="Eliminar"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </article>
  );
}

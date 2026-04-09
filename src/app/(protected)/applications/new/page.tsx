"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle2,
  Loader2,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSetPageMetadata } from "@/contexts/page-metadata";
import { api } from "@/lib/api-client";
import {
  CATEGORY_LABELS,
  JOB_TYPE_LABELS,
  SALARY_RANGE_LABELS,
  type JobPostingCategory,
  type JobType,
  type SalaryRange,
} from "@/lib/recruiter/postings";
import { Badge } from "@/components/ui/badge";
import { RichTextViewer } from "@/components/editor/rich-text-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

type PostingDetail = {
  id: string;
  title: string;
  category: JobPostingCategory;
  jobType: JobType;
  salaryRange: SalaryRange;
  description: string;
  company: { name: string; location: string };
};

export default function NewApplicationPage() {
  useSetPageMetadata({
    title: "Nova Candidatura",
    description: "Candidatura a uma vaga da plataforma",
    showBreadcrumbs: true,
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const postingId = searchParams.get("postingId");

  const [submitted, setSubmitted] = React.useState(false);

  const { data, isLoading, isError } = useQuery<{ posting: PostingDetail }>({
    queryKey: ["publicJob", postingId],
    queryFn: () => fetch(`/api/jobs/${postingId}`).then((r) => r.json()),
    enabled: !!postingId,
    retry: false,
  });

  const applyMutation = useMutation({
    mutationFn: () =>
      api.post("/api/job-application", {
        jobTitle: data?.posting.title,
        companyName: data?.posting.company.name,
        jobDescription: data?.posting.description,
        companyInfo: data?.posting.company.location,
      }),
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  if (!postingId) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
          <Briefcase className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Nenhuma vaga seleccionada</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Acesse esta página a partir da listagem de vagas.
          </p>
          <Button asChild className="mt-4 rounded-2xl" variant="outline">
            <Link href="/jobs">Ver vagas disponíveis</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-3xl border border-border bg-card p-12 text-center max-w-md space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold">Candidatura Registada!</h2>
          <p className="text-sm text-muted-foreground">
            A sua candidatura foi registada com sucesso. Pode acompanhar o progresso na secção de candidaturas.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button asChild className="rounded-2xl">
              <Link href="/applications">Ver as minhas candidaturas</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-2xl">
              <Link href="/jobs">Explorar mais vagas</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (isError || !data?.posting) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
        <Briefcase className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Vaga não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta vaga pode ter sido encerrada ou removida.
        </p>
        <Button asChild className="mt-4 rounded-2xl" variant="outline">
          <Link href="/jobs">Ver vagas disponíveis</Link>
        </Button>
      </div>
    );
  }

  const { posting } = data;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Link
        href={`/jobs/${posting.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar à vaga
      </Link>

      <div className="rounded-3xl border border-border bg-card p-6 space-y-6">
        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Confirmar candidatura
          </div>
          <h1 className="text-2xl font-bold leading-snug">{posting.title}</h1>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="font-medium text-foreground">{posting.company.name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{posting.company.location}</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="outline" className="rounded-full text-xs">
              {CATEGORY_LABELS[posting.category]}
            </Badge>
            <Badge variant="outline" className="rounded-full text-xs">
              {JOB_TYPE_LABELS[posting.jobType]}
            </Badge>
            <Badge className="rounded-full text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
              {SALARY_RANGE_LABELS[posting.salaryRange]}
            </Badge>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Descrição da Vaga
          </h2>
          <RichTextViewer content={posting.description} className="text-sm leading-relaxed line-clamp-6" />
          <Link
            href={`/jobs/${posting.id}`}
            className="text-xs text-primary hover:underline"
          >
            Ver descrição completa →
          </Link>
        </div>

        <Separator />

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Ao confirmar, esta vaga será adicionada às suas candidaturas e poderá acompanhar o progresso.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              className="rounded-2xl flex-1"
              disabled={applyMutation.isPending}
              onClick={() => applyMutation.mutate()}
            >
              {applyMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  A registar...
                </>
              ) : (
                "Confirmar candidatura"
              )}
            </Button>
            <Button
              variant="outline"
              className="rounded-2xl"
              disabled={applyMutation.isPending}
              onClick={() => router.back()}
            >
              Cancelar
            </Button>
          </div>
          {applyMutation.isError && (
            <p className="text-sm text-destructive">
              Erro ao registar a candidatura. Tente novamente.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

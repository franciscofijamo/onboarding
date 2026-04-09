"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  Building2,
  MapPin,
  Search,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useSetPageMetadata } from "@/contexts/page-metadata";
import {
  CATEGORY_LABELS,
  JOB_TYPE_LABELS,
  SALARY_RANGE_LABELS,
  JOB_POSTING_CATEGORIES,
  JOB_TYPES,
  type JobPostingCategory,
  type JobType,
} from "@/lib/recruiter/postings";

type PublicPosting = {
  id: string;
  title: string;
  category: JobPostingCategory;
  jobType: JobType;
  salaryRange: string;
  createdAt: string;
  company: { name: string; location: string };
};

type JobsResponse = {
  postings: PublicPosting[];
  hasMore: boolean;
  nextCursor: string | null;
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-MZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export default function JobBoardPage() {
  useSetPageMetadata({
    title: "Bolsa de Vagas",
    description: "Explore oportunidades de emprego disponíveis",
    showBreadcrumbs: true,
  });

  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<string>("ALL");
  const [jobType, setJobType] = React.useState<string>("ALL");

  const queryParams = new URLSearchParams();
  if (category !== "ALL") queryParams.set("category", category);
  if (jobType !== "ALL") queryParams.set("jobType", jobType);

  const { data, isLoading } = useQuery<JobsResponse>({
    queryKey: ["publicJobs", category, jobType],
    queryFn: () => api.get(`/api/jobs?${queryParams.toString()}`),
  });

  const postings = data?.postings ?? [];

  const filtered = React.useMemo(() => {
    if (!search.trim()) return postings;
    const q = search.toLowerCase();
    return postings.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.company.name.toLowerCase().includes(q) ||
        p.company.location.toLowerCase().includes(q)
    );
  }, [postings, search]);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.10),transparent_40%)]" />
        <div className="relative space-y-1">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">Bolsa de Vagas</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Encontre a oportunidade certa para si entre as vagas publicadas pelas empresas na plataforma.
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por título, empresa ou localização..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-48 rounded-xl">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as categorias</SelectItem>
              {JOB_POSTING_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={jobType} onValueChange={setJobType}>
            <SelectTrigger className="w-full sm:w-44 rounded-xl">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os tipos</SelectItem>
              {JOB_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {JOB_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-3xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Briefcase className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-semibold">Sem vagas disponíveis</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {postings.length === 0
              ? "Ainda não há vagas publicadas na plataforma. Volte em breve."
              : "Nenhuma vaga encontrada com os filtros actuais."}
          </p>
          {postings.length > 0 && (
            <Button
              variant="outline"
              className="mt-4 rounded-2xl"
              onClick={() => {
                setSearch("");
                setCategory("ALL");
                setJobType("ALL");
              }}
            >
              Limpar filtros
            </Button>
          )}
        </section>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((posting) => (
            <JobCard key={posting.id} posting={posting} />
          ))}
        </div>
      )}
    </div>
  );
}

function JobCard({ posting }: { posting: PublicPosting }) {
  return (
    <article className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
      <div className="space-y-1">
        <h2 className="text-base font-semibold leading-snug line-clamp-2">{posting.title}</h2>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{posting.company.name}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{posting.company.location}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="inline-flex items-center rounded-full border border-border bg-muted/30 px-2.5 py-0.5 text-[11px] text-muted-foreground">
          {CATEGORY_LABELS[posting.category]}
        </span>
        <span className="inline-flex items-center rounded-full border border-border bg-muted/30 px-2.5 py-0.5 text-[11px] text-muted-foreground">
          {JOB_TYPE_LABELS[posting.jobType]}
        </span>
        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] text-emerald-700 font-medium">
          {SALARY_RANGE_LABELS[posting.salaryRange as keyof typeof SALARY_RANGE_LABELS]}
        </span>
      </div>

      <div className="mt-auto flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{formatDate(posting.createdAt)}</span>
        <Button size="sm" className="rounded-xl h-8 text-xs px-3" disabled>
          Candidatar-se
        </Button>
      </div>
    </article>
  );
}

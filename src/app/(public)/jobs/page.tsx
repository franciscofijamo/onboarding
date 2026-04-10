"use client";

import * as React from "react";
import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  Briefcase,
  Building2,
  ChevronDown,
  Loader2,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  CATEGORY_LABELS,
  JOB_TYPE_LABELS,
  SALARY_RANGE_LABELS,
  JOB_POSTING_CATEGORIES,
  JOB_TYPES,
  SALARY_RANGES,
  type JobPostingCategory,
  type JobType,
  type SalaryRange,
} from "@/lib/recruiter/postings";

const PAGE_SIZE = 12;
const NONE = "ALL";

type PublicPosting = {
  id: string;
  title: string;
  category: JobPostingCategory;
  jobType: JobType;
  salaryRange: SalaryRange;
  createdAt: string;
  company: { name: string; location: string; logoUrl?: string | null };
};

type JobsResponse = {
  postings: PublicPosting[];
  hasMore: boolean;
  nextCursor: string | null;
};

async function fetchJobsPage({
  q,
  category,
  jobType,
  salaryRange,
  cursor,
}: {
  q: string;
  category: string;
  jobType: string;
  salaryRange: string;
  cursor?: string;
}): Promise<JobsResponse> {
  const params = new URLSearchParams();
  params.set("limit", String(PAGE_SIZE));
  if (q) params.set("q", q);
  if (category !== NONE) params.set("category", category);
  if (jobType !== NONE) params.set("jobType", jobType);
  if (salaryRange !== NONE) params.set("salaryRange", salaryRange);
  if (cursor) params.set("cursor", cursor);
  const res = await fetch(`/api/jobs?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch jobs");
  return res.json();
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-MZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export default function JobBoardPage() {
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [category, setCategory] = React.useState(NONE);
  const [jobType, setJobType] = React.useState(NONE);
  const [salaryRange, setSalaryRange] = React.useState(NONE);
  const [showFilters, setShowFilters] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery<JobsResponse, Error, { pages: JobsResponse[] }, [string, string, string, string, string], string | undefined>({
    queryKey: ["publicJobs", debouncedSearch, category, jobType, salaryRange],
    queryFn: ({ pageParam }) =>
      fetchJobsPage({
        q: debouncedSearch,
        category,
        jobType,
        salaryRange,
        cursor: pageParam,
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 60_000,
  });

  const allPostings = React.useMemo(
    () => data?.pages.flatMap((page) => page.postings) ?? [],
    [data]
  );

  const activeFilterCount = [
    category !== NONE,
    jobType !== NONE,
    salaryRange !== NONE,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch("");
    setCategory(NONE);
    setJobType(NONE);
    setSalaryRange(NONE);
  };

  return (
    <div className="min-h-dvh bg-background pt-20 pb-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-12">
        <div className="py-10 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Bolsa de Vagas
          </h1>
          <p className="text-muted-foreground text-base">
            Explore as oportunidades publicadas pelas empresas na plataforma.
          </p>
        </div>

        <div className="mb-8 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Pesquisar por título ou empresa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 rounded-xl h-11"
              />
              {search && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearch("")}
                  aria-label="Limpar pesquisa"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              className="rounded-xl h-11 gap-2 shrink-0"
              onClick={() => setShowFilters((v) => !v)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="rounded-full px-1.5 py-0 text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-3 rounded-2xl border border-border bg-card p-4">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full sm:w-52 rounded-xl">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Todas as categorias</SelectItem>
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
                  <SelectItem value={NONE}>Todos os tipos</SelectItem>
                  {JOB_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {JOB_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={salaryRange} onValueChange={setSalaryRange}>
                <SelectTrigger className="w-full sm:w-52 rounded-xl">
                  <SelectValue placeholder="Salário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Todos os salários</SelectItem>
                  {SALARY_RANGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SALARY_RANGE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl text-muted-foreground"
                  onClick={clearFilters}
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Limpar filtros
                </Button>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-3xl" />
            ))}
          </div>
        ) : allPostings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card p-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Briefcase className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold">Sem vagas disponíveis</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {activeFilterCount > 0 || debouncedSearch
                ? "Nenhuma vaga encontrada com os filtros actuais."
                : "Ainda não há vagas publicadas na plataforma. Volte em breve."}
            </p>
            {(activeFilterCount > 0 || debouncedSearch) && (
              <Button
                variant="outline"
                className="mt-4 rounded-2xl"
                onClick={clearFilters}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {allPostings.length} vaga{allPostings.length !== 1 ? "s" : ""} encontrada{allPostings.length !== 1 ? "s" : ""}
              {hasNextPage ? "+" : ""}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {allPostings.map((posting) => (
                <JobCard key={posting.id} posting={posting} />
              ))}
            </div>

            {hasNextPage && (
              <div className="mt-8 flex justify-center">
                <Button
                  variant="outline"
                  className="rounded-2xl gap-2"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      A carregar...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Carregar mais vagas
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function JobCard({ posting }: { posting: PublicPosting }) {
  return (
    <Link
      href={`/jobs/${posting.id}`}
      className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 transition-all hover:shadow-md hover:border-border/80 group"
    >
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl border border-border bg-white flex items-center justify-center overflow-hidden shrink-0">
          {posting.company.logoUrl ? (
            <img
              src={posting.company.logoUrl}
              alt={posting.company.name}
              className="h-full w-full object-contain"
            />
          ) : (
            <Building2 className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-base font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {posting.title}
          </h2>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="truncate font-medium text-foreground/80">{posting.company.name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{posting.company.location}</span>
          </div>
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
          {SALARY_RANGE_LABELS[posting.salaryRange]}
        </span>
      </div>

      <div className="mt-auto flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{formatDate(posting.createdAt)}</span>
        <span className="text-xs font-medium text-primary group-hover:underline">Ver detalhes →</span>
      </div>
    </Link>
  );
}

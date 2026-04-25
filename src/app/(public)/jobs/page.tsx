"use client";

import * as React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import { cn, formatDate, withAssetVersion } from "@/lib/utils";
import { site } from "@/lib/brand-config";
import {
  ArrowRight,
  Briefcase,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
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
import { useLanguage } from "@/contexts/language";

const PAGE_SIZE = 12;
const NONE = "ALL";

type PublicPosting = {
  id: string;
  title: string;
  description: string;
  category: JobPostingCategory;
  jobType: JobType;
  salaryRange: SalaryRange;
  applicationCount?: number;
  userHasApplied?: boolean;
  createdAt: string;
  company: { name: string; location: string; logoUrl?: string | null; updatedAt: string };
};

type JobsResponse = {
  postings: PublicPosting[];
  hasMore: boolean;
  nextCursor: string | null;
};

function useJobsI18n() {
  const { t, locale } = useLanguage();

  const categoryLabels: Record<JobPostingCategory, string> = {
    TECHNOLOGY: t("jobs.categories.technology"),
    FINANCE: t("jobs.categories.finance"),
    HEALTHCARE: t("jobs.categories.healthcare"),
    EDUCATION: t("jobs.categories.education"),
    ENGINEERING: t("jobs.categories.engineering"),
    MARKETING: t("jobs.categories.marketing"),
    SALES: t("jobs.categories.sales"),
    HUMAN_RESOURCES: t("jobs.categories.humanResources"),
    LEGAL: t("jobs.categories.legal"),
    OPERATIONS: t("jobs.categories.operations"),
    LOGISTICS: t("jobs.categories.logistics"),
    HOSPITALITY: t("jobs.categories.hospitality"),
    CONSTRUCTION: t("jobs.categories.construction"),
    MEDIA: t("jobs.categories.media"),
    OTHER: t("jobs.categories.other"),
  };

  const jobTypeLabels: Record<JobType, string> = {
    FULL_TIME: t("jobs.types.fullTime"),
    PART_TIME: t("jobs.types.partTime"),
    CONTRACT: t("jobs.types.contract"),
    INTERNSHIP: t("jobs.types.internship"),
    REMOTE: t("jobs.types.remote"),
    HYBRID: t("jobs.types.hybrid"),
  };

  const salaryLabels: Record<SalaryRange, string> = {
    UNDER_15K: t("jobs.salary.under15k"),
    FROM_15K_TO_25K: t("jobs.salary.from15kTo25k"),
    FROM_25K_TO_40K: t("jobs.salary.from25kTo40k"),
    FROM_40K_TO_60K: t("jobs.salary.from40kTo60k"),
    FROM_60K_TO_90K: t("jobs.salary.from60kTo90k"),
    ABOVE_90K: t("jobs.salary.above90k"),
    NEGOTIABLE: t("jobs.salary.negotiable"),
  };

  return { t, locale, categoryLabels, jobTypeLabels, salaryLabels };
}

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


export default function JobBoardPage() {
  if (!site.features.jobBoard) {
    redirect("/");
  }

  const { t, locale, categoryLabels, jobTypeLabels, salaryLabels } = useJobsI18n();
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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="py-10">
          <div className="max-w-3xl space-y-3">
            <Badge variant="secondary" className="rounded-md px-3 py-1 text-xs font-medium">
              {t("jobs.heroBadge")}
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t("jobs.title")}
            </h1>
            <p className="text-base text-muted-foreground sm:text-lg">
              {t("jobs.description")}
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0">
            <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    {t("jobs.resultsCount", {
                      count: `${allPostings.length}${hasNextPage ? "+" : ""}`,
                      label: t(allPostings.length === 1 ? "jobs.resultSingle" : "jobs.resultPlural"),
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("jobs.resultsHelp")}
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="h-11 shrink-0 gap-2 rounded-lg lg:hidden"
                  onClick={() => setShowFilters((v) => !v)}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span>{t("jobs.filtersButton")}</span>
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="rounded-md px-1.5 py-0 text-xs">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-5">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-72 rounded-xl" />
                ))
              ) : allPostings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Briefcase className="h-8 w-8" />
                  </div>
                  <h2 className="text-xl font-semibold">{t("jobs.emptyTitle")}</h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    {activeFilterCount > 0 || debouncedSearch
                      ? t("jobs.emptyFiltered")
                      : t("jobs.emptyDefault")}
                  </p>
                  {(activeFilterCount > 0 || debouncedSearch) && (
                    <Button
                      variant="outline"
                      className="mt-4 rounded-lg"
                      onClick={clearFilters}
                    >
                      {t("jobs.clearFilters")}
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {allPostings.map((posting) => (
                    <JobCard key={posting.id} posting={posting} />
                  ))}

                  {hasNextPage && (
                    <div className="flex justify-center pt-2">
                      <Button
                        variant="outline"
                        className="gap-2 rounded-lg"
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                      >
                        {isFetchingNextPage ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t("common.loading")}
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            {t("jobs.loadMore")}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          <aside className={`${showFilters ? "block" : "hidden"} lg:block relative`}>
            <div className="lg:sticky lg:top-24">
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">
                      {t("jobs.filterTitle")}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("jobs.filterDescription")}
                    </p>
                  </div>
                  {(activeFilterCount > 0 || search) && (
                    <button
                      className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                      onClick={clearFilters}
                    >
                      {t("jobs.clear")}
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t("jobs.searchLabel")}</label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder={t("jobs.searchPlaceholder")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-12 rounded-lg border-border/70 pl-10 pr-10"
                      />
                      {search && (
                        <button
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setSearch("")}
                          aria-label={t("jobs.clearSearch")}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t("jobs.categoryLabel")}</label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-12 rounded-lg border-border/70">
                        <SelectValue placeholder={t("jobs.allCategories")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>{t("jobs.allCategories")}</SelectItem>
                        {JOB_POSTING_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {categoryLabels[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t("jobs.typeLabel")}</label>
                    <Select value={jobType} onValueChange={setJobType}>
                      <SelectTrigger className="h-12 rounded-lg border-border/70">
                        <SelectValue placeholder={t("jobs.allTypes")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>{t("jobs.allTypes")}</SelectItem>
                        {JOB_TYPES.map((jobTypeValue) => (
                          <SelectItem key={jobTypeValue} value={jobTypeValue}>
                            {jobTypeLabels[jobTypeValue]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t("jobs.salaryLabel")}</label>
                    <Select value={salaryRange} onValueChange={setSalaryRange}>
                      <SelectTrigger className="h-12 rounded-lg border-border/70">
                        <SelectValue placeholder={t("jobs.allSalaries")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>{t("jobs.allSalaries")}</SelectItem>
                        {SALARY_RANGES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {salaryLabels[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">{t("jobs.filtersSummaryTitle")}</p>
                    <p className="mt-1">
                      {activeFilterCount > 0 || debouncedSearch
                        ? t("jobs.filtersSummaryActive", {
                            count: activeFilterCount,
                            suffix: activeFilterCount !== 1 ? "s" : "",
                            applied: debouncedSearch ? t("jobs.searchApplied") : "",
                          })
                        : t("jobs.filtersSummaryEmpty")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function JobCard({ posting }: { posting: PublicPosting }) {
  const { t, locale, categoryLabels, jobTypeLabels, salaryLabels } = useJobsI18n();
  const [imageError, setImageError] = React.useState(false);
  const descriptionPreview = posting.description.replace(/<[^>]*>?/gm, '');
  const logoSrc = withAssetVersion(posting.company.logoUrl, posting.company.updatedAt);

  return (
    <Link
      href={`/jobs/${posting.id}`}
      className="group block rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-black/5 sm:p-5"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white shadow-sm">
              {logoSrc && !imageError ? (
                <img
                  src={logoSrc}
                  alt={posting.company.name}
                  className="h-full w-full object-contain"
                  onError={() => setImageError(true)}
                />
              ) : (
                <Building2 className="h-5 w-5 text-muted-foreground/60" />
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className="rounded-md px-2 py-0.5 text-[11px] font-medium hover:bg-secondary">
                    {categoryLabels[posting.category]}
                  </Badge>
                  {posting.userHasApplied && (
                    <Badge className="rounded-md border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50">
                      {t("jobs.applied")}
                    </Badge>
                  )}
                  {(posting.applicationCount ?? 0) > 0 && (
                    <Badge variant="outline" className="rounded-md px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {t("jobs.applicationCount", {
                        count: posting.applicationCount ?? 0,
                        suffix: (posting.applicationCount ?? 0) !== 1 ? "s" : "",
                      })}
                    </Badge>
                  )}
                </div>

                <h2 className="text-lg font-semibold leading-tight text-foreground transition-colors group-hover:text-primary sm:text-xl">
                  {posting.title}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground/90">
                  {posting.company.name}
                </span>
                <span className="flex items-center gap-1.5 pt-0.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {posting.company.location}
                </span>
                <span className="flex items-center gap-1.5 pt-0.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatDate(posting.createdAt, undefined, locale)}
                </span>
              </div>

              <p className="max-w-3xl line-clamp-2 text-sm leading-snug text-muted-foreground pt-0.5">
                {descriptionPreview}
              </p>
            </div>
          </div>
        </div>

        <div className="xl:w-56 xl:shrink-0">
          <div className="flex h-full flex-col justify-between rounded-lg border border-border bg-muted/20 p-3.5">
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <CircleDollarSign className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground leading-none">
                    {t("jobs.compensation")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground leading-none">
                    {salaryLabels[posting.salaryRange]}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Briefcase className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground leading-none">
                    {t("jobs.model")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground leading-none">
                    {jobTypeLabels[posting.jobType]}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-sm font-semibold">
              <span className={cn(posting.userHasApplied ? "text-emerald-700" : "text-primary")}>
                {posting.userHasApplied ? t("jobs.applied") : t("jobs.viewJob")}
              </span>
              <ArrowRight
                className={cn(
                  "h-4 w-4 transition-transform group-hover:translate-x-1",
                  posting.userHasApplied ? "text-emerald-700" : "text-primary"
                )}
              />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

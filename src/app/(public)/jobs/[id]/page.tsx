"use client";

import * as React from "react";
import Link from "next/link";
import { cn, formatDate, withAssetVersion } from "@/lib/utils";
import { redirect, useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { RichTextViewer } from "@/components/editor/rich-text-editor";
import { useProfile } from "@/hooks/use-profile";
import { useLanguage } from "@/contexts/language";
import { site } from "@/lib/brand-config";
import {
  type JobPostingCategory,
  type JobType,
  type SalaryRange,
} from "@/lib/recruiter/postings";

type PostingDetail = {
  id: string;
  title: string;
  category: JobPostingCategory;
  jobType: JobType;
  salaryRange: SalaryRange;
  description: string;
  createdAt: string;
  updatedAt: string;
  company: {
    name: string;
    location: string;
    website: string | null;
    description: string;
    logoUrl?: string | null;
    updatedAt: string;
  };
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


export default function JobDetailPage() {
  if (!site.features.jobBoard) {
    redirect("/");
  }

  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { t, locale, categoryLabels, jobTypeLabels, salaryLabels } = useJobsI18n();

  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { role, isLoading: profileLoading } = useProfile({ enabled: !!isSignedIn && authLoaded });
  const [logoErrorMain, setLogoErrorMain] = React.useState(false);
  const [logoErrorSide, setLogoErrorSide] = React.useState(false);

  const { data, isLoading, isError } = useQuery<{ posting: PostingDetail; userHasApplied?: boolean }>({
    queryKey: ["publicJob", id],
    queryFn: () => fetch(`/api/jobs/${id}`).then((r) => r.json()),
    staleTime: 60_000,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background pt-20 pb-16">
        <div className="mx-auto max-w-7xl px-4 py-10 space-y-6 sm:px-6 lg:px-10">
          <Skeleton className="h-8 w-2/3 rounded-xl" />
          <Skeleton className="h-5 w-1/3 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !data?.posting) {
    return (
      <div className="min-h-dvh bg-background pt-20 pb-16">
        <div className="mx-auto max-w-7xl px-4 py-20 text-center space-y-4 sm:px-6 lg:px-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Briefcase className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">{t("jobs.notFoundTitle")}</h1>
          <p className="text-muted-foreground">{t("jobs.notFoundDescription")}</p>
          <Button asChild variant="outline" className="rounded-lg gap-2">
            <Link href="/jobs">
              <ArrowLeft className="h-4 w-4" />
              {t("jobs.viewAllJobs")}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const { posting, userHasApplied } = data;
  const logoSrc = withAssetVersion(posting.company.logoUrl, posting.company.updatedAt);

  return (
    <div className="min-h-dvh bg-background pt-20 pb-16">
      <div className="mx-auto max-w-7xl px-4 py-10 space-y-8 sm:px-6 lg:px-10">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("jobs.backToJobs")}
        </Link>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <main className="min-w-0 rounded-xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-lg border border-border bg-white flex items-center justify-center overflow-hidden shrink-0">
                    {logoSrc && !logoErrorMain ? (
                      <img
                        src={logoSrc}
                        alt={posting.company.name}
                        className="h-full w-full object-contain"
                        onError={() => setLogoErrorMain(true)}
                      />
                    ) : (
                      <Building2 className="h-7 w-7 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl leading-snug">
                      {posting.title}
                    </h1>
                    <div className="flex items-center gap-1.5 text-base text-muted-foreground">
                      <span className="font-medium text-foreground">{posting.company.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span>{posting.company.location}</span>
                    </div>
                  </div>
                </div>

                <div className="lg:hidden mt-4 sm:mt-0 w-full sm:w-auto">
                  <ApplyButton
                    jobId={posting.id}
                    isSignedIn={!!isSignedIn}
                    authLoaded={authLoaded}
                    role={role}
                    profileLoading={profileLoading}
                    hasApplied={userHasApplied}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="rounded-md px-3 py-1 text-xs">
                  {categoryLabels[posting.category]}
                </Badge>
                <Badge variant="outline" className="rounded-md px-3 py-1 text-xs">
                  {jobTypeLabels[posting.jobType]}
                </Badge>
                <Badge className="rounded-md px-3 py-1 text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                  {salaryLabels[posting.salaryRange]}
                </Badge>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>{t("jobs.publishedAt", { date: formatDate(posting.createdAt, { month: "long" }, locale) })}</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h2 className="text-lg font-semibold">{t("jobs.jobDescriptionTitle")}</h2>
              <RichTextViewer content={posting.description} className="text-sm leading-relaxed" />
            </div>
          </main>

          <aside className="relative">
            <div className="sticky top-24 rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">{t("jobs.aboutCompanyTitle")}</h2>
                <div className="rounded-lg border border-border bg-muted/20 p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg border border-border bg-white flex items-center justify-center overflow-hidden shrink-0">
                      {logoSrc && !logoErrorSide ? (
                        <img
                          src={logoSrc}
                          alt={posting.company.name}
                          className="h-full w-full object-contain"
                          onError={() => setLogoErrorSide(true)}
                        />
                      ) : (
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{posting.company.name}</p>
                      <p className="text-sm text-muted-foreground">{posting.company.location}</p>
                    </div>
                  </div>
                  {posting.company.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {posting.company.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    {posting.company.website && (
                      <a
                        href={posting.company.website.startsWith("http") ? posting.company.website : `https://${posting.company.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                      >
                        <Globe className="h-3.5 w-3.5" />
                        {t("jobs.website")}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col">
                <ApplyButton
                  jobId={posting.id}
                  isSignedIn={!!isSignedIn}
                  authLoaded={authLoaded}
                  role={role}
                  profileLoading={profileLoading}
                  hasApplied={userHasApplied}
                  size="lg"
                />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ApplyButton({
  jobId,
  isSignedIn,
  authLoaded,
  role,
  profileLoading,
  hasApplied,
  size = "default",
}: {
  jobId: string;
  isSignedIn: boolean;
  authLoaded: boolean;
  role: string | null;
  profileLoading: boolean;
  hasApplied?: boolean;
  size?: "default" | "lg";
}) {
  const router = useRouter();
  const { t } = useLanguage();

  if (!authLoaded || profileLoading) {
    return (
      <Button disabled size={size} className="rounded-lg gap-2 shrink-0 w-full sm:w-auto">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("common.loading")}
      </Button>
    );
  }

  if (!isSignedIn) {
    return (
      <Button
        size={size}
        className="rounded-lg shrink-0 w-full sm:w-auto"
        onClick={() => {
          const redirectUrl = encodeURIComponent(`/jobs/${jobId}`);
          router.push(`/sign-up?redirect_url=${redirectUrl}`);
        }}
      >
        {t("jobs.apply")}
      </Button>
    );
  }

  if (role === "RECRUITER") {
    return (
      <div className="flex flex-col items-center gap-1 w-full sm:w-auto">
        <Button size={size} disabled className="rounded-lg shrink-0 opacity-60 w-full">
          {t("jobs.apply")}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          {t("jobs.recruitersCannotApply")}
        </p>
      </div>
    );
  }

  if (role !== "CANDIDATE") {
    return (
      <div className="flex flex-col items-center gap-1 w-full sm:w-auto">
        <Button
          size={size}
          variant="outline"
          className="rounded-lg shrink-0 w-full"
          onClick={() => router.push("/onboarding")}
        >
          {t("jobs.completeProfileToApply")}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          {t("jobs.completeProfileFirst")}
        </p>
      </div>
    );
  }

  if (hasApplied) {
    return (
      <div className="flex flex-col items-center gap-1 w-full sm:w-auto">
        <Button size={size} disabled className="rounded-lg shrink-0 opacity-60 w-full bg-emerald-50 text-emerald-700 border-emerald-200 cursor-not-allowed hidden sm:flex hover:bg-emerald-50">
          <CheckCircle2 className="h-4 w-4 mr-2" />
          {t("jobs.alreadyApplied")}
        </Button>
        <Button size={size} disabled className="rounded-lg shrink-0 opacity-60 w-full sm:hidden text-white cursor-not-allowed">
          {t("jobs.alreadyApplied")}
        </Button>
        <p className="text-xs text-muted-foreground text-center hidden sm:block">
          {t("jobs.applicationSubmitted")}
        </p>
      </div>
    );
  }

  return (
    <Button
      size={size}
      className="rounded-lg shrink-0 w-full sm:w-auto"
      onClick={() => {
        router.push(`/onboarding?new=1&jobPostingId=${jobId}`);
      }}
    >
      {t("jobs.apply")}
    </Button>
  );
}

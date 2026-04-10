"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { RichTextViewer } from "@/components/editor/rich-text-editor";
import { useProfile } from "@/hooks/use-profile";
import {
  CATEGORY_LABELS,
  JOB_TYPE_LABELS,
  SALARY_RANGE_LABELS,
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
  };
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-MZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { role, isLoading: profileLoading } = useProfile({ enabled: !!isSignedIn && authLoaded });

  const { data, isLoading, isError } = useQuery<{ posting: PostingDetail }>({
    queryKey: ["publicJob", id],
    queryFn: () => fetch(`/api/jobs/${id}`).then((r) => r.json()),
    staleTime: 60_000,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background pt-20 pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-12 py-10 space-y-6">
          <Skeleton className="h-8 w-2/3 rounded-xl" />
          <Skeleton className="h-5 w-1/3 rounded-xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !data?.posting) {
    return (
      <div className="min-h-dvh bg-background pt-20 pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-12 py-20 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Briefcase className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">Vaga não encontrada</h1>
          <p className="text-muted-foreground">Esta vaga pode ter sido encerrada ou removida.</p>
          <Button asChild variant="outline" className="rounded-2xl gap-2">
            <Link href="/jobs">
              <ArrowLeft className="h-4 w-4" />
              Ver todas as vagas
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const { posting } = data;

  return (
    <div className="min-h-dvh bg-background pt-20 pb-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-12 py-10 space-y-8">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar às vagas
        </Link>

        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-2xl border border-border bg-white flex items-center justify-center overflow-hidden shrink-0">
                  {posting.company.logoUrl ? (
                    <img
                      src={posting.company.logoUrl}
                      alt={posting.company.name}
                      className="h-full w-full object-contain"
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

              <ApplyButton
                jobId={posting.id}
                isSignedIn={!!isSignedIn}
                authLoaded={authLoaded}
                role={role}
                profileLoading={profileLoading}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                {CATEGORY_LABELS[posting.category]}
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                {JOB_TYPE_LABELS[posting.jobType]}
              </Badge>
              <Badge className="rounded-full px-3 py-1 text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                {SALARY_RANGE_LABELS[posting.salaryRange]}
              </Badge>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>Publicada a {formatDate(posting.createdAt)}</span>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Descrição da Vaga</h2>
            <RichTextViewer content={posting.description} className="text-sm leading-relaxed" />
          </div>

          <Separator />

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Sobre a Empresa</h2>
            <div className="rounded-2xl border border-border bg-muted/20 p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl border border-border bg-white flex items-center justify-center overflow-hidden shrink-0">
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
                <div>
                  <p className="font-semibold">{posting.company.name}</p>
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
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Website
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-center">
            <ApplyButton
              jobId={posting.id}
              isSignedIn={!!isSignedIn}
              authLoaded={authLoaded}
              role={role}
              profileLoading={profileLoading}
              size="lg"
            />
          </div>
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
  size = "default",
}: {
  jobId: string;
  isSignedIn: boolean;
  authLoaded: boolean;
  role: string | null;
  profileLoading: boolean;
  size?: "default" | "lg";
}) {
  const router = useRouter();

  if (!authLoaded || profileLoading) {
    return (
      <Button disabled size={size} className="rounded-2xl gap-2 shrink-0">
        <Loader2 className="h-4 w-4 animate-spin" />
        A carregar...
      </Button>
    );
  }

  if (!isSignedIn) {
    return (
      <Button
        size={size}
        className="rounded-2xl shrink-0"
        onClick={() => {
          const redirectUrl = encodeURIComponent(`/jobs/${jobId}`);
          router.push(`/sign-up?redirect_url=${redirectUrl}`);
        }}
      >
        Candidatar-se
      </Button>
    );
  }

  if (role === "RECRUITER") {
    return (
      <div className="flex flex-col items-center gap-1">
        <Button size={size} disabled className="rounded-2xl shrink-0 opacity-60">
          Candidatar-se
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Recrutadores não podem candidatar-se a vagas
        </p>
      </div>
    );
  }

  if (role !== "CANDIDATE") {
    return (
      <div className="flex flex-col items-center gap-1">
        <Button
          size={size}
          variant="outline"
          className="rounded-2xl shrink-0"
          onClick={() => router.push("/onboarding")}
        >
          Completar perfil para candidatar-se
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Complete o seu perfil primeiro
        </p>
      </div>
    );
  }

  return (
    <Button
      size={size}
      className="rounded-2xl shrink-0"
      onClick={() => {
        router.push(`/applications/new?postingId=${jobId}`);
      }}
    >
      Candidatar-se
    </Button>
  );
}

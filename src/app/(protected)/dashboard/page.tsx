"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Coins,
  LayoutGrid,
  Mic,
  PlusCircle,
  Upload,
} from "lucide-react";
import { WelcomeCreditsDialog } from "@/components/app/welcome-credits-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/language";
import { useSetPageMetadata } from "@/contexts/page-metadata";
import { useCredits } from "@/hooks/use-credits";
import { useProfile } from "@/hooks/use-profile";

type ActionPanelProps = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  cta: string;
  accentClassName: string;
};

function ActionPanel({
  href,
  icon: Icon,
  title,
  description,
  cta,
  accentClassName,
}: ActionPanelProps) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-[28px] border border-border/70 bg-white/90 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.35)] transition duration-300 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-[0_24px_70px_-38px_rgba(15,23,42,0.4)]"
    >
      <div className={`absolute inset-x-0 top-0 h-1 ${accentClassName}`} />
      <div className="flex h-full flex-col justify-between gap-8">
        <div className="space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background">
            <Icon className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {title}
            </h2>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
          <span>{cta}</span>
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}

type StepItemProps = {
  index: string;
  title: string;
  description: string;
};

function StepItem({ index, title, description }: StepItemProps) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-xs font-semibold text-muted-foreground">
        {index}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function CreditsStat({
  label,
  value,
  loading,
}: {
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-16 rounded-full" />
      ) : (
        <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          {value}
        </p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useUser();
  const { t } = useLanguage();
  const { credits, isLoading: creditsLoading } = useCredits();
  const { role } = useProfile();

  useSetPageMetadata({
    title: t("dashboard.hello", {
      name: user?.firstName || t("dashboard.defaultUser"),
    }),
    description: t("dashboard.welcomeSubtitle"),
  });

  if (role === "RECRUITER") {
    return (
      <div className="w-full space-y-6">
        <section className="relative overflow-hidden rounded-[32px] border border-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(246,247,241,0.96))] p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(187,247,208,0.35),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(226,232,240,0.7),transparent_38%)]" />
          <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-foreground/15 to-transparent" />
          <div className="relative space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl space-y-4">
                <span className="inline-flex w-fit items-center rounded-full border border-border/80 bg-background/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
                  {t("dashboard.recruiterEyebrow")}
                </span>
                <div className="space-y-3">
                  <h1 className="text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">
                    {t("dashboard.recruiterHeroTitle", {
                      name: user?.firstName || t("dashboard.recruiterDefaultUser"),
                    })}
                  </h1>
                  <p className="max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                    {t("dashboard.recruiterMinimalDescription")}
                  </p>
                </div>
              </div>
              <Button asChild size="lg" className="rounded-full px-6">
                <Link href="/recruiter/postings/new">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {t("dashboard.recruiterNewPosting")}
                </Link>
              </Button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)]">
              <div className="grid gap-4 md:grid-cols-2">
                <ActionPanel
                  href="/recruiter/postings/new"
                  icon={PlusCircle}
                  title={t("dashboard.recruiterPrimaryTitle")}
                  description={t("dashboard.recruiterPrimaryDescription")}
                  cta={t("dashboard.recruiterPrimaryCta")}
                  accentClassName="bg-foreground"
                />
                <ActionPanel
                  href="/recruiter/postings"
                  icon={LayoutGrid}
                  title={t("dashboard.recruiterSecondaryTitle")}
                  description={t("dashboard.recruiterSecondaryDescription")}
                  cta={t("dashboard.recruiterSecondaryCta")}
                  accentClassName="bg-lime-bright"
                />
              </div>

              <div className="rounded-[28px] border border-border/70 bg-background/80 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime text-lime-foreground">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {t("dashboard.recruiterSupportTitle")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("dashboard.recruiterSupportDescription")}
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-4 border-t border-border/70 pt-5">
                  <StepItem
                    index="01"
                    title={t("dashboard.recruiterStep1Title")}
                    description={t("dashboard.recruiterStep1Description")}
                  />
                  <StepItem
                    index="02"
                    title={t("dashboard.recruiterStep2Title")}
                    description={t("dashboard.recruiterStep2Description")}
                  />
                  <StepItem
                    index="03"
                    title={t("dashboard.recruiterStep3Title")}
                    description={t("dashboard.recruiterStep3Description")}
                  />
                </div>

                <Button asChild variant="outline" className="mt-6 w-full rounded-full">
                  <Link href="/company/profile">
                    <Building2 className="mr-2 h-4 w-4" />
                    {t("dashboard.recruiterCompanyProfile")}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,248,244,0.96))] p-6 sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(191,219,254,0.32),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(217,249,157,0.24),transparent_32%)]" />
        <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-foreground/15 to-transparent" />
        <div className="relative space-y-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <span className="inline-flex w-fit items-center rounded-full border border-border/80 bg-background/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
                {t("dashboard.candidateEyebrow")}
              </span>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">
                  {t("dashboard.heroTitle")}
                </h1>
                <p className="max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                  {t("dashboard.candidateMinimalDescription")}
                </p>
              </div>
            </div>
            <Button asChild size="lg" className="rounded-full px-6">
              <Link href="/applications/new">
                <Upload className="mr-2 h-4 w-4" />
                {t("dashboard.newApplication")}
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)]">
            <div className="grid gap-4 md:grid-cols-2">
              <ActionPanel
                href="/applications/new"
                icon={Upload}
                title={t("dashboard.candidatePrimaryTitle")}
                description={t("dashboard.candidatePrimaryDescription")}
                cta={t("dashboard.candidatePrimaryCta")}
                accentClassName="bg-foreground"
              />
              <ActionPanel
                href="/applications"
                icon={Briefcase}
                title={t("dashboard.candidateSecondaryTitle")}
                description={t("dashboard.candidateSecondaryDescription")}
                cta={t("dashboard.candidateSecondaryCta")}
                accentClassName="bg-lime-bright"
              />
            </div>

            <div className="space-y-4 rounded-[28px] border border-border/70 bg-background/80 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-foreground text-background">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t("dashboard.candidateSupportTitle")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("dashboard.candidateSupportDescription")}
                  </p>
                </div>
              </div>

              <CreditsStat
                label={t("dashboard.creditsAvailable")}
                value={credits?.creditsRemaining ?? 0}
                loading={creditsLoading}
              />

              <div className="space-y-4 border-t border-border/70 pt-5">
                <StepItem
                  index="01"
                  title={t("dashboard.candidateStep1Title")}
                  description={t("dashboard.candidateStep1Description")}
                />
                <StepItem
                  index="02"
                  title={t("dashboard.candidateStep2Title")}
                  description={t("dashboard.candidateStep2Description")}
                />
              </div>

              <Link
                href="/scenarios"
                className="group flex items-center justify-between rounded-2xl border border-border/70 bg-white/80 px-4 py-4 transition-colors hover:border-foreground/15"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lime text-lime-foreground">
                    <Mic className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {t("dashboard.scenariosTitle")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("dashboard.candidatePracticeDescription")}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-foreground" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <WelcomeCreditsDialog />
    </div>
  );
}

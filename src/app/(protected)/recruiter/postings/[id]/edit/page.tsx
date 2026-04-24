"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, CheckCircle, Loader2, Save, Eye, Pause, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CATEGORY_LABELS,
  JOB_TYPE_LABELS,
  SALARY_RANGE_LABELS,
  STATUS_LABELS,
  JOB_POSTING_CATEGORIES,
  JOB_TYPES,
  SALARY_RANGES,
  type JobPosting,
  type JobPostingCategory,
  type JobPostingStatus,
  type JobType,
  type SalaryRange,
} from "@/lib/recruiter/postings";
import { useSetPageMetadata } from "@/contexts/page-metadata";
import { useLanguage } from "@/contexts/language";

interface FormValues {
  title: string;
  category: JobPostingCategory | "";
  salaryRange: SalaryRange | "";
  jobType: JobType | "";
  description: string;
  status: JobPostingStatus;
}

export default function EditPostingPage() {
  const { t } = useLanguage();

  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormValues, string>>>({});

  const { data, isLoading } = useQuery<{ posting: JobPosting }>({
    queryKey: ["recruiterPosting", id],
    queryFn: () => api.get(`/api/recruiter/postings/${id}`),
  });


  const postingTitle = data?.posting?.title ?? t("recruiterPostingForm.postingFallback");

  useSetPageMetadata({
    title: t("recruiterPostingForm.editTitle"),
    showBreadcrumbs: true,
    breadcrumbs: [
      { label: t("nav.dashboard"), href: "/dashboard" },
      { label: t("recruiterPostings.title"), href: "/recruiter/postings" },
      { label: postingTitle },
      { label: t("common.edit") },
    ],
  });

  const [form, setForm] = React.useState<FormValues>({
    title: "",
    category: "",
    salaryRange: "",
    jobType: "",
    description: "",
    status: "DRAFT",
  });

  React.useEffect(() => {
    if (data?.posting) {
      const p = data.posting;
      setForm({
        title: p.title,
        category: p.category,
        salaryRange: p.salaryRange,
        jobType: p.jobType,
        description: p.description,
        status: p.status,
      });
    }
  }, [data]);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormValues, string>> = {};
    if (!form.title.trim() || form.title.trim().length < 2) errs.title = t("recruiterPostingForm.errors.titleRequired");
    if (!form.category) errs.category = t("recruiterPostingForm.errors.categoryRequired");
    if (!form.salaryRange) errs.salaryRange = t("recruiterPostingForm.errors.salaryRangeRequired");
    if (!form.jobType) errs.jobType = t("recruiterPostingForm.errors.jobTypeRequired");
    if (!form.description.trim() || form.description.replace(/<[^>]*>/g, "").trim().length < 10)
      errs.description = t("recruiterPostingForm.errors.descriptionRequired");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (overrideStatus?: JobPostingStatus) => {
    if (!validate()) return;
    setLoading(true);
    try {
      await api.put(`/api/recruiter/postings/${id}`, {
        title: form.title,
        category: form.category,
        salaryRange: form.salaryRange,
        jobType: form.jobType,
        description: form.description,
        status: overrideStatus ?? form.status,
      });
      await queryClient.invalidateQueries({ queryKey: ["recruiterPostings"] });
      await queryClient.invalidateQueries({ queryKey: ["recruiterPosting", id] });
      setDone(true);
      setTimeout(() => router.replace("/recruiter/postings"), 1200);
    } catch {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
          <h2 className="text-2xl font-bold">{t("recruiterPostingForm.updatedTitle")}</h2>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-10 w-1/3 rounded-xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const currentStatus = data?.posting.status;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/recruiter/postings")} className="rounded-xl">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">{t("recruiterPostingForm.editTitle")}</h1>
          <p className="text-sm text-muted-foreground">{data?.posting.title}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="title">{t("recruiterPostingForm.fields.title")} <span className="text-destructive">*</span></Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            className={cn(errors.title && "border-destructive")}
            disabled={loading}
          />
          {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>{t("recruiterPostingForm.fields.category")} <span className="text-destructive">*</span></Label>
            <Select value={form.category} onValueChange={(v) => set("category", v as JobPostingCategory)} disabled={loading}>
              <SelectTrigger className={cn(errors.category && "border-destructive")}>
                <SelectValue placeholder={t("recruiterPostingForm.fields.category")} />
              </SelectTrigger>
              <SelectContent>
                {JOB_POSTING_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t("recruiterPostingForm.fields.salaryRange")} <span className="text-destructive">*</span></Label>
            <Select value={form.salaryRange} onValueChange={(v) => set("salaryRange", v as SalaryRange)} disabled={loading}>
              <SelectTrigger className={cn(errors.salaryRange && "border-destructive")}>
                <SelectValue placeholder={t("recruiterPostingForm.fields.salaryRange")} />
              </SelectTrigger>
              <SelectContent>
                {SALARY_RANGES.map((r) => (
                  <SelectItem key={r} value={r}>{SALARY_RANGE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.salaryRange && <p className="text-xs text-destructive">{errors.salaryRange}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t("recruiterPostingForm.fields.jobType")} <span className="text-destructive">*</span></Label>
            <Select value={form.jobType} onValueChange={(v) => set("jobType", v as JobType)} disabled={loading}>
              <SelectTrigger className={cn(errors.jobType && "border-destructive")}>
                <SelectValue placeholder={t("recruiterPostingForm.fields.jobType")} />
              </SelectTrigger>
              <SelectContent>
                {JOB_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{JOB_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.jobType && <p className="text-xs text-destructive">{errors.jobType}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("recruiterPostingForm.fields.description")} <span className="text-destructive">*</span></Label>
          <RichTextEditor
            value={form.description}
            onChange={(html) => set("description", html)}
            minHeight={280}
            disabled={loading}
          />
          {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <Button variant="outline" onClick={() => router.back()} disabled={loading} className="rounded-xl">
            {t("common.cancel")}
          </Button>
          <div className="flex flex-wrap gap-2">
            {currentStatus === "PUBLISHED" && (
              <Button variant="outline" onClick={() => handleSave("PAUSED")} disabled={loading} className="gap-2 rounded-xl">
                <Pause className="h-4 w-4" />
                {t("recruiterPostings.actions.pause")}
              </Button>
            )}
            {(currentStatus === "DRAFT" || currentStatus === "PAUSED") && (
              <Button variant="outline" onClick={() => handleSave("PUBLISHED")} disabled={loading} className="gap-2 rounded-xl text-emerald-600 border-emerald-300 hover:bg-emerald-50">
                <Eye className="h-4 w-4" />
                {t("recruiterPostings.actions.publish")}
              </Button>
            )}
            {currentStatus !== "CLOSED" && (
              <Button variant="outline" onClick={() => handleSave("CLOSED")} disabled={loading} className="gap-2 rounded-xl text-rose-600 border-rose-300 hover:bg-rose-50">
                <X className="h-4 w-4" />
                {t("recruiterPostings.actions.close")}
              </Button>
            )}
            <Button onClick={() => handleSave()} disabled={loading} className="gap-2 rounded-xl">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("common.save")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

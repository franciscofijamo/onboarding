"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CheckCircle,
  Eye,
  Loader2,
  Save,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { RichTextEditor, RichTextViewer } from "@/components/editor/rich-text-editor";
import {
  CATEGORY_LABELS,
  JOB_TYPE_LABELS,
  SALARY_RANGE_LABELS,
  STATUS_LABELS,
  JOB_POSTING_CATEGORIES,
  JOB_TYPES,
  SALARY_RANGES,
  type JobPostingCategory,
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
}

interface FormErrors {
  title?: string;
  category?: string;
  salaryRange?: string;
  jobType?: string;
  description?: string;
}

function validateStep1(form: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!form.title.trim() || form.title.trim().length < 2) errors.title = "recruiterPostingForm.errors.titleMin";
  if (!form.category) errors.category = "recruiterPostingForm.errors.categoryRequired";
  if (!form.salaryRange) errors.salaryRange = "recruiterPostingForm.errors.salaryRangeRequired";
  if (!form.jobType) errors.jobType = "recruiterPostingForm.errors.jobTypeRequired";
  if (!form.description.trim() || form.description.replace(/<[^>]*>/g, "").trim().length < 10)
    errors.description = "recruiterPostingForm.errors.descriptionMin";
  return errors;
}

export default function NewPostingPage() {
  const { t } = useLanguage();
  useSetPageMetadata({
    title: t("recruiterPostingForm.newTitle"),
    showBreadcrumbs: true,
    breadcrumbs: [
      { label: t("nav.dashboard"), href: "/dashboard" },
      { label: t("recruiterPostings.title"), href: "/recruiter/postings" },
      { label: t("recruiterPostingForm.newTitle") },
    ],
  });

  const draftKey = "recruiter:newPostingDraft";

  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = React.useState<1 | 2>(1);
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [errors, setErrors] = React.useState<FormErrors>({});

  const [form, setForm] = React.useState<FormValues>({
    title: "",
    category: "",
    salaryRange: "",
    jobType: "",
    description: "",
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(draftKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.form) {
        setForm((prev) => ({ ...prev, ...parsed.form }));
      }
      if (parsed?.step === 1 || parsed?.step === 2) {
        setStep(parsed.step);
      }
    } catch {
      // ignore invalid draft
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = JSON.stringify({ form, step });
    sessionStorage.setItem(draftKey, payload);
  }, [form, step]);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleNextStep = () => {
    const errs = validateStep1(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep(2);
  };

  const handleSubmit = async (status: "DRAFT" | "PUBLISHED") => {
    setLoading(true);
    try {
      await api.post("/api/recruiter/postings", {
        title: form.title,
        category: form.category,
        salaryRange: form.salaryRange,
        jobType: form.jobType,
        description: form.description,
        status,
      });
      await queryClient.invalidateQueries({ queryKey: ["recruiterPostings"] });
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(draftKey);
      }
      setDone(true);
      setTimeout(() => router.replace("/recruiter/postings"), 1500);
    } catch {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
          <h2 className="text-2xl font-bold">{t("recruiterPostingForm.createdTitle")}</h2>
          <p className="text-muted-foreground">{t("recruiterPostingForm.redirecting")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => step === 2 ? setStep(1) : router.back()} className="rounded-xl">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">{t("recruiterPostingForm.newTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("recruiterPostingForm.step", { step, label: step === 1 ? t("recruiterPostingForm.information") : t("recruiterPostingForm.preview") })}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {([1, 2] as const).map((s) => (
          <div
            key={s}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              s <= step ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">
              {t("recruiterPostingForm.fields.title")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder={t("recruiterPostingForm.placeholders.title")}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className={cn(errors.title && "border-destructive")}
              disabled={loading}
            />
            {errors.title && <p className="text-xs text-destructive">{t(errors.title)}</p>}
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>
                {t("recruiterPostingForm.fields.category")} <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.category}
                onValueChange={(v) => set("category", v as JobPostingCategory)}
                disabled={loading}
              >
                <SelectTrigger className={cn(errors.category && "border-destructive")}>
                  <SelectValue placeholder={t("recruiterPostingForm.fields.category")} />
                </SelectTrigger>
                <SelectContent>
                  {JOB_POSTING_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-xs text-destructive">{t(errors.category)}</p>}
            </div>

            <div className="space-y-2">
              <Label>
                {t("recruiterPostingForm.fields.salaryRange")} <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.salaryRange}
                onValueChange={(v) => set("salaryRange", v as SalaryRange)}
                disabled={loading}
              >
                <SelectTrigger className={cn(errors.salaryRange && "border-destructive")}>
                  <SelectValue placeholder={t("recruiterPostingForm.fields.salaryRange")} />
                </SelectTrigger>
                <SelectContent>
                  {SALARY_RANGES.map((r) => (
                    <SelectItem key={r} value={r}>{SALARY_RANGE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.salaryRange && <p className="text-xs text-destructive">{t(errors.salaryRange)}</p>}
            </div>

            <div className="space-y-2">
              <Label>
                {t("recruiterPostingForm.fields.jobType")} <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.jobType}
                onValueChange={(v) => set("jobType", v as JobType)}
                disabled={loading}
              >
                <SelectTrigger className={cn(errors.jobType && "border-destructive")}>
                  <SelectValue placeholder={t("recruiterPostingForm.fields.jobType")} />
                </SelectTrigger>
                <SelectContent>
                  {JOB_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{JOB_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.jobType && <p className="text-xs text-destructive">{t(errors.jobType)}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              {t("recruiterPostingForm.fields.description")} <span className="text-destructive">*</span>
            </Label>
            <RichTextEditor
              value={form.description}
              onChange={(html) => set("description", html)}
              placeholder={t("recruiterPostingForm.placeholders.description")}
              minHeight={280}
              disabled={loading}
            />
            {errors.description && <p className="text-xs text-destructive">{t(errors.description)}</p>}
          </div>

          <div className="flex justify-end">
            <Button onClick={handleNextStep} className="gap-2 rounded-xl">
              {t("recruiterPostingForm.preview")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">{form.title}</h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.category && (
                    <Badge variant="outline" className="rounded-full">
                      {CATEGORY_LABELS[form.category as JobPostingCategory]}
                    </Badge>
                  )}
                  {form.jobType && (
                    <Badge variant="outline" className="rounded-full">
                      {JOB_TYPE_LABELS[form.jobType as JobType]}
                    </Badge>
                  )}
                  {form.salaryRange && (
                    <Badge variant="outline" className="rounded-full bg-emerald-500/10 text-emerald-700 border-emerald-200">
                      {SALARY_RANGE_LABELS[form.salaryRange as SalaryRange]}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Briefcase className="h-6 w-6" />
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <RichTextViewer content={form.description} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              className="gap-2 rounded-xl"
              disabled={loading}
            >
              <ArrowLeft className="h-4 w-4" />
              {t("common.edit")}
            </Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => handleSubmit("DRAFT")}
                disabled={loading}
                className="gap-2 rounded-xl"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t("recruiterPostingForm.saveDraft")}
              </Button>
              <Button
                onClick={() => handleSubmit("PUBLISHED")}
                disabled={loading}
                className="gap-2 rounded-xl"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                {t("recruiterPostings.actions.publish")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

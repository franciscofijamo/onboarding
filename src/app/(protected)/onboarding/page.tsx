"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { getOutcomeLabel, getStatusLabel, mapStatusToKanbanStage, type JobApplicationStatus } from "@/lib/job-application/kanban";
import posthog from "posthog-js";
import { useSetPageMetadata } from "@/contexts/page-metadata";
import { useLanguage } from "@/contexts/language";
import { useCredits } from "@/hooks/use-credits";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Briefcase,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BarChart3,
  Target,
  TrendingUp,
  Lightbulb,
  Save,
  Upload,
  Search,
  XCircle,
  RefreshCw,
  Link,
  Building2,
  X,
  ChevronDown,
  ChevronUp,
  Edit2,
  Eye,
  Download,
  ExternalLink,
} from "lucide-react";
import { RichTextViewer } from "@/components/editor/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CATEGORY_LABELS,
  JOB_TYPE_LABELS,
  SALARY_RANGE_LABELS,
  type JobPostingCategory,
  type JobType,
  type SalaryRange,
} from "@/lib/recruiter/postings";

type Step = "resume" | "job-description" | "analysis";

interface JobPostingPreview {
  id: string;
  title: string;
  category: JobPostingCategory;
  jobType: JobType;
  salaryRange: SalaryRange;
  description: string;
  company: { name: string; location: string };
}

interface ResumeData {
  id: string;
  title: string | null;
  content: string | null;
  fileUrl?: string | null;
  filePath?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface JobApplicationData {
  id: string;
  jobTitle: string | null;
  companyName: string | null;
  jobDescription: string;
  status: JobApplicationStatus;
  resume?: { id: string; title: string } | null;
  coverLetter?: { id: string; title: string } | null;
  analyses?: AnalysisData[];
}

interface KeywordAnalysis {
  found?: string[];
  missing?: string[];
}

interface AnalysisData {
  id: string;
  fitScore: number | null;
  summary: string | null;
  skillsMatch: string[] | Record<string, unknown> | null;
  missingSkills: string[] | Record<string, unknown> | null;
  strengths: string[] | Record<string, unknown> | null;
  improvements: string[] | Record<string, unknown> | null;
  recommendations: string[] | Record<string, unknown> | null;
  keywordAnalysis: KeywordAnalysis | null;
}

interface JobApplicationResponse {
  jobApplication: {
    id: string;
    status: string;
  };
  analysis?: AnalysisData;
  analysisError?: string;
}

const STEPS: { key: Step; required: boolean }[] = [
  { key: "resume", required: true },
  { key: "job-description", required: true },
  { key: "analysis", required: false },
];

function StepIndicator({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  isPublicApplication,
  t,
}: {
  steps: typeof STEPS;
  currentStep: Step;
  completedSteps: Set<Step>;
  onStepClick: (step: Step) => void;
  isPublicApplication?: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const labels: Record<Step, string> = {
    resume: t("onboarding.stepResume"),
    "job-description": t("onboarding.stepJobDescription"),
    analysis: isPublicApplication
      ? t("onboarding.stepSubmitApplication")
      : t("onboarding.stepAnalysis"),
  };
  const icons: Record<Step, React.ReactNode> = {
    resume: <FileText className="h-4 w-4" />,
    "job-description": <Briefcase className="h-4 w-4" />,
    analysis: <Sparkles className="h-4 w-4" />,
  };

  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((step, index) => {
        const isActive = step.key === currentStep;
        const isCompleted = completedSteps.has(step.key);

        return (
          <React.Fragment key={step.key}>
            <button
              onClick={() => onStepClick(step.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : isCompleted
                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {isCompleted && !isActive ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                icons[step.key]
              )}
              <span className="hidden sm:inline">{labels[step.key]}</span>
            </button>
            {index < steps.length - 1 && (
              <div
                className={`h-px w-6 ${
                  isCompleted ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function toStringArray(
  value: string[] | Record<string, unknown> | null | undefined
): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "object") {
    return Object.entries(value).map(([k, v]) => `${k}: ${v}`);
  }
  return [];
}

function formatResumeDate(value: string | undefined, locale: string) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getDocumentType(value: string | null | undefined) {
  const lowered = (value || "").toLowerCase();
  if (lowered.includes("pdf") || lowered.endsWith(".pdf")) return "pdf";
  if (
    lowered.includes("wordprocessingml.document") ||
    lowered.endsWith(".docx")
  ) {
    return "docx";
  }
  return undefined;
}

function getDownloadFileName(fileName: string | null, fallbackTitle: string, fileType: string | null) {
  const baseName = fileName || fallbackTitle || "document";
  if (/\.(pdf|docx)$/i.test(baseName)) return baseName;
  if (fileType === "pdf") return baseName + ".pdf";
  if (fileType === "docx") return baseName + ".docx";
  return baseName;
}

function renderHighlightedAnalysisText(
  text: string,
  tone: "emerald" | "orange"
): React.ReactNode {
  const matches = [...text.matchAll(/'([^']+)'|"([^"]+)"/g)];

  if (matches.length === 0) {
    return text;
  }

  const toneTextClass = tone === "emerald" ? "text-emerald-600" : "text-orange-600";
  const parts: React.ReactNode[] = [];
  let cursor = 0;

  matches.forEach((match, index) => {
    const fullMatch = match[0] ?? "";
    const start = match.index ?? 0;
    const end = start + fullMatch.length;
    const highlightedText = match[1] || match[2] || "";

    if (cursor < start) {
      parts.push(
        <span key={`txt-${index}-${cursor}`}>{text.slice(cursor, start)}</span>
      );
    }

    parts.push(
      <span
        key={`hl-${index}-${start}`}
        className={`rounded px-1.5 py-0.5 bg-white font-semibold ${toneTextClass}`}
      >
        {highlightedText}
      </span>
    );

    cursor = end;
  });

  if (cursor < text.length) {
    parts.push(<span key={`txt-end-${cursor}`}>{text.slice(cursor)}</span>);
  }

  return <>{parts}</>;
}
export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedApplicationId = searchParams.get("applicationId");
  const startFresh = searchParams.get("new") === "1";
  const jobPostingId = searchParams.get("jobPostingId");
  const queryClient = useQueryClient();
  const { locale, t, tArray } = useLanguage();
  const { credits, refresh: refreshCredits } = useCredits();

  useSetPageMetadata({
    title: Boolean(jobPostingId)
      ? t("onboarding.metadataPublicTitle")
      : t("onboarding.metadataTitle"),
    description: Boolean(jobPostingId)
      ? t("onboarding.metadataPublicDescription")
      : t("onboarding.metadataDescription"),
    showBreadcrumbs: true,
  });

  const [currentStep, setCurrentStep] = React.useState<Step>("resume");
  const [resumeText, setResumeText] = React.useState("");
  const [resumeTitle, setResumeTitle] = React.useState("");
  const [resumeFileUrl, setResumeFileUrl] = React.useState<string | null>(null);
  const [resumeFilePath, setResumeFilePath] = React.useState<string | null>(null);
  const [resumeFileType, setResumeFileType] = React.useState<string | null>(null);
  const [resumeFileName, setResumeFileName] = React.useState<string | null>(null);
  const [resumeLocalPreviewUrl, setResumeLocalPreviewUrl] = React.useState<string | null>(null);
  const [isUploadingResumeFile, setIsUploadingResumeFile] = React.useState(false);
  const [jobTitle, setJobTitle] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
  const [jobDescription, setJobDescription] = React.useState("");
  const [savedResumeId, setSavedResumeId] = React.useState<string | null>(
    null
  );
  const [analysisResult, setAnalysisResult] =
    React.useState<AnalysisData | null>(null);
  const [analysisError, setAnalysisError] = React.useState<string | null>(null);
  const [saveStatus, setSaveStatus] = React.useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = React.useState(false);
  const [selectedJobApplicationId, setSelectedJobApplicationId] = React.useState<string | null>(null);
  const [isAnalyzingExisting, setIsAnalyzingExisting] = React.useState(false);
  const [isSavingDraft, setIsSavingDraft] = React.useState(false);
  const [isExtractingResume, setIsExtractingResume] = React.useState(false);
  const [resumeUploadError, setResumeUploadError] = React.useState<string | null>(null);
  const [jobUrl, setJobUrl] = React.useState("");
  const [isCrawling, setIsCrawling] = React.useState(false);
  const [crawlError, setCrawlError] = React.useState<string | null>(null);
  const analysisRequestKeyRef = React.useRef<string | null>(null);
  const [isSubmittingPlatformApp, setIsSubmittingPlatformApp] = React.useState(false);
  const [platformAppSubmitted, setPlatformAppSubmitted] = React.useState(false);
  const [platformAppError, setPlatformAppError] = React.useState<string | null>(null);
  const [expandedVaga, setExpandedVaga] = React.useState(false);
  const [analysisProgressIndex, setAnalysisProgressIndex] = React.useState(0);

  React.useEffect(() => {
    return () => {
      if (resumeLocalPreviewUrl) URL.revokeObjectURL(resumeLocalPreviewUrl);
    };
  }, [resumeLocalPreviewUrl]);

  const analysisProgressSteps = React.useMemo(() => {
    const steps = tArray("onboarding.analysisSteps");
    return steps.length > 0
      ? steps
      : [
          "Parsing your CV and extracting key information...",
          "Analyzing job description requirements...",
          "Comparing skills and experience...",
          "Evaluating cultural and role fit...",
          "Generating personalized recommendations...",
        ];
  }, [tArray]);

  const isPublicApplication = Boolean(jobPostingId);

  const { data: jobPostingData, isLoading: loadingJobPosting } = useQuery<{ posting: JobPostingPreview }>({
    queryKey: ["jobPosting", jobPostingId],
    queryFn: () => fetch(`/api/jobs/${jobPostingId}`).then((r) => r.json()),
    enabled: Boolean(jobPostingId),
    staleTime: 5 * 60_000,
  });

  const jobPosting = jobPostingData?.posting ?? null;

  const { data: existingResumes, isLoading: loadingResumes } = useQuery<{
    resumes: ResumeData[];
  }>({
    queryKey: ["resumes"],
    queryFn: () => api.get("/api/resume"),
  });

  const { data: existingJobApplications, isLoading: loadingJobApplications } =
    useQuery<{ jobApplications: JobApplicationData[] }>({
      queryKey: ["jobApplications"],
      queryFn: () => api.get("/api/job-application"),
    });

  const currentApplication = React.useMemo(
    () =>
      (existingJobApplications?.jobApplications || []).find(
        (application) => application.id === selectedJobApplicationId
      ) || null,
    [existingJobApplications, selectedJobApplicationId]
  );

  const setResumeDocumentSource = React.useCallback((resume: ResumeData | null) => {
    setResumeFileUrl(resume?.fileUrl || null);
    setResumeFilePath(resume?.filePath || null);
    setResumeFileType(getDocumentType(resume?.filePath || resume?.fileUrl || resume?.title || ""));
    setResumeFileName(resume?.filePath?.split("/").pop() || resume?.title || null);
    setResumeLocalPreviewUrl(null);
  }, []);

  const clearResumeDocumentSource = React.useCallback(() => {
    setResumeFileUrl(null);
    setResumeFilePath(null);
    setResumeFileType(null);
    setResumeFileName(null);
    setResumeLocalPreviewUrl(null);
  }, []);

  React.useEffect(() => {
    if (dataLoaded) return;
    if (loadingResumes || loadingJobApplications) return;
    if (isPublicApplication && loadingJobPosting) return;

    const resumes = existingResumes?.resumes || [];
    const jobApps = existingJobApplications?.jobApplications || [];

    // For platform applications, always start fresh but pre-load last resume if available
    if (isPublicApplication) {
      setSelectedJobApplicationId(null);
      setJobTitle(jobPosting?.title || "");
      setCompanyName(jobPosting?.company.name || "");
      setJobDescription(jobPosting?.description || "");
      setAnalysisResult(null);
      setAnalysisError(null);

      // Auto-select most recent resume if user has one
      const lastResume = resumes[0];
      if (lastResume) {
        setSavedResumeId(lastResume.id);
        setResumeTitle(lastResume.title || "");
        setResumeText(lastResume.content || "");
        setResumeDocumentSource(lastResume);
      } else {
        setResumeText("");
        setResumeTitle("");
        setSavedResumeId(null);
        clearResumeDocumentSource();
      }

      setDataLoaded(true);
      return;
    }

    if (!startFresh && jobApps.length > 0) {
      const selected =
        (requestedApplicationId
          ? jobApps.find((app) => app.id === requestedApplicationId)
          : null) || jobApps[0];

      setSelectedJobApplicationId(selected.id);
      setJobTitle(selected.jobTitle || "");
      setCompanyName(selected.companyName || "");
      setJobDescription(selected.jobDescription || "");
      setAnalysisResult(selected.analyses?.[0] || null);
      setAnalysisError(null);

      if (selected.resume?.id) {
        const linkedResume = resumes.find((r) => r.id === selected.resume?.id);
        if (linkedResume) {
          setSavedResumeId(linkedResume.id);
          setResumeTitle(linkedResume.title || "");
          setResumeText(linkedResume.content || "");
          setResumeDocumentSource(linkedResume);
        }
      }

    } else {
      setSelectedJobApplicationId(null);
      setJobTitle("");
      setCompanyName("");
      setJobDescription("");
      setAnalysisResult(null);
      setAnalysisError(null);

      setResumeText("");
      setResumeTitle("");
      setSavedResumeId(null);
      clearResumeDocumentSource();
    }

    setDataLoaded(true);
  }, [
    dataLoaded,
    loadingResumes,
    loadingJobApplications,
    loadingJobPosting,
    existingResumes,
    existingJobApplications,
    requestedApplicationId,
    startFresh,
    isPublicApplication,
    jobPosting,
    setResumeDocumentSource,
    clearResumeDocumentSource,
  ]);

  const completedSteps = React.useMemo(() => {
    const completed = new Set<Step>();
    if (savedResumeId && resumeText.trim()) completed.add("resume");
    if (jobDescription.trim()) completed.add("job-description");
    if (analysisResult) completed.add("analysis");
    return completed;
  }, [savedResumeId, resumeText, jobDescription, analysisResult]);

  const showSaveStatus = (msg: string) => {
    setSaveStatus(msg);
    setTimeout(() => setSaveStatus(null), 2000);
  };

  const saveDraftForStep = React.useCallback(
    async (overrides?: {
      resumeId?: string | null;
      jobTitle?: string;
      companyName?: string;
      jobDescription?: string;
    }) => {
      const payload = {
        resumeId: overrides?.resumeId !== undefined ? overrides.resumeId : savedResumeId || undefined,
        jobTitle: overrides?.jobTitle !== undefined ? overrides.jobTitle : jobTitle || undefined,
        companyName:
          overrides?.companyName !== undefined
            ? overrides.companyName
            : companyName || undefined,
        jobDescription:
          overrides?.jobDescription !== undefined
            ? overrides.jobDescription
            : jobDescription || "",
      };

      if (selectedJobApplicationId) {
        await api.patch(`/api/job-application/${selectedJobApplicationId}`, payload);
        return selectedJobApplicationId;
      }

      const created = await api.post<{
        jobApplication: { id: string; status: string };
      }>("/api/job-application", { ...payload, triggerAnalysis: false });

      setSelectedJobApplicationId(created.jobApplication.id);
      queryClient.invalidateQueries({ queryKey: ["jobApplications"] });
      return created.jobApplication.id;
    },
    [
      selectedJobApplicationId,
      savedResumeId,
      jobTitle,
      companyName,
      jobDescription,
      queryClient,
    ]
  );

  const deleteResumeMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete("/api/resume?id=" + id);
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
      showSaveStatus(t("onboarding.resumeDeleted"));
      if (savedResumeId === deletedId) {
        setSavedResumeId(null);
        setResumeTitle("");
        setResumeText("");
        clearResumeDocumentSource();
      }
    },
  });

  const resumeSaveMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; fileUrl?: string | null; filePath?: string | null }) => {
      if (savedResumeId) {
        return api.patch<{ resume: ResumeData }>("/api/resume", {
          id: savedResumeId,
          ...data,
        });
      }
      return api.post<{ resume: ResumeData }>("/api/resume", data);
    },
    onSuccess: (data) => {
      setSavedResumeId(data.resume.id);
      if (data.resume.fileUrl || !resumeLocalPreviewUrl) {
        setResumeDocumentSource(data.resume);
      } else {
        setResumeFilePath(data.resume.filePath || null);
      }
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
      showSaveStatus(t("onboarding.resumeSaved"));
    },
  });

  const analyzeExistingJobApplicationMutation = useMutation({
    mutationFn: ({ id, idempotencyKey }: { id: string; idempotencyKey: string }) =>
      api.post<{
        jobApplication: { id: string; status: string };
        analysis: AnalysisData;
      }>("/api/job-application/" + id + "/analyze", { idempotencyKey }),
    onSuccess: (data) => {
      setAnalysisResult(data.analysis);
      setAnalysisError(null);
      refreshCredits();
      queryClient.invalidateQueries({ queryKey: ["jobApplications"] });
    },
    onError: (error) => {
      setAnalysisError(error.message || "Failed to analyze application");
    },
  });

  const updateApplicationStatusMutation = useMutation({
    mutationFn: async (status: JobApplicationStatus) => {
      if (!selectedJobApplicationId) {
        throw new Error("Application not found");
      }

      return api.patch<{ jobApplication: JobApplicationData }>(
        "/api/job-application/" + selectedJobApplicationId,
        { status }
      );
    },
    onSuccess: (_data, status) => {
      queryClient.invalidateQueries({ queryKey: ["jobApplications"] });
      if (status === "APPLIED") {
        showSaveStatus("Application moved to Applied!");
        return;
      }

      if (status === "INTERVIEWING") {
        showSaveStatus("Application moved to Interview!");
        return;
      }

      showSaveStatus("Application updated!");
    },
    onError: (error) => {
      setAnalysisError(
        error instanceof Error ? error.message : "Failed to update application status"
      );
    },
  });

  const handleSaveResume = async () => {
    if (!resumeText.trim()) {
      window.alert(t("onboarding.resumeRequiredAlert"));
      return;
    }
    setIsSavingDraft(true);
    try {
      const saved = await resumeSaveMutation.mutateAsync({
        title: resumeTitle || t("onboarding.defaultResumeTitle"),
        content: resumeText,
        fileUrl: resumeFileUrl,
        filePath: resumeFilePath,
      });
      if (!isPublicApplication) {
        await saveDraftForStep({ resumeId: saved.resume.id });
      } else {
        setSavedResumeId(saved.resume.id);
      }
      showSaveStatus(t("onboarding.resumeDraftSaved"));
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSaveResumeAndContinue = async () => {
    if (!resumeText.trim()) {
      window.alert(t("onboarding.resumeContinueAlert"));
      return;
    }
    setIsSavingDraft(true);
    try {
      const saved = await resumeSaveMutation.mutateAsync({
        title: resumeTitle || t("onboarding.defaultResumeTitle"),
        content: resumeText,
        fileUrl: resumeFileUrl,
        filePath: resumeFilePath,
      });
      if (!isPublicApplication) {
        await saveDraftForStep({ resumeId: saved.resume.id });
      } else {
        setSavedResumeId(saved.resume.id);
      }
      showSaveStatus(t("onboarding.resumeDraftSaved"));
      setCurrentStep("job-description");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleLoadExistingResume = (resume: ResumeData) => {
    setResumeText(resume.content || "");
    setResumeTitle(resume.title || "");
    setSavedResumeId(resume.id);
    setResumeDocumentSource(resume);
    setResumeUploadError(null);
  };

  const handleOpenResumeDocument = () => {
    if (!resumePreviewUrl) {
      window.alert(t("onboarding.previewUnavailable"));
      return;
    }

    if (resumeFileType === "pdf") {
      window.open(resumePreviewUrl, "_blank", "noopener,noreferrer");
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = resumePreviewUrl;
    anchor.download = getDownloadFileName(
      resumeFileName,
      resumePreviewTitle,
      resumeFileType
    );
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const uploadResumeFileForPreview = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Resume file upload failed");
    }

    return (await response.json()) as {
      url: string;
      pathname: string;
      contentType?: string;
    };
  };

  const handleExtractResumeFromFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const input = event.currentTarget;
    const file = input.files?.[0] || null;
    if (!file) return;

    setResumeUploadError(null);
    setIsExtractingResume(true);
    setIsUploadingResumeFile(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/resume/extract", {
        method: "POST",
        body: formData,
      });

      const responseText = await response.text();
      const isJsonResponse =
        response.headers.get("content-type")?.includes("application/json") ||
        false;

      let payload: {
        error?: string;
        details?: string;
        title?: string;
        content?: string;
        truncated?: boolean;
      } = {};

      if (isJsonResponse) {
        try {
          payload = JSON.parse(responseText) as typeof payload;
        } catch {
          payload = {};
        }
      }

      if (!response.ok) {
        const isHtmlLike =
          responseText.trim().startsWith("<!DOCTYPE") ||
          responseText.trim().startsWith("<html");

        const fallbackMessage = isHtmlLike
          ? "Upload failed (HTTP " + response.status + ")."
          : responseText.trim().slice(0, 200);

        const detailedMessage = payload.details
          ? (payload.error || "Failed to extract CV text.") +
            " (" +
            payload.details +
            ")"
          : payload.error || fallbackMessage || "Failed to extract CV text.";

        throw new Error(detailedMessage);
      }

      const localPreviewUrl = URL.createObjectURL(file);
      const documentType = getDocumentType(file.name || file.type);
      setResumeLocalPreviewUrl(localPreviewUrl);
      setResumeFileUrl(null);
      setResumeFilePath(null);
      setResumeFileType(documentType || file.type || null);
      setResumeFileName(file.name || null);
      setIsUploadingResumeFile(true);

      try {
        const uploaded = await uploadResumeFileForPreview(file);
        setResumeFileUrl(uploaded.url);
        setResumeFilePath(uploaded.pathname);
        setResumeFileType(
          documentType || getDocumentType(uploaded.contentType) || file.type || null
        );
        setResumeFileName(file.name || uploaded.pathname.split("/").pop() || null);
        if (documentType !== "pdf") {
          setResumeLocalPreviewUrl(null);
        }
      } catch (uploadError) {
        console.warn("Resume file preview upload failed:", uploadError);
      } finally {
        setIsUploadingResumeFile(false);
      }

      setResumeTitle(payload.title || file.name.replace(/\.[^/.]+$/, ""));
      setResumeText(payload.content || "");
      setSavedResumeId(null);
      showSaveStatus(
        payload.truncated
          ? t("onboarding.resumeExtractedTruncated")
          : t("onboarding.resumeExtracted")
      );
    } catch (error) {
      setResumeUploadError(
        error instanceof Error
          ? error.message
          : t("onboarding.resumeExtractFailed")
      );
    } finally {
      setIsExtractingResume(false);
      input.value = "";
    }
  };

  const handleCrawlUrl = async () => {
    const trimmedUrl = jobUrl.trim();
    if (!trimmedUrl) return;
    setCrawlError(null);
    setIsCrawling(true);
    try {
      const result = await api.post<{
        extracted: { jobTitle: string; companyName: string; jobDescription: string };
      }>("/api/job-application/crawl", { url: trimmedUrl });
      const { jobTitle: extractedTitle, companyName: extractedCompany, jobDescription: extractedDescription } = result.extracted;
      if (extractedTitle) setJobTitle(extractedTitle);
      if (extractedCompany) setCompanyName(extractedCompany);
      if (extractedDescription) setJobDescription(extractedDescription);
    } catch (err) {
      setCrawlError(err instanceof Error ? err.message : "Failed to fetch job posting from this URL.");
    } finally {
      setIsCrawling(false);
    }
  };

  const handleSaveJobDescriptionDraft = async () => {
    if (!savedResumeId) return;
    setIsSavingDraft(true);
    try {
      await saveDraftForStep();
      showSaveStatus("Draft saved!");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmitPlatformApplication = async () => {
    if (!savedResumeId || !jobPostingId) return;
    setIsSubmittingPlatformApp(true);
    setPlatformAppError(null);
    try {
      await api.post("/api/job-application", {
        jobPostingId,
        resumeId: savedResumeId,
        triggerAnalysis: false,
      });
      setPlatformAppSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["jobApplications"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao submeter candidatura";
      setPlatformAppError(msg);
    } finally {
      setIsSubmittingPlatformApp(false);
    }
  };

  const handleSubmitJobApplication = async () => {
    if (!jobDescription.trim() || !savedResumeId) return;

    posthog.capture("onboarding_analysis_submitted", {
      has_job_description: Boolean(jobDescription.trim()),
      has_resume: Boolean(savedResumeId),
    });

    setCurrentStep("analysis");
    setIsAnalyzingExisting(true);
    setAnalysisError(null);

    if (!analysisRequestKeyRef.current) {
      analysisRequestKeyRef.current =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : String(Date.now()) + "-" + Math.random().toString(36).slice(2);
    }

    try {
      const jobApplicationId = await saveDraftForStep();
      await analyzeExistingJobApplicationMutation.mutateAsync({
        id: jobApplicationId,
        idempotencyKey: analysisRequestKeyRef.current,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to analyze existing application";
      setAnalysisError(message);
    } finally {
      setIsAnalyzingExisting(false);
      analysisRequestKeyRef.current = null;
    }
  };

  const handleUpdateApplicationStatus = async (
    status: JobApplicationStatus,
    options?: { redirectToApplications?: boolean }
  ) => {
    if (!selectedJobApplicationId) return;

    setAnalysisError(null);
    await updateApplicationStatusMutation.mutateAsync(status);

    if (options?.redirectToApplications) {
      router.push("/applications");
    }
  };

  const isLoading =
    loadingResumes || loadingJobApplications || (isPublicApplication && loadingJobPosting);

  React.useEffect(() => {
    if (!(analyzeExistingJobApplicationMutation.isPending || isAnalyzingExisting)) {
      setAnalysisProgressIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setAnalysisProgressIndex((current) =>
        current < analysisProgressSteps.length - 1 ? current + 1 : current
      );
    }, 2200);

    return () => window.clearInterval(interval);
  }, [
    analyzeExistingJobApplicationMutation.isPending,
    isAnalyzingExisting,
    analysisProgressSteps.length,
  ]);

  const resumePreviewUrl =
    resumeFileType === "pdf"
      ? resumeLocalPreviewUrl || resumeFileUrl
      : resumeFileUrl || resumeLocalPreviewUrl;
  const resumePreviewTitle = resumeTitle || t("onboarding.untitledResume");
  const hasResumeDocument = Boolean(resumePreviewUrl);
  const isPdfResume = resumeFileType === "pdf";
  const resumeDocumentActionLabel = isPdfResume
    ? t("onboarding.openPdf")
    : t("onboarding.downloadDocument");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {saveStatus && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4" />
          {saveStatus}
        </div>
      )}

      <StepIndicator
        steps={STEPS}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={setCurrentStep}
        isPublicApplication={isPublicApplication}
        t={t}
      />

      <div className="bg-card rounded-2xl border border-border p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium">
                {t("onboarding.applicationContext")}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedJobApplicationId
                  ? t("onboarding.editingApplication")
                  : t("onboarding.creatingApplication")}
              </p>
            </div>
            {currentApplication && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{getStatusLabel(currentApplication.status)}</Badge>
                {getOutcomeLabel(currentApplication.status) && (
                  <Badge className="bg-emerald-500 text-white hover:bg-emerald-600">
                    {getOutcomeLabel(currentApplication.status)}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {mapStatusToKanbanStage(currentApplication.status) === "IN_PROGRESS"
                    ? t("onboarding.statusInProgress")
                    : mapStatusToKanbanStage(currentApplication.status) === "APPLIED"
                    ? t("onboarding.statusApplied")
                    : t("onboarding.statusInterview")}
                </span>
              </div>
            )}
          </div>
          <Button variant="outline" onClick={() => router.push("/applications")}>
            <ArrowRight className="h-4 w-4" />
            {t("onboarding.openKanban")}
          </Button>
        </div>
      </div>

      {currentStep === "resume" && (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-[32px] border border-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,248,244,0.96))] p-6 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(191,219,254,0.24),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(217,249,157,0.22),transparent_34%)]" />
            <div className="relative space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-foreground text-background">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">
                      {t("onboarding.resumeStepTitle")}
                    </h2>
                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                      {t("onboarding.resumeStepDescription")}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="w-fit rounded-full px-3">
                  {t("onboarding.required")}
                </Badge>
              </div>

              <div className="mx-auto grid w-full max-w-3xl gap-4">
                <div className="rounded-[28px] border border-border/70 bg-background/85 p-5 sm:p-6">
                  <div className="mx-auto max-w-2xl">
                    <div className="mb-5 flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground text-background">
                        <Upload className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {t("onboarding.useFileTitle")}
                        </p>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {t("onboarding.useFileDescription")}
                        </p>
                      </div>
                    </div>

                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-white/80 px-4 py-4 text-sm font-medium text-foreground transition-colors hover:border-foreground/20 hover:bg-white">
                      {isExtractingResume ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      <span>
                        {isExtractingResume
                          ? t("onboarding.extracting")
                          : t("onboarding.chooseFile")}
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="hidden"
                        onChange={handleExtractResumeFromFile}
                        disabled={isExtractingResume}
                      />
                    </label>
                    {resumeUploadError && (
                      <p className="mt-3 text-xs text-destructive">
                        {resumeUploadError}
                      </p>
                    )}

                    {resumeText.trim() && (
                      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border bg-white/85 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-background text-foreground ring-1 ring-border">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {resumePreviewTitle}
                            </p>
                            <p className="text-xs leading-5 text-muted-foreground">
                              {isUploadingResumeFile
                                ? t("onboarding.preparingPreview")
                                : hasResumeDocument
                                ? isPdfResume
                                  ? t("onboarding.pdfPreviewReady")
                                  : t("onboarding.wordDownloadReady")
                                : t("onboarding.previewUnavailableShort")}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="shrink-0 rounded-xl"
                          onClick={handleOpenResumeDocument}
                          disabled={isUploadingResumeFile || !hasResumeDocument}
                        >
                          {isUploadingResumeFile ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isPdfResume ? (
                            <ExternalLink className="h-4 w-4" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          {resumeDocumentActionLabel}
                        </Button>
                      </div>
                    )}

                    <div className="my-5 flex items-center gap-3">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        {t("onboarding.or")}
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-foreground">
                        {t("onboarding.existingResumeLabel")}
                      </label>
                      <Select
                        value={savedResumeId ?? undefined}
                        onValueChange={(value) => {
                          const resume = existingResumes?.resumes?.find(
                            (item) => item.id === value
                          );
                          if (resume) handleLoadExistingResume(resume);
                        }}
                        disabled={!existingResumes?.resumes?.length}
                      >
                        <SelectTrigger className="h-12 rounded-2xl bg-white/90">
                          <SelectValue
                            placeholder={
                              existingResumes?.resumes?.length
                                ? t("onboarding.existingResumePlaceholder")
                                : t("onboarding.noExistingResumes")
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {(existingResumes?.resumes || []).map((resume) => {
                            const uploadedAt = formatResumeDate(
                              resume.createdAt,
                              locale
                            );
                            return (
                              <SelectItem key={resume.id} value={resume.id}>
                                {(resume.title || t("onboarding.untitledResume")) +
                                  (uploadedAt ? " - " + uploadedAt : "")}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    {savedResumeId && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="mt-3 h-auto rounded-xl px-3 py-2 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (window.confirm(t("onboarding.deleteResumeConfirm"))) {
                            deleteResumeMutation.mutate(savedResumeId);
                          }
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                        {t("onboarding.deleteResume")}
                      </Button>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div className="mx-auto flex max-w-5xl flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button
              variant="outline"
              onClick={handleSaveResume}
              disabled={!resumeText.trim() || resumeSaveMutation.isPending || isSavingDraft}
            >
              {resumeSaveMutation.isPending || isSavingDraft ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {t("onboarding.save")}
            </Button>
            <Button
              onClick={handleSaveResumeAndContinue}
              disabled={!resumeText.trim() || resumeSaveMutation.isPending || isSavingDraft}
            >
              {resumeSaveMutation.isPending || isSavingDraft ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {t("onboarding.saveAndContinue")}
            </Button>
          </div>
        </div>
      )}

      {currentStep === "job-description" && (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-[32px] border border-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,248,244,0.96))] p-6 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,249,157,0.24),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(191,219,254,0.2),transparent_34%)]" />
            <div className="relative space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-foreground text-background">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">
                      {t("onboarding.jobDescription")}
                    </h2>
                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                      {isPublicApplication
                        ? t("onboarding.publicJobDescriptionDesc")
                        : t("onboarding.jobDescriptionDesc")}
                    </p>
                  </div>
                </div>
                <Badge variant={isPublicApplication ? "outline" : "secondary"} className="w-fit rounded-full px-3">
                  {isPublicApplication ? t("onboarding.preFilled") : t("onboarding.required")}
                </Badge>
              </div>

              {isPublicApplication && jobPosting ? (
                <div className="space-y-4 rounded-[28px] border border-border/70 bg-white/90 p-5 sm:p-6">
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
                      <Briefcase className="h-3.5 w-3.5" />
                      {jobPosting.title}
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" />
                      {jobPosting.company.name}
                    </div>
                    <span className="inline-flex items-center rounded-full border border-border bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
                      {CATEGORY_LABELS[jobPosting.category]}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-border bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
                      {JOB_TYPE_LABELS[jobPosting.jobType]}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      {SALARY_RANGE_LABELS[jobPosting.salaryRange]}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/20 p-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("onboarding.description")}
                    </p>
                    <RichTextViewer content={jobPosting.description} className="text-sm leading-relaxed" />
                  </div>
                </div>
              ) : (
                <div
                  className={`mx-auto grid w-full gap-4 ${
                    jobDescription.trim()
                      ? "max-w-5xl lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
                      : "max-w-3xl"
                  }`}
                >
                  <div className="rounded-[28px] border border-border/70 bg-background/85 p-5 sm:p-6">
                    <div className="mx-auto max-w-2xl space-y-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lime text-lime-foreground">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {t("onboarding.pasteJobTextTitle")}
                          </p>
                          <p className="text-sm leading-6 text-muted-foreground">
                            {t("onboarding.pasteJobTextDescription")}
                          </p>
                        </div>
                      </div>

                      <textarea
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        placeholder={t("onboarding.jobDescriptionPlaceholder")}
                        rows={10}
                        className="min-h-[240px] w-full resize-y rounded-2xl border border-input bg-white/90 px-4 py-3 text-sm leading-6 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />

                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          {t("onboarding.or")}
                        </span>
                        <div className="h-px flex-1 bg-border" />
                      </div>

                      <div className="space-y-3 rounded-2xl border border-border/70 bg-white/80 p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background">
                            <Link className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {t("onboarding.jobLinkTitle")}
                            </p>
                            <p className="text-sm leading-6 text-muted-foreground">
                              {t("onboarding.jobLinkDescription")}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            type="url"
                            value={jobUrl}
                            onChange={(e) => { setJobUrl(e.target.value); setCrawlError(null); }}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCrawlUrl(); } }}
                            placeholder="https://company.com/careers/job-posting"
                            disabled={isCrawling}
                            className="min-w-0 flex-1 rounded-2xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                          />
                          <Button
                            type="button"
                            onClick={handleCrawlUrl}
                            disabled={!jobUrl.trim() || isCrawling}
                            className="h-12 shrink-0 rounded-2xl"
                          >
                            {isCrawling ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {t("onboarding.fetching")}
                              </>
                            ) : (
                              <>
                                <Search className="h-4 w-4" />
                                {t("onboarding.fetch")}
                              </>
                            )}
                          </Button>
                        </div>

                        {crawlError && (
                          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{crawlError}</span>
                          </div>
                        )}

                        <p className="text-xs leading-5 text-muted-foreground">
                          {t("onboarding.urlImportHelp")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {jobDescription.trim() && (
                    <div className="rounded-[28px] border border-border/70 bg-white/90 p-5 sm:p-6">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background text-foreground ring-1 ring-border">
                          <Eye className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {t("onboarding.jobDescriptionOverview")}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {jobTitle || companyName
                              ? [jobTitle, companyName].filter(Boolean).join(" - ")
                              : t("onboarding.jobDescriptionSelected")}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap border-t border-border/70 pt-4 text-sm leading-6 text-muted-foreground">
                        {jobDescription}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mx-auto flex max-w-5xl flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep("resume")}
            >
              <ArrowLeft className="h-4 w-4" />
              {t("onboarding.back")}
            </Button>
            <div className="flex items-center gap-3">
              {isPublicApplication ? (
                <Button
                  onClick={() => setCurrentStep("analysis")}
                  disabled={!savedResumeId}
                >
                  <ArrowRight className="h-4 w-4" />
                  {t("onboarding.continue")}
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={handleSaveJobDescriptionDraft}
                    disabled={!savedResumeId || isSavingDraft || isAnalyzingExisting}
                  >
                    {isSavingDraft ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {t("onboarding.saveDraft")}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {t("onboarding.costCredits", { credits: 10 })}
                  </span>
                  <Button
                    onClick={handleSubmitJobApplication}
                    disabled={
                      !jobDescription.trim() ||
                      !savedResumeId ||
                      analyzeExistingJobApplicationMutation.isPending || isAnalyzingExisting || isSavingDraft
                    }
                  >
                    {analyzeExistingJobApplicationMutation.isPending || isAnalyzingExisting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("onboarding.analyzingShort")}
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        {t("onboarding.analyzeApplicationButton")}
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>

          {!savedResumeId && (
            <div className="flex items-center gap-2 rounded-lg border border-yellow-400 bg-yellow-200 p-3 text-sm font-medium text-black">
              <AlertCircle className="h-4 w-4 shrink-0 text-black" />
              {t("onboarding.saveResumeFirst")}
            </div>
          )}
        </div>
      )}

      {currentStep === "analysis" && isPublicApplication && (
        <div className="space-y-6">
          {platformAppSubmitted ? (
            <div className="bg-card rounded-2xl border border-border p-12 flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold">
                {t("onboarding.applicationSubmittedTitle")}
              </h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md">
                {t("onboarding.applicationSubmittedDescription")}
              </p>
              <Button
                className="mt-6"
                onClick={() => router.push("/applications")}
              >
                {t("onboarding.viewMyApplications")}
              </Button>
            </div>
          ) : (
            <>
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">
                      {t("onboarding.confirmApplication")}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {t("onboarding.confirmApplicationDescription")}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {jobPosting && (
                    <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4">
                      <div 
                        className="flex items-start gap-3 cursor-pointer select-none"
                        onClick={() => setExpandedVaga(!expandedVaga)}
                      >
                        <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                              {t("onboarding.vacancy")}
                            </p>
                            {expandedVaga ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                          </div>
                          <p className="font-medium">{jobPosting.title}</p>
                          <p className="text-sm text-muted-foreground">{jobPosting.company.name}</p>
                        </div>
                      </div>
                      {expandedVaga && (
                        <div className="mt-2 text-sm text-muted-foreground border-t border-border/50 pt-3">
                          <RichTextViewer content={jobPosting.description} />
                        </div>
                      )}
                    </div>
                  )}
                  {savedResumeId && (
                    <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-1 items-start gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                                {t("onboarding.stepResume")}
                              </p>
                            </div>
                            <p className="font-medium">
                              {existingResumes?.resumes?.find((r) => r.id === savedResumeId)?.title ?? t("onboarding.selectedResume")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {hasResumeDocument
                                ? isPdfResume
                                  ? t("onboarding.pdfPreviewReady")
                                  : t("onboarding.wordDownloadReady")
                                : t("onboarding.previewUnavailableShort")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleOpenResumeDocument}
                            disabled={!hasResumeDocument}
                            className="shrink-0"
                          >
                            {isPdfResume ? (
                              <ExternalLink className="h-4 w-4" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                            {resumeDocumentActionLabel}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setCurrentStep("resume")} className="shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground border border-input shadow-sm">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {platformAppError && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive mt-4">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {platformAppError}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep("job-description")}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("onboarding.back")}
                </Button>
                <Button
                  onClick={handleSubmitPlatformApplication}
                  disabled={isSubmittingPlatformApp || !savedResumeId}
                >
                  {isSubmittingPlatformApp ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("onboarding.submitting")}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      {t("onboarding.confirmApplication")}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {currentStep === "analysis" && !isPublicApplication && (
        <div className="space-y-6">
          {(analyzeExistingJobApplicationMutation.isPending || isAnalyzingExisting) && (
            <div className="relative overflow-hidden rounded-[32px] border border-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,248,244,0.96))] p-6 sm:p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,249,157,0.28),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(191,219,254,0.22),transparent_34%)]" />
              <div className="relative grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start">
                <div className="space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                      {t("onboarding.analyzing")}
                    </h3>
                    <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                      {t("onboarding.analysisTimeHint")}
                    </p>
                  </div>
                </div>

                <div className="rounded-[28px] border border-border/70 bg-white/90 p-5">
                  <div className="space-y-1">
                    {analysisProgressSteps.map((step, index) => {
                      const isComplete = index < analysisProgressIndex;
                      const isActive = index === analysisProgressIndex;

                      return (
                        <motion.div
                          key={step}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: isActive || isComplete ? 1 : 0.32, y: 0 }}
                          transition={{ duration: 0.24, ease: "easeOut" }}
                          className="flex items-center gap-4 rounded-2xl px-2 py-3"
                        >
                          <div
                            className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                              isComplete
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : isActive
                                ? "border-foreground text-foreground"
                                : "border-muted-foreground/35 text-transparent"
                            }`}
                          >
                            {isComplete ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : isActive ? (
                              <>
                                <motion.span
                                  className="absolute inset-0 rounded-full border border-foreground/40"
                                  animate={{ scale: [1, 1.35, 1], opacity: [0.55, 0, 0.55] }}
                                  transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                                />
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                                >
                                  <Loader2 className="h-4 w-4" />
                                </motion.div>
                              </>
                            ) : (
                              <span className="h-3 w-3 rounded-full border border-muted-foreground/25" />
                            )}
                          </div>
                          <p
                            className={`min-w-0 text-sm leading-5 transition-colors ${
                              isActive || isComplete
                                ? "text-foreground"
                                : "text-muted-foreground"
                            }`}
                          >
                            {step}
                          </p>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {analysisError && !analysisResult && (
            <div className="rounded-[28px] border border-destructive/30 bg-white/90 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive/10">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold text-destructive">
                    {t("onboarding.analysisFailed")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {analysisError}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setCurrentStep("job-description");
                  setAnalysisError(null);
                }}
              >
                <RefreshCw className="h-4 w-4" />
                {t("onboarding.tryAgain")}
              </Button>
            </div>
          )}

          {analysisResult && (
            <>
              <div className="relative overflow-hidden rounded-[32px] border border-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,248,244,0.96))] p-6 sm:p-8">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,249,157,0.28),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(191,219,254,0.22),transparent_34%)]" />
                <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center">
                  <div className="relative shrink-0">
                    <svg
                      width="120"
                      height="120"
                      viewBox="0 0 120 120"
                      className="-rotate-90"
                    >
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        strokeWidth="8"
                        className="stroke-muted"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        strokeWidth="8"
                        strokeDasharray={2 * Math.PI * 50}
                        strokeDashoffset={
                          2 * Math.PI * 50 * (1 - (analysisResult.fitScore || 0) / 100)
                        }
                        strokeLinecap="round"
                        className={`stroke-current transition-all duration-1000 ${
                          (analysisResult.fitScore || 0) >= 70
                            ? "text-emerald-400"
                            : (analysisResult.fitScore || 0) >= 50
                            ? "text-amber-300"
                            : "text-rose-300"
                        }`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold">
                        {analysisResult.fitScore !== null ? Math.round(analysisResult.fitScore) : "—"}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">/ 100</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-semibold">{t("onboarding.matchScore")}</h3>
                      <Badge
                        className={`text-xs text-white border-transparent ${
                          (analysisResult.fitScore || 0) >= 70
                            ? "bg-emerald-500 hover:bg-emerald-600"
                            : (analysisResult.fitScore || 0) >= 50
                            ? "bg-orange-500 hover:bg-orange-600"
                            : "bg-rose-500 hover:bg-rose-600"
                        }`}
                      >
                        {(analysisResult.fitScore || 0) >= 70
                          ? t("onboarding.strongMatch")
                          : (analysisResult.fitScore || 0) >= 50
                          ? t("onboarding.moderateMatch")
                          : t("onboarding.needsWork")}
                      </Badge>
                    </div>
                    {analysisResult.summary && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {analysisResult.summary}
                      </p>
                    )}
                    {!analysisResult.summary && (
                      <p className="text-sm text-muted-foreground">
                        {(analysisResult.fitScore || 0) >= 70
                          ? t("onboarding.scoreSummaryStrong")
                          : (analysisResult.fitScore || 0) >= 50
                          ? t("onboarding.scoreSummaryModerate")
                          : t("onboarding.scoreSummaryNeedsWork")}
                      </p>
                    )}

                    <div className="mt-5 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-2xl border border-border/70 bg-white/75 px-4 py-3">
                        <div className="text-2xl font-semibold tracking-tight text-foreground">
                          {toStringArray(analysisResult.skillsMatch).length}
                        </div>
                        <div className="mt-1 text-xs font-medium text-muted-foreground">
                          {t("onboarding.skillsMatch")}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-white/75 px-4 py-3">
                        <div className="text-2xl font-semibold tracking-tight text-foreground">
                          {toStringArray(analysisResult.missingSkills).length}
                        </div>
                        <div className="mt-1 text-xs font-medium text-muted-foreground">
                          {t("onboarding.gapsFound")}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-white/75 px-4 py-3">
                        <div className="text-2xl font-semibold tracking-tight text-foreground">
                          {toStringArray(analysisResult.recommendations).length}
                        </div>
                        <div className="mt-1 text-xs font-medium text-muted-foreground">
                          {t("onboarding.recommendations")}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {toStringArray(analysisResult.skillsMatch).length > 0 && (
                  <div className="overflow-hidden rounded-[28px] border border-border/70 bg-white/90 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-7 w-7 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm">{t("onboarding.matchingSkills")}</h4>
                        <p className="text-xs text-muted-foreground">
                          {t("onboarding.skillsAlignedCount", {
                            count: toStringArray(analysisResult.skillsMatch).length,
                          })}
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-1.5">
                      {toStringArray(analysisResult.skillsMatch).map(
                        (skill, i) => (
                          <li
                            key={i}
                            className="text-sm flex items-start gap-2 p-2 rounded-lg bg-emerald-500 text-white"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-white mt-0.5 shrink-0" />
                            <span className="break-words min-w-0 font-medium">{skill}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                {toStringArray(analysisResult.missingSkills).length > 0 && (
                  <div className="overflow-hidden rounded-[28px] border border-border/70 bg-white/90 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-7 w-7 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
                        <AlertCircle className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm">{t("onboarding.missingSkills")}</h4>
                        <p className="text-xs text-muted-foreground">
                          {t("onboarding.gapsToAddressCount", {
                            count: toStringArray(analysisResult.missingSkills).length,
                          })}
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-1.5">
                      {toStringArray(analysisResult.missingSkills).map(
                        (skill, i) => (
                          <li
                            key={i}
                            className="text-sm flex items-start gap-2 p-2 rounded-lg bg-orange-500 text-white"
                          >
                            <AlertCircle className="h-3.5 w-3.5 text-white mt-0.5 shrink-0" />
                            <span className="break-words min-w-0 font-medium">{skill}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {analysisResult.keywordAnalysis && (
                <div className="overflow-hidden rounded-[28px] border border-border/70 bg-white/90 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-7 w-7 rounded-lg bg-sky-500 flex items-center justify-center shrink-0">
                      <Search className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm">{t("onboarding.keywordAnalysis")}</h4>
                      <p className="text-xs text-muted-foreground">{t("onboarding.keywordAnalysisDescription")}</p>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {(analysisResult.keywordAnalysis.found || []).length > 0 && (
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
                          {t("onboarding.foundInResume", {
                            count: (analysisResult.keywordAnalysis.found || []).length,
                          })}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {(analysisResult.keywordAnalysis.found || []).map((kw, i) => (
                            <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-emerald-500 text-white font-medium break-words">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(analysisResult.keywordAnalysis.missing || []).length > 0 && (
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                          <XCircle className="h-3 w-3 shrink-0 text-orange-300" />
                          {t("onboarding.missingFromResume", {
                            count: (analysisResult.keywordAnalysis.missing || []).length,
                          })}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {(analysisResult.keywordAnalysis.missing || []).map((kw, i) => (
                            <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-orange-500 text-white font-medium break-words">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {toStringArray(analysisResult.strengths).length > 0 && (
                <div className="overflow-hidden rounded-[28px] border border-border/70 bg-white/90 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-7 w-7 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                      <TrendingUp className="h-4 w-4 text-white" />
                    </div>
                    <h4 className="font-semibold text-sm">{t("onboarding.yourStrengths")}</h4>
                  </div>
                  <ul className="space-y-2">
                    {toStringArray(analysisResult.strengths).map(
                      (item, i) => (
                        <li
                          key={i}
                          className="text-sm text-white bg-emerald-500 flex items-start gap-3 p-2 rounded-lg transition-colors font-medium border border-transparent"
                        >
                          <CheckCircle2 className="h-4 w-4 text-white mt-0.5 shrink-0" />
                          <span className="break-words min-w-0">{renderHighlightedAnalysisText(item, "emerald")}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

              {toStringArray(analysisResult.improvements).length > 0 && (
                <div className="overflow-hidden rounded-[28px] border border-border/70 bg-white/90 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-7 w-7 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
                      <Lightbulb className="h-4 w-4 text-white" />
                    </div>
                    <h4 className="font-semibold text-sm">{t("onboarding.improvements")}</h4>
                  </div>
                  <ul className="space-y-2">
                    {toStringArray(analysisResult.improvements).map(
                      (item, i) => (
                        <li
                          key={i}
                          className="text-sm text-white bg-orange-500 flex items-start gap-3 p-2 rounded-lg transition-colors font-medium border border-transparent"
                        >
                          <ArrowRight className="h-4 w-4 text-white mt-0.5 shrink-0" />
                          <span className="break-words min-w-0">{renderHighlightedAnalysisText(item, "orange")}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

              {toStringArray(analysisResult.recommendations).length > 0 && (
                <div className="overflow-hidden rounded-[28px] border border-border/70 bg-white/90 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
                      <Sparkles className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <h4 className="font-semibold text-sm">{t("onboarding.recommendations")}</h4>
                  </div>
                  <ul className="space-y-2">
                    {toStringArray(analysisResult.recommendations).map(
                      (item, i) => (
                        <li
                          key={i}
                          className="text-sm text-primary-foreground bg-primary flex items-start gap-3 p-2 rounded-lg transition-colors font-medium border border-transparent"
                        >
                          <div className="h-5 w-5 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-primary-foreground">{i + 1}</span>
                          </div>
                          <span className="break-words min-w-0">{item}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2 lg:flex-row lg:items-center lg:justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep("job-description")}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("onboarding.modifyAndReanalyze")}
                </Button>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {selectedJobApplicationId && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        handleUpdateApplicationStatus("APPLIED", {
                          redirectToApplications: true,
                        })
                      }
                      disabled={
                        updateApplicationStatusMutation.isPending ||
                        (currentApplication ? mapStatusToKanbanStage(currentApplication.status) !== "IN_PROGRESS" : false)
                      }
                    >
                      {updateApplicationStatusMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {t("onboarding.markAsApplied")}
                    </Button>
                  )}
                  {selectedJobApplicationId && (
                    <Button
                      variant="outline"
                      onClick={() => handleUpdateApplicationStatus("INTERVIEWING")}
                      disabled={
                        updateApplicationStatusMutation.isPending ||
                        currentApplication?.status === "INTERVIEWING" ||
                        currentApplication?.status === "OFFERED" ||
                        currentApplication?.status === "REJECTED" ||
                        currentApplication?.status === "ACCEPTED"
                      }
                    >
                      {updateApplicationStatusMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Target className="h-4 w-4" />
                      )}
                      {t("onboarding.moveToInterview")}
                    </Button>
                  )}
                  <Button onClick={() => router.push("/interview-prep")}>
                    <ArrowRight className="h-4 w-4" />
                    {t("onboarding.continueToInterviewPrep")}
                  </Button>
                </div>
              </div>
            </>
          )}

          {!(analyzeExistingJobApplicationMutation.isPending || isAnalyzingExisting) &&
            !analysisResult &&
            !analysisError && (
              <div className="rounded-[32px] border border-border/70 bg-white/90 p-12 text-center">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">
                  {t("onboarding.noAnalysisYet")}
                </h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                  {t("onboarding.noAnalysisYetDescription")}
                </p>
                <Button
                  onClick={() => setCurrentStep("job-description")}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("onboarding.goToJobDescription")}
                </Button>
              </div>
            )}
        </div>
      )}
    </div>
  );
}

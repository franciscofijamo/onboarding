"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
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
  Copy,
  BarChart3,
  Target,
  TrendingUp,
  Lightbulb,
  Save,
  Search,
  XCircle,
  RefreshCw,
} from "lucide-react";

type Step = "resume" | "cover-letter" | "job-description" | "analysis";

interface ResumeData {
  id: string;
  title: string;
  content: string;
}

interface CoverLetterData {
  id: string;
  title: string;
  content: string;
}

interface JobApplicationData {
  id: string;
  jobTitle: string | null;
  companyName: string | null;
  jobDescription: string;
  status: string;
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
  { key: "cover-letter", required: false },
  { key: "job-description", required: true },
  { key: "analysis", required: false },
];

function StepIndicator({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
}: {
  steps: typeof STEPS;
  currentStep: Step;
  completedSteps: Set<Step>;
  onStepClick: (step: Step) => void;
}) {
  const labels: Record<Step, string> = {
    resume: "CV / Resume",
    "cover-letter": "Cover Letter",
    "job-description": "Job Description",
    analysis: "AI Analysis",
  };
  const icons: Record<Step, React.ReactNode> = {
    resume: <FileText className="h-4 w-4" />,
    "cover-letter": <Copy className="h-4 w-4" />,
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
              {!step.required && (
                <span className="text-xs opacity-60">(optional)</span>
              )}
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

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { credits, refresh: refreshCredits } = useCredits();

  useSetPageMetadata({
    title: "Job Application Onboarding",
    description:
      "Upload your CV, add a job description, and get AI-powered analysis",
    showBreadcrumbs: true,
  });

  const [currentStep, setCurrentStep] = React.useState<Step>("resume");
  const [resumeText, setResumeText] = React.useState("");
  const [resumeTitle, setResumeTitle] = React.useState("");
  const [coverLetterText, setCoverLetterText] = React.useState("");
  const [coverLetterTitle, setCoverLetterTitle] = React.useState("");
  const [jobTitle, setJobTitle] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
  const [jobDescription, setJobDescription] = React.useState("");
  const [savedResumeId, setSavedResumeId] = React.useState<string | null>(
    null
  );
  const [savedCoverLetterId, setSavedCoverLetterId] = React.useState<
    string | null
  >(null);
  const [analysisResult, setAnalysisResult] =
    React.useState<AnalysisData | null>(null);
  const [analysisError, setAnalysisError] = React.useState<string | null>(null);
  const [saveStatus, setSaveStatus] = React.useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = React.useState(false);

  const { data: existingResumes, isLoading: loadingResumes } = useQuery<{
    resumes: ResumeData[];
  }>({
    queryKey: ["resumes"],
    queryFn: () => api.get("/api/resume"),
  });

  const { data: existingCoverLetters, isLoading: loadingCoverLetters } =
    useQuery<{ coverLetters: CoverLetterData[] }>({
      queryKey: ["coverLetters"],
      queryFn: () => api.get("/api/cover-letter"),
    });

  const { data: existingJobApplications, isLoading: loadingJobApplications } =
    useQuery<{ jobApplications: JobApplicationData[] }>({
      queryKey: ["jobApplications"],
      queryFn: () => api.get("/api/job-application"),
    });

  React.useEffect(() => {
    if (dataLoaded) return;
    if (loadingResumes || loadingCoverLetters || loadingJobApplications) return;

    const resumes = existingResumes?.resumes || [];
    const coverLetters = existingCoverLetters?.coverLetters || [];
    const jobApps = existingJobApplications?.jobApplications || [];

    if (resumes.length > 0) {
      const latest = resumes[0];
      setResumeText(latest.content || "");
      setResumeTitle(latest.title || "");
      setSavedResumeId(latest.id);
    }

    if (coverLetters.length > 0) {
      const latest = coverLetters[0];
      setCoverLetterText(latest.content || "");
      setCoverLetterTitle(latest.title || "");
      setSavedCoverLetterId(latest.id);
    }

    if (jobApps.length > 0) {
      const latest = jobApps[0];
      setJobTitle(latest.jobTitle || "");
      setCompanyName(latest.companyName || "");
      setJobDescription(latest.jobDescription || "");

      if (latest.analyses && latest.analyses.length > 0) {
        setAnalysisResult(latest.analyses[0]);
      }
    }

    setDataLoaded(true);
  }, [
    dataLoaded,
    loadingResumes,
    loadingCoverLetters,
    loadingJobApplications,
    existingResumes,
    existingCoverLetters,
    existingJobApplications,
  ]);

  const completedSteps = React.useMemo(() => {
    const completed = new Set<Step>();
    if (savedResumeId && resumeText.trim()) completed.add("resume");
    if (savedCoverLetterId && coverLetterText.trim())
      completed.add("cover-letter");
    if (jobDescription.trim()) completed.add("job-description");
    if (analysisResult) completed.add("analysis");
    return completed;
  }, [
    savedResumeId,
    resumeText,
    savedCoverLetterId,
    coverLetterText,
    jobDescription,
    analysisResult,
  ]);

  const showSaveStatus = (msg: string) => {
    setSaveStatus(msg);
    setTimeout(() => setSaveStatus(null), 2000);
  };

  const resumeSaveMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
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
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
      showSaveStatus("Resume saved!");
    },
  });

  const coverLetterSaveMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      if (savedCoverLetterId) {
        return api.patch<{ coverLetter: CoverLetterData }>(
          "/api/cover-letter",
          { id: savedCoverLetterId, ...data }
        );
      }
      return api.post<{ coverLetter: CoverLetterData }>(
        "/api/cover-letter",
        data
      );
    },
    onSuccess: (data) => {
      setSavedCoverLetterId(data.coverLetter.id);
      queryClient.invalidateQueries({ queryKey: ["coverLetters"] });
      showSaveStatus("Cover letter saved!");
    },
  });

  const jobApplicationMutation = useMutation({
    mutationFn: (data: {
      resumeId?: string;
      coverLetterId?: string;
      jobTitle?: string;
      companyName?: string;
      jobDescription: string;
      triggerAnalysis: boolean;
    }) => api.post<JobApplicationResponse>("/api/job-application", data),
    onSuccess: (data) => {
      if (data.analysis) {
        setAnalysisResult(data.analysis);
        setAnalysisError(null);
      } else if (data.analysisError) {
        setAnalysisError(data.analysisError);
      }
      setCurrentStep("analysis");
      refreshCredits();
      queryClient.invalidateQueries({ queryKey: ["jobApplications"] });
    },
    onError: (error) => {
      setAnalysisError(error.message || "Failed to create job application");
    },
  });

  const handleSaveResume = () => {
    if (!resumeText.trim()) return;
    resumeSaveMutation.mutate({
      title: resumeTitle || "My Resume",
      content: resumeText,
    });
  };

  const handleSaveResumeAndContinue = () => {
    if (!resumeText.trim()) return;
    resumeSaveMutation.mutate(
      { title: resumeTitle || "My Resume", content: resumeText },
      { onSuccess: () => setCurrentStep("cover-letter") }
    );
  };

  const handleSaveCoverLetter = () => {
    if (!coverLetterText.trim()) return;
    coverLetterSaveMutation.mutate({
      title: coverLetterTitle || "My Cover Letter",
      content: coverLetterText,
    });
  };

  const handleSaveCoverLetterAndContinue = () => {
    if (coverLetterText.trim()) {
      coverLetterSaveMutation.mutate(
        {
          title: coverLetterTitle || "My Cover Letter",
          content: coverLetterText,
        },
        { onSuccess: () => setCurrentStep("job-description") }
      );
    } else {
      setCurrentStep("job-description");
    }
  };

  const handleLoadExistingResume = (resume: ResumeData) => {
    setResumeText(resume.content);
    setResumeTitle(resume.title);
    setSavedResumeId(resume.id);
  };

  const handleLoadExistingCoverLetter = (coverLetter: CoverLetterData) => {
    setCoverLetterText(coverLetter.content);
    setCoverLetterTitle(coverLetter.title);
    setSavedCoverLetterId(coverLetter.id);
  };

  const handleSubmitJobApplication = () => {
    if (!jobDescription.trim()) return;
    jobApplicationMutation.mutate({
      resumeId: savedResumeId || undefined,
      coverLetterId: savedCoverLetterId || undefined,
      jobTitle: jobTitle || undefined,
      companyName: companyName || undefined,
      jobDescription,
      triggerAnalysis: true,
    });
  };

  const isLoading =
    loadingResumes || loadingCoverLetters || loadingJobApplications;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
      />

      {currentStep === "resume" && (
        <div className="space-y-6">
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Upload Your CV / Resume</h2>
                <p className="text-sm text-muted-foreground">
                  Paste your resume content below. This will be used for AI
                  analysis.
                </p>
              </div>
              <Badge variant="secondary" className="ml-auto">
                Required
              </Badge>
            </div>

            {existingResumes?.resumes &&
              existingResumes.resumes.length > 1 && (
                <div className="mb-4 p-3 bg-muted/50 rounded-xl">
                  <p className="text-sm font-medium mb-2">
                    Load existing resume:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {existingResumes.resumes.map((resume) => (
                      <Button
                        key={resume.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleLoadExistingResume(resume)}
                        className={
                          savedResumeId === resume.id
                            ? "border-primary bg-primary/5"
                            : ""
                        }
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        {resume.title}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Resume Title
                </label>
                <input
                  type="text"
                  value={resumeTitle}
                  onChange={(e) => setResumeTitle(e.target.value)}
                  placeholder="e.g., Software Engineer Resume"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Resume Content
                </label>
                <textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste your full resume/CV content here..."
                  rows={12}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {resumeText.trim().split(/\s+/).filter(Boolean).length} words
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleSaveResume}
              disabled={!resumeText.trim() || resumeSaveMutation.isPending}
            >
              {resumeSaveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save
            </Button>
            <Button
              onClick={handleSaveResumeAndContinue}
              disabled={!resumeText.trim() || resumeSaveMutation.isPending}
            >
              {resumeSaveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              Save & Continue
            </Button>
          </div>
        </div>
      )}

      {currentStep === "cover-letter" && (
        <div className="space-y-6">
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Copy className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Cover Letter</h2>
                <p className="text-sm text-muted-foreground">
                  Optionally paste your cover letter for a more comprehensive
                  analysis.
                </p>
              </div>
              <Badge variant="outline" className="ml-auto">
                Optional
              </Badge>
            </div>

            {existingCoverLetters?.coverLetters &&
              existingCoverLetters.coverLetters.length > 1 && (
                <div className="mb-4 p-3 bg-muted/50 rounded-xl">
                  <p className="text-sm font-medium mb-2">
                    Load existing cover letter:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {existingCoverLetters.coverLetters.map((cl) => (
                      <Button
                        key={cl.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleLoadExistingCoverLetter(cl)}
                        className={
                          savedCoverLetterId === cl.id
                            ? "border-primary bg-primary/5"
                            : ""
                        }
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        {cl.title}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Cover Letter Title
                </label>
                <input
                  type="text"
                  value={coverLetterTitle}
                  onChange={(e) => setCoverLetterTitle(e.target.value)}
                  placeholder="e.g., Application for Senior Developer"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Cover Letter Content
                </label>
                <textarea
                  value={coverLetterText}
                  onChange={(e) => setCoverLetterText(e.target.value)}
                  placeholder="Paste your cover letter here (optional)..."
                  rows={8}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep("resume")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex gap-2">
              {coverLetterText.trim() && (
                <Button
                  variant="outline"
                  onClick={handleSaveCoverLetter}
                  disabled={coverLetterSaveMutation.isPending}
                >
                  {coverLetterSaveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save
                </Button>
              )}
              <Button
                onClick={handleSaveCoverLetterAndContinue}
                disabled={coverLetterSaveMutation.isPending}
              >
                {coverLetterSaveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                {coverLetterText.trim() ? "Save & Continue" : "Skip & Continue"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {currentStep === "job-description" && (
        <div className="space-y-6">
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Job Description</h2>
                <p className="text-sm text-muted-foreground">
                  Paste the job posting you want to apply for. The AI will
                  compare it against your resume.
                </p>
              </div>
              <Badge variant="secondary" className="ml-auto">
                Required
              </Badge>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g., Senior Software Engineer"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g., Google"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Job Description
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the full job description here..."
                  rows={12}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {jobDescription.trim().split(/\s+/).filter(Boolean).length}{" "}
                  words
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep("cover-letter")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Cost: 10 credits
              </span>
              <Button
                onClick={handleSubmitJobApplication}
                disabled={
                  !jobDescription.trim() ||
                  !savedResumeId ||
                  jobApplicationMutation.isPending
                }
              >
                {jobApplicationMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Analyze Application
                  </>
                )}
              </Button>
            </div>
          </div>

          {!savedResumeId && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Please save your resume first (Step 1) before running the analysis.
            </div>
          )}
        </div>
      )}

      {currentStep === "analysis" && (
        <div className="space-y-6">
          {jobApplicationMutation.isPending && (
            <div className="bg-card rounded-2xl border border-border p-12 flex flex-col items-center justify-center text-center">
              <div className="relative mb-6">
                <div className="h-20 w-20 rounded-full border-4 border-primary/20 flex items-center justify-center">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold">
                Analyzing Your Application...
              </h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md">
                Our AI is comparing your resume against the job description. This may take up to 30 seconds.
              </p>
              <div className="flex gap-4 mt-6 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Target className="h-3 w-3" /> Matching skills</span>
                <span className="flex items-center gap-1"><Search className="h-3 w-3" /> Finding gaps</span>
                <span className="flex items-center gap-1"><Lightbulb className="h-3 w-3" /> Building recommendations</span>
              </div>
            </div>
          )}

          {analysisError && !analysisResult && (
            <div className="bg-card rounded-2xl border border-destructive/30 p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold text-destructive">
                    Analysis Failed
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
                Try Again
              </Button>
            </div>
          )}

          {analysisResult && (
            <>
              <div className="bg-gradient-to-br from-card to-muted/30 rounded-2xl border border-border p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
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
                            ? "text-emerald-500"
                            : (analysisResult.fitScore || 0) >= 50
                            ? "text-amber-500"
                            : "text-red-400"
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
                      <h3 className="text-xl font-semibold">Match Score</h3>
                      <Badge
                        className={`text-xs ${
                          (analysisResult.fitScore || 0) >= 70
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : (analysisResult.fitScore || 0) >= 50
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                        }`}
                      >
                        {(analysisResult.fitScore || 0) >= 70
                          ? "Strong Match"
                          : (analysisResult.fitScore || 0) >= 50
                          ? "Moderate Match"
                          : "Needs Work"}
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
                          ? "Your profile is well-aligned with this role. Focus on highlighting your matching skills."
                          : (analysisResult.fitScore || 0) >= 50
                          ? "You have a solid foundation. Address the gaps below to strengthen your application."
                          : "There are significant gaps between your profile and this role. Review the recommendations carefully."}
                      </p>
                    )}

                    <div className="flex gap-6 mt-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-emerald-600">{toStringArray(analysisResult.skillsMatch).length}</div>
                        <div className="text-xs text-muted-foreground">Skills Match</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-amber-600">{toStringArray(analysisResult.missingSkills).length}</div>
                        <div className="text-xs text-muted-foreground">Gaps Found</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-primary">{toStringArray(analysisResult.recommendations).length}</div>
                        <div className="text-xs text-muted-foreground">Recommendations</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {toStringArray(analysisResult.skillsMatch).length > 0 && (
                  <div className="bg-card rounded-2xl border border-border p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">Matching Skills</h4>
                        <p className="text-xs text-muted-foreground">{toStringArray(analysisResult.skillsMatch).length} skills aligned</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {toStringArray(analysisResult.skillsMatch).map(
                        (skill, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          >
                            {skill}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                )}

                {toStringArray(analysisResult.missingSkills).length > 0 && (
                  <div className="bg-card rounded-2xl border border-border p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">Missing Skills</h4>
                        <p className="text-xs text-muted-foreground">{toStringArray(analysisResult.missingSkills).length} gaps to address</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {toStringArray(analysisResult.missingSkills).map(
                        (skill, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                          >
                            {skill}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>

              {analysisResult.keywordAnalysis && (
                <div className="bg-card rounded-2xl border border-border p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                      <Search className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">Keyword Analysis</h4>
                      <p className="text-xs text-muted-foreground">Keywords from the job description found in your resume</p>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {(analysisResult.keywordAnalysis.found || []).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-emerald-600 mb-2 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Found in your CV ({(analysisResult.keywordAnalysis.found || []).length})
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {(analysisResult.keywordAnalysis.found || []).map((kw, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(analysisResult.keywordAnalysis.missing || []).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-red-600 mb-2 flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> Missing from your CV ({(analysisResult.keywordAnalysis.missing || []).length})
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {(analysisResult.keywordAnalysis.missing || []).map((kw, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800">
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
                <div className="bg-card rounded-2xl border border-border p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                    </div>
                    <h4 className="font-semibold text-sm">Your Strengths</h4>
                  </div>
                  <ul className="space-y-2">
                    {toStringArray(analysisResult.strengths).map(
                      (item, i) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

              {toStringArray(analysisResult.improvements).length > 0 && (
                <div className="bg-card rounded-2xl border border-border p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                      <Lightbulb className="h-4 w-4 text-amber-600" />
                    </div>
                    <h4 className="font-semibold text-sm">Areas for Improvement</h4>
                  </div>
                  <ul className="space-y-2">
                    {toStringArray(analysisResult.improvements).map(
                      (item, i) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <ArrowRight className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

              {toStringArray(analysisResult.recommendations).length > 0 && (
                <div className="bg-card rounded-2xl border border-border p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <h4 className="font-semibold text-sm">Recommendations</h4>
                  </div>
                  <ul className="space-y-2">
                    {toStringArray(analysisResult.recommendations).map(
                      (item, i) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors border border-border"
                        >
                          <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-primary">{i + 1}</span>
                          </div>
                          <span>{item}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep("job-description")}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Modify & Re-analyze
                </Button>
                <Button onClick={() => router.push("/interview-prep")}>
                  <ArrowRight className="h-4 w-4" />
                  Continue to Interview Prep
                </Button>
              </div>
            </>
          )}

          {!jobApplicationMutation.isPending &&
            !analysisResult &&
            !analysisError && (
              <div className="bg-card rounded-2xl border border-border p-12 text-center">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">
                  No Analysis Yet
                </h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                  Complete the previous steps and submit your job application to see your AI-powered analysis dashboard.
                </p>
                <Button
                  onClick={() => setCurrentStep("job-description")}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Go to Job Description
                </Button>
              </div>
            )}
        </div>
      )}
    </div>
  );
}

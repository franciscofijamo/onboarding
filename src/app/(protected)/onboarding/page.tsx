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

interface AnalysisData {
  id: string;
  fitScore: number | null;
  skillsMatch: string[] | Record<string, unknown> | null;
  missingSkills: string[] | Record<string, unknown> | null;
  strengths: string[] | Record<string, unknown> | null;
  improvements: string[] | Record<string, unknown> | null;
  recommendations: string[] | Record<string, unknown> | null;
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
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <h3 className="text-lg font-semibold">
                Analyzing Your Application...
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Our AI is comparing your resume against the job description.
              </p>
            </div>
          )}

          {analysisError && !analysisResult && (
            <div className="bg-card rounded-2xl border border-destructive/30 p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-destructive" />
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
                Try Again
              </Button>
            </div>
          )}

          {analysisResult && (
            <>
              {analysisResult.fitScore !== null && (
                <div className="bg-card rounded-2xl border border-border p-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <svg
                        width="80"
                        height="80"
                        viewBox="0 0 80 80"
                        className="-rotate-90"
                      >
                        <circle
                          cx="40"
                          cy="40"
                          r="32"
                          fill="none"
                          strokeWidth="6"
                          className="stroke-muted"
                        />
                        <circle
                          cx="40"
                          cy="40"
                          r="32"
                          fill="none"
                          strokeWidth="6"
                          strokeDasharray={2 * Math.PI * 32}
                          strokeDashoffset={
                            2 *
                            Math.PI *
                            32 *
                            (1 - (analysisResult.fitScore || 0) / 100)
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
                      <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
                        {Math.round(analysisResult.fitScore || 0)}%
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Match Score</h3>
                      <p className="text-sm text-muted-foreground">
                        {(analysisResult.fitScore || 0) >= 70
                          ? "Strong match! You're well-positioned for this role."
                          : (analysisResult.fitScore || 0) >= 50
                          ? "Moderate match. Some areas could be improved."
                          : "Low match. Consider strengthening your profile for this role."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {toStringArray(analysisResult.skillsMatch).length > 0 && (
                  <div className="bg-card rounded-2xl border border-border p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="h-4 w-4 text-emerald-500" />
                      <h4 className="font-semibold text-sm">
                        Matching Skills
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {toStringArray(analysisResult.skillsMatch).map(
                        (skill, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
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
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <h4 className="font-semibold text-sm">Missing Skills</h4>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {toStringArray(analysisResult.missingSkills).map(
                        (skill, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          >
                            {skill}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>

              {toStringArray(analysisResult.strengths).length > 0 && (
                <div className="bg-card rounded-2xl border border-border p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    <h4 className="font-semibold text-sm">Strengths</h4>
                  </div>
                  <ul className="space-y-1.5">
                    {toStringArray(analysisResult.strengths).map(
                      (item, i) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                          {item}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

              {toStringArray(analysisResult.improvements).length > 0 && (
                <div className="bg-card rounded-2xl border border-border p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <h4 className="font-semibold text-sm">
                      Areas for Improvement
                    </h4>
                  </div>
                  <ul className="space-y-1.5">
                    {toStringArray(analysisResult.improvements).map(
                      (item, i) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <ArrowRight className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                          {item}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

              {toStringArray(analysisResult.recommendations).length > 0 && (
                <div className="bg-card rounded-2xl border border-border p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">Recommendations</h4>
                  </div>
                  <ul className="space-y-1.5">
                    {toStringArray(analysisResult.recommendations).map(
                      (item, i) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                          {item}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

              <div className="flex justify-between">
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
              <div className="bg-card rounded-2xl border border-border p-8 text-center">
                <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-1">
                  No Analysis Yet
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Complete the previous steps and submit your job application for
                  AI analysis.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep("job-description")}
                >
                  Go to Job Description
                </Button>
              </div>
            )}
        </div>
      )}
    </div>
  );
}

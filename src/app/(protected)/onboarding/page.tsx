"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useSetPageMetadata } from "@/contexts/page-metadata";
import { useLanguage } from "@/contexts/language";
import { useCredits } from "@/hooks/use-credits";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Upload,
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
} from "lucide-react";

type Step = "resume" | "cover-letter" | "job-description" | "analysis";

interface ResumeData {
  id: string;
  title: string;
  content: string;
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
  onStepClick,
}: {
  steps: typeof STEPS;
  currentStep: Step;
  onStepClick: (step: Step) => void;
}) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep);
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
        const isCompleted = index < currentIndex;
        const isClickable = index <= currentIndex;

        return (
          <React.Fragment key={step.key}>
            <button
              onClick={() => isClickable && onStepClick(step.key)}
              disabled={!isClickable}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : isCompleted
                  ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isCompleted ? (
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
                  index < currentIndex ? "bg-primary" : "bg-border"
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
  const { t } = useLanguage();
  const { credits, refresh: refreshCredits } = useCredits();

  useSetPageMetadata({
    title: "Job Application Onboarding",
    description: "Upload your CV, add a job description, and get AI-powered analysis",
    showBreadcrumbs: true,
  });

  const [currentStep, setCurrentStep] = React.useState<Step>("resume");
  const [resumeText, setResumeText] = React.useState("");
  const [resumeTitle, setResumeTitle] = React.useState("");
  const [coverLetterText, setCoverLetterText] = React.useState("");
  const [jobTitle, setJobTitle] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
  const [jobDescription, setJobDescription] = React.useState("");
  const [savedResumeId, setSavedResumeId] = React.useState<string | null>(null);
  const [savedCoverLetterId, setSavedCoverLetterId] = React.useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = React.useState<AnalysisData | null>(null);
  const [analysisError, setAnalysisError] = React.useState<string | null>(null);

  const { data: existingResumes, isLoading: loadingResumes } = useQuery<{
    resumes: ResumeData[];
  }>({
    queryKey: ["resumes"],
    queryFn: () => api.get("/api/resume"),
  });

  const resumeMutation = useMutation({
    mutationFn: (data: { title: string; content: string }) =>
      api.post<{ resume: ResumeData }>("/api/resume", data),
    onSuccess: (data) => {
      setSavedResumeId(data.resume.id);
      setCurrentStep("cover-letter");
    },
  });

  const coverLetterMutation = useMutation({
    mutationFn: (data: { title: string; content: string }) =>
      api.post<{ coverLetter: { id: string } }>("/api/resume", data),
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
    },
    onError: (error) => {
      setAnalysisError(error.message || "Failed to create job application");
    },
  });

  const handleSaveResume = () => {
    if (!resumeText.trim()) return;
    resumeMutation.mutate({
      title: resumeTitle || "My Resume",
      content: resumeText,
    });
  };

  const handleSkipCoverLetter = () => {
    setCurrentStep("job-description");
  };

  const handleSaveCoverLetter = () => {
    if (coverLetterText.trim()) {
      setSavedCoverLetterId("pending");
    }
    setCurrentStep("job-description");
  };

  const handleSubmitJobApplication = () => {
    if (!jobDescription.trim()) return;
    jobApplicationMutation.mutate({
      resumeId: savedResumeId || undefined,
      coverLetterId:
        savedCoverLetterId && savedCoverLetterId !== "pending"
          ? savedCoverLetterId
          : undefined,
      jobTitle: jobTitle || undefined,
      companyName: companyName || undefined,
      jobDescription,
      triggerAnalysis: true,
    });
  };

  const handleLoadExistingResume = (resume: ResumeData) => {
    setResumeText(resume.content);
    setResumeTitle(resume.title);
    setSavedResumeId(resume.id);
  };

  if (loadingResumes) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <StepIndicator
        steps={STEPS}
        currentStep={currentStep}
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
                  Paste your resume content below. This will be used for AI analysis.
                </p>
              </div>
              <Badge variant="secondary" className="ml-auto">
                Required
              </Badge>
            </div>

            {existingResumes?.resumes && existingResumes.resumes.length > 0 && (
              <div className="mb-4 p-3 bg-muted/50 rounded-xl">
                <p className="text-sm font-medium mb-2">Load existing resume:</p>
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

          <div className="flex justify-end">
            <Button
              onClick={handleSaveResume}
              disabled={
                !resumeText.trim() || resumeMutation.isPending
              }
            >
              {resumeMutation.isPending ? (
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
                  Optionally paste your cover letter for a more comprehensive analysis.
                </p>
              </div>
              <Badge variant="outline" className="ml-auto">
                Optional
              </Badge>
            </div>

            <textarea
              value={coverLetterText}
              onChange={(e) => setCoverLetterText(e.target.value)}
              placeholder="Paste your cover letter here (optional)..."
              rows={8}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep("resume")}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSkipCoverLetter}>
                Skip
              </Button>
              <Button onClick={handleSaveCoverLetter}>
                <ArrowRight className="h-4 w-4" />
                Continue
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
                  Paste the job posting you want to apply for. The AI will compare it against your resume.
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
                  {jobDescription.trim().split(/\s+/).filter(Boolean).length} words
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
                  !jobDescription.trim() || jobApplicationMutation.isPending
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
        </div>
      )}

      {currentStep === "analysis" && (
        <div className="space-y-6">
          {jobApplicationMutation.isPending && (
            <div className="bg-card rounded-2xl border border-border p-12 flex flex-col items-center justify-center text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <h3 className="text-lg font-semibold">Analyzing Your Application...</h3>
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
                  <h3 className="font-semibold text-destructive">Analysis Failed</h3>
                  <p className="text-sm text-muted-foreground">{analysisError}</p>
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
                            2 * Math.PI * 32 * (1 - (analysisResult.fitScore || 0) / 100)
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
                      <h4 className="font-semibold text-sm">Matching Skills</h4>
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

                {toStringArray(analysisResult.strengths).length > 0 && (
                  <div className="bg-card rounded-2xl border border-border p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      <h4 className="font-semibold text-sm">Strengths</h4>
                    </div>
                    <ul className="space-y-1.5">
                      {toStringArray(analysisResult.strengths).map(
                        (item, i) => (
                          <li
                            key={i}
                            className="text-sm text-muted-foreground flex items-start gap-2"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
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
                      <BarChart3 className="h-4 w-4 text-purple-500" />
                      <h4 className="font-semibold text-sm">Areas to Improve</h4>
                    </div>
                    <ul className="space-y-1.5">
                      {toStringArray(analysisResult.improvements).map(
                        (item, i) => (
                          <li
                            key={i}
                            className="text-sm text-muted-foreground flex items-start gap-2"
                          >
                            <ArrowRight className="h-3.5 w-3.5 text-purple-500 mt-0.5 shrink-0" />
                            {item}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {toStringArray(analysisResult.recommendations).length > 0 && (
                <div className="bg-card rounded-2xl border border-primary/20 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">Recommendations</h4>
                  </div>
                  <ul className="space-y-2">
                    {toStringArray(analysisResult.recommendations).map(
                      (rec, i) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                          {rec}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCurrentStep("resume");
                    setAnalysisResult(null);
                    setAnalysisError(null);
                    setResumeText("");
                    setResumeTitle("");
                    setCoverLetterText("");
                    setJobDescription("");
                    setJobTitle("");
                    setCompanyName("");
                    setSavedResumeId(null);
                    setSavedCoverLetterId(null);
                  }}
                >
                  Start New Analysis
                </Button>
                <Button onClick={() => router.push("/dashboard")}>
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

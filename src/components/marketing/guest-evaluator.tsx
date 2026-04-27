"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  UploadCloud,
  Link as LinkIcon,
  FileText,
  CheckCircle2,
  Briefcase,
  ChevronRight,
  Sparkles,
  Search,
} from "lucide-react";

const LOADING_MESSAGES_CV = [
  "Lendo o seu documento...",
  "A extrair dados estruturados...",
  "Processando secções...",
  "Quase pronto...",
];
const LOADING_MESSAGES_JOB = [
  "Acedendo ao website...",
  "Encontrando a descrição da vaga...",
  "Extraindo requisitos e competências...",
  "Quase pronto...",
];
const LOADING_MESSAGES_ANALYSIS = [
  "Iniciando o motor de IA...",
  "Comparando vocabulário...",
  "Cruzando métricas e perfis...",
  "Calculando as suas chances...",
  "A compilar os resultados...",
];

export function GuestEvaluator() {
  const router = useRouter();
  const [cvText, setCvText] = useState("");
  const [cvName, setCvName] = useState("");
  const [jobText, setJobText] = useState("");
  const [jobName, setJobName] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  // File Extraction State
  const [isExtractingResume, setIsExtractingResume] = useState(false);
  const [resumeUploadError, setResumeUploadError] = useState<string | null>(
    null,
  );
  const [cvLoadingIndex, setCvLoadingIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Job Mode State
  const [jobInputMode, setJobInputMode] = useState<"url" | "text">("url");
  const [jobUrl, setJobUrl] = useState("");
  const [tempJobText, setTempJobText] = useState("");
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlError, setCrawlError] = useState<string | null>(null);
  const [jobLoadingIndex, setJobLoadingIndex] = useState(0);

  // Evaluation Loading State
  const [analysisLoadingIndex, setAnalysisLoadingIndex] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isExtractingResume) {
      interval = setInterval(() => {
        setCvLoadingIndex((prev) => (prev + 1) % LOADING_MESSAGES_CV.length);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isExtractingResume]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCrawling) {
      interval = setInterval(() => {
        setJobLoadingIndex((prev) => (prev + 1) % LOADING_MESSAGES_JOB.length);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isCrawling]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAnalyzing) {
      interval = setInterval(() => {
        setAnalysisLoadingIndex(
          (prev) => (prev + 1) % LOADING_MESSAGES_ANALYSIS.length,
        );
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const handleExtractResumeFromFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const input = event.currentTarget;
    const file = input.files?.[0] || null;
    if (!file) return;

    setResumeUploadError(null);
    setIsExtractingResume(true);
    setCvLoadingIndex(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/resume/extract", {
        method: "POST",
        body: formData,
      });

      const responseText = await response.text();
      let payload: any = {};
      if (response.headers.get("content-type")?.includes("application/json")) {
        try {
          payload = JSON.parse(responseText);
        } catch {}
      }

      if (!response.ok) {
        throw new Error(
          payload.error || payload.details || "Falha ao extrair CV.",
        );
      }

      setCvText(payload.content || "");
      setCvName(file.name);
    } catch (error) {
      setResumeUploadError(
        error instanceof Error ? error.message : "Falha ao processar ficheiro.",
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
    setJobLoadingIndex(0);

    try {
      const response = await fetch("/api/job-application/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to fetch from URL");

      const desc = result.extracted?.jobDescription || "";
      if (desc) {
        setJobText(desc);
        setJobName(result.extracted?.jobTitle || "Vaga Encontrada");
      } else {
        throw new Error("Não conseguimos encontrar a vaga nesta página.");
      }
    } catch (err) {
      setCrawlError(
        err instanceof Error ? err.message : "Erro ao aceder ao link.",
      );
    } finally {
      setIsCrawling(false);
    }
  };

  const submitJobTextForm = () => {
    if (!tempJobText.trim()) return;
    setJobText(tempJobText);
    setJobName("Texto da Vaga Inserido");
  };

  const handleAnalyze = async () => {
    if (!cvText.trim() || !jobText.trim()) return;

    setIsAnalyzing(true);
    setAnalysisLoadingIndex(0);
    try {
      const res = await fetch("/api/guest/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: cvText, jobDescription: jobText }),
      });

      const data = await res.json();
      if (data.success && data.analysis) {
        setResult(data.analysis);
        localStorage.setItem(
          "pendingGuestAnalysis",
          JSON.stringify({
            resumeText: cvText,
            jobDescription: jobText,
            analysis: data.analysis,
          }),
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetCv = () => {
    setCvText("");
    setCvName("");
  };

  const resetJob = () => {
    setJobText("");
    setJobName("");
    setTempJobText("");
    setJobUrl("");
  };

  const handleSignUpRedirect = () => {
    router.push("/sign-up");
  };

  if (result) {
    const scoreVal = result.fitScore || 0;
    let matchLabel = "Baixa Aderência";
    let strokeColor = "stroke-rose-500";
    let badgeBg = "bg-rose-500";

    if (scoreVal >= 75) {
      matchLabel = "Excelente Match";
      strokeColor = "stroke-emerald-500";
      badgeBg = "bg-emerald-500";
    } else if (scoreVal >= 50) {
      matchLabel = "Aderência Moderada";
      strokeColor = "stroke-amber-500";
      badgeBg = "bg-amber-500";
    }

    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (scoreVal / 100) * circumference;

    const summaryText =
      result.summary ||
      "Resumo detalhado sobre o perfil do candidato em relação aos requisitos da vaga e as suas principais oportunidades de melhoria ao submeter a sua candidatura oficial.";
    const skillsCount = Array.isArray(result.skillsMatch)
      ? result.skillsMatch.length
      : Object.keys(result.skillsMatch || {}).length || 0;
    const gapsCount = Array.isArray(result.missingSkills)
      ? result.missingSkills.length
      : Object.keys(result.missingSkills || {}).length || 0;
    const recsCount = Array.isArray(result.recommendations)
      ? result.recommendations.length
      : Object.keys(result.recommendations || {}).length || 0;

    return (
      <div className="w-full max-w-4xl mx-auto mt-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="relative overflow-hidden rounded-3xl border-2 border-border/40 bg-card shadow-2xl shadow-primary/5">
          <div className="relative z-10 p-4 sm:p-6 md:p-8">
            <div className="mb-8 flex flex-col items-center gap-6 rounded-2xl border-2 border-border/20 bg-muted/20 p-5 md:flex-row md:items-start">
              <div className="shrink-0 relative flex items-center justify-center">
                <svg width="100" height="100" className="-rotate-90">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-muted/30"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 42}
                    strokeDashoffset={2 * Math.PI * 42 - (scoreVal / 100) * (2 * Math.PI * 42)}
                    strokeLinecap="round"
                    className={`${strokeColor} transition-all duration-1000 ease-out`}
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">
                    {Math.round(scoreVal)}
                  </span>
                  <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                    / 100
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-3 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-2">
                  <h2 className="text-xl font-bold uppercase tracking-tight">Match Score</h2>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider ${badgeBg}`}
                  >
                    {matchLabel}
                  </span>
                </div>

                <p className="text-muted-foreground text-xs leading-relaxed font-medium">
                  {summaryText}
                </p>

                <div className="flex items-center justify-center md:justify-start gap-6 pt-1">
                  <div className="text-center">
                    <div className="text-lg font-bold text-emerald-500">{skillsCount}</div>
                    <div className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider">Skills</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-amber-500">{gapsCount}</div>
                    <div className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider">Gaps</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-foreground">{recsCount}</div>
                    <div className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider">Tips</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Blurred detailed analysis */}
            <div className="relative">
              <div className="absolute inset-x-0 -top-6 bottom-0 z-20 flex flex-col items-center justify-center rounded-2xl border-2 border-border/40 bg-background/80 p-6 backdrop-blur-md">
                <div className="w-full max-w-sm space-y-4 rounded-2xl border-2 border-border bg-card p-6 text-center shadow-xl">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold">Análise Detalhada</h3>
                    <p className="text-muted-foreground text-[10px] leading-relaxed">
                      Descubra as lacunas do seu CV e saiba exactamente o que ajustar para garantir a sua entrevista.
                    </p>
                  </div>
                  <button
                    onClick={handleSignUpRedirect}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    Ver Análise Completa <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid select-none gap-3 opacity-20 pointer-events-none md:grid-cols-2">
                <div className="rounded-2xl border-2 border-border bg-muted/40 p-4">
                  <div className="h-4 bg-foreground/10 rounded w-1/2 mb-3" />
                  <div className="space-y-2">
                    <div className="h-2 bg-foreground/5 rounded w-full" />
                    <div className="h-2 bg-foreground/5 rounded w-5/6" />
                  </div>
                </div>
                <div className="rounded-2xl border-2 border-border bg-muted/40 p-4">
                  <div className="h-4 bg-foreground/10 rounded w-1/2 mb-3" />
                  <div className="space-y-2">
                    <div className="h-2 bg-foreground/5 rounded w-full" />
                    <div className="h-2 bg-foreground/5 rounded w-5/6" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isFormReady = Boolean(cvText.trim() && jobText.trim());

  return (
    <div className="relative mx-auto mt-4 w-full max-w-4xl rounded-3xl border-2 border-border/40 bg-card shadow-2xl shadow-primary/5 font-sans">
      <div className="p-4 sm:p-6">
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          {/* Currículo Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                1
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">O seu Currículo</h3>
            </div>

            {!cvText ? (
              <div
                className="group relative flex h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 px-6 text-center transition-all hover:border-primary hover:bg-primary/5"
                onClick={() =>
                  !isExtractingResume && fileInputRef.current?.click()
                }
              >
                {isExtractingResume ? (
                  <div className="flex flex-col items-center gap-3 text-primary">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-xs font-bold animate-pulse">
                      {LOADING_MESSAGES_CV[cvLoadingIndex]}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border-2 border-border bg-card text-muted-foreground transition-colors group-hover:border-primary group-hover:text-primary">
                      <UploadCloud className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-bold text-foreground">
                      Carregar PDF ou Word
                    </p>
                  </>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={handleExtractResumeFromFile}
                />
              </div>
            ) : (
              <div className="relative flex h-[200px] animate-in flex-col justify-center rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 p-6 duration-500 zoom-in-95">
                <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border-2 border-emerald-500/20 bg-card text-emerald-600 shadow-sm">
                  <FileText className="h-6 w-6" />
                </div>
                <h4 className="line-clamp-1 text-base font-bold">
                  {cvName || "Currículo Pronto"}
                </h4>
                <button
                  onClick={resetCv}
                  className="mt-3 w-fit text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
                >
                  Trocar ficheiro
                </button>
              </div>
            )}
          </div>

          {/* Vaga Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                2
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">A Vaga Desejada</h3>
            </div>

            {!jobText ? (
              <div className="relative flex h-[200px] flex-col overflow-hidden rounded-2xl border-2 border-border bg-muted/20">
                {isCrawling && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/90 text-primary backdrop-blur-sm">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-xs font-bold animate-pulse">
                      {LOADING_MESSAGES_JOB[jobLoadingIndex]}
                    </p>
                  </div>
                )}

                <div className="flex border-b-2 border-border bg-muted/40 p-1 text-[10px] font-bold uppercase tracking-wider">
                  <button
                    onClick={() => setJobInputMode("url")}
                    className={`flex-1 rounded-lg py-1.5 transition-all ${jobInputMode === "url" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Link
                  </button>
                  <button
                    onClick={() => setJobInputMode("text")}
                    className={`flex-1 rounded-lg py-1.5 transition-all ${jobInputMode === "text" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Texto
                  </button>
                </div>

                <div className="flex-1 p-4 flex flex-col justify-center font-sans">
                  {jobInputMode === "url" ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 rounded-xl border-2 border-border bg-card p-2.5 transition-all focus-within:border-primary">
                        <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <input
                          type="url"
                          value={jobUrl}
                          onChange={(e) => setJobUrl(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleCrawlUrl()
                          }
                          placeholder="linkedin.com/jobs/..."
                          className="flex-1 bg-transparent border-0 p-0 text-xs focus:ring-0 placeholder:text-muted-foreground/60 outline-none font-medium"
                        />
                      </div>
                      <button
                        onClick={handleCrawlUrl}
                        disabled={!jobUrl.trim()}
                        className="w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                      >
                        Localizar Vaga
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col h-full space-y-2">
                      <textarea
                        value={tempJobText}
                        onChange={(e) => setTempJobText(e.target.value)}
                        placeholder="Cole a descrição aqui..."
                        className="w-full flex-1 resize-none rounded-xl border-2 border-border bg-card p-3 text-xs outline-none transition-all placeholder:text-muted-foreground focus:border-primary"
                      />
                      <button
                        onClick={submitJobTextForm}
                        disabled={!tempJobText.trim()}
                        className="w-full rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                      >
                        Confirmar Texto
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative flex h-[200px] animate-in flex-col justify-center rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 duration-500 zoom-in-95">
                <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white shadow-lg">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border-2 border-primary/10 bg-card text-primary shadow-sm">
                  <Briefcase className="h-6 w-6" />
                </div>
                <h4 className="line-clamp-1 text-base font-bold">
                  {jobName}
                </h4>
                <button
                  onClick={resetJob}
                  className="mt-3 w-fit text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
                >
                  Trocar vaga
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Call to Action Bar */}
        <div
          className={`flex flex-col items-center justify-between gap-4 rounded-2xl border-2 p-4 transition-all duration-300 md:flex-row ${isFormReady ? "border-primary bg-primary text-primary-foreground shadow-xl shadow-primary/20" : "border-border bg-muted/40"}`}
        >
          <div className="text-center md:text-left">
            <h3 className={`text-base font-bold ${isFormReady ? "text-primary-foreground" : "text-foreground"}`}>
              {isFormReady ? "Análise Pronta" : "Faltam os dados"}
            </h3>
            <p className={`text-[10px] font-medium opacity-80`}>
              {isFormReady ? "Pronto para gerar o seu Match Score." : "Adicione o CV e a Vaga para continuar."}
            </p>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={!isFormReady || isAnalyzing}
            className={`
              group relative flex h-10 w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-6 text-xs font-bold transition-all md:w-auto
              ${isFormReady && !isAnalyzing ? "bg-white text-primary shadow-md hover:scale-[1.05] active:scale-95" : "bg-muted-foreground/10 text-muted-foreground cursor-not-allowed"}
            `}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Calcular Match Score
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

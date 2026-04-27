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
      <div className="w-full max-w-5xl mx-auto mt-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
          <div className="relative z-10 p-5 sm:p-6 md:p-8">
            <div className="mb-10 flex flex-col items-center gap-6 rounded-2xl border bg-background/60 p-5 shadow-sm md:flex-row md:items-start md:p-6">
              <div className="shrink-0 relative flex items-center justify-center">
                <svg width="120" height="120" className="-rotate-90">
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-muted/30"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className={`${strokeColor} transition-all duration-1000 ease-out`}
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-semibold">
                    {Math.round(scoreVal)}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mt-0.5">
                    / 100
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-4 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <h2 className="text-2xl font-semibold">Match Score</h2>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold text-white ${badgeBg}`}
                  >
                    {matchLabel}
                  </span>
                </div>

                <p className="text-muted-foreground text-sm leading-relaxed">
                  {summaryText}
                </p>

                <div className="flex items-center justify-center md:justify-start gap-8 pt-2">
                  <div className="text-center">
                    <div className="text-xl font-semibold text-emerald-500">
                      {skillsCount}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Skills Match
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-semibold text-amber-500">
                      {gapsCount}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Gaps Found
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-semibold text-foreground">
                      {recsCount}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Recommendations
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Blurred detailed analysis */}
            <div className="relative group">
              <div className="absolute inset-x-0 -top-12 bottom-0 z-20 flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-background/70 p-6 backdrop-blur-md sm:p-12">
                <div className="w-full max-w-md space-y-5 rounded-2xl border bg-card p-6 text-center shadow-lg md:p-8">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-primary">
                    <Search className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">
                      Transforme este score num plano de candidatura
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Veja porque o seu score foi {Math.round(scoreVal)}%, quais
                      lacunas pesam mais e que ajustes fazer antes de enviar a
                      candidatura.
                    </p>
                  </div>
                  <button
                    onClick={handleSignUpRedirect}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                  >
                    Ver a análise completa <ChevronRight className="h-4 w-4" />
                  </button>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Crie o perfil grátis em 30 segundos
                  </p>
                </div>
              </div>

              <div className="-mx-4 grid select-none gap-4 overflow-hidden rounded-2xl p-4 opacity-30 pointer-events-none md:grid-cols-2">
                <div className="rounded-2xl border bg-muted p-5">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Pontos
                    a Seu Favor
                  </h4>
                  <ul className="space-y-3">
                    <li className="h-3 bg-foreground/20 rounded w-3/4"></li>
                    <li className="h-3 bg-foreground/20 rounded w-5/6"></li>
                    <li className="h-3 bg-foreground/20 rounded w-4/5"></li>
                  </ul>
                </div>
                <div className="rounded-2xl border bg-muted p-5">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-500" /> Oportunidades
                  </h4>
                  <ul className="space-y-3">
                    <li className="h-3 bg-foreground/20 rounded w-2/3"></li>
                    <li className="h-3 bg-foreground/20 rounded w-1/2"></li>
                    <li className="h-3 bg-foreground/20 rounded w-3/4"></li>
                  </ul>
                </div>
                <div className="rounded-2xl border bg-muted p-5 md:col-span-2">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    Resumo da Avaliação Geral
                  </h4>
                  <div className="space-y-3">
                    <div className="h-3 bg-foreground/20 rounded w-full"></div>
                    <div className="h-3 bg-foreground/20 rounded w-[95%]"></div>
                    <div className="h-3 bg-foreground/20 rounded w-4/5"></div>
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
    <div className="relative mx-auto mt-4 w-full max-w-5xl rounded-2xl border border-border bg-card shadow-lg">
      <div className="p-4 sm:p-6 md:p-8">
        <div className="mb-8 grid gap-5 lg:grid-cols-2">
          {/* Currículo Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border bg-background text-xs font-semibold text-muted-foreground">
                <span>1</span>
              </div>
              <h3 className="text-base font-semibold">O seu Currículo</h3>
            </div>

            {!cvText ? (
              <div
                className="group relative flex h-[280px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background/60 px-6 text-center transition-colors hover:border-primary/40 hover:bg-muted/40"
                onClick={() =>
                  !isExtractingResume && fileInputRef.current?.click()
                }
              >
                {isExtractingResume ? (
                  <div className="flex flex-col items-center gap-4 text-primary">
                    <Loader2 className="h-10 w-10 animate-spin" />
                    <div className="space-y-1">
                      <p className="font-medium animate-pulse">
                        {LOADING_MESSAGES_CV[cvLoadingIndex]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Por favor aguarde um instante
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border bg-card text-muted-foreground transition-colors group-hover:text-primary">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <p className="font-semibold text-foreground">
                      Clique para adicionar o seu ficheiro PDF ou Word
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Carregamento seguro e privado
                    </p>
                    {resumeUploadError && (
                      <p className="mt-4 rounded-lg bg-rose-500/10 px-4 py-2 text-xs font-medium text-rose-600">
                        {resumeUploadError}
                      </p>
                    )}
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
              <div className="relative flex h-[280px] animate-in flex-col justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 duration-500 zoom-in-95">
                <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border bg-card text-emerald-600 shadow-sm">
                  <FileText className="h-7 w-7" />
                </div>
                <h4 className="line-clamp-1 text-lg font-semibold">
                  {cvName || "Currículo Anexado"}
                </h4>
                <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1">
                  Documento Lido e Pronto
                </p>
                <div className="mt-6 border-t border-emerald-500/20 pt-4">
                  <button
                    onClick={resetCv}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hover:underline"
                  >
                    Deseja trocar o ficheiro?
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Vaga Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border bg-background text-xs font-semibold text-muted-foreground">
                <span>2</span>
              </div>
              <h3 className="text-base font-semibold">A Vaga Desejada</h3>
            </div>

            {!jobText ? (
              <div className="relative flex h-[280px] flex-col overflow-hidden rounded-2xl border border-border bg-background/60">
                {isCrawling && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-background/90 text-primary backdrop-blur-sm">
                    <Loader2 className="h-10 w-10 animate-spin" />
                    <div className="space-y-1 text-center">
                      <p className="font-medium animate-pulse">
                        {LOADING_MESSAGES_JOB[jobLoadingIndex]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Isso pode levar alguns segundos
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex border-b border-border bg-muted/40 p-1 text-sm font-medium">
                  <button
                    onClick={() => setJobInputMode("url")}
                    className={`flex-1 rounded-lg py-2.5 transition-colors ${jobInputMode === "url" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Usar Link
                  </button>
                  <button
                    onClick={() => setJobInputMode("text")}
                    className={`flex-1 rounded-lg py-2.5 transition-colors ${jobInputMode === "text" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Colar Texto
                  </button>
                </div>

                <div className="flex-1 p-6 flex flex-col justify-center relative">
                  {jobInputMode === "url" ? (
                    <div className="space-y-4">
                      <div className="mb-2 flex items-center gap-3 rounded-xl border bg-card p-3">
                        <LinkIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                        <input
                          type="url"
                          value={jobUrl}
                          onChange={(e) => setJobUrl(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleCrawlUrl()
                          }
                          placeholder="Ex: linkedin.com/jobs/view/123"
                          className="flex-1 bg-transparent border-0 p-0 text-sm focus:ring-0 placeholder:text-muted-foreground/60 w-full outline-none"
                        />
                      </div>
                      <button
                        onClick={handleCrawlUrl}
                        disabled={!jobUrl.trim()}
                        className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
                      >
                        Encontrar Vaga
                      </button>
                      {crawlError && (
                        <p className="text-xs text-center text-rose-500 font-medium">
                          {crawlError}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col h-full animate-in fade-in duration-300">
                      <textarea
                        value={tempJobText}
                        onChange={(e) => setTempJobText(e.target.value)}
                        placeholder="Cole o texto da vaga aqui..."
                        className="mb-3 w-full flex-1 resize-none rounded-xl border border-border bg-card p-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:bg-background focus:ring-2 focus:ring-ring/20"
                      />
                      <button
                        onClick={submitJobTextForm}
                        disabled={!tempJobText.trim()}
                        className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
                      >
                        Confirmar Texto
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative flex h-[280px] animate-in flex-col justify-center rounded-2xl border border-primary/20 bg-primary/5 p-6 duration-500 zoom-in-95">
                <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border bg-card text-primary shadow-sm">
                  <Briefcase className="h-7 w-7" />
                </div>
                <h4 className="line-clamp-1 text-lg font-semibold">
                  {jobName}
                </h4>
                <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1">
                  Requisitos Identificados
                </p>
                <div className="mt-6 border-t border-primary/20 pt-4">
                  <button
                    onClick={resetJob}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hover:underline"
                  >
                    Deseja trocar de vaga?
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Call to Action Bar */}
        <div
          className={`flex flex-col items-center justify-between gap-5 rounded-2xl border p-5 transition-all duration-300 md:flex-row md:p-6 ${isFormReady ? "border-primary bg-primary text-primary-foreground shadow-md" : "border-border bg-muted/40"}`}
        >
          <div className="space-y-1 text-center md:text-left">
            <h3
              className={`text-lg font-semibold ${isFormReady ? "text-primary-foreground" : "text-foreground"}`}
            >
              {isFormReady
                ? "Pronto para calcular o seu Match Score"
                : "Comece pelo CV e pela vaga"}
            </h3>
            <p
              className={`max-w-sm text-sm ${isFormReady ? "text-primary-foreground/75" : "text-muted-foreground"}`}
            >
              {isFormReady
                ? "Receba uma leitura inicial da sua adequação antes de investir tempo na candidatura."
                : "Adicione os dois elementos para a IA comparar o seu perfil com os requisitos reais."}
            </p>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={!isFormReady || isAnalyzing}
            className={`
              group relative flex h-12 w-full items-center justify-center gap-3 overflow-hidden rounded-xl px-6 text-sm font-semibold transition-colors md:w-auto
              ${isFormReady && !isAnalyzing ? "bg-card text-foreground shadow-sm hover:bg-card/90" : "bg-muted-foreground/15 text-muted-foreground cursor-not-allowed"}
            `}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="w-56 text-left">
                  {LOADING_MESSAGES_ANALYSIS[analysisLoadingIndex]}
                </span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" /> Calcular o meu Match
                {isFormReady && (
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

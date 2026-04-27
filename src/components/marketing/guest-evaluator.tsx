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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { cn } from "@/lib/utils";

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
        <div className="relative overflow-hidden rounded-xl border-2 border-border/60 bg-card shadow-2xl shadow-primary/5 font-sans">
          <div className="relative z-10 p-5 sm:p-6 md:p-10">
            <div className="mb-10 flex flex-col items-center gap-8 rounded-xl border-2 border-border/20 bg-muted/20 p-6 md:flex-row md:items-start">
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
              <div className="absolute inset-x-0 -top-6 bottom-0 z-20 flex flex-col items-center justify-center rounded-xl border-2 border-border/40 bg-background/80 p-8 backdrop-blur-md">
                <div className="w-full max-w-md space-y-6 rounded-xl border-2 border-border bg-card p-8 text-center shadow-2xl">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold">Análise Detalhada</h3>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Descubra as lacunas do seu CV e saiba exactamente o que ajustar para garantir a sua entrevista.
                    </p>
                  </div>
                  <button
                    onClick={handleSignUpRedirect}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-95"
                  >
                    Ver Análise Completa <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="grid select-none gap-4 opacity-20 pointer-events-none md:grid-cols-2">
                <div className="rounded-xl border-2 border-border bg-muted/40 p-6">
                  <div className="h-6 bg-foreground/10 rounded w-1/2 mb-4" />
                  <div className="space-y-3">
                    <div className="h-3 bg-foreground/5 rounded w-full" />
                    <div className="h-3 bg-foreground/5 rounded w-5/6" />
                  </div>
                </div>
                <div className="rounded-xl border-2 border-border bg-muted/40 p-6">
                  <div className="h-6 bg-foreground/10 rounded w-1/2 mb-4" />
                  <div className="space-y-3">
                    <div className="h-3 bg-foreground/5 rounded w-full" />
                    <div className="h-3 bg-foreground/5 rounded w-5/6" />
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
    <div className="relative mx-auto mt-4 w-full max-w-5xl rounded-xl border-2 border-border bg-card shadow-2xl shadow-primary/5 font-sans">
      <div className="p-6 sm:p-8">
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          {/* Currículo Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                1
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">O seu Currículo</h3>
            </div>

            {!cvText ? (
              <>
                <div
                  className="group relative flex h-[220px] cursor-pointer flex-col items-center justify-start rounded-2xl border border-dashed border-border/70 bg-gradient-to-br from-background to-muted/30 px-8 pt-12 text-center transition-all hover:border-primary/60 hover:bg-primary/5"
                  onClick={() =>
                    !isExtractingResume && fileInputRef.current?.click()
                  }
                >
                  <GlowingEffect
                    disabled={false}
                    proximity={72}
                    spread={28}
                    blur={0}
                    borderWidth={1}
                    className="rounded-2xl"
                  />
                  {isExtractingResume ? (
                    <div className="flex flex-col items-center gap-4 text-primary">
                      <Loader2 className="h-10 w-10 animate-spin" />
                      <p className="text-sm font-bold animate-pulse">
                        {LOADING_MESSAGES_CV[cvLoadingIndex]}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-background text-muted-foreground shadow-sm transition-colors group-hover:border-primary/40 group-hover:text-primary">
                        <UploadCloud className="h-6 w-6" />
                      </div>
                      <p className="text-lg font-semibold tracking-[-0.02em] text-foreground">
                        Carregar PDF ou Word
                      </p>
                      <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                        Extraímos os pontos principais do seu CV para comparar com a vaga.
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
                {resumeUploadError ? (
                  <p className="text-sm font-medium text-rose-600">
                    {resumeUploadError}
                  </p>
                ) : null}
              </>
            ) : (
              <div className="relative flex h-[220px] animate-in flex-col justify-center rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.07] to-background p-7 duration-500 zoom-in-95">
                <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/20 bg-background text-emerald-600 shadow-sm">
                  <FileText className="h-6 w-6" />
                </div>
                <h4 className="line-clamp-1 text-xl font-semibold tracking-[-0.02em]">
                  {cvName || "Currículo Pronto"}
                </h4>
                <button
                  onClick={resetCv}
                  className="mt-4 w-fit text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
                >
                  Trocar ficheiro
                </button>
              </div>
            )}
          </div>

          {/* Vaga Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                2
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">A Vaga Desejada</h3>
            </div>

            {!jobText ? (
              <div className="relative flex min-h-[220px] flex-col overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-background to-muted/25">
                <GlowingEffect
                  disabled={false}
                  proximity={64}
                  spread={24}
                  blur={0}
                  borderWidth={1}
                  className="rounded-2xl"
                />
                {isCrawling && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-background/90 text-primary backdrop-blur-sm">
                    <Loader2 className="h-10 w-10 animate-spin" />
                    <p className="text-sm font-semibold animate-pulse">
                      {LOADING_MESSAGES_JOB[jobLoadingIndex]}
                    </p>
                  </div>
                )}

                <div className="border-b border-border/60 px-5 pt-4">
                  <Tabs
                    value={jobInputMode}
                    onValueChange={(value) =>
                      setJobInputMode(value as "url" | "text")
                    }
                    className="w-full"
                  >
                    <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl bg-muted/60 p-1">
                      <TabsTrigger
                        value="url"
                        className="rounded-lg text-sm font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                      >
                        Link
                      </TabsTrigger>
                      <TabsTrigger
                        value="text"
                        className="rounded-lg text-sm font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                      >
                        Texto
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <div className="flex flex-1 flex-col justify-center p-5 sm:p-6 font-sans">
                  {jobInputMode === "url" ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold tracking-[-0.01em] text-foreground">
                          Insira o link da vaga
                        </p>
                        <p className="text-sm leading-6 text-muted-foreground">
                          Funciona melhor com páginas de emprego públicas e completas.
                        </p>
                      </div>
                      <div className="relative">
                        <LinkIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="url"
                          value={jobUrl}
                          onChange={(e) => setJobUrl(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleCrawlUrl()
                          }
                          placeholder="linkedin.com/jobs/..."
                          className="h-12 rounded-xl border-border/70 bg-background pl-11 pr-4 text-[15px] font-medium shadow-none focus-visible:ring-2"
                        />
                      </div>
                      <Button
                        onClick={handleCrawlUrl}
                        disabled={!jobUrl.trim()}
                        size="lg"
                        className="h-12 w-full rounded-xl text-[15px] font-semibold shadow-md shadow-primary/15"
                      >
                        <Search className="h-4 w-4" />
                        Localizar vaga
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-1 flex-col space-y-4">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold tracking-[-0.01em] text-foreground">
                          Cole a descrição da vaga
                        </p>
                        <p className="text-sm leading-6 text-muted-foreground">
                          Use o texto completo para uma análise mais precisa.
                        </p>
                      </div>
                      <Textarea
                        value={tempJobText}
                        onChange={(e) => setTempJobText(e.target.value)}
                        placeholder="Cole a descrição aqui..."
                        className="min-h-[112px] flex-1 resize-none rounded-xl border-border/70 bg-background p-4 text-[15px] leading-7 shadow-none focus-visible:ring-2"
                      />
                      <Button
                        onClick={submitJobTextForm}
                        disabled={!tempJobText.trim()}
                        size="lg"
                        className="h-12 w-full rounded-xl text-[15px] font-semibold shadow-md shadow-primary/15"
                      >
                        Confirmar Texto
                      </Button>
                    </div>
                  )}

                  {crawlError && jobInputMode === "url" ? (
                    <p className="mt-3 text-sm font-medium text-rose-600">
                      {crawlError}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="relative flex h-[220px] animate-in flex-col justify-center rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.08] to-background p-7 duration-500 zoom-in-95">
                <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-lg">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/10 bg-background text-primary shadow-sm">
                  <Briefcase className="h-6 w-6" />
                </div>
                <h4 className="line-clamp-2 text-xl font-semibold tracking-[-0.02em]">
                  {jobName}
                </h4>
                <button
                  onClick={resetJob}
                  className="mt-4 w-fit text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
                >
                  Trocar vaga
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Call to Action Bar */}
        <div
          className={cn(
            "flex flex-col items-center justify-between gap-6 rounded-2xl border p-6 transition-all duration-300 md:flex-row",
            isFormReady
              ? "border-primary/20 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-xl shadow-primary/20"
              : "border-border/70 bg-muted/35",
          )}
        >
          <div className="text-center md:text-left">
            <h3 className={cn(
              "text-xl font-semibold tracking-[-0.02em]",
              isFormReady ? "text-primary-foreground" : "text-foreground",
            )}>
              {isFormReady ? "Análise Pronta" : "Faltam os dados"}
            </h3>
            <p className="mt-1 text-sm leading-6 opacity-85">
              {isFormReady ? "Pronto para gerar o seu Match Score." : "Adicione o CV e a Vaga para continuar."}
            </p>
          </div>
          <Button
            onClick={handleAnalyze}
            disabled={!isFormReady}
            isLoading={isAnalyzing}
            loadingText="Processando..."
            size="lg"
            className={cn(
              "group relative h-12 w-full overflow-hidden rounded-xl px-8 text-[15px] font-semibold md:w-auto",
              isFormReady
                ? "bg-white text-primary shadow-md"
                : "bg-muted-foreground/10 text-muted-foreground",
            )}
          >
            <Sparkles className="h-4 w-4" />
            Calcular Match Score
          </Button>
        </div>
      </div>
    </div>
  );
}

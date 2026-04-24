"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Loader2, 
  UploadCloud, 
  Link as LinkIcon, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Briefcase,
  ChevronRight,
  Sparkles,
  AlignLeft,
  Search
} from "lucide-react"

const LOADING_MESSAGES_CV = ["Lendo o seu documento...", "A extrair dados estruturados...", "Processando secções...", "Quase pronto..."]
const LOADING_MESSAGES_JOB = ["Acedendo ao website...", "Encontrando a descrição da vaga...", "Extraindo requisitos e competências...", "Quase pronto..."]
const LOADING_MESSAGES_ANALYSIS = ["Iniciando o motor de IA...", "Comparando vocabulário...", "Cruzando métricas e perfis...", "Calculando as suas chances...", "A compilar os resultados..."]

export function GuestEvaluator() {
  const router = useRouter()
  const [cvText, setCvText] = useState("")
  const [cvName, setCvName] = useState("")
  const [jobText, setJobText] = useState("")
  const [jobName, setJobName] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<any>(null)
  
  // File Extraction State
  const [isExtractingResume, setIsExtractingResume] = useState(false)
  const [resumeUploadError, setResumeUploadError] = useState<string | null>(null)
  const [cvLoadingIndex, setCvLoadingIndex] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Job Mode State
  const [jobInputMode, setJobInputMode] = useState<"url" | "text">("url")
  const [jobUrl, setJobUrl] = useState("")
  const [tempJobText, setTempJobText] = useState("")
  const [isCrawling, setIsCrawling] = useState(false)
  const [crawlError, setCrawlError] = useState<string | null>(null)
  const [jobLoadingIndex, setJobLoadingIndex] = useState(0)

  // Evaluation Loading State
  const [analysisLoadingIndex, setAnalysisLoadingIndex] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isExtractingResume) {
      interval = setInterval(() => {
        setCvLoadingIndex(prev => (prev + 1) % LOADING_MESSAGES_CV.length)
      }, 1500)
    }
    return () => clearInterval(interval)
  }, [isExtractingResume])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isCrawling) {
      interval = setInterval(() => {
        setJobLoadingIndex(prev => (prev + 1) % LOADING_MESSAGES_JOB.length)
      }, 1500)
    }
    return () => clearInterval(interval)
  }, [isCrawling])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isAnalyzing) {
      interval = setInterval(() => {
        setAnalysisLoadingIndex(prev => (prev + 1) % LOADING_MESSAGES_ANALYSIS.length)
      }, 1500)
    }
    return () => clearInterval(interval)
  }, [isAnalyzing])

  const handleExtractResumeFromFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
        try { payload = JSON.parse(responseText); } catch {}
      }

      if (!response.ok) {
        throw new Error(payload.error || payload.details || "Falha ao extrair CV.");
      }

      setCvText(payload.content || "");
      setCvName(file.name);
    } catch (error) {
      setResumeUploadError(error instanceof Error ? error.message : "Falha ao processar ficheiro.");
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
      if (!response.ok) throw new Error(result.error || "Failed to fetch from URL");
      
      const desc = result.extracted?.jobDescription || "";
      if (desc) {
        setJobText(desc);
        setJobName(result.extracted?.jobTitle || "Vaga Encontrada");
      } else {
        throw new Error("Não conseguimos encontrar a vaga nesta página.");
      }
    } catch (err) {
      setCrawlError(err instanceof Error ? err.message : "Erro ao aceder ao link.");
    } finally {
      setIsCrawling(false);
    }
  };

  const submitJobTextForm = () => {
    if (!tempJobText.trim()) return
    setJobText(tempJobText)
    setJobName("Texto da Vaga Inserido")
  }

  const handleAnalyze = async () => {
    if (!cvText.trim() || !jobText.trim()) return
    
    setIsAnalyzing(true)
    setAnalysisLoadingIndex(0)
    try {
      const res = await fetch("/api/guest/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: cvText, jobDescription: jobText }),
      })
      
      const data = await res.json()
      if (data.success && data.analysis) {
        setResult(data.analysis)
        localStorage.setItem("pendingGuestAnalysis", JSON.stringify({
          resumeText: cvText,
          jobDescription: jobText,
          analysis: data.analysis
        }))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const resetCv = () => {
    setCvText("")
    setCvName("")
  }

  const resetJob = () => {
    setJobText("")
    setJobName("")
    setTempJobText("")
    setJobUrl("")
  }

  const handleSignUpRedirect = () => {
    router.push("/sign-up")
  }

  if (result) {
    const scoreVal = result.fitScore || 0
    let matchLabel = "Baixa Aderência"
    let scoreColor = "text-rose-500"
    let strokeColor = "stroke-rose-500"
    let badgeBg = "bg-rose-500"
    
    if (scoreVal >= 75) {
      matchLabel = "Excelente Match"
      scoreColor = "text-emerald-500"
      strokeColor = "stroke-emerald-500"
      badgeBg = "bg-emerald-500"
    } else if (scoreVal >= 50) {
      matchLabel = "Aderência Moderada"
      scoreColor = "text-amber-500"
      strokeColor = "stroke-amber-500"
      badgeBg = "bg-amber-500"
    }

    const radius = 42
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (scoreVal / 100) * circumference

    const summaryText = result.summary || "Resumo detalhado sobre o perfil do candidato em relação aos requisitos da vaga e as suas principais oportunidades de melhoria ao submeter a sua candidatura oficial."
    const skillsCount = Array.isArray(result.skillsMatch) ? result.skillsMatch.length : Object.keys(result.skillsMatch || {}).length || 0
    const gapsCount = Array.isArray(result.missingSkills) ? result.missingSkills.length : Object.keys(result.missingSkills || {}).length || 0
    const recsCount = Array.isArray(result.recommendations) ? result.recommendations.length : Object.keys(result.recommendations || {}).length || 0
    
    return (
      <div className="w-full max-w-5xl mx-auto mt-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="p-[2px] rounded-[2.5rem] bg-gradient-to-br from-border via-transparent to-border relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 -m-20 w-80 h-80 bg-primary/20 rounded-full blur-[80px]" />
          
          <div className="bg-card/95 backdrop-blur-3xl rounded-[2.4rem] p-6 sm:p-8 md:p-10 relative z-10">
            
            {/* NEW RESULT HEADER (From Screenshot) */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8 bg-card border shadow-sm rounded-[2rem] p-6 mb-12">
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
                  <span className="text-3xl font-black">{Math.round(scoreVal)}</span>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mt-0.5">/ 100</span>
                </div>
              </div>
              
              <div className="flex-1 space-y-4 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <h2 className="text-2xl font-bold">Match Score</h2>
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold text-white ${badgeBg}`}>
                    {matchLabel}
                  </span>
                </div>
                
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {summaryText}
                </p>
                
                <div className="flex items-center justify-center md:justify-start gap-8 pt-2">
                  <div className="text-center">
                    <div className="text-emerald-500 font-bold text-xl">{skillsCount}</div>
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Skills Match</div>
                  </div>
                  <div className="text-center">
                    <div className="text-amber-500 font-bold text-xl">{gapsCount}</div>
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Gaps Found</div>
                  </div>
                  <div className="text-center">
                    <div className="text-foreground font-bold text-xl">{recsCount}</div>
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Recommendations</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Blurred detailed analysis */}
            <div className="relative group">
              <div className="absolute inset-x-0 -top-12 bottom-0 z-20 flex flex-col items-center justify-center bg-background/50 backdrop-blur-md rounded-3xl border border-border/50 p-6 sm:p-12">
                <div className="bg-card p-6 md:p-8 rounded-3xl border shadow-2xl max-w-md w-full text-center space-y-6">
                  <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto ring-8 ring-primary/5">
                    <Search className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Quer ver a análise completa?</h3>
                    <p className="text-muted-foreground text-sm">
                      Descubra os motivos pelos quais o seu score foi {Math.round(scoreVal)}% e receba orientações da IA para melhorar as suas hipóteses de entrevista.
                    </p>
                  </div>
                  <button 
                    onClick={handleSignUpRedirect}
                    className="w-full bg-foreground text-background hover:bg-foreground/90 h-12 rounded-xl font-semibold inline-flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-105 hover:shadow-xl"
                  >
                    Criar Perfil Gratuitamente <ChevronRight className="h-4 w-4" />
                  </button>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Demora 30 segundos</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 opacity-30 select-none pointer-events-none p-4 -mx-4 rounded-3xl overflow-hidden">
                <div className="bg-muted p-6 rounded-3xl border-2 border-transparent">
                  <h4 className="font-semibold mb-4 flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-500"/> Pontos a Seu Favor</h4>
                  <ul className="space-y-3">
                    <li className="h-3 bg-foreground/20 rounded w-3/4"></li>
                    <li className="h-3 bg-foreground/20 rounded w-5/6"></li>
                    <li className="h-3 bg-foreground/20 rounded w-4/5"></li>
                  </ul>
                </div>
                <div className="bg-muted p-6 rounded-3xl border-2 border-transparent">
                  <h4 className="font-semibold mb-4 flex items-center gap-2"><FileText className="h-5 w-5 text-blue-500"/> Oportunidades</h4>
                  <ul className="space-y-3">
                    <li className="h-3 bg-foreground/20 rounded w-2/3"></li>
                    <li className="h-3 bg-foreground/20 rounded w-1/2"></li>
                    <li className="h-3 bg-foreground/20 rounded w-3/4"></li>
                  </ul>
                </div>
                <div className="md:col-span-2 bg-muted p-6 rounded-3xl border-2 border-transparent">
                   <h4 className="font-semibold mb-4 flex items-center gap-2">Resumo da Avaliação Geral</h4>
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
    )
  }

  const isFormReady = Boolean(cvText.trim() && jobText.trim())

  return (
    <div className="w-full max-w-5xl mx-auto mt-4 p-[2px] rounded-[3rem] bg-gradient-to-br from-primary/20 via-transparent to-muted/30 shadow-2xl relative">
      <div className="bg-card/90 backdrop-blur-2xl rounded-[2.9rem] p-6 md:p-10 border border-border/50">
        
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 mb-10">
          {/* Currículo Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 ml-2">
              <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <span className="font-bold text-sm">1</span>
              </div>
              <h3 className="font-bold text-lg">O seu Currículo</h3>
            </div>
            
            {!cvText ? (
              <div 
                className="relative flex flex-col items-center justify-center h-[280px] rounded-3xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group px-6 text-center"
                onClick={() => !isExtractingResume && fileInputRef.current?.click()}
              >
                {isExtractingResume ? (
                  <div className="flex flex-col items-center gap-4 text-emerald-500">
                    <Loader2 className="h-10 w-10 animate-spin" />
                    <div className="space-y-1">
                      <p className="font-medium animate-pulse">{LOADING_MESSAGES_CV[cvLoadingIndex]}</p>
                      <p className="text-xs text-muted-foreground">Por favor aguarde um instante</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="h-12 w-12 text-muted-foreground/50 mb-4 group-hover:scale-110 group-hover:text-emerald-500 transition-all duration-300" />
                    <p className="font-semibold text-foreground">Clique para adicionar o seu ficheiro PDF ou Word</p>
                    <p className="text-sm text-muted-foreground mt-1">Carregamento seguro e privado</p>
                    {resumeUploadError && (
                      <p className="text-xs font-medium text-rose-500 mt-4 px-4 py-2 bg-rose-500/10 rounded-xl">{resumeUploadError}</p>
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
              <div className="relative flex flex-col justify-center h-[280px] rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-6 animate-in zoom-in-95 duration-500 shadow-inner">
                <div className="absolute top-4 right-4 h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="h-16 w-16 bg-card rounded-2xl flex items-center justify-center shadow-lg border mb-4">
                  <FileText className="h-8 w-8 text-emerald-500" />
                </div>
                <h4 className="font-bold text-lg line-clamp-1">{cvName || "Currículo Anexado"}</h4>
                <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1">
                  Documento Lido e Pronto
                </p>
                <div className="mt-6 pt-4 border-t border-emerald-500/20">
                  <button onClick={resetCv} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hover:underline">
                    Deseja trocar o ficheiro?
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Vaga Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 ml-2">
              <div className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <span className="font-bold text-sm">2</span>
              </div>
              <h3 className="font-bold text-lg">A Vaga Desejada</h3>
            </div>
            
            {!jobText ? (
              <div className="flex flex-col h-[280px] rounded-3xl border border-border/80 bg-background/50 shadow-sm overflow-hidden relative">
                
                {isCrawling && (
                  <div className="absolute inset-0 z-20 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center text-blue-500 gap-4">
                    <Loader2 className="h-10 w-10 animate-spin" />
                    <div className="space-y-1 text-center">
                      <p className="font-medium animate-pulse">{LOADING_MESSAGES_JOB[jobLoadingIndex]}</p>
                      <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos</p>
                    </div>
                  </div>
                )}

                <div className="flex border-b border-border text-sm font-medium">
                  <button 
                    onClick={() => setJobInputMode("url")} 
                    className={`flex-1 py-3 transition-colors ${jobInputMode === "url" ? "bg-card text-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                  >
                    Usar Link
                  </button>
                  <button 
                    onClick={() => setJobInputMode("text")} 
                    className={`flex-1 py-3 transition-colors ${jobInputMode === "text" ? "bg-card text-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                  >
                    Colar Texto
                  </button>
                </div>

                <div className="flex-1 p-6 flex flex-col justify-center relative">
                  {jobInputMode === "url" ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 bg-muted p-4 rounded-2xl border mb-2">
                        <LinkIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                        <input
                          type="url"
                          value={jobUrl}
                          onChange={(e) => setJobUrl(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleCrawlUrl()}
                          placeholder="Ex: linkedin.com/jobs/view/123"
                          className="flex-1 bg-transparent border-0 p-0 text-sm focus:ring-0 placeholder:text-muted-foreground/60 w-full outline-none"
                        />
                      </div>
                      <button 
                        onClick={handleCrawlUrl}
                        disabled={!jobUrl.trim()}
                        className="w-full bg-foreground text-background font-semibold py-3 rounded-xl disabled:opacity-50 transition-transform active:scale-[0.98]"
                      >
                        Encontrar Vaga
                      </button>
                      {crawlError && <p className="text-xs text-center text-rose-500 font-medium">{crawlError}</p>}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col h-full animate-in fade-in duration-300">
                       <textarea 
                          value={tempJobText}
                          onChange={(e) => setTempJobText(e.target.value)}
                          placeholder="Cole o texto da vaga aqui..."
                          className="flex-1 w-full bg-muted/30 border border-border p-4 rounded-xl resize-none text-sm focus:bg-background focus:ring-1 focus:ring-primary mb-3"
                       />
                       <button 
                        onClick={submitJobTextForm}
                        disabled={!tempJobText.trim()}
                        className="w-full bg-foreground text-background font-semibold py-3 rounded-xl disabled:opacity-50"
                      >
                        Confirmar Texto
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative flex flex-col justify-center h-[280px] rounded-3xl border border-blue-500/30 bg-blue-500/5 p-6 animate-in zoom-in-95 duration-500 shadow-inner">
                <div className="absolute top-4 right-4 h-8 w-8 rounded-full bg-blue-500/20 text-blue-600 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="h-16 w-16 bg-card rounded-2xl flex items-center justify-center shadow-lg border mb-4">
                  <Briefcase className="h-8 w-8 text-blue-500" />
                </div>
                <h4 className="font-bold text-lg line-clamp-1">{jobName}</h4>
                <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1">
                  Requisitos Identificados
                </p>
                <div className="mt-6 pt-4 border-t border-blue-500/20">
                  <button onClick={resetJob} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hover:underline">
                    Deseja trocar de vaga?
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Call to Action Bar */}
        <div className={`p-8 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-700 ${isFormReady ? "bg-foreground text-background shadow-xl" : "bg-muted/50 border border-transparent"}`}>
          <div className="space-y-1 text-center md:text-left">
            <h3 className={`text-xl font-bold ${isFormReady ? "text-background" : "text-muted-foreground"}`}>
              {isFormReady ? "Tudo Pronto!" : "Estamos à espera dos seus dados..."}
            </h3>
            <p className={`text-sm ${isFormReady ? "text-background/70" : "text-muted-foreground/60"} max-w-sm`}>
              {isFormReady 
                ? "Clique em Iniciar Inteligência Artificial para descobrir a sua probabilidade estatística de avanço." 
                : "Preencha os dois quadros acima com o seu CV e uma vaga."}
            </p>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={!isFormReady || isAnalyzing}
            className={`
              relative h-16 px-10 rounded-2xl font-bold text-lg flex items-center gap-3 overflow-hidden transition-all duration-500 group
              ${isFormReady && !isAnalyzing ? "bg-background text-foreground hover:scale-105 active:scale-95 shadow-xl hover:shadow-2xl" : "bg-muted-foreground/20 text-muted-foreground cursor-not-allowed"}
            `}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> 
                <span className="w-56 text-left">{LOADING_MESSAGES_ANALYSIS[analysisLoadingIndex]}</span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" /> Iniciar Inteligência Artificial
                {isFormReady && (
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiClient } from "@/lib/api-client";
import { useSetPageMetadata } from "@/contexts/page-metadata";
import { useLanguage } from "@/contexts/language";
import { useCredits } from "@/hooks/use-credits";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  Play,
  Pause,
  Upload,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RotateCcw,
  Send,
  Coins,
  Star,
  Target,
  MessageSquare,
  Lightbulb,
  TrendingUp,
  Square,
  Mic,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ResponseData {
  id: string;
  questionIndex: number;
  question: string;
  audioUrl: string | null;
  duration: number | null;
  transcript: string | null;
  status: string;
  score: number | null;
  feedback: FeedbackData | null;
  createdAt: string;
}

interface FeedbackData {
  nota_geral: number;
  status: string;
  criterios: { nome: string; nota: number; justificativa: string }[];
  pontos_fortes: { titulo: string; descricao: string; citacao?: string }[];
  pontos_melhoria: { prioridade: string; problema: string; recomendacao: string; impacto_esperado?: string }[];
  resposta_modelo?: string;
  dicas_comunicacao?: string[];
  comentario_final?: {
    sintese: string;
    top_3_prioridades: string[];
    nivel_prontidao: string;
  };
}

interface SessionResponse {
  session: {
    id: string;
    name: string;
    totalQuestions: number;
    answeredCount: number;
    analyzedCount: number;
    averageScore: number | null;
    createdAt: string;
    responses: ResponseData[];
  };
}

export default function AudioSessionPage() {
  const router = useRouter();
  const { sessionId } = useParams<{ sessionId: string }>();
  const queryClient = useQueryClient();
  const { t, locale } = useLanguage();
  const { credits } = useCredits();

  const [activeQuestion, setActiveQuestion] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [reRecording, setReRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [expandedFeedback, setExpandedFeedback] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery<SessionResponse>({
    queryKey: ["audio-session", sessionId],
    queryFn: () => api.get(`/api/chevening/audio-mock/sessions/${sessionId}`),
  });

  const session = data?.session;
  const responses = session?.responses ?? [];
  const currentResponse = responses[activeQuestion];

  useSetPageMetadata({
    title: session?.name || t("audioMock.sessionTitle") || "Sessão de Entrevista",
    description: t("audioMock.sessionDesc") || "Responda às perguntas de entrevista em áudio",
    breadcrumbs: [
      { label: "Chevening", href: "/chevening" },
      { label: "Mock Interview", href: "/chevening/mock-interview" },
      { label: t("audioMock.title") || "Áudio", href: "/chevening/mock-interview/audio" },
      { label: session?.name || t("audioMock.session") || "Sessão" },
    ],
  });

  const getAudioProxyUrl = useCallback((qIndex: number) => {
    return `/api/chevening/audio-mock/sessions/${sessionId}/responses/${qIndex}/audio`;
  }, [sessionId]);

  useEffect(() => {
    if (currentResponse?.audioUrl && currentResponse.status !== "PENDING") {
      setAudioUrl(getAudioProxyUrl(activeQuestion));
      setAudioBlob(null);
    } else {
      setAudioUrl(null);
      setAudioBlob(null);
    }
    setReRecording(false);
  }, [activeQuestion, currentResponse?.audioUrl, currentResponse?.status, getAudioProxyUrl]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch {
      toast({
        title: t("audioMock.micError") || "Erro ao acessar microfone",
        description: t("audioMock.micErrorDesc") || "Verifique as permissões do navegador.",
        variant: "destructive",
      });
    }
  }, [t]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.size > 25 * 1024 * 1024) {
        toast({
          title: t("audioMock.fileTooLarge") || "Ficheiro muito grande",
          description: t("audioMock.fileTooLargeDesc") || "Máximo 25MB.",
          variant: "destructive",
        });
        return;
      }

      setAudioBlob(file);
      setAudioUrl(URL.createObjectURL(file));
      setRecordingTime(0);
    },
    [t]
  );

  const resetRecording = useCallback(() => {
    if (audioUrl && audioBlob) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
  }, [audioUrl, audioBlob]);

  const togglePlayback = useCallback(async () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    }
  }, [isPlaying]);

  const uploadAndAnalyze = useCallback(async () => {
    if (!audioBlob || !currentResponse) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("duration", String(recordingTime));

      await apiClient(
        `/api/chevening/audio-mock/sessions/${sessionId}/responses/${currentResponse.questionIndex}/upload`,
        {
          method: "POST",
          body: formData,
          headers: {},
        }
      );

      setUploading(false);
      setAnalyzing(true);

      await apiClient(
        `/api/chevening/audio-mock/sessions/${sessionId}/responses/${currentResponse.questionIndex}/analyze`,
        {
          method: "POST",
          body: JSON.stringify({ language: locale }),
          headers: { "Content-Type": "application/json" },
        }
      );

      setAnalyzing(false);
      setReRecording(false);
      setAudioBlob(null);
      queryClient.invalidateQueries({ queryKey: ["audio-session", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["credits"] });
      setExpandedFeedback(activeQuestion);

      toast({
        title: t("audioMock.analysisComplete") || "Análise concluída!",
        description: t("audioMock.analysisCompleteDesc") || "Veja o feedback detalhado abaixo.",
      });
    } catch (error) {
      setUploading(false);
      setAnalyzing(false);
      toast({
        title: t("audioMock.analysisError") || "Erro na análise",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  }, [audioBlob, currentResponse, sessionId, recordingTime, locale, queryClient, activeQuestion, t]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ANALYZED":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "ANALYZING":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case "RECORDED":
        return <Mic className="h-4 w-4 text-yellow-500" />;
      case "FAILED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">{t("audioMock.sessionNotFound") || "Sessão não encontrada."}</p>
        <Button className="mt-4" onClick={() => router.push("/chevening/mock-interview/audio")}>
          {t("common.back") || "Voltar"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border/60" onClick={() => router.push("/chevening/mock-interview/audio")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-semibold text-lg leading-tight">{session.name}</h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 rounded-lg border border-border/50">
            <span className="text-xs text-muted-foreground">{t("audioMock.progress") || "Progresso"}</span>
            <div className="h-4 w-px bg-border/60" />
            <span className="text-sm font-medium">{session.answeredCount}/{session.totalQuestions}</span>
          </div>

          {session.averageScore != null && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-lg border border-primary/10">
              <span className="text-xs text-primary/80 font-medium">{t("audioMock.avgScore") || "Média"}</span>
              <div className="h-4 w-px bg-primary/20" />
              <span className="text-sm font-bold text-primary">{session.averageScore}/10</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        <div className="flex gap-3 overflow-x-auto pb-4 px-1 scrollbar-hide snap-x">
          {responses.map((r, i) => (
            <button
              key={r.id}
              onClick={() => setActiveQuestion(i)}
              className={cn(
                "flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-xl border text-sm whitespace-nowrap transition-all snap-start",
                activeQuestion === i
                  ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "border-border bg-card hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <div className={cn(
                "h-6 w-6 rounded-lg flex items-center justify-center text-xs font-bold",
                activeQuestion === i ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              )}>
                {i + 1}
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("font-medium", activeQuestion === i ? "text-white" : "text-foreground")}>
                  {r.status === "ANALYZED" ? (t("audioMock.completed") || "Concluída") : (t("audioMock.question") || "Pergunta")}
                </span>
                {r.status === "ANALYZED" && (
                  <CheckCircle2 className={cn("h-3.5 w-3.5", activeQuestion === i ? "text-white/80" : "text-green-500")} />
                )}
              </div>

              {r.score != null && (
                <Badge variant="secondary" className="ml-1 bg-white/20 text-white border-0 hover:bg-white/30">
                  {r.score}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      {currentResponse && (
        <div className="space-y-6">
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            {/* Question Header */}
            <div className="p-6 md:p-8 border-b border-border/50 bg-muted/20">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 mt-1 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/10 shadow-sm">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
                      {t("audioMock.question") || "Pergunta"} {activeQuestion + 1}
                    </Badge>
                    {currentResponse.status === "ANALYZED" && (
                      <Badge variant="secondary" className="bg-green-100/50 text-green-700 border-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {t("audioMock.answered") || "Respondida"}
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-xl md:text-2xl font-semibold leading-relaxed text-foreground">
                    {currentResponse.question}
                  </h3>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">

              {currentResponse.status === "ANALYZING" ? (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-sm text-blue-700 dark:text-blue-400">
                      {t("audioMock.analyzingAudio") || "Analisando sua resposta..."}
                    </span>
                  </div>
                </div>
              ) : currentResponse.status === "ANALYZED" && !reRecording ? (
                <div className="mt-6 flex flex-col items-center gap-3 py-6">
                  <p className="text-sm text-muted-foreground text-center">
                    {t("audioMock.reRecordHint") || "Não ficou satisfeito? Grave novamente sem custo adicional."}
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setReRecording(true);
                        setAudioBlob(null);
                        setAudioUrl(null);
                      }}
                      className="gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      {t("audioMock.reRecordFree") || "Regravar (Grátis)"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {!isRecording && !audioBlob && (currentResponse.status === "PENDING" || reRecording) && (
                    <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-border rounded-xl bg-muted/20">
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Mic className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">
                        {t("audioMock.readyToRecord") || "Pronto para responder?"}
                      </h3>
                      <p className="text-sm text-muted-foreground text-center max-w-sm mb-8">
                        {t("audioMock.recordInstructions") || "Grave sua resposta em áudio quando se sentir preparado. Tente falar de forma clara e pausada."}
                      </p>

                      <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                        <Button size="lg" onClick={startRecording} className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-105">
                          <Mic className="h-5 w-5" />
                          {t("audioMock.startRecording") || "Iniciar Gravação"}
                        </Button>

                        <div className="flex items-center gap-4 w-full sm:w-auto justify-center">
                          <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium opacity-50">{t("common.or") || "OU"}</span>
                        </div>

                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full sm:w-auto gap-2 border-border/60 hover:bg-muted"
                        >
                          <Upload className="h-5 w-5" />
                          {t("audioMock.uploadFile") || "Enviar Áudio"}
                        </Button>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </div>
                  )}

                  {!isRecording && !audioBlob && currentResponse.status === "RECORDED" && (
                    <div className="flex flex-col items-center justify-center py-8 px-4 border border-border rounded-xl bg-card">
                      <div className="flex items-center gap-2 mb-6">
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        <p className="text-sm font-medium">{t("audioMock.recordedButNotSent") || "Áudio gravado mas não enviado"}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button size="lg" onClick={startRecording} className="gap-2">
                          <RotateCcw className="h-5 w-5" />
                          {t("audioMock.reRecord") || "Regravar"}
                        </Button>
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => fileInputRef.current?.click()}
                          className="gap-2"
                        >
                          <Upload className="h-5 w-5" />
                          {t("audioMock.uploadFile") || "Enviar Ficheiro"}
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </div>
                    </div>
                  )}

                  {isRecording && (
                    <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-red-500/20 rounded-xl bg-red-50/10 animate-in fade-in duration-300">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
                        <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                          <Mic className="h-10 w-10 text-white" />
                        </div>
                      </div>

                      <div className="text-center space-y-2 mb-8">
                        <p className="text-4xl font-mono font-bold text-foreground tabular-nums tracking-wider">
                          {formatTime(recordingTime)}
                        </p>
                        <p className="text-sm font-medium text-red-500 animate-pulse uppercase tracking-widest">
                          {t("audioMock.recording") || "Gravando..."}
                        </p>
                      </div>

                      <Button
                        variant="destructive"
                        size="lg"
                        onClick={stopRecording}
                        className="h-12 px-8 rounded-full gap-2 hover:scale-105 transition-all shadow-lg hover:shadow-red-500/20"
                      >
                        <Square className="h-5 w-5 fill-current" />
                        {t("audioMock.stopRecording") || "Parar Gravação"}
                      </Button>
                    </div>
                  )}

                  {!isRecording && audioBlob && (
                    <div className="flex flex-col items-center gap-6 py-6 animate-in slide-in-from-bottom-4 duration-500">
                      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-4">
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-12 w-12 rounded-full shrink-0"
                            onClick={togglePlayback}
                          >
                            {isPlaying ? <Pause className="h-5 w-5 ml-0.5" /> : <Play className="h-5 w-5 ml-1" />}
                          </Button>

                          <div className="flex-1 space-y-1.5">
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary/50 w-full origin-left animate-[progress_2s_ease-in-out_infinite]" style={{ animationPlayState: isPlaying ? 'running' : 'paused' }} />
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground font-mono">
                              <span>{isPlaying ? "Reproduzindo..." : "Pronto"}</span>
                              <span>{recordingTime > 0 ? formatTime(recordingTime) : "00:00"}</span>
                            </div>
                          </div>
                        </div>
                        <audio
                          ref={audioRef}
                          src={audioUrl || undefined}
                          onEnded={() => setIsPlaying(false)}
                          className="hidden"
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        <Button variant="outline" onClick={resetRecording} className="w-full sm:w-auto gap-2 h-11">
                          <RotateCcw className="h-4 w-4" />
                          {t("audioMock.reRecord") || "Regravar"}
                        </Button>

                        <Button
                          onClick={uploadAndAnalyze}
                          disabled={uploading || analyzing}
                          className="w-full sm:w-auto gap-2 h-11 bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                        >
                          {uploading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {t("audioMock.uploading") || "Enviando..."}
                            </>
                          ) : analyzing ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {t("audioMock.analyzing") || "Analisando..."}
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              {t("audioMock.submitAnalysis") || "Enviar e Analisar"}
                            </>
                          )}
                        </Button>
                      </div>

                      {!uploading && !analyzing && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full">
                          <Coins className="h-3.5 w-3.5 text-yellow-500" />
                          {reRecording || currentResponse.status === "ANALYZED" || currentResponse.status === "RECORDED" ? (
                            <span className="text-green-600 font-medium">{t("audioMock.freeReanalysis") || "Reanálise gratuita"}</span>
                          ) : (
                            <>
                              <span>{t("audioMock.cost") || "Custo"}: <strong>10 {t("common.credits") || "créditos"}</strong></span>
                              <span className="text-border mx-1">|</span>
                              <span>{t("audioMock.balance") || "Saldo"}: {credits?.creditsRemaining ?? 0}</span>
                            </>
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {currentResponse.status === "ANALYZED" && currentResponse.feedback && (
              <FeedbackSection
                feedback={currentResponse.feedback}
                transcript={currentResponse.transcript}
                audioUrl={getAudioProxyUrl(activeQuestion)}
                expanded={expandedFeedback === activeQuestion}
                onToggle={() =>
                  setExpandedFeedback(expandedFeedback === activeQuestion ? null : activeQuestion)
                }
                t={t}
              />
            )}
          </div>
        </div>
      )}

      {currentResponse && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            disabled={activeQuestion === 0}
            onClick={() => setActiveQuestion((prev) => prev - 1)}
            className="h-11 px-6 shadow-sm hover:bg-card border-border/60"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("audioMock.prevQuestion") || "Anterior"}
          </Button>
          <Button
            variant="outline"
            disabled={activeQuestion === responses.length - 1}
            onClick={() => setActiveQuestion((prev) => prev + 1)}
            className="h-11 px-6 shadow-sm hover:bg-card border-border/60"
          >
            {t("audioMock.nextQuestion") || "Próxima"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}

function FeedbackSection({
  feedback,
  transcript,
  audioUrl,
  expanded,
  onToggle,
  t,
}: {
  feedback: any;
  transcript: string | null;
  audioUrl?: string | null;
  expanded: boolean;
  onToggle: () => void;
  t: any;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleAudio = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    }
  };

  useEffect(() => {
    if (!expanded) {
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [expanded]);
  const [localExpanded, setLocalExpanded] = useState<Record<string, boolean>>({});

  const toggleCriterio = (index: number) => {
    setLocalExpanded(prev => ({ ...prev, [index]: !prev[index] }));
  };

  function CriterioBar({ criterio, index }: { criterio: any, index: number }) {
    const isOpen = localExpanded[index];
    const barColor = criterio.nota >= 7 ? "bg-emerald-500" : criterio.nota >= 5 ? "bg-amber-400" : "bg-red-400";
    const scoreColor = criterio.nota >= 7 ? "text-emerald-600" : criterio.nota >= 5 ? "text-amber-600" : "text-red-500";

    return (
      <div>
        <button onClick={() => toggleCriterio(index)} className="w-full text-left group">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-foreground">{criterio.nome}</span>
            <div className="flex items-center gap-2">
              <span className={cn("text-sm font-bold tabular-nums", scoreColor)}>{criterio.nota}</span>
              <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
            </div>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-500", barColor)} style={{ width: `${criterio.nota * 10}%` }} />
          </div>
        </button>
        {isOpen && (
          <p className="text-sm text-muted-foreground mt-2 pl-0.5 pb-1 leading-relaxed">{criterio.justificativa}</p>
        )}
      </div>
    );
  }

  function PriorityTag({ priority }: { priority: string }) {
    const styles: Record<string, string> = {
      CRITICO: "bg-red-50 text-red-700 border-red-200",
      IMPORTANTE: "bg-amber-50 text-amber-700 border-amber-200",
      RECOMENDADO: "bg-blue-50 text-blue-700 border-blue-200",
    };
    const labels: Record<string, string> = {
      CRITICO: t("audioMock.priorityCritical") || "Critical",
      IMPORTANTE: t("audioMock.priorityImportant") || "Important",
      RECOMENDADO: t("audioMock.priorityRecommended") || "Recommended",
    };
    return (
      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", styles[priority] || "bg-muted text-muted-foreground border-border")}>
        {labels[priority] || priority}
      </span>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 md:p-6 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-foreground">{t("audioMock.feedbackTitle") || "Detailed Feedback"}</h3>
        </div>
        <div className={cn(
          "h-10 w-10 rounded-full flex items-center justify-center border transition-all",
          expanded ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border group-hover:border-primary/50"
        )}>
          {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border bg-muted/10 p-5 md:p-8 space-y-8 animate-in slide-in-from-top-2 duration-300">

          {/* Transcript Section */}
          {(transcript || audioUrl) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {t("audioMock.transcript") || "Transcript"}
                </h4>
                {audioUrl && (
                  <div className="flex items-center gap-2">
                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      onEnded={() => setIsPlaying(false)}
                      onPause={() => setIsPlaying(false)}
                      onPlay={() => setIsPlaying(true)}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleAudio}
                      className="h-8 gap-2 bg-background hover:bg-muted text-xs font-medium"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="h-3.5 w-3.5" />
                          {t("audioMock.pause") || "Pause"}
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" />
                          {t("audioMock.listenOriginal") || "Listen"}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
              {transcript && (
                <p className="text-sm leading-relaxed text-foreground">
                  {transcript}
                </p>
              )}
            </div>
          )}

          {/* Criteria Grid */}
          {feedback.criterios && feedback.criterios.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">{t("audioMock.criteria") || "Evaluation Criteria"}</h3>
              </div>
              <div className="space-y-4">
                {feedback.criterios.map((c, i) => (
                  <CriterioBar key={i} criterio={c} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Strengths */}
          {feedback.pontos_fortes?.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-foreground">{t("audioMock.strengths") || "Strengths"}</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {feedback.pontos_fortes.map((p: any, i: number) => (
                  <div key={i} className="rounded-xl bg-emerald-50/50 border border-emerald-100 p-3.5">
                    <h4 className="text-sm font-medium text-foreground">{p.titulo}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{p.descricao}</p>
                    {p.citacao && (
                      <blockquote className="mt-2 border-l-2 border-emerald-300 pl-3 text-xs italic text-muted-foreground">
                        "{p.citacao}"
                      </blockquote>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Improvements */}
          {feedback.pontos_melhoria?.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-foreground">{t("audioMock.improvements") || "Areas for Improvement"}</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {feedback.pontos_melhoria.map((p: any, i: number) => (
                  <div key={i} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <PriorityTag priority={p.prioridade} />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-2">{p.problema}</p>
                    <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{t("audioMock.recommendation") || "Recommendation:"}</span> {p.recomendacao}
                      </p>
                    </div>
                    {p.impacto_esperado && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Lightbulb className="h-3 w-3" />
                        {p.impacto_esperado}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Model Answer & Tips Grid */}
          <div className="grid md:grid-cols-2 gap-6 bg-card rounded-2xl border border-border p-5 md:p-6 shadow-sm">
            {feedback.resposta_modelo && (
              <div>
                <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  {t("audioMock.modelAnswer") || "Model Answer"}
                </h4>
                <div className="text-sm text-foreground leading-relaxed p-4 bg-muted/30 rounded-xl border border-border">
                  {feedback.resposta_modelo}
                </div>
              </div>
            )}

            {feedback.dicas_comunicacao && feedback.dicas_comunicacao.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  {t("audioMock.commTips") || "Communication Tips"}
                </h4>
                <ul className="space-y-3">
                  {feedback.dicas_comunicacao.map((d: string, i: number) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-3 bg-muted/30 p-3 rounded-lg border border-border/50">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                      <span className="leading-relaxed">{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Final Comment */}
          {feedback.comentario_final && (
            <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {t("audioMock.finalComment") || "AI Verdict"}
                </h4>
                <Badge variant="outline" className="w-fit bg-background text-foreground border-primary/20">
                  {t("audioMock.readiness") || "Readiness"}: <strong className="ml-1 text-primary">{feedback.comentario_final.nivel_prontidao}</strong>
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {feedback.comentario_final.sintese}
              </p>

              {feedback.comentario_final.top_3_prioridades?.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    {t("audioMock.topPriorities") || "Your Top 3 Priorities:"}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {feedback.comentario_final.top_3_prioridades.map((p: string, i: number) => (
                      <div key={i} className="flex items-center gap-3 bg-background rounded-lg p-3 border border-border">
                        <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                          {i + 1}
                        </div>
                        <span className="text-sm font-medium">{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

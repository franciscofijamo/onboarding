"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiClient } from "@/lib/api-client";
import { useSetPageMetadata } from "@/contexts/page-metadata";
import { useLanguage } from "@/contexts/language";
import { useCredits } from "@/hooks/use-credits";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
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
import { AnnotatedTranscript } from "@/components/scenarios/annotated-transcript";

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

interface TranscriptAnnotation {
  text: string;
  type: "grammar_error" | "vocabulary" | "good_usage" | "filler" | "structure" | "pronunciation_hint";
  comment: string;
  suggestion?: string | null;
}

interface FeedbackData {
  overall_score?: number;
  nota_geral?: number;
  status: string;
  transcript_annotations?: TranscriptAnnotation[];
  criteria?: { name: string; score: number; justification: string }[];
  criterios?: { nome: string; nota: number; justificativa: string }[];
  strengths?: { title: string; description: string; quote?: string }[];
  pontos_fortes?: { titulo: string; descricao: string; citacao?: string }[];
  improvements?: { priority: string; issue: string; recommendation: string; expected_impact?: string }[];
  pontos_melhoria?: { prioridade: string; problema: string; recomendacao: string; impacto_esperado?: string }[];
  model_response?: string;
  resposta_modelo?: string;
  communication_tips?: string[];
  dicas_comunicacao?: string[];
  final_comment?: {
    summary: string;
    top_3_priorities: string[];
    readiness_level: string;
  };
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
    scenarioType: string | null;
    totalQuestions: number;
    answeredCount: number;
    analyzedCount: number;
    averageScore: number | null;
    createdAt: string;
    responses: ResponseData[];
  };
}

export default function ScenarioSessionPage() {
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
    queryKey: ["scenario-session", sessionId],
    queryFn: () => api.get(`/api/scenarios/sessions/${sessionId}`),
  });

  const session = data?.session;
  const responses = session?.responses ?? [];
  const currentResponse = responses[activeQuestion];

  useSetPageMetadata({
    title: session?.name || t("scenarios.sessionTitle") || "Scenario Session",
    description: t("scenarios.sessionDesc") || "Practice your workplace communication through audio",
    breadcrumbs: [
      { label: t("scenarios.title") || "Scenarios", href: "/scenarios" },
      { label: session?.name || t("scenarios.session") || "Session" },
    ],
  });

  const getAudioProxyUrl = useCallback((qIndex: number) => {
    return `/api/scenarios/sessions/${sessionId}/responses/${qIndex}/audio`;
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
        title: t("scenarios.micError") || "Error accessing microphone",
        description: t("scenarios.micErrorDesc") || "Check your browser permissions.",
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
          title: t("scenarios.fileTooLarge") || "File too large",
          description: t("scenarios.fileTooLargeDesc") || "Maximum 25MB.",
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
        `/api/scenarios/sessions/${sessionId}/responses/${currentResponse.questionIndex}/upload`,
        {
          method: "POST",
          body: formData,
          headers: {},
        }
      );

      setUploading(false);
      setAnalyzing(true);

      await apiClient(
        `/api/scenarios/sessions/${sessionId}/responses/${currentResponse.questionIndex}/analyze`,
        {
          method: "POST",
          body: JSON.stringify({ language: locale }),
          headers: { "Content-Type": "application/json" },
        }
      );

      setAnalyzing(false);
      setReRecording(false);
      setAudioBlob(null);
      queryClient.invalidateQueries({ queryKey: ["scenario-session", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["credits"] });
      setExpandedFeedback(activeQuestion);

      toast({
        title: t("scenarios.analysisComplete") || "Analysis complete!",
        description: t("scenarios.analysisCompleteDesc") || "View detailed feedback below.",
      });
    } catch (error) {
      setUploading(false);
      setAnalyzing(false);
      toast({
        title: t("scenarios.analysisError") || "Analysis error",
        description: error instanceof Error ? error.message : "Please try again.",
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
        <p className="text-muted-foreground">{t("scenarios.sessionNotFound") || "Session not found."}</p>
        <Button className="mt-4" onClick={() => router.push("/scenarios")}>
          {t("common.back") || "Back"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border/60" onClick={() => router.push("/scenarios")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-semibold text-lg leading-tight">{session.name}</h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 rounded-lg border border-border/50">
            <span className="text-xs text-muted-foreground">{t("scenarios.progress") || "Progress"}</span>
            <div className="h-4 w-px bg-border/60" />
            <span className="text-sm font-medium">{session.answeredCount}/{session.totalQuestions}</span>
          </div>

          {session.averageScore != null && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-lg border border-primary/10">
              <span className="text-xs text-primary/80 font-medium">{t("scenarios.avgScore") || "Average"}</span>
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
                  {r.status === "ANALYZED" ? (t("scenarios.completed") || "Completed") : (t("scenarios.scenario") || "Scenario")}
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
            <div className="p-6 md:p-8 border-b border-border/50 bg-muted/20">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 mt-1 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/10 shadow-sm">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
                      {t("scenarios.scenario") || "Scenario"} {activeQuestion + 1}
                    </Badge>
                    {currentResponse.status === "ANALYZED" && (
                      <Badge variant="secondary" className="bg-green-100/50 text-green-700 border-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {t("scenarios.answered") || "Answered"}
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
                <div className="mt-4 p-4 bg-muted/40 rounded-xl border border-border/60">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-foreground">
                      {t("scenarios.analyzingAudio") || "Analyzing your response..."}
                    </span>
                  </div>
                </div>
              ) : currentResponse.status === "ANALYZED" && !reRecording ? (
                <div className="mt-6 flex flex-col items-center gap-3 py-6">
                  <p className="text-sm text-muted-foreground text-center">
                    {t("scenarios.reRecordHint") || "Not satisfied? Re-record at no additional cost."}
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
                      {t("scenarios.reRecordFree") || "Re-record (Free)"}
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
                        {t("scenarios.readyToRecord") || "Ready to respond?"}
                      </h3>
                      <p className="text-sm text-muted-foreground text-center max-w-sm mb-8">
                        {t("scenarios.recordInstructions") || "Record your response when ready. Speak clearly and professionally as you would in a real workplace."}
                      </p>

                      <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                        <Button size="lg" onClick={startRecording} className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-105">
                          <Mic className="h-5 w-5" />
                          {t("scenarios.startRecording") || "Start Recording"}
                        </Button>

                        <div className="flex items-center gap-4 w-full sm:w-auto justify-center">
                          <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium opacity-50">{t("common.or") || "OR"}</span>
                        </div>

                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full sm:w-auto gap-2 border-border/60 hover:bg-muted"
                        >
                          <Upload className="h-5 w-5" />
                          {t("scenarios.uploadFile") || "Upload Audio"}
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
                        <p className="text-sm font-medium">{t("scenarios.recordedButNotSent") || "Audio recorded but not submitted"}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button size="lg" onClick={startRecording} className="gap-2">
                          <RotateCcw className="h-5 w-5" />
                          {t("scenarios.reRecord") || "Re-record"}
                        </Button>
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => fileInputRef.current?.click()}
                          className="gap-2"
                        >
                          <Upload className="h-5 w-5" />
                          {t("scenarios.uploadFile") || "Upload File"}
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
                          {t("scenarios.recording") || "Recording..."}
                        </p>
                      </div>

                      <Button
                        variant="destructive"
                        size="lg"
                        onClick={stopRecording}
                        className="h-12 px-8 rounded-full gap-2 hover:scale-105 transition-all shadow-lg hover:shadow-red-500/20"
                      >
                        <Square className="h-5 w-5 fill-current" />
                        {t("scenarios.stopRecording") || "Stop Recording"}
                      </Button>
                    </div>
                  )}

                  {!isRecording && audioBlob && (
                    <div className="flex flex-col items-center gap-6 py-6 animate-in slide-in-from-bottom-4 duration-500">
                      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 rounded-full shrink-0"
                            onClick={togglePlayback}
                          >
                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div className={cn("h-full bg-primary rounded-full transition-all", isPlaying ? "animate-pulse" : "")} style={{ width: "100%" }} />
                          </div>
                          <span className="text-xs text-muted-foreground font-mono w-10 text-right">
                            {formatTime(recordingTime)}
                          </span>
                        </div>
                        {audioUrl && (
                          <audio
                            ref={audioRef}
                            src={audioUrl}
                            onEnded={() => setIsPlaying(false)}
                            className="hidden"
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          onClick={resetRecording}
                          className="gap-2"
                        >
                          <RotateCcw className="h-4 w-4" />
                          {t("scenarios.reRecord") || "Re-record"}
                        </Button>
                        <Button
                          onClick={uploadAndAnalyze}
                          disabled={uploading || analyzing}
                          className="gap-2"
                        >
                          {uploading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {t("scenarios.uploading") || "Uploading..."}
                            </>
                          ) : analyzing ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {t("scenarios.analyzing") || "Analyzing..."}
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              {t("scenarios.submitAndAnalyze") || "Submit & Analyze"}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {currentResponse.status === "ANALYZED" && currentResponse.feedback && (() => {
                const fb = currentResponse.feedback;
                const score = fb.overall_score ?? fb.nota_geral ?? 0;
                const criteriaList = fb.criteria?.map(c => ({ name: c.name, score: c.score, justification: c.justification }))
                  || fb.criterios?.map(c => ({ name: c.nome, score: c.nota, justification: c.justificativa }))
                  || [];
                const strengthsList = fb.strengths?.map(s => ({ title: s.title, description: s.description, quote: s.quote }))
                  || fb.pontos_fortes?.map(s => ({ title: s.titulo, description: s.descricao, quote: s.citacao }))
                  || [];
                const improvementsList = fb.improvements?.map(i => ({ priority: i.priority, issue: i.issue, recommendation: i.recommendation, expected_impact: i.expected_impact }))
                  || fb.pontos_melhoria?.map(i => ({ priority: i.prioridade, issue: i.problema, recommendation: i.recomendacao, expected_impact: i.impacto_esperado }))
                  || [];
                const modelResponse = fb.model_response || fb.resposta_modelo || "";
                const tips = fb.communication_tips || fb.dicas_comunicacao || [];
                const finalComment = fb.final_comment
                  ? { summary: fb.final_comment.summary, priorities: fb.final_comment.top_3_priorities, readiness: fb.final_comment.readiness_level }
                  : fb.comentario_final
                  ? { summary: fb.comentario_final.sintese, priorities: fb.comentario_final.top_3_prioridades, readiness: fb.comentario_final.nivel_prontidao }
                  : null;
                const annotations = fb.transcript_annotations || [];

                return (
                <div className="mt-6 space-y-4">
                  <button
                    onClick={() => setExpandedFeedback(expandedFeedback === activeQuestion ? null : activeQuestion)}
                    className="w-full flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("text-2xl font-bold", getScoreColor(score))}>
                        {score}/10
                      </div>
                      <div className="text-left">
                        <p className="font-medium">{"Detailed Feedback"}</p>
                        <p className="text-xs text-muted-foreground">{fb.status}</p>
                      </div>
                    </div>
                    {expandedFeedback === activeQuestion ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>

                  {expandedFeedback === activeQuestion && (
                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">

                      {currentResponse.transcript && (
                        <div className="p-5 md:p-6 bg-muted/10 rounded-2xl border border-border/60 shadow-sm">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <MessageSquare className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-base">Your Response</h4>
                              <p className="text-xs text-muted-foreground">Click highlighted words for detailed feedback</p>
                            </div>
                          </div>
                          {annotations.length > 0 ? (
                            <AnnotatedTranscript
                              transcript={currentResponse.transcript}
                              annotations={annotations}
                            />
                          ) : (
                            <div className="p-5 bg-card rounded-xl border border-border/60">
                              <p className="text-[15px] leading-[1.9] text-foreground/90 whitespace-pre-wrap">{currentResponse.transcript}</p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="grid gap-2">
                        <h4 className="font-medium flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Evaluation Criteria
                        </h4>
                        {criteriaList.map((c, i) => (
                          <div key={i} className={cn("flex items-center justify-between p-3 bg-card rounded-lg border border-border/50 border-l-4", c.score >= 8 ? "border-l-emerald-500" : c.score >= 6 ? "border-l-amber-500" : "border-l-red-500")}>
                            <div>
                              <span className="text-sm font-medium">{c.name}</span>
                              <p className="text-xs text-muted-foreground mt-0.5">{c.justification}</p>
                            </div>
                            <span className={cn("text-lg font-bold ml-4", getScoreColor(c.score))}>{c.score}</span>
                          </div>
                        ))}
                      </div>

                      {strengthsList.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Star className="h-4 w-4 text-primary" />
                            Strengths
                          </h4>
                          {strengthsList.map((p, i) => (
                              <div key={i} className="p-3 bg-card rounded-lg border border-border/50 border-l-4 border-l-emerald-500 mb-2 shadow-sm">
                                <p className="text-sm font-medium text-foreground">{p.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                                {p.quote && <p className="text-xs italic text-muted-foreground mt-1">&ldquo;{p.quote}&rdquo;</p>}
                              </div>
                          ))}
                        </div>
                      )}

                      {improvementsList.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            Improvements
                          </h4>
                          {improvementsList.map((p, i) => {
                            const pLower = p.priority.toLowerCase();
                            const isCritical = pLower.includes("critical") || pLower.includes("high") || pLower.includes("crítica") || pLower.includes("alta");
                            const badgeColor = isCritical ? "bg-red-500 text-white hover:bg-red-600 border-transparent" : "bg-amber-500 text-white hover:bg-amber-600 border-transparent";
                            const borderColor = isCritical ? "border-l-red-500" : "border-l-amber-500";
                            return (
                              <div key={i} className={cn("p-3 bg-card rounded-lg border border-border/50 border-l-4 mb-2 shadow-sm", borderColor)}>
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className={cn("text-[10px] h-5", badgeColor)}>{p.priority}</Badge>
                                  <p className="text-sm font-medium text-foreground">{p.issue}</p>
                                </div>
                                <p className="text-xs text-muted-foreground">{p.recommendation}</p>
                                {p.expected_impact && <p className="text-xs text-muted-foreground mt-1">Impact: {p.expected_impact}</p>}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {modelResponse && (
                        <div className="p-4 bg-card rounded-xl border border-border/50 border-l-4 border-l-blue-500 shadow-sm">
                          <h4 className="font-medium mb-2 flex items-center gap-2 text-foreground">
                            <Lightbulb className="h-4 w-4 text-blue-500" />
                            Model Response
                          </h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{modelResponse}</p>
                        </div>
                      )}

                      {tips.length > 0 && (
                        <div className="p-4 bg-card rounded-xl border border-border/50 border-l-4 border-l-purple-500 shadow-sm">
                          <h4 className="font-medium mb-2 flex items-center gap-2 text-foreground">
                            <MessageSquare className="h-4 w-4 text-purple-500" />
                            Communication Tips
                          </h4>
                          <ul className="space-y-1">
                            {tips.map((tip, i) => (
                              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0" />
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {finalComment && (
                        <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                          <h4 className="font-medium mb-2">Final Comment</h4>
                          <p className="text-sm text-muted-foreground mb-2">{finalComment.summary}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge>{finalComment.readiness}</Badge>
                          </div>
                          {finalComment.priorities?.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium mb-1">Top Priorities:</p>
                              <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-0.5">
                                {finalComment.priorities.map((p, i) => (
                                  <li key={i}>{p}</li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                );
              })()}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              disabled={activeQuestion === 0}
              onClick={() => setActiveQuestion(activeQuestion - 1)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("scenarios.previous") || "Previous"}
            </Button>
            <span className="text-sm text-muted-foreground">
              {activeQuestion + 1} / {responses.length}
            </span>
            <Button
              variant="outline"
              disabled={activeQuestion === responses.length - 1}
              onClick={() => setActiveQuestion(activeQuestion + 1)}
              className="gap-2"
            >
              {t("scenarios.next") || "Next"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

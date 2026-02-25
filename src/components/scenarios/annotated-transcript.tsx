"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  MessageCircle,
  PenLine,
  Volume2,
  X,
} from "lucide-react";

export interface TranscriptAnnotation {
  text: string;
  type: "grammar_error" | "vocabulary" | "good_usage" | "filler" | "structure" | "pronunciation_hint";
  comment: string;
  suggestion?: string | null;
}

interface AnnotatedTranscriptProps {
  transcript: string;
  annotations: TranscriptAnnotation[];
}

const ANNOTATION_CONFIG: Record<
  TranscriptAnnotation["type"],
  {
    label: string;
    bgClass: string;
    borderClass: string;
    textClass: string;
    dotClass: string;
    icon: React.ReactNode;
  }
> = {
  grammar_error: {
    label: "Grammar",
    bgClass: "bg-red-100/70 dark:bg-red-950/40",
    borderClass: "border-red-300 dark:border-red-800",
    textClass: "text-red-700 dark:text-red-300",
    dotClass: "bg-red-400",
    icon: <PenLine className="h-3.5 w-3.5" />,
  },
  vocabulary: {
    label: "Vocabulary",
    bgClass: "bg-amber-100/70 dark:bg-amber-950/40",
    borderClass: "border-amber-300 dark:border-amber-800",
    textClass: "text-amber-700 dark:text-amber-300",
    dotClass: "bg-amber-400",
    icon: <BookOpen className="h-3.5 w-3.5" />,
  },
  good_usage: {
    label: "Good Usage",
    bgClass: "bg-emerald-100/70 dark:bg-emerald-950/40",
    borderClass: "border-emerald-300 dark:border-emerald-800",
    textClass: "text-emerald-700 dark:text-emerald-300",
    dotClass: "bg-emerald-400",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  filler: {
    label: "Filler",
    bgClass: "bg-slate-200/70 dark:bg-slate-800/40",
    borderClass: "border-slate-300 dark:border-slate-700",
    textClass: "text-slate-600 dark:text-slate-400",
    dotClass: "bg-slate-400",
    icon: <MessageCircle className="h-3.5 w-3.5" />,
  },
  structure: {
    label: "Structure",
    bgClass: "bg-violet-100/70 dark:bg-violet-950/40",
    borderClass: "border-violet-300 dark:border-violet-800",
    textClass: "text-violet-700 dark:text-violet-300",
    dotClass: "bg-violet-400",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  pronunciation_hint: {
    label: "Pronunciation",
    bgClass: "bg-sky-100/70 dark:bg-sky-950/40",
    borderClass: "border-sky-300 dark:border-sky-800",
    textClass: "text-sky-700 dark:text-sky-300",
    dotClass: "bg-sky-400",
    icon: <Volume2 className="h-3.5 w-3.5" />,
  },
};

interface TextSegment {
  text: string;
  annotation?: TranscriptAnnotation;
  annotationIndex?: number;
}

function buildSegments(
  transcript: string,
  annotations: TranscriptAnnotation[]
): TextSegment[] {
  if (!annotations.length) {
    return [{ text: transcript }];
  }

  const matches: { start: number; end: number; annotation: TranscriptAnnotation; index: number }[] = [];
  const usedPositions = new Set<number>();

  for (let ai = 0; ai < annotations.length; ai++) {
    const a = annotations[ai];
    const idx = transcript.indexOf(a.text);
    if (idx === -1) continue;

    let overlap = false;
    for (let pos = idx; pos < idx + a.text.length; pos++) {
      if (usedPositions.has(pos)) {
        overlap = true;
        break;
      }
    }
    if (overlap) continue;

    for (let pos = idx; pos < idx + a.text.length; pos++) {
      usedPositions.add(pos);
    }
    matches.push({ start: idx, end: idx + a.text.length, annotation: a, index: ai });
  }

  matches.sort((a, b) => a.start - b.start);

  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const m of matches) {
    if (m.start > cursor) {
      segments.push({ text: transcript.slice(cursor, m.start) });
    }
    segments.push({
      text: transcript.slice(m.start, m.end),
      annotation: m.annotation,
      annotationIndex: m.index,
    });
    cursor = m.end;
  }

  if (cursor < transcript.length) {
    segments.push({ text: transcript.slice(cursor) });
  }

  return segments;
}

export function AnnotatedTranscript({ transcript, annotations }: AnnotatedTranscriptProps) {
  const [activeAnnotation, setActiveAnnotation] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<TranscriptAnnotation["type"] | "all">("all");

  const segments = useMemo(() => buildSegments(transcript, annotations), [transcript, annotations]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    annotations.forEach((a) => {
      counts[a.type] = (counts[a.type] || 0) + 1;
    });
    return counts;
  }, [annotations]);

  const errorCount = (typeCounts.grammar_error || 0) + (typeCounts.structure || 0);
  const goodCount = typeCounts.good_usage || 0;
  const fillerCount = typeCounts.filler || 0;

  const activeAnno = activeAnnotation !== null ? annotations[activeAnnotation] : null;
  const activeConfig = activeAnno ? ANNOTATION_CONFIG[activeAnno.type] : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilterType("all")}
          className={cn(
            "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border",
            filterType === "all"
              ? "bg-foreground text-background border-foreground"
              : "bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted"
          )}
        >
          All ({annotations.length})
        </button>
        {Object.entries(typeCounts).map(([type, count]) => {
          const config = ANNOTATION_CONFIG[type as TranscriptAnnotation["type"]];
          if (!config) return null;
          return (
            <button
              key={type}
              onClick={() => setFilterType(type as TranscriptAnnotation["type"])}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border",
                filterType === type
                  ? `${config.bgClass} ${config.borderClass} ${config.textClass}`
                  : "bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted"
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", config.dotClass)} />
              {config.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {errorCount > 0 && (
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            {errorCount} {errorCount === 1 ? "issue" : "issues"} found
          </span>
        )}
        {goodCount > 0 && (
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {goodCount} good {goodCount === 1 ? "usage" : "usages"}
          </span>
        )}
        {fillerCount > 0 && (
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            {fillerCount} {fillerCount === 1 ? "filler" : "fillers"}
          </span>
        )}
      </div>

      <div className="relative p-5 md:p-6 bg-card rounded-xl border border-border/60 shadow-sm">
        <p className="text-[15px] leading-[1.9] text-foreground/90 whitespace-pre-wrap">
          {segments.map((seg, i) => {
            if (!seg.annotation) {
              return <span key={i}>{seg.text}</span>;
            }

            const config = ANNOTATION_CONFIG[seg.annotation.type];
            const isFiltered = filterType !== "all" && seg.annotation.type !== filterType;
            const isActive = activeAnnotation === seg.annotationIndex;

            if (isFiltered) {
              return <span key={i}>{seg.text}</span>;
            }

            return (
              <span
                key={i}
                onClick={() => setActiveAnnotation(isActive ? null : seg.annotationIndex!)}
                className={cn(
                  "relative cursor-pointer rounded-[3px] px-[2px] -mx-[2px] transition-all duration-150",
                  config.bgClass,
                  isActive && `ring-2 ${config.borderClass} shadow-sm`,
                  seg.annotation.type === "grammar_error" &&
                    "underline decoration-wavy decoration-red-400/60 underline-offset-4 decoration-[1.5px]",
                  seg.annotation.type === "structure" &&
                    "underline decoration-wavy decoration-violet-400/60 underline-offset-4 decoration-[1.5px]",
                  seg.annotation.type === "vocabulary" &&
                    "underline decoration-dashed decoration-amber-400/60 underline-offset-4 decoration-[1.5px]",
                  seg.annotation.type === "filler" && "opacity-60",
                  seg.annotation.type === "good_usage" &&
                    "decoration-emerald-400/60"
                )}
              >
                {seg.text}
              </span>
            );
          })}
        </p>
      </div>

      {activeAnno && activeConfig && (
        <div
          className={cn(
            "relative p-4 rounded-xl border shadow-sm animate-in slide-in-from-top-2 duration-200",
            activeConfig.bgClass,
            activeConfig.borderClass
          )}
        >
          <button
            onClick={() => setActiveAnnotation(null)}
            className="absolute top-3 right-3 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>

          <div className="flex items-start gap-3">
            <div className={cn("mt-0.5 p-1.5 rounded-lg", activeConfig.bgClass, activeConfig.textClass)}>
              {activeConfig.icon}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn("text-[10px] h-5", activeConfig.textClass, activeConfig.borderClass)}
                >
                  {activeConfig.label}
                </Badge>
              </div>

              <p className={cn("text-sm font-medium", activeConfig.textClass)}>
                &ldquo;{activeAnno.text}&rdquo;
              </p>

              <p className="text-sm text-foreground/80">{activeAnno.comment}</p>

              {activeAnno.suggestion && (
                <div className="flex items-start gap-2 pt-1">
                  <span className="text-xs font-medium text-muted-foreground mt-0.5 shrink-0">Suggestion:</span>
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {activeAnno.suggestion}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

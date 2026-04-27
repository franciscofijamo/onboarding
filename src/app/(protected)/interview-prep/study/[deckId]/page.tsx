"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useSetPageMetadata } from "@/contexts/page-metadata";
import { useLanguage } from "@/contexts/language";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    ArrowLeft,
    ArrowRight,
    RotateCcw,
    Shuffle,
    ListOrdered,
    X,
    Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FlashcardData {
    id: string;
    question: string;
    answer: string;
    category: string;
    relatedSkill: string | null;
    tips: string | null;
    order: number;
    studied: boolean;
    studiedAt: string | null;
}

interface DeckResponse {
    deck: {
        id: string;
        name: string;
        totalCards: number;
        studiedCards: number;
        progress: number;
        createdAt: string;
        updatedAt: string;
    };
    flashcards: FlashcardData[];
    recentSessions: unknown[];
}

const CATEGORY_COLORS: Record<string, string> = {
    behavioral: "bg-blue-100 text-blue-700",
    technical: "bg-purple-100 text-purple-700",
    situational: "bg-amber-100 text-amber-700",
    culture_fit: "bg-emerald-100 text-emerald-700",
    business_english: "bg-rose-100 text-rose-700",
};

const CATEGORY_LABELS: Record<string, string> = {
    behavioral: "Behavioral",
    technical: "Technical",
    situational: "Situational",
    culture_fit: "Culture Fit",
    business_english: "Business English",
};

export default function StudyPage({ params }: { params: Promise<{ deckId: string }> }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    const [deckId, setDeckId] = useState<string | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [mode, setMode] = useState<"sequential" | "random">(
        searchParams.get("mode") === "random" ? "random" : "sequential"
    );
    const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
    const startTimeRef = useRef<number>(Date.now());
    const studiedCardsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        params.then((p) => setDeckId(p.deckId));
    }, [params]);

    useSetPageMetadata({
        title: "Study Flashcards",
        description: "",
        breadcrumbs: [
            { label: "Interview Prep", href: "/interview-prep" },
            { label: "Study" },
        ],
    });

    const { data, isLoading } = useQuery<DeckResponse>({
        queryKey: ["mock-interview-deck", deckId],
        queryFn: () => api.get(`/api/mock-interview/decks/${deckId}`),
        enabled: !!deckId,
    });

    const flipMutation = useMutation({
        mutationFn: (cardId: string) =>
            api.post(`/api/mock-interview/decks/${deckId}/cards/${cardId}/flip`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["mock-interview-deck", deckId] });
        },
    });

    const sessionMutation = useMutation({
        mutationFn: (sessionData: { cardsStudied: number; duration: number; mode: string }) =>
            api.post(`/api/mock-interview/decks/${deckId}/study`, sessionData),
    });

    const flashcards = data?.flashcards ?? [];
    const deck = data?.deck;

    useEffect(() => {
        if (flashcards.length > 0 && shuffledIndices.length === 0) {
            const indices = flashcards.map((_, i) => i);
            if (mode === "random") {
                for (let i = indices.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [indices[i], indices[j]] = [indices[j], indices[i]];
                }
            }
            setShuffledIndices(indices);
        }
    }, [flashcards, mode, shuffledIndices.length]);

    const actualIndex = mode === "random" ? shuffledIndices[currentIndex] ?? 0 : currentIndex;
    const currentCard = flashcards[actualIndex];

    const handleFlip = useCallback(() => {
        setIsFlipped((prev) => !prev);
        if (currentCard && !isFlipped && !currentCard.studied) {
            studiedCardsRef.current.add(currentCard.id);
            flipMutation.mutate(currentCard.id);
            posthog.capture("flashcard_studied", {
                card_id: currentCard.id,
                card_category: currentCard.category,
                deck_id: deckId,
            });
        }
    }, [currentCard, isFlipped, flipMutation, deckId]);

    const handlePrev = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
            setIsFlipped(false);
        }
    }, [currentIndex]);

    const handleNext = useCallback(() => {
        if (currentIndex < flashcards.length - 1) {
            setCurrentIndex((prev) => prev + 1);
            setIsFlipped(false);
        }
    }, [currentIndex, flashcards.length]);

    const handleExit = useCallback(() => {
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        sessionMutation.mutate({
            cardsStudied: studiedCardsRef.current.size,
            duration,
            mode,
        });
        router.push("/interview-prep");
    }, [mode, router, sessionMutation]);

    const toggleMode = useCallback(() => {
        const newMode = mode === "sequential" ? "random" : "sequential";
        setMode(newMode);
        setCurrentIndex(0);
        setIsFlipped(false);

        const indices = flashcards.map((_, i) => i);
        if (newMode === "random") {
            for (let i = indices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [indices[i], indices[j]] = [indices[j], indices[i]];
            }
        }
        setShuffledIndices(indices);
    }, [mode, flashcards]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") handlePrev();
            if (e.key === "ArrowRight") handleNext();
            if (e.key === " ") {
                e.preventDefault();
                handleFlip();
            }
            if (e.key === "Escape") handleExit();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handlePrev, handleNext, handleFlip, handleExit]);

    if (isLoading || !deckId) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-96 rounded-2xl" />
            </div>
        );
    }

    if (!currentCard) {
        return (
            <div className="text-center py-20">
                <p>No flashcards found.</p>
                <Button onClick={() => router.push("/interview-prep")}>
                    Back
                </Button>
            </div>
        );
    }

    const progress = ((currentIndex + 1) / flashcards.length) * 100;

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={handleExit}>
                        <X className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="font-semibold">{deck?.name}</h2>
                        <p className="text-sm text-muted-foreground">
                            Card {currentIndex + 1} of {flashcards.length}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={toggleMode}>
                        {mode === "sequential" ? (
                            <>
                                <Shuffle className="h-4 w-4" />
                                Random
                            </>
                        ) : (
                            <>
                                <ListOrdered className="h-4 w-4" />
                                Sequential
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div
                className="relative h-[400px] cursor-pointer perspective-1000"
                onClick={handleFlip}
            >
                <div
                    className={cn(
                        "absolute inset-0 transition-transform duration-500 transform-style-3d",
                        isFlipped && "rotate-y-180"
                    )}
                >
                    <div
                        className={cn(
                            "absolute inset-0 bg-card rounded-2xl border border-border p-8 flex flex-col backface-hidden shadow-lg",
                            isFlipped && "invisible"
                        )}
                    >
                        <div className="flex items-center gap-2 mb-6">
                            <Badge className={CATEGORY_COLORS[currentCard.category] || "bg-gray-100 text-gray-700"}>
                                {CATEGORY_LABELS[currentCard.category] || currentCard.category}
                            </Badge>
                            {currentCard.relatedSkill && (
                                <Badge variant="outline">
                                    {currentCard.relatedSkill}
                                </Badge>
                            )}
                        </div>

                        <div className="flex-1 flex items-center justify-center">
                            <p className="text-xl text-center leading-relaxed font-medium">
                                {currentCard.question}
                            </p>
                        </div>

                        <p className="text-center text-sm text-muted-foreground mt-4">
                            Click to see the answer
                        </p>
                    </div>

                    <div
                        className={cn(
                            "absolute inset-0 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-200/50 dark:border-blue-800/30 p-8 flex flex-col backface-hidden rotate-y-180 shadow-lg overflow-auto",
                            !isFlipped && "invisible"
                        )}
                    >
                        <Badge variant="secondary" className="self-start mb-4">
                            Model Answer (STAR)
                        </Badge>

                        <div className="flex-1 overflow-auto">
                            <p className="text-base leading-relaxed whitespace-pre-wrap">
                                {currentCard.answer}
                            </p>
                        </div>

                        {currentCard.tips && (
                            <div className="mt-4 pt-4 border-t border-blue-200/50 dark:border-blue-800/30">
                                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <Lightbulb className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                                    <p>{currentCard.tips}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <Button
                    variant="outline"
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                >
                    <ArrowLeft className="h-4 w-4" />
                    Previous
                </Button>

                <Button variant="ghost" size="sm" onClick={handleFlip}>
                    <RotateCcw className="h-4 w-4" />
                    Flip
                </Button>

                <Button
                    onClick={handleNext}
                    disabled={currentIndex === flashcards.length - 1}
                >
                    Next
                    <ArrowRight className="h-4 w-4" />
                </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
                Use ← → to navigate • Space to flip • ESC to exit
            </p>

            <style jsx global>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
        </div>
    );
}

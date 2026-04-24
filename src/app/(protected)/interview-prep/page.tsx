"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useSetPageMetadata } from "@/contexts/page-metadata";
import { useLanguage } from "@/contexts/language";
import { useCredits } from "@/hooks/use-credits";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
    Sparkles,
    BookOpen,
    Clock,
    Target,
    TrendingUp,
    Flame,
    MoreVertical,
    Play,
    Shuffle,
    Download,
    Pencil,
    Trash2,
    Loader2,
    CheckCircle2,
    Coins,
    Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DeckData {
    id: string;
    name: string;
    category: string | null;
    totalCards: number;
    studiedCards: number;
    progress: number;
    sessionsCount: number;
    createdAt: string;
    updatedAt: string;
}

interface DecksResponse {
    decks: DeckData[];
    stats: {
        totalDecks: number;
        totalCards: number;
        totalStudied: number;
        totalSessions: number;
        progressPercentage: number;
    };
}

interface ProgressResponse {
    canGenerate: boolean;
    profileComplete: boolean;
    resumeCount: number;
    jobApplicationCount: number;
    stats: {
        totalDecks: number;
        totalCards: number;
        totalStudied: number;
        progressPercentage: number;
        totalSessions: number;
        totalMinutes: number;
        streak: number;
    };
}

const GENERATION_STEPS = [
    "Analyzing your CV/resume...",
    "Reviewing job description...",
    "Identifying key skills & requirements...",
    "Generating interview questions...",
    "Creating model STAR answers...",
    "Finalizing flashcards...",
];

export default function InterviewPrepPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { t, locale } = useLanguage();
    const { credits, isLoading: creditsLoading } = useCredits();

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [generationStep, setGenerationStep] = useState(0);
    const [renameOpen, setRenameOpen] = useState<string | null>(null);
    const [newName, setNewName] = useState("");
    const [deleteOpen, setDeleteOpen] = useState<string | null>(null);

    useSetPageMetadata({
        title: "Interview Prep",
        description: "AI-powered flashcards for job interview preparation",
        breadcrumbs: [
            { label: "Interview Prep" },
        ],
    });

    const { data: decksData, isLoading: decksLoading } = useQuery<DecksResponse>({
        queryKey: ["mock-interview-decks"],
        queryFn: () => api.get("/api/mock-interview/decks"),
    });

    const { data: progressData, isLoading: progressLoading } = useQuery<ProgressResponse>({
        queryKey: ["mock-interview-progress"],
        queryFn: () => api.get("/api/mock-interview/progress"),
    });

    const generateMutation = useMutation({
        mutationFn: () => api.post<{ flashcardsCount: number }>("/api/mock-interview/decks", { language: locale }),
        onSuccess: (data) => {
            setGenerating(false);
            setConfirmOpen(false);
            queryClient.invalidateQueries({ queryKey: ["mock-interview-decks"] });
            queryClient.invalidateQueries({ queryKey: ["mock-interview-progress"] });
            queryClient.invalidateQueries({ queryKey: ["credits"] });
            toast({
                title: "Deck created!",
                description: `${data.flashcardsCount} flashcards ready for study.`,
            });
        },
        onError: (error: Error) => {
            setGenerating(false);
            toast({
                title: "Error generating deck",
                description: error.message || "Please try again.",
                variant: "destructive",
            });
        },
    });

    const renameMutation = useMutation({
        mutationFn: ({ id, name }: { id: string; name: string }) =>
            api.patch(`/api/mock-interview/decks/${id}`, { name }),
        onSuccess: () => {
            setRenameOpen(null);
            queryClient.invalidateQueries({ queryKey: ["mock-interview-decks"] });
            toast({ title: "Deck renamed" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/api/mock-interview/decks/${id}`),
        onSuccess: () => {
            setDeleteOpen(null);
            queryClient.invalidateQueries({ queryKey: ["mock-interview-decks"] });
            queryClient.invalidateQueries({ queryKey: ["mock-interview-progress"] });
            toast({ title: "Deck removed" });
        },
    });

    const handleGenerate = () => {
        setConfirmOpen(false);
        setGenerating(true);
        setGenerationStep(0);

        const stepInterval = setInterval(() => {
            setGenerationStep((prev) => {
                if (prev < GENERATION_STEPS.length - 1) return prev + 1;
                return prev;
            });
        }, 8000);

        generateMutation.mutate(undefined, {
            onSettled: () => clearInterval(stepInterval),
        });
    };

    const canGenerate = progressData?.canGenerate ?? false;
    const hasCredits = (credits?.creditsRemaining ?? 0) >= 15;

    if (decksLoading || progressLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid gap-3 grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-24 rounded-2xl" />
                    ))}
                </div>
                <Skeleton className="h-48 rounded-2xl" />
            </div>
        );
    }

    if (generating) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-8">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div className="space-y-4 text-center">
                    {GENERATION_STEPS.map((step, i) => (
                        <div
                            key={i}
                            className={cn(
                                "flex items-center gap-3 transition-opacity duration-500",
                                i <= generationStep ? "opacity-100" : "opacity-30"
                            )}
                        >
                            {i < generationStep ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : i === generationStep ? (
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            ) : (
                                <div className="h-5 w-5 rounded-full border border-muted-foreground/30" />
                            )}
                            <span className="text-sm">{step}</span>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground">
                    This may take up to 60 seconds...
                </p>
            </div>
        );
    }

    const stats = progressData?.stats;
    const decks = decksData?.decks ?? [];

    return (
        <div className="space-y-6">
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                <div className="bg-card rounded-2xl border border-border p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-9 w-9 rounded-xl bg-purple-100 flex items-center justify-center">
                            <BookOpen className="h-4 w-4 text-purple-700" />
                        </div>
                        <span className="text-sm text-muted-foreground">Decks</span>
                    </div>
                    <p className="text-2xl font-bold">{stats?.totalDecks ?? 0}</p>
                </div>

                <div className="bg-card rounded-2xl border border-border p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-9 w-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                            <Target className="h-4 w-4 text-emerald-700" />
                        </div>
                        <span className="text-sm text-muted-foreground">Cards Studied</span>
                    </div>
                    <p className="text-2xl font-bold">
                        {stats?.totalStudied ?? 0}
                        <span className="text-base font-normal text-muted-foreground">
                            /{stats?.totalCards ?? 0}
                        </span>
                    </p>
                </div>

                <div className="bg-card rounded-2xl border border-border p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-9 w-9 rounded-xl bg-blue-100 flex items-center justify-center">
                            <Clock className="h-4 w-4 text-blue-700" />
                        </div>
                        <span className="text-sm text-muted-foreground">Practice Time</span>
                    </div>
                    <p className="text-2xl font-bold">~{stats?.totalMinutes ?? 0} min</p>
                </div>

                <div className="bg-card rounded-2xl border border-border p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-9 w-9 rounded-xl bg-orange-100 flex items-center justify-center">
                            <Flame className="h-4 w-4 text-orange-700" />
                        </div>
                        <span className="text-sm text-muted-foreground">Streak</span>
                    </div>
                    <p className="text-2xl font-bold">
                        {stats?.streak ?? 0}
                        <span className="text-base font-normal text-muted-foreground"> days</span>
                    </p>
                </div>
            </div>

            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl border border-primary/20 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-lg mb-1">Generate New Deck</h3>
                        <p className="text-sm text-muted-foreground">
                            AI-powered flashcards based on your CV and job description
                        </p>
                    </div>
                    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                        <DialogTrigger asChild>
                            <Button disabled={!canGenerate || !hasCredits}>
                                <Sparkles className="h-4 w-4" />
                                Generate Deck (15 credits)
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Confirm Generation</DialogTitle>
                                <DialogDescription>
                                    15 credits will be deducted to generate a new interview prep deck.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3 py-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Cost:</span>
                                    <Badge>15 credits</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Current balance:</span>
                                    <span className="flex items-center gap-1 font-medium">
                                        <Coins className="h-4 w-4 text-yellow-500" />
                                        {credits?.creditsRemaining ?? 0} credits
                                    </span>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleGenerate}>
                                    <Sparkles className="h-4 w-4" />
                                    Confirm
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
                {!canGenerate && (
                    <p className="text-sm text-red-500 mt-3">
                        Upload your CV and add a job description to unlock interview prep.
                    </p>
                )}
                {canGenerate && !hasCredits && (
                    <p className="text-sm text-red-500 mt-3">Insufficient credits.</p>
                )}
            </div>

            {decks.length > 0 ? (
                <div className="space-y-3">
                    <h3 className="font-semibold">Your Decks</h3>
                    {decks.map((deck) => (
                        <div
                            key={deck.id}
                            className="bg-card rounded-2xl border border-border p-5 flex items-center gap-5"
                        >
                            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                <Briefcase className="h-5 w-5 text-primary" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-semibold">{deck.name}</h4>
                                    <Badge variant="outline" className="text-xs">
                                        {deck.totalCards} cards
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-3 mt-1">
                                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-32">
                                        <div
                                            className="h-full bg-primary rounded-full transition-all"
                                            style={{ width: `${deck.progress}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {deck.progress}% studied
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    onClick={() => router.push(`/interview-prep/study/${deck.id}`)}
                                >
                                    <Play className="h-4 w-4" />
                                    Study
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => router.push(`/interview-prep/study/${deck.id}?mode=random`)}
                                >
                                    <Shuffle className="h-4 w-4" />
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button size="sm" variant="ghost">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            onClick={() => {
                                                setNewName(deck.name);
                                                setRenameOpen(deck.id);
                                            }}
                                        >
                                            <Pencil className="h-4 w-4 mr-2" />
                                            Rename
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => window.open(`/api/mock-interview/decks/${deck.id}/export`)}
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            Export
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="text-red-500"
                                            onClick={() => setDeleteOpen(deck.id)}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Remove
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-muted-foreground">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>No decks created yet.</p>
                    <p className="text-sm">Generate your first deck to start practicing for interviews.</p>
                </div>
            )}

            <Dialog open={!!renameOpen} onOpenChange={() => setRenameOpen(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Deck</DialogTitle>
                    </DialogHeader>
                    <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Deck name"
                    />
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setRenameOpen(null)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => renameOpen && renameMutation.mutate({ id: renameOpen, name: newName })}
                            disabled={renameMutation.isPending}
                        >
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteOpen} onOpenChange={() => setDeleteOpen(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remove Deck</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. Credits will not be refunded.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setDeleteOpen(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteOpen && deleteMutation.mutate(deleteOpen)}
                            disabled={deleteMutation.isPending}
                        >
                            Remove
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

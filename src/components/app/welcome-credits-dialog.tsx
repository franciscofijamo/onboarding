"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useProfile } from "@/hooks/use-profile";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle2, PartyPopper } from "lucide-react";
import { motion } from "framer-motion";

export function WelcomeCreditsDialog() {
    const { user, isLoaded } = useUser();
    const { isProfileComplete, isLoading: isLoadingProfile } = useProfile();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!isLoaded || !user || isLoadingProfile) return;

        if (!isProfileComplete) return;

        const createdAt = new Date(user.createdAt || 0);
        const now = new Date();
        const diffHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

        const hasSeen = localStorage.getItem("welcome-credits-seen");

        if (diffHours < 24 && !hasSeen) {
            const timer = setTimeout(() => {
                setOpen(true);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [isLoaded, user, isLoadingProfile, isProfileComplete]);

    const handleClose = (isOpen: boolean) => {
        if (!isOpen) {
            setOpen(false);
            localStorage.setItem("welcome-credits-seen", "true");
        }
    };

    const handleStart = () => {
        setOpen(false);
        localStorage.setItem("welcome-credits-seen", "true");
    };

    return (
        <Dialog open={open} onOpenChange={() => { }}>
            <DialogContent
                className="sm:max-w-md border-0 bg-transparent p-0 shadow-none overflow-hidden sm:rounded-2xl [&>button]:hidden"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">

                    {/* Decorative background gradients */}
                    {/* Decorative background gradients */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full pointer-events-none" />

                    <div className="relative flex flex-col items-center p-8 text-center pt-10">
                        {/* Animated Icon Container */}
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-amber-50 shadow-inner ring-1 ring-inset ring-amber-500/20"
                        >
                            <PartyPopper className="h-10 w-10 text-amber-600 relative z-10" />
                        </motion.div>

                        <DialogHeader className="mb-4 space-y-3">
                            <DialogTitle className="text-2xl font-bold tracking-tight text-zinc-900">
                                Bem-vindo(a) ao StandOut! <span className="inline-block animate-wave">👋</span>
                            </DialogTitle>
                            <div className="space-y-4">
                                <p className="text-zinc-500 leading-relaxed">
                                    Estamos felizes em tê-lo(a) conosco. Para celebrar o início da sua jornada rumo à bolsa dos seus sonhos, preparamos um presente especial para você.
                                </p>

                                {/* Credit Highlight Box */}
                                <div className="mx-auto flex flex-col items-center justify-center px-6 py-4 rounded-xl border-2 border-amber-400/60 bg-gradient-to-br from-amber-50 to-amber-100/50 shadow-sm">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-600/80 mb-1">
                                        Seu presente de boas-vindas
                                    </span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-extrabold text-amber-600">20</span>
                                        <span className="text-sm font-bold text-amber-700">Créditos Grátis</span>
                                    </div>
                                </div>
                            </div>
                        </DialogHeader>

                        <DialogFooter className="w-full mt-6 sm:justify-center">
                            <Button
                                onClick={handleStart}
                                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40 h-11 rounded-xl"
                            >
                                <Sparkles className="mr-2 h-4 w-4" />
                                Resgatar e Começar
                            </Button>
                        </DialogFooter>

                        <p className="mt-4 text-xs text-zinc-400">
                            Use seus créditos para gerar análises detalhadas de essays.
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

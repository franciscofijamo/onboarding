"use client";

import { AlertTriangle, X } from "lucide-react";
import { useAdminDevMode } from "@/contexts/admin-dev-mode";
import { Button } from "@/components/ui/button";

export function DevModeBanner() {
  const { devMode, setDevMode } = useAdminDevMode();

  if (!devMode) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex h-10 items-center justify-between gap-4 border-b border-amber-600/20 bg-amber-500 px-4 text-sm font-semibold text-amber-950 shadow-md ring-1 ring-inset ring-amber-600/10 dark:bg-amber-600 dark:text-amber-50">
      <div className="flex items-center gap-2.5">
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-950/10">
          <AlertTriangle className="h-3.5 w-3.5" />
        </div>
        <span className="tracking-tight">
          Você está visualizando o painel admin no <span className="font-extrabold uppercase tracking-tighter">modo de desenvolvimento</span>.
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded-full text-amber-950 hover:bg-amber-950/10 dark:text-amber-50 dark:hover:bg-white/10"
        onClick={() => setDevMode(false)}
        aria-label="Desativar modo de desenvolvimento"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

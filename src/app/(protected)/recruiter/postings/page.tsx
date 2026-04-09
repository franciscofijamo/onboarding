"use client";

import * as React from "react";
import { LayoutGrid, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSetPageMetadata } from "@/contexts/page-metadata";

export default function RecruiterPostingsPage() {
  useSetPageMetadata({
    title: "Publicações",
    description: "Gerencie as suas vagas publicadas",
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <LayoutGrid className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Publicações</h1>
            <p className="text-sm text-muted-foreground">Crie e gira as suas vagas de emprego.</p>
          </div>
        </div>
        <Button disabled className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Nova vaga
        </Button>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/30 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mb-4">
          <LayoutGrid className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Em desenvolvimento</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          A gestão completa de vagas estará disponível em breve. A funcionalidade de criação e publicação de vagas está a ser preparada.
        </p>
      </div>
    </div>
  );
}

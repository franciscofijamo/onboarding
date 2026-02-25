"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { XCircle, Loader2 } from "lucide-react";

interface CancelSubscriptionDialogProps {
  planName: string;
  effectiveUntil?: string;
  isCancellationScheduled?: boolean;
}

export function CancelSubscriptionDialog({
  planName,
  effectiveUntil,
  isCancellationScheduled,
}: CancelSubscriptionDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao cancelar assinatura");
      }

      toast.success("Assinatura cancelada", {
        description: `Você ainda terá acesso até ${data.effectiveUntil
          ? new Date(data.effectiveUntil).toLocaleDateString("pt-BR")
          : "o fim do período atual"
          }`,
      });

      queryClient.invalidateQueries({ queryKey: ["credits"] });
      setOpen(false);
    } catch (error) {
      toast.error("Erro ao cancelar", {
        description: error instanceof Error ? error.message : "Tente novamente",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCancellationScheduled) {
    return (
      <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
        <XCircle className="h-4 w-4" />
        <span>
          Cancelamento agendado para{" "}
          {effectiveUntil
            ? new Date(effectiveUntil).toLocaleDateString("pt-BR")
            : "o fim do período"}
        </span>
      </div>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="destructive"
          className="text-white hover:bg-red-700 border-0"
        >
          <XCircle className="h-4 w-4 mr-2 shrink-0" />
          Cancelar Assinatura
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar Assinatura</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Você está prestes a cancelar sua assinatura do plano{" "}
              <strong>{planName}</strong>.
            </p>
            <p>
              Você continuará tendo acesso a todos os recursos e créditos até{" "}
              <strong>
                {effectiveUntil
                  ? new Date(effectiveUntil).toLocaleDateString("pt-BR")
                  : "o fim do período atual"}
              </strong>
              . Após essa data, sua conta será revertida para o plano gratuito.
            </p>
            <p className="text-orange-600 dark:text-orange-400">
              Essa ação não pode ser desfeita automaticamente. Para reativar,
              você precisará assinar novamente.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Manter Assinatura</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleCancel();
            }}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cancelando...
              </>
            ) : (
              "Confirmar Cancelamento"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

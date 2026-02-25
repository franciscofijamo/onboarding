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
        throw new Error(data.error || "Error cancelling subscription");
      }

      toast.success("Subscription cancelled", {
        description: `You will still have access until ${data.effectiveUntil
          ? new Date(data.effectiveUntil).toLocaleDateString("en-US")
          : "the end of the current period"
          }`,
      });

      queryClient.invalidateQueries({ queryKey: ["credits"] });
      setOpen(false);
    } catch (error) {
      toast.error("Cancellation failed", {
        description: error instanceof Error ? error.message : "Please try again",
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
          Cancellation scheduled for{" "}
          {effectiveUntil
            ? new Date(effectiveUntil).toLocaleDateString("en-US")
            : "the end of the period"}
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
          Cancel Subscription
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              You are about to cancel your subscription to the{" "}
              <strong>{planName}</strong> plan.
            </p>
            <p>
              You will continue to have access to all features and credits until{" "}
              <strong>
                {effectiveUntil
                  ? new Date(effectiveUntil).toLocaleDateString("en-US")
                  : "the end of the current period"}
              </strong>
              . After that date, your account will revert to the free plan.
            </p>
            <p className="text-orange-600 dark:text-orange-400">
              This action cannot be automatically undone. To reactivate,
              you will need to subscribe again.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Keep Subscription</AlertDialogCancel>
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
                Cancelling...
              </>
            ) : (
              "Confirm Cancellation"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

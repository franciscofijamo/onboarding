"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useClerk } from "@clerk/nextjs";
import { useProfile } from "@/hooks/use-profile";

export default function RoleSelectPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useClerk();
  const { role, hasRole, isLoading } = useProfile();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const processingRef = React.useRef(false);

  React.useEffect(() => {
    if (isLoading) return;

    if (hasRole) {
      router.replace("/dashboard");
      return;
    }

    const autoSelectCandidate = async () => {
      if (processingRef.current) return;
      processingRef.current = true;
      setIsProcessing(true);
      
      try {
        await api.put("/api/role", { role: "CANDIDATE" });
        await session?.reload();
        await queryClient.invalidateQueries({ queryKey: ["profile"] });
        window.location.assign("/dashboard");
      } catch (error) {
        console.error("Failed to set default role:", error);
        setIsProcessing(false);
        processingRef.current = false;
      }
    };

    autoSelectCandidate();
  }, [hasRole, isLoading, router, session, queryClient]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Configurando o seu perfil...</p>
      </div>
    </div>
  );
}

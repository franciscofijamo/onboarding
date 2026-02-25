"use client";

import { AdminTopbar } from "@/components/admin/admin-topbar";
import { DevModeBanner } from "@/components/admin/dev-mode-banner";
import { useAdminDevMode } from "@/contexts/admin-dev-mode";
import { cn } from "@/lib/utils";

export function AdminChrome({ children }: { children: React.ReactNode }) {
  const { devMode } = useAdminDevMode();

  return (
    <div className="relative">
      <DevModeBanner />
      <div
        className={cn(
          "flex min-h-svh flex-col",
          devMode ? "pt-12" : ""
        )}
      >
        <AdminTopbar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="container mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

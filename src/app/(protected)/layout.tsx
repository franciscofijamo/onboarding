"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { PageHeader } from "@/components/app/page-header";
import { PageMetadataProvider } from "@/contexts/page-metadata";
import { useSubscription } from "@/hooks/use-subscription";
import { useProfile } from "@/hooks/use-profile";
import { ProfileCompletionModal } from "@/components/onboarding/profile-completion-modal";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);

  // Use TanStack Query for subscription status
  const { data: subscriptionStatus, isLoading: isLoadingSubscription } = useSubscription();

  // Profile completion check
  const { isProfileComplete, isLoading: isLoadingProfile, refetch: refetchProfile } = useProfile();
  const [showProfileModal, setShowProfileModal] = React.useState(false);

  // Show profile modal if not complete
  React.useEffect(() => {
    if (!isLoadingProfile && !isProfileComplete && isSignedIn) {
      setShowProfileModal(true);
    }
  }, [isLoadingProfile, isProfileComplete, isSignedIn]);

  const handleProfileComplete = () => {
    setShowProfileModal(false);
    refetchProfile();
  };

  // hydrate from localStorage
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("app.sidebarCollapsed");
    if (saved != null) setCollapsed(saved === "true");
  }, []);

  const toggleCollapse = React.useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("app.sidebarCollapsed", String(next));
      }
      return next;
    });
  }, []);

  // Redirect to sign-in if not authenticated
  React.useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  // Show loading state while checking authentication
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Authenticated layout with sidebar
  return (
    <PageMetadataProvider>
      <div className="min-h-dvh w-full text-foreground">
        <div className="flex">
          <Sidebar collapsed={collapsed} onToggle={toggleCollapse} />
          <div className="flex min-h-dvh flex-1 flex-col p-4">
            <Topbar onToggleSidebar={toggleCollapse} sidebarCollapsed={collapsed} />
            <main
              className={cn(
                "container mx-auto w-full max-w-[1400px] flex-1 pb-10 pt-6"
              )}
            >
              <PageHeader />
              {children}
            </main>
          </div>
        </div>
      </div>

      {/* Profile Completion Modal */}
      <ProfileCompletionModal
        open={showProfileModal}
        onComplete={handleProfileComplete}
      />
    </PageMetadataProvider>
  );
}

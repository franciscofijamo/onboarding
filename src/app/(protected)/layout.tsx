"use client";

import * as React from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import posthog from "posthog-js";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { PageHeader } from "@/components/app/page-header";
import { PageMetadataProvider } from "@/contexts/page-metadata";
import { useSubscription } from "@/hooks/use-subscription";
import { useProfile } from "@/hooks/use-profile";
import { ProfileCompletionModal } from "@/components/onboarding/profile-completion-modal";
import { PendingAnalysisHandler } from "@/components/app/pending-analysis-handler";

const ROLE_REDIRECT_EXEMPT_PATHS = ["/role-select", "/company/onboarding", "/company/profile"];
const CHROMELESS_PATHS = ["/role-select", "/company/onboarding"];

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  const { data: subscriptionStatus, isLoading: isLoadingSubscription } = useSubscription();

  const {
    isProfileComplete,
    isLoading: isLoadingProfile,
    role,
    hasRole,
    hasCompany,
    hasCompanyLogo,
    refetch: refetchProfile,
  } = useProfile();
  const [showProfileModal, setShowProfileModal] = React.useState(false);

  const isRoleExempt = ROLE_REDIRECT_EXEMPT_PATHS.some((p) => pathname.startsWith(p));
  const isChromeless = CHROMELESS_PATHS.some((p) => pathname.startsWith(p));

  // Redirect to role selection if signed in but role not yet chosen
  React.useEffect(() => {
    if (!isLoadingProfile && isSignedIn && !hasRole && !isRoleExempt) {
      router.replace('/role-select');
    }
  }, [isLoadingProfile, isSignedIn, hasRole, isRoleExempt, router]);

  // Redirect recruiters who haven't completed company onboarding
  React.useEffect(() => {
    if (!isLoadingProfile && isSignedIn && role === 'RECRUITER' && !hasCompany && !isRoleExempt) {
      router.replace('/company/onboarding');
    }
  }, [isLoadingProfile, isSignedIn, role, hasCompany, isRoleExempt, router]);

  React.useEffect(() => {
    if (!isLoadingProfile && isSignedIn && role === 'RECRUITER' && hasCompany && !hasCompanyLogo && !isRoleExempt) {
      router.replace('/company/profile');
    }
  }, [isLoadingProfile, isSignedIn, role, hasCompany, hasCompanyLogo, isRoleExempt, router]);

  // Show profile modal only for CANDIDATEs who haven't completed their profile
  React.useEffect(() => {
    if (!isLoadingProfile && !isProfileComplete && isSignedIn && role === 'CANDIDATE' && !isRoleExempt) {
      setShowProfileModal(true);
    }
  }, [isLoadingProfile, isProfileComplete, isSignedIn, role, isRoleExempt]);

  const handleProfileComplete = () => {
    setShowProfileModal(false);
    refetchProfile();
  };

  React.useEffect(() => {
    if (isSignedIn && userId && user) {
      posthog.identify(userId, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
      });
    }
  }, [isSignedIn, userId, user]);

  React.useEffect(() => {
    setMounted(true);
  }, []);

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

  React.useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!mounted || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isChromeless) {
    return (
      <PageMetadataProvider>
        <PendingAnalysisHandler />
        <div className="min-h-dvh w-full bg-background text-foreground">
          {children}
        </div>

        {role === 'CANDIDATE' && (
          <ProfileCompletionModal
            open={showProfileModal}
            onComplete={handleProfileComplete}
          />
        )}
      </PageMetadataProvider>
    );
  }

  return (
    <PageMetadataProvider>
      <PendingAnalysisHandler />
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

      {role === 'CANDIDATE' && (
        <ProfileCompletionModal
          open={showProfileModal}
          onComplete={handleProfileComplete}
        />
      )}
    </PageMetadataProvider>
  );
}

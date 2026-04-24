"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  CreditCard,
  Briefcase,
  MessageSquare,
  Mic,
  BrainCircuit,
  Building2,
  LayoutGrid,
  Users,
  Settings,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn, withAssetVersion } from "@/lib/utils";
import { site } from "@/lib/brand-config";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/language";
import { useProfile } from "@/hooks/use-profile";

type NavItem = {
  nameKey: string;
  hintKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
};

type CompanySidebarData = {
  company: {
    id: string;
    name: string;
    logoUrl: string | null;
    updatedAt: string;
  } | null;
};

export const candidateNavigationItems: NavItem[] = [
  { nameKey: "nav.dashboard", hintKey: "nav.dashboard", href: "/dashboard", icon: Home },
  { nameKey: "nav.jobBoard", hintKey: "nav.jobBoard", href: "/jobs", icon: LayoutGrid },
  { nameKey: "nav.applications", hintKey: "nav.applications", href: "/applications", icon: Briefcase },
  { nameKey: "nav.interviewPrep", hintKey: "nav.interviewPrep", href: "/interview-prep", icon: MessageSquare, disabled: true },
  { nameKey: "nav.scenarios", hintKey: "nav.scenarios", href: "/scenarios", icon: Mic },
  { nameKey: "nav.aiCoach", hintKey: "nav.aiCoach", href: "/ai-chat", icon: BrainCircuit, disabled: true },
  { nameKey: "nav.billing", hintKey: "nav.billing", href: "/billing", icon: CreditCard },
  { nameKey: "nav.settings", hintKey: "nav.settings", href: "/settings/profile", icon: Settings },
];

export const recruiterNavigationItems: NavItem[] = [
  { nameKey: "nav.dashboard", hintKey: "nav.dashboard", href: "/dashboard", icon: Home },
  { nameKey: "nav.jobBoard", hintKey: "nav.jobBoard", href: "/jobs", icon: Briefcase },
  { nameKey: "nav.recruiterPostings", hintKey: "nav.recruiterPostings", href: "/recruiter/postings", icon: LayoutGrid },
  { nameKey: "nav.candidates", hintKey: "nav.candidates", href: "/recruiter/candidates", icon: Users, disabled: true },
  { nameKey: "nav.companyProfile", hintKey: "nav.companyProfile", href: "/company/profile", icon: Building2 },
  { nameKey: "nav.billing", hintKey: "nav.billing", href: "/billing", icon: CreditCard },
  { nameKey: "nav.settings", hintKey: "nav.settings", href: "/settings/profile", icon: Settings },
];

export const navigationItems = candidateNavigationItems;

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { role, hasCompanyLogo } = useProfile();
  const [imageError, setImageError] = React.useState(false);

  const items = role === "RECRUITER" ? recruiterNavigationItems : candidateNavigationItems;
  const { data: companyData } = useQuery<CompanySidebarData>({
    queryKey: ["company-profile"],
    queryFn: () => api.get("/api/company/profile"),
    enabled: role === "RECRUITER",
    staleTime: 5 * 60_000,
  });

  const companyName = companyData?.company?.name || t("nav.companyProfile");
  const companyLogoUrl = companyData?.company?.logoUrl || null;
  const companyLogoSrc = withAssetVersion(companyLogoUrl, companyData?.company?.updatedAt);
  const companyNeedsLogo = role === "RECRUITER" && !hasCompanyLogo;
  const headerHref = role === "RECRUITER" ? "/company/profile" : "/";
  const headerLabel = role === "RECRUITER" ? companyName : site.name;
  const companyInitial = companyName.trim().charAt(0).toUpperCase() || "C";

  React.useEffect(() => {
    setImageError(false);
  }, [companyLogoSrc]);

  return (
    <aside
      className={cn(
        "relative z-30 hidden md:flex md:flex-col border-r border-border/40 bg-card/30 text-card-foreground backdrop-blur-xl supports-[backdrop-filter]:bg-card/20 glass-panel transition-[width] duration-200 ease-in-out",
        collapsed ? "w-[64px]" : "w-64",
        "my-4 md:sticky md:top-4 md:h-[calc(100vh-2rem)] md:max-h-[calc(100vh-2rem)] md:overflow-hidden"
      )}
      aria-label={t("nav.mainSidebar")}
    >
      <div className="flex h-14 items-center gap-2 px-3">
        <Link href={headerHref} className="flex min-w-0 items-center gap-2">
          <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-primary text-primary-foreground">
            {companyLogoSrc && !imageError ? (
              <img
                src={companyLogoSrc}
                alt={companyName}
                className="h-full w-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : role === "RECRUITER" ? (
              <span className="text-sm font-semibold text-white">{companyInitial}</span>
            ) : (
              <>
                {site.logo.dark && (
                  <img
                    src={site.logo.dark}
                    alt={site.name}
                    className="hidden h-5 w-5 object-contain dark:block"
                  />
                )}
                {site.logo.light && (
                  <img
                    src={site.logo.light}
                    alt={site.name}
                    className="h-5 w-5 object-contain dark:hidden"
                  />
                )}
              </>
            )}
            {companyNeedsLogo && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
            )}
          </div>
          {!collapsed && (
            <span className="truncate text-lg font-semibold">{headerLabel}</span>
          )}
        </Link>
        <div className="ml-auto">
          <Button
            variant="ghost"
            size="icon"
            aria-label={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
            onClick={onToggle}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1 min-h-0">
        <nav className="flex flex-col gap-1 p-2" aria-label={t("nav.mainNav")}>
          {items.map((item) => {
            const isActive = !item.disabled && pathname === item.href;
            const label = t(item.nameKey);
            const showComingSoon = Boolean(item.disabled);
            const showRequired = role === "RECRUITER" && item.href === "/company/profile" && companyNeedsLogo;
            const itemContent = (
              <>
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                    <span className="min-w-0 truncate">{label}</span>
                    {showRequired ? (
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" aria-hidden="true" />
                    ) : showComingSoon ? (
                      <span className="rounded bg-gradient-to-br from-amber-500/10 to-orange-500/10 px-1.5 py-[2px] text-xs font-medium uppercase tracking-widest text-amber-600 ring-1 ring-inset ring-amber-500/20 shadow-sm">
                        {t("dashboard.soonBadge")}
                      </span>
                    ) : null}
                  </div>
                )}
              </>
            );

            const itemClassName = cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              collapsed && "justify-center",
              item.disabled
                ? "cursor-not-allowed opacity-60"
                : isActive
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent hover:text-accent-foreground"
            );

            const link = item.disabled ? (
              <div
                key={item.nameKey}
                aria-label={collapsed ? `${label} (${t("dashboard.soonBadge")})` : undefined}
                aria-disabled="true"
                className={itemClassName}
              >
                {itemContent}
              </div>
            ) : (
              <Link
                key={item.nameKey}
                href={item.href}
                aria-label={collapsed ? label : undefined}
                className={itemClassName}
              >
                {itemContent}
              </Link>
            );

            if (!collapsed) return link;

            return (
              <Tooltip key={item.nameKey}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right" align="center">
                  <div className="flex flex-col">
                    <span>{label}</span>
                    {showRequired ? (
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden="true" />
                    ) : showComingSoon ? (
                      <span className="mt-1 inline-block w-fit rounded bg-amber-500/10 px-1 py-[1px] text-[8px] font-medium uppercase tracking-widest text-amber-600 ring-1 ring-inset ring-amber-500/20">
                        {t("dashboard.soonBadge")}
                      </span>
                    ) : null}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}

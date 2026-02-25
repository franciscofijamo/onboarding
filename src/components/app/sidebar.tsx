"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  CreditCard,
  Settings,
  GraduationCap,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/language";

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export const navigationItems = [
  { nameKey: "nav.dashboard", href: "/dashboard", icon: Home },
  { nameKey: "nav.chevening", href: "/chevening", icon: GraduationCap },
  { nameKey: "nav.fulbright", href: "/fulbright", icon: Globe },
  { nameKey: "nav.billing", href: "/billing", icon: CreditCard },
 ];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useLanguage();

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
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Settings className="h-5 w-5" />
          </div>
          {!collapsed && (
            <span className="text-lg font-semibold">StandOut</span>
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
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            const label = t(item.nameKey);
            const link = (
              <Link
                key={item.nameKey}
                href={item.href}
                aria-label={collapsed ? label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  collapsed && "justify-center",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {!collapsed && <span>{label}</span>}
              </Link>
            );

            if (!collapsed) return link;

            return (
              <Tooltip key={item.nameKey}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right" align="center">
                  {label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}

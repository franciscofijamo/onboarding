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
  Briefcase,
  MessageSquare,
  Mic,
  BrainCircuit,
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
  { nameKey: "nav.dashboard", hintKey: "nav.dashboard", href: "/dashboard", icon: Home },
  { nameKey: "nav.applications", hintKey: "nav.applications", href: "/applications", icon: Briefcase },
  { nameKey: "nav.interviewPrep", hintKey: "nav.interviewPrep", href: "/interview-prep", icon: MessageSquare, disabled: true },
  { nameKey: "nav.scenarios", hintKey: "nav.scenarios", href: "/scenarios", icon: Mic },
  { nameKey: "nav.aiCoach", hintKey: "nav.aiCoach", href: "/ai-chat", icon: BrainCircuit, disabled: true },
  { nameKey: "nav.billing", hintKey: "nav.billing", href: "/billing", icon: CreditCard },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { t, hint } = useLanguage();

  return (
    <aside
      className={cn(
        "relative z-30 hidden md:flex md:flex-col border-r border-border/40 bg-card/30 text-card-foreground backdrop-blur-xl supports-[backdrop-filter]:bg-card/20 glass-panel transition-[width] duration-200 ease-in-out",
        collapsed ? "w-[64px]" : "w-64",
        "my-4 md:sticky md:top-4 md:h-[calc(100vh-2rem)] md:max-h-[calc(100vh-2rem)] md:overflow-hidden"
      )}
      aria-label="Main sidebar"
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
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={onToggle}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1 min-h-0">
        <nav className="flex flex-col gap-1 p-2" aria-label="Main navigation">
          {navigationItems.map((item) => {
            const isActive = !item.disabled && pathname === item.href;
            const label = t(item.nameKey);
            const ptHint = hint(item.hintKey);
            const showComingSoon = Boolean(item.disabled);
            const itemContent = (
              <>
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-col">
                      <span>{label}</span>
                      {ptHint && ptHint !== label && (
                        <span className="text-[10px] leading-tight text-muted-foreground/60">{ptHint}</span>
                      )}
                    </div>
                    {showComingSoon && (
                      <span className="rounded bg-gradient-to-br from-amber-500/10 to-orange-500/10 px-1.5 py-[2px] text-[9px] font-medium uppercase tracking-widest text-amber-600 ring-1 ring-inset ring-amber-500/20 shadow-sm">
                        Soon
                      </span>
                    )}
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
                aria-label={collapsed ? label + " (Coming soon)" : undefined}
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
                    {ptHint && ptHint !== label && (
                      <span className="text-[10px] text-muted-foreground">{ptHint}</span>
                    )}
                    {showComingSoon && (
                      <span className="mt-1 inline-block w-fit rounded bg-amber-500/10 px-1 py-[1px] text-[8px] font-medium uppercase tracking-widest text-amber-600 ring-1 ring-inset ring-amber-500/20">
                        Soon
                      </span>
                    )}
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

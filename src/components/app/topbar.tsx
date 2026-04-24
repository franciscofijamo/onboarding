"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { AccountMenu } from "@/components/auth/account-menu";

import { Menu } from "lucide-react";
import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import { CreditStatus } from "@/components/credits/credit-status";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose, SheetFooter } from "@/components/ui/sheet";
import { candidateNavigationItems, recruiterNavigationItems } from "@/components/app/sidebar";
import { useLanguage } from "@/contexts/language";
import { useProfile } from "@/hooks/use-profile";
import { NotificationBell } from "@/components/app/notification-bell";

type TopbarProps = {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
};

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const { t } = useLanguage();
  const { role } = useProfile();
  const navigationItems = role === "RECRUITER" ? recruiterNavigationItems : candidateNavigationItems;

  return (
    <header
      className={cn(
        "sticky top-0 z-20 w-full border-b border-border/40 bg-background/30 backdrop-blur-xl supports-[backdrop-filter]:bg-background/20 glass-panel"
      )}
      role="banner"
    >
      <div className="glow-separator w-full" aria-hidden="true" />
      <div className="flex h-14 items-center gap-2 px-3 md:px-4">
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("topbar.openMenu")}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 md:hidden">
              <SheetHeader className="p-4 text-left">
                <div className="flex items-center justify-between">
                  <SheetTitle>StandOut</SheetTitle>
                </div>
              </SheetHeader>
              <nav className="flex flex-col gap-1 p-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon as React.ComponentType<{ className?: string }>;
                  return (
                    <SheetClose asChild key={item.nameKey}>
                      {item.disabled ? (
                        <div
                          aria-disabled="true"
                          className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium opacity-60 cursor-not-allowed"
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="h-4 w-4" />
                            <span>{t(item.nameKey)}</span>
                          </div>
                          <span className="rounded bg-gradient-to-br from-amber-500/10 to-orange-500/10 px-1.5 py-[2px] text-xs font-medium uppercase tracking-widest text-amber-600 ring-1 ring-inset ring-amber-500/20 shadow-sm">
                            {t("dashboard.soonBadge")}
                          </span>
                        </div>
                      ) : (
                        <Link
                          href={item.href}
                          className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="h-4 w-4" />
                            <span>{t(item.nameKey)}</span>
                          </div>
                        </Link>
                      )}
                    </SheetClose>
                  );
                })}
              </nav>
              <SheetFooter className="mt-auto p-4">
                <div className="flex w-full items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <SignedIn>
                      <div className="flex items-center gap-3">
                        <AccountMenu afterSignOutUrl="/" />
                        <CreditStatus />
                      </div>
                    </SignedIn>
                    <SignedOut>
                      <div className="flex items-center gap-2">
                        <SignInButton mode="modal">
                          <Button variant="ghost" size="sm">{t("marketing.signIn")}</Button>
                        </SignInButton>
                        <SignUpButton mode="modal">
                          <Button size="sm">{t("marketing.register")}</Button>
                        </SignUpButton>
                      </div>
                    </SignedOut>
                  </div>

                </div>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>

        <Link href="/" className="flex items-center gap-2 md:hidden">
          <div className="h-6 w-6 rounded bg-primary" />
          <span className="text-sm font-semibold">StandOut</span>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("marketing.toggleSidebar")}
            onClick={onToggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <SignedIn>
            <NotificationBell />
            <CreditStatus />
            <Separator orientation="vertical" className="h-6" />
          </SignedIn>

          <SignedIn>
            <AccountMenu />
          </SignedIn>

          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm">{t("marketing.signIn")}</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm">{t("marketing.register")}</Button>
            </SignUpButton>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}

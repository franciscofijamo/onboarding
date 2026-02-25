"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { Menu } from "lucide-react";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { CreditStatus } from "@/components/credits/credit-status";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose, SheetFooter } from "@/components/ui/sheet";
import { navigationItems } from "@/components/app/sidebar";
import { LanguageSwitcher } from "@/components/app/language-switcher";
import { useLanguage } from "@/contexts/language";

type TopbarProps = {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
};

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const { t } = useLanguage();
  return (
    <header
      className={cn(
        "sticky top-0 z-20 w-full border-b border-border/40 bg-background/30 backdrop-blur-xl supports-[backdrop-filter]:bg-background/20 glass-panel"
      )}
      role="banner"
    >
      <div className="glow-separator w-full" aria-hidden="true" />
      <div className="flex h-14 items-center gap-2 px-3 md:px-4">
        {/* Mobile menu button */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Abrir menu"
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
                      <Link
                        href={item.href}
                        className={"flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{t(item.nameKey)}</span>
                      </Link>
                    </SheetClose>
                  );
                })}
              </nav>
              <SheetFooter className="mt-auto p-4">
                <div className="flex w-full items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <SignedIn>
                      <div className="flex items-center gap-3">
                        <UserButton afterSignOutUrl="/" />
                        <CreditStatus />
                      </div>
                    </SignedIn>
                    <SignedOut>
                      <div className="flex items-center gap-2">
                        <SignInButton mode="modal">
                          <Button variant="ghost" size="sm">{t("topbar.signIn") || "Sign In"}</Button>
                        </SignInButton>
                        <SignUpButton mode="modal">
                          <Button size="sm">{t("topbar.signUp") || "Sign Up"}</Button>
                        </SignUpButton>
                      </div>
                    </SignedOut>
                  </div>

                </div>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>

        {/* Brand (mobile) */}
        <Link href="/" className="flex items-center gap-2 md:hidden">
          <div className="h-6 w-6 rounded bg-primary" />
          <span className="text-sm font-semibold">StandOut</span>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Alternar barra lateral"
            onClick={onToggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          <SignedIn>
            <CreditStatus />
            <Separator orientation="vertical" className="h-6" />
          </SignedIn>

          <LanguageSwitcher />


          <SignedIn>
            <UserButton />
          </SignedIn>

          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm">
                {t("topbar.signIn") || "Sign In"}
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm">
                {t("topbar.signUp") || "Sign Up"}
              </Button>
            </SignUpButton>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}

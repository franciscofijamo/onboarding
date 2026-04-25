"use client";

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { cn } from '@/lib/utils'
import { site } from '@/lib/brand-config'
import { Button } from '@/components/ui/button'
import { Briefcase, Menu, X } from 'lucide-react'
import { useLanguage } from '@/contexts/language'

export function PublicHeader() {
  const [isScrolled, setIsScrolled] = React.useState(false)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const pathname = usePathname()
  const { isSignedIn, isLoaded } = useAuth()
  const { t } = useLanguage()

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  React.useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  const isJobsActive = site.features.jobBoard && pathname.startsWith('/jobs')

  return (
    <header>
      <nav className="fixed z-20 w-full">
        <div
          className={cn(
            "mx-auto mt-2 max-w-7xl px-4 transition-all duration-300 sm:px-6 lg:px-10",
            isScrolled && "bg-background/85 border-y border-border/70 backdrop-blur-lg"
          )}
        >
          <div className="flex items-center justify-between py-3 lg:py-4">
            <Link
              href="/"
              aria-label={site.shortName}
              className="flex items-center space-x-2 shrink-0"
            >
              <Logo />
            </Link>

            <div className="hidden sm:flex items-center gap-6">
              {site.features.jobBoard ? (
                <Link
                  href="/jobs"
                  className={cn(
                    "flex items-center gap-1.5 text-sm font-medium transition-colors",
                    isJobsActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Briefcase className="h-3.5 w-3.5" />
                  {t("nav.jobBoard")}
                </Link>
              ) : null}
              {isLoaded && (
                isSignedIn ? (
                  <Button asChild variant="outline" size="sm" className="rounded-xl">
                    <Link href="/dashboard">{t("marketing.enterApp")}</Link>
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button asChild variant="ghost" size="sm" className="rounded-xl">
                      <Link href="/sign-in">{t("marketing.signIn")}</Link>
                    </Button>
                    <Button asChild size="sm" className="rounded-xl">
                      <Link href="/sign-up">{t("marketing.register")}</Link>
                    </Button>
                  </div>
                )
              )}
            </div>

            <button
              className="sm:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? t("marketing.closeMenu") : t("marketing.openMenu")}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {menuOpen && (
            <div className="sm:hidden pb-4 space-y-2 border-t border-border pt-3">
              {site.features.jobBoard ? (
                <Link
                  href="/jobs"
                  className={cn(
                    "flex items-center gap-2 px-2 py-2 rounded-xl text-sm font-medium transition-colors",
                    isJobsActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <Briefcase className="h-4 w-4" />
                  {t("nav.jobBoard")}
                </Link>
              ) : null}
              {isLoaded && (
                isSignedIn ? (
                  <Button asChild variant="outline" className="w-full rounded-xl">
                    <Link href="/dashboard">{t("marketing.enterApp")}</Link>
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Button asChild variant="outline" className="w-full rounded-xl">
                      <Link href="/sign-in">{t("marketing.signIn")}</Link>
                    </Button>
                    <Button asChild className="w-full rounded-xl">
                      <Link href="/sign-up">{t("marketing.register")}</Link>
                    </Button>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </nav>
    </header>
  )
}

const Logo = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 220 80"
      className={cn("h-7 w-auto", className)}
    >
      <text
        x="0"
        y="60"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
        fontSize="48"
        fontWeight="800"
        fill="currentColor"
        letterSpacing="-1"
      >
        StandOut
      </text>
    </svg>
  )
}

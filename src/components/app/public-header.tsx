"use client";

import React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { site } from '@/lib/brand-config'

export function PublicHeader() {
  const [isScrolled, setIsScrolled] = React.useState(false)

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header>
      <nav className="fixed z-20 w-full px-2">
        <div className={cn('mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12', isScrolled && 'bg-background/50 max-w-4xl rounded-2xl border backdrop-blur-lg lg:px-5')}>
          <div className="flex items-center justify-center py-3 lg:py-4">
            <Link
              href="/"
              aria-label={site.shortName}
              className="flex items-center space-x-2">
              <Logo />
            </Link>
          </div>
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

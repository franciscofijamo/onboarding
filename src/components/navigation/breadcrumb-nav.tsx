"use client"

import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import React from "react"

export function BreadcrumbNav() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)
  const isIdSegment = (segment: string) => segment.length >= 12 && /^[a-z0-9]+$/i.test(segment)

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1 text-sm text-muted-foreground">
      <Link href="/dashboard" className="hover:text-foreground transition-colors">
        Home
      </Link>
      {segments.length > 0 && segments[0] !== "home" && (
        <>
          {segments.reduce((acc, segment, index) => {
            if (isIdSegment(segment)) {
              acc.hasId = true
              acc.items.push(
                <React.Fragment key={segment}>
                  <ChevronRight className="h-4 w-4" />
                  <span className="text-foreground font-medium">Detalhes</span>
                </React.Fragment>
              )
              return acc
            }

            const href = acc.hasId ? undefined : `/${segments.slice(0, index + 1).join("/")}`
            const isLast = index === segments.length - 1
            const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ")

            acc.items.push(
              <React.Fragment key={segment}>
                <ChevronRight className="h-4 w-4" />
                {isLast || !href ? (
                  <span className="text-foreground font-medium">{label}</span>
                ) : (
                  <Link href={href} className="hover:text-foreground transition-colors">
                    {label}
                  </Link>
                )}
              </React.Fragment>
            )

            return acc
          }, { hasId: false, items: [] as React.ReactNode[] }).items}
        </>
      )}
    </nav>
  )
}
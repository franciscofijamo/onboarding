"use client";
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnimatedGroup } from '@/components/ui/animated-group'
import { useLanguage } from "@/contexts/language"

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: 'blur(12px)',
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: {
        type: 'spring' as const,
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
} as const

export function Hero() {
  const { t } = useLanguage();
  return (
    <>
      <main className="overflow-hidden">
        <div
          aria-hidden
          className="z-[2] absolute inset-0 pointer-events-none isolate opacity-50 contain-strict hidden lg:block">
          <div className="w-[35rem] h-[80rem] -translate-y-[350px] absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]" />
          <div className="h-[80rem] absolute left-0 top-0 w-56 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
          <div className="h-[80rem] -translate-y-[350px] absolute left-0 top-0 w-56 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]" />
        </div>
        <section>
          <div className="relative pt-24 md:pt-36">
            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: {
                      delayChildren: 1,
                    },
                  },
                },
                item: {
                  hidden: {
                    opacity: 0,
                    y: 20,
                  },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      type: 'spring' as const,
                      bounce: 0.3,
                      duration: 2,
                    },
                  },
                },
              }}
              className="absolute inset-0 -z-20">
              <div className="absolute inset-x-0 top-56 -z-20 hidden lg:top-32 lg:block">
                <div className="mx-auto h-[32rem] max-w-5xl rounded-full bg-[radial-gradient(75%_60%_at_50%_40%,rgba(161,161,170,0.14),rgba(39,39,42,0))] dark:bg-[radial-gradient(75%_60%_at_50%_40%,rgba(113,113,122,0.18),rgba(24,24,27,0))]" />
              </div>
            </AnimatedGroup>
            <div aria-hidden className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--background)_75%)]" />
            <div className="mx-auto max-w-7xl px-6">
              <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
                <AnimatedGroup variants={transitionVariants}>
                  <Link
                    href="#features"
                    className="group mx-auto flex w-fit items-center gap-3 rounded-full bg-gradient-to-r from-blue-600/10 via-primary/5 to-emerald-600/10 border border-border/80 px-4 py-1.5 shadow-[0_2px_15px_-3px_rgba(59,130,246,0.1)] backdrop-blur-md transition-all duration-300 hover:border-primary/30 hover:shadow-[0_4px_20px_-3px_rgba(59,130,246,0.15)]">
                    <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-sm font-medium text-transparent">{t("marketing.heroTagline")}</span>
                    <span className="block h-4 w-px bg-border"></span>

                    <span className="flex items-center gap-1 rounded-full bg-background/50 px-2.5 py-0.5 text-xs font-semibold text-primary transition-colors group-hover:bg-primary/10">
                      Explore
                      <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>

                  <h1 className="mt-8 font-bold max-w-4xl mx-auto text-balance text-6xl md:text-7xl lg:mt-16 xl:text-[5.25rem]">
                    {t("marketing.heroTitle")}
                  </h1>
                  <p className="mx-auto mt-8 max-w-2xl text-balance text-lg">
                    {t("marketing.heroDescription")}
                  </p>
                </AnimatedGroup>

                <AnimatedGroup
                  variants={{
                    container: {
                      visible: {
                        transition: {
                          staggerChildren: 0.05,
                          delayChildren: 0.75,
                        },
                      },
                    },
                    ...transitionVariants,
                  }}
                  className="mt-12 flex flex-col items-center justify-center gap-2 md:flex-row">
                  <div
                    key={1}
                    className="bg-foreground/10 rounded-[14px] border p-0.5">
                    <Button
                      asChild
                      size="lg"
                      className="rounded-xl px-5 text-base">
                      <Link href="/sign-up">
                        <span className="text-nowrap">{t("marketing.createAccount")}</span>
                      </Link>
                    </Button>
                  </div>
                  <Button
                    key={2}
                    asChild
                    size="lg"
                    variant="ghost"
                    className="h-10.5 rounded-xl px-5">
                    <Link href="#pricing">
                      <span className="text-nowrap">{t("marketing.viewPricing")}</span>
                    </Link>
                  </Button>
                </AnimatedGroup>
              </div>
            </div>

            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: {
                      staggerChildren: 0.05,
                      delayChildren: 0.75,
                    },
                  },
                },
                ...transitionVariants,
              }}>
              <div className="relative -mr-56 mt-8 overflow-hidden px-2 sm:mr-0 sm:mt-12 md:mt-20">
                <div
                  aria-hidden
                  className="bg-gradient-to-b to-background absolute inset-0 z-10 from-transparent from-35%"
                />
                <div className="inset-shadow-2xs ring-background dark:inset-shadow-white/20 bg-background relative mx-auto max-w-6xl overflow-hidden rounded-2xl border p-4 shadow-lg shadow-zinc-950/15 ring-1">
                  <Image
                    className="z-2 border-border/25 dark:border-white/10 aspect-15/8 relative rounded-2xl border"
                    src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=2700&auto=format&fit=crop"
                    alt="StandOut platform preview"
                    width={2700}
                    height={1440}
                  />
                </div>
              </div>
            </AnimatedGroup>
          </div>
        </section>
      </main>
    </>
  )
}

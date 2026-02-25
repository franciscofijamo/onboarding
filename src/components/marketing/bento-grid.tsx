"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { FileText, Mic, BookOpen, Bot, BarChart2, MessageCircle, Upload, Briefcase, Target, Globe, Sparkles, Users } from "lucide-react"
import { GlowingEffect } from "@/components/ui/glowing-effect"
import { useLanguage } from "@/contexts/language"

export function BentoGrid() {
  const items = [
    { icon: <FileText className="h-4 w-4 text-sky-500" />, title: "CV Analysis", description: "Compare your CV against job descriptions with detailed fit scoring." },
    { icon: <Target className="h-4 w-4 text-emerald-500" />, title: "Skills Matching", description: "Identify gaps and get recommendations to improve your profile." },
    { icon: <BookOpen className="h-4 w-4 text-purple-500" />, title: "Interview Preparation", description: "AI-generated flashcards with questions tailored to your role." },
    { icon: <Mic className="h-4 w-4 text-blue-500" />, title: "Workplace Scenarios", description: "Audio simulations of meetings, presentations, and client calls." },
    { icon: <Bot className="h-4 w-4 text-orange-500" />, title: "AI Career Coach", description: "Personalized advice and Business English coaching." },
    { icon: <Globe className="h-4 w-4 text-red-500" />, title: "Business English", description: "Professional vocabulary, email writing, and meeting etiquette." },
    { icon: <Upload className="h-4 w-4 text-green-500" />, title: "Document Upload", description: "Upload your CV and cover letter for comprehensive analysis." },
    { icon: <Briefcase className="h-4 w-4 text-violet-500" />, title: "Professional Profile", description: "Build your career profile with AI to maximize opportunities." },
    { icon: <BarChart2 className="h-4 w-4 text-indigo-500" />, title: "Progress Tracking", description: "Track your improvement and identify areas for growth." },
    { icon: <Sparkles className="h-4 w-4 text-teal-500" />, title: "Smart Recommendations", description: "Personalized suggestions based on your profile and goals." },
    { icon: <MessageCircle className="h-4 w-4 text-yellow-500" />, title: "AI Chat", description: "Chat with the AI coach for career and Business English questions." },
    { icon: <Users className="h-4 w-4 text-amber-500" />, title: "Interview Simulations", description: "Practice with realistic scenarios and get detailed feedback." },
  ];

  const gridAreas = [
    "md:[grid-area:1/1/2/2]",
    "md:[grid-area:1/2/2/3]",
    "md:[grid-area:1/3/2/4]",
    "md:[grid-area:2/1/3/2]",
    "md:[grid-area:2/2/3/3]",
    "md:[grid-area:2/3/3/4]",
    "md:[grid-area:3/1/4/2]",
    "md:[grid-area:3/2/4/3]",
    "md:[grid-area:3/3/4/4]",
    "md:[grid-area:4/1/5/2]",
    "md:[grid-area:4/2/5/3]",
    "md:[grid-area:4/3/5/4]",
  ];

  return (
    <ul className="grid grid-cols-1 grid-rows-none gap-4 md:grid-cols-3 md:grid-rows-4 lg:gap-4">
      {items.map((item, index) => (
        <GridItem
          key={item.title}
          area={gridAreas[index]}
          icon={item.icon}
          title={item.title}
          description={item.description}
        />
      ))}
    </ul>
  )
}

interface GridItemProps {
  area: string
  icon: React.ReactNode
  title: string
  description: React.ReactNode
}

const GridItem = ({ area, icon, title, description }: GridItemProps) => {
  return (
    <li className={cn("min-h-[14rem] list-none", area)}>
      <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-border p-2 md:rounded-[1.5rem] md:p-3">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
          borderWidth={3}
        />
        <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl border-[0.75px] bg-background p-6 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)] md:p-6">
          <div className="relative flex flex-1 flex-col justify-between gap-3">
            <div className="w-fit rounded-lg border-[0.75px] border-border bg-muted p-2">
              {icon}
            </div>
            <div className="space-y-3">
              <h3 className="pt-0.5 text-xl leading-[1.375rem] font-semibold font-sans tracking-[-0.04em] md:text-2xl md:leading-[1.875rem] text-balance text-foreground">
                {title}
              </h3>
              <h2 className="[&_b]:md:font-semibold [&_strong]:md:font-semibold font-sans text-sm leading-[1.125rem] md:text-base md:leading-[1.375rem] text-muted-foreground">
                {description}
              </h2>
            </div>
          </div>
        </div>
      </div>
    </li>
  )
}

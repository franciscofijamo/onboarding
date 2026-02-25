"use client";

import { Hero } from "@/components/marketing/hero"
import { Features } from "@/components/marketing/features"
import { Testimonials } from "@/components/marketing/testimonials"
import { FAQ } from "@/components/marketing/faq"

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <Testimonials />
      <FAQ />
    </>
  )
}

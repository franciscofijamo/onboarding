"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, DollarSign, ArrowRight } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Settings</h1>
        <p className="text-muted-foreground mt-2">Configure feature costs and plan credits</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Feature Costs</h2>
          </div>
          <p className="text-muted-foreground mb-6">
            Configure credit costs for each system feature
          </p>
          <Button asChild className="w-full">
            <Link href="/admin/settings/features" className="flex items-center justify-center gap-2">
              Configure Costs
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Subscription Plans</h2>
          </div>
          <p className="text-muted-foreground mb-6">
            Manage Clerk plans and their monthly credits
          </p>
          <Button asChild className="w-full">
            <Link href="/admin/settings/plans" className="flex items-center justify-center gap-2">
              Manage Plans
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </Card>
      </div>
    </div>
  )
}

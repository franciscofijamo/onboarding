"use client";

import Link from "next/link";
import type { ElementType } from "react";
import { usePathname } from "next/navigation";
import {
  Activity,
  CreditCard,
  LayoutDashboard,
  HeartPlus,
  Shield,
  SlidersHorizontal,
  Users,
  DollarSign,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAdminDevMode } from "@/contexts/admin-dev-mode";
import { cn } from "@/lib/utils";

type Item = { title: string; href: string; icon: ElementType; requiresDevMode?: boolean };

const overview: Item[] = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Initial Setup", href: "/admin/onboarding", icon: HeartPlus, requiresDevMode: true },
];
const management: Item[] = [
  { title: "Users", href: "/admin/users", icon: Users },
  { title: "Credits", href: "/admin/credits", icon: CreditCard },
  { title: "Storage", href: "/admin/storage", icon: CreditCard },
];
const reports: Item[] = [
  { title: "Usage History", href: "/admin/usage", icon: Activity },
];
const settings: Item[] = [
  { title: "Feature Costs", href: "/admin/settings/features", icon: SlidersHorizontal },
  { title: "Subscription Plans", href: "/admin/settings/plans", icon: DollarSign },
];

function NavList({ items, pathname, devMode }: { items: Item[]; pathname: string; devMode: boolean }) {
  return (
    <SidebarMenu>
      {items
        .filter((item) => (item.requiresDevMode ? devMode : true))
        .map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/admin" && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
              <Link href={item.href}>
                <Icon />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { devMode, setDevMode } = useAdminDevMode();

  return (
    <Sidebar
      collapsible="icon"
      className={cn(devMode ? "mt-12 transition-[margin-top]" : "")}
    >
      <SidebarHeader className="py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Shield className="h-5 w-5" />
          </div>
          <span className="text-base font-semibold tracking-tight group-data-[collapsible=icon]:hidden">Painel Admin</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <div className="flex flex-col gap-2 border-b border-border/60 px-4 py-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="dev-mode-toggle" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Dev Mode
            </Label>
            <Switch
              id="dev-mode-toggle"
              checked={devMode}
              onCheckedChange={setDevMode}
              aria-label="Enable development mode"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {devMode ? "Setup features unlocked." : "Enable to see extra development mode settings."}
          </p>
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavList items={overview} pathname={pathname} devMode={devMode} />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavList items={management} pathname={pathname} devMode={devMode} />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Reports</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavList items={reports} pathname={pathname} devMode={devMode} />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavList items={settings} pathname={pathname} devMode={devMode} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

"use client";

import { type ReactNode, useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAdminPlans, useClerkPlans } from "@/hooks/use-admin-plans";
import { useAdminUsers, useSyncFromClerk } from "@/hooks/admin/use-admin-users";
import { useToast } from "@/hooks/use-toast";
import type { ClerkEnvKey, EnvChecklistItem } from "@/lib/onboarding/env-check";
import { CLERK_ENV_KEYS } from "@/lib/onboarding/env-check";
import { cn } from "@/lib/utils";
import { useAdminDevMode } from "@/contexts/admin-dev-mode";
import { site } from "@/lib/brand-config";
import {
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  ChevronDown,
  RefreshCcw,
  Settings2,
  Users,
  Palette,
  Copy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const datetimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "short",
  timeStyle: "short",
});

type StepState = "complete" | "pending" | "info";
const CLERK_KEY_SET = new Set<string>(CLERK_ENV_KEYS);

export function DeveloperOnboarding({ envChecklist, openRouterConfigured }: { envChecklist: EnvChecklistItem[]; openRouterConfigured: boolean }) {
  const { devMode } = useAdminDevMode();
  const { data: plansData } = useAdminPlans();
  const planCount = plansData?.plans?.length ?? 0;
  const hasPlans = planCount > 0;

  const usersQuery = useAdminUsers({ pageSize: 1 });
  const hasUsers = (usersQuery.data?.users?.length ?? 0) > 0;
  const loadingUsers = usersQuery.isLoading;

  const { refetch: fetchClerkPlans, isFetching: syncingPlans } = useClerkPlans();
  const syncFromClerkMutation = useSyncFromClerk();
  const { toast } = useToast();

  const [lastPlanSync, setLastPlanSync] = useState<{ date: Date; count: number } | null>(null);
  const [lastUserSyncAt, setLastUserSyncAt] = useState<Date | null>(null);

  const envStats = useMemo(() => {
    const configuredCount = envChecklist.filter((item) => item.isConfigured).length;
    return {
      configuredCount,
      total: envChecklist.length,
      complete: configuredCount === envChecklist.length,
    };
  }, [envChecklist]);

  const clerkEnvStatus = useMemo(() => {
    const relevant = envChecklist.filter((item): item is EnvChecklistItem & { key: ClerkEnvKey } =>
      isClerkEnvKey(item.key)
    );
    const missing = relevant.filter((item) => !item.isConfigured);
    return {
      ready: missing.length === 0,
      missing,
    };
  }, [envChecklist]);

  const clerkEnvReady = clerkEnvStatus.ready;
  const missingClerkEnvKeys = clerkEnvStatus.missing;
  const missingClerkEnvLabel =
    missingClerkEnvKeys.length > 0 ? missingClerkEnvKeys.map((item) => item.key).join(", ") : "";
  const planStepState: StepState = !clerkEnvReady
    ? "pending"
    : lastPlanSync
      ? "complete"
      : hasPlans
        ? "info"
        : "pending";
  const planStepHelper = !clerkEnvReady
    ? `Configure Clerk keys (${missingClerkEnvLabel}) to continue`
    : lastPlanSync
      ? `Last manual sync at ${datetimeFormatter.format(lastPlanSync.date)}`
      : hasPlans
        ? "Plans created in Clerk. Sync to import."
        : "Create and sync a test plan in Clerk";
  const handleSyncPlans = async () => {
    try {
      const result = await fetchClerkPlans();
      const count = result.data?.plans?.length ?? 0;
      setLastPlanSync({ date: new Date(), count });

      toast({
        title: "Plans synced",
        description:
          count > 0
            ? `Found ${count} plan(s) in Clerk. Adjust credits at /admin/settings/plans.`
            : "No plans returned by Clerk. Confirm you created offers in the dashboard.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error syncing plans";
      toast({ title: "Sync failed", description: message, variant: "destructive" });
    }
  };

  const handleSyncUsers = () => {
    syncFromClerkMutation.mutate(
      { syncUsers: true, syncPlans: true, setCredits: true },
      {
        onSuccess: () => {
          setLastUserSyncAt(new Date());
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <StepCard
          number={1}
          title="Check required environment variables"
          description="Make sure the .env (or .env.local) file contains the minimum secrets to run Clerk, webhooks, and the app."
          state={envStats.complete ? "complete" : "pending"}
          helper={`${envStats.configuredCount}/${envStats.total} variables configured`}
        >
          <EnvChecklist items={envChecklist} />
          <div className="rounded-lg border border-blue-600/20 bg-blue-500 px-4 py-3 text-sm font-medium text-white shadow-sm ring-1 ring-inset ring-blue-700/10 dark:bg-blue-600">
            Compare with <code>.env.example</code> and adjust as needed. Restart the server after changes.
          </div>
        </StepCard>

        {devMode && (
          <StepCard
            number={2}
            title="Brand Configurations"
            description="View the current brand settings and learn where to change them in the code."
            state="info"
            helper="Dev mode active - developers only"
          >
            <BrandConfigDisplay />
          </StepCard>
        )}

        <StepCard
          number={devMode ? 3 : 2}
          title="Configure subscription plans in Clerk"
          description="Enable billing beta, create a test plan, and keep the dashboard in development mode before any sync."
          state={planStepState}
          helper={planStepHelper}
        >
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Go to the Clerk dashboard &gt; Billing &gt; Subscriptions.</li>
            <li>Enable the subscriptions feature in <strong>Development</strong> mode.</li>
            <li>Create at least one recurring plan for testing (monthly recommended).</li>
          </ul>
          {!clerkEnvReady && missingClerkEnvKeys.length > 0 && (
            <ClerkEnvBlock missingKeys={missingClerkEnvKeys} />
          )}
          <div className="rounded-lg border border-amber-600/20 bg-amber-500 px-4 py-3 text-sm font-semibold text-amber-950 shadow-md ring-1 ring-inset ring-amber-600/10 dark:bg-amber-600 dark:text-amber-50">
            Do this first in the Clerk development environment to avoid affecting real users.
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" asChild>
              <Link href="https://dashboard.clerk.com/apps" target="_blank" rel="noreferrer">
                View Clerk apps
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="space-y-3 border-t border-border/50 pt-4">
            <p className="text-sm text-muted-foreground">
              The button below calls <code>/api/admin/clerk/plans</code> and imports plans directly. After that,
              adjust credits per plan at <code>/admin/settings/plans</code>.
            </p>
            {lastPlanSync && (
              <div className="rounded-lg border border-emerald-600/20 bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-sm ring-1 ring-inset ring-emerald-700/10 dark:bg-emerald-600">
                <CheckCircle2 className="mr-2 inline-block h-4 w-4" />
                Import registered {lastPlanSync.count} plan(s).
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSyncPlans} disabled={!clerkEnvReady || syncingPlans}>
                {syncingPlans ? (
                  <>
                    <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Sync now
                  </>
                )}
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/admin/settings/plans">
                  <Settings2 className="mr-2 h-4 w-4" />
                  Adjust credits and plans
                </Link>
              </Button>
            </div>
          </div>
        </StepCard>

        <StepCard
          number={devMode ? 4 : 3}
          title="Sync users from Clerk"
          description="If you haven't set up the local Clerk webhook yet, run a manual sync to populate users and subscription bindings in the database."
          state={!clerkEnvReady ? "pending" : lastUserSyncAt ? "complete" : hasUsers ? "info" : "pending"}
          helper={
            !clerkEnvReady
              ? `Configure Clerk keys (${missingClerkEnvLabel}) to unlock this step`
              : lastUserSyncAt
                ? `Ran at ${datetimeFormatter.format(lastUserSyncAt)}`
                : loadingUsers
                  ? "Checking users..."
                  : hasUsers
                    ? "Users already exist locally"
                    : "No users found locally"
          }
        >
          <p className="text-sm text-muted-foreground">
            This action calls <code>/api/admin/users/sync</code>, fetches users and subscriptions from Clerk, and optionally creates
            local credit balances. Run whenever you need to align state.
          </p>
          {!clerkEnvReady && missingClerkEnvKeys.length > 0 && (
            <ClerkEnvBlock missingKeys={missingClerkEnvKeys} />
          )}
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSyncUsers} disabled={!clerkEnvReady || syncFromClerkMutation.isPending}>
              {syncFromClerkMutation.isPending ? (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Sync with Clerk
                </>
              )}
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/admin/users">
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Review users
              </Link>
            </Button>
          </div>
        </StepCard>
      </div>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
  helper,
  state,
  children,
}: {
  number: number;
  title: string;
  description: string;
  helper?: string;
  state: StepState;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(state === "complete");
  const previousStateRef = useRef<StepState>(state);

  useEffect(() => {
    if (previousStateRef.current !== state) {
      previousStateRef.current = state;
      setCollapsed(state === "complete");
    }
  }, [state]);

  const canToggle = state === "complete";

  return (
    <Card
      data-collapsed={collapsed}
      data-state={state}
      className={cn(
        "transition-colors",
        collapsed ? "border-dashed border-border/60 bg-card/40 backdrop-blur" : ""
      )}
    >
      <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
            Step {number}
          </span>
          <CardTitle className="text-xl text-foreground">{title}</CardTitle>
          <StatusBadge state={state} helper={undefined} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {helper && <span className="max-w-xs text-right sm:text-left">{helper}</span>}
          {canToggle && (
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              className="inline-flex items-center gap-1 font-medium transition hover:text-foreground"
              aria-expanded={!collapsed}
            >
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", collapsed ? "" : "rotate-180")}
              />
              {collapsed ? "Expand details" : "Collapse step"}
            </button>
          )}
        </div>
      </CardHeader>
      <CardDescription
        className={cn(
          "px-6",
          collapsed ? "line-clamp-1 text-xs" : "pb-4 text-sm"
        )}
      >
        {description}
      </CardDescription>
      <Separator className="opacity-40" />
      <CardContent
        className={cn(
          "space-y-4 pt-6 text-sm text-foreground transition-all",
          collapsed ? "hidden" : "block"
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ state, helper }: { state: StepState; helper?: string }) {
  const config: Record<StepState, { label: string; variant: "secondary" | "destructive" | "outline"; icon: LucideIcon }> = {
    complete: { label: "Complete", variant: "secondary", icon: CheckCircle2 },
    pending: { label: "Pending", variant: "destructive", icon: CircleAlert },
    info: { label: "In progress", variant: "outline", icon: ClipboardCheck },
  };

  const Icon = config[state].icon;

  return (
    <div className="flex flex-col items-end gap-1">
      <Badge variant={config[state].variant} className="text-sm">
        <Icon className="h-4 w-4" />
        {config[state].label}
      </Badge>
      {helper && <span className="text-xs text-muted-foreground max-w-[220px] text-right leading-snug">{helper}</span>}
    </div>
  );
}

function EnvChecklist({ items }: { items: EnvChecklistItem[] }) {
  const adminItems = items.filter(item => item.key === 'ADMIN_EMAILS' || item.key === 'ADMIN_USER_IDS');
  const hasAdminConfig = adminItems.some(item => item.isConfigured);
  const adminEmailsItem = items.find(item => item.key === 'ADMIN_EMAILS');
  const adminUserIdsItem = items.find(item => item.key === 'ADMIN_USER_IDS');

  const adminEmails = adminEmailsItem?.value?.split(',').map(e => e.trim()).filter(Boolean) || [];
  const adminUserIds = adminUserIdsItem?.value?.split(',').map(id => id.trim()).filter(Boolean) || [];

  const storageItems = items.filter(item => item.key === 'BLOB_READ_WRITE_TOKEN' || item.key === 'REPLIT_STORAGE_BUCKET_ID');
  const hasStorageConfig = storageItems.some(item => item.isConfigured);

  const sortedItems = [...items].sort((a, b) => {
    if (a.isConfigured === b.isConfigured) return 0;
    return a.isConfigured ? 1 : -1;
  });

  return (
    <div className="space-y-3">
      {sortedItems.map((item) => {
        const isAdminItem = item.key === 'ADMIN_EMAILS' || item.key === 'ADMIN_USER_IDS';
        const isStorageItem = item.key === 'BLOB_READ_WRITE_TOKEN' || item.key === 'REPLIT_STORAGE_BUCKET_ID';
        const showAdminWarning = isAdminItem && !hasAdminConfig;
        const showStorageWarning = isStorageItem && !hasStorageConfig;
        const isNotConfigured = !item.isConfigured;

        return (
          <div
            key={item.key}
            className={cn(
              "flex flex-col gap-3 rounded-lg border p-4 shadow-sm transition-all",
              item.isConfigured
                ? "border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10"
                : "border-dashed border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/20"
            )}
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs uppercase tracking-wide">
                {item.category}
              </Badge>
              <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{item.key}</code>
            </div>
            <div>
              <p className="font-medium text-foreground">{item.label}</p>
              <p className="text-sm text-muted-foreground">{item.description}</p>
              {showAdminWarning && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                  At least one ADMIN variable (ADMIN_EMAILS or ADMIN_USER_IDS) must be configured to access the admin panel.
                </p>
              )}
              {showStorageWarning && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                  At least one storage variable (BLOB_READ_WRITE_TOKEN or REPLIT_STORAGE_BUCKET_ID) must be configured for file uploads.
                </p>
              )}
              {isNotConfigured && !showAdminWarning && !showStorageWarning && (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-400 font-bold bg-amber-500/10 p-1.5 rounded border border-amber-500/20 flex items-center gap-1.5">
                  <CircleAlert className="h-3 w-3" />
                  This variable must be configured in the .env file for the application to work correctly.
                </p>
              )}
              {item.docsPath && (
                <p className="pt-1 text-xs text-muted-foreground">
                  Reference: <code>{item.docsPath}</code>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={item.isConfigured ? "secondary" : "destructive"}>
                {item.isConfigured ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Configured
                  </>
                ) : (
                  <>
                    <CircleAlert className="h-3.5 w-3.5" /> Pending
                  </>
                )}
              </Badge>
              {!item.isConfigured && !isAdminItem && !isStorageItem && (
                <span className="text-xs text-muted-foreground">Add this value to .env</span>
              )}
            </div>
          </div>
        );
      })}

      {hasAdminConfig && (adminEmails.length > 0 || adminUserIds.length > 0) && (
        <div className="rounded-lg border border-emerald-600/20 bg-emerald-500 px-4 py-3 shadow-md ring-1 ring-inset ring-emerald-700/10 dark:bg-emerald-600">
          <h4 className="font-bold text-white mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Configured Admins
          </h4>
          {adminEmails.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200 mb-2">
                Emails ({adminEmails.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {adminEmails.map((email, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs bg-white/20 text-white border-none">
                    {email}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {adminUserIds.length > 0 && (
            <div>
              <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200 mb-2">
                User IDs ({adminUserIds.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {adminUserIds.map((userId, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs font-mono bg-white/20 text-white border-none">
                    {userId}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ClerkEnvBlock({ missingKeys }: { missingKeys: EnvChecklistItem[] }) {
  const list = missingKeys.map((item) => item.key).join(", ");
  return (
    <div className="rounded-lg border border-red-600/20 bg-red-500 px-4 py-3 text-sm font-semibold text-white shadow-md ring-1 ring-inset ring-red-700/10 dark:bg-red-600">
      <div className="flex items-center gap-2">
        <CircleAlert className="h-4 w-4" />
        <p>Configure the Clerk variables to unlock this action.</p>
      </div>
      <p className="mt-1 text-xs text-red-100/90 font-medium">Missing: {list}</p>
    </div>
  );
}

function isClerkEnvKey(key: string): key is ClerkEnvKey {
  return CLERK_KEY_SET.has(key);
}

function BrandConfigDisplay() {
  const { toast } = useToast();

  const generateAIPrompt = () => {
    return `Update the brand settings in the file src/lib/brand-config.ts with the following information:

BASIC INFO:
- Full name: ${site.name}
- Short name: ${site.shortName}
- Description: ${site.description}
- Author: ${site.author}
- Base URL: ${site.url}

KEYWORDS:
${site.keywords.map(k => `- ${k}`).join('\n')}

LOGOS AND ICONS:
- Light logo: ${site.logo.light || 'Not configured'}
- Dark logo: ${site.logo.dark || 'Not configured'}
- Favicon: ${site.icons.favicon || 'Not configured'}
- Apple Touch Icon: ${site.icons.apple || 'Not configured'}
- Shortcut Icon: ${site.icons.shortcut || 'Not configured'}
- Open Graph Image: ${site.ogImage || 'Not configured'}

SOCIAL MEDIA:
- Twitter/X: ${site.socials.twitter || 'Not configured'}

SUPPORT:
- Email: ${site.support.email || 'Not configured'}

ANALYTICS (environment variables - configure in .env):
- Google Tag Manager: ${site.analytics.gtmId || 'NEXT_PUBLIC_GTM_ID'}
- Google Analytics 4: ${site.analytics.gaMeasurementId || 'NEXT_PUBLIC_GA_ID'}
- Facebook Pixel: ${site.analytics.facebookPixelId || 'NEXT_PUBLIC_FACEBOOK_PIXEL_ID'}

INSTRUCTIONS:
1. Open the file src/lib/brand-config.ts
2. Update the 'site' object with the new values above
3. Keep the existing structure and types
4. For analytics, variables are read from process.env, so only update default values if needed
5. See .context/docs/brand-config.md for more details`;
  };

  const handleCopyPrompt = async () => {
    try {
      const prompt = generateAIPrompt();
      await navigator.clipboard.writeText(prompt);
      toast({
        title: "Prompt copied!",
        description: "Paste the prompt into your AI to automatically update brand configs.",
      });
    } catch (error) {
      console.error("Failed to copy AI prompt", error)
      toast({
        title: "Copy failed",
        description: "Could not copy the prompt. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-600/20 bg-blue-500 px-4 py-3 text-sm font-medium text-white shadow-sm ring-1 ring-inset ring-blue-700/10 dark:bg-blue-600">
        <p className="font-bold mb-1 flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          Where to change:
        </p>
        <p>Edit the file <code className="bg-white/20 px-1 rounded font-mono text-xs">src/lib/brand-config.ts</code> to modify these settings.</p>
        <p className="mt-1 opacity-90 text-xs">Full documentation: <code className="bg-white/20 px-1 rounded font-mono">.context/docs/brand-config.md</code></p>
      </div>

      <div className="rounded-xl border border-emerald-600/20 bg-emerald-50 p-5 shadow-sm ring-1 ring-inset ring-emerald-600/10 dark:bg-emerald-950/20 transition-all hover:shadow-md">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm ring-4 ring-emerald-500/10">
              <RefreshCcw className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-emerald-950 dark:text-emerald-50 text-lg leading-tight">AI Prompt</h4>
              <p className="text-xs text-emerald-800/70 dark:text-emerald-400 font-medium">
                Copy and paste into your AI to automate brand configs.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyPrompt}
            className="shrink-0 bg-white border-emerald-200 hover:bg-emerald-50 text-emerald-700 font-bold dark:bg-emerald-900/50 dark:border-emerald-800 dark:text-emerald-300 shadow-sm"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy prompt
          </Button>
        </div>
        <div className="rounded-lg bg-white/50 backdrop-blur-sm border border-emerald-200/50 dark:bg-black/20 dark:border-emerald-800/50 p-4 max-h-48 overflow-y-auto shadow-inner group">
          <pre className="text-xs text-emerald-900/80 dark:text-emerald-100/80 whitespace-pre-wrap font-mono leading-relaxed">
            {generateAIPrompt()}
          </pre>
        </div>
      </div>

      <div className="space-y-3">
        <ConfigSection title="Basic information">
          <ConfigItem label="Full name" value={site.name} />
          <ConfigItem label="Short name" value={site.shortName} />
          <ConfigItem label="Description" value={site.description} />
          <ConfigItem label="Author" value={site.author} />
          <ConfigItem label="Base URL" value={site.url} />
        </ConfigSection>

        <ConfigSection title="Keywords">
          <div className="flex flex-wrap gap-2">
            {site.keywords.map((keyword, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {keyword}
              </Badge>
            ))}
          </div>
        </ConfigSection>

        <ConfigSection title="Social media">
          <ConfigItem label="Twitter/X" value={site.socials.twitter || "Not configured"} />
        </ConfigSection>

        <ConfigSection title="Support">
          <ConfigItem label="Email" value={site.support.email || "Not configured"} />
        </ConfigSection>

        <ConfigSection title="Analytics (environment variables)">
          <ConfigItem
            label="Google Tag Manager"
            value={site.analytics.gtmId || "Not configured (NEXT_PUBLIC_GTM_ID)"}
          />
          <ConfigItem
            label="Google Analytics 4"
            value={site.analytics.gaMeasurementId || "Not configured (NEXT_PUBLIC_GA_ID)"}
          />
          <ConfigItem
            label="Facebook Pixel"
            value={site.analytics.facebookPixelId || "Not configured (NEXT_PUBLIC_FACEBOOK_PIXEL_ID)"}
          />
          <div className="mt-4 rounded-lg border border-amber-600/20 bg-amber-500 px-4 py-3 text-sm font-semibold text-amber-950 shadow-md ring-1 ring-inset ring-amber-600/10 dark:bg-amber-600 dark:text-amber-50">
            <p className="font-bold mb-2 flex items-center gap-2">
              <CircleAlert className="h-4 w-4" />
              Important:
            </p>
            <ul className="list-disc list-inside space-y-1.5 opacity-90">
              <li>Analytics are only loaded after the user accepts cookies (LGPD/GDPR)</li>
              <li>Variables are read at build time - restart the server after changing .env</li>
              <li>To test: accept cookies and check the browser console</li>
              <li>Component: <code className="bg-amber-950/10 dark:bg-white/10 px-1 rounded font-mono">src/components/analytics/pixels.tsx</code></li>
            </ul>
          </div>
        </ConfigSection>
      </div>

      <div className="rounded-lg border border-purple-600/20 bg-purple-500 px-4 py-3 text-sm font-medium text-white shadow-sm ring-1 ring-inset ring-purple-700/10 dark:bg-purple-600">
        <p className="font-bold mb-1 flex items-center gap-2">
          <CircleAlert className="h-4 w-4" />
          Tip:
        </p>
        <p className="opacity-90">Analytics settings are read from environment variables. Add them to <code>.env</code> if needed.</p>
      </div>
    </div>
  );
}

function ConfigSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-4">
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <Palette className="h-4 w-4" />
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ConfigItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="text-muted-foreground font-medium">{label}:</span>
      <code className="rounded bg-muted px-2 py-1 text-xs break-all">{value}</code>
    </div>
  );
}

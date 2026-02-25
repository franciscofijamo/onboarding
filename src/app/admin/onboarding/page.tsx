import { DeveloperOnboarding } from "@/components/admin/onboarding/developer-onboarding";
import { getEnvChecklist, isEnvConfigured } from "@/lib/onboarding/env-check";

export default function AdminOnboardingPage() {
  const envChecklist = getEnvChecklist();
  const openRouterConfigured = isEnvConfigured('OPENROUTER_API_KEY');

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Getting Started</p>
        <h1 className="text-3xl font-bold text-foreground">Initial Setup</h1>
        <p className="text-muted-foreground">
          Use this checklist whenever you need to set up a new development machine or validate the project configuration.
        </p>
      </div>

      <DeveloperOnboarding envChecklist={envChecklist} openRouterConfigured={openRouterConfigured} />
    </div>
  );
}

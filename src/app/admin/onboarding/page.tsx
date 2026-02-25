import { DeveloperOnboarding } from "@/components/admin/onboarding/developer-onboarding";
import { getEnvChecklist, isEnvConfigured } from "@/lib/onboarding/env-check";

/**
 * Server Component - A checagem de variáveis de ambiente é feita no servidor
 * para garantir acesso às variáveis server-side (CLERK_SECRET_KEY, DATABASE_URL, etc.)
 * e evitar expor valores sensíveis ao cliente.
 */
export default function AdminOnboardingPage() {
  // Executado no servidor - tem acesso a todas as variáveis de ambiente
  const envChecklist = getEnvChecklist();
  const openRouterConfigured = isEnvConfigured('OPENROUTER_API_KEY');

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Primeiros passos</p>
        <h1 className="text-3xl font-bold text-foreground">Configurações iniciais</h1>
        <p className="text-muted-foreground">
          Use este roteiro sempre que precisar preparar uma nova máquina de desenvolvimento ou validar o estado da
          configuração do projeto.
        </p>
      </div>

      <DeveloperOnboarding envChecklist={envChecklist} openRouterConfigured={openRouterConfigured} />
    </div>
  );
}

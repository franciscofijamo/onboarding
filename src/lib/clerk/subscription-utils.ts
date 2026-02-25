import { db } from "@/lib/db";

export interface SubscriptionPlan {
  id: string;
  name: string;
  credits: number;
  features: string[];
  priceMonthly?: number;
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  free: {
    id: "free",
    name: "Gratuito",
    credits: 100,
    features: [
      "100 créditos por mês",
      "Recursos essenciais de IA",
      "Suporte da comunidade",
    ],
  },
  starter: {
    id: "starter",
    name: "Iniciante",
    credits: 500,
    features: [
      "500 créditos por mês",
      "Todos os recursos de IA",
      "Suporte por email",
      "Funcionalidade de exportação",
    ],
    priceMonthly: 9,
  },
  professional: {
    id: "professional",
    name: "Profissional",
    credits: 2000,
    features: [
      "2000 créditos por mês",
      "Processamento prioritário de IA",
      "Suporte prioritário",
      "Análises avançadas",
    ],
    priceMonthly: 29,
  },
  enterprise: {
    id: "enterprise",
    name: "Empresarial",
    credits: 10000,
    features: [
      "10000 créditos por mês",
      "Tudo do Profissional",
      "Modelos de IA personalizados",
      "Suporte dedicado",
      "Garantias de SLA",
      "Integrações personalizadas",
    ],
    priceMonthly: 0,
  },
};

export async function hasFeatureAccess(
  clerkUserId: string,
  feature: string
): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { clerkId: clerkUserId }
  });

  if (!user) return false;

  let planName = "free";
  
  if (user.currentPlanId) {
    const plan = await db.plan.findUnique({
      where: { id: user.currentPlanId }
    });
    if (plan) {
      planName = plan.clerkId || plan.name?.toLowerCase() || "free";
    }
  }

  const featureAccess: Record<string, string[]> = {
    exportData: ["starter", "professional", "enterprise"],
    advancedAnalytics: ["professional", "enterprise"],
    teamCollaboration: ["professional", "enterprise"],
    customAIModels: ["enterprise"],
    unlimitedProjects: ["professional", "enterprise"],
  };

  const allowedPlans = featureAccess[feature];
  if (!allowedPlans) return true;

  return allowedPlans.includes(planName);
}

export async function getUserPlanDetails(clerkUserId: string) {
  const user = await db.user.findUnique({
    where: { clerkId: clerkUserId },
    include: { creditBalance: true }
  });

  if (!user) {
    return {
      id: "free",
      name: "Gratuito",
      credits: 100,
      features: [],
      creditsRemaining: 0,
      creditsTotal: 100,
      billingPeriodEnd: null,
    };
  }

  let currentPlan = null;
  if (user.currentPlanId) {
    currentPlan = await db.plan.findUnique({
      where: { id: user.currentPlanId }
    });
  }

  if (!currentPlan) {
    currentPlan = await db.plan.findFirst({
      where: {
        OR: [
          { clerkId: 'free' },
          { name: { contains: 'free', mode: 'insensitive' } },
          { name: { contains: 'gratuito', mode: 'insensitive' } }
        ],
        active: true
      },
      orderBy: { credits: 'asc' }
    });
  }

  const creditsRemaining = user.creditBalance?.creditsRemaining ?? 0;
  const creditsTotal = currentPlan?.credits ?? 100;

  return {
    id: currentPlan?.id || "free",
    name: currentPlan?.name || "Gratuito",
    credits: creditsTotal,
    features: (currentPlan?.features as string[]) || [],
    creditsRemaining,
    creditsTotal,
    billingPeriodEnd: user.billingPeriodEnd?.toISOString() || null,
  };
}

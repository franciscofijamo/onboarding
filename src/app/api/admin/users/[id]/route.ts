import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/admin-utils";
import { z } from "zod";
import { withApiLogging } from "@/lib/logging/api";

async function handleAdminUserDelete(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId || !(await isAdmin(userId))) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await ctx.params
    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    try {
      const updated = await db.user.update({ where: { id }, data: { isActive: false } })
      return NextResponse.json({ success: true, user: { id: updated.id, isActive: updated.isActive } })
    } catch (e: unknown) {
      const msg = (e && ((e as { message?: string }).message || e.toString())) || 'Falha na atualização'
      // Provide a clearer hint if the DB schema hasn't been migrated yet
      if (msg.includes('isActive') || msg.toLowerCase().includes('column') || msg.toLowerCase().includes('unknown')) {
        return NextResponse.json(
          { error: 'Schema do banco de dados desatualizado. Execute as migrações para adicionar `User.isActive` (npm run db:migrate).' },
          { status: 409 }
        )
      }
      throw e
    }
  } catch {
    // console.error("Failed to delete user:", error);
    return NextResponse.json(
      { error: "Falha ao excluir usuário" },
      { status: 500 }
    );
  }
}

const UpdateSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    email: z.string().email().optional(),
    planId: z.string().optional(),
  })
  .strict()

async function handleAdminUserUpdate(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId || !(await isAdmin(userId))) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    const { id } = await params;
    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // If planId is provided, validate it exists and update credits
    let planCredits: number | undefined;
    if (data.planId) {
      const plan = await db.plan.findUnique({
        where: { id: data.planId },
        select: { credits: true, active: true },
      });

      if (!plan) {
        return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
      }

      if (!plan.active) {
        return NextResponse.json({ error: "Plano inativo" }, { status: 400 });
      }

      planCredits = plan.credits;
    }

    // Update user data
    const updated = await db.user.update({
      where: { id },
      data: {
        name: data.name ?? existing.name,
        email: data.email ?? existing.email,
        currentPlanId: data.planId ?? existing.currentPlanId,
        billingPeriodEnd: data.planId
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          : existing.billingPeriodEnd,
      },
      include: {
        creditBalance: { select: { creditsRemaining: true } },
        _count: { select: { usageHistory: true } },
      },
    });

    // Update credits if plan was changed
    if (data.planId && planCredits !== undefined) {
      await db.creditBalance.upsert({
        where: { userId: id },
        create: {
          userId: id,
          clerkUserId: existing.clerkId,
          creditsRemaining: planCredits,
          lastSyncedAt: new Date(),
        },
        update: {
          creditsRemaining: planCredits,
          lastSyncedAt: new Date(),
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json({ error: "Falha ao atualizar usuário" }, { status: 500 });
  }
}

export const DELETE = withApiLogging(handleAdminUserDelete, {
  method: "DELETE",
  route: "/api/admin/users/[id]",
  feature: "admin_users",
})

export const PUT = withApiLogging(handleAdminUserUpdate, {
  method: "PUT",
  route: "/api/admin/users/[id]",
  feature: "admin_users",
})

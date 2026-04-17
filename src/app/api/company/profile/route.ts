import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getUserFromClerkId } from '@/lib/auth-utils';
import { z } from 'zod';
import { withApiLogging } from '@/lib/logging/api';

const companySchema = z.object({
  name: z.string().min(2, 'Nome da empresa é obrigatório'),
  description: z.string().min(10, 'Descrição é obrigatória'),
  location: z.string().min(2, 'Localização é obrigatória'),
  website: z.string().url('URL inválido').optional().or(z.literal('')),
  email: z.string().email('Email inválido'),
  logoUrl: z.string().min(1, 'Logo inválido'),
  logoPath: z.string().optional().or(z.literal('')),
});

async function handleGetProfile() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromClerkId(userId);
    if (user.role !== 'RECRUITER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const company = await db.company.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        description: true,
        location: true,
        website: true,
        email: true,
        logoUrl: true,
        logoPath: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ company });
  } catch (error) {
    console.error('[Company Profile API] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleUpdateProfile(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromClerkId(userId);

    if (user.role !== null && user.role !== 'RECRUITER') {
      return NextResponse.json({ error: 'Forbidden: only recruiters can manage company profiles' }, { status: 403 });
    }

    const body = await request.json();
    const validation = companySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { name, description, location, website, email, logoUrl, logoPath } = validation.data;
    console.log('[Company Profile API] Updating company profile for user:', user.id, { logoUrl, logoPath });

    const company = await db.company.upsert({
      where: { userId: user.id },
      create: { userId: user.id, name, description, location, website: website || null, email, logoUrl, logoPath: logoPath || null },
      update: { name, description, location, website: website || null, email, logoUrl, logoPath: logoPath || null },
    });

    console.log('[Company Profile API] Upsert result logoUrl:', company.logoUrl);

    await db.user.update({
      where: { id: user.id },
      data: { role: 'RECRUITER' },
    });

    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { role: 'RECRUITER' },
    });

    console.log('[Company Profile API] Successfully updated profile for user:', user.id);

    return NextResponse.json({ success: true, company });
  } catch (error) {
    console.error('[Company Profile API] PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withApiLogging(handleGetProfile, {
  method: 'GET',
  route: '/api/company/profile',
  feature: 'company',
});

export const PUT = withApiLogging(handleUpdateProfile, {
  method: 'PUT',
  route: '/api/company/profile',
  feature: 'company',
});

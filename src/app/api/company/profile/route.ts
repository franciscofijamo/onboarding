import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getUserFromClerkId } from '@/lib/auth-utils';
import { z } from 'zod';

const companySchema = z.object({
  name: z.string().min(2, 'Nome da empresa é obrigatório'),
  description: z.string().min(10, 'Descrição é obrigatória'),
  location: z.string().min(2, 'Localização é obrigatória'),
  website: z.string().url('URL inválido').optional().or(z.literal('')),
  email: z.string().email('Email inválido'),
  logoUrl: z.string().url().optional().or(z.literal('')),
  logoPath: z.string().optional().or(z.literal('')),
});

export async function GET() {
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
    });

    return NextResponse.json({ company });
  } catch (error) {
    console.error('[Company Profile API] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
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

    const company = await db.company.upsert({
      where: { userId: user.id },
      create: { userId: user.id, name, description, location, website: website || null, email, logoUrl: logoUrl || null, logoPath: logoPath || null },
      update: { name, description, location, website: website || null, email, logoUrl: logoUrl || null, logoPath: logoPath || null },
    });

    await db.user.update({
      where: { id: user.id },
      data: { role: 'RECRUITER' },
    });

    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { role: 'RECRUITER' },
    });

    return NextResponse.json({ success: true, company });
  } catch (error) {
    console.error('[Company Profile API] PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

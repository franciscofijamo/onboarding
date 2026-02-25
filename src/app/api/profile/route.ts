import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getUserFromClerkId } from '@/lib/auth-utils';
import { withApiLogging } from '@/lib/logging/api';
import { z } from 'zod';

const profileUpdateSchema = z.object({
    province: z.string().min(1, "Province is required"),
    birthYear: z.number().int().min(1950).max(new Date().getFullYear() - 16),
    gender: z.enum(["male", "female"]),
    course: z.string().min(1, "Course is required"),
    university: z.string().min(1, "University is required"),
});

async function handleGetProfile() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await getUserFromClerkId(userId);

        return NextResponse.json({
            profileComplete: user.profileComplete ?? false,
            province: user.province,
            birthYear: user.birthYear,
            gender: user.gender,
            course: user.course,
            university: user.university,
        });
    } catch (error) {
        console.error('[Profile API] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

async function handlePatchProfile(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const validation = profileUpdateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.error.flatten() },
                { status: 400 }
            );
        }

        const { province, birthYear, gender, course, university } = validation.data;

        const user = await getUserFromClerkId(userId);

        await db.user.update({
            where: { id: user.id },
            data: {
                province,
                birthYear,
                gender,
                course,
                university,
                profileComplete: true,
            },
        });

        return NextResponse.json({
            success: true,
            profileComplete: true,
        });
    } catch (error) {
        console.error('[Profile API] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export const GET = withApiLogging(handleGetProfile, {
    method: 'GET',
    route: '/api/profile',
    feature: 'profile',
});

export const PATCH = withApiLogging(handlePatchProfile, {
    method: 'PATCH',
    route: '/api/profile',
    feature: 'profile',
});

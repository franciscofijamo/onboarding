import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getUserFromClerkId } from '@/lib/auth-utils';
import { withApiLogging } from '@/lib/logging/api';
import { z } from 'zod';
import { DEFAULT_LOCALE, isLocale } from '@/i18n';

const NO_DEGREE_VALUE = '__no_degree__';

const profileUpdateSchema = z.object({
    locale: z.string().optional(),
    province: z.string().min(1, "Province is required").optional(),
    birthYear: z.number().int().min(1950).max(new Date().getFullYear() - 16).optional(),
    gender: z.enum(["male", "female"]).optional(),
    course: z.string().min(1, "Course is required").optional(),
    university: z.string().nullable().optional(),
}).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one profile field is required',
});

async function handleGetProfile() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await getUserFromClerkId(userId);

        const company = user.role === 'RECRUITER'
            ? await db.company.findUnique({ where: { userId: user.id }, select: { id: true, logoUrl: true } })
            : null;

        const userLocale = (user as { locale?: string | null }).locale;

        return NextResponse.json({
            locale: isLocale(userLocale) ? userLocale : DEFAULT_LOCALE,
            profileComplete: user.profileComplete ?? false,
            role: user.role ?? null,
            hasCompany: company !== null,
            hasCompanyLogo: Boolean(company?.logoUrl),
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

        const { locale, province, birthYear, gender, course, university } = validation.data;

        const user = await getUserFromClerkId(userId);
        const userLocale = (user as { locale?: string | null }).locale;
        const nextLocale = isLocale(locale) ? locale : (isLocale(userLocale) ? userLocale : DEFAULT_LOCALE);
        const nextProvince = province ?? user.province;
        const nextBirthYear = birthYear ?? user.birthYear;
        const nextGender = gender ?? user.gender;
        const nextCourse = course ?? user.course;
        const nextUniversity = (() => {
            // If the user explicitly sends null or selects no-degree, clear university
            if (university === null) return null;
            if (nextCourse === NO_DEGREE_VALUE) return null;
            return university ?? user.university;
        })();
        const profileComplete = Boolean(
            nextProvince &&
            nextBirthYear &&
            nextGender &&
            nextCourse &&
            // University only required when the user has an academic degree
            (nextCourse === NO_DEGREE_VALUE || nextUniversity)
        );

        await db.user.update({
            where: { id: user.id },
            data: {
                locale: isLocale(nextLocale) ? nextLocale : DEFAULT_LOCALE,
                province: nextProvince,
                birthYear: nextBirthYear,
                gender: nextGender,
                course: nextCourse,
                university: nextUniversity,
                profileComplete,
            } as never,
        });

        return NextResponse.json({
            success: true,
            locale: isLocale(nextLocale) ? nextLocale : DEFAULT_LOCALE,
            profileComplete,
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

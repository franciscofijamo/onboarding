"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export type UserRole = 'CANDIDATE' | 'RECRUITER';

interface ProfileData {
    profileComplete: boolean;
    role: UserRole | null;
    hasCompany: boolean;
    province: string | null;
    birthYear: number | null;
    gender: string | null;
    course: string | null;
    university: string | null;
}

interface UseProfileOptions {
    enabled?: boolean;
}

export function useProfile(options?: UseProfileOptions) {
    const enabled = options?.enabled ?? true;

    const query = useQuery<ProfileData>({
        queryKey: ["profile"],
        queryFn: () => api.get("/api/profile"),
        staleTime: 5 * 60_000,
        gcTime: 10 * 60_000,
        enabled,
    });

    return {
        profile: query.data,
        isLoading: query.isLoading,
        isProfileComplete: query.data?.profileComplete ?? false,
        role: query.data?.role ?? null,
        hasRole: query.data?.role != null,
        hasCompany: query.data?.hasCompany ?? false,
        refetch: query.refetch,
    };
}

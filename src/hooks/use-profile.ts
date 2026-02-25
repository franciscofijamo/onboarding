"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

interface ProfileData {
    profileComplete: boolean;
    province: string | null;
    birthYear: number | null;
    gender: string | null;
    course: string | null;
    university: string | null;
}

export function useProfile() {
    const query = useQuery<ProfileData>({
        queryKey: ["profile"],
        queryFn: () => api.get("/api/profile"),
        staleTime: 5 * 60_000,
        gcTime: 10 * 60_000,
    });

    return {
        profile: query.data,
        isLoading: query.isLoading,
        isProfileComplete: query.data?.profileComplete ?? false,
        refetch: query.refetch,
    };
}

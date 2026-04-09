"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function NewApplicationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const postingId = searchParams.get("postingId");

  React.useEffect(() => {
    if (postingId) {
      router.replace(`/onboarding?new=1&jobPostingId=${postingId}`);
    } else {
      router.replace("/onboarding?new=1");
    }
  }, [postingId, router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

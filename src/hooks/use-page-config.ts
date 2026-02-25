"use client";

import { useMemo } from "react";
import { useSetPageMetadata, PageMetadata } from "@/contexts/page-metadata";

/**
 * Helper hook to configure page metadata in a simpler way
 * 
 * @example
 * // Basic usage
 * usePageConfig("My Page", "Page description");
 * 
 * // With custom breadcrumbs
 * usePageConfig("Profile", "Manage your profile", [
 *   { label: "Home", href: "/dashboard" },
 *   { label: "Profile" }
 * ]);
 * 
 * // With full object
 * usePageConfig({
 *   title: "Dashboard",
 *   description: "Overview",
 *   showBreadcrumbs: false
 * });
 */
export function usePageConfig(
  titleOrConfig: string | PageMetadata,
  description?: string,
  breadcrumbs?: PageMetadata["breadcrumbs"]
) {
  const metadata = useMemo<PageMetadata>(() => {
    return typeof titleOrConfig === "string"
      ? {
          title: titleOrConfig,
          description,
          breadcrumbs,
        }
      : titleOrConfig;
  }, [titleOrConfig, description, breadcrumbs]);

  useSetPageMetadata(metadata);
}

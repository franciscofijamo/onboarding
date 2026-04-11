"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface DataTableColumn {
  key: string;
  header: string;
  render: (item: unknown) => React.ReactNode;
  className?: string;
}

interface DataTableProps {
  data: Record<string, unknown>[];
  columns: DataTableColumn[];
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: string[];
  loading?: boolean;
  countLabel?: string;
  emptyMessage?: string;
}

function deepStringify(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.toLowerCase();
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map(deepStringify)
      .join(" ");
  }
  return String(value).toLowerCase();
}

export function DataTable({
  data,
  columns,
  searchable = false,
  searchPlaceholder = "Pesquisar...",
  searchKeys = [],
  loading = false,
  countLabel = "registos",
  emptyMessage = "Sem dados para mostrar.",
}: DataTableProps) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    if (!searchable || !query.trim()) return data;
    const q = query.trim().toLowerCase();
    return data.filter((row) => {
      if (searchKeys.length === 0) {
        return deepStringify(row).includes(q);
      }
      return searchKeys.some((key) => deepStringify(row[key]).includes(q));
    });
  }, [data, query, searchable, searchKeys]);

  return (
    <div className="space-y-4">
      {searchable && (
        <div className="flex items-center justify-between gap-4">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {!loading && (
            <p className="text-sm text-muted-foreground shrink-0">
              {filtered.length} {countLabel}
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap",
                      col.className
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3">
                        <Skeleton className="h-5 w-full max-w-[180px]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                filtered.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn("px-4 py-3 align-middle", col.className)}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils/cn";

interface DataTableProps<T> {
  columns: Array<{
    key: string;
    header: string;
    align?: "left" | "right" | "center";
    render?: (row: T) => React.ReactNode;
  }>;
  data: T[];
  keyField: keyof T;
  onRowClick?: (row: T) => void;
  className?: string;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyField,
  onRowClick,
  className,
  emptyMessage = "No data",
}: DataTableProps<T>) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-3 py-2.5 text-xs font-medium text-[var(--muted)] uppercase tracking-wider",
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center",
                  !col.align && "text-left",
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-8 text-center text-[var(--muted)] text-sm"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={String(row[keyField])}
                className={cn(
                  "border-b border-[var(--border)]/50 transition-colors",
                  onRowClick && "cursor-pointer hover:bg-[var(--surface-2)]",
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-3 py-3",
                      col.align === "right" &&
                        "text-right tabular-nums font-mono",
                      col.align === "center" && "text-center",
                    )}
                  >
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

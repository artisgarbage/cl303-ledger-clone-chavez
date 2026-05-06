"use client";

import { useState, useEffect } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { Badge } from "@/components/shared/Badge";
import { formatCurrency, formatPercent } from "@/lib/utils/currency";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw } from "lucide-react";
import { getPeriodRange } from "@/lib/utils/dates";
import { format } from "date-fns";

interface ProjectRow {
  projectId: string;
  projectName: string;
  clientName: string | null;
  classification: string;
  status: string;
  contractValue: number | null;
  revenue: number;
  trueCost: number;
  grossProfit: number;
  grossMargin: number;
  billableHours: number;
  totalHours: number;
  effectiveBlendedRate: number;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchProjects() {
    setLoading(true);
    const range = getPeriodRange("current_month");
    const params = new URLSearchParams({
      start: range.start.toISOString(),
      end: range.end.toISOString(),
      basis: "CASH",
    });
    const res = await fetch(`/api/projects?${params}`);
    if (res.ok) {
      const data = (await res.json()) as ProjectRow[];
      setProjects(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchProjects();
  }, []);

  const columns = [
    {
      key: "projectName",
      header: "Project / Client",
      render: (row: ProjectRow) => (
        <div>
          <p className="font-medium text-[var(--foreground)]">
            {row.projectName}
          </p>
          {row.clientName && (
            <p className="text-xs text-[var(--muted)]">{row.clientName}</p>
          )}
        </div>
      ),
    },
    {
      key: "classification",
      header: "Class",
      render: (row: ProjectRow) => (
        <Badge
          variant={row.classification.toLowerCase() as "fund" | "frontier"}
        >
          {row.classification}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: ProjectRow) => (
        <Badge
          variant={
            row.status.toLowerCase() as
              | "active"
              | "completed"
              | "paused"
              | "lost"
          }
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: "revenue",
      header: "Revenue",
      align: "right" as const,
      render: (row: ProjectRow) => formatCurrency(row.revenue),
    },
    {
      key: "trueCost",
      header: "True Cost",
      align: "right" as const,
      render: (row: ProjectRow) => formatCurrency(row.trueCost),
    },
    {
      key: "grossProfit",
      header: "Gross Profit",
      align: "right" as const,
      render: (row: ProjectRow) => (
        <span
          className={
            row.grossProfit >= 0
              ? "text-[var(--accent-green)]"
              : "text-[var(--accent-red)]"
          }
        >
          {formatCurrency(row.grossProfit)}
        </span>
      ),
    },
    {
      key: "grossMargin",
      header: "Margin",
      align: "right" as const,
      render: (row: ProjectRow) => (
        <span
          className={
            row.grossMargin >= 0.3
              ? "text-[var(--accent-green)]"
              : row.grossMargin >= 0.15
                ? "text-[var(--accent-amber)]"
                : "text-[var(--accent-red)]"
          }
        >
          {formatPercent(row.grossMargin)}
        </span>
      ),
    },
    {
      key: "billableHours",
      header: "Hours (Bill/Total)",
      align: "right" as const,
      render: (row: ProjectRow) =>
        `${row.billableHours.toFixed(0)}h / ${row.totalHours.toFixed(0)}h`,
    },
    {
      key: "effectiveBlendedRate",
      header: "Blended Rate",
      align: "right" as const,
      render: (row: ProjectRow) =>
        row.effectiveBlendedRate > 0
          ? `$${row.effectiveBlendedRate.toFixed(0)}/hr`
          : "—",
    },
  ];

  return (
    <div className="p-6 space-y-5 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Project Profitability</h1>
          <p className="text-sm text-[var(--muted)] mt-0.5">
            True cost engine applied — {format(new Date(), "MMMM yyyy")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchProjects}
            className="flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--accent-blue)] transition-colors"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <a
            href="/projects/new"
            className="flex items-center gap-1.5 rounded-md bg-[var(--accent-blue)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Project
          </a>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[var(--muted)] text-sm">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
            Loading projects…
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={projects}
            keyField="projectId"
            onRowClick={(row) => router.push(`/projects/${row.projectId}`)}
            emptyMessage="No projects found. Add a project to get started."
          />
        )}
      </div>

      {projects.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-xs text-[var(--muted)] uppercase tracking-wider">
              Total Revenue
            </p>
            <p className="font-mono text-xl font-semibold tabular-nums mt-1">
              {formatCurrency(projects.reduce((s, p) => s + p.revenue, 0))}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-xs text-[var(--muted)] uppercase tracking-wider">
              Avg Margin
            </p>
            <p className="font-mono text-xl font-semibold tabular-nums mt-1">
              {formatPercent(
                projects.reduce((s, p) => s + p.grossMargin, 0) /
                  projects.length,
              )}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-xs text-[var(--muted)] uppercase tracking-wider">
              Total Hours
            </p>
            <p className="font-mono text-xl font-semibold tabular-nums mt-1">
              {projects.reduce((s, p) => s + p.totalHours, 0).toFixed(0)}h
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

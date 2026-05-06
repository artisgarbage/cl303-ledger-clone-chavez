"use client";

import { useState, useEffect } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { Badge } from "@/components/shared/Badge";
import { formatCurrency, formatPercent } from "@/lib/utils/currency";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, Info } from "lucide-react";
import { format } from "date-fns";

interface PersonRow {
  personId: string;
  name: string;
  type: string;
  email: string | null;
  totalHours: number;
  billableHours: number;
  utilization: number;
  effectiveRate: number | null;
  totalCost: number;
}

export default function PeoplePage() {
  const router = useRouter();
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const currentMonth = format(new Date(), "yyyy-MM");

  async function fetchPeople() {
    setLoading(true);
    const res = await fetch(`/api/people?month=${currentMonth}`);
    if (res.ok) {
      const data = (await res.json()) as PersonRow[];
      setPeople(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchPeople();
  }, []);

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (row: PersonRow) => (
        <div>
          <p className="font-medium">{row.name}</p>
          {row.email && (
            <p className="text-xs text-[var(--muted)]">{row.email}</p>
          )}
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (row: PersonRow) => (
        <Badge
          variant={
            row.type === "SALARIED"
              ? "default"
              : row.type === "CONTRACTOR"
                ? "amber"
                : "fund"
          }
        >
          {row.type}
        </Badge>
      ),
    },
    {
      key: "totalHours",
      header: "Total Hrs",
      align: "right" as const,
      render: (row: PersonRow) => `${row.totalHours.toFixed(0)}h`,
    },
    {
      key: "billableHours",
      header: "Billable Hrs",
      align: "right" as const,
      render: (row: PersonRow) => `${row.billableHours.toFixed(0)}h`,
    },
    {
      key: "utilization",
      header: "Utilization",
      align: "right" as const,
      render: (row: PersonRow) => (
        <span
          className={
            row.utilization >= 0.75
              ? "text-[var(--accent-green)]"
              : row.utilization >= 0.5
                ? "text-[var(--accent-amber)]"
                : "text-[var(--accent-red)]"
          }
        >
          {formatPercent(row.utilization)}
        </span>
      ),
    },
    {
      key: "effectiveRate",
      header: "Eff. Rate",
      align: "right" as const,
      render: (row: PersonRow) =>
        row.effectiveRate !== null
          ? `$${row.effectiveRate.toFixed(2)}/hr`
          : "—",
    },
    {
      key: "totalCost",
      header: "Total Cost",
      align: "right" as const,
      render: (row: PersonRow) => formatCurrency(row.totalCost),
    },
  ];

  const avgUtilization =
    people.length > 0
      ? people.reduce((s, p) => s + p.utilization, 0) / people.length
      : 0;

  return (
    <div className="p-6 space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Team & Utilization</h1>
          <p className="text-sm text-[var(--muted)] mt-0.5">
            {format(new Date(), "MMMM yyyy")} — Variable cost basis applied
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchPeople}
            className="flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--accent-blue)] transition-colors"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <a
            href="/people/new"
            className="flex items-center gap-1.5 rounded-md bg-[var(--accent-blue)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Person
          </a>
        </div>
      </div>

      {/* Key insight callout */}
      <div className="flex items-start gap-3 rounded-lg border border-[var(--accent-blue)]/30 bg-[var(--accent-blue)]/5 px-4 py-3">
        <Info className="h-4 w-4 text-[var(--accent-blue)] shrink-0 mt-0.5" />
        <p className="text-xs text-[var(--muted)]">
          <strong className="text-[var(--foreground)]">
            Variable Cost Insight:
          </strong>{" "}
          Salaried employees have a fixed monthly cost but variable per-hour
          cost. A lighter month means each hour costs more. Effective Rate =
          (Annual Salary × Burden Rate) ÷ 12 ÷ Actual Hours Worked.
        </p>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[var(--muted)] text-sm">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
            Loading team data…
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={people}
            keyField="personId"
            onRowClick={(row) => router.push(`/people/${row.personId}`)}
            emptyMessage="No team members found. Add people to get started."
          />
        )}
      </div>

      {people.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-xs text-[var(--muted)] uppercase tracking-wider">
              Avg Utilization
            </p>
            <p
              className={`font-mono text-xl font-semibold tabular-nums mt-1 ${avgUtilization >= 0.7 ? "text-[var(--accent-green)]" : "text-[var(--accent-amber)]"}`}
            >
              {formatPercent(avgUtilization)}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-xs text-[var(--muted)] uppercase tracking-wider">
              Total Hours
            </p>
            <p className="font-mono text-xl font-semibold tabular-nums mt-1">
              {people.reduce((s, p) => s + p.totalHours, 0).toFixed(0)}h
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-xs text-[var(--muted)] uppercase tracking-wider">
              Billable Hours
            </p>
            <p className="font-mono text-xl font-semibold tabular-nums mt-1">
              {people.reduce((s, p) => s + p.billableHours, 0).toFixed(0)}h
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-xs text-[var(--muted)] uppercase tracking-wider">
              Total Cost
            </p>
            <p className="font-mono text-xl font-semibold tabular-nums mt-1">
              {formatCurrency(people.reduce((s, p) => s + p.totalCost, 0))}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

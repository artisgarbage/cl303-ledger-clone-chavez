"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import { StatTile } from "@/components/shared/StatTile";
import { formatCurrency, formatPercent } from "@/lib/utils/currency";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface MonthlyData {
  month: string;
  label: string;
  totalHours: number;
  billableHours: number;
  utilization: number;
  effectiveRate: number | null;
  totalCost: number;
}

interface ProjectAllocation {
  projectId: string;
  name: string;
  hours: number;
  billableHours: number;
}

interface PersonDetail {
  person: {
    id: string;
    name: string;
    email: string | null;
    type: string;
    isActive: boolean;
  };
  compensation: {
    annualSalary: number | null;
    hourlyRate: number | null;
    burdenRate: number;
    effectiveDate: string;
  } | null;
  currentRate: number | null;
  ytd: {
    totalHours: number;
    billableHours: number;
    utilization: number;
    totalCost: number;
  };
  monthlyData: MonthlyData[];
  projectAllocation: ProjectAllocation[];
  allocations: Array<{
    id: string;
    projectId: string;
    projectName: string;
    startDate: string;
    endDate: string;
    hoursPerDay: number;
  }>;
}

const TYPE_COLORS: Record<string, string> = {
  SALARIED: "active",
  CONTRACTOR: "paused",
  PARTNER: "fund",
};

type BadgeVariant =
  | "default"
  | "amber"
  | "red"
  | "active"
  | "green"
  | "fund"
  | "frontier"
  | "completed"
  | "paused"
  | "lost";

export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<PersonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/people/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<PersonDetail>;
      })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-[var(--muted)]">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading person…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-[var(--accent-red)]">
        {error ?? "Person not found"}
      </div>
    );
  }

  const {
    person,
    compensation,
    currentRate,
    ytd,
    monthlyData,
    projectAllocation,
  } = data;
  const hasActivity = ytd.totalHours > 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.back()}
          className="mt-1 rounded-md p-1.5 hover:bg-[var(--surface-2)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-semibold">{person.name}</h1>
            <Badge
              variant={(TYPE_COLORS[person.type] ?? "default") as BadgeVariant}
            >
              {person.type}
            </Badge>
            {!person.isActive && <Badge variant="lost">Inactive</Badge>}
          </div>
          {person.email && (
            <p className="text-sm text-[var(--muted)] mt-0.5">{person.email}</p>
          )}
        </div>
        {compensation && (
          <div className="text-right text-sm text-[var(--muted)]">
            {compensation.annualSalary && (
              <p>
                Salary:{" "}
                <span className="font-mono text-[var(--foreground)]">
                  {formatCurrency(compensation.annualSalary)}/yr
                </span>
              </p>
            )}
            {compensation.hourlyRate && (
              <p>
                Rate:{" "}
                <span className="font-mono text-[var(--foreground)]">
                  {formatCurrency(compensation.hourlyRate)}/hr
                </span>
              </p>
            )}
            <p>Burden: {formatPercent(compensation.burdenRate - 1)}</p>
          </div>
        )}
      </div>

      {/* YTD stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="YTD Total Hours"
          value={ytd.totalHours}
          format="number"
        />
        <StatTile
          label="YTD Billable Hours"
          value={ytd.billableHours}
          format="number"
        />
        <StatTile
          label="YTD Utilization"
          value={ytd.utilization}
          format="percent"
          highlight={
            ytd.utilization >= 0.8
              ? "positive"
              : ytd.utilization >= 0.6
                ? "neutral"
                : "negative"
          }
        />
        <StatTile
          label="YTD Total Cost"
          value={ytd.totalCost}
          format="currency"
        />
      </div>

      {/* Effective rate tile */}
      {currentRate !== null && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <StatTile
            label="Current Effective Rate"
            value={currentRate}
            format="currency"
          />
        </div>
      )}

      {!hasActivity ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--muted)]">
          No time entries recorded for this person yet.
        </div>
      ) : (
        <>
          {/* Monthly hours chart */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-sm font-medium mb-4">
              Monthly Hours (Trailing 12 Months)
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} barSize={10} barGap={2}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                  formatter={(value) => [Number(value).toFixed(1) + "h", ""]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  iconType="square"
                />
                <Bar
                  dataKey="totalHours"
                  name="Total Hours"
                  fill="var(--accent-blue)"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="billableHours"
                  name="Billable Hours"
                  fill="var(--accent-green)"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Utilization trend */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-sm font-medium mb-4">Utilization Trend</h2>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={monthlyData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${(Number(v) * 100).toFixed(0)}%`}
                  domain={[0, 1]}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                  formatter={(value) => [
                    formatPercent(Number(value)),
                    "Utilization",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="utilization"
                  name="Utilization"
                  stroke="var(--accent-yellow)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Project allocation table */}
          {projectAllocation.length > 0 && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="text-sm font-medium mb-4">
                YTD Project Allocation
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--muted)] border-b border-[var(--border)]">
                    <th className="pb-2 font-medium">Project</th>
                    <th className="pb-2 font-medium text-right">Total Hours</th>
                    <th className="pb-2 font-medium text-right">
                      Billable Hours
                    </th>
                    <th className="pb-2 font-medium text-right">Billability</th>
                    <th className="pb-2 font-medium text-right">% of Time</th>
                  </tr>
                </thead>
                <tbody>
                  {projectAllocation.map((p) => {
                    const billability =
                      p.hours > 0 ? p.billableHours / p.hours : 0;
                    const pct =
                      ytd.totalHours > 0 ? p.hours / ytd.totalHours : 0;
                    return (
                      <tr
                        key={p.projectId}
                        className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] transition-colors"
                      >
                        <td className="py-2.5 font-medium">{p.name}</td>
                        <td className="py-2.5 text-right font-mono">
                          {p.hours.toFixed(1)}h
                        </td>
                        <td className="py-2.5 text-right font-mono">
                          {p.billableHours.toFixed(1)}h
                        </td>
                        <td className="py-2.5 text-right font-mono">
                          {formatPercent(billability)}
                        </td>
                        <td className="py-2.5 text-right font-mono">
                          {formatPercent(pct)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

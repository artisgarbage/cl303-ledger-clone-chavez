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
  revenue: number;
  cost: number;
  grossProfit: number;
  grossMargin: number;
  hours: number;
}

interface PersonCost {
  personId: string;
  personName: string;
  hours: number;
  cost: number;
}

interface ProjectDetail {
  project: {
    id: string;
    name: string;
    clientName: string | null;
    classification: string;
    status: string;
    contractValue: number | null;
    monthlyRetainer: number | null;
    startDate: string | null;
    endDate: string | null;
  };
  monthlyData: MonthlyData[];
  ytd: {
    revenue: number;
    cost: number;
    grossProfit: number;
    grossMargin: number;
    hours: number;
    billableHours: number;
    utilizationRate: number;
    effectiveBlendedRate: number;
    byPerson: PersonCost[];
  };
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<ProjectDetail>;
      })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-[var(--muted)]">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading project…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-[var(--accent-red)]">
        {error ?? "Project not found"}
      </div>
    );
  }

  const { project, monthlyData, ytd } = data;
  const hasActivity = ytd.hours > 0 || ytd.revenue > 0;

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
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <Badge
              variant={
                project.classification.toLowerCase() as "fund" | "frontier"
              }
            >
              {project.classification}
            </Badge>
            <Badge
              variant={
                project.status.toLowerCase() as
                  | "active"
                  | "completed"
                  | "paused"
                  | "lost"
              }
            >
              {project.status}
            </Badge>
          </div>
          {project.clientName && (
            <p className="text-sm text-[var(--muted)] mt-0.5">
              {project.clientName}
            </p>
          )}
        </div>
        <div className="text-right text-sm text-[var(--muted)]">
          {project.contractValue && (
            <p>
              Contract:{" "}
              <span className="font-mono text-[var(--foreground)]">
                {formatCurrency(project.contractValue)}
              </span>
            </p>
          )}
          {project.monthlyRetainer && (
            <p>
              Retainer:{" "}
              <span className="font-mono text-[var(--foreground)]">
                {formatCurrency(project.monthlyRetainer)}/mo
              </span>
            </p>
          )}
        </div>
      </div>

      {/* YTD stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="YTD Revenue" value={ytd.revenue} format="currency" />
        <StatTile
          label="YTD Gross Profit"
          value={ytd.grossProfit}
          format="currency"
          highlight={ytd.grossProfit >= 0 ? "positive" : "negative"}
        />
        <StatTile
          label="Gross Margin"
          value={ytd.grossMargin}
          format="percent"
          highlight={
            ytd.grossMargin >= 0.3
              ? "positive"
              : ytd.grossMargin >= 0.15
                ? "neutral"
                : "negative"
          }
        />
        <StatTile
          label="Blended Rate"
          value={ytd.effectiveBlendedRate}
          format="currency"
        />
      </div>

      {/* Secondary tiles */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Total Hours" value={ytd.hours} format="number" />
        <StatTile
          label="Billable Hours"
          value={ytd.billableHours}
          format="number"
        />
        <StatTile
          label="Utilization"
          value={ytd.utilizationRate}
          format="percent"
          highlight={
            ytd.utilizationRate >= 0.8
              ? "positive"
              : ytd.utilizationRate >= 0.6
                ? "neutral"
                : "negative"
          }
        />
      </div>

      {!hasActivity ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--muted)]">
          No time entries or revenue recorded for this project yet.
        </div>
      ) : (
        <>
          {/* Monthly P&L chart */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-sm font-medium mb-4">
              Monthly Revenue vs. True Cost
            </h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar
                  dataKey="revenue"
                  name="Revenue"
                  fill="var(--accent-blue)"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="cost"
                  name="True Cost"
                  fill="var(--accent-red)"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Margin trend */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-sm font-medium mb-4">Gross Margin Trend</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                  tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                  domain={[0, 1]}
                />
                <Tooltip
                  formatter={(value) => formatPercent(Number(value))}
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="grossMargin"
                  name="Gross Margin"
                  stroke="var(--accent-green)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Team cost breakdown */}
          {ytd.byPerson.length > 0 && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--border)]">
                <h2 className="text-sm font-medium">
                  Team Cost Contribution (YTD)
                </h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                      Person
                    </th>
                    <th className="px-5 py-2.5 text-right text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                      Hours
                    </th>
                    <th className="px-5 py-2.5 text-right text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                      True Cost
                    </th>
                    <th className="px-5 py-2.5 text-right text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                      % of Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ytd.byPerson
                    .sort((a, b) => b.cost - a.cost)
                    .map((p) => (
                      <tr
                        key={p.personId}
                        className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]"
                      >
                        <td className="px-5 py-3 font-medium">
                          {p.personName}
                        </td>
                        <td className="px-5 py-3 text-right font-mono tabular-nums text-[var(--muted)]">
                          {p.hours.toFixed(1)}h
                        </td>
                        <td className="px-5 py-3 text-right font-mono tabular-nums">
                          {formatCurrency(p.cost)}
                        </td>
                        <td className="px-5 py-3 text-right font-mono tabular-nums text-[var(--muted)]">
                          {ytd.cost > 0
                            ? formatPercent(p.cost / ytd.cost)
                            : "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[var(--border)] bg-[var(--surface-2)]">
                    <td className="px-5 py-3 font-medium text-[var(--muted)]">
                      Total
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums font-medium">
                      {ytd.hours.toFixed(1)}h
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums font-medium">
                      {formatCurrency(ytd.cost)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums text-[var(--muted)]">
                      100%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

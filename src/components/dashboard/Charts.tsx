"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import type { TooltipProps } from "recharts";
import type {
  ValueType,
  NameType,
} from "recharts/types/component/DefaultTooltipContent";
import { formatCurrency, formatPercent } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";

// ─── Data types ──────────────────────────────────────────────────────────────

export interface RevenuePoint {
  month: string;
  revenue: number;
  /** absolute $ change from previous period in the chart */
  revenueDelta?: number | null;
  /** percentage change from previous period */
  revenueDeltaPct?: number | null;
  /** label of the prior period shown in tooltip, e.g. "2024" */
  priorLabel?: string;
  /** comparison-mode value (second ghost bar series) */
  compareRevenue?: number | null;
  /** label for the comparison series */
  compareLabel?: string;
  /** True for projection points rendered with dashed/lighter style */
  isProjected?: boolean;
  /** Confidence 0–1, used in tooltip for projected points */
  confidence?: number;
}

export interface MarginPoint {
  month: string;
  /** Actual gross margin (null for projected-only points) */
  grossMargin: number | null;
  /** Projected gross margin (null for actual-only points, set on bridge + projected) */
  grossMarginProjected?: number | null;
  /** Actual net margin (null for projected-only points) */
  netMargin?: number | null;
  /** Projected net margin */
  netMarginProjected?: number | null;
  grossMarginDelta?: number | null;
  priorLabel?: string;
  isProjected?: boolean;
  /** Confidence level 0–1 for projected points */
  confidence?: number;
}

// ─── Revenue Tooltip ─────────────────────────────────────────────────────────

function RevenueTooltip(props: TooltipProps<ValueType, NameType>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { active, payload, label } = props as any;
  if (!active || !payload?.length) return null;

  const point: RevenuePoint = payload[0]?.payload ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const current = (payload.find((p: any) => p.dataKey === "revenue")?.value ??
    0) as number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const compare = payload.find((p: any) => p.dataKey === "compareRevenue")
    ?.value as number | undefined;

  const positive = (point.revenueDelta ?? 0) >= 0;
  const isProjected = point.isProjected ?? false;
  const confidence = point.confidence;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5 text-xs shadow-2xl min-w-44">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[var(--foreground)] font-semibold">
          {label as string}
        </p>
        {isProjected && (
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
            style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}
          >
            Projected
            {confidence != null ? ` · ${Math.round(confidence * 100)}%` : ""}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="text-[var(--muted)]">Revenue</span>
        <span
          className="font-mono"
          style={{ color: isProjected ? "#a78bfa" : "var(--foreground)" }}
        >
          {formatCurrency(current)}
        </span>
      </div>

      {compare != null && (
        <div className="flex items-center justify-between gap-4 mt-1">
          <span className="text-[var(--muted)]">
            {point.compareLabel ?? "Compare"}
          </span>
          <span className="font-mono text-[var(--muted)]">
            {formatCurrency(compare)}
          </span>
        </div>
      )}

      {point.revenueDelta != null && point.priorLabel && (
        <div className="mt-2.5 pt-2.5 border-t border-[var(--border)]">
          <p className="text-[var(--muted)] mb-1">vs {point.priorLabel}</p>
          <p
            className="font-mono font-semibold"
            style={{ color: positive ? "#34d399" : "#f87171" }}
          >
            {positive ? "+" : ""}
            {formatCurrency(point.revenueDelta)}
            {point.revenueDeltaPct != null && (
              <span className="ml-1.5 font-normal opacity-80 text-[0.9em]">
                ({positive ? "+" : ""}
                {(point.revenueDeltaPct * 100).toFixed(1)}%)
              </span>
            )}
          </p>
        </div>
      )}

      {isProjected && (
        <p className="mt-2 text-[10px]" style={{ color: "var(--muted)" }}>
          Based on historical trend
        </p>
      )}
    </div>
  );
}

// ─── Margin Tooltip ───────────────────────────────────────────────────────────

function MarginTooltip(props: TooltipProps<ValueType, NameType>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { active, payload, label } = props as any;
  if (!active || !payload?.length) return null;

  const point: MarginPoint = payload[0]?.payload ?? {};

  // Pick up either actual or projected gross/net margin
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const grossActual = payload.find((p: any) => p.dataKey === "grossMargin")
    ?.value as number | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const grossProj = payload.find(
    (p: any) => p.dataKey === "grossMarginProjected",
  )?.value as number | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const netActual = payload.find((p: any) => p.dataKey === "netMargin")
    ?.value as number | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const netProj = payload.find((p: any) => p.dataKey === "netMarginProjected")
    ?.value as number | undefined;

  const gross = grossActual ?? grossProj;
  const net = netActual ?? netProj;
  const isProjected = grossActual == null && grossProj != null;
  const confidence = point.confidence;

  if (gross == null) return null;

  const deltaPositive = (point.grossMarginDelta ?? 0) >= 0;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5 text-xs shadow-2xl min-w-44">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[var(--foreground)] font-semibold">
          {label as string}
        </p>
        {isProjected && (
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
            style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}
          >
            Projected
            {confidence != null
              ? ` · ${Math.round((confidence as number) * 100)}%`
              : ""}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="text-[var(--muted)]">Gross Margin</span>
        <span
          className="font-mono"
          style={{ color: isProjected ? "#6ee7b7" : "#34d399" }}
        >
          {formatPercent(gross)}
          {isProjected && <span className="opacity-60"> est.</span>}
        </span>
      </div>

      {net != null && (
        <div className="flex items-center justify-between gap-4 mt-1">
          <span className="text-[var(--muted)]">Net Margin</span>
          <span
            className="font-mono"
            style={{
              color:
                net >= 0 ? (isProjected ? "#93c5fd" : "#60a5fa") : "#f87171",
            }}
          >
            {formatPercent(net)}
            {isProjected && <span className="opacity-60"> est.</span>}
          </span>
        </div>
      )}

      {point.grossMarginDelta != null && point.priorLabel && (
        <div className="mt-2.5 pt-2.5 border-t border-[var(--border)]">
          <p className="text-[var(--muted)] mb-1">vs {point.priorLabel}</p>
          <p
            className="font-mono font-semibold"
            style={{ color: deltaPositive ? "#34d399" : "#f87171" }}
          >
            {deltaPositive ? "+" : ""}
            {(point.grossMarginDelta * 100).toFixed(1)} pp
          </p>
        </div>
      )}

      {isProjected && (
        <p className="mt-2 text-[10px]" style={{ color: "var(--muted)" }}>
          Based on historical trend
        </p>
      )}
    </div>
  );
}

// ─── RevenueTrendChart ────────────────────────────────────────────────────────

type ChartHeight = number | `${number}%`;

interface RevenueTrendChartProps {
  data: RevenuePoint[];
  height?: ChartHeight;
}

export function RevenueTrendChart({
  data,
  height = 220,
}: RevenueTrendChartProps) {
  const hasCompare = data.some((d) => d.compareRevenue != null);
  const hasProjections = data.some((d) => d.isProjected);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
        barCategoryGap={hasCompare ? "20%" : "30%"}
        barGap={4}
      >
        <defs>
          <pattern
            id="proj-stripe"
            x="0"
            y="0"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="4" height="8" fill="#818cf8" opacity="0.55" />
          </pattern>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fill: "var(--muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => formatCurrency(v, { compact: true })}
          tick={{ fill: "var(--muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip
          content={<RevenueTooltip />}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        {(hasCompare || hasProjections) && (
          <Legend
            iconType="square"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: "var(--muted)" }}
          />
        )}
        <Bar dataKey="revenue" radius={[3, 3, 0, 0]} name="Revenue">
          {data.map((entry, idx) => (
            <Cell
              key={idx}
              fill={entry.isProjected ? "url(#proj-stripe)" : "#3b82f6"}
            />
          ))}
        </Bar>
        {hasCompare && (
          <Bar
            dataKey="compareRevenue"
            fill="#3b82f6"
            fillOpacity={0.28}
            radius={[3, 3, 0, 0]}
            name={data[0]?.compareLabel ?? "Comparison"}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── MarginTrendChart ─────────────────────────────────────────────────────────

interface MarginTrendChartProps {
  data: MarginPoint[];
  targetMin?: number;
  targetMax?: number;
  height?: ChartHeight;
}

export function MarginTrendChart({
  data,
  targetMin = 0.28,
  targetMax = 0.32,
  height = 220,
}: MarginTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fill: "var(--muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => formatPercent(v, 0)}
          tick={{ fill: "var(--muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={40}
          domain={[0, 1]}
        />
        <Tooltip
          content={<MarginTooltip />}
          cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
        />
        <ReferenceLine
          y={targetMin}
          stroke="var(--accent-amber)"
          strokeDasharray="4 4"
          strokeOpacity={0.6}
        />
        <ReferenceLine
          y={targetMax}
          stroke="var(--accent-amber)"
          strokeDasharray="4 4"
          strokeOpacity={0.6}
        />
        {/* Actual gross margin line */}
        <Line
          type="monotone"
          dataKey="grossMargin"
          stroke="#22c55e"
          strokeWidth={2}
          dot={{ r: 4, fill: "#22c55e", strokeWidth: 0 }}
          activeDot={{ r: 6, fill: "#22c55e" }}
          name="Gross Margin"
          connectNulls={false}
        />
        {/* Projected gross margin line (dashed, connected from last actual) */}
        {data.some((d) => d.grossMarginProjected != null) && (
          <Line
            type="monotone"
            dataKey="grossMarginProjected"
            stroke="#22c55e"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            strokeOpacity={0.55}
            dot={false}
            activeDot={{ r: 4, fill: "#22c55e", fillOpacity: 0.6 }}
            name="Gross Margin (proj.)"
            legendType="none"
            connectNulls={false}
          />
        )}
        {/* Actual net margin line */}
        {data.some(
          (d) => d.netMargin !== undefined && d.netMargin !== null,
        ) && (
          <Line
            type="monotone"
            dataKey="netMargin"
            stroke="#3b82f6"
            strokeWidth={1.5}
            dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#3b82f6" }}
            name="Net Margin"
            connectNulls={false}
          />
        )}
        {/* Projected net margin line (dashed) */}
        {data.some((d) => d.netMarginProjected != null) && (
          <Line
            type="monotone"
            dataKey="netMarginProjected"
            stroke="#3b82f6"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            strokeOpacity={0.5}
            dot={false}
            activeDot={{ r: 4, fill: "#3b82f6", fillOpacity: 0.6 }}
            name="Net Margin (proj.)"
            legendType="none"
            connectNulls={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── DeltaBadge (inline comparison badge) ────────────────────────────────────

interface DeltaBadgeProps {
  current: number;
  prior: number;
  format?: "currency" | "percent" | "pp";
  /** When false, hides the parenthetical % relative change (useful for margin metrics). */
  showPct?: boolean;
  className?: string;
}

export function DeltaBadge({
  current,
  prior,
  format = "currency",
  showPct = true,
  className,
}: DeltaBadgeProps) {
  if (prior === 0) return null;
  const absDelta = current - prior;
  const pct = (absDelta / Math.abs(prior)) * 100;
  const positive = absDelta >= 0;

  // "percent" and "pp" both treat values as decimal fractions and show pp change.
  // e.g. grossMargin delta of 0.05 → "+5.0 pp"
  const isPct = format === "percent" || format === "pp";

  const formatted = isPct
    ? `${positive ? "+" : ""}${(absDelta * 100).toFixed(1)} pp`
    : `${positive ? "+" : ""}${formatCurrency(absDelta)}`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium font-mono",
        positive
          ? "bg-emerald-500/10 text-emerald-400"
          : "bg-red-500/10 text-red-400",
        className,
      )}
    >
      {formatted}
      {showPct && !isPct && (
        <span className="opacity-70">
          ({positive ? "+" : ""}
          {pct.toFixed(1)}%)
        </span>
      )}
    </span>
  );
}

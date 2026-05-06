"use client";

import { useState } from "react";
import { StatTile } from "@/components/shared/StatTile";
import {
  RevenueTrendChart,
  MarginTrendChart,
  DeltaBadge,
} from "@/components/dashboard/Charts";
import { FullscreenChart } from "@/components/shared/FullscreenChart";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { formatCurrency, formatPercent } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";
import {
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  CalendarClock,
  Zap,
  Target,
} from "lucide-react";
import { format } from "date-fns";
import type { PeriodSummary } from "@/lib/engine/period-comparison";
import {
  selectComparedPeriod,
  computePeriodDeltas,
  COMPARE_MODE_LABELS,
  type CompareMode,
} from "@/lib/utils/comparison";
import type {
  RevenueVelocity,
  ProRateResult,
  EOYProjection,
} from "@/lib/utils/projection";
import type { ChartPoint } from "@/lib/utils/chart-data";

// ─── Types ────────────────────────────────────────────────────────────────────

const COMPARE_OPTIONS: Array<{ value: CompareMode; label: string }> = [
  { value: "none", label: COMPARE_MODE_LABELS.none },
  { value: "prior_period", label: COMPARE_MODE_LABELS.prior_period },
  { value: "mom", label: COMPARE_MODE_LABELS.mom },
  { value: "qoq", label: COMPARE_MODE_LABELS.qoq },
  { value: "yoy", label: COMPARE_MODE_LABELS.yoy },
];

interface DashboardClientProps {
  allPeriods: PeriodSummary[];
  currentPeriod: PeriodSummary | null;
  priorPeriod: PeriodSummary | null;
  chartData: ChartPoint[];
  contractorLag: number;
  latestNarrative: {
    id: string;
    content: string;
    generatedAt: Date;
    title: string;
  } | null;
  settings: {
    grossMarginTargetMin: number;
    grossMarginTargetMax: number;
    revenueTarget: number | null;
  };
  companyId: string;
  arr: number | null;
  proratedMTD: ProRateResult | null;
  eoyProjection: EOYProjection | null;
  dataAsOf: string | null;
  today: string;
  velocity: RevenueVelocity;
}

// ─── DataStalenessIndicator ───────────────────────────────────────────────────

function DataStalenessIndicator({
  dataAsOf,
  today,
}: {
  dataAsOf: string;
  today: string;
}) {
  const dataDate = new Date(dataAsOf);
  const todayDate = new Date(today);
  const diffDays = Math.floor(
    (todayDate.getTime() - dataDate.getTime()) / 86_400_000,
  );
  const diffMonths = Math.floor(diffDays / 30.44);

  const isStale = diffDays > 45;
  const label =
    diffMonths >= 2
      ? `${diffMonths} months ago`
      : diffDays === 0
        ? "Today"
        : `${diffDays}d ago`;

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
      style={{
        background: isStale ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)",
        color: isStale ? "var(--accent-amber)" : "var(--accent-green)",
        border: `1px solid ${isStale ? "rgba(245,158,11,0.25)" : "rgba(34,197,94,0.2)"}`,
      }}
    >
      <CalendarClock className="h-3 w-3" />
      Data through {format(dataDate, "MMM d, yyyy")} · {label}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DashboardClient({
  allPeriods,
  currentPeriod,
  priorPeriod,
  chartData,
  contractorLag,
  latestNarrative,
  settings,
  companyId: _companyId,
  arr,
  proratedMTD,
  eoyProjection,
  dataAsOf,
  today,
  velocity,
}: DashboardClientProps) {
  const [compareMode, setCompareMode] = useState<CompareMode>("prior_period");
  const [generatingNarrative, setGeneratingNarrative] = useState(false);
  const [narrative, setNarrative] = useState(latestNarrative);

  // ── Derived comparison ────────────────────────────────────────────────────
  const comparedPeriod = selectComparedPeriod(
    allPeriods,
    currentPeriod,
    compareMode,
    priorPeriod,
  );

  const { revDelta, grossProfitDelta, marginDelta, netDelta } = currentPeriod
    ? computePeriodDeltas(currentPeriod, comparedPeriod)
    : {
        revDelta: null,
        grossProfitDelta: null,
        marginDelta: null,
        netDelta: null,
      };

  const compareModeLabel =
    COMPARE_OPTIONS.find((o) => o.value === compareMode)?.label ?? "";
  const comparedPeriodLabel = comparedPeriod
    ? `${format(new Date(comparedPeriod.periodStart), "MMM d")}–${format(new Date(comparedPeriod.periodEnd), "MMM d, yyyy")}`
    : null;

  const todayDate = new Date(today);
  const currentYear = todayDate.getFullYear();

  // ── YTD progress toward target ────────────────────────────────────────────
  const revenueTarget = settings.revenueTarget;
  const eoyTotal = eoyProjection?.total ?? null;
  const targetPct =
    revenueTarget && eoyTotal ? Math.min(1, eoyTotal / revenueTarget) : null;
  const ytdActualPct =
    revenueTarget && eoyProjection
      ? Math.min(1, eoyProjection.ytdActual / revenueTarget)
      : null;

  // ── Narrative regeneration ────────────────────────────────────────────────
  async function regenerateNarrative() {
    if (!currentPeriod) return;
    setGeneratingNarrative(true);
    try {
      const res = await fetch("/api/analysis/narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "MONTHLY_SUMMARY",
          periodStart: currentPeriod.periodStart,
          periodEnd: currentPeriod.periodEnd,
          basis: currentPeriod.basis,
          compareMode: compareMode !== "none" ? compareMode : undefined,
          comparePeriodStart: comparedPeriod?.periodStart,
          comparePeriodEnd: comparedPeriod?.periodEnd,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          narrativeId: string;
          content: string;
        };
        setNarrative({
          id: data.narrativeId,
          content: data.content,
          generatedAt: new Date(),
          title: `Summary · ${compareModeLabel !== "None" ? `${compareModeLabel} comparison` : "No comparison"}`,
        });
      }
    } finally {
      setGeneratingNarrative(false);
    }
  }

  const VelocityIcon =
    velocity.direction === "growing"
      ? TrendingUp
      : velocity.direction === "declining"
        ? TrendingDown
        : Minus;

  const velocityColor =
    velocity.direction === "growing"
      ? "var(--accent-green)"
      : velocity.direction === "declining"
        ? "var(--accent-red)"
        : "var(--muted)";

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            {dataAsOf && (
              <DataStalenessIndicator dataAsOf={dataAsOf} today={today} />
            )}
          </div>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {currentPeriod
              ? `Latest period: ${format(new Date(currentPeriod.periodStart), "MMM d")} – ${format(new Date(currentPeriod.periodEnd), "MMM d, yyyy")} · ${currentPeriod.basis}`
              : "No data imported yet"}
          </p>
          <p
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Today: {format(todayDate, "MMMM d, yyyy")}
          </p>
        </div>

        {/* Compare mode pill selector */}
        {currentPeriod && (
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-xs shrink-0"
              style={{ color: "var(--muted)" }}
            >
              Compare to:
            </span>
            <div
              className="flex items-center rounded-lg border p-0.5 gap-0.5"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
              }}
            >
              {COMPARE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setCompareMode(opt.value)}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-md transition-colors font-medium",
                    compareMode === opt.value
                      ? "text-white shadow-sm"
                      : "hover:bg-[var(--surface-2)]",
                  )}
                  style={
                    compareMode === opt.value
                      ? { background: "var(--accent-blue)", color: "white" }
                      : { color: "var(--muted)" }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Contractor lag warning ── */}
      {contractorLag > 10_000 && (
        <div
          className="flex items-center gap-3 rounded-lg border px-4 py-3"
          style={{
            borderColor: "rgba(245,158,11,0.4)",
            background: "rgba(245,158,11,0.08)",
          }}
        >
          <AlertTriangle
            className="h-4 w-4 shrink-0"
            style={{ color: "var(--accent-amber)" }}
          />
          <p className="text-sm" style={{ color: "var(--accent-amber)" }}>
            Estimated uninvoiced contractor cost:{" "}
            <strong>{formatCurrency(contractorLag)}</strong>. COGS may be
            understated.
          </p>
        </div>
      )}

      {/* ── No data state ── */}
      {!currentPeriod && (
        <div
          className="rounded-lg border border-dashed p-12 text-center"
          style={{ borderColor: "var(--border)" }}
        >
          <p className="mb-3" style={{ color: "var(--muted)" }}>
            No financial data imported yet.
          </p>
          <a
            href="/imports"
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white"
            style={{ background: "var(--accent-blue)" }}
          >
            Import QuickBooks P&amp;L
          </a>
        </div>
      )}

      {/* ── Key metrics ─────────────────────────────────────────────────── */}
      {currentPeriod && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatTile
            label="Revenue"
            value={currentPeriod.totalRevenue}
            delta={revDelta}
            deltaLabel={
              compareMode !== "none" ? `vs ${compareModeLabel}` : undefined
            }
          />
          <StatTile
            label="Gross Profit"
            value={currentPeriod.grossProfit}
            highlight={currentPeriod.grossProfit > 0 ? "positive" : "negative"}
            delta={grossProfitDelta}
            deltaLabel={
              compareMode !== "none" ? `vs ${compareModeLabel}` : undefined
            }
          />
          <StatTile
            label="Gross Margin"
            value={currentPeriod.grossMargin}
            format="percent"
            highlight={
              currentPeriod.grossMargin >= settings.grossMarginTargetMin
                ? "positive"
                : "negative"
            }
            delta={marginDelta}
            deltaLabel={
              compareMode !== "none" ? `vs ${compareModeLabel}` : undefined
            }
          />
          <StatTile
            label="Net Income"
            value={currentPeriod.netIncome}
            highlight={currentPeriod.netIncome > 0 ? "positive" : "negative"}
            delta={netDelta}
            deltaLabel={
              compareMode !== "none" ? `vs ${compareModeLabel}` : undefined
            }
          />
          <StatTile
            label="Net Margin"
            value={currentPeriod.netMargin}
            format="percent"
            highlight={currentPeriod.netMargin > 0 ? "positive" : "negative"}
          />
        </div>
      )}

      {/* ── Comparison strip ────────────────────────────────────────────── */}
      {currentPeriod && comparedPeriod && (
        <div
          className="rounded-xl border px-5 py-4"
          style={{
            borderColor: "var(--border-subtle)",
            background: "var(--surface)",
          }}
        >
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="shrink-0">
              <p
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "var(--muted)" }}
              >
                {compareModeLabel} Comparison
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                vs {comparedPeriodLabel}
              </p>
            </div>
            <div
              className="h-8 w-px shrink-0 hidden sm:block"
              style={{ background: "var(--border)" }}
            />
            {(
              [
                {
                  label: "Revenue",
                  current: currentPeriod.totalRevenue,
                  prior: comparedPeriod.totalRevenue,
                  fmt: "currency",
                },
                {
                  label: "Gross Profit",
                  current: currentPeriod.grossProfit,
                  prior: comparedPeriod.grossProfit,
                  fmt: "currency",
                },
                {
                  label: "Gross Margin",
                  current: currentPeriod.grossMargin,
                  prior: comparedPeriod.grossMargin,
                  fmt: "percent",
                },
                {
                  label: "Net Income",
                  current: currentPeriod.netIncome,
                  prior: comparedPeriod.netIncome,
                  fmt: "currency",
                },
              ] as const
            ).map(({ label, current, prior, fmt }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span
                  className="text-[10px] uppercase tracking-wider"
                  style={{ color: "var(--muted)" }}
                >
                  {label}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className="font-mono text-sm font-semibold"
                    style={{ color: "var(--foreground)" }}
                  >
                    {fmt === "currency"
                      ? formatCurrency(current)
                      : formatPercent(current)}
                  </span>
                  <DeltaBadge
                    current={current}
                    prior={prior}
                    format={fmt === "percent" ? "pp" : "currency"}
                    showPct={fmt !== "percent"}
                  />
                </div>
                <span
                  className="font-mono text-[11px]"
                  style={{ color: "var(--muted)" }}
                >
                  was{" "}
                  {fmt === "currency"
                    ? formatCurrency(prior)
                    : formatPercent(prior)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Forward-looking insights strip ──────────────────────────────── */}
      {currentPeriod &&
        (arr != null || proratedMTD != null || eoyProjection != null) && (
          <div
            className="rounded-xl border overflow-hidden"
            style={{
              borderColor: "rgba(139,92,246,0.25)",
              background: "var(--surface)",
            }}
          >
            {/* Strip header */}
            <div
              className="px-5 py-2.5 border-b flex items-center justify-between"
              style={{
                borderColor: "rgba(139,92,246,0.15)",
                background:
                  "linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(99,102,241,0.04) 100%)",
              }}
            >
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5" style={{ color: "#a78bfa" }} />
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: "#a78bfa" }}
                >
                  Forward Estimates · Projection
                </p>
              </div>
              <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                Based on historical trend · Dashed lines on charts
              </p>
            </div>

            <div className="px-5 py-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* This month (pro-rated) */}
              {proratedMTD && (
                <div>
                  <p
                    className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: "var(--muted)" }}
                  >
                    {proratedMTD.monthName} (MTD)
                  </p>
                  <p
                    className="text-xl font-mono font-bold tabular-nums"
                    style={{ color: "#a78bfa" }}
                  >
                    {formatCurrency(proratedMTD.estimatedMTD)}
                  </p>
                  <p
                    className="text-[11px] mt-1"
                    style={{ color: "var(--muted)" }}
                  >
                    {proratedMTD.daysElapsed} of {proratedMTD.daysInMonth} days
                    elapsed
                  </p>
                  <div
                    className="mt-2 rounded-full overflow-hidden h-1"
                    style={{ background: "var(--surface-2)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(proratedMTD.daysElapsed / proratedMTD.daysInMonth) * 100}%`,
                        background: "linear-gradient(90deg, #818cf8, #a78bfa)",
                      }}
                    />
                  </div>
                  <p
                    className="text-[11px] mt-1.5"
                    style={{ color: "var(--muted)" }}
                  >
                    Full month est.:{" "}
                    {formatCurrency(proratedMTD.projectedFullMonth)}
                  </p>
                </div>
              )}

              {/* Annualized Run Rate */}
              {arr != null && (
                <div>
                  <p
                    className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: "var(--muted)" }}
                  >
                    Annualized Run Rate
                  </p>
                  <p
                    className="text-xl font-mono font-bold tabular-nums"
                    style={{ color: "#a78bfa" }}
                  >
                    {formatCurrency(arr, { compact: true })}/yr
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <VelocityIcon
                      className="h-3.5 w-3.5"
                      style={{ color: velocityColor }}
                    />
                    <p className="text-[11px]" style={{ color: velocityColor }}>
                      {velocity.direction === "flat"
                        ? "Flat trend"
                        : `${velocity.direction === "growing" ? "+" : ""}${
                            velocity.monthlyDeltaPct != null
                              ? (velocity.monthlyDeltaPct * 100).toFixed(1)
                              : "—"
                          }%/mo trend`}
                    </p>
                  </div>
                  <p
                    className="text-[11px] mt-1"
                    style={{ color: "var(--muted)" }}
                  >
                    Based on last period daily rate
                  </p>
                </div>
              )}

              {/* EOY projection */}
              {eoyProjection && (
                <div>
                  <p
                    className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: "var(--muted)" }}
                  >
                    Projected {currentYear} EOY
                  </p>
                  <p
                    className="text-xl font-mono font-bold tabular-nums"
                    style={{ color: "#a78bfa" }}
                  >
                    {formatCurrency(eoyProjection.total, { compact: true })}
                  </p>
                  <div className="mt-1.5 space-y-0.5">
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--muted)" }}
                    >
                      YTD actual:{" "}
                      {formatCurrency(eoyProjection.ytdActual, {
                        compact: true,
                      })}
                    </p>
                    {eoyProjection.remainingMonths > 0 && (
                      <p
                        className="text-[11px]"
                        style={{ color: "var(--muted)" }}
                      >
                        +
                        {formatCurrency(eoyProjection.projectedRemaining, {
                          compact: true,
                        })}{" "}
                        projected ({eoyProjection.remainingMonths} mo.)
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Target tracking */}
              {revenueTarget && eoyProjection && targetPct != null && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Target
                      className="h-3 w-3"
                      style={{ color: "var(--muted)" }}
                    />
                    <p
                      className="text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: "var(--muted)" }}
                    >
                      {currentYear} Target
                    </p>
                  </div>
                  <p
                    className="text-xl font-mono font-bold tabular-nums"
                    style={{ color: "var(--foreground)" }}
                  >
                    {formatCurrency(revenueTarget, { compact: true })}
                  </p>

                  {/* Progress bar: actual + projected */}
                  <div
                    className="mt-2 rounded-full overflow-hidden h-2"
                    style={{ background: "var(--surface-2)" }}
                  >
                    <div
                      className="h-full relative rounded-full overflow-hidden"
                      style={{ width: `${targetPct * 100}%` }}
                    >
                      <div
                        className="absolute left-0 top-0 h-full"
                        style={{
                          width:
                            ytdActualPct != null
                              ? `${(ytdActualPct / targetPct) * 100}%`
                              : "0%",
                          background:
                            targetPct >= 1
                              ? "var(--accent-green)"
                              : "var(--accent-blue)",
                        }}
                      />
                      <div
                        className="absolute top-0 h-full"
                        style={{
                          left:
                            ytdActualPct != null
                              ? `${(ytdActualPct / targetPct) * 100}%`
                              : "0%",
                          right: "0%",
                          background:
                            targetPct >= 1
                              ? "rgba(34,197,94,0.4)"
                              : "rgba(79,142,247,0.35)",
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--muted)" }}
                    >
                      {(targetPct * 100).toFixed(0)}% projected
                    </p>
                    <p
                      className="text-[11px] font-semibold"
                      style={{
                        color:
                          targetPct >= 1
                            ? "var(--accent-green)"
                            : "var(--accent-amber)",
                      }}
                    >
                      {targetPct >= 1
                        ? "On track ✓"
                        : `${formatCurrency(revenueTarget - eoyProjection.total, { compact: true })} gap`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      {/* ── Charts (with projections as dashed bars/lines) ───────────────── */}
      {chartData.some((d) => d.revenue > 0) && (
        <div className="grid lg:grid-cols-2 gap-4">
          <FullscreenChart
            title="Revenue by Period"
            subtitle={
              chartData.some((d) => d.isProjected)
                ? "Dashed pattern = projection"
                : undefined
            }
          >
            {(isFs) => (
              <RevenueTrendChart
                data={chartData}
                height={isFs ? ("100%" as `${number}%`) : 240}
              />
            )}
          </FullscreenChart>

          <FullscreenChart
            title="Margin Trend"
            subtitle={`Target: ${(settings.grossMarginTargetMin * 100).toFixed(0)}%–${(settings.grossMarginTargetMax * 100).toFixed(0)}% · Dashed = projection`}
          >
            {(isFs) => (
              <MarginTrendChart
                data={chartData}
                targetMin={settings.grossMarginTargetMin}
                targetMax={settings.grossMarginTargetMax}
                height={isFs ? ("100%" as `${number}%`) : 240}
              />
            )}
          </FullscreenChart>
        </div>
      )}

      {/* ── Adjusted margin if contractor lag ── */}
      {currentPeriod && contractorLag > 0 && (
        <div
          className="rounded-lg border p-4"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <p
            className="text-xs font-medium uppercase tracking-wider mb-2"
            style={{ color: "var(--muted)" }}
          >
            Adjusted for Contractor Lag
          </p>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Adj. COGS
              </p>
              <p className="font-mono text-lg font-semibold tabular-nums">
                {formatCurrency(
                  (currentPeriod.adjustedCOGS ?? currentPeriod.totalCOGS) +
                    contractorLag,
                )}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Adj. Gross Margin
              </p>
              <p
                className="font-mono text-lg font-semibold tabular-nums"
                style={{ color: "var(--accent-amber)" }}
              >
                {currentPeriod.totalRevenue > 0
                  ? (
                      ((currentPeriod.grossProfit - contractorLag) /
                        currentPeriod.totalRevenue) *
                      100
                    ).toFixed(1)
                  : "0.0"}
                %
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Uninvoiced
              </p>
              <p
                className="font-mono text-lg font-semibold tabular-nums"
                style={{ color: "var(--accent-amber)" }}
              >
                {formatCurrency(contractorLag)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── COGS breakdown ── */}
      {currentPeriod &&
        (currentPeriod.cogsPayroll || currentPeriod.cogsContractors) && (
          <div
            className="rounded-lg border p-4"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
            }}
          >
            <h2 className="text-sm font-medium mb-4">COGS Breakdown</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  Payroll
                </p>
                <p className="font-mono font-semibold tabular-nums">
                  {formatCurrency(currentPeriod.cogsPayroll ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  Contractors
                </p>
                <p className="font-mono font-semibold tabular-nums">
                  {formatCurrency(currentPeriod.cogsContractors ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  Software
                </p>
                <p className="font-mono font-semibold tabular-nums">
                  {formatCurrency(currentPeriod.cogsSoftware ?? 0)}
                </p>
              </div>
            </div>
          </div>
        )}

      {/* ── AI Narrative ─────────────────────────────────────────────────── */}
      <div
        className="rounded-lg border p-5"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-medium">
              {narrative?.title ?? "AI Financial Narrative"}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              {narrative
                ? `Generated ${format(new Date(narrative.generatedAt), "MMM d, yyyy h:mm a")}`
                : compareMode !== "none" && comparedPeriod
                  ? `Will include ${compareModeLabel} comparison when generated`
                  : ""}
            </p>
          </div>
          <button
            onClick={() => void regenerateNarrative()}
            disabled={generatingNarrative || !currentPeriod}
            className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
            style={{ borderColor: "var(--border)" }}
          >
            <RefreshCw
              className={cn("h-3 w-3", generatingNarrative && "animate-spin")}
            />
            {generatingNarrative ? "Generating…" : "Regenerate"}
          </button>
        </div>
        {narrative ? (
          <MarkdownRenderer content={narrative.content} />
        ) : (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {currentPeriod
              ? "Click Regenerate to generate an AI narrative for the current period."
              : "Import financial data to generate AI narratives."}
          </p>
        )}
      </div>
    </div>
  );
}

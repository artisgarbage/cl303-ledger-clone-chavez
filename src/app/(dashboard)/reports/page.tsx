"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { RefreshCw, FileText, Plus, ChevronDown, Sparkles, AlertTriangle, X } from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { NarrativeType, AccountingBasis } from "@prisma/client";
import { getPeriodRange, formatPeriodLabel, type PeriodPreset } from "@/lib/utils/dates";

interface NarrativeItem {
  id: string;
  type: NarrativeType;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  content: string;
  title: string | null;
  basis: AccountingBasis;
}

const REPORT_TYPES: Array<{
  type: NarrativeType;
  label: string;
  description: string;
  badge?: string;
}> = [
  {
    type: NarrativeType.MONTHLY_SUMMARY,
    label: "Monthly Summary",
    description: "Full P&L narrative with key signals",
    badge: "Popular",
  },
  {
    type: NarrativeType.QUARTERLY_REVIEW,
    label: "Quarterly Review",
    description: "Quarter performance and trends",
  },
  {
    type: NarrativeType.YEAR_OVER_YEAR,
    label: "Year-over-Year",
    description: "Annual comparison analysis",
  },
  {
    type: NarrativeType.MARGIN_ANALYSIS,
    label: "Margin Analysis",
    description: "Gross and net margin drivers",
  },
  {
    type: NarrativeType.CASH_VS_ACCRUAL,
    label: "Cash vs. Accrual",
    description: "Reconciliation and delta explanation",
  },
  {
    type: NarrativeType.CUSTOM,
    label: "Custom Query",
    description: "Ask Claude any financial question",
    badge: "AI",
  },
];

const TYPE_BADGE: Partial<
  Record<
    NarrativeType,
    "active" | "fund" | "amber" | "default" | "green" | "paused"
  >
> = {
  MONTHLY_SUMMARY: "active",
  QUARTERLY_REVIEW: "fund",
  YEAR_OVER_YEAR: "green",
  MARGIN_ANALYSIS: "amber",
  CASH_VS_ACCRUAL: "paused",
  CUSTOM: "default",
};

const PRESETS: Array<{ value: PeriodPreset; label: string }> = [
  { value: "current_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "current_quarter", label: "This Quarter" },
  { value: "last_quarter", label: "Last Quarter" },
  { value: "ytd", label: "Year to Date" },
  { value: "trailing_12", label: "Trailing 12M" },
  { value: "last_year", label: "Last Year" },
  { value: "custom", label: "Custom Range" },
];

const SUGGESTED_QUERIES = [
  "What's our revenue run rate and are we on track for the year?",
  "Where are we losing margin and what should we do about it?",
  "How does our 2025 performance compare to 2024?",
  "What are the top three financial risks we should be watching?",
];

function getRelativePeriodLabel(start: Date, end: Date, type: NarrativeType): string {
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  
  // Full year
  if (start.getMonth() === 0 && start.getDate() === 1 &&
      end.getMonth() === 11 && end.getDate() === 31 &&
      startYear === endYear) {
    return `Full Year ${startYear}`;
  }
  
  // Quarter
  if (type === NarrativeType.QUARTERLY_REVIEW) {
    const quarter = Math.ceil((start.getMonth() + 1) / 3);
    return `Q${quarter} ${startYear}`;
  }
  
  // Single month
  if (start.getMonth() === end.getMonth() && startYear === endYear) {
    return format(start, "MMMM yyyy");
  }
  
  // YTD
  if (start.getMonth() === 0 && start.getDate() === 1) {
    return `${format(end, "MMMM yyyy")} YTD`;
  }
  
  // Fall back to formatted range
  return formatPeriodLabel(start, end);
}

export default function ReportsPage() {
  const [narratives, setNarratives] = useState<NarrativeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<NarrativeType>(
    NarrativeType.MONTHLY_SUMMARY,
  );
  const [customQuestion, setCustomQuestion] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  
  // Period controls state
  const [preset, setPreset] = useState<PeriodPreset>("last_month");
  const [basis, setBasis] = useState<AccountingBasis>(AccountingBasis.CASH);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [presetDropdownOpen, setPresetDropdownOpen] = useState(false);

  useEffect(() => {
    fetch("/api/analysis/narrative?limit=20")
      .then((r) => r.json())
      .then((data) => {
        setNarratives(data as NarrativeItem[]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Get the current period range
  const periodRange = getPeriodRange(
    preset,
    customStart ? new Date(customStart) : undefined,
    customEnd ? new Date(customEnd) : undefined
  );

  async function generate() {
    // Clear previous errors
    setError(null);
    
    // Validate custom dates
    if (preset === "custom") {
      if (!customStart || !customEnd) {
        setError("Please select both start and end dates for custom range.");
        return;
      }
      const start = new Date(customStart);
      const end = new Date(customEnd);
      if (end < start) {
        setError("End date must be on or after start date.");
        return;
      }
    }
    
    // Validate custom query
    if (selectedType === NarrativeType.CUSTOM) {
      if (!customQuestion.trim()) {
        setError("Please enter a question for custom query.");
        return;
      }
      if (customQuestion.length > 500) {
        setError("Question must be 500 characters or less.");
        return;
      }
    }

    setGenerating(selectedType);

    try {
      const res = await fetch("/api/analysis/narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          periodStart: periodRange.start.toISOString(),
          periodEnd: periodRange.end.toISOString(),
          basis,
          question:
            selectedType === NarrativeType.CUSTOM ? customQuestion : undefined,
        }),
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({}))) as { error?: string };
        
        if (res.status === 503) {
          setError(
            "AI narrative generation requires an Anthropic API key. Configure one in Settings → Integrations."
          );
        } else if (res.status === 400) {
          setError(
            errorData.error?.includes("No financial data") || errorData.error?.includes("no data")
              ? "No financial data found for this period. Import data for this period first."
              : errorData.error || "Invalid request."
          );
        } else {
          setError(errorData.error || "Failed to generate narrative. Please try again.");
        }
        setGenerating(null);
        return;
      }

      const data = (await res.json()) as {
        narrativeId: string;
        content: string;
      };
      
      const newItem: NarrativeItem = {
        id: data.narrativeId,
        type: selectedType,
        generatedAt: new Date().toISOString(),
        periodStart: periodRange.start.toISOString(),
        periodEnd: periodRange.end.toISOString(),
        content: data.content,
        title: `${selectedType.replace(/_/g, " ")} — ${periodRange.label}`,
        basis,
      };
      
      setNarratives([newItem, ...narratives]);
      setExpanded(newItem.id);
    } catch (err) {
      setError("Network error. Check your connection and try again.");
    } finally {
      setGenerating(null);
    }
  }

  // Clear error when type or preset changes
  useEffect(() => {
    setError(null);
  }, [selectedType, preset]);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            Reports
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            AI-generated financial narratives · Powered by Claude
          </p>
        </div>
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
          style={{
            borderColor: "var(--accent-blue)",
            color: "var(--accent-blue)",
            background: "rgba(79,142,247,0.08)",
          }}
        >
          <Sparkles className="h-3 w-3" />
          Claude AI
        </div>
      </div>

      {/* Generate new */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div
          className="px-5 py-4 border-b flex items-center gap-2"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <Plus className="h-4 w-4" style={{ color: "var(--accent-blue)" }} />
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Generate New Report
          </h2>
        </div>

        <div className="p-5 space-y-4">
          {/* Period controls */}
          <div className="space-y-3">
            <label className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
              PERIOD & BASIS
            </label>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Preset selector */}
              <div className="relative">
                <button
                  onClick={() => setPresetDropdownOpen(!presetDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm hover:border-[var(--accent-blue)] transition-colors"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--surface-2)",
                    color: "var(--foreground)",
                  }}
                >
                  <span>
                    {PRESETS.find((p) => p.value === preset)?.label || "Select Period"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5" style={{ color: "var(--muted)" }} />
                </button>
                {presetDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setPresetDropdownOpen(false)}
                    />
                    <div
                      className="absolute top-full mt-1 left-0 z-50 rounded-md border shadow-xl min-w-44"
                      style={{
                        background: "var(--surface)",
                        borderColor: "var(--border)",
                      }}
                    >
                      {PRESETS.map((p) => (
                        <button
                          key={p.value}
                          onClick={() => {
                            setPreset(p.value);
                            setPresetDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-2)] transition-colors"
                          style={{
                            color:
                              preset === p.value
                                ? "var(--accent-blue)"
                                : "var(--foreground)",
                          }}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Basis toggle */}
              <div
                className="flex rounded-md border overflow-hidden"
                style={{ borderColor: "var(--border)" }}
              >
                {(["CASH", "ACCRUAL"] as AccountingBasis[]).map((b) => (
                  <button
                    key={b}
                    onClick={() => setBasis(b)}
                    className="px-3 py-1.5 text-xs font-medium transition-colors"
                    style={
                      basis === b
                        ? {
                            background: "var(--accent-blue)",
                            color: "white",
                          }
                        : {
                            color: "var(--muted)",
                          }
                    }
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom date inputs or period preview */}
            {preset === "custom" ? (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label
                    htmlFor="customStart"
                    className="block text-xs mb-1"
                    style={{ color: "var(--muted)" }}
                  >
                    Start
                  </label>
                  <input
                    id="customStart"
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full rounded-md border px-3 py-1.5 text-sm outline-none transition-colors"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--surface-2)",
                      color: "var(--foreground)",
                    }}
                  />
                </div>
                <div className="flex-1">
                  <label
                    htmlFor="customEnd"
                    className="block text-xs mb-1"
                    style={{ color: "var(--muted)" }}
                  >
                    End
                  </label>
                  <input
                    id="customEnd"
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full rounded-md border px-3 py-1.5 text-sm outline-none transition-colors"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--surface-2)",
                      color: "var(--foreground)",
                    }}
                  />
                </div>
              </div>
            ) : (
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
                style={{
                  background: "rgba(79,142,247,0.08)",
                  color: "var(--accent-blue)",
                }}
              >
                {periodRange.label} · {basis}
              </div>
            )}
          </div>

          {/* Report type grid */}
          <div className="space-y-2">
            <label className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
              REPORT TYPE
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {REPORT_TYPES.map((rt) => {
                const isSelected = selectedType === rt.type;
                return (
                  <button
                    key={rt.type}
                    onClick={() => setSelectedType(rt.type)}
                    className="text-left rounded-lg border p-3 transition-all duration-150 relative"
                    style={{
                      borderColor: isSelected
                        ? "var(--accent-blue)"
                        : "var(--border)",
                      background: isSelected
                        ? "rgba(79,142,247,0.08)"
                        : "var(--surface-2)",
                    }}
                  >
                    {rt.badge && (
                      <span
                        className="absolute top-2 right-2 text-[10px] font-bold tracking-wide px-1.5 py-0.5 rounded-full"
                        style={{
                          background: "rgba(79,142,247,0.15)",
                          color: "var(--accent-blue)",
                        }}
                      >
                        {rt.badge}
                      </span>
                    )}
                    <p
                      className="text-sm font-medium"
                      style={{
                        color: isSelected
                          ? "var(--accent-blue)"
                          : "var(--foreground)",
                      }}
                    >
                      {rt.label}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "var(--muted)" }}
                    >
                      {rt.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom query */}
          {selectedType === NarrativeType.CUSTOM && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_QUERIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => setCustomQuestion(q)}
                    className="text-xs px-2.5 py-1.5 rounded-md border transition-colors hover:border-[var(--accent-blue)]"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--surface-2)",
                      color: "var(--muted)",
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div className="relative">
                <textarea
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  placeholder="Ask any financial question..."
                  rows={3}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm placeholder:text-[var(--muted)] outline-none resize-none transition-colors"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--surface-2)",
                    color: "var(--foreground)",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "var(--accent-blue)")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "var(--border)")
                  }
                />
                <div
                  className="absolute bottom-2 right-2 text-xs"
                  style={{
                    color:
                      customQuestion.length > 500
                        ? "var(--accent-red)"
                        : "var(--muted)",
                  }}
                >
                  {customQuestion.length} / 500
                </div>
              </div>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div
              className="flex items-start gap-3 p-3 rounded-lg border"
              style={{
                background: "rgba(245, 158, 11, 0.08)",
                borderColor: "var(--amber)",
              }}
            >
              <AlertTriangle
                className="h-4 w-4 shrink-0 mt-0.5"
                style={{ color: "var(--amber)" }}
              />
              <p className="flex-1 text-sm" style={{ color: "var(--foreground)" }}>
                {error}
              </p>
              <button
                onClick={() => setError(null)}
                className="shrink-0"
                style={{ color: "var(--muted)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={() => {
              void generate();
            }}
            disabled={
              !!generating ||
              (selectedType === NarrativeType.CUSTOM && !customQuestion.trim()) ||
              (selectedType === NarrativeType.CUSTOM && customQuestion.length > 500)
            }
            className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-40"
            style={{
              background: generating
                ? "var(--accent-blue-dim)"
                : "linear-gradient(135deg, var(--accent-blue) 0%, #6366f1 100%)",
              boxShadow: generating ? "none" : "0 0 20px rgba(79,142,247,0.3)",
            }}
          >
            {generating ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Generate Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* History */}
      <div className="space-y-3">
        <h2
          className="text-[11px] font-bold tracking-[0.15em] uppercase"
          style={{ color: "var(--muted)" }}
        >
          Report History
        </h2>

        {loading && (
          <div
            className="text-center py-10 text-sm flex flex-col items-center gap-2"
            style={{ color: "var(--muted)" }}
          >
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading reports…
          </div>
        )}

        {!loading && narratives.length === 0 && (
          <div
            className="rounded-xl border border-dashed px-6 py-16 text-center"
            style={{
              borderColor: "var(--border)",
            }}
          >
            <div className="flex flex-col items-center gap-4">
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center"
                style={{
                  background: "rgba(79,142,247,0.08)",
                }}
              >
                <FileText className="h-8 w-8" style={{ color: "var(--accent-blue)" }} />
              </div>
              <div>
                <p
                  className="text-sm font-semibold mb-1"
                  style={{ color: "var(--foreground)" }}
                >
                  No reports yet
                </p>
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  Generate your first report above to get started
                </p>
              </div>
            </div>
          </div>
        )}

        {narratives.map((n) => {
          const isOpen = expanded === n.id;
          const badgeVariant = TYPE_BADGE[n.type] ?? "default";
          const periodStart = new Date(n.periodStart);
          const periodEnd = new Date(n.periodEnd);
          const periodLabel = getRelativePeriodLabel(periodStart, periodEnd, n.type);
          
          return (
            <div
              key={n.id}
              className="rounded-xl border overflow-hidden transition-all"
              style={{
                borderColor: isOpen ? "var(--accent-blue)/40" : "var(--border)",
                background: "var(--surface)",
              }}
            >
              {/* Header row */}
              <button
                onClick={() => setExpanded(isOpen ? null : n.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-[var(--surface-2)]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: isOpen
                        ? "rgba(79,142,247,0.15)"
                        : "var(--surface-2)",
                    }}
                  >
                    <FileText
                      className="h-4 w-4"
                      style={{
                        color: isOpen ? "var(--accent-blue)" : "var(--muted)",
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "var(--foreground)" }}
                      >
                        {n.title ?? n.type.replace(/_/g, " ")}
                      </span>
                      <Badge variant={badgeVariant}>
                        {n.type.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p
                        className="text-xs font-medium"
                        style={{ color: "var(--accent-blue)" }}
                      >
                        {periodLabel} · {n.basis}
                      </p>
                      <span style={{ color: "var(--muted)" }}>·</span>
                      <p
                        className="text-xs"
                        style={{ color: "var(--muted)" }}
                      >
                        Generated{" "}
                        {format(
                          new Date(n.generatedAt),
                          "MMM d, yyyy 'at' h:mm a",
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                <ChevronDown
                  className="h-4 w-4 shrink-0 ml-4 transition-transform duration-200"
                  style={{
                    color: "var(--muted)",
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </button>

              {/* Content */}
              {isOpen && (
                <div
                  className="border-t px-5 py-5"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  <MarkdownRenderer content={n.content} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

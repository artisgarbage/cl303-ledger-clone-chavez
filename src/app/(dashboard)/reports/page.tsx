"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { RefreshCw, FileText, Plus, ChevronDown, Sparkles } from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { NarrativeType } from "@prisma/client";

interface NarrativeItem {
  id: string;
  type: NarrativeType;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  content: string;
  title: string | null;
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

export default function ReportsPage() {
  const [narratives, setNarratives] = useState<NarrativeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<NarrativeType>(
    NarrativeType.MONTHLY_SUMMARY,
  );
  const [customQuestion, setCustomQuestion] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analysis/narrative?limit=20")
      .then((r) => r.json())
      .then((data) => {
        setNarratives(data as NarrativeItem[]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function generate() {
    setGenerating(selectedType);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const res = await fetch("/api/analysis/narrative", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: selectedType,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        basis: "CASH",
        question:
          selectedType === NarrativeType.CUSTOM ? customQuestion : undefined,
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        narrativeId: string;
        content: string;
      };
      const newItem: NarrativeItem = {
        id: data.narrativeId,
        type: selectedType,
        generatedAt: new Date().toISOString(),
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        content: data.content,
        title: `${selectedType.replace(/_/g, " ")} — ${format(start, "MMM yyyy")}`,
      };
      setNarratives([newItem, ...narratives]);
      setExpanded(newItem.id);
    }
    setGenerating(null);
  }

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

          {selectedType === NarrativeType.CUSTOM && (
            <textarea
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder="Ask any financial question, e.g. 'What is our revenue run rate and are we on track for $1.8M this year?'"
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
          )}

          <button
            onClick={() => {
              void generate();
            }}
            disabled={
              !!generating ||
              (selectedType === NarrativeType.CUSTOM && !customQuestion.trim())
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
            className="rounded-xl border border-dashed px-6 py-10 text-center text-sm"
            style={{
              borderColor: "var(--border)",
              color: "var(--muted)",
            }}
          >
            No reports generated yet. Generate your first report above.
          </div>
        )}

        {narratives.map((n) => {
          const isOpen = expanded === n.id;
          const badgeVariant = TYPE_BADGE[n.type] ?? "default";
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
                    <p
                      className="text-xs mt-0.5"
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

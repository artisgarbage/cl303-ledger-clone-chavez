"use client";

import { useState, useRef } from "react";
import {
  Upload,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils/currency";
import { format } from "date-fns";

interface ImportResult {
  success: boolean;
  error?: string;
  period?: {
    start: string;
    end: string;
    basis: string;
    revenue: number;
    grossMargin: number;
    netIncome: number;
  };
}

export default function ImportsPage() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/imports/quickbooks", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as ImportResult;
      setResult(data);
    } catch {
      setResult({ success: false, error: "Network error during upload" });
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Import Data</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          Upload a QuickBooks Profit &amp; Loss XLSX export to import financial
          data.
        </p>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`relative rounded-xl border-2 border-dashed cursor-pointer transition-colors p-12 text-center
          ${dragging ? "border-[var(--accent-blue)] bg-[var(--accent-blue)]/5" : "border-[var(--border)] hover:border-[var(--accent-blue)]/50"}`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 text-[var(--accent-blue)] animate-spin" />
            <p className="text-sm text-[var(--muted)]">
              Parsing QuickBooks file…
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="h-10 w-10 text-[var(--muted)]" />
            <div>
              <p className="text-sm font-medium">
                Drop QuickBooks P&L XLSX here
              </p>
              <p className="text-xs text-[var(--muted)] mt-1">
                or click to browse — .xlsx or .xls
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div
          className={`rounded-lg border p-5 ${result.success ? "border-[var(--accent-green)]/40 bg-[var(--accent-green)]/5" : "border-[var(--accent-red)]/40 bg-[var(--accent-red)]/5"}`}
        >
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle className="h-5 w-5 text-[var(--accent-green)] shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 text-[var(--accent-red)] shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              {result.success && result.period ? (
                <>
                  <p className="font-medium text-[var(--accent-green)]">
                    Import successful
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-[var(--muted)]">Period</p>
                      <p className="text-sm font-mono">
                        {format(new Date(result.period.start), "MMM d")} –{" "}
                        {format(new Date(result.period.end), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted)]">Basis</p>
                      <p className="text-sm font-mono">{result.period.basis}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted)]">Revenue</p>
                      <p className="text-sm font-mono tabular-nums">
                        {formatCurrency(result.period.revenue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted)]">
                        Gross Margin
                      </p>
                      <p className="text-sm font-mono tabular-nums">
                        {formatPercent(result.period.grossMargin)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted)]">Net Income</p>
                      <p
                        className={`text-sm font-mono tabular-nums ${result.period.netIncome >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}
                      >
                        {formatCurrency(result.period.netIncome)}
                      </p>
                    </div>
                  </div>
                  <a
                    href="/"
                    className="inline-block mt-4 text-xs text-[var(--accent-blue)] hover:underline"
                  >
                    View Dashboard →
                  </a>
                </>
              ) : (
                <>
                  <p className="font-medium text-[var(--accent-red)]">
                    Import failed
                  </p>
                  <p className="text-sm text-[var(--muted)] mt-1">
                    {result.error}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-sm font-medium mb-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-[var(--muted)]" />
          How to export from QuickBooks
        </h2>
        <ol className="text-sm text-[var(--muted)] space-y-1.5 list-decimal list-inside">
          <li>Go to Reports → Profit and Loss</li>
          <li>
            Set your date range (any period works — monthly, quarterly, yearly)
          </li>
          <li>
            Select Cash Basis or Accrual Basis (import both for full comparison)
          </li>
          <li>Click Export → Export to Excel (.xlsx)</li>
          <li>Upload the downloaded file here</li>
        </ol>
        <p className="text-xs text-[var(--muted)] mt-3">
          You can import both Cash and Accrual exports for the same period to
          enable side-by-side comparison.
        </p>
      </div>
    </div>
  );
}

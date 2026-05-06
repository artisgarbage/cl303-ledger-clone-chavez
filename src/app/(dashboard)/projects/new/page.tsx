"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

type Classification = "FUND" | "FRONTIER";
type Status = "ACTIVE" | "COMPLETED" | "PAUSED" | "LOST";

export default function NewProjectPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    clientName: "",
    classification: "FRONTIER" as Classification,
    status: "ACTIVE" as Status,
    startDate: "",
    contractValue: "",
    monthlyRetainer: "",
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = {
      name: form.name.trim(),
      classification: form.classification,
      status: form.status,
    };
    if (form.clientName.trim()) body.clientName = form.clientName.trim();
    if (form.startDate) body.startDate = form.startDate;
    if (form.contractValue) body.contractValue = parseFloat(form.contractValue);
    if (form.monthlyRetainer)
      body.monthlyRetainer = parseFloat(form.monthlyRetainer);

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      router.push("/projects");
    } else {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Failed to create project");
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="rounded-md p-1.5 hover:bg-[var(--surface-2)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-xl font-semibold">New Project</h1>
      </div>

      <form
        onSubmit={(e) => {
          void submit(e);
        }}
        className="space-y-5"
      >
        {error && (
          <div className="rounded-md bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 px-4 py-3 text-sm text-[var(--accent-red)]">
            {error}
          </div>
        )}

        {/* Details */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
          <h2 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide">
            Details
          </h2>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Project Name <span className="text-[var(--accent-red)]">*</span>
            </label>
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Acme Corp Website Redesign"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Client Name
            </label>
            <input
              type="text"
              value={form.clientName}
              onChange={(e) => update("clientName", e.target.value)}
              placeholder="Acme Corp"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Classification
              </label>
              <select
                value={form.classification}
                onChange={(e) => update("classification", e.target.value)}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
              >
                <option value="FRONTIER">Frontier (Client)</option>
                <option value="FUND">Fund (Internal)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => update("status", e.target.value)}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
              >
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="COMPLETED">Completed</option>
                <option value="LOST">Lost</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Start Date
            </label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => update("startDate", e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
            />
          </div>
        </div>

        {/* Financials */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
          <h2 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide">
            Financials
          </h2>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Contract Value ($)
              <span className="ml-2 text-[var(--muted)] font-normal">
                for fixed-price projects
              </span>
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={form.contractValue}
              onChange={(e) => update("contractValue", e.target.value)}
              placeholder="50000"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Monthly Retainer ($)
              <span className="ml-2 text-[var(--muted)] font-normal">
                for retainer projects
              </span>
            </label>
            <input
              type="number"
              min="0"
              step="500"
              value={form.monthlyRetainer}
              onChange={(e) => update("monthlyRetainer", e.target.value)}
              placeholder="10000"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-2)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !form.name.trim()}
            className="flex-1 rounded-md bg-[var(--accent-blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? "Saving…" : "Create Project"}
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

type PersonType = "SALARIED" | "CONTRACTOR" | "PARTNER";

export default function NewPersonPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    type: "SALARIED" as PersonType,
    annualSalary: "",
    hourlyRate: "",
    burdenRate: "1.25",
    invoiceLagDays: "30",
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
      type: form.type,
    };
    if (form.email.trim()) body.email = form.email.trim();
    if (form.annualSalary) body.annualSalary = parseFloat(form.annualSalary);
    if (form.hourlyRate) body.hourlyRate = parseFloat(form.hourlyRate);
    if (form.burdenRate) body.burdenRate = parseFloat(form.burdenRate);
    if (form.invoiceLagDays)
      body.invoiceLagDays = parseInt(form.invoiceLagDays);

    const res = await fetch("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      router.push("/people");
    } else {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Failed to create person");
      setSaving(false);
    }
  }

  const isSalaried = form.type === "SALARIED" || form.type === "PARTNER";

  return (
    <div className="p-6 max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="rounded-md p-1.5 hover:bg-[var(--surface-2)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-xl font-semibold">Add Person</h1>
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

        {/* Identity */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
          <h2 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide">
            Identity
          </h2>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Full Name <span className="text-[var(--accent-red)]">*</span>
            </label>
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Jane Smith"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="jane@example.com"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Type</label>
            <select
              value={form.type}
              onChange={(e) => update("type", e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
            >
              <option value="SALARIED">Salaried Employee</option>
              <option value="CONTRACTOR">Contractor</option>
              <option value="PARTNER">Partner</option>
            </select>
          </div>
        </div>

        {/* Compensation */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
          <h2 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide">
            Compensation
          </h2>

          {isSalaried ? (
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Annual Salary ($)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={form.annualSalary}
                onChange={(e) => update("annualSalary", e.target.value)}
                placeholder="120000"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Hourly Rate ($)
              </label>
              <input
                type="number"
                min="0"
                step="5"
                value={form.hourlyRate}
                onChange={(e) => update("hourlyRate", e.target.value)}
                placeholder="150"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Burden Rate (multiplier)
              <span className="ml-2 text-[var(--muted)] font-normal">
                e.g. 1.25 = 25% overhead
              </span>
            </label>
            <input
              type="number"
              min="1"
              max="3"
              step="0.01"
              value={form.burdenRate}
              onChange={(e) => update("burdenRate", e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
            />
          </div>

          {form.type === "CONTRACTOR" && (
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Invoice Lag Days
              </label>
              <input
                type="number"
                min="0"
                max="90"
                value={form.invoiceLagDays}
                onChange={(e) => update("invoiceLagDays", e.target.value)}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
              />
            </div>
          )}
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
            {saving ? "Saving…" : "Add Person"}
          </button>
        </div>
      </form>
    </div>
  );
}

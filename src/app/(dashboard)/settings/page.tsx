"use client";

import { useState, useEffect } from "react";
import { Save, RefreshCw } from "lucide-react";

interface Settings {
  defaultBurdenRate: number;
  defaultContractorLag: number;
  revenueTarget: number | null;
  grossMarginTargetMin: number | null;
  grossMarginTargetMax: number | null;
  netProfitTarget: number | null;
  harvestAccessToken: string | null;
  harvestAccountId: string | null;
  forecastAccountId: string | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    defaultBurdenRate: 1.25,
    defaultContractorLag: 30,
    revenueTarget: 1_800_000,
    grossMarginTargetMin: 0.28,
    grossMarginTargetMax: 0.32,
    netProfitTarget: 125_000,
    harvestAccessToken: null,
    harvestAccountId: null,
    forecastAccountId: null,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      {/* Financial targets */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
        <h2 className="text-sm font-medium">Financial Targets (2026)</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
              Revenue Target ($)
            </label>
            <input
              type="number"
              value={settings.revenueTarget ?? ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  revenueTarget: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-mono focus:border-[var(--accent-blue)] outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
              Net Profit Target ($)
            </label>
            <input
              type="number"
              value={settings.netProfitTarget ?? ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  netProfitTarget: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-mono focus:border-[var(--accent-blue)] outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
              Gross Margin Min (e.g. 0.28)
            </label>
            <input
              type="number"
              step="0.01"
              value={settings.grossMarginTargetMin ?? ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  grossMarginTargetMin: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-mono focus:border-[var(--accent-blue)] outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
              Gross Margin Max (e.g. 0.32)
            </label>
            <input
              type="number"
              step="0.01"
              value={settings.grossMarginTargetMax ?? ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  grossMarginTargetMax: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-mono focus:border-[var(--accent-blue)] outline-none"
            />
          </div>
        </div>
      </div>

      {/* Cost defaults */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
        <h2 className="text-sm font-medium">Cost Defaults</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
              Default Burden Rate (e.g. 1.25)
            </label>
            <input
              type="number"
              step="0.01"
              value={settings.defaultBurdenRate}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  defaultBurdenRate: Number(e.target.value),
                })
              }
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-mono focus:border-[var(--accent-blue)] outline-none"
            />
            <p className="text-xs text-[var(--muted)]">
              1.25 = 25% burden (taxes, benefits, etc.)
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
              Default Contractor Invoice Lag (days)
            </label>
            <input
              type="number"
              value={settings.defaultContractorLag}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  defaultContractorLag: Number(e.target.value),
                })
              }
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-mono focus:border-[var(--accent-blue)] outline-none"
            />
          </div>
        </div>
      </div>

      {/* Harvest integration */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
        <h2 className="text-sm font-medium">Harvest Integration</h2>
        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
            Personal Access Token
          </label>
          <input
            type="password"
            value={settings.harvestAccessToken ?? ""}
            onChange={(e) =>
              setSettings({
                ...settings,
                harvestAccessToken: e.target.value || null,
              })
            }
            placeholder="harvest_personal_token_..."
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-mono focus:border-[var(--accent-blue)] outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
              Account ID
            </label>
            <input
              type="text"
              value={settings.harvestAccountId ?? ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  harvestAccountId: e.target.value || null,
                })
              }
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-mono focus:border-[var(--accent-blue)] outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
              Forecast Account ID
            </label>
            <input
              type="text"
              value={settings.forecastAccountId ?? ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  forecastAccountId: e.target.value || null,
                })
              }
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-mono focus:border-[var(--accent-blue)] outline-none"
            />
          </div>
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 rounded-md bg-[var(--accent-blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {saving ? (
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Save className="h-3.5 w-3.5" />
        )}
        {saved ? "Saved!" : saving ? "Saving…" : "Save Settings"}
      </button>
    </div>
  );
}

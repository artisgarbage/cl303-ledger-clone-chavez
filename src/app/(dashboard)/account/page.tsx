"use client";

import { useState, useEffect } from "react";
import {
  User,
  Lock,
  Check,
  Loader2,
  AlertTriangle,
  Shield,
  Eye,
  UserCheck,
} from "lucide-react";

interface AccountData {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
  createdAt: string;
}

const ROLE_LABELS = { ADMIN: "Admin", MEMBER: "Member", VIEWER: "Viewer" };
const ROLE_ICONS = { ADMIN: Shield, MEMBER: UserCheck, VIEWER: Eye };
const ROLE_COLORS = {
  ADMIN: "var(--accent-blue)",
  MEMBER: "var(--accent-green)",
  VIEWER: "var(--muted)",
};

export default function AccountPage() {
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [name, setName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/account");
        const data = (await res.json()) as AccountData;
        setAccount(data);
        setName(data.name ?? "");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function saveProfile() {
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(false);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json()) as AccountData & { error?: string };
      if (!res.ok) {
        setProfileError(data.error ?? "Failed to save");
        return;
      }
      setAccount(data);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 2500);
    } catch {
      setProfileError("Network error");
    } finally {
      setProfileSaving(false);
    }
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) {
      setPwError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setPwError("Password must be at least 8 characters");
      return;
    }
    setPwSaving(true);
    setPwError(null);
    setPwSuccess(false);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setPwError(data.error ?? "Failed to update password");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwSuccess(true);
      setTimeout(() => setPwSuccess(false), 2500);
    } catch {
      setPwError("Network error");
    } finally {
      setPwSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2
          className="h-5 w-5 animate-spin"
          style={{ color: "var(--muted)" }}
        />
      </div>
    );
  }

  if (!account) return null;

  const RoleIcon = ROLE_ICONS[account.role];

  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--foreground)" }}
        >
          My Account
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Manage your profile and security settings.
        </p>
      </div>

      {/* Role badge */}
      <div
        className="rounded-xl border p-5 mb-6 flex items-center gap-4"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        {/* Avatar */}
        <div
          className="h-12 w-12 rounded-full flex items-center justify-center text-base font-bold shrink-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(79,142,247,0.2), rgba(99,102,241,0.2))",
            color: "var(--accent-blue)",
            border: "1px solid rgba(79,142,247,0.3)",
          }}
        >
          {(account.name ?? account.email).slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-base font-semibold truncate"
            style={{ color: "var(--foreground)" }}
          >
            {account.name ?? account.email}
          </p>
          <p className="text-sm truncate" style={{ color: "var(--muted)" }}>
            {account.email}
          </p>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shrink-0"
          style={{
            background: `${ROLE_COLORS[account.role]}18`,
            color: ROLE_COLORS[account.role],
            border: `1px solid ${ROLE_COLORS[account.role]}30`,
          }}
        >
          <RoleIcon className="h-3.5 w-3.5" />
          {ROLE_LABELS[account.role]}
        </span>
      </div>

      {/* Profile section */}
      <div
        className="rounded-xl border p-6 mb-6"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="flex items-center gap-2 mb-5">
          <User className="h-4 w-4" style={{ color: "var(--accent-blue)" }} />
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Profile
          </h2>
        </div>
        <div className="space-y-4">
          <div>
            <label
              className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5"
              style={{ color: "var(--muted)" }}
            >
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface-2)",
                color: "var(--foreground)",
              }}
            />
          </div>
          <div>
            <label
              className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5"
              style={{ color: "var(--muted)" }}
            >
              Email Address
            </label>
            <input
              type="email"
              value={account.email}
              disabled
              className="w-full rounded-lg border px-3 py-2.5 text-sm opacity-60 cursor-not-allowed"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface-2)",
                color: "var(--foreground)",
              }}
            />
            <p className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>
              Email cannot be changed. Contact an admin if needed.
            </p>
          </div>
          {profileError && (
            <div
              className="rounded-lg px-3 py-2 text-sm border flex items-center gap-2"
              style={{
                background: "rgba(240,71,71,0.08)",
                borderColor: "rgba(240,71,71,0.3)",
                color: "var(--accent-red)",
              }}
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {profileError}
            </div>
          )}
          <button
            onClick={() => void saveProfile()}
            disabled={profileSaving}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{
              background:
                "linear-gradient(135deg, var(--accent-blue) 0%, #6366f1 100%)",
            }}
          >
            {profileSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : profileSuccess ? (
              <Check className="h-3.5 w-3.5" />
            ) : null}
            {profileSuccess ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Password section */}
      <div
        className="rounded-xl border p-6"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="flex items-center gap-2 mb-5">
          <Lock className="h-4 w-4" style={{ color: "var(--accent-blue)" }} />
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Change Password
          </h2>
        </div>
        <div className="space-y-4">
          {[
            {
              label: "Current Password",
              value: currentPassword,
              setter: setCurrentPassword,
              auto: "current-password",
            },
            {
              label: "New Password",
              value: newPassword,
              setter: setNewPassword,
              auto: "new-password",
            },
            {
              label: "Confirm New Password",
              value: confirmPassword,
              setter: setConfirmPassword,
              auto: "new-password",
            },
          ].map(({ label, value, setter, auto }) => (
            <div key={label}>
              <label
                className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5"
                style={{ color: "var(--muted)" }}
              >
                {label}
              </label>
              <input
                type="password"
                value={value}
                onChange={(e) => setter(e.target.value)}
                autoComplete={auto}
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface-2)",
                  color: "var(--foreground)",
                }}
              />
            </div>
          ))}
          {pwError && (
            <div
              className="rounded-lg px-3 py-2 text-sm border flex items-center gap-2"
              style={{
                background: "rgba(240,71,71,0.08)",
                borderColor: "rgba(240,71,71,0.3)",
                color: "var(--accent-red)",
              }}
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {pwError}
            </div>
          )}
          <button
            onClick={() => void changePassword()}
            disabled={
              pwSaving || !currentPassword || !newPassword || !confirmPassword
            }
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{
              background:
                "linear-gradient(135deg, var(--accent-blue) 0%, #6366f1 100%)",
            }}
          >
            {pwSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : pwSuccess ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Lock className="h-3.5 w-3.5" />
            )}
            {pwSuccess ? "Password Updated!" : "Update Password"}
          </button>
        </div>
      </div>
    </div>
  );
}

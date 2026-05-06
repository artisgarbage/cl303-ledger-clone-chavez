"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Shield,
  Eye,
  UserCheck,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
  createdAt: string;
}

const ROLE_LABELS: Record<User["role"], string> = {
  ADMIN: "Admin",
  MEMBER: "Member",
  VIEWER: "Viewer",
};

const ROLE_ICONS: Record<User["role"], typeof Shield> = {
  ADMIN: Shield,
  MEMBER: UserCheck,
  VIEWER: Eye,
};

const ROLE_COLORS: Record<User["role"], string> = {
  ADMIN: "var(--accent-blue)",
  MEMBER: "var(--accent-green)",
  VIEWER: "var(--muted)",
};

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New user form
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<User["role"]>("VIEWER");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<User["role"]>("VIEWER");
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to load users");
      const data = (await res.json()) as User[];
      setUsers(data);
    } catch {
      setError("Could not load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  async function createUser() {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          role: newRole,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setCreateError(data.error ?? "Failed to create user");
        return;
      }
      setShowForm(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("VIEWER");
      await fetchUsers();
    } catch {
      setCreateError("Network error");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(u: User) {
    setEditingId(u.id);
    setEditRole(u.role);
    setEditName(u.name ?? "");
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: editRole, name: editName }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        alert(d.error ?? "Failed to save");
        return;
      }
      setEditingId(null);
      await fetchUsers();
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      await fetchUsers();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "var(--foreground)" }}
          >
            User Management
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Manage who has access to this workspace and their permissions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void fetchUsers()}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm border transition-colors"
            style={{
              borderColor: "var(--border)",
              color: "var(--muted)",
              background: "var(--surface)",
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all"
            style={{
              background:
                "linear-gradient(135deg, var(--accent-blue) 0%, #6366f1 100%)",
              boxShadow: "0 0 16px rgba(79,142,247,0.2)",
            }}
          >
            <Plus className="h-4 w-4" />
            Invite User
          </button>
        </div>
      </div>

      {/* Invite form */}
      {showForm && (
        <div
          className="rounded-xl border p-6 mb-6"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <h3
            className="text-sm font-semibold mb-4"
            style={{ color: "var(--foreground)" }}
          >
            Invite New User
          </h3>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label
                className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5"
                style={{ color: "var(--muted)" }}
              >
                Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
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
                Email *
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="jane@company.com"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
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
                Password *
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
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
                Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as User["role"])}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface-2)",
                  color: "var(--foreground)",
                }}
              >
                <option value="VIEWER">Viewer — read-only</option>
                <option value="MEMBER">Member — can import & generate</option>
                <option value="ADMIN">Admin — full access</option>
              </select>
            </div>
          </div>
          {createError && (
            <div
              className="rounded-lg px-3 py-2 text-sm border mb-4 flex items-center gap-2"
              style={{
                background: "rgba(240,71,71,0.08)",
                borderColor: "rgba(240,71,71,0.3)",
                color: "var(--accent-red)",
              }}
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {createError}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => void createUser()}
              disabled={creating || !newEmail || !newPassword}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent-blue) 0%, #6366f1 100%)",
              }}
            >
              {creating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Create User
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setCreateError(null);
              }}
              className="rounded-lg px-4 py-2 text-sm font-medium border"
              style={{
                borderColor: "var(--border)",
                color: "var(--muted)",
                background: "var(--surface-2)",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Users table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        {/* Table header */}
        <div
          className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-5 py-3 border-b text-[11px] font-bold uppercase tracking-[0.12em]"
          style={{
            borderColor: "var(--border-subtle)",
            color: "var(--muted)",
            background: "var(--surface-2)",
          }}
        >
          <span>User</span>
          <span>Email</span>
          <span>Role</span>
          <span></span>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2
              className="h-5 w-5 animate-spin"
              style={{ color: "var(--muted)" }}
            />
          </div>
        )}

        {error && (
          <div
            className="px-5 py-8 text-center text-sm"
            style={{ color: "var(--accent-red)" }}
          >
            {error}
          </div>
        )}

        {!loading && !error && users.length === 0 && (
          <div className="px-5 py-8 text-center">
            <Users
              className="h-8 w-8 mx-auto mb-2"
              style={{ color: "var(--muted)" }}
            />
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              No users found
            </p>
          </div>
        )}

        {!loading &&
          users.map((u, i) => {
            const RoleIcon = ROLE_ICONS[u.role];
            const isEditing = editingId === u.id;

            return (
              <div
                key={u.id}
                className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-5 py-4 items-center border-b"
                style={{
                  borderColor:
                    i < users.length - 1
                      ? "var(--border-subtle)"
                      : "transparent",
                }}
              >
                {/* Name */}
                <div className="min-w-0">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm outline-none"
                      style={{
                        borderColor: "var(--border)",
                        background: "var(--surface-2)",
                        color: "var(--foreground)",
                      }}
                    />
                  ) : (
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: "var(--foreground)" }}
                    >
                      {u.name ?? (
                        <span style={{ color: "var(--muted)" }}>—</span>
                      )}
                    </p>
                  )}
                </div>

                {/* Email */}
                <p
                  className="text-sm truncate"
                  style={{ color: "var(--foreground-muted)" }}
                >
                  {u.email}
                </p>

                {/* Role */}
                <div>
                  {isEditing ? (
                    <select
                      value={editRole}
                      onChange={(e) =>
                        setEditRole(e.target.value as User["role"])
                      }
                      className="rounded border px-2 py-1 text-sm outline-none"
                      style={{
                        borderColor: "var(--border)",
                        background: "var(--surface-2)",
                        color: "var(--foreground)",
                      }}
                    >
                      <option value="VIEWER">Viewer</option>
                      <option value="MEMBER">Member</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{
                        background: `${ROLE_COLORS[u.role]}18`,
                        color: ROLE_COLORS[u.role],
                        border: `1px solid ${ROLE_COLORS[u.role]}30`,
                      }}
                    >
                      <RoleIcon className="h-3 w-3" />
                      {ROLE_LABELS[u.role]}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => void saveEdit(u.id)}
                        disabled={saving}
                        className="rounded-lg p-1.5 transition-colors"
                        style={{
                          background: "rgba(34,197,94,0.12)",
                          color: "var(--accent-green)",
                        }}
                      >
                        {saving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-lg p-1.5 transition-colors"
                        style={{
                          background: "var(--surface-2)",
                          color: "var(--muted)",
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(u)}
                        className="rounded-lg p-1.5 transition-colors hover:bg-[var(--surface-2)]"
                        style={{ color: "var(--muted)" }}
                        title="Edit"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${u.email}?`))
                            void deleteUser(u.id);
                        }}
                        disabled={deletingId === u.id}
                        className="rounded-lg p-1.5 transition-colors hover:bg-red-500/10"
                        style={{ color: "var(--accent-red)" }}
                        title="Remove"
                      >
                        {deletingId === u.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* Role legend */}
      <div
        className="mt-6 rounded-xl border p-5"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <p
          className="text-[11px] font-bold uppercase tracking-[0.12em] mb-4"
          style={{ color: "var(--muted)" }}
        >
          Role Permissions
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          {(["ADMIN", "MEMBER", "VIEWER"] as const).map((role) => {
            const Icon = ROLE_ICONS[role];
            const perms: Record<typeof role, string[]> = {
              ADMIN: [
                "Full platform access",
                "Invite & manage users",
                "Edit settings",
                "Import data",
                "Generate AI narratives",
              ],
              MEMBER: [
                "View all data",
                "Import financial data",
                "Generate AI narratives",
                "View reports",
              ],
              VIEWER: [
                "View dashboard",
                "View reports",
                "View narratives",
                "Read-only access",
              ],
            };
            return (
              <div key={role} className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Icon
                    className="h-4 w-4"
                    style={{ color: ROLE_COLORS[role] }}
                  />
                  <span
                    className="text-sm font-semibold"
                    style={{ color: ROLE_COLORS[role] }}
                  >
                    {ROLE_LABELS[role]}
                  </span>
                </div>
                {perms[role].map((p) => (
                  <p
                    key={p}
                    className="text-xs"
                    style={{ color: "var(--foreground-muted)" }}
                  >
                    · {p}
                  </p>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

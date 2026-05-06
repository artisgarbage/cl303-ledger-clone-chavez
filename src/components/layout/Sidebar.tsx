"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  FileText,
  Upload,
  Settings,
  Shield,
  ChevronRight,
  LogOut,
  UserCircle,
  ChevronUp,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/people", label: "People", icon: Users },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/imports", label: "Imports", icon: Upload },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  userName?: string | null;
  userRole?: string | null;
  companyName?: string | null;
}

export function Sidebar({ userName, userRole, companyName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const isAdmin = userRole === "ADMIN";

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  async function handleSignOut() {
    setSigningOut(true);
    await signOut({ redirect: false });
    router.push("/");
  }

  return (
    <aside
      className="w-60 shrink-0 flex flex-col border-r min-h-screen relative"
      style={{
        background: "var(--sidebar-bg)",
        borderColor: "var(--border-subtle)",
      }}
    >
      {/* Brand section */}
      <div
        className="px-5 pt-6 pb-5 border-b"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
            style={{
              background:
                "linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%)",
              boxShadow: "0 0 16px var(--brand-glow)",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 14V4h2.5M3 9h5M8 4v10"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M11 14V6l4 4-4 4"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold tracking-tight leading-tight text-[var(--foreground)]">
              Ledger
            </p>
            <p
              className="text-[11px] font-medium leading-tight"
              style={{ color: "var(--accent-blue)" }}
            >
              Financial Intelligence
            </p>
          </div>
        </div>

        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md"
          style={{ background: "var(--surface-2)" }}
        >
          <div
            className="h-1.5 w-1.5 rounded-full shrink-0"
            style={{ background: "var(--accent-green)" }}
          />
          <span
            className="text-xs font-semibold tracking-wide truncate"
            style={{ color: "var(--foreground-muted)" }}
          >
            {companyName ?? "codelab303 LLC"}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <p
          className="px-3 pb-3 text-[10px] font-bold tracking-[0.18em] uppercase"
          style={{ color: "var(--muted)" }}
        >
          Workspace
        </p>
        <div className="space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 relative",
                  active
                    ? "text-[var(--accent-blue)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]",
                )}
                style={
                  active
                    ? {
                        background:
                          "linear-gradient(90deg, rgba(79,142,247,0.18) 0%, rgba(79,142,247,0.06) 100%)",
                      }
                    : {}
                }
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                    style={{ background: "var(--accent-blue)" }}
                  />
                )}
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    active
                      ? "text-[var(--accent-blue)]"
                      : "group-hover:text-[var(--foreground-muted)]",
                  )}
                />
                <span className="flex-1">{label}</span>
                {active && (
                  <ChevronRight
                    className="h-3 w-3 opacity-40"
                    style={{ color: "var(--accent-blue)" }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Admin section */}
        {isAdmin && (
          <>
            <p
              className="px-3 pt-5 pb-3 text-[10px] font-bold tracking-[0.18em] uppercase"
              style={{ color: "var(--muted)" }}
            >
              Admin
            </p>
            <div className="space-y-0.5">
              {[{ href: "/admin", label: "User Management", icon: Shield }].map(
                ({ href, label, icon: Icon }) => {
                  const active =
                    pathname === href || pathname.startsWith(href + "/");
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 relative",
                        active
                          ? "text-[var(--accent-blue)]"
                          : "text-[var(--muted)] hover:text-[var(--foreground)]",
                      )}
                      style={
                        active
                          ? {
                              background:
                                "linear-gradient(90deg, rgba(79,142,247,0.18) 0%, rgba(79,142,247,0.06) 100%)",
                            }
                          : {}
                      }
                    >
                      {active && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                          style={{ background: "var(--accent-blue)" }}
                        />
                      )}
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active
                            ? "text-[var(--accent-blue)]"
                            : "group-hover:text-[var(--foreground-muted)]",
                        )}
                      />
                      <span className="flex-1">{label}</span>
                      {active && (
                        <ChevronRight
                          className="h-3 w-3 opacity-40"
                          style={{ color: "var(--accent-blue)" }}
                        />
                      )}
                    </Link>
                  );
                },
              )}
            </div>
          </>
        )}
      </nav>

      {/* User footer with dropdown */}
      <div
        className="px-3 py-3 border-t relative"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        {/* User menu dropdown */}
        {userMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setUserMenuOpen(false)}
            />
            <div
              className="absolute bottom-full left-3 right-3 mb-1 rounded-xl border shadow-xl z-20 overflow-hidden"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
                boxShadow: "0 -8px 32px rgba(0,0,0,0.4)",
              }}
            >
              <Link
                href="/account"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
                style={{ color: "var(--foreground)" }}
              >
                <UserCircle
                  className="h-4 w-4 shrink-0"
                  style={{ color: "var(--accent-blue)" }}
                />
                My Account
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
                  style={{ color: "var(--foreground)" }}
                >
                  <Shield
                    className="h-4 w-4 shrink-0"
                    style={{ color: "var(--accent-blue)" }}
                  />
                  Admin Panel
                </Link>
              )}
              <div
                className="border-t"
                style={{ borderColor: "var(--border-subtle)" }}
              />
              <button
                onClick={() => void handleSignOut()}
                disabled={signingOut}
                className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium w-full text-left transition-colors hover:bg-red-500/10 disabled:opacity-50"
                style={{ color: "var(--accent-red)" }}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {signingOut ? "Signing out…" : "Sign Out"}
              </button>
            </div>
          </>
        )}

        {/* User button */}
        <button
          onClick={() => setUserMenuOpen((v) => !v)}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors hover:bg-[var(--surface-2)]"
        >
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
            style={{
              background:
                "linear-gradient(135deg, rgba(79,142,247,0.25) 0%, rgba(99,102,241,0.2) 100%)",
              color: "var(--accent-blue)",
              border: "1px solid rgba(79,142,247,0.25)",
            }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p
              className="text-xs font-semibold truncate"
              style={{ color: "var(--foreground)" }}
            >
              {userName ?? "User"}
            </p>
            <p
              className="text-[11px] truncate capitalize"
              style={{ color: "var(--muted)" }}
            >
              {userRole?.toLowerCase() ?? "member"}
            </p>
          </div>
          <ChevronUp
            className="h-3.5 w-3.5 shrink-0 transition-transform"
            style={{
              color: "var(--muted)",
              transform: userMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </button>
      </div>
    </aside>
  );
}

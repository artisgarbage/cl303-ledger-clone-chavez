"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        boxShadow:
          "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)",
      }}
    >
      {/* Brand header */}
      <div
        className="px-8 pt-8 pb-6 border-b"
        style={{
          borderColor: "var(--border-subtle)",
          background:
            "linear-gradient(180deg, rgba(79,142,247,0.06) 0%, transparent 100%)",
        }}
      >
        {/* Logo mark */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{
              background:
                "linear-gradient(135deg, var(--accent-blue) 0%, #6366f1 100%)",
              boxShadow: "0 0 24px rgba(79,142,247,0.3)",
            }}
          >
            <svg
              width="20"
              height="20"
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
          <div>
            <p
              className="text-lg font-bold tracking-tight leading-tight"
              style={{ color: "var(--foreground)" }}
            >
              Ledger
            </p>
            <p className="text-xs" style={{ color: "var(--accent-blue)" }}>
              Financial Intelligence
            </p>
          </div>
        </div>

        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase"
          style={{
            background: "var(--surface-2)",
            color: "var(--foreground-muted)",
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--accent-green)" }}
          />
          codelab303 LLC
        </div>
      </div>

      {/* Form */}
      <div className="px-8 py-6 space-y-5">
        <div>
          <h1
            className="text-base font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Sign in to your workspace
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            Enter your credentials to continue
          </p>
        </div>

        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label
              className="block text-[11px] font-semibold uppercase tracking-[0.1em]"
              style={{ color: "var(--muted)" }}
            >
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors"
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
          </div>

          <div className="space-y-1.5">
            <label
              className="block text-[11px] font-semibold uppercase tracking-[0.1em]"
              style={{ color: "var(--muted)" }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors"
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
          </div>

          {error && (
            <div
              className="rounded-lg px-3 py-2.5 text-sm border"
              style={{
                background: "rgba(240,71,71,0.08)",
                borderColor: "rgba(240,71,71,0.3)",
                color: "var(--accent-red)",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50"
            style={{
              background: loading
                ? "var(--accent-blue-dim)"
                : "linear-gradient(135deg, var(--accent-blue) 0%, #6366f1 100%)",
              boxShadow: loading ? "none" : "0 0 24px rgba(79,142,247,0.25)",
            }}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Activity,
  Database,
  Brain,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  MinusCircle,
  RefreshCw,
} from "lucide-react";

type ServiceStatus = "operational" | "degraded" | "not_configured";
type OverallStatus = "operational" | "degraded";

interface ServiceCheck {
  status: ServiceStatus;
  configured?: boolean;
  latencyMs?: number;
  errorType?: string;
}

interface StatusResponse {
  timestamp: string;
  overall: OverallStatus;
  services: {
    database: ServiceCheck;
    anthropic: ServiceCheck;
    harvest: ServiceCheck;
    forecast: ServiceCheck;
  };
}

const POLL_INTERVAL = 30000; // 30 seconds

/**
 * StatusClient - Client component with polling and interactivity
 * Fetches from /api/status and auto-refreshes every 30 seconds
 */
export default function StatusClient() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    }

    try {
      const response = await fetch("/api/status");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch status:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch status");
    } finally {
      setLoading(false);
      if (isManualRefresh) {
        setRefreshing(false);
      }
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Auto-polling with visibility change handling
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pause polling when tab is hidden
        clearInterval(intervalId);
      } else {
        // Resume polling when tab becomes visible
        fetchStatus();
        intervalId = setInterval(() => fetchStatus(), POLL_INTERVAL);
      }
    };

    // Start polling
    intervalId = setInterval(() => fetchStatus(), POLL_INTERVAL);

    // Listen for visibility changes
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchStatus]);

  const handleRefresh = () => {
    fetchStatus(true);
  };

  const getRelativeTime = (timestamp: string) => {
    const seconds = Math.floor(
      (Date.now() - new Date(timestamp).getTime()) / 1000,
    );
    if (seconds < 5) return "just now";
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes === 1) return "1 minute ago";
    return `${minutes} minutes ago`;
  };

  const getStatusBadge = (serviceStatus: ServiceStatus) => {
    switch (serviceStatus) {
      case "operational":
        return (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
            style={{
              background: "rgba(34,197,94,0.12)",
              color: "var(--accent-green)",
            }}
          >
            <CheckCircle className="h-4 w-4" />
            Operational
          </span>
        );
      case "degraded":
        return (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
            style={{
              background: "rgba(245,158,11,0.12)",
              color: "var(--accent-amber)",
            }}
          >
            <AlertCircle className="h-4 w-4" />
            Degraded
          </span>
        );
      case "not_configured":
        return (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
            style={{
              background: "rgba(90,106,133,0.15)",
              color: "var(--muted)",
            }}
          >
            <MinusCircle className="h-4 w-4" />
            Not Configured
          </span>
        );
    }
  };

  const getOverallBadge = (overall: OverallStatus) => {
    if (overall === "operational") {
      return (
        <div
          className="flex items-center gap-3 rounded-xl p-6 border"
          style={{
            background: "rgba(34,197,94,0.08)",
            borderColor: "rgba(34,197,94,0.25)",
          }}
        >
          <CheckCircle
            className="h-8 w-8 shrink-0"
            style={{ color: "var(--accent-green)" }}
          />
          <div>
            <h2
              className="text-2xl font-bold"
              style={{ color: "var(--accent-green)" }}
            >
              All Systems Operational
            </h2>
            <p style={{ color: "var(--muted)" }}>
              All configured services are running normally
            </p>
          </div>
        </div>
      );
    } else {
      return (
        <div
          className="flex items-center gap-3 rounded-xl p-6 border"
          style={{
            background: "rgba(245,158,11,0.08)",
            borderColor: "rgba(245,158,11,0.25)",
          }}
        >
          <AlertCircle
            className="h-8 w-8 shrink-0"
            style={{ color: "var(--accent-amber)" }}
          />
          <div>
            <h2
              className="text-2xl font-bold"
              style={{ color: "var(--accent-amber)" }}
            >
              Service Degraded
            </h2>
            <p style={{ color: "var(--muted)" }}>
              One or more services are experiencing issues
            </p>
          </div>
        </div>
      );
    }
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case "database":
        return <Database className="h-6 w-6" />;
      case "anthropic":
        return <Brain className="h-6 w-6" />;
      case "harvest":
        return <Calendar className="h-6 w-6" />;
      case "forecast":
        return <TrendingUp className="h-6 w-6" />;
      default:
        return <Activity className="h-6 w-6" />;
    }
  };

  const getServiceName = (service: string) => {
    switch (service) {
      case "database":
        return "Database";
      case "anthropic":
        return "AI Narratives (Anthropic)";
      case "harvest":
        return "Harvest Sync";
      case "forecast":
        return "Forecast Sync";
      default:
        return service;
    }
  };

  const getServiceHint = (service: string, check: ServiceCheck) => {
    if (check.status === "not_configured") {
      return (
        <a
          href="/settings"
          className="text-sm underline"
          style={{ color: "var(--accent-blue)" }}
        >
          Configure in Settings →
        </a>
      );
    }

    if (check.status === "degraded") {
      return (
        <p className="text-sm" style={{ color: "var(--accent-amber)" }}>
          {check.errorType || "Service may be experiencing issues"}
        </p>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div
        className="min-h-screen p-8"
        style={{ background: "var(--background)" }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1
              className="text-3xl font-bold mb-2"
              style={{ color: "var(--foreground)" }}
            >
              System Status
            </h1>
            <p style={{ color: "var(--muted)" }}>Loading system health...</p>
          </div>

          {/* Skeleton loader */}
          <div className="space-y-6">
            <div
              className="h-24 rounded-xl animate-pulse"
              style={{ background: "var(--surface)" }}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-40 rounded-xl animate-pulse"
                  style={{ background: "var(--surface)" }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div
        className="min-h-screen p-8"
        style={{ background: "var(--background)" }}
      >
        <div className="max-w-6xl mx-auto">
          <div
            className="rounded-xl p-6 border"
            style={{
              background: "rgba(239,68,68,0.08)",
              borderColor: "rgba(239,68,68,0.3)",
            }}
          >
            <div className="flex items-center gap-3">
              <AlertCircle
                className="h-6 w-6"
                style={{ color: "var(--accent-red)" }}
              />
              <div>
                <h2
                  className="text-lg font-bold"
                  style={{ color: "var(--foreground)" }}
                >
                  Failed to Load Status
                </h2>
                <p style={{ color: "var(--accent-red)" }}>{error}</p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              className="mt-4 px-4 py-2 rounded-lg text-white transition-colors"
              style={{ background: "var(--accent-red)" }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  return (
    <div
      className="min-h-screen p-8"
      style={{ background: "var(--background)" }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1
              className="text-3xl font-bold mb-2"
              style={{ color: "var(--foreground)" }}
            >
              System Status
            </h1>
            <p style={{ color: "var(--muted)" }}>
              Checked {getRelativeTime(status.timestamp)}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              color: "var(--foreground)",
            }}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {/* Overall Status */}
        <div className="mb-8">{getOverallBadge(status.overall)}</div>

        {/* Service Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(status.services).map(([service, check]) => (
            <div
              key={service}
              className="rounded-xl border p-6"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{
                      background:
                        check.status === "operational"
                          ? "rgba(34,197,94,0.12)"
                          : check.status === "degraded"
                            ? "rgba(245,158,11,0.12)"
                            : "rgba(90,106,133,0.12)",
                      color:
                        check.status === "operational"
                          ? "var(--accent-green)"
                          : check.status === "degraded"
                            ? "var(--accent-amber)"
                            : "var(--muted)",
                    }}
                  >
                    {getServiceIcon(service)}
                  </div>
                  <div>
                    <h3
                      className="font-semibold"
                      style={{ color: "var(--foreground)" }}
                    >
                      {getServiceName(service)}
                    </h3>
                  </div>
                </div>
                {getStatusBadge(check.status)}
              </div>

              <div className="space-y-2">
                {check.latencyMs !== undefined && (
                  <div className="text-sm" style={{ color: "var(--muted)" }}>
                    <span
                      className="font-medium"
                      style={{ color: "var(--foreground)" }}
                    >
                      Latency:
                    </span>{" "}
                    {check.latencyMs}ms
                  </div>
                )}

                {getServiceHint(service, check)}
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div
          className="mt-8 p-4 rounded-xl border"
          style={{
            background: "rgba(59,130,246,0.06)",
            borderColor: "rgba(59,130,246,0.2)",
          }}
        >
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            <strong style={{ color: "var(--foreground)" }}>Note:</strong> This
            is an MVP implementation. In production, this page will require
            authentication and pull configuration from the database. See
            docs/tickets/3-status-page-plan.md for details.
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
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
} from 'lucide-react';

type ServiceStatus = 'operational' | 'degraded' | 'not_configured';
type OverallStatus = 'operational' | 'degraded';

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
      const response = await fetch('/api/status');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
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
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchStatus]);

  const handleRefresh = () => {
    fetchStatus(true);
  };

  const getRelativeTime = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes === 1) return '1 minute ago';
    return `${minutes} minutes ago`;
  };

  const getStatusBadge = (serviceStatus: ServiceStatus) => {
    switch (serviceStatus) {
      case 'operational':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
            <CheckCircle className="h-4 w-4" />
            Operational
          </span>
        );
      case 'degraded':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
            <AlertCircle className="h-4 w-4" />
            Degraded
          </span>
        );
      case 'not_configured':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
            <MinusCircle className="h-4 w-4" />
            Not Configured
          </span>
        );
    }
  };

  const getOverallBadge = (overall: OverallStatus) => {
    if (overall === 'operational') {
      return (
        <div className="flex items-center gap-3 rounded-lg bg-green-50 p-6 border-2 border-green-200">
          <CheckCircle className="h-8 w-8 text-green-600" />
          <div>
            <h2 className="text-2xl font-bold text-green-900">All Systems Operational</h2>
            <p className="text-green-700">All configured services are running normally</p>
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-3 rounded-lg bg-amber-50 p-6 border-2 border-amber-200">
          <AlertCircle className="h-8 w-8 text-amber-600" />
          <div>
            <h2 className="text-2xl font-bold text-amber-900">Service Degraded</h2>
            <p className="text-amber-700">One or more services are experiencing issues</p>
          </div>
        </div>
      );
    }
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'database':
        return <Database className="h-6 w-6" />;
      case 'anthropic':
        return <Brain className="h-6 w-6" />;
      case 'harvest':
        return <Calendar className="h-6 w-6" />;
      case 'forecast':
        return <TrendingUp className="h-6 w-6" />;
      default:
        return <Activity className="h-6 w-6" />;
    }
  };

  const getServiceName = (service: string) => {
    switch (service) {
      case 'database':
        return 'Database';
      case 'anthropic':
        return 'AI Narratives (Anthropic)';
      case 'harvest':
        return 'Harvest Sync';
      case 'forecast':
        return 'Forecast Sync';
      default:
        return service;
    }
  };

  const getServiceHint = (service: string, check: ServiceCheck) => {
    if (check.status === 'not_configured') {
      return (
        <a
          href="/settings"
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Configure in Settings →
        </a>
      );
    }
    
    if (check.status === 'degraded') {
      return (
        <p className="text-sm text-amber-700">
          {check.errorType || 'Service may be experiencing issues'}
        </p>
      );
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">System Status</h1>
            <p className="text-gray-600">Loading system health...</p>
          </div>
          
          {/* Skeleton loader */}
          <div className="space-y-6">
            <div className="h-24 bg-gray-200 rounded-lg animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-40 bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-lg bg-red-50 p-6 border-2 border-red-200">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <div>
                <h2 className="text-lg font-bold text-red-900">Failed to Load Status</h2>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">System Status</h1>
            <p className="text-gray-600">
              Checked {getRelativeTime(status.timestamp)}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Overall Status */}
        <div className="mb-8">
          {getOverallBadge(status.overall)}
        </div>

        {/* Service Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(status.services).map(([service, check]) => (
            <div
              key={service}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      check.status === 'operational'
                        ? 'bg-green-100 text-green-600'
                        : check.status === 'degraded'
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {getServiceIcon(service)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {getServiceName(service)}
                    </h3>
                  </div>
                </div>
                {getStatusBadge(check.status)}
              </div>

              <div className="space-y-2">
                {check.latencyMs !== undefined && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Latency:</span> {check.latencyMs}ms
                  </div>
                )}
                
                {getServiceHint(service, check)}
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> This is an MVP implementation. In production, this page will require authentication
            and pull configuration from the database. See docs/tickets/3-status-page-plan.md for details.
          </p>
        </div>
      </div>
    </div>
  );
}

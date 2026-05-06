"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface FullscreenChartProps {
  title: string;
  subtitle?: string;
  className?: string;
  headerRight?: React.ReactNode;
  /** Render prop — receives isFullscreen so chart can adjust its height */
  children: (isFullscreen: boolean) => React.ReactNode;
}

export function FullscreenChart({
  title,
  subtitle,
  className,
  headerRight,
  children,
}: FullscreenChartProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Ensure portal target is available
  useEffect(() => {
    setMounted(true);
  }, []);

  // ESC to close
  useEffect(() => {
    if (!fullscreen) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [fullscreen]);

  const header = (isFs: boolean) => (
    <div className="flex items-center justify-between mb-4 shrink-0">
      <div>
        <h2 className={cn("font-medium", isFs ? "text-base" : "text-sm")}>
          {title}
        </h2>
        {subtitle && (
          <p
            className={cn(
              "text-[var(--muted)] mt-0.5",
              isFs ? "text-sm" : "text-xs",
            )}
          >
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {headerRight}
        <button
          onClick={() => setFullscreen(!isFs)}
          title={isFs ? "Close (Esc)" : "Expand fullscreen"}
          className="p-1.5 rounded-md hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          {isFs ? (
            <X className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Normal card */}
      <div
        className={cn(
          "rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4",
          className,
        )}
      >
        {header(false)}
        {fullscreen ? (
          <div className="flex items-center justify-center h-[220px] text-[var(--muted)] text-sm italic">
            Viewing fullscreen…
          </div>
        ) : (
          children(false)
        )}
      </div>

      {/* Fullscreen overlay via portal */}
      {fullscreen &&
        mounted &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="fixed inset-0 z-[200] bg-[var(--background)]/96 backdrop-blur-md flex flex-col p-8"
            onClick={(e) => {
              if (e.target === e.currentTarget) setFullscreen(false);
            }}
          >
            <div className="flex flex-col h-full w-full max-w-[1600px] mx-auto">
              {header(true)}
              <div className="flex-1 min-h-0">{children(true)}</div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

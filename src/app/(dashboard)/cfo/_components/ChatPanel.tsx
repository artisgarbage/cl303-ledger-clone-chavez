"use client";

/**
 * ChatPanel - Main chat interface for Margot
 *
 * - Optimistic user message display (no swallowed turns)
 * - Cycling thinking states: Thinking… → Analyzing data… → Generating response…
 * - Auto-titles conversation from first user message if no title set
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { MessageList } from "./MessageList";
import { Send, Loader2 } from "lucide-react";

interface ChatPanelProps {
  conversationId: string;
  companyName: string;
  onTitleChange?: (title: string) => void;
}

interface Message {
  id: string;
  role: string;
  content: unknown;
  createdAt: string;
}

const THINKING_PHASES = [
  "Thinking…",
  "Analyzing data…",
  "Generating response…",
];

export function ChatPanel({
  conversationId,
  companyName,
  onTitleChange,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [thinkingPhase, setThinkingPhase] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [conversationTitle, setConversationTitle] = useState<string | null>(
    null,
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const adjustInputHeight = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);
  const phaseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cycle thinking phases while a request is in-flight
  useEffect(() => {
    if (loading) {
      setThinkingPhase(0);
      phaseIntervalRef.current = setInterval(() => {
        setThinkingPhase((p) => (p + 1) % THINKING_PHASES.length);
      }, 2000);
    } else {
      if (phaseIntervalRef.current) {
        clearInterval(phaseIntervalRef.current);
        phaseIntervalRef.current = null;
      }
    }
    return () => {
      if (phaseIntervalRef.current) clearInterval(phaseIntervalRef.current);
    };
  }, [loading]);

  // Fetch conversation on mount / when conversationId changes
  useEffect(() => {
    let cancelled = false;
    const fetchConversation = async () => {
      setFetching(true);
      setMessages([]);
      setConversationTitle(null);
      try {
        const res = await fetch(`/api/cfo/conversations/${conversationId}`);
        if (cancelled) return;
        if (!res.ok) {
          setError("Failed to load conversation");
          return;
        }
        const { conversation } = await res.json();
        if (cancelled) return;
        setMessages(conversation.messages || []);
        setConversationTitle(conversation.title ?? null);
      } catch {
        if (!cancelled) setError("Failed to load conversation");
      } finally {
        if (!cancelled) setFetching(false);
      }
    };
    fetchConversation();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // Auto-scroll to bottom when messages or thinking indicator changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    // Reset textarea height after clearing
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    setError(null);
    setLoading(true);

    // Optimistically show the user's message immediately
    const optimisticId = `opt-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        role: "USER",
        content: userMessage,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      const res = await fetch("/api/cfo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: userMessage }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.error || "Failed to send message");
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        setLoading(false);
        return;
      }

      // Replace optimistic messages with persisted ones (user + assistant)
      const convRes = await fetch(`/api/cfo/conversations/${conversationId}`);
      if (convRes.ok) {
        const { conversation } = await convRes.json();
        setMessages(conversation.messages || []);

        // Auto-title: if no title yet, generate from the first user message
        if (!conversationTitle && !conversation.title) {
          const autoTitle =
            userMessage.length > 60
              ? userMessage.slice(0, 60).trimEnd() + "…"
              : userMessage;
          try {
            const patchRes = await fetch(
              `/api/cfo/conversations/${conversationId}`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: autoTitle }),
              },
            );
            if (patchRes.ok) {
              setConversationTitle(autoTitle);
              onTitleChange?.(autoTitle);
            }
          } catch {
            // non-critical — title can be set manually
          }
        }
      }
    } catch {
      setError("Failed to send message. Please try again.");
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        style={{ background: "var(--background)" }}
      >
        <Loader2
          className="w-7 h-7 animate-spin"
          style={{ color: "var(--muted)" }}
        />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--background)" }}
    >
      {/* Header */}
      <div
        className="border-b px-6 py-4 shrink-0"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <h3
          className="text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Margot — CFO
        </h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
          {companyName}
        </p>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-6 py-5"
        style={{ background: "var(--background)" }}
      >
        <MessageList
          messages={messages}
          isThinking={loading}
          thinkingLabel={THINKING_PHASES[thinkingPhase]}
        />
        <div ref={messagesEndRef} />
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="px-6 py-2.5 border-t text-xs"
          style={{
            background: "rgba(239,68,68,0.1)",
            borderColor: "rgba(239,68,68,0.3)",
            color: "var(--accent-red)",
          }}
        >
          {error}
        </div>
      )}

      {/* Input */}
      <div
        className="border-t px-6 py-4 shrink-0"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            rows={1}
            onChange={(e) => {
              setInput(e.target.value);
              adjustInputHeight();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
              }
            }}
            placeholder="Ask Margot about financials… (Shift+Enter for new line)"
            className="flex-1 px-4 py-2.5 rounded-lg text-sm outline-none transition-colors resize-none leading-relaxed overflow-y-auto"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
              minHeight: "42px",
              maxHeight: "160px",
            }}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-white flex items-center gap-2 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
            style={{ background: "var(--accent-blue)" }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

"use client";

/**
 * ChatPanel - Main chat interface for Margot
 *
 * M1: Synchronous messages, no streaming
 * M2: Will add SSE streaming + show-your-work panel
 */

import { useState, useEffect, useRef } from "react";
import { MessageList } from "./MessageList";
import { Send, Loader2 } from "lucide-react";

interface ChatPanelProps {
  conversationId: string;
  companyName: string;
}

interface Message {
  id: string;
  role: string;
  content: unknown;
  createdAt: string;
}

export function ChatPanel({ conversationId, companyName }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversation messages
  useEffect(() => {
    const fetchConversation = async () => {
      setFetching(true);
      try {
        const res = await fetch(`/api/cfo/conversations/${conversationId}`);
        if (!res.ok) {
          setError("Failed to load conversation");
          return;
        }

        const { conversation } = await res.json();
        setMessages(conversation.messages || []);
      } catch (err) {
        console.error("Error fetching conversation:", err);
        setError("Failed to load conversation");
      } finally {
        setFetching(false);
      }
    };

    fetchConversation();
  }, [conversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/cfo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          message: userMessage,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        setError(errorData.error || "Failed to send message");
        setLoading(false);
        return;
      }

      const data = await res.json();

      // Refetch conversation to get persisted messages
      const convRes = await fetch(`/api/cfo/conversations/${conversationId}`);
      if (convRes.ok) {
        const { conversation } = await convRes.json();
        setMessages(conversation.messages || []);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message. Please try again.");
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
        <MessageList messages={messages} />
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
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Margot about financials…"
            className="flex-1 px-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
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
                Sending
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

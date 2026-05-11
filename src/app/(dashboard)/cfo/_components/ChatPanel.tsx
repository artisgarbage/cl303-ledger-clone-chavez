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
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <h3 className="text-lg font-semibold">Margot — CFO</h3>
        <p className="text-sm text-gray-600">{companyName}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
        <MessageList messages={messages} />
        <div ref={messagesEndRef} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-6 py-3 bg-red-50 border-t border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 bg-white px-6 py-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Margot about financials..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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

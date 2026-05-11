"use client";

/**
 * MessageList - Render conversation messages
 *
 * M1: Basic text rendering
 * M2: Will add tool call trace visualization
 */

import { User, Bot } from "lucide-react";

interface Message {
  id: string;
  role: string;
  content: unknown;
  createdAt: string;
}

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          No messages yet. Start the conversation!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {messages.map((msg) => {
        const isUser = msg.role === "USER";
        const text = extractText(msg.content);

        return (
          <div
            key={msg.id}
            className={`flex gap-3 ${isUser ? "justify-end" : ""}`}
          >
            {!isUser && (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: "var(--surface-2)" }}
              >
                <Bot
                  className="w-4 h-4"
                  style={{ color: "var(--accent-blue)" }}
                />
              </div>
            )}

            <div
              className="max-w-2xl rounded-xl px-4 py-3"
              style={{
                background: isUser
                  ? "var(--accent-blue)"
                  : "var(--surface-2)",
                border: isUser
                  ? "none"
                  : "1px solid var(--border)",
                color: isUser ? "white" : "var(--foreground)",
              }}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {text}
              </p>
              <div
                className="text-[11px] mt-1.5"
                style={{
                  color: isUser ? "rgba(255,255,255,0.6)" : "var(--muted)",
                }}
              >
                {new Date(msg.createdAt).toLocaleTimeString()}
              </div>
            </div>

            {isUser && (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: "var(--surface-2)" }}
              >
                <User className="w-4 h-4" style={{ color: "var(--muted)" }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Extract text from Anthropic content blocks
 */
function extractText(content: unknown): string {
  if (!content) return "";

  if (Array.isArray(content)) {
    return content
      .filter((block) => block?.type === "text")
      .map((block) => block.text)
      .join("\n");
  }

  if (typeof content === "string") return content;

  return JSON.stringify(content);
}

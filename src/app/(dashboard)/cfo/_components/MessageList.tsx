"use client";

/**
 * MessageList - Render conversation messages + thinking indicator
 */

import { User, Bot } from "lucide-react";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";

interface Message {
  id: string;
  role: string;
  content: unknown;
  createdAt: string;
}

interface MessageListProps {
  messages: Message[];
  isThinking?: boolean;
  thinkingLabel?: string;
}

export function MessageList({
  messages,
  isThinking,
  thinkingLabel = "Thinking…",
}: MessageListProps) {
  if (messages.length === 0 && !isThinking) {
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
                background: isUser ? "var(--accent-blue)" : "var(--surface-2)",
                border: isUser ? "none" : "1px solid var(--border)",
                color: isUser ? "white" : "var(--foreground)",
              }}
            >
              {isUser ? (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {text}
                </p>
              ) : (
                <MarkdownRenderer content={text} />
              )}
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

      {/* Thinking indicator */}
      {isThinking && (
        <div className="flex gap-3">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: "var(--surface-2)" }}
          >
            <Bot className="w-4 h-4" style={{ color: "var(--accent-blue)" }} />
          </div>
          <div
            className="rounded-xl px-4 py-3"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="text-sm transition-all duration-300"
                style={{ color: "var(--muted)" }}
              >
                {thinkingLabel}
              </span>
              <span className="flex gap-1 items-end pb-0.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{
                      background: "var(--muted)",
                      animationDelay: `${i * 0.18}s`,
                      display: "inline-block",
                    }}
                  />
                ))}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Extract text from Anthropic content blocks or plain strings
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

interface Message {
  id: string;
  role: string;
  content: unknown;
  createdAt: string;
}

interface MessageListProps {
  messages: Message[];
}

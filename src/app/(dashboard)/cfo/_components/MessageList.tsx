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
      <div className="text-center py-12 text-gray-500">
        <p className="text-sm">No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {messages.map((msg) => {
        const isUser = msg.role === "USER";
        const text = extractText(msg.content);

        return (
          <div key={msg.id} className={`flex gap-3 ${isUser ? "justify-end" : ""}`}>
            {!isUser && (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-blue-600" />
              </div>
            )}

            <div
              className={`max-w-2xl rounded-lg px-4 py-3 ${
                isUser
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-200"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{text}</p>
              <div
                className={`text-xs mt-2 ${
                  isUser ? "text-blue-100" : "text-gray-400"
                }`}
              >
                {new Date(msg.createdAt).toLocaleTimeString()}
              </div>
            </div>

            {isUser && (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-gray-600" />
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

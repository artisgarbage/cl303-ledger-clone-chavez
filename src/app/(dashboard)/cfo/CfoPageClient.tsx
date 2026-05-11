"use client";

/**
 * CFO Page Client Component
 *
 * Manages conversation list + active chat panel
 */

import { useState } from "react";
import { ChatPanel } from "./_components/ChatPanel";
import { Sparkles, Plus } from "lucide-react";

interface Conversation {
  id: string;
  surface: string;
  mode: string;
  title: string | null;
  updatedAt: Date;
  createdAt: Date;
}

interface CfoPageClientProps {
  conversations: Conversation[];
  companyName: string;
}

export function CfoPageClient({
  conversations: initialConversations,
  companyName,
}: CfoPageClientProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);

  const handleNewConversation = async () => {
    try {
      const res = await fetch("/api/cfo/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surface: "WEB",
          mode: "INTERNAL_CFO",
        }),
      });

      if (!res.ok) {
        console.error("Failed to create conversation");
        return;
      }

      const { conversation } = await res.json();
      setConversations((prev) => [conversation, ...prev]);
      setActiveConversationId(conversation.id);
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar: Conversation list */}
      <div
        className="w-72 shrink-0 flex flex-col border-r overflow-y-auto"
        style={{
          background: "var(--sidebar-bg)",
          borderColor: "var(--border)",
        }}
      >
        <div
          className="px-4 pt-5 pb-4 border-b sticky top-0 z-10"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <h2
            className="text-sm font-semibold flex items-center gap-2"
            style={{ color: "var(--foreground)" }}
          >
            <Sparkles
              className="w-4 h-4"
              style={{ color: "var(--accent-blue)" }}
            />
            Margot — CFO
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            Conversational financial analysis
          </p>
        </div>

        <div className="p-3">
          <button
            onClick={handleNewConversation}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90"
            style={{ background: "var(--accent-blue)" }}
          >
            <Plus className="w-4 h-4" />
            New Conversation
          </button>
        </div>

        <div className="px-3 pb-4">
          {conversations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                No conversations yet
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                Start one to begin
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className="w-full text-left px-3 py-2.5 rounded-lg border transition-colors"
                  style={{
                    background:
                      activeConversationId === conv.id
                        ? "var(--surface-2)"
                        : "transparent",
                    borderColor:
                      activeConversationId === conv.id
                        ? "var(--accent-blue)"
                        : "var(--border)",
                  }}
                >
                  <div
                    className="text-xs font-medium truncate"
                    style={{ color: "var(--foreground)" }}
                  >
                    {conv.title || "Untitled conversation"}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>
                    {new Date(conv.updatedAt).toLocaleDateString()}
                  </div>
                  <div
                    className="text-[10px] mt-0.5 font-medium tracking-wide uppercase"
                    style={{ color: "var(--accent-blue)" }}
                  >
                    {conv.mode.replace("_", " ")}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main: Chat panel */}
      <div
        className="flex-1 flex flex-col"
        style={{ background: "var(--background)" }}
      >
        {activeConversationId ? (
          <ChatPanel
            conversationId={activeConversationId}
            companyName={companyName}
          />
        ) : (
          <div
            className="flex-1 flex items-center justify-center"
            style={{ background: "var(--background)" }}
          >
            <div className="text-center max-w-md px-6">
              <Sparkles
                className="w-12 h-12 mx-auto mb-5"
                style={{ color: "var(--muted)" }}
              />
              <h3
                className="text-xl font-semibold mb-2"
                style={{ color: "var(--foreground)" }}
              >
                Welcome to Margot
              </h3>
              <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
                Your conversational CFO. Ask about gross margin trends, project
                profitability, utilization, or generate narrative reports.
              </p>
              <button
                onClick={handleNewConversation}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90 inline-flex items-center gap-2"
                style={{ background: "var(--accent-blue)" }}
              >
                <Plus className="w-4 h-4" />
                Start a conversation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

/**
 * CFO Page Client Component
 *
 * Manages conversation list + active chat panel
 */

import { useState, useRef, useEffect } from "react";
import { ChatPanel } from "./_components/ChatPanel";
import { Sparkles, Plus, Pencil, Check, X } from "lucide-react";

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // Focus + select text when entering edit mode
  useEffect(() => {
    if (editingId) {
      setTimeout(() => {
        editInputRef.current?.focus();
        editInputRef.current?.select();
      }, 0);
    }
  }, [editingId]);

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

  const startEditing = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditingValue(conv.title || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingValue("");
  };

  const saveTitle = async (id: string) => {
    const title = editingValue.trim();
    setEditingId(null);
    setEditingValue("");
    if (!title) return;

    try {
      const res = await fetch(`/api/cfo/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title } : c)),
        );
      }
    } catch (err) {
      console.error("Failed to rename conversation:", err);
    }
  };

  // Called by ChatPanel when auto-title is generated from first message
  const handleTitleChange = (id: string, title: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c)),
    );
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
                <div key={conv.id} className="group relative">
                  <button
                    onClick={() => {
                      if (editingId !== conv.id)
                        setActiveConversationId(conv.id);
                    }}
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
                    {editingId === conv.id ? (
                      /* Inline rename input */
                      <div
                        className="flex items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          ref={editInputRef}
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveTitle(conv.id);
                            if (e.key === "Escape") cancelEditing();
                          }}
                          onBlur={() => saveTitle(conv.id)}
                          className="flex-1 min-w-0 text-xs bg-transparent outline-none border-b pb-0.5"
                          style={{
                            color: "var(--foreground)",
                            borderColor: "var(--accent-blue)",
                          }}
                        />
                        <Check
                          className="w-3.5 h-3.5 shrink-0 cursor-pointer"
                          style={{ color: "var(--accent-green)" }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            saveTitle(conv.id);
                          }}
                        />
                        <X
                          className="w-3.5 h-3.5 shrink-0 cursor-pointer"
                          style={{ color: "var(--muted)" }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            cancelEditing();
                          }}
                        />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1 min-w-0">
                          <span
                            className="text-xs font-medium truncate flex-1 min-w-0"
                            style={{ color: "var(--foreground)" }}
                          >
                            {conv.title || "Untitled conversation"}
                          </span>
                          <button
                            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
                            onClick={(e) => startEditing(conv, e)}
                            title="Rename conversation"
                          >
                            <Pencil
                              className="w-3 h-3"
                              style={{ color: "var(--muted)" }}
                            />
                          </button>
                        </div>
                        <div
                          className="text-[11px] mt-0.5"
                          style={{ color: "var(--muted)" }}
                        >
                          {new Date(conv.updatedAt).toLocaleDateString()}
                        </div>
                        <div
                          className="text-[10px] mt-0.5 font-medium tracking-wide uppercase"
                          style={{ color: "var(--accent-blue)" }}
                        >
                          {conv.mode.replace("_", " ")}
                        </div>
                      </>
                    )}
                  </button>
                </div>
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
            onTitleChange={(title) =>
              handleTitleChange(activeConversationId, title)
            }
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

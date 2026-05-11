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
      <div className="w-80 border-r border-gray-200 bg-gray-50 overflow-y-auto">
        <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Margot — CFO
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Conversational financial analysis
          </p>
        </div>

        <div className="p-4">
          <button
            onClick={handleNewConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            New Conversation
          </button>
        </div>

        <div className="px-4 pb-4">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Start one to begin</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    activeConversationId === conv.id
                      ? "bg-blue-100 border border-blue-300"
                      : "bg-white border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-medium text-sm truncate">
                    {conv.title || "Untitled conversation"}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(conv.updatedAt).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {conv.mode.replace("_", " ")}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main: Chat panel */}
      <div className="flex-1 flex flex-col">
        {activeConversationId ? (
          <ChatPanel
            conversationId={activeConversationId}
            companyName={companyName}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-md">
              <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Welcome to Margot
              </h3>
              <p className="text-gray-600 mb-6">
                Your conversational CFO. Ask about gross margin trends, project
                profitability, utilization, or generate narrative reports.
              </p>
              <button
                onClick={handleNewConversation}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center gap-2"
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

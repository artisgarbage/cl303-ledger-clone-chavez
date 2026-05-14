/**
 * POST /api/cfo/chat
 *
 * Execute a chat turn with Margot. M1: synchronous, no streaming.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-helpers";
import { handleWebChatTurn } from "@/lib/cfo-agent";
import { z } from "zod";

const ChatRequestSchema = z.object({
  conversationId: z.string().cuid(),
  message: z.string().min(1).max(10000),
});

export async function POST(req: NextRequest) {
  try {
    // Auth
    const session = await requireSession();
    const companyId = session.user.companyId;

    // Parse body
    const body = await req.json();
    const { conversationId, message } = ChatRequestSchema.parse(body);

    // Verify conversation belongs to this company + user
    const { prisma } = await import("@/lib/prisma");
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { companyId: true, userId: true },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    if (conversation.companyId !== companyId) {
      return NextResponse.json(
        { error: "Forbidden: conversation belongs to another company" },
        { status: 403 },
      );
    }

    if (conversation.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden: conversation belongs to another user" },
        { status: 403 },
      );
    }

    // Execute turn
    const response = await handleWebChatTurn(
      { conversationId, message },
      companyId,
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("[POST /api/cfo/chat] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message.includes("ANTHROPIC_API_KEY")) {
      return NextResponse.json(
        { error: "AI service unavailable. Contact support." },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

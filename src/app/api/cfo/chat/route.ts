/**
 * POST /api/cfo/chat
 *
 * Execute a chat turn with Margot. M1: synchronous, no streaming.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-helpers";
import { handleWebChatTurn } from "@/lib/cfo-agent";
import { assertMode, recordUsage } from "@/lib/billing/entitlements";
import { PlanUpgradeRequired, QuotaExceeded } from "@/lib/billing/errors";
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
    const userId = session.user.id;

    // Parse body
    const body = await req.json();
    const { conversationId, message } = ChatRequestSchema.parse(body);

    // Verify conversation belongs to this company + user
    const { prisma } = await import("@/lib/prisma");
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { companyId: true, userId: true, mode: true },
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

    if (conversation.userId !== userId) {
      return NextResponse.json(
        { error: "Forbidden: conversation belongs to another user" },
        { status: 403 },
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // BILLING: Check mode entitlement
    // Internal mode: available on all plans
    // Proposal/Board modes: require STUDIO or higher
    // ───────────────────────────────────────────────────────────────────────
    await assertMode(companyId, conversation.mode);

    // Execute turn
    const response = await handleWebChatTurn(
      { conversationId, message },
      companyId,
    );

    // ───────────────────────────────────────────────────────────────────────
    // BILLING: Record usage AFTER successful turn
    // CFO_TURN is the base metered unit.
    // Mode-specific usage kinds (MODE_PROPOSAL_USED, MODE_BOARD_USED) deferred to M2.
    // ───────────────────────────────────────────────────────────────────────
    const usageResult = await recordUsage(
      companyId,
      "CFO_TURN",
      1,
      {
        conversationId,
        mode: conversation.mode,
        messageLength: message.length,
      },
      userId
    );

    return NextResponse.json({
      ...response,
      // Include usage info for client awareness
      usage: {
        runningTotal: usageResult.runningTotal,
        withinCap: usageResult.withinCap,
        overageUnits: usageResult.overageUnits,
      },
    });
  } catch (error) {
    console.error("[POST /api/cfo/chat] Error:", error);

    // Billing-specific errors
    if (error instanceof QuotaExceeded) {
      return NextResponse.json(error.toJSON(), {
        status: error.overageAvailable ? 402 : 429,
      });
    }

    if (error instanceof PlanUpgradeRequired) {
      return NextResponse.json(error.toJSON(), { status: 402 });
    }

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

/**
 * GET /api/cfo/conversations - List user's conversations
 * POST /api/cfo/conversations - Create new conversation
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { generateTitle } from "@/lib/cfo-agent";

const CreateConversationSchema = z.object({
  surface: z.enum(["WEB", "SLACK"]),
  mode: z.enum(["INTERNAL_CFO", "PROPOSAL_BIZDEV", "BOARD_INVESTOR"]).optional(),
  initialMessage: z.string().min(1).max(1000).optional(),
});

export async function GET() {
  try {
    const session = await requireSession();
    const companyId = session.user.companyId;
    const userId = session.user.id!;

    const conversations = await prisma.conversation.findMany({
      where: {
        companyId,
        userId,
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        surface: true,
        mode: true,
        title: true,
        updatedAt: true,
        createdAt: true,
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            role: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("[GET /api/cfo/conversations] Error:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const companyId = session.user.companyId;
    const userId = session.user.id!;

    const body = await req.json();
    const { surface, mode = "INTERNAL_CFO", initialMessage } = CreateConversationSchema.parse(body);

    // Generate title from initial message if provided
    const title = initialMessage ? generateTitle(initialMessage) : null;

    const conversation = await prisma.conversation.create({
      data: {
        companyId,
        userId,
        surface,
        mode,
        title,
      },
      select: {
        id: true,
        surface: true,
        mode: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/cfo/conversations] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.errors },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

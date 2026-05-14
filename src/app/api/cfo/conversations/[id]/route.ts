/**
 * GET /api/cfo/conversations/[id] - Retrieve conversation + messages
 * DELETE /api/cfo/conversations/[id] - Delete conversation
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await requireSession();
    const companyId = session.user.companyId;
    const userId = session.user.id!;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    // Multi-tenant + user isolation
    if (
      conversation.companyId !== companyId ||
      conversation.userId !== userId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("[GET /api/cfo/conversations/[id]] Error:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await requireSession();
    const companyId = session.user.companyId;
    const userId = session.user.id!;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: { companyId: true, userId: true },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    // Multi-tenant + user isolation
    if (
      conversation.companyId !== companyId ||
      conversation.userId !== userId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete (CASCADE will delete messages)
    await prisma.conversation.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/cfo/conversations/[id]] Error:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await requireSession();
    const companyId = session.user.companyId;
    const userId = session.user.id!;

    const body = await req.json();
    const { title } = z.object({ title: z.string().max(200) }).parse(body);

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: { companyId: true, userId: true },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    if (
      conversation.companyId !== companyId ||
      conversation.userId !== userId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: { title },
      select: { id: true, title: true },
    });

    return NextResponse.json({ conversation: updated });
  } catch (error) {
    console.error("[PATCH /api/cfo/conversations/[id]] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
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

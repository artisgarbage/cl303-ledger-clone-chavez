import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") return null;
  return session;
}

// PATCH /api/admin/users/[id] — update role
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (!session)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const companyId = (session.user as { companyId?: string }).companyId;
  if (!companyId)
    return NextResponse.json({ error: "No company" }, { status: 400 });

  const { id } = await params;

  // ─────────────────────────────────────────────────────────────────────────
  // SECURITY: Verify the target user belongs to the same company before update
  // Prevents IDOR — admin from Company A cannot modify users in Company B
  // ─────────────────────────────────────────────────────────────────────────
  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: { companyId: true },
  });

  if (!targetUser || targetUser.companyId !== companyId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    role?: string;
    name?: string;
    password?: string;
  };

  const allowedRoles = ["ADMIN", "MEMBER", "VIEWER"];

  // Prevent self-demotion
  const selfId = session.user?.id;
  if (id === selfId && body.role && body.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Cannot change your own role" },
      { status: 400 },
    );
  }

  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.role && allowedRoles.includes(body.role)) {
    updateData.role = body.role;
  }
  if (body.password) {
    updateData.password = await bcrypt.hash(body.password, 12);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json(user);
}

// DELETE /api/admin/users/[id] — remove user
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (!session)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const companyId = (session.user as { companyId?: string }).companyId;
  if (!companyId)
    return NextResponse.json({ error: "No company" }, { status: 400 });

  const { id } = await params;

  if (id === session.user?.id) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 },
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECURITY: Verify the target user belongs to the same company before delete
  // Prevents IDOR — admin from Company A cannot delete users in Company B
  // ─────────────────────────────────────────────────────────────────────────
  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: { companyId: true },
  });

  if (!targetUser || targetUser.companyId !== companyId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

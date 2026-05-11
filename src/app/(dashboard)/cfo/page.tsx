/**
 * /cfo - CFO Agent (Margot Hale) main page
 *
 * Server component: fetch conversations, delegate to client component for chat UI
 */

import { requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { CfoPageClient } from "./CfoPageClient";

export const metadata = {
  title: "Margot — CFO | Ledger",
  description: "Conversational financial analysis with Margot, your CFO agent",
};

export default async function CfoPage() {
  const session = await requireSession();
  const companyId = session.user.companyId;
  const userId = session.user.id!;

  // Fetch recent conversations
  const conversations = await prisma.conversation.findMany({
    where: {
      companyId,
      userId,
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: {
      id: true,
      surface: true,
      mode: true,
      title: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  // Fetch company name for persona
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true },
  });

  return (
    <CfoPageClient
      conversations={conversations}
      companyName={company?.name ?? "your company"}
    />
  );
}

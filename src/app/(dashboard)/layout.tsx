import { Sidebar } from "@/components/layout/Sidebar";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = (session.user as { companyId?: string }).companyId;
  const company = companyId
    ? await prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true },
      })
    : null;

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <Sidebar
        userName={session.user.name}
        userRole={(session.user as { role?: string }).role ?? "Member"}
        companyName={company?.name}
      />
      <main className="flex-1 overflow-y-auto min-w-0">{children}</main>
    </div>
  );
}

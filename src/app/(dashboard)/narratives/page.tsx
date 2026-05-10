import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { NarrativesClient } from './NarrativesClient';

export default async function NarrativesPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const companyId = (session.user as { companyId: string }).companyId;
  if (!companyId) redirect('/settings');

  // Fetch recent narratives
  const recentNarratives = await prisma.narrative.findMany({
    where: { companyId },
    select: {
      id: true,
      type: true,
      title: true,
      periodStart: true,
      periodEnd: true,
      generatedAt: true,
      content: true,
    },
    orderBy: { generatedAt: 'desc' },
    take: 10,
  });

  return <NarrativesClient recentNarratives={recentNarratives} />;
}

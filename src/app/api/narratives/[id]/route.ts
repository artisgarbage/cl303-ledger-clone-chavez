import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== 'ADMIN') return null;
  return session;
}

/**
 * GET /api/narratives/[id]
 * Fetch a single narrative by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const companyId = (session.user as { companyId?: string }).companyId;
  if (!companyId) {
    return NextResponse.json({ error: 'No company' }, { status: 400 });
  }

  try {
    const { id } = await params;

    const narrative = await prisma.narrative.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!narrative) {
      return NextResponse.json({ error: 'Narrative not found' }, { status: 404 });
    }

    return NextResponse.json(narrative);
  } catch (error) {
    console.error('Error fetching narrative:', error);
    return NextResponse.json(
      { error: 'Failed to fetch narrative' },
      { status: 500 }
    );
  }
}

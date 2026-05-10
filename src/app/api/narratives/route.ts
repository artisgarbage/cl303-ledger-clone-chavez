import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAccess, extractRequestMetadata } from '@/lib/audit';
import { NarrativeType } from '@prisma/client';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== 'ADMIN') return null;
  return session;
}

/**
 * GET /api/narratives
 * List narratives with pagination and filters
 */
export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const companyId = (session.user as { companyId?: string }).companyId;
  const userId = session.user?.id;

  if (!companyId || !userId) {
    return NextResponse.json({ error: 'No company' }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);

  // Parse query params
  const type = searchParams.get('type') as NarrativeType | null;
  const periodStart = searchParams.get('periodStart');
  const periodEnd = searchParams.get('periodEnd');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  // Build where clause
  const where: {
    companyId: string;
    type?: NarrativeType;
    periodStart?: { gte: Date };
    periodEnd?: { lte: Date };
  } = { companyId };

  if (type && Object.values(NarrativeType).includes(type)) {
    where.type = type;
  }
  if (periodStart) {
    where.periodStart = { gte: new Date(periodStart) };
  }
  if (periodEnd) {
    where.periodEnd = { lte: new Date(periodEnd) };
  }

  try {
    const [narratives, total] = await Promise.all([
      prisma.narrative.findMany({
        where,
        select: {
          id: true,
          type: true,
          title: true,
          periodStart: true,
          periodEnd: true,
          generatedAt: true,
        },
        orderBy: { generatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.narrative.count({ where }),
    ]);

    // Audit log: bulk narrative read
    await logAccess({
      userId,
      companyId,
      action: 'read',
      resource: 'narrative',
      metadata: {
        ...extractRequestMetadata(req),
        count: narratives.length,
        filters: { type, periodStart, periodEnd },
      },
    });

    return NextResponse.json({
      narratives,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching narratives:', error);
    return NextResponse.json(
      { error: 'Failed to fetch narratives' },
      { status: 500 }
    );
  }
}

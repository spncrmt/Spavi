import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

interface FaxListItem {
  id: number;
  externalId: string | null;
  fromNumber: string;
  receivedAt: string;
  status: string;
  metadata: {
    patientName?: string;
    dateOfBirth?: string;
    mrn?: string;
    referringProvider?: string;
    referringPractice?: string;
    dateOfService?: string;
    faxDate?: string;
    phoneNumber?: string;
  } | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FaxListResponse {
  faxes?: FaxListItem[];
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FaxListResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { status } = req.query;

    // Build query
    const where: any = {};
    if (status && typeof status === 'string') {
      where.status = status;
    }

    // Fetch faxes sorted by receivedAt descending
    const faxes = await prisma.fax.findMany({
      where,
      orderBy: {
        receivedAt: 'desc',
      },
      select: {
        id: true,
        externalId: true,
        fromNumber: true,
        receivedAt: true,
        status: true,
        metadata: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Parse metadata JSON for each fax
    const formattedFaxes: FaxListItem[] = faxes.map((fax) => ({
      id: fax.id,
      externalId: fax.externalId,
      fromNumber: fax.fromNumber,
      receivedAt: fax.receivedAt.toISOString(),
      status: fax.status,
      metadata: fax.metadata ? JSON.parse(fax.metadata) : null,
      errorMessage: fax.errorMessage,
      createdAt: fax.createdAt.toISOString(),
      updatedAt: fax.updatedAt.toISOString(),
    }));

    return res.status(200).json({ faxes: formattedFaxes });
  } catch (error) {
    console.error('Error fetching faxes:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch faxes',
    });
  }
}

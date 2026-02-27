import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

interface FaxDetail {
  id: number;
  externalId: string | null;
  fromNumber: string;
  receivedAt: string;
  status: string;
  documentType: string | null;
  documentSubtype: string | null;
  confidence: number | null;
  rawText: string | null;
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
  sections: Record<string, string> | null;
  pdfPath: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FaxResponse {
  fax?: FaxDetail;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FaxResponse>
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid fax ID' });
  }

  const faxId = parseInt(id, 10);
  if (isNaN(faxId)) {
    return res.status(400).json({ error: 'Invalid fax ID format' });
  }

  if (req.method === 'GET') {
    try {
      const fax = await prisma.fax.findUnique({
        where: { id: faxId },
      });

      if (!fax) {
        return res.status(404).json({ error: 'Fax not found' });
      }

      const formattedFax: FaxDetail = {
        id: fax.id,
        externalId: fax.externalId,
        fromNumber: fax.fromNumber,
        receivedAt: fax.receivedAt.toISOString(),
        status: fax.status,
        documentType: fax.documentType,
        documentSubtype: fax.documentSubtype,
        confidence: fax.confidence,
        rawText: fax.rawText,
        metadata: fax.metadata ? JSON.parse(fax.metadata) : null,
        sections: fax.sections ? JSON.parse(fax.sections) : null,
        pdfPath: fax.pdfPath,
        errorMessage: fax.errorMessage,
        createdAt: fax.createdAt.toISOString(),
        updatedAt: fax.updatedAt.toISOString(),
      };

      return res.status(200).json({ fax: formattedFax });
    } catch (error) {
      console.error('Error fetching fax:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch fax',
      });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { status } = req.body;

      // Validate status if provided
      const validStatuses = ['pending', 'processing', 'completed', 'failed', 'reviewed'];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }

      const updateData: any = {};
      if (status) {
        updateData.status = status;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      const fax = await prisma.fax.update({
        where: { id: faxId },
        data: updateData,
      });

      const formattedFax: FaxDetail = {
        id: fax.id,
        externalId: fax.externalId,
        fromNumber: fax.fromNumber,
        receivedAt: fax.receivedAt.toISOString(),
        status: fax.status,
        documentType: fax.documentType,
        documentSubtype: fax.documentSubtype,
        confidence: fax.confidence,
        rawText: fax.rawText,
        metadata: fax.metadata ? JSON.parse(fax.metadata) : null,
        sections: fax.sections ? JSON.parse(fax.sections) : null,
        pdfPath: fax.pdfPath,
        errorMessage: fax.errorMessage,
        createdAt: fax.createdAt.toISOString(),
        updatedAt: fax.updatedAt.toISOString(),
      };

      return res.status(200).json({ fax: formattedFax });
    } catch (error) {
      console.error('Error updating fax:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to update fax',
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.fax.delete({
        where: { id: faxId },
      });

      return res.status(200).json({ fax: undefined });
    } catch (error) {
      console.error('Error deleting fax:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to delete fax',
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

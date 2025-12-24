import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

/**
 * API endpoint to serve the original PDF for a fax
 * GET /api/faxes/[id]/pdf
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid fax ID' });
  }

  const faxId = parseInt(id, 10);
  if (isNaN(faxId)) {
    return res.status(400).json({ error: 'Invalid fax ID format' });
  }

  try {
    const fax = await prisma.fax.findUnique({
      where: { id: faxId },
      select: { pdfPath: true },
    });

    if (!fax) {
      return res.status(404).json({ error: 'Fax not found' });
    }

    if (!fax.pdfPath) {
      return res.status(404).json({ error: 'No PDF available for this fax' });
    }

    // Resolve the PDF path
    const pdfFullPath = path.join(process.cwd(), fax.pdfPath);

    if (!fs.existsSync(pdfFullPath)) {
      return res.status(404).json({ error: 'PDF file not found on disk' });
    }

    // Read the PDF file
    const pdfBuffer = fs.readFileSync(pdfFullPath);

    // Set headers for PDF response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="fax-${faxId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Error serving PDF:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to serve PDF',
    });
  }
}

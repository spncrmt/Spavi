import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

interface ManualFaxRequest {
  text: string;
  fromNumber?: string;
}

interface ManualFaxResponse {
  success: boolean;
  faxId?: number;
  error?: string;
}

/**
 * API endpoint to create a fax from manual text input
 * POST /api/faxes/manual
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ManualFaxResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { text, fromNumber } = req.body as ManualFaxRequest;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Clinical text is required',
      });
    }

    // Create fax record with status "pending"
    const fax = await prisma.fax.create({
      data: {
        externalId: `manual-${Date.now()}`,
        fromNumber: fromNumber || 'Manual Upload',
        receivedAt: new Date(),
        status: 'pending',
        rawText: text.trim(),
      },
    });

    // Return success immediately
    res.status(200).json({
      success: true,
      faxId: fax.id,
    });

    // Process fax in background
    setImmediate(() => {
      processFax(fax.id, text.trim()).catch(console.error);
    });
  } catch (error) {
    console.error('Manual fax error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

/**
 * Process the fax text through the AI pipeline
 */
async function processFax(faxId: number, text: string) {
  try {
    // Update status to processing
    await prisma.fax.update({
      where: { id: faxId },
      data: { status: 'processing' },
    });

    // Call generate API to get sections and metadata
    const generateResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        selectedSections: ['ChiefComplaint', 'HPI', 'ReviewOfSystems', 'PhysicalExam', 'Assessment', 'Plan', 'Disposition'],
      }),
    });

    const generateData = await generateResponse.json();

    if (!generateResponse.ok) {
      throw new Error(generateData.error || 'Failed to generate sections');
    }

    // Update fax record with results
    await prisma.fax.update({
      where: { id: faxId },
      data: {
        status: 'completed',
        metadata: generateData.metadata ? JSON.stringify(generateData.metadata) : null,
        sections: JSON.stringify(generateData.sections),
      },
    });

    console.log(`[Manual Fax ${faxId}] Processing completed successfully`);
  } catch (error) {
    console.error(`[Manual Fax ${faxId}] Processing failed:`, error);

    await prisma.fax.update({
      where: { id: faxId },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

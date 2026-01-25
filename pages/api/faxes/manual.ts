import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { deidentify, summarizeRedactions, reidentifySections, reidentifyMetadata } from '@/lib/deidentify';

type AIProvider = 'claude' | 'openai' | 'ollama';

interface ManualFaxRequest {
  text: string;
  fromNumber?: string;
  provider?: AIProvider;
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
    const { text, fromNumber, provider } = req.body as ManualFaxRequest;

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
      processFax(fax.id, text.trim(), provider).catch(console.error);
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
async function processFax(faxId: number, text: string, provider?: AIProvider) {
  try {
    // Update status to processing
    await prisma.fax.update({
      where: { id: faxId },
      data: { status: 'processing' },
    });

    // For local AI (Ollama), we can skip de-identification since data stays on device
    const useLocalAI = provider === 'ollama';
    
    let textToProcess = text;
    let redactions: any = [];
    
    if (!useLocalAI) {
      // DE-IDENTIFY the text before sending to external AI
      console.log(`[Manual Fax ${faxId}] De-identifying text before AI processing...`);
      const deidentified = await deidentify(text);
      textToProcess = deidentified.text;
      redactions = deidentified.redactions;
      console.log(`[Manual Fax ${faxId}] De-identified: ${summarizeRedactions(redactions)}`);
    } else {
      console.log(`[Manual Fax ${faxId}] Using local AI (Ollama) - skipping de-identification`);
    }

    // Call generate API
    const generateResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: textToProcess,
        selectedSections: ['ChiefComplaint', 'HPI', 'ReviewOfSystems', 'PhysicalExam', 'Assessment', 'Plan', 'Disposition'],
        provider: provider, // Pass provider to generate API
      }),
    });

    const generateData = await generateResponse.json();

    if (!generateResponse.ok) {
      throw new Error(generateData.error || 'Failed to generate sections');
    }

    let finalSections = generateData.sections;
    let finalMetadata = generateData.metadata;

    // RE-IDENTIFY: Restore original PHI values in the AI output (only if de-identification was done)
    if (!useLocalAI && redactions.length > 0) {
      console.log(`[Manual Fax ${faxId}] Re-identifying AI output with original values...`);
      finalSections = reidentifySections(generateData.sections, redactions);
      finalMetadata = reidentifyMetadata(generateData.metadata, redactions);
    }

    // Update fax record with results
    await prisma.fax.update({
      where: { id: faxId },
      data: {
        status: 'completed',
        metadata: finalMetadata ? JSON.stringify(finalMetadata) : null,
        sections: JSON.stringify(finalSections),
      },
    });

    console.log(`[Manual Fax ${faxId}] Processing completed successfully (provider: ${provider || 'default'})`);
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

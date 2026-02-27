import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { deidentify, summarizeRedactions, reidentifySections, reidentifyMetadata } from '@/lib/deidentify';
import { classifyDocument, getDocumentTypeLabel } from '@/lib/documentClassifier';
import { getSectionsForDocumentType } from '@/lib/prompt';

type AIProvider = 'claude' | 'openai' | 'ollama';

interface ReprocessResponse {
  success: boolean;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ReprocessResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { provider } = req.body as { provider?: AIProvider };

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid fax ID' });
  }

  const faxId = parseInt(id, 10);
  if (isNaN(faxId)) {
    return res.status(400).json({ success: false, error: 'Invalid fax ID format' });
  }

  try {
    const fax = await prisma.fax.findUnique({
      where: { id: faxId },
    });

    if (!fax) {
      return res.status(404).json({ success: false, error: 'Fax not found' });
    }

    if (!fax.rawText) {
      return res.status(400).json({ success: false, error: 'No raw text to reprocess' });
    }

    res.status(200).json({ success: true });

    setImmediate(() => {
      processFax(faxId, fax.rawText!, provider).catch(console.error);
    });
  } catch (error) {
    console.error('Reprocess error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

async function processFax(faxId: number, text: string, provider?: AIProvider) {
  try {
    await prisma.fax.update({
      where: { id: faxId },
      data: { 
        status: 'processing',
        errorMessage: null,
      },
    });

    console.log(`[Reprocess Fax ${faxId}] Classifying document type...`);
    const classification = classifyDocument(text);
    console.log(`[Reprocess Fax ${faxId}] Document classified as: ${getDocumentTypeLabel(classification.type)}`);

    const sectionsToExtract = getSectionsForDocumentType(classification.type);

    await prisma.fax.update({
      where: { id: faxId },
      data: {
        documentType: classification.type,
        documentSubtype: classification.subtype || null,
        confidence: classification.confidence,
      },
    });

    const useLocalAI = provider === 'ollama';
    
    let textToProcess = text;
    let redactions: any = [];
    
    if (!useLocalAI) {
      console.log(`[Reprocess Fax ${faxId}] De-identifying text...`);
      const deidentified = await deidentify(text);
      textToProcess = deidentified.text;
      redactions = deidentified.redactions;
      console.log(`[Reprocess Fax ${faxId}] De-identified: ${summarizeRedactions(redactions)}`);
    } else {
      console.log(`[Reprocess Fax ${faxId}] Using local AI (Ollama) - skipping de-identification`);
    }

    const generateResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: textToProcess,
        selectedSections: sectionsToExtract,
        provider: provider,
        documentType: classification.type,
      }),
    });

    const generateData = await generateResponse.json();

    if (!generateResponse.ok) {
      throw new Error(generateData.error || 'Failed to generate sections');
    }

    let finalSections = generateData.sections;
    let finalMetadata = generateData.metadata;

    if (!useLocalAI && redactions.length > 0) {
      console.log(`[Reprocess Fax ${faxId}] Re-identifying AI output...`);
      finalSections = reidentifySections(generateData.sections, redactions);
      finalMetadata = reidentifyMetadata(generateData.metadata, redactions);
    }

    await prisma.fax.update({
      where: { id: faxId },
      data: {
        status: 'completed',
        metadata: finalMetadata ? JSON.stringify(finalMetadata) : null,
        sections: JSON.stringify(finalSections),
      },
    });

    console.log(`[Reprocess Fax ${faxId}] Reprocessing completed (provider: ${provider || 'default'})`);
  } catch (error) {
    console.error(`[Reprocess Fax ${faxId}] Failed:`, error);

    await prisma.fax.update({
      where: { id: faxId },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

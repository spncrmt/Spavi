import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { deidentify, summarizeRedactions, reidentifySections, reidentifyMetadata } from '@/lib/deidentify';
import { classifyDocument, getDocumentTypeLabel, getSuggestedSections } from '@/lib/documentClassifier';
import { getSectionsForDocumentType } from '@/lib/prompt';
import fs from 'fs';
import path from 'path';
import PDFParser from 'pdf2json';
import { createWorker } from 'tesseract.js';
import { createCanvas } from 'canvas';

interface WebhookPayload {
  from: string;
  timestamp: string;
  pdfUrl: string;
  externalId?: string;
}

interface WebhookResponse {
  success: boolean;
  faxId?: number;
  error?: string;
}

// PDF text extraction (from extract-pdf.ts)
async function extractTextFromPDF(filepath: string): Promise<string> {
  const pdfParser = new PDFParser();

  return new Promise<string>((resolve, reject) => {
    let fullText = '';

    pdfParser.on('pdfParser_dataError', (errData: any) => {
      reject(new Error(errData.parserError));
    });

    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      try {
        const pages = pdfData.Pages || [];

        for (const page of pages) {
          const texts = page.Texts || [];
          for (const text of texts) {
            const textRuns = text.R || [];
            for (const run of textRuns) {
              if (run.T) {
                try {
                  fullText += decodeURIComponent(run.T) + ' ';
                } catch (decodeError) {
                  fullText += run.T + ' ';
                }
              }
            }
          }
          fullText += '\n\n';
        }

        resolve(fullText.trim());
      } catch (err) {
        reject(err);
      }
    });

    pdfParser.loadPDF(filepath);
  });
}

// OCR extraction for scanned PDFs (from extract-pdf.ts)
async function extractTextWithOCR(filepath: string): Promise<string> {
  const pdfParser = new PDFParser();

  const pdfData: any = await new Promise((resolve, reject) => {
    pdfParser.on('pdfParser_dataError', (errData: any) => {
      reject(new Error(errData.parserError));
    });

    pdfParser.on('pdfParser_dataReady', (data: any) => {
      resolve(data);
    });

    pdfParser.loadPDF(filepath);
  });

  const worker = await createWorker('eng');

  let fullText = '';

  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const dataBuffer = fs.readFileSync(filepath);
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(dataBuffer) }).promise;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');

    await page.render({
      canvasContext: context as any,
      viewport: viewport,
      canvas: canvas as any,
    }).promise;

    const imageBuffer = canvas.toBuffer('image/png');
    const { data } = await worker.recognize(imageBuffer);
    fullText += data.text + '\n\n';
  }

  await worker.terminate();

  return fullText.trim();
}

// Process fax asynchronously
async function processFax(faxId: number, pdfPath: string) {
  try {
    // Update status to processing
    await prisma.fax.update({
      where: { id: faxId },
      data: { status: 'processing' },
    });

    // Extract text from PDF
    let pdfText = await extractTextFromPDF(pdfPath);

    // If no text or very little, try OCR
    if (!pdfText || pdfText.trim().length < 50) {
      console.log(`[Fax ${faxId}] No text found, trying OCR...`);
      pdfText = await extractTextWithOCR(pdfPath);
    }

    if (!pdfText || pdfText.trim().length === 0) {
      throw new Error('No text could be extracted from the PDF');
    }

    // CLASSIFY the document type
    console.log(`[Fax ${faxId}] Classifying document type...`);
    const classification = classifyDocument(pdfText);
    console.log(`[Fax ${faxId}] Document classified as: ${getDocumentTypeLabel(classification.type)} (confidence: ${(classification.confidence * 100).toFixed(0)}%)`);
    console.log(`[Fax ${faxId}] Detected keywords: ${classification.detectedKeywords.slice(0, 5).join(', ')}`);

    // Get document-type-specific sections
    const sectionsToExtract = getSectionsForDocumentType(classification.type);
    console.log(`[Fax ${faxId}] Will extract sections: ${sectionsToExtract.join(', ')}`);

    // Store the ORIGINAL text and classification in the database
    await prisma.fax.update({
      where: { id: faxId },
      data: { 
        rawText: pdfText,
        documentType: classification.type,
        documentSubtype: classification.subtype || null,
        confidence: classification.confidence,
      },
    });

    // DE-IDENTIFY the text before sending to external AI
    console.log(`[Fax ${faxId}] De-identifying text before AI processing...`);
    const { text: deidentifiedText, redactions } = await deidentify(pdfText);
    console.log(`[Fax ${faxId}] De-identified: ${summarizeRedactions(redactions)}`);

    // Call generate API with DE-IDENTIFIED text and document-type-specific sections
    const generateResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: deidentifiedText,
        selectedSections: sectionsToExtract,
        documentType: classification.type,
      }),
    });

    const generateData = await generateResponse.json();

    if (!generateResponse.ok) {
      throw new Error(generateData.error || 'Failed to generate sections');
    }

    // RE-IDENTIFY: Restore original PHI values in the AI output
    console.log(`[Fax ${faxId}] Re-identifying AI output with original values...`);
    const reidentifiedSections = reidentifySections(generateData.sections, redactions);
    const reidentifiedMetadata = reidentifyMetadata(generateData.metadata, redactions);

    // Update fax record with RE-IDENTIFIED results
    await prisma.fax.update({
      where: { id: faxId },
      data: {
        status: 'completed',
        metadata: reidentifiedMetadata ? JSON.stringify(reidentifiedMetadata) : null,
        sections: JSON.stringify(reidentifiedSections),
      },
    });

    console.log(`[Fax ${faxId}] Processing completed successfully as ${getDocumentTypeLabel(classification.type)}`);
  } catch (error) {
    console.error(`[Fax ${faxId}] Processing failed:`, error);

    await prisma.fax.update({
      where: { id: faxId },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WebhookResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { from, timestamp, pdfUrl, externalId } = req.body as WebhookPayload;

    // Validate required fields
    if (!from || !timestamp || !pdfUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: from, timestamp, pdfUrl',
      });
    }

    // Parse timestamp
    const receivedAt = new Date(timestamp);
    if (isNaN(receivedAt.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid timestamp format',
      });
    }

    // Determine PDF path - could be a URL or a local path
    let pdfPath: string;
    const uploadsDir = path.join(process.cwd(), 'uploads');

    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    if (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://')) {
      // Download remote PDF
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        return res.status(400).json({
          success: false,
          error: `Failed to download PDF: ${response.statusText}`,
        });
      }

      const buffer = await response.arrayBuffer();
      const filename = `fax_${Date.now()}.pdf`;
      pdfPath = path.join(uploadsDir, filename);
      fs.writeFileSync(pdfPath, Buffer.from(buffer));
    } else if (pdfUrl.startsWith('/') || pdfUrl.startsWith('./')) {
      // Local path - resolve relative to project root
      pdfPath = path.resolve(process.cwd(), pdfUrl.replace(/^\.\//, ''));

      if (!fs.existsSync(pdfPath)) {
        return res.status(400).json({
          success: false,
          error: `PDF file not found: ${pdfUrl}`,
        });
      }

      // Copy to uploads directory
      const filename = `fax_${Date.now()}.pdf`;
      const newPath = path.join(uploadsDir, filename);
      fs.copyFileSync(pdfPath, newPath);
      pdfPath = newPath;
    } else {
      // Assume it's a path relative to project root
      pdfPath = path.join(process.cwd(), pdfUrl);

      if (!fs.existsSync(pdfPath)) {
        return res.status(400).json({
          success: false,
          error: `PDF file not found: ${pdfUrl}`,
        });
      }

      // Copy to uploads directory
      const filename = `fax_${Date.now()}.pdf`;
      const newPath = path.join(uploadsDir, filename);
      fs.copyFileSync(pdfPath, newPath);
      pdfPath = newPath;
    }

    // Create fax record with status "pending"
    const fax = await prisma.fax.create({
      data: {
        externalId: externalId || null,
        fromNumber: from,
        receivedAt,
        status: 'pending',
        pdfPath: path.relative(process.cwd(), pdfPath),
      },
    });

    // Return success immediately
    res.status(200).json({
      success: true,
      faxId: fax.id,
    });

    // Process fax in background (after response is sent)
    setImmediate(() => {
      processFax(fax.id, pdfPath).catch(console.error);
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

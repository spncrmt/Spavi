import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';
import PDFParser from 'pdf2json';
import { createWorker } from 'tesseract.js';
import { createCanvas } from 'canvas';
import { classifyDocument, getDocumentTypeLabel } from '@/lib/documentClassifier';
import { getSectionsForDocumentType } from '@/lib/prompt';
import { deidentify, summarizeRedactions, reidentifySections, reidentifyMetadata } from '@/lib/deidentify';

export const config = {
  api: {
    bodyParser: false,
  },
};

type AIProvider = 'claude' | 'openai' | 'ollama';

interface UploadResponse {
  success: boolean;
  faxId?: number;
  error?: string;
}

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'pdfs');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

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
                } catch {
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

async function extractTextWithOCR(filepath: string): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const dataBuffer = fs.readFileSync(filepath);
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(dataBuffer) }).promise;

  const worker = await createWorker('eng');
  let fullText = '';

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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UploadResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const form = formidable({
      uploadDir: UPLOAD_DIR,
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024,
    });

    const [fields, files] = await form.parse(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const provider = (Array.isArray(fields.provider) ? fields.provider[0] : fields.provider) as AIProvider | undefined;

    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const originalFilename = file.originalFilename || 'uploaded.pdf';
    const storedFilename = `${Date.now()}-${originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const storedPath = path.join(UPLOAD_DIR, storedFilename);
    
    fs.renameSync(file.filepath, storedPath);

    let pdfText = await extractTextFromPDF(storedPath);
    
    if (!pdfText || pdfText.trim().length < 50) {
      console.log('[PDF Upload] Insufficient text, using OCR...');
      pdfText = await extractTextWithOCR(storedPath);
    }

    if (!pdfText || pdfText.trim().length === 0) {
      fs.unlinkSync(storedPath);
      return res.status(400).json({
        success: false,
        error: 'No text could be extracted from the PDF'
      });
    }

    const fax = await prisma.fax.create({
      data: {
        externalId: `pdf-${Date.now()}`,
        fromNumber: 'PDF Upload',
        receivedAt: new Date(),
        status: 'pending',
        rawText: pdfText,
        pdfPath: storedPath,
      },
    });

    res.status(200).json({ success: true, faxId: fax.id });

    setImmediate(() => {
      processFax(fax.id, pdfText, provider).catch(console.error);
    });

  } catch (error) {
    console.error('PDF upload error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    });
  }
}

async function processFax(faxId: number, text: string, provider?: AIProvider) {
  try {
    await prisma.fax.update({
      where: { id: faxId },
      data: { status: 'processing' },
    });

    const classification = classifyDocument(text);
    console.log(`[PDF Fax ${faxId}] Classified as: ${getDocumentTypeLabel(classification.type)}`);

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
      const deidentified = await deidentify(text);
      textToProcess = deidentified.text;
      redactions = deidentified.redactions;
      console.log(`[PDF Fax ${faxId}] De-identified: ${summarizeRedactions(redactions)}`);
    }

    const generateResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

    console.log(`[PDF Fax ${faxId}] Processing completed`);
  } catch (error) {
    console.error(`[PDF Fax ${faxId}] Failed:`, error);

    await prisma.fax.update({
      where: { id: faxId },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

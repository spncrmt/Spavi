import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import PDFParser from 'pdf2json';
import { createWorker } from 'tesseract.js';
import { createCanvas, loadImage } from 'canvas';

export const config = {
  api: {
    bodyParser: false,
  },
};

interface ExtractResponse {
  text?: string;
  error?: string;
  method?: 'text' | 'ocr';
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

async function extractTextWithOCR(filepath: string): Promise<string> {
  // Convert PDF to images using pdf2json and canvas
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

  // Create Tesseract worker
  const worker = await createWorker('eng');

  let fullText = '';
  const pages = pdfData.Pages || [];

  // For OCR, we'll use a simpler approach: read the PDF as an image
  // Since pdf2json doesn't provide image rendering, we'll use a different approach
  // We'll convert the PDF to images using the canvas library

  // Import pdf.js for rendering
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
    }).promise;

    // Convert canvas to buffer
    const imageBuffer = canvas.toBuffer('image/png');

    // Run OCR
    const { data } = await worker.recognize(imageBuffer);
    fullText += data.text + '\n\n';
  }

  await worker.terminate();

  return fullText.trim();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ExtractResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let tempFilePath: string | null = null;

  try {
    // Parse the multipart form data
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    tempFilePath = file.filepath;

    // First, try extracting text normally
    let pdfText = await extractTextFromPDF(tempFilePath);

    // If no text found or very little text (less than 50 chars), use OCR
    if (!pdfText || pdfText.trim().length < 50) {
      console.log('No text found or insufficient text, trying OCR...');
      pdfText = await extractTextWithOCR(tempFilePath);

      // Clean up temp file
      fs.unlinkSync(tempFilePath);

      if (!pdfText || pdfText.trim().length === 0) {
        return res.status(400).json({
          error: 'No text could be extracted from the PDF, even with OCR.'
        });
      }

      return res.status(200).json({ text: pdfText, method: 'ocr' });
    }

    // Clean up temp file
    fs.unlinkSync(tempFilePath);

    return res.status(200).json({ text: pdfText, method: 'text' });
  } catch (error) {
    // Clean up temp file on error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    console.error('PDF extraction error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to extract text from PDF'
    });
  }
}

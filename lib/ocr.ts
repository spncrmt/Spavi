import { createWorker, Worker } from 'tesseract.js';

/**
 * OCR utility functions for extracting text from images
 */

/**
 * Clean and normalize OCR output text
 * - Remove excess whitespace
 * - Fix common OCR errors in medical terminology
 */
export function cleanOCRText(text: string): string {
  return text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\n{3,}/g, '\n\n') // Reduce excessive newlines
    .replace(/[ \t]+/g, ' ') // Normalize spaces
    .trim();
}

/**
 * Extract text from an image buffer using Tesseract.js
 */
export async function extractTextFromImage(imageBuffer: Buffer): Promise<string> {
  const worker = await createWorker('eng');

  try {
    const { data } = await worker.recognize(imageBuffer);
    const cleanedText = cleanOCRText(data.text);
    return cleanedText;
  } finally {
    await worker.terminate();
  }
}

/**
 * Extract text from an image file (browser-side)
 * Accepts File or Blob objects
 */
export async function extractTextFromImageFile(imageFile: File | Blob): Promise<string> {
  const worker = await createWorker('eng');

  try {
    const { data } = await worker.recognize(imageFile);
    const cleanedText = cleanOCRText(data.text);
    return cleanedText;
  } finally {
    await worker.terminate();
  }
}

/**
 * Check if extracted text seems valid (not empty or just garbage)
 */
export function isValidOCRText(text: string): boolean {
  const trimmed = text.trim();

  // Must have at least 10 characters
  if (trimmed.length < 10) {
    return false;
  }

  // Should contain at least some alphabetic characters
  const alphaCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
  if (alphaCount < 5) {
    return false;
  }

  return true;
}

/**
 * Progress callback type for OCR operations
 */
export type OCRProgressCallback = (progress: number) => void;

/**
 * Extract text from image with progress tracking
 */
export async function extractTextWithProgress(
  imageFile: File | Blob,
  onProgress?: OCRProgressCallback
): Promise<string> {
  const worker = await createWorker('eng', undefined, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(m.progress * 100);
      }
    },
  });

  try {
    const { data } = await worker.recognize(imageFile);
    const cleanedText = cleanOCRText(data.text);
    return cleanedText;
  } finally {
    await worker.terminate();
  }
}

import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import { extractTextFromImage, isValidOCRText } from '@/lib/ocr';

export const config = {
  api: {
    bodyParser: false,
  },
};

interface ExtractResponse {
  text?: string;
  error?: string;
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

    // Validate file type (accept common image formats)
    const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff'];
    if (!validMimeTypes.includes(file.mimetype || '')) {
      return res.status(400).json({
        error: 'Invalid file type. Please upload a JPG, PNG, GIF, BMP, or TIFF image.'
      });
    }

    tempFilePath = file.filepath;

    // Read the image file
    const imageBuffer = fs.readFileSync(tempFilePath);

    // Extract text using OCR
    const extractedText = await extractTextFromImage(imageBuffer);

    // Clean up temp file
    fs.unlinkSync(tempFilePath);
    tempFilePath = null;

    // Validate the extracted text
    if (!isValidOCRText(extractedText)) {
      return res.status(400).json({
        error: 'No readable text could be extracted from the image. Please try a clearer image.'
      });
    }

    return res.status(200).json({ text: extractedText });
  } catch (error) {
    // Clean up temp file on error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    console.error('Image OCR error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to extract text from image'
    });
  }
}

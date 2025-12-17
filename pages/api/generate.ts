import type { NextApiRequest, NextApiResponse } from 'next';
import { getSystemPrompt, getUserPrompt, SmartSections, FaxMetadata } from '@/lib/prompt';

interface GenerateRequest {
  text: string;
  selectedSections?: string[];
}

interface GenerateResponse {
  sections?: SmartSections;
  metadata?: FaxMetadata;
  error?: string;
}

/**
 * Serverless API endpoint that calls Claude or GPT to generate SmartSections
 * Supports both Anthropic Claude and OpenAI GPT APIs
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, selectedSections } = req.body as GenerateRequest;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'Clinical text is required' });
  }

  // Default to all sections if none specified
  const sectionsToGenerate = selectedSections && selectedSections.length > 0
    ? selectedSections
    : ['HPI', 'PhysicalExam', 'Assessment', 'Plan'];

  // Check for API keys - support both Claude and GPT
  const claudeApiKey = process.env.ANTHROPIC_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!claudeApiKey && !openaiApiKey) {
    return res.status(500).json({
      error: 'No API key configured. Please set ANTHROPIC_API_KEY or OPENAI_API_KEY in your environment variables.'
    });
  }

  try {
    let result: { sections: SmartSections; metadata?: FaxMetadata };

    // Prefer Claude if available
    if (claudeApiKey) {
      result = await callClaudeAPI(text, claudeApiKey, sectionsToGenerate);
    } else if (openaiApiKey) {
      result = await callOpenAI(text, openaiApiKey, sectionsToGenerate);
    } else {
      throw new Error('No API key available');
    }

    return res.status(200).json({ sections: result.sections, metadata: result.metadata });
  } catch (error) {
    console.error('Error generating sections:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate SmartSections'
    });
  }
}

/**
 * Validates that a source quote actually exists in the original text
 * Uses case-insensitive matching and allows for minor differences
 * Be GENEROUS - we want to highlight more rather than less
 */
function sourceExistsInText(source: string, originalText: string): boolean {
  if (!source || source.trim().length < 2) return false;  // Allow shorter sources (e.g., "RRR")
  
  // Normalize both strings: lowercase and collapse whitespace
  const normalizedSource = source.toLowerCase().replace(/\s+/g, ' ').trim();
  const normalizedText = originalText.toLowerCase().replace(/\s+/g, ' ').trim();
  
  // Direct inclusion check
  if (normalizedText.includes(normalizedSource)) {
    return true;
  }
  
  // Try matching with more flexible whitespace/punctuation
  const flexibleSource = normalizedSource.replace(/[.,;:'"!?()\-\/]/g, '').replace(/\s+/g, ' ').trim();
  const flexibleText = normalizedText.replace(/[.,;:'"!?()\-\/]/g, '').replace(/\s+/g, ' ').trim();
  
  if (flexibleText.includes(flexibleSource)) {
    return true;
  }
  
  // Try matching individual words for very short sources (abbreviations like "RRR", "NAD")
  if (flexibleSource.length <= 5) {
    const words = flexibleText.split(' ');
    if (words.some(word => word === flexibleSource || word.includes(flexibleSource))) {
      return true;
    }
  }
  
  // Try matching without colons (e.g., "Lungs: clear" vs "Lungs clear")
  const noColonSource = flexibleSource.replace(/:/g, ' ').replace(/\s+/g, ' ').trim();
  const noColonText = flexibleText.replace(/:/g, ' ').replace(/\s+/g, ' ').trim();
  
  if (noColonText.includes(noColonSource)) {
    return true;
  }
  
  return false;
}

/**
 * Filters source arrays to only include sources that actually exist in the original text
 * This prevents hallucinated sources from being displayed
 */
function validateSources(sources: string[], originalText: string): string[] {
  if (!sources || !Array.isArray(sources)) return [];
  
  return sources.filter(source => {
    const exists = sourceExistsInText(source, originalText);
    if (!exists) {
      console.log(`Filtered out non-existent source: "${source}"`);
    }
    return exists;
  });
}

/**
 * Extracts and cleans metadata from the AI response
 */
function extractMetadata(rawResponse: any): FaxMetadata | undefined {
  if (!rawResponse.metadata || typeof rawResponse.metadata !== 'object') {
    return undefined;
  }

  const metadata: FaxMetadata = {};
  const raw = rawResponse.metadata;

  // Only include non-empty string values
  if (raw.patientName && typeof raw.patientName === 'string' && raw.patientName.trim()) {
    metadata.patientName = raw.patientName.trim();
  }
  if (raw.dateOfBirth && typeof raw.dateOfBirth === 'string' && raw.dateOfBirth.trim()) {
    metadata.dateOfBirth = raw.dateOfBirth.trim();
  }
  if (raw.referringProvider && typeof raw.referringProvider === 'string' && raw.referringProvider.trim()) {
    metadata.referringProvider = raw.referringProvider.trim();
  }
  if (raw.referringPractice && typeof raw.referringPractice === 'string' && raw.referringPractice.trim()) {
    metadata.referringPractice = raw.referringPractice.trim();
  }
  if (raw.dateOfService && typeof raw.dateOfService === 'string' && raw.dateOfService.trim()) {
    metadata.dateOfService = raw.dateOfService.trim();
  }
  if (raw.faxDate && typeof raw.faxDate === 'string' && raw.faxDate.trim()) {
    metadata.faxDate = raw.faxDate.trim();
  }
  if (raw.phoneNumber && typeof raw.phoneNumber === 'string' && raw.phoneNumber.trim()) {
    metadata.phoneNumber = raw.phoneNumber.trim();
  }
  if (raw.mrn && typeof raw.mrn === 'string' && raw.mrn.trim()) {
    metadata.mrn = raw.mrn.trim();
  }

  // Return undefined if no metadata was found
  if (Object.keys(metadata).length === 0) {
    return undefined;
  }

  return metadata;
}

/**
 * Validates and normalizes the response to ensure all fields are strings
 * Also extracts and validates source arrays for each section
 */
function validateAndNormalizeSections(rawResponse: any, requestedSections: string[], originalText: string): { sections: SmartSections; metadata?: FaxMetadata } {
  // Extract metadata first
  const metadata = extractMetadata(rawResponse);

  // Flatten any nested objects into strings
  const normalized: SmartSections = {
    ChiefComplaint: '',
    HPI: '',
    ReviewOfSystems: '',
    PhysicalExam: '',
    Assessment: '',
    Plan: '',
    Disposition: ''
  };

  for (const key of requestedSections) {
    if (!(key in rawResponse)) {
      // Only throw error if it was requested but not returned
      throw new Error(`Missing requested field: ${key}`);
    }

    const value = rawResponse[key];

    if (typeof value === 'string') {
      normalized[key as keyof SmartSections] = value;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Flatten nested object into formatted string
      normalized[key as keyof SmartSections] = Object.entries(value)
        .map(([subKey, subValue]) => `${subKey}: ${subValue}`)
        .join('\n');
    } else {
      normalized[key as keyof SmartSections] = String(value);
    }

    // Extract and VALIDATE sources - filter out any that don't exist in original text
    const sourcesKey = `${key}_sources`;
    if (sourcesKey in rawResponse && Array.isArray(rawResponse[sourcesKey])) {
      const validatedSources = validateSources(rawResponse[sourcesKey], originalText);
      (normalized as any)[sourcesKey] = validatedSources;
    }
  }

  return { sections: normalized, metadata };
}

/**
 * Call Anthropic Claude API
 */
async function callClaudeAPI(text: string, apiKey: string, selectedSections: string[]): Promise<{ sections: SmartSections; metadata?: FaxMetadata }> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `${getSystemPrompt(selectedSections)}\n\n${getUserPrompt(text, selectedSections)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Claude API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  const content = data.content[0].text;

  // Extract JSON from the response (handles cases where model adds extra text)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in Claude response');
  }

  const rawResponse = JSON.parse(jsonMatch[0]);
  return validateAndNormalizeSections(rawResponse, selectedSections, text);
}

/**
 * Call OpenAI GPT API
 */
async function callOpenAI(text: string, apiKey: string, selectedSections: string[]): Promise<{ sections: SmartSections; metadata?: FaxMetadata }> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: getSystemPrompt(selectedSections),
        },
        {
          role: 'user',
          content: getUserPrompt(text, selectedSections),
        },
      ],
      temperature: 0.1, // Low temperature for more deterministic, less creative responses
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  // Extract JSON from the response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in GPT response');
  }

  const rawResponse = JSON.parse(jsonMatch[0]);
  return validateAndNormalizeSections(rawResponse, selectedSections, text);
}

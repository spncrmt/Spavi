import type { NextApiRequest, NextApiResponse } from 'next';
import { getSystemPrompt, getUserPrompt, getLocalModelPrompt, SmartSections, FaxMetadata, getSectionsForDocumentType } from '@/lib/prompt';
import { DocumentType } from '@/lib/documentClassifier';

// AI Provider types
export type AIProvider = 'claude' | 'openai' | 'ollama';

interface GenerateRequest {
  text: string;
  selectedSections?: string[];
  provider?: AIProvider; // Optional override from UI
  documentType?: DocumentType; // Document type for specialized processing
}

interface GenerateResponse {
  sections?: SmartSections;
  metadata?: FaxMetadata;
  error?: string;
  provider?: AIProvider; // Return which provider was used
}

/**
 * Determines which AI provider to use based on request and environment
 */
function getProvider(requestProvider?: AIProvider): AIProvider {
  // Request body override takes priority
  if (requestProvider) {
    return requestProvider;
  }

  // Check environment variable
  const envProvider = process.env.AI_PROVIDER?.toLowerCase() as AIProvider | undefined;
  if (envProvider && ['claude', 'openai', 'ollama'].includes(envProvider)) {
    return envProvider;
  }

  // Default: prefer Claude, then OpenAI, then Ollama
  if (process.env.ANTHROPIC_API_KEY) return 'claude';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return 'ollama';
}

/**
 * Serverless API endpoint that calls Claude, GPT, or Ollama to generate SmartSections
 * Supports Anthropic Claude, OpenAI GPT, and local Ollama APIs
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, selectedSections, provider: requestedProvider, documentType } = req.body as GenerateRequest;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'Clinical text is required' });
  }

  // Use document-type-specific sections if no sections specified
  const sectionsToGenerate = selectedSections && selectedSections.length > 0
    ? selectedSections
    : getSectionsForDocumentType(documentType || 'clinical_note');

  // Determine which provider to use
  const provider = getProvider(requestedProvider);

  // Check for required credentials based on provider
  const claudeApiKey = process.env.ANTHROPIC_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (provider === 'claude' && !claudeApiKey) {
    return res.status(500).json({
      error: 'Claude selected but ANTHROPIC_API_KEY is not configured.'
    });
  }

  if (provider === 'openai' && !openaiApiKey) {
    return res.status(500).json({
      error: 'OpenAI selected but OPENAI_API_KEY is not configured.'
    });
  }

  try {
    let result: { sections: SmartSections; metadata?: FaxMetadata };

    switch (provider) {
      case 'claude':
        result = await callClaudeAPI(text, claudeApiKey!, sectionsToGenerate, documentType);
        break;
      case 'openai':
        result = await callOpenAI(text, openaiApiKey!, sectionsToGenerate, documentType);
        break;
      case 'ollama':
        result = await callOllama(text, sectionsToGenerate, documentType);
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    return res.status(200).json({ 
      sections: result.sections, 
      metadata: result.metadata,
      provider 
    });
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
    // If field is missing, set to "Not documented" instead of throwing error
    // This is important for local LLMs which may not return all fields
    if (!(key in rawResponse)) {
      console.log(`Field "${key}" not in response, setting to "Not documented"`);
      (normalized as any)[key] = 'Not documented';
      continue;
    }

    const value = rawResponse[key];

    if (value === null || value === undefined) {
      (normalized as any)[key] = 'Not documented';
    } else if (typeof value === 'string') {
      let cleanValue = value || 'Not documented';
      
      // For Assessment and Plan, clean up the formatting
      if (key === 'Assessment' || key === 'Plan') {
        // Split by newlines, clean each line, and rejoin
        const lines = cleanValue.split(/\n+/).map(line => line.trim()).filter(line => line.length > 0);
        
        // Check if lines are numbered - if so, renumber them cleanly
        const hasNumbers = lines.some(line => /^\d+[\.\)]\s/.test(line));
        if (hasNumbers && lines.length > 1) {
          const cleanedLines = lines.map((line, idx) => {
            // Strip existing number prefix
            const stripped = line.replace(/^\d+[\.\)]\s*/, '').trim();
            return `${idx + 1}. ${stripped}`;
          });
          cleanValue = cleanedLines.join('\n');
        }
      }
      
      (normalized as any)[key] = cleanValue;
    } else if (Array.isArray(value)) {
      // Handle arrays - convert to numbered list or joined string
      const items = value.map((item, idx) => {
        let text = '';
        if (typeof item === 'string') {
          text = item;
        } else if (typeof item === 'object' && item !== null) {
          // Handle array of objects (e.g., [{step: "...", details: "..."}])
          const parts = Object.entries(item)
            .map(([k, v]) => typeof v === 'string' ? v : String(v))
            .filter(v => v && v.length > 0);
          text = parts.join(' - ');
        } else {
          text = String(item);
        }
        // Strip existing number prefix if present (e.g., "1. " or "1) ")
        text = text.replace(/^\d+[\.\)]\s*/, '');
        return `${idx + 1}. ${text}`;
      });
      (normalized as any)[key] = items.join('\n') || 'Not documented';
    } else if (typeof value === 'object') {
      // Flatten nested object into formatted string
      (normalized as any)[key] = Object.entries(value)
        .map(([subKey, subValue]) => {
          if (typeof subValue === 'string') {
            return `${subKey}: ${subValue}`;
          } else if (typeof subValue === 'object') {
            return `${subKey}: ${JSON.stringify(subValue)}`;
          }
          return `${subKey}: ${String(subValue)}`;
        })
        .join('\n') || 'Not documented';
    } else {
      (normalized as any)[key] = String(value) || 'Not documented';
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
async function callClaudeAPI(text: string, apiKey: string, selectedSections: string[], documentType?: DocumentType): Promise<{ sections: SmartSections; metadata?: FaxMetadata }> {
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
          content: `${getSystemPrompt(selectedSections, documentType)}\n\n${getUserPrompt(text, selectedSections)}`,
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
async function callOpenAI(text: string, apiKey: string, selectedSections: string[], documentType?: DocumentType): Promise<{ sections: SmartSections; metadata?: FaxMetadata }> {
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
          content: getSystemPrompt(selectedSections, documentType),
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

/**
 * Attempts to repair common JSON issues from LLM output
 */
function repairJSON(jsonString: string): string {
  let repaired = jsonString;
  
  // Remove any trailing content after the last }
  const lastBrace = repaired.lastIndexOf('}');
  if (lastBrace !== -1) {
    repaired = repaired.substring(0, lastBrace + 1);
  }
  
  // Fix unescaped newlines in strings
  repaired = repaired.replace(/([^\\])\\n/g, '$1\\\\n');
  
  // Fix single quotes used instead of double quotes for keys/values
  // Be careful not to replace apostrophes in text
  repaired = repaired.replace(/'([^']*)':/g, '"$1":');
  
  // Remove trailing commas before } or ]
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
  
  // Fix missing commas between properties (newline followed by ")
  repaired = repaired.replace(/}(\s*)"(?!,)/g, '},$1"');
  repaired = repaired.replace(/"(\s*\n\s*)"([^:])/g, '",$1"$2');
  
  // Try to fix unclosed strings - find strings that span to end of a property
  // This is tricky, so we'll be conservative
  
  // Remove control characters that break JSON
  repaired = repaired.replace(/[\x00-\x1F\x7F]/g, (match) => {
    if (match === '\n' || match === '\r' || match === '\t') {
      return match; // Keep these, they're often valid
    }
    return ''; // Remove other control chars
  });
  
  return repaired;
}

/**
 * Parse JSON with repair attempts for LLM output
 */
function parseJSONWithRepair(jsonString: string): any {
  // First, try parsing as-is
  try {
    return JSON.parse(jsonString);
  } catch (firstError) {
    console.log('Initial JSON parse failed, attempting repair...');
  }
  
  // Try with repairs
  try {
    const repaired = repairJSON(jsonString);
    return JSON.parse(repaired);
  } catch (repairError) {
    console.log('Repaired JSON parse failed, trying aggressive cleanup...');
  }
  
  // More aggressive: try to extract just the core structure
  try {
    // Find the outermost balanced braces
    let depth = 0;
    let start = -1;
    let end = -1;
    
    for (let i = 0; i < jsonString.length; i++) {
      if (jsonString[i] === '{') {
        if (depth === 0) start = i;
        depth++;
      } else if (jsonString[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    
    if (start !== -1 && end !== -1) {
      const extracted = jsonString.substring(start, end + 1);
      const repaired = repairJSON(extracted);
      return JSON.parse(repaired);
    }
  } catch (extractError) {
    console.log('Extraction failed');
  }
  
  // Last resort: try to build a minimal valid response
  throw new Error('Could not parse JSON from LLM response after repair attempts');
}

/**
 * Call local Ollama API
 * Ollama provides local LLM inference with no external API calls
 */
async function callOllama(text: string, selectedSections: string[], documentType?: DocumentType): Promise<{ sections: SmartSections; metadata?: FaxMetadata }> {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'llama3.1';

  // Use simplified prompt for local models (better performance with smaller models)
  // Now enhanced with document type awareness for better section extraction
  const prompt = getLocalModelPrompt(text, selectedSections, documentType);
  console.log('Ollama prompt length:', prompt.length, 'chars');
  console.log('Document type for Ollama:', documentType || 'default');

  try {
    // Use AbortController for timeout (5 minutes for long documents)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);

    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        format: 'json', // Force Ollama to output valid JSON
        options: {
          temperature: 0.1, // Low temperature for more consistent medical documentation
          num_predict: 8192, // Increased for longer documents
          num_ctx: 16384, // Larger context window for long inputs
        },
      }),
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      // Check if Ollama is running
      if (response.status === 0 || !response.ok) {
        throw new Error(
          `Ollama is not responding. Make sure Ollama is running with 'ollama serve' and the model '${model}' is installed.`
        );
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Ollama API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    
    if (!data.response) {
      throw new Error('Empty response from Ollama');
    }

    const content = data.response;
    console.log('Ollama raw response length:', content.length);
    console.log('Ollama done_reason:', data.done_reason);
    console.log('Ollama eval_count:', data.eval_count);

    // Check if response was truncated
    if (data.done_reason === 'length') {
      console.warn('WARNING: Ollama response may have been truncated (hit token limit)');
    }

    // Extract JSON from the response (handles cases where model adds extra text)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Ollama raw response (no JSON found):', content.substring(0, 1000));
      throw new Error('No valid JSON found in Ollama response. The response may have been truncated or the model failed to generate valid JSON.');
    }

    // Use repair-aware parsing for local model output
    try {
      const rawResponse = parseJSONWithRepair(jsonMatch[0]);
      return validateAndNormalizeSections(rawResponse, selectedSections, text);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Problematic JSON (first 2000 chars):', jsonMatch[0].substring(0, 2000));
      console.error('Problematic JSON (last 500 chars):', jsonMatch[0].substring(Math.max(0, jsonMatch[0].length - 500)));
      throw new Error(`Failed to parse Ollama response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
  } catch (error) {
    // Provide helpful error messages for common Ollama issues
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `Ollama request timed out. The document may be too long for local processing. Try a shorter document or use cloud AI.`
      );
    }
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        `Cannot connect to Ollama at ${baseUrl}. Please ensure Ollama is running with 'ollama serve'.`
      );
    }
    throw error;
  }
}

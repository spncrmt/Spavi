/**
 * Local PHI De-identification Module
 * 
 * Removes Protected Health Information (PHI) from text BEFORE sending to external AI APIs.
 * Uses a hybrid approach:
 * 1. Regex patterns for structured PHI (MRN, SSN, phone, dates, emails, etc.)
 * 2. Local NER model for names and locations that regex misses
 * 
 * All processing happens locally - no data is sent externally.
 */

import { pipeline, Pipeline } from '@xenova/transformers';

// ============================================================================
// Types
// ============================================================================

export interface Redaction {
  type: string;         // 'NAME', 'DATE', 'MRN', etc.
  original: string;     // What was removed
  replacement: string;  // What it was replaced with
  start: number;        // Position in original text
  end: number;          // End position in original text
}

export interface DeidentifyResult {
  text: string;           // De-identified text
  redactions: Redaction[];
}

interface PHIPattern {
  type: string;
  pattern: RegExp;
  replacement: string | ((match: string, ...groups: string[]) => string);
}

// ============================================================================
// NER Model (Lazy Loading) - Using multilingual model for better name coverage
// ============================================================================

let nerPipeline: Pipeline | null = null;
let nerLoadingPromise: Promise<Pipeline> | null = null;

// Model options - multilingual handles diverse names better
const NER_MODEL = 'Xenova/bert-base-multilingual-cased-ner-hrl';
// Fallback to standard English NER if multilingual fails
const NER_MODEL_FALLBACK = 'Xenova/bert-base-NER';

/**
 * Lazily load the NER model - only loads on first use
 * Uses multilingual model for better coverage of non-Western names
 */
async function getNERPipeline(): Promise<Pipeline> {
  if (nerPipeline) {
    return nerPipeline;
  }
  
  if (nerLoadingPromise) {
    return nerLoadingPromise;
  }
  
  console.log(`[De-identify] Loading multilingual NER model (${NER_MODEL})...`);
  
  try {
    nerLoadingPromise = pipeline('token-classification', NER_MODEL, {
      quantized: true,
    });
    nerPipeline = await nerLoadingPromise;
    console.log('[De-identify] Multilingual NER model loaded successfully');
  } catch (error) {
    console.warn(`[De-identify] Multilingual model failed, falling back to ${NER_MODEL_FALLBACK}`);
    nerLoadingPromise = pipeline('token-classification', NER_MODEL_FALLBACK, {
      quantized: true,
    });
    nerPipeline = await nerLoadingPromise;
    console.log('[De-identify] Fallback NER model loaded successfully');
  }
  
  return nerPipeline;
}

// ============================================================================
// Regex Patterns for Structured PHI
// ============================================================================

const PHI_PATTERNS: PHIPattern[] = [
  // -------------------------------------------------------------------------
  // MRN / Medical Record Numbers (catch early - high priority)
  // -------------------------------------------------------------------------
  {
    type: 'MRN',
    pattern: /(?:MRN|Medical Record(?:\s*#)?|Chart(?:\s*#)?|Patient ID|ID#?)[:\s#]*([A-Z]*\d{4,}[A-Z0-9]*)/gi,
    replacement: '[MRN]',
  },
  
  // -------------------------------------------------------------------------
  // SSN (Social Security Numbers)
  // -------------------------------------------------------------------------
  {
    type: 'SSN',
    pattern: /(?:SSN|Social Security)[:\s]*(\d{3}[-\s]?\d{2}[-\s]?\d{4})/gi,
    replacement: 'SSN: [SSN]',
  },
  {
    type: 'SSN',
    // Standalone SSN pattern (XXX-XX-XXXX format specifically)
    pattern: /\b(\d{3}-\d{2}-\d{4})\b/g,
    replacement: '[SSN]',
  },
  
  // -------------------------------------------------------------------------
  // DOB (specifically labeled dates of birth)
  // -------------------------------------------------------------------------
  {
    type: 'DOB',
    pattern: /(?:DOB|D\.O\.B\.?|Date of Birth|Birthdate|Birth Date)[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/gi,
    replacement: 'DOB: [DOB]',
  },
  {
    type: 'DOB',
    pattern: /(?:DOB|D\.O\.B\.?|Date of Birth|Birthdate|Birth Date)[:\s]*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/gi,
    replacement: 'DOB: [DOB]',
  },
  {
    type: 'DOB',
    // Age with DOB context: "Age: 45" or "(Age 45)"
    pattern: /(?:Patient DOB|DOB)[:\s]*([A-Za-z]+\s+\d{1,2},?\s+\d{2,4})/gi,
    replacement: 'DOB: [DOB]',
  },
  
  // -------------------------------------------------------------------------
  // Labeled Names (Patient, Provider, etc.)
  // -------------------------------------------------------------------------
  {
    type: 'PATIENT',
    // Match "Patient: First Last" or "Name: First Last" etc.
    // Stop at newline or common following fields
    pattern: /(?:Patient(?:\s+Name)?|Pt(?:\s+Name)?|Name|RE|Regarding|Subject)[:\s]+([A-Z][a-z]+(?:\s+[A-Z]\.)?(?:\s+[A-Z][a-z]+)+)(?:\s*\([^)]*\))?(?=\s*(?:\n|$|MRN|DOB|Date|Sex|Phone|Email|Address|SSN|,))/gim,
    replacement: (match: string, name: string) => {
      // Skip common non-name words
      const skipWords = ['metadata', 'information', 'data', 'record', 'details', 'demographics', 'address', 'complaint'];
      if (skipWords.some(w => name.toLowerCase().includes(w))) {
        return match;
      }
      return match.replace(name, '[PATIENT]');
    },
  },
  {
    type: 'PROVIDER',
    // Match labeled provider with optional "Dr." prefix - capture and preserve structure
    // "Provider: Dr. Michael Thompson, MD" or "Referring Physician: Jane Smith, NP"
    pattern: /(?:Provider|Physician|Attending|Referring(?:\s+(?:Physician|Provider|MD|DO))?|Consulting(?:\s+(?:Physician|Provider))?)[:\s]+(Dr\.?\s+)?([A-Z][a-z]+(?:\s+[A-Z]\.)?(?:\s+[A-Z][a-z]+)*(?:,?\s*(?:MD|DO|NP|PA|RN|PhD|ARNP|FNP|DNP))?)/gi,
    replacement: (match: string, drPrefix: string, name: string) => {
      // Preserve the "Dr." prefix if present, just replace the name
      const prefix = drPrefix || '';
      return match.replace(prefix + name, prefix + '[PROVIDER]');
    },
  },
  {
    type: 'PROVIDER',
    // Match standalone "Dr. First Last" - but NOT after "Provider:" labels (already caught above)
    // Use negative lookbehind to avoid matching after labels
    pattern: /(?<!Provider[:\s]+)(?<!Physician[:\s]+)(?<!Attending[:\s]+)\bDr\.\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:,?\s*(?:MD|DO|NP|PA))?)/g,
    replacement: 'Dr. [PROVIDER]',
  },
  {
    type: 'PROVIDER',
    // Match "PCP First Last" or "PCP Dr. First Last" patterns
    pattern: /\bPCP\s+(?:Dr\.?\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g,
    replacement: 'PCP [PROVIDER]',
  },
  {
    type: 'PROVIDER',
    // Match names with credentials at end: "John Smith, MD" or "Jane Doe MD"
    pattern: /\b([A-Z][a-z]+\s+[A-Z][a-z]+),?\s+(MD|DO|NP|PA|RN|ARNP|FNP|DNP)\b/g,
    replacement: (match: string, name: string, credential: string) => `[PROVIDER], ${credential}`,
  },
  
  // -------------------------------------------------------------------------
  // Practice / Facility Names (Location, Clinic, Hospital, Department)
  // -------------------------------------------------------------------------
  {
    type: 'FACILITY',
    // Match labeled locations: "Location: Emergency Department" - stop at newline
    pattern: /(?:Location|Clinic|Practice|Facility|Hospital|Site)[:\s]+([A-Z][A-Za-z]+(?:\s+[A-Z]?[a-z]+)*)(?=\s*(?:\n|$))/gim,
    replacement: (match: string, name: string) => match.replace(name, '[FACILITY]'),
  },
  {
    type: 'FACILITY',
    // Match common facility name patterns ending with facility type
    pattern: /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Hospital|Medical Center|Health Center|Clinic|Emergency Department|Urgent Care|Health System|Healthcare|Medical Group))\b/g,
    replacement: '[FACILITY]',
  },
  
  // -------------------------------------------------------------------------
  // Phone / Fax Numbers - Multiple formats for better coverage
  // -------------------------------------------------------------------------
  {
    type: 'PHONE',
    // Labeled phone numbers
    pattern: /(?:Phone|Tel|Telephone|Fax|Contact|Ph|Mobile|Cell|Pager|call(?:ed)?|reach(?:ed)?|at)[:\s]*(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/gi,
    replacement: '[PHONE]',
  },
  {
    type: 'PHONE',
    // Phone with parentheses: (555) 123-4567
    pattern: /\((\d{3})\)\s*(\d{3})[-.\s]?(\d{4})/g,
    replacement: '[PHONE]',
  },
  {
    type: 'PHONE',
    // Phone with dashes: 555-123-4567
    pattern: /\b(\d{3}-\d{3}-\d{4})\b/g,
    replacement: '[PHONE]',
  },
  {
    type: 'PHONE',
    // Phone with dots: 555.123.4567
    pattern: /\b(\d{3}\.\d{3}\.\d{4})\b/g,
    replacement: '[PHONE]',
  },
  {
    type: 'PHONE',
    // 10 consecutive digits (risky but catches unlabeled phones)
    // Only match if preceded by common phone contexts
    pattern: /(?:phone|call|fax|tel|contact|reach|at|#)\s*(\d{10})\b/gi,
    replacement: '[PHONE]',
  },
  
  // -------------------------------------------------------------------------
  // Email Addresses
  // -------------------------------------------------------------------------
  {
    type: 'EMAIL',
    pattern: /\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g,
    replacement: '[EMAIL]',
  },
  
  // -------------------------------------------------------------------------
  // Dates (various formats) - be careful not to over-match
  // -------------------------------------------------------------------------
  {
    type: 'DATE',
    // Labeled dates: "Date of Service: 12/28/2025"
    pattern: /(?:Date(?:\s+of)?(?:\s+(?:Service|Encounter|Visit|Admission|Discharge|Fax))?|DOS|Service Date|Visit Date|Encounter Date|Admission Date|Discharge Date|Fax Date)[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/gi,
    replacement: (match: string, date: string) => match.replace(date, '[DATE]'),
  },
  {
    type: 'DATE',
    // MM/DD/YYYY or MM-DD-YYYY (4-digit year required for standalone dates)
    pattern: /\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})\b/g,
    replacement: '[DATE]',
  },
  {
    type: 'DATE',
    // YYYY-MM-DD (ISO format)
    pattern: /\b(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})\b/g,
    replacement: '[DATE]',
  },
  {
    type: 'DATE',
    // Full month name: "December 25, 2025"
    pattern: /\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})\b/gi,
    replacement: '[DATE]',
  },
  {
    type: 'DATE',
    // Abbreviated month: "Dec 25, 2025" or "Dec. 25, 2025"
    pattern: /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4})\b/gi,
    replacement: '[DATE]',
  },
  
  // -------------------------------------------------------------------------
  // Addresses - More specific patterns to avoid false positives
  // -------------------------------------------------------------------------
  {
    type: 'ADDRESS',
    // Street address: "123 Main Street" - requires number + street name + street type
    // Using specific street type words (not "Dr" which conflicts with "Doctor")
    pattern: /\b(\d+\s+(?:[A-Z][a-z]+\s+){1,3}(?:Street|St\.|Avenue|Ave\.|Road|Rd\.|Boulevard|Blvd\.|Drive|Lane|Ln\.|Court|Ct\.|Way|Circle|Place|Pl\.|Terrace|Highway|Hwy\.))(?:\s*,?\s*(?:Apt\.?|Suite|Ste\.?|Unit|#)\s*[A-Za-z0-9-]+)?/gi,
    replacement: '[ADDRESS]',
  },
  {
    type: 'ADDRESS',
    // Labeled address
    pattern: /(?:Address|Patient Address|Mailing Address)[:\s]+([^\n]+)/gi,
    replacement: 'Address: [ADDRESS]',
  },
  {
    type: 'ADDRESS',
    // City, State ZIP: "Boston, MA 02101"
    pattern: /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?)\b/g,
    replacement: '[CITY, STATE ZIP]',
  },
  
  // -------------------------------------------------------------------------
  // ZIP Codes (standalone, after state abbreviations)
  // -------------------------------------------------------------------------
  {
    type: 'ZIP',
    // State + ZIP: "MA 02101"
    pattern: /\b([A-Z]{2}\s+\d{5}(?:-\d{4})?)\b/g,
    replacement: '[STATE ZIP]',
  },
  
  // -------------------------------------------------------------------------
  // Age over 89 (HIPAA requirement)
  // -------------------------------------------------------------------------
  {
    type: 'AGE_90+',
    // Ages 90-99 or 100+ with age indicators: "95 year old", "92 yo", "93-year-old"
    pattern: /\b(9\d|1\d{2})\s*(?:y\.?o\.?|year[s]?\s*old|yo|-year-old)\b/gi,
    replacement: '[AGE 90+]',
  },
  
  // -------------------------------------------------------------------------
  // Account / ID Numbers
  // -------------------------------------------------------------------------
  {
    type: 'ACCOUNT',
    pattern: /(?:Account|Acct|Policy|Member ID|Subscriber ID|Insurance ID|Group ID|Claim)[:\s#]*([A-Z0-9-]{6,})/gi,
    replacement: '[ACCOUNT]',
  },
  
  // -------------------------------------------------------------------------
  // License Numbers (DEA, NPI, Medical License)
  // -------------------------------------------------------------------------
  {
    type: 'LICENSE',
    pattern: /(?:License|Lic|DEA|NPI|Medical License)[:\s#]*([A-Z0-9]{7,})/gi,
    replacement: '[LICENSE]',
  },
  
  // -------------------------------------------------------------------------
  // Family Member Names (daughter, son, wife, husband, etc.)
  // Only match when followed by an actual name (First Last format)
  // -------------------------------------------------------------------------
  {
    type: 'FAMILY',
    // "daughter Patricia Williams" or "accompanied by daughter, Sarah"
    pattern: /\b(?:daughter|wife|husband|spouse|mother|father|brother|sister)[,:\s]+([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)?)(?=\s*[,\.\(\)]|\s*$)/gi,
    replacement: (match: string, name: string) => match.replace(name, '[FAMILY MEMBER]'),
  },
  
  // -------------------------------------------------------------------------
  // Names in narrative context (aggressive - catches unlabeled names)
  // -------------------------------------------------------------------------
  {
    type: 'NARRATIVE_NAME',
    // "his/her wife/husband/son/daughter Name" - possessive + relation + name
    pattern: /\b(?:his|her|their)\s+(?:wife|husband|son|daughter|mother|father|brother|sister)\s+([A-Z][a-z]+)/gi,
    replacement: (match: string, name: string) => match.replace(name, '[NAME]'),
  },
  {
    type: 'NARRATIVE_NAME',
    // "spoke with Name" or "called Name" or "contacted Name"
    pattern: /\b(?:spoke\s+(?:with|to)|called|contacted|reached|met\s+with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/gi,
    replacement: (match: string, name: string) => match.replace(name, '[NAME]'),
  },
  {
    type: 'NARRATIVE_NAME',
    // "Name came in" or "Name presents" or "Name reports" - patient context
    pattern: /\b([A-Z][a-z]+)\s+(?:came\s+in|presents|presented|reports|reported|states|stated|complains|complained|denies|denied)\b/gi,
    replacement: (match: string, name: string) => match.replace(name, '[NAME]'),
  },
  {
    type: 'NARRATIVE_NAME', 
    // "call Name back" or "contact Name at"
    pattern: /\b(?:call|contact|reach|notify)\s+([A-Z][a-z]+)\s+(?:back|at|if|when)/gi,
    replacement: (match: string, name: string) => match.replace(name, '[NAME]'),
  },
];

// ============================================================================
// Core De-identification Functions
// ============================================================================

/**
 * Apply regex patterns to remove structured PHI
 */
function applyRegexPatterns(text: string): { text: string; redactions: Redaction[] } {
  let result = text;
  const redactions: Redaction[] = [];
  
  for (const { type, pattern, replacement } of PHI_PATTERNS) {
    // Clone the regex to reset state
    const regex = new RegExp(pattern.source, pattern.flags);
    
    // Find all matches and track redactions
    let match;
    while ((match = regex.exec(text)) !== null) {
      const replacementStr = typeof replacement === 'function' 
        ? replacement(match[0], ...match.slice(1))
        : replacement;
      
      redactions.push({
        type,
        original: match[0],
        replacement: replacementStr,
        start: match.index,
        end: match.index + match[0].length,
      });
    }
    
    // Apply replacements
    if (typeof replacement === 'function') {
      result = result.replace(new RegExp(pattern.source, pattern.flags), replacement as any);
    } else {
      result = result.replace(new RegExp(pattern.source, pattern.flags), replacement);
    }
  }
  
  return { text: result, redactions };
}

/**
 * Apply NER model to find names and locations that regex missed
 */
async function applyNER(text: string, existingRedactions: Redaction[]): Promise<{ text: string; redactions: Redaction[] }> {
  try {
    const ner = await getNERPipeline();
    const entities = await ner(text);
    
    // Filter to person names and locations
    const relevantEntities = (entities as any[]).filter(e => 
      ['B-PER', 'I-PER', 'B-LOC', 'I-LOC', 'B-ORG', 'I-ORG'].includes(e.entity)
    );
    
    if (relevantEntities.length === 0) {
      return { text, redactions: existingRedactions };
    }
    
    // Group consecutive tokens into full entities
    const groupedEntities: Array<{ type: string; text: string; start: number; end: number }> = [];
    let currentEntity: { type: string; tokens: string[]; start: number; end: number } | null = null;
    
    for (const entity of relevantEntities) {
      const entityType = entity.entity.substring(2); // Remove B- or I- prefix
      const isBeginning = entity.entity.startsWith('B-');
      
      if (isBeginning || !currentEntity || currentEntity.type !== entityType) {
        // Start a new entity
        if (currentEntity) {
          groupedEntities.push({
            type: currentEntity.type,
            text: currentEntity.tokens.join('').replace(/##/g, ''),
            start: currentEntity.start,
            end: currentEntity.end,
          });
        }
        currentEntity = {
          type: entityType,
          tokens: [entity.word],
          start: entity.start,
          end: entity.end,
        };
      } else {
        // Continue current entity
        currentEntity.tokens.push(entity.word);
        currentEntity.end = entity.end;
      }
    }
    
    // Don't forget the last entity
    if (currentEntity) {
      groupedEntities.push({
        type: currentEntity.type,
        text: currentEntity.tokens.join('').replace(/##/g, ''),
        start: currentEntity.start,
        end: currentEntity.end,
      });
    }
    
    // Filter out entities that overlap with existing redactions (already caught by regex)
    const newEntities = groupedEntities.filter(entity => {
      return !existingRedactions.some(r => 
        (entity.start >= r.start && entity.start < r.end) ||
        (entity.end > r.start && entity.end <= r.end)
      );
    });
    
    // Apply redactions (process in reverse order to preserve positions)
    let result = text;
    const newRedactions: Redaction[] = [];
    
    const sortedEntities = [...newEntities].sort((a, b) => b.start - a.start);
    
    for (const entity of sortedEntities) {
      const replacement = entity.type === 'PER' ? '[NAME]' 
                        : entity.type === 'LOC' ? '[LOCATION]'
                        : '[ORG]';
      
      // Extract the actual text from the original
      const originalText = text.slice(entity.start, entity.end);
      
      // Skip very short matches (likely false positives)
      if (originalText.length < 2) continue;
      
      // Skip if it looks like it's already been redacted
      if (originalText.startsWith('[') && originalText.endsWith(']')) continue;
      
      newRedactions.push({
        type: entity.type === 'PER' ? 'NAME' : entity.type === 'LOC' ? 'LOCATION' : 'ORG',
        original: originalText,
        replacement,
        start: entity.start,
        end: entity.end,
      });
      
      result = result.slice(0, entity.start) + replacement + result.slice(entity.end);
    }
    
    return { 
      text: result, 
      redactions: [...existingRedactions, ...newRedactions.reverse()] 
    };
  } catch (error) {
    console.error('[De-identify] NER processing failed, continuing with regex-only results:', error);
    return { text, redactions: existingRedactions };
  }
}

/**
 * Main de-identification function
 * Applies regex patterns first, then NER model
 */
export async function deidentify(text: string): Promise<DeidentifyResult> {
  if (!text || text.trim().length === 0) {
    return { text: '', redactions: [] };
  }
  
  // Step 1: Apply regex patterns for structured PHI
  const regexResult = applyRegexPatterns(text);
  
  // Step 2: Apply NER for names/locations that regex missed
  const nerResult = await applyNER(regexResult.text, regexResult.redactions);
  
  return nerResult;
}

/**
 * Synchronous regex-only de-identification (for when async isn't needed)
 */
export function deidentifySync(text: string): DeidentifyResult {
  if (!text || text.trim().length === 0) {
    return { text: '', redactions: [] };
  }
  
  return applyRegexPatterns(text);
}

/**
 * Generate a summary of redactions for logging
 */
export function summarizeRedactions(redactions: Redaction[]): string {
  const counts: Record<string, number> = {};
  
  for (const r of redactions) {
    counts[r.type] = (counts[r.type] || 0) + 1;
  }
  
  const parts = Object.entries(counts)
    .map(([type, count]) => `${count} ${type.toLowerCase()}${count > 1 ? 's' : ''}`)
    .join(', ');
  
  return parts || 'no PHI found';
}

/**
 * Preload the NER model (call during server startup for faster first request)
 */
export async function preloadNERModel(): Promise<void> {
  try {
    await getNERPipeline();
  } catch (error) {
    console.error('[De-identify] Failed to preload NER model:', error);
  }
}

// ============================================================================
// Re-identification Functions
// ============================================================================

/**
 * Build a mapping of placeholder patterns to their original values
 * Groups redactions by type and extracts just the value portion
 */
function buildReidentificationMap(redactions: Redaction[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  
  for (const r of redactions) {
    // Extract just the PHI value from the original (not the label)
    let value = r.original;
    
    // Handle cases like "Patient Name: John Smith" -> "John Smith"
    // or "DOB: 01/15/1985" -> "01/15/1985"
    const colonIndex = value.indexOf(':');
    if (colonIndex !== -1 && colonIndex < value.length - 1) {
      value = value.substring(colonIndex + 1).trim();
    }
    
    // Remove parenthetical notes like "(fictional)" or "(Age 54)"
    value = value.replace(/\s*\([^)]*\)\s*/g, '').trim();
    
    // Get the placeholder key (e.g., "[PATIENT]", "[DATE]")
    let placeholder = r.replacement;
    // Extract just the bracketed part if there's prefix text
    const bracketMatch = placeholder.match(/\[[A-Z0-9\s+]+\]/);
    if (bracketMatch) {
      placeholder = bracketMatch[0];
    }
    
    // For PROVIDER placeholders: if the value starts with "Dr.", remove it
    // because the AI output will have "Dr. [PROVIDER]" and we don't want "Dr. Dr. Name"
    if (placeholder === '[PROVIDER]') {
      // Always strip "Dr." prefix from the value to avoid duplication
      // The "Dr." is preserved in the de-identified text sent to AI
      value = value.replace(/^Dr\.?\s+/i, '').trim();
    }
    
    if (!map.has(placeholder)) {
      map.set(placeholder, []);
    }
    
    // Only add if we have a meaningful value
    if (value && value.length > 0 && !value.startsWith('[')) {
      const values = map.get(placeholder)!;
      // Avoid duplicates
      if (!values.includes(value)) {
        values.push(value);
      }
    }
  }
  
  return map;
}

/**
 * Re-identify text by replacing placeholders with original values
 * This is used AFTER AI processing to restore PHI in the output
 * 
 * @param text - The text with placeholders (AI output)
 * @param redactions - The redactions from the de-identification step
 * @returns Text with original PHI values restored
 */
export function reidentify(text: string, redactions: Redaction[]): string {
  if (!text || redactions.length === 0) {
    return text;
  }
  
  const map = buildReidentificationMap(redactions);
  let result = text;
  
  // Replace each placeholder type with its original value(s)
  // If multiple values exist for a placeholder type, use them in order
  for (const [placeholder, values] of map.entries()) {
    if (values.length === 0) continue;
    
    let valueIndex = 0;
    
    // Create a regex to find this placeholder
    const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedPlaceholder, 'g');
    
    // Replace each occurrence with the next available value
    result = result.replace(regex, () => {
      const value = values[valueIndex % values.length];
      valueIndex++;
      return value;
    });
  }
  
  return result;
}

/**
 * Re-identify all sections in a SmartSections object
 */
export function reidentifySections(
  sections: Record<string, any>, 
  redactions: Redaction[]
): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(sections)) {
    if (typeof value === 'string') {
      result[key] = reidentify(value, redactions);
    } else if (Array.isArray(value)) {
      // Handle source arrays
      result[key] = value.map(item => 
        typeof item === 'string' ? reidentify(item, redactions) : item
      );
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Re-identify metadata object (patient name, DOB, MRN, etc.)
 */
export function reidentifyMetadata(
  metadata: Record<string, any> | undefined,
  redactions: Redaction[]
): Record<string, any> | undefined {
  if (!metadata) return undefined;
  
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === 'string') {
      result[key] = reidentify(value, redactions);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}


/**
 * Prompt template for converting clinical text into Epic SmartSection format
 */

export interface SmartSections {
  HPI: string;
  PhysicalExam: string;
  Assessment: string;
  Plan: string;
}

/**
 * Generates the system prompt for the AI model
 */
export function getSystemPrompt(selectedSections?: string[]): string {
  const sections = selectedSections || ['HPI', 'PhysicalExam', 'Assessment', 'Plan'];

  const sectionDescriptions: Record<string, string> = {
    HPI: "HPI (History of Present Illness): Patient's symptoms, timeline, and relevant history as a single paragraph",
    PhysicalExam: "PhysicalExam: Vital signs and physical examination findings as a single paragraph (combine all findings)",
    Assessment: "Assessment: Diagnosis or clinical impression as a single paragraph",
    Plan: "Plan: Treatment plan, prescriptions, follow-up instructions as a single paragraph"
  };

  const requestedGuidelines = sections
    .map(section => `- ${sectionDescriptions[section]}`)
    .join('\n');

  const exampleKeys = sections.join(', ');

  return `You are a medical scribe assistant. Your task is to structure clinical notes into Epic SmartSections.

Return ONLY a valid JSON object with exactly these keys: ${exampleKeys}.
Each value MUST be a single string (not an object, not an array).

Guidelines:
${requestedGuidelines}

Example format:
{
${sections.map(s => `  "${s}": "..."`).join(',\n')}
}

Do not nest objects within the fields. Do not include any explanatory text outside the JSON object.`;
}

/**
 * Generates the user prompt with the clinical text
 */
export function getUserPrompt(clinicalText: string, selectedSections?: string[]): string {
  const sections = selectedSections || ['HPI', 'PhysicalExam', 'Assessment', 'Plan'];
  const sectionKeys = sections.join(', ');

  return `Structure this clinical note into Epic SmartSections:

${clinicalText}

Return JSON with keys: ${sectionKeys}.`;
}

/**
 * Example of expected output format (for reference)
 */
export const EXAMPLE_OUTPUT: SmartSections = {
  HPI: "Patient reports 3 days of cough and fever.",
  PhysicalExam: "Temp 100.2°F, mild crackles RLL.",
  Assessment: "Acute bronchitis.",
  Plan: "Prescribe azithromycin, increase fluids, rest, follow-up in 5 days."
};

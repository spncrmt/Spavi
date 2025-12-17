import type { NextApiRequest, NextApiResponse } from 'next';
import { getSystemPrompt, getUserPrompt, SmartSections } from '@/lib/prompt';

interface GenerateRequest {
  text: string;
  selectedSections?: string[];
}

interface GenerateResponse {
  sections?: SmartSections;
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
    let sections: SmartSections;

    // Prefer Claude if available
    if (claudeApiKey) {
      sections = await callClaudeAPI(text, claudeApiKey, sectionsToGenerate);
    } else if (openaiApiKey) {
      sections = await callOpenAI(text, openaiApiKey, sectionsToGenerate);
    } else {
      throw new Error('No API key available');
    }

    return res.status(200).json({ sections });
  } catch (error) {
    console.error('Error generating sections:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate SmartSections'
    });
  }
}

/**
 * Validates and normalizes the response to ensure all fields are strings
 */
function validateAndNormalizeSections(rawSections: any, requestedSections: string[]): SmartSections {
  // Flatten any nested objects into strings
  const normalized: SmartSections = {
    HPI: '',
    PhysicalExam: '',
    Assessment: '',
    Plan: ''
  };

  for (const key of requestedSections) {
    if (!(key in rawSections)) {
      // Only throw error if it was requested but not returned
      throw new Error(`Missing requested field: ${key}`);
    }

    const value = rawSections[key];

    if (typeof value === 'string') {
      normalized[key as keyof SmartSections] = value;
    } else if (typeof value === 'object' && value !== null) {
      // Flatten nested object into formatted string
      normalized[key as keyof SmartSections] = Object.entries(value)
        .map(([subKey, subValue]) => `${subKey}: ${subValue}`)
        .join('\n');
    } else {
      normalized[key as keyof SmartSections] = String(value);
    }
  }

  return normalized;
}

/**
 * Call Anthropic Claude API
 */
async function callClaudeAPI(text: string, apiKey: string, selectedSections: string[]): Promise<SmartSections> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
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

  const rawSections = JSON.parse(jsonMatch[0]);
  return validateAndNormalizeSections(rawSections, selectedSections);
}

/**
 * Call OpenAI GPT API
 */
async function callOpenAI(text: string, apiKey: string, selectedSections: string[]): Promise<SmartSections> {
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
      temperature: 0.3,
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

  const rawSections = JSON.parse(jsonMatch[0]);
  return validateAndNormalizeSections(rawSections, selectedSections);
}

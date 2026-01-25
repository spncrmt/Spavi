import type { NextApiRequest, NextApiResponse } from 'next';

interface OllamaStatus {
  available: boolean;
  model?: string;
  models?: string[];
  error?: string;
  baseUrl: string;
}

/**
 * Health check endpoint for Ollama
 * Returns whether Ollama is running and which models are available
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OllamaStatus>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      available: false, 
      error: 'Method not allowed',
      baseUrl: '' 
    });
  }

  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const configuredModel = process.env.OLLAMA_MODEL || 'llama3.1';

  try {
    // Check if Ollama is running by hitting the tags endpoint
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return res.status(200).json({
        available: false,
        error: `Ollama returned status ${response.status}`,
        baseUrl,
      });
    }

    const data = await response.json();
    const models = data.models?.map((m: { name: string }) => m.name) || [];
    
    // Check if the configured model is available
    const modelAvailable = models.some((m: string) => 
      m === configuredModel || m.startsWith(`${configuredModel}:`)
    );

    if (!modelAvailable && models.length > 0) {
      return res.status(200).json({
        available: true,
        model: configuredModel,
        models,
        error: `Model '${configuredModel}' not found. Available models: ${models.join(', ')}. Run 'ollama pull ${configuredModel}' to install.`,
        baseUrl,
      });
    }

    return res.status(200).json({
      available: true,
      model: configuredModel,
      models,
      baseUrl,
    });
  } catch (error) {
    // Connection error - Ollama is not running
    return res.status(200).json({
      available: false,
      error: `Cannot connect to Ollama at ${baseUrl}. Make sure Ollama is running with 'ollama serve'.`,
      baseUrl,
    });
  }
}


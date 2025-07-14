import { Request, Response } from 'express';
import { ai } from '../../lib/ai';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { frames, prompt } = req.body;

    if (!frames || !Array.isArray(frames)) {
      return res.status(400).json({ error: 'Frame data is required and must be an array' });
    }

    // Format descriptions into cooking steps
    const cookingSteps = frames
      .map(frame => frame.description)
      .join('\n\n');

    // Use the AI service to generate a summary with the custom prompt
    const summary = await ai.generateRecipeSummaryWithCustomPrompt(cookingSteps, prompt);

    return res.status(200).json({ summary });
  } catch (error) {
    console.error('Error in test-recipe-summary endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    const rawResponse = error && typeof error === 'object' && 'rawResponse' in error ? error.rawResponse : '';
    return res.status(500).json({ error: 'Failed to parse API response', details: errorMessage, rawResponse: rawResponse || '' });
  }
}

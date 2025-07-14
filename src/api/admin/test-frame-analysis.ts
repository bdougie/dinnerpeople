import { Request, Response } from 'express';
import { ai } from '../../lib/ai';

export default async function handler(req: Request, res: Response) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageUrl, prompt } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }
    
    // Use the AI service to analyze the frame
    const analysis = await ai.analyzeFrame(imageUrl, prompt);
    
    return res.status(200).json({ analysis });
  } catch (error) {
    console.error('Error in test-frame-analysis endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return res.status(500).json({ error: errorMessage });
  }
}

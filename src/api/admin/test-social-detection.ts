import { ai } from '../../lib/ai';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageUrl, prompt } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }
    
    // Use the AI service to analyze the frame with the social media detection prompt
    const result = await ai.analyzeFrame(imageUrl, prompt);
    
    // Extract social handles if present
    let socialHandles = [];
    if (result.includes('SOCIAL:') && !result.includes('SOCIAL:none')) {
      const handleMatch = result.match(/SOCIAL:([^:]+):(.+)/);
      if (handleMatch && handleMatch.length >= 3) {
        const platform = handleMatch[1].trim();
        const username = handleMatch[2].trim();
        socialHandles.push(`${platform}:${username}`);
      }
    }
    
    return res.status(200).json({ 
      rawResponse: result,
      socialHandles: socialHandles.length ? socialHandles.join(', ') : 'No social handles detected'
    });
  } catch (error) {
    console.error('Error in test-social-detection endpoint:', error);
    return res.status(500).json({ error: error.message });
  }
}

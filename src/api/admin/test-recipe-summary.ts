import { ai } from '../../lib/ai';

export default async function handler(req, res) {
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
    const rawResponse = await ai.generateRecipeSummaryWithCustomPrompt(cookingSteps, prompt);

    // Handle streaming response by parsing line by line
    const lines = rawResponse.split('\n').filter(line => line.trim() !== '');
    let responseText = '';

    for (const line of lines) {
      try {
        const parsedLine = JSON.parse(line);
        if (parsedLine.response) {
          responseText += parsedLine.response;
        }
      } catch (error) {
        console.warn('Failed to parse line as JSON:', line);
      }
    }

    // Attempt to parse the final concatenated response as JSON
    let summary;
    try {
      summary = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse concatenated response as JSON:', parseError);

      // Fallback: Create a basic summary object
      const title = responseText.match(/title[:\s]+["']?([^"'\n]+)["']?/i)?.[1] || 'Untitled Recipe';
      const description = responseText.replace(/title[:\s]+["']?([^"'\n]+)["']?/i, '').trim();

      summary = {
        title: title,
        description: description || 'Recipe processed from video.'
      };
    }

    return res.status(200).json({ summary });
  } catch (error) {
    console.error('Error in test-recipe-summary endpoint:', error);
    return res.status(500).json({ error: 'Failed to parse API response', details: error.message, rawResponse: error.rawResponse || '' });
  }
}

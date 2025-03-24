import * as PromptUtils from '../../lib/prompt-utils';
import { ai } from '../../lib/ai';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { recipeId, prompt } = req.body;
    
    if (!recipeId) {
      return res.status(400).json({ error: 'Recipe ID is required' });
    }
    
    // Get frame descriptions
    const descriptions = await PromptUtils.getFrameDescriptions(recipeId);
    
    // Format cooking steps
    const cookingSteps = PromptUtils.formatCookingSteps(descriptions);
    
    // Replace the placeholder in the prompt
    const formattedPrompt = prompt.replace('{steps}', cookingSteps);
    
    // Use the AI service to generate the summary
    // This will automatically route to Ollama or OpenAI based on environment
    const summary = await ai.generateRecipeSummaryWithCustomPrompt(cookingSteps, formattedPrompt);
    
    return res.status(200).json({ summary });
  } catch (error) {
    console.error('Error in test-recipe-summary endpoint:', error);
    return res.status(500).json({ error: error.message });
  }
}

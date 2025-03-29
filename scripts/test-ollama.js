#!/usr/bin/env node
import fetch from 'node-fetch';

// Configuration
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434/api';

// Test functions
async function testOllamaConnection() {
  console.log(`Testing connection to Ollama API at: ${OLLAMA_API_URL}`);
  
  try {
    // Test basic connection
    const response = await fetch(`${OLLAMA_API_URL}/version`);
    
    if (!response.ok) {
      console.error(`❌ Connection failed: HTTP ${response.status}`);
      return false;
    }
    
    const data = await response.json();
    console.log(`✅ Connected to Ollama API. Version: ${data.version}`);
    return true;
  } catch (error) {
    console.error(`❌ Connection failed: ${error.message}`);
    return false;
  }
}

async function listAvailableModels() {
  console.log('Fetching available models...');
  
  try {
    const response = await fetch(`${OLLAMA_API_URL}/tags`);
    
    if (!response.ok) {
      console.error(`❌ Failed to fetch models: HTTP ${response.status}`);
      return;
    }
    
    const data = await response.json();
    
    if (!data.models || data.models.length === 0) {
      console.log('No models found. Please pull models using "ollama pull <model>"');
      return;
    }
    
    console.log(`Found ${data.models.length} models:`);
    data.models.forEach(model => {
      console.log(`- ${model.name}`);
    });
    
    // Categorize models
    const textModels = data.models.filter(model => 
      !model.name.includes('vision') && 
      !model.name.includes('embed')).map(m => m.name);
      
    const visionModels = data.models.filter(model => 
      model.name.includes('vision')).map(m => m.name);
      
    const embeddingModels = data.models.filter(model => 
      model.name.includes('embed')).map(m => m.name);
    
    console.log('\nCategories:');
    console.log(`Text models: ${textModels.join(', ') || 'None'}`);
    console.log(`Vision models: ${visionModels.join(', ') || 'None'}`);
    console.log(`Embedding models: ${embeddingModels.join(', ') || 'None'}`);
  } catch (error) {
    console.error(`❌ Error fetching models: ${error.message}`);
  }
}

// Run tests
async function runTests() {
  console.log('=== Ollama API Test ===');
  const connected = await testOllamaConnection();
  
  if (connected) {
    await listAvailableModels();
  }
  
  console.log('\nTest complete.');
}

runTests();

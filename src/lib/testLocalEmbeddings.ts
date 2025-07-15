import { generateEmbedding, findSimilar, preloadModel } from './localEmbeddings';

export async function testLocalEmbeddings() {
  console.log('Testing local embeddings...');
  
  try {
    // Preload the model
    console.log('Preloading model...');
    await preloadModel();
    
    // Test single embedding
    console.log('\nGenerating embedding for test text...');
    const startTime = performance.now();
    const embedding = await generateEmbedding('This is a test recipe for chocolate cake');
    const endTime = performance.now();
    
    console.log(`Embedding generated in ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`Embedding dimensions: ${embedding.length}`);
    console.log(`First 5 values: ${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}`);
    
    // Test similarity search
    console.log('\nTesting similarity search...');
    const texts = [
      'Chocolate cake with vanilla frosting',
      'Grilled chicken with herbs',
      'Dark chocolate brownies recipe',
      'Fresh garden salad',
      'Triple chocolate cookies'
    ];
    
    const searchStartTime = performance.now();
    const results = await findSimilar('chocolate dessert', texts, 3);
    const searchEndTime = performance.now();
    
    console.log(`\nSearch completed in ${(searchEndTime - searchStartTime).toFixed(2)}ms`);
    console.log('Top 3 similar texts:');
    results.forEach((result, i) => {
      console.log(`${i + 1}. "${result.text}" (similarity: ${result.similarity.toFixed(4)})`);
    });
    
    return { success: true, embedding };
  } catch (error) {
    console.error('Test failed:', error);
    return { success: false, error };
  }
}
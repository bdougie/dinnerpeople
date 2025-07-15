import { pipeline, Pipeline } from '@xenova/transformers';

// Model configuration
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
let embeddingPipeline: Pipeline | null = null;

/**
 * Initialize the embedding model
 * This loads the model on first use and caches it for subsequent calls
 */
async function getEmbeddingPipeline(): Promise<Pipeline> {
  if (!embeddingPipeline) {
    console.log('Loading embedding model...');
    embeddingPipeline = await pipeline('feature-extraction', MODEL_NAME, {
      quantized: false, // Use full precision for better quality
    });
    console.log('Embedding model loaded successfully');
  }
  return embeddingPipeline;
}

/**
 * Generate embeddings for a single text input using local transformer model
 * Returns a 384-dimensional embedding vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const pipe = await getEmbeddingPipeline();
    
    // Generate embeddings
    const output = await pipe(text, {
      pooling: 'mean',
      normalize: true,
    });
    
    // Convert to regular array
    const embedding = Array.from(output.data);
    
    return embedding;
  } catch (error) {
    console.error('Error generating local embedding:', error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * More efficient than calling generateEmbedding multiple times
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const pipe = await getEmbeddingPipeline();
    const embeddings: number[][] = [];
    
    // Process in batches to avoid memory issues
    const batchSize = 32;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      // Generate embeddings for batch
      const outputs = await Promise.all(
        batch.map(text => pipe(text, {
          pooling: 'mean',
          normalize: true,
        }))
      );
      
      // Convert to arrays and add to results
      outputs.forEach(output => {
        embeddings.push(Array.from(output.data));
      });
    }
    
    return embeddings;
  } catch (error) {
    console.error('Error generating batch embeddings:', error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find the most similar texts to a query
 */
export async function findSimilar(
  query: string,
  texts: string[],
  topK: number = 3
): Promise<Array<{ text: string; similarity: number; index: number }>> {
  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);
  
  // Generate embeddings for all texts
  const textEmbeddings = await generateBatchEmbeddings(texts);
  
  // Calculate similarities
  const similarities = textEmbeddings.map((embedding, index) => ({
    text: texts[index],
    similarity: cosineSimilarity(queryEmbedding, embedding),
    index,
  }));
  
  // Sort by similarity and return top K
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

/**
 * Preload the model (useful for warming up before first use)
 */
export async function preloadModel(): Promise<void> {
  await getEmbeddingPipeline();
}
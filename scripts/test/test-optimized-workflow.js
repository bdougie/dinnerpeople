import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Initialize clients
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiApiKey = process.env.VITE_OPENAI_API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

// Timing utilities
const timers = {};
function startTimer(name) {
  timers[name] = Date.now();
}

function endTimer(name) {
  const elapsed = Date.now() - timers[name];
  console.log(`⏱️  ${name}: ${elapsed}ms (${(elapsed/1000).toFixed(2)}s)`);
  return elapsed;
}

// Parallel frame analysis
async function analyzeFramesInParallel(frames) {
  console.log(`🔄 Processing ${frames.length} frames in parallel...`);
  
  const analysisPromises = frames.map(async (frame) => {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: "Describe this cooking frame briefly: ingredients, techniques, equipment visible." 
            },
            { 
              type: 'image_url', 
              image_url: { url: frame.url } 
            }
          ]
        }
      ],
      max_tokens: 150, // Reduced for speed
    });
    
    return {
      timestamp: frame.timestamp,
      description: response.choices[0].message.content,
      url: frame.url
    };
  });

  return Promise.all(analysisPromises);
}

// Parallel embeddings generation
async function generateEmbeddingsInParallel(descriptions) {
  console.log(`🔄 Generating ${descriptions.length} embeddings in parallel...`);
  
  const embeddingPromises = descriptions.map(async (frame) => {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: frame.description,
    });
    
    return {
      ...frame,
      embedding: response.data[0].embedding
    };
  });

  return Promise.all(embeddingPromises);
}

async function testOptimizedWorkflow() {
  console.log('🚀 Testing OPTIMIZED timed video processing workflow...\n');
  
  const videoPath = process.argv[2];
  if (!videoPath) {
    console.error('Please provide a video file path');
    console.log('Usage: node test-optimized-workflow.js <path-to-video>');
    process.exit(1);
  }

  const overallStart = Date.now();
  const stepTimes = {};

  try {
    // Step 1: Video Upload Test
    console.log('📤 Step 1: Video Upload');
    startTimer('upload');
    
    const { createClient } = await import('@supabase/supabase-js');
    const { readFileSync, existsSync } = await import('fs');
    
    if (!existsSync(videoPath)) {
      console.error(`❌ Video file not found: ${videoPath}`);
      process.exit(1);
    }
    
    const videoBuffer = readFileSync(videoPath);
    const fileName = `upload-test/optimized-test-${Date.now()}.mp4`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, videoBuffer, {
        contentType: 'video/mp4',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Upload failed:', uploadError);
      return;
    }
    
    stepTimes.upload = endTimer('upload');
    console.log(`✅ Video uploaded: ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB\n`);

    // Step 2: Frame Extraction (parallel with upload in real app)
    console.log('🎬 Step 2: Frame Extraction');
    startTimer('extraction');
    
    const { spawn } = await import('child_process');
    const { join } = await import('path');
    const { mkdirSync, rmSync } = await import('fs');
    
    const tempDir = join(process.cwd(), 'upload-test', 'temp-frames-optimized');
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    // Extract frames using ffmpeg with optimized settings
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', videoPath,
        '-vf', 'fps=1/5,scale=512:512', // Smaller frames for faster processing
        '-q:v', '5', // Lower quality for speed
        join(tempDir, 'frame_%04d.jpg')
      ]);

      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`ffmpeg failed with code ${code}`));
        } else {
          resolve();
        }
      });
    });

    const fs = await import('fs');
    const extractedFrames = fs.readdirSync(tempDir).filter(f => f.endsWith('.jpg'));
    
    stepTimes.extraction = endTimer('extraction');
    console.log(`✅ Extracted ${extractedFrames.length} frames\n`);

    // Step 3: Frame Upload to Storage (parallel)
    console.log('☁️  Step 3: Frame Upload to Storage (parallel)');
    startTimer('frameUpload');
    
    const uploadPromises = extractedFrames.map(async (file) => {
      const framePath = join(tempDir, file);
      const frameBuffer = readFileSync(framePath);
      const frameNumber = parseInt(file.match(/frame_(\d+)/)[1]);
      const timestamp = (frameNumber - 1) * 5;
      
      const frameFileName = `upload-test/frames/optimized-${Date.now()}-frame-${timestamp}s.jpg`;
      
      const { data, error } = await supabase.storage
        .from('frames')
        .upload(frameFileName, frameBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (!error) {
        const { data: { publicUrl } } = supabase.storage
          .from('frames')
          .getPublicUrl(data.path);
          
        return {
          timestamp,
          path: data.path,
          url: publicUrl
        };
      }
      return null;
    });

    const uploadedFrames = (await Promise.all(uploadPromises)).filter(Boolean);
    
    stepTimes.frameUpload = endTimer('frameUpload');
    console.log(`✅ Uploaded ${uploadedFrames.length} frames to storage\n`);

    // Step 4: AI Frame Analysis (PARALLEL)
    console.log('🧠 Step 4: AI Frame Analysis (PARALLEL)');
    startTimer('aiAnalysis');
    
    const frameDescriptions = await analyzeFramesInParallel(uploadedFrames);
    
    stepTimes.aiAnalysis = endTimer('aiAnalysis');
    console.log(`✅ Analyzed ${frameDescriptions.length} frames with AI\n`);

    // Step 5: Generate Embeddings (PARALLEL)
    console.log('🔢 Step 5: Generate Embeddings (PARALLEL)');
    startTimer('embeddings');
    
    const frameEmbeddings = await generateEmbeddingsInParallel(frameDescriptions);
    
    stepTimes.embeddings = endTimer('embeddings');
    console.log(`✅ Generated embeddings for ${frameEmbeddings.length} frames\n`);

    // Step 6: Store in Database
    console.log('💾 Step 6: Database Storage');
    startTimer('dbStorage');
    
    // Get existing user
    const { data: existingRecipe } = await supabase
      .from('recipes')
      .select('user_id')
      .limit(1)
      .single();
    
    // Create recipe
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        title: 'Optimized Test Recipe',
        description: 'Testing optimized workflow timing',
        video_url: fileName,
        user_id: existingRecipe?.user_id || null
      })
      .select()
      .single();

    if (recipeError) {
      console.error('❌ Failed to create recipe:', recipeError);
      return;
    }

    // Store frames with embeddings
    const frameData = frameEmbeddings.map(frame => ({
      recipe_id: recipe.id,
      timestamp: frame.timestamp,
      description: frame.description,
      embedding: frame.embedding,
      image_url: frame.url
    }));

    const { data: frames, error: framesError } = await supabase
      .from('video_frames')
      .insert(frameData)
      .select();

    if (framesError) {
      console.error('❌ Failed to store frames:', framesError);
      return;
    }
    
    stepTimes.dbStorage = endTimer('dbStorage');
    console.log(`✅ Stored recipe and ${frames.length} frames in database\n`);

    // Step 7: Recipe Generation (shortened prompt for speed)
    console.log('👨‍🍳 Step 7: Recipe Generation');
    startTimer('recipeGeneration');
    
    const cookingSteps = frameDescriptions
      .map((frame, i) => `${i + 1}. ${frame.description}`)
      .join('\n');

    const prompt = `Create a recipe from these cooking steps:
${cookingSteps}

Return JSON: {title, description, ingredients: [], instructions: [], cookingTime, servings}`;

    const recipeResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 600, // Reduced for speed
      response_format: { type: "json_object" }
    });

    const generatedRecipe = JSON.parse(recipeResponse.choices[0].message.content);
    
    stepTimes.recipeGeneration = endTimer('recipeGeneration');
    console.log(`✅ Generated recipe: "${generatedRecipe.title}"\n`);

    // Calculate total time
    const totalTime = Date.now() - overallStart;
    
    // Display results
    console.log('🎯 OPTIMIZED PERFORMANCE RESULTS');
    console.log('='.repeat(50));
    console.log(`📁 Video: ${videoPath}`);
    console.log(`📏 Size: ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`🎬 Frames: ${extractedFrames.length}`);
    console.log('');
    
    console.log('⏱️  Step Timings:');
    Object.entries(stepTimes).forEach(([step, time]) => {
      const seconds = (time / 1000).toFixed(2);
      const percentage = ((time / totalTime) * 100).toFixed(1);
      console.log(`  ${step.padEnd(15)}: ${time.toString().padStart(6)}ms (${seconds.padStart(5)}s) - ${percentage}%`);
    });
    
    console.log('');
    console.log(`🏁 TOTAL TIME: ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);
    console.log(`🎯 TARGET: 30s | ACTUAL: ${(totalTime/1000).toFixed(2)}s | ${totalTime <= 30000 ? '✅ PASSED' : '❌ EXCEEDED'}`);
    
    // Compare with previous results
    const previousTime = 46936; // From first test
    const improvement = previousTime - totalTime;
    const improvementPercent = ((improvement / previousTime) * 100).toFixed(1);
    
    console.log(`📈 IMPROVEMENT: ${improvement}ms (${(improvement/1000).toFixed(2)}s) - ${improvementPercent}% faster`);

    // Cleanup
    console.log('\n🗑️  Cleaning up...');
    
    // Clean up uploaded files
    const filesToDelete = [fileName, ...uploadedFrames.map(f => f.path)];
    await supabase.storage.from('videos').remove([fileName]);
    if (uploadedFrames.length > 0) {
      await supabase.storage.from('frames').remove(uploadedFrames.map(f => f.path));
    }
    
    // Clean up database
    await supabase.from('video_frames').delete().eq('recipe_id', recipe.id);
    await supabase.from('recipes').delete().eq('id', recipe.id);
    
    // Clean up temp directory
    rmSync(tempDir, { recursive: true, force: true });
    
    console.log('✅ Cleanup completed');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testOptimizedWorkflow();
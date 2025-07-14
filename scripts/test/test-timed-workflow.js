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

async function testTimedWorkflow() {
  console.log('🚀 Testing timed video processing workflow...\n');
  
  const videoPath = process.argv[2];
  if (!videoPath) {
    console.error('Please provide a video file path');
    console.log('Usage: node test-timed-workflow.js <path-to-video>');
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
    const fileName = `upload-test/timed-test-${Date.now()}.mp4`;
    
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

    // Step 2: Frame Extraction
    console.log('🎬 Step 2: Frame Extraction');
    startTimer('extraction');
    
    const { spawn } = await import('child_process');
    const { join } = await import('path');
    const { mkdirSync, rmSync } = await import('fs');
    
    const tempDir = join(process.cwd(), 'upload-test', 'temp-frames-timed');
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    // Extract frames using ffmpeg
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', videoPath,
        '-vf', 'fps=1/5', // Every 5 seconds
        '-q:v', '2',
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

    // Step 3: Frame Upload to Storage
    console.log('☁️  Step 3: Frame Upload to Storage');
    startTimer('frameUpload');
    
    const uploadedFrames = [];
    for (const file of extractedFrames) {
      const framePath = join(tempDir, file);
      const frameBuffer = readFileSync(framePath);
      const frameNumber = parseInt(file.match(/frame_(\d+)/)[1]);
      const timestamp = (frameNumber - 1) * 5;
      
      const frameFileName = `upload-test/frames/timed-${Date.now()}-frame-${timestamp}s.jpg`;
      
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
          
        uploadedFrames.push({
          timestamp,
          path: data.path,
          url: publicUrl
        });
      }
    }
    
    stepTimes.frameUpload = endTimer('frameUpload');
    console.log(`✅ Uploaded ${uploadedFrames.length} frames to storage\n`);

    // Step 4: AI Frame Analysis
    console.log('🧠 Step 4: AI Frame Analysis');
    startTimer('aiAnalysis');
    
    const frameDescriptions = [];
    for (const frame of uploadedFrames) {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              { 
                type: 'text', 
                text: "What's happening in this cooking video frame? Describe any ingredients, cooking techniques, or equipment you can see. Be concise but detailed." 
              },
              { 
                type: 'image_url', 
                image_url: { url: frame.url } 
              }
            ]
          }
        ],
        max_tokens: 200,
      });
      
      frameDescriptions.push({
        timestamp: frame.timestamp,
        description: response.choices[0].message.content,
        url: frame.url
      });
    }
    
    stepTimes.aiAnalysis = endTimer('aiAnalysis');
    console.log(`✅ Analyzed ${frameDescriptions.length} frames with AI\n`);

    // Step 5: Generate Embeddings
    console.log('🔢 Step 5: Generate Embeddings');
    startTimer('embeddings');
    
    const frameEmbeddings = [];
    for (const frame of frameDescriptions) {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: frame.description,
      });
      
      frameEmbeddings.push({
        ...frame,
        embedding: embeddingResponse.data[0].embedding
      });
    }
    
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
        title: 'Timed Test Recipe',
        description: 'Testing workflow timing',
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

    // Step 7: Recipe Generation
    console.log('👨‍🍳 Step 7: Recipe Generation');
    startTimer('recipeGeneration');
    
    const cookingSteps = frameDescriptions
      .map((frame, i) => `${i + 1}. (${frame.timestamp}s) ${frame.description}`)
      .join('\n');

    const prompt = `Based on these cooking video frames, generate a recipe:

${cookingSteps}

Provide a JSON response with: title, description, ingredients (array), instructions (array), cookingTime, servings`;

    const recipeResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a chef creating recipes from cooking video analysis. Return valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 800,
      response_format: { type: "json_object" }
    });

    const generatedRecipe = JSON.parse(recipeResponse.choices[0].message.content);
    
    stepTimes.recipeGeneration = endTimer('recipeGeneration');
    console.log(`✅ Generated recipe: "${generatedRecipe.title}"\n`);

    // Calculate total time
    const totalTime = Date.now() - overallStart;
    
    // Display results
    console.log('🎯 PERFORMANCE RESULTS');
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
    
    if (totalTime > 30000) {
      console.log('\n💡 Optimization Suggestions:');
      if (stepTimes.aiAnalysis > 10000) {
        console.log('  - AI Analysis is slow - consider parallel processing of frames');
      }
      if (stepTimes.extraction > 5000) {
        console.log('  - Frame extraction is slow - consider lower quality or fewer frames');
      }
      if (stepTimes.embeddings > 5000) {
        console.log('  - Embeddings generation is slow - consider batch processing');
      }
    }

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
testTimedWorkflow();
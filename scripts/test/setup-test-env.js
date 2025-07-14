import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// Create upload-test directory structure
const uploadTestDir = join(process.cwd(), 'upload-test');
const subdirs = ['temp-frames', 'frames', 'videos', 'output'];

console.log('🔧 Setting up test environment...\n');

// Create main directory
if (!existsSync(uploadTestDir)) {
  mkdirSync(uploadTestDir);
  console.log('✅ Created upload-test directory');
} else {
  console.log('📁 upload-test directory already exists');
}

// Create subdirectories
subdirs.forEach(dir => {
  const dirPath = join(uploadTestDir, dir);
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created upload-test/${dir}`);
  } else {
    console.log(`📁 upload-test/${dir} already exists`);
  }
});

console.log('\n✨ Test environment ready!');
console.log(`\nTest directories created in: ${uploadTestDir}`);
console.log('\nYou can now run the test scripts:');
console.log('  node test-upload.js <video-file>');
console.log('  node test-frame-extraction.js <video-file>');
console.log('  node test-ai-analysis.js <image-url>');
console.log('  node test-embeddings.js');
console.log('  node test-recipe-generation.js');
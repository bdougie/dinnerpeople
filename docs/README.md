# DinnerPeople Documentation

## Architecture & Performance

- [Parallel Processing Optimization](./parallel-processing.md) - How we achieved 30s video processing through parallel API calls

## Testing

- [Testing Guide](../scripts/test/TESTING.md) - Comprehensive testing documentation
- [Database Fix Guide](../scripts/test/DATABASE_FIX.md) - Resolving database configuration issues
- [Test Results](../scripts/test/TEST_RESULTS.md) - Latest test validation results

## Development

- [Product Requirements](../tasks/PRD.md) - Product requirements and architecture overview

## Quick Links

- **Performance Target**: 30 seconds for 60MB video ✅ Achieved (28.10s)
- **Test Commands**: `node scripts/test/test-optimized-workflow.js <video-path>`
- **Tech Stack**: React + TypeScript, Supabase, OpenAI, FFmpeg, pgvector
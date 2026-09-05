import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30000,
    // The rule-test files share one emulator database. Run them sequentially
    // so a `clearFirestore()` in one file never wipes another file's seed data.
    fileParallelism: false,
  },
})
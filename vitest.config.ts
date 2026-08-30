import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.*'],
    environment: 'node',
    // client-side modules (tests/unit/*.mjs) import JSON with
    // import attributes; server tests are plain TS
  },
});

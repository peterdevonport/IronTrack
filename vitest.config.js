import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      include: ['*.js'],
      exclude: [
        'firebase.js',
        'vitest.config.js',
        'eslint.config.js',
        'app.js'
      ]
    }
  }
});

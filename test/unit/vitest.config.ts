import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'unit',
    include: ['test/unit/*.spec.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'lcov'], // text for console, lcov for tooling
      reportsDirectory: './coverage',
      include: ['src/**'],
      exclude: [
        'src/logger.ts', // Not necessary to test
        'src/index.ts', // Everything is covered by other tests
      ],
    },
  },
});

import { defineConfig } from 'vitest/config';

export default defineConfig({
  // GitHub Pages serves the site under the repository name (/pomodoro-timer/), so assets are
  // referenced by relative paths. This works regardless of the repository name or a custom domain.
  base: './',
  test: {
    include: ['test/**/*.test.ts'],
  },
});

// vp migrate: merged .oxlintrc.json (291c6a4b1615d0dfd2206163096070d5).
import { defineConfig } from 'vite-plus';

export default defineConfig({
  fmt: {
    singleQuote: true,
    printWidth: 100,
    ignorePatterns: ['pnpm-lock.yaml'],
  },
  lint: {
    plugins: ['eslint', 'typescript', 'unicorn', 'oxc', 'import', 'vitest'],
    categories: {
      correctness: 'error',
      suspicious: 'error',
      perf: 'error',
    },
    options: {
      // Type-aware rules and full type checking, both run on the tsrs-lint backend bundled with
      // Vite+. With typeCheck on, `vp check` is the type checker too: it type-checks every program
      // in tsconfig.json (tsconfig.app.json for src/, tsconfig.node.json for tests and config).
      typeAware: true,
      typeCheck: true,
      denyWarnings: true,
      reportUnusedDisableDirectives: 'error',
    },
    env: {
      browser: true,
      es2024: true,
    },
    rules: {
      // Disabled because it does not understand exhaustive switches. Missing returns are caught using
      // type information by noImplicitReturns in tsconfig and by switch-exhaustiveness-check
      'typescript/consistent-return': 'off',

      // ---- Type-aware rules (not enabled by any category) ----
      'typescript/switch-exhaustiveness-check': 'error',
      'typescript/strict-boolean-expressions': 'error',
      'typescript/no-unnecessary-condition': 'error',
      'typescript/no-unnecessary-type-assertion': 'error',
      'typescript/no-unsafe-type-assertion': 'error',
      'typescript/prefer-nullish-coalescing': 'error',
      'typescript/prefer-optional-chain': 'error',
      'typescript/prefer-readonly': 'error',
      'typescript/no-deprecated': 'error',
      'typescript/require-await': 'error',
      'typescript/return-await': 'error',

      'typescript/consistent-type-imports': 'error',

      // Import test APIs and config helpers from vite-plus rather than from vitest / vite directly
      'vite-plus/prefer-vite-plus-imports': 'error',
    },
    jsPlugins: [
      {
        name: 'vite-plus',
        specifier: 'vite-plus/oxlint-plugin',
      },
    ],
  },
  // GitHub Pages serves the site under the repository name (/pomodoro-timer/), so assets are
  // referenced by relative paths. This works regardless of the repository name or a custom domain.
  base: './',
  test: {
    include: ['test/**/*.test.ts'],
  },
});

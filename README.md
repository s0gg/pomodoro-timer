# Pomodoro Timer

A Pomodoro timer that runs in the browser. One set is 25 min work → 5 min break → 25 min work → 5 min break → 25 min work → 15 min break.

- Moves on to the next phase automatically and lets you know with a chime and a desktop notification (permission is requested the first time you start)
- Stops after the long break; press "Next set" to start another one
- `Space` starts / pauses the timer, and there are Skip and Reset buttons

## Development

Uses Node.js (`.node-version`) and pnpm (`packageManager` in `package.json`).

```sh
pnpm install
pnpm dev          # dev server (Vite)
pnpm check        # run the same checks as CI
```

| Command          | Description                                                           |
| ---------------- | --------------------------------------------------------------------- |
| `pnpm dev`       | Dev server (Vite)                                                     |
| `pnpm build`     | Production build into `dist/` (Vite)                                  |
| `pnpm preview`   | Preview the build locally                                             |
| `pnpm test`      | Tests (Vitest). `pnpm test:watch` for watch mode                      |
| `pnpm typecheck` | Type check (tsrs)                                                     |
| `pnpm lint`      | Lint (oxlint, including type-aware rules powered by tsrs)             |
| `pnpm lint:ast`  | Check project-specific rules and test the rules themselves (ast-grep) |
| `pnpm format`    | Format (oxfmt). `pnpm format:check` only checks                       |
| `pnpm check`     | Run all of the checks above plus the build                            |

### Tooling

- **TypeScript / tsrs**: Type checking uses [tsrs](https://github.com/oxc-project/tsrs), a Rust port of TypeScript 7.
  The browser code (`tsconfig.app.json`, `src/`) and the Node code (`tsconfig.node.json`, tests and config files) are separate programs,
  so accidentally using Node APIs in `src/` or the DOM in tests is a type error.
- **oxlint**: `.oxlintrc.json`. `typeAware` is enabled, so rules that need type information (such as `no-floating-promises` and
  `switch-exhaustiveness-check`) run on tsrs's `tsrs-lint` backend.
- **ast-grep**: Project-specific rules live in `ast-grep/rules/` and their tests in `ast-grep/rule-tests/`.
  - `no-implicit-now`: the logic layer must not call `Date.now()` and the like (the current time comes in as the `now` argument)
  - `no-browser-api-in-logic`: the logic layer must not use the DOM or browser APIs (they are confined to `src/main.ts`)
  - `no-inner-html`: no inserting HTML strings via `innerHTML` and the like
- **oxfmt**: `.oxfmtrc.json`. Formats not only TS but also HTML / CSS / Markdown / JSON / YAML.
- **Vite / Vitest**: Build and tests. `base: './'` makes asset references relative,
  so the site works as-is under the GitHub Pages subpath (`/pomodoro-timer/`) or on a custom domain.

## CI / Deployment

`.github/workflows/ci.yml` runs format → lint → ast-grep → type check → test → build on every pull request and every push to main.
On a push to main, it then deploys `dist/` to GitHub Pages.

The first time only, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions** in the repository.

## Structure

| File              | Role                                                  |
| ----------------- | ----------------------------------------------------- |
| `src/schedule.ts` | Definition of one set's schedule                      |
| `src/timer.ts`    | Timer state transitions (pure functions)              |
| `src/view.ts`     | Display values and notification text (pure functions) |
| `src/format.ts`   | `MM:SS` formatting                                    |
| `src/main.ts`     | Wiring to the DOM, notifications and sound            |

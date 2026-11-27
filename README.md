# Pomodoro Timer

A Pomodoro timer that runs in the browser. One set is 25 min work → 5 min break → 25 min work → 5 min break → 25 min work → 15 min break.

- Moves on to the next phase automatically and lets you know with a chime and a desktop notification (permission is requested the first time you start)
- Stops after the long break; press "Next set" to start another one
- `Space` starts / pauses the timer, and there are Skip and Reset buttons

## Development

Uses [Vite+](https://viteplus.dev/), the unified toolchain whose global CLI `vp` runs everything below.
Vite+ also manages Node.js (`.node-version`) and pnpm (`packageManager` in `package.json`), so install `vp` first
(see the [Vite+ guide](https://viteplus.dev/guide/)). The Vite+ version itself is pinned by the `catalog` in `pnpm-workspace.yaml`.

```sh
vp install
vp dev            # dev server
vp run verify     # run the same checks as CI
```

| Command           | Description                                                                          |
| ----------------- | ------------------------------------------------------------------------------------ |
| `vp dev`          | Dev server (Vite)                                                                    |
| `vp build`        | Production build into `dist/` (Vite)                                                 |
| `vp preview`      | Preview the build locally                                                            |
| `vp test`         | Tests (Vitest). `vp test watch` for watch mode                                       |
| `vp check`        | Format check, lint and type check in one go. `vp check --fix` formats and auto-fixes |
| `vp fmt`          | Format only (Oxfmt)                                                                  |
| `vp lint`         | Lint only (Oxlint, including type-aware rules and the type check)                    |
| `vp run lint:ast` | Check project-specific rules and test the rules themselves (ast-grep)                |
| `vp run verify`   | `vp check` → `vp run lint:ast` → `vp test` → `vp build`, the same steps as CI        |

`vp <name>` is always the Vite+ built-in command; `vp run <name>` runs a `package.json` script.

### Git hooks

`vp install` sets up a pre-commit hook (via the `prepare` script, which runs `vp config`). It runs `vp staged`,
which checks only the staged files with the `staged` block in `vite.config.ts`: `vp check --fix` (formats and auto-fixes,
then lints and type-checks), then `ast-grep scan`. Fixes are added to the commit; any remaining error stops the commit.

- `vp hooks status` shows whether the hook is active in this clone; `vp hooks enable` / `vp hooks disable` turn it on / off
- `VP_GIT_HOOKS=0 git commit ...` skips the hook for a single commit

### Tooling

All tool configuration except TypeScript and ast-grep lives in `vite.config.ts`.

- **TypeScript / tsrs**: `vp check` type-checks with [tsrs](https://github.com/oxc-project/tsrs), a Rust port of TypeScript 7 bundled with Vite+
  (`lint.options.typeCheck`). The browser code (`tsconfig.app.json`, `src/`) and the Node code (`tsconfig.node.json`, tests and config files)
  are separate programs, so accidentally using Node APIs in `src/` or the DOM in tests is a type error.
- **Oxlint** (`lint` block): `typeAware` is enabled, so rules that need type information (such as `no-floating-promises` and
  `switch-exhaustiveness-check`) run on tsrs's `tsrs-lint` backend.
- **ast-grep**: Project-specific rules live in `ast-grep/rules/` and their tests in `ast-grep/rule-tests/`.
  - `no-implicit-now`: the logic layer must not call `Date.now()` and the like (the current time comes in as the `now` argument)
  - `no-browser-api-in-logic`: the logic layer must not use the DOM or browser APIs (they are confined to `src/main.ts`)
  - `no-inner-html`: no inserting HTML strings via `innerHTML` and the like
- **Oxfmt** (`fmt` block): Formats not only TS but also HTML / CSS / Markdown / JSON / YAML.
- **Vite / Vitest** (`test` block): Build and tests. Tests import their APIs from `vite-plus/test`.
  `base: './'` makes asset references relative, so the site works as-is under the GitHub Pages subpath (`/pomodoro-timer/`) or on a custom domain.

## CI / Deployment

`.github/workflows/ci.yml` sets up Vite+ with `voidzero-dev/setup-vp`, then runs `vp check` (format → lint → type check) → ast-grep → test → build
on every pull request and every push to main.
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

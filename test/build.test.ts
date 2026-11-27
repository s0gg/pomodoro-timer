import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { afterAll, beforeAll, expect, test } from 'vite-plus/test';

const root = fileURLToPath(new URL('..', import.meta.url));
let outDir = '';
let html = '';

beforeAll(async () => {
  outDir = await mkdtemp(join(tmpdir(), 'pomodoro-build-'));
  await build({ root, logLevel: 'silent', build: { outDir, emptyOutDir: true } });
  html = await readFile(join(outDir, 'index.html'), 'utf8');
}, 60_000);

afterAll(async () => {
  await rm(outDir, { recursive: true, force: true });
});

test('references JS/CSS by relative paths so it works under the GitHub Pages subpath', () => {
  expect(html).toMatch(/<script type="module"[^>]*\ssrc="\.\/assets\/[^"]+\.js"/);
  expect(html).toMatch(/<link rel="stylesheet"[^>]*\shref="\.\/assets\/[^"]+\.css"/);
});

test('references the built JS rather than the TypeScript source', () => {
  expect(html).not.toContain('src/main');
});

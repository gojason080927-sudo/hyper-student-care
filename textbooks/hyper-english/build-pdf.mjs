#!/usr/bin/env node
// Print-first build: HTML source -> PDF + page PNG previews via headless Chrome.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)));
const out = join(root, 'out');
mkdirSync(out, { recursive: true });

const html = join(root, 'sample-g3.html');
const pdf = join(out, 'hyper-english-g3-sample.pdf');

execFileSync('google-chrome', [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--no-first-run',
  `--user-data-dir=${join(out, '.chrome-profile')}`,
  `--print-to-pdf=${pdf}`,
  '--no-pdf-header-footer',
  `file://${html}`,
], { stdio: 'inherit' });

console.log(`PDF: ${pdf}`);
console.log(`exists: ${existsSync(pdf)}`);

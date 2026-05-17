#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const textExtensions = new Set(['.json', '.mjs', '.js', '.md', '.pine', '.txt', '.yml', '.yaml']);
const errors = [];

function extensionOf(file) {
  const dotAt = file.lastIndexOf('.');
  return dotAt >= 0 ? file.slice(dotAt).toLowerCase() : '';
}

function isTextContractFile(file) {
  return textExtensions.has(extensionOf(file)) || file === 'package.json' || file === 'AGENTS.md' || file === 'WORKFLOW.md';
}

function isGeneratedArtifact(file) {
  return file.replace(/\\/g, '/').startsWith('analysis_journal/');
}

const trackedFiles = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split(/\r?\n/)
  .map((file) => file.trim())
  .filter(Boolean)
  .filter((file) => !isGeneratedArtifact(file))
  .filter(isTextContractFile);

for (const file of trackedFiles) {
  if (!existsSync(file)) continue;
  const buffer = readFileSync(file);
  const nulAt = buffer.indexOf(0);
  if (nulAt >= 0) {
    errors.push(`${file}: contains NUL byte at offset ${nulAt}`);
    continue;
  }

  if (extensionOf(file) === '.json') {
    try {
      JSON.parse(buffer.toString('utf8').replace(/^\uFEFF/, ''));
    } catch (error) {
      errors.push(`${file}: invalid JSON: ${error.message}`);
    }
  }
}

if (errors.length) {
  console.error('Integrity preflight failed:');
  for (const error of errors) console.error(`  ERROR ${error}`);
  process.exit(1);
}

console.log(`Integrity preflight passed (${trackedFiles.length} text files checked).`);

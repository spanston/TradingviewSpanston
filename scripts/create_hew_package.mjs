#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateEvidenceFile } from './validate_evidence.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(repoRoot, 'strategies', 'hew', 'manifest.json');

const REQUIRED_RAW_FILES = {
  'raw/kpe_monthly.jsonl': 'kpe_monthly',
  'raw/kpe_weekly.jsonl': 'kpe_weekly',
  'raw/kpe_daily.jsonl': 'kpe_daily',
  'raw/ohlcv_monthly.csv': 'ohlcv_monthly',
  'raw/ohlcv_weekly.csv': 'ohlcv_weekly',
  'raw/ohlcv_daily.csv': 'ohlcv_daily',
  'raw/draw_list_before.json': 'draw_list_before',
  'raw/draw_list_after.json': 'draw_list_after',
  'raw/chart_state_final.json': 'chart_state_final'
};

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function defaultRawContent(relativePath) {
  if (relativePath.endsWith('.csv')) return 'time,open,high,low,close\n';
  if (relativePath.endsWith('.json')) return relativePath.includes('chart_state') ? '{}\n' : '[]\n';
  return '';
}

function toFileContent(value) {
  if (value == null) return '';
  if (typeof value === 'string' || value instanceof Uint8Array) return value;
  return `${JSON.stringify(value, null, 2)}\n`;
}

function normalizeRawFiles(rawFiles = {}) {
  const normalized = {};
  for (const [relativePath, role] of Object.entries(REQUIRED_RAW_FILES)) {
    normalized[relativePath] = toFileContent(rawFiles[relativePath] ?? rawFiles[role] ?? defaultRawContent(relativePath));
  }
  for (const [relativePath, content] of Object.entries(rawFiles)) {
    const normalizedPath = String(relativePath).replace(/\\/g, '/');
    if (normalizedPath.startsWith('raw/') && normalizedPath !== 'raw/hashes.json') {
      normalized[normalizedPath] = toFileContent(content);
    }
  }
  return normalized;
}

function rawArtifactsFromFiles(rawFiles, generatedAt) {
  return {
    generated_at: generatedAt,
    files: Object.entries(rawFiles)
      .filter(([relativePath]) => relativePath !== 'raw/hashes.json')
      .map(([path, content]) => ({
        role: REQUIRED_RAW_FILES[path] || path.replace(/^raw\//, '').replace(/\W+/g, '_'),
        path,
        sha256: sha256(content)
      }))
  };
}

export function loadHewManifest() {
  return readJson(manifestPath);
}

export function packageIdForSymbol(symbol, date = new Date()) {
  const datePart = date.toISOString().slice(0, 10);
  const symbolPart = String(symbol || 'UNKNOWN')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  return `${symbolPart || 'UNKNOWN'}_${datePart}_hew`;
}

export function createHewEvidenceSkeleton({
  symbol,
  journalId,
  savedAt = new Date().toISOString(),
  manifest = loadHewManifest()
} = {}) {
  const id = journalId || packageIdForSymbol(symbol || 'UNKNOWN', new Date(savedAt));
  return {
    journal_id: id,
    saved_at: savedAt,
    symbol: symbol || 'UNKNOWN',
    method: 'Ian Copsey Fractal Forecasting',
    workflow_version: manifest.contract_version,
    status: 'draft',
    verdict: {
      package_validity: 'fail',
      evidence_grade: 'failed',
      trade_permission: 'blocked',
      confidence: 'very_low',
      posture: 'STAND ASIDE'
    },
    stage_gates: (manifest.stage_gates || []).map((gate) => ({
      id: gate,
      status: 'not_applicable',
      evidence: 'Non-live package skeleton; fill from collected TradingView evidence before validation.'
    })),
    analysis_checklist: [],
    chart_prep: {
      chart_mode_checklist: [],
      drawing_manifest: []
    },
    screenshots: [],
    raw_artifacts: {
      generated_at: savedAt,
      files: []
    },
    visual_pivot_evidence: {},
    ian_copsey_wave_map: {},
    hypotheses: [],
    count_state: {},
    hew_structure_context: {},
    copsey_hew_purity: {},
    primary_count: {},
    alternate_counts: [],
    ratio_validation: [],
    rule_validation: [],
    wave_b_invalidation_ladder: {
      direction: 'neutral',
      validation_standard: 'not_collected',
      rungs: [],
      drawing_refs: [],
      hard_failure_ids: []
    },
    corrective_structure: {
      location: 'not_applicable',
      pattern: 'not_applicable',
      mode: 'not_applicable',
      wave_b_behavior: 'not_applicable',
      preceding_impulse_ref: 'not_collected',
      evidence: 'Non-live package skeleton; classify correction after TradingView evidence is collected.'
    },
    zone_scores: [],
    risk_architecture: {
      setup_type: 'structural_map_only',
      structural_setup: {
        summary: 'Non-live package skeleton; structural setup not collected.',
        evidence: 'Fill after validated HEW structure.'
      },
      execution_setup: {
        status: 'not_ready',
        entry_condition: 'not_applicable',
        stop_level: 'not_applicable',
        target_zone: 'not_applicable',
        risk_reward: 'not_applicable'
      },
      risk_reward: 'not_applicable',
      invalidation: 'not_collected',
      position_sizing_basis: 'not_applicable',
      alternate_response: 'not_collected',
      time_or_structural_stop: 'not_collected',
      evidence: 'Structural map and execution setup are separated by default.'
    },
    action_rationale: {},
    trade_posture: {},
    castaway_trade_model: {
      decision_table: []
    },
    no_trade_gate: [],
    red_team: {},
    critic_review: {},
    review_conditions: [],
    missing_evidence: [],
    confidence: {
      rating: 'very_low',
      cap_reason: 'Non-live package skeleton; collected evidence has not passed validation.'
    },
    execution_quality: {}
  };
}

export function mergeCollectedEvidence(skeleton, collected = {}) {
  return {
    ...skeleton,
    ...(collected.evidence || {}),
    raw_artifacts: skeleton.raw_artifacts
  };
}

export function createJournalMarkdown(evidence) {
  const screenshotLines = (evidence.screenshots || [])
    .filter((screenshot) => screenshot?.path)
    .map((screenshot) => `![${screenshot.role || 'screenshot'}](${String(screenshot.path).replace(/\\/g, '/')})`);
  return [
    `# ${evidence.journal_id}`,
    '',
    `Decision: ${evidence.verdict?.posture || evidence.trade_posture?.posture || 'STAND ASIDE'}`,
    '',
    ...screenshotLines,
    ''
  ].join('\n');
}

export function createCommitteeBriefMarkdown(evidence) {
  return [
    `# ${evidence.journal_id} Committee Brief`,
    '',
    `Symbol: ${evidence.symbol}`,
    `Method: ${evidence.method}`,
    `Posture: ${evidence.verdict?.posture || 'STAND ASIDE'}`,
    ''
  ].join('\n');
}

export function writeHewPackage(packageDir, evidence, options = {}) {
  const absoluteDir = resolve(packageDir);
  const rawDir = resolve(absoluteDir, 'raw');
  const screenshotsDir = resolve(absoluteDir, 'screenshots');
  mkdirSync(rawDir, { recursive: true });
  mkdirSync(screenshotsDir, { recursive: true });

  const rawFiles = normalizeRawFiles(options.rawFiles || {});
  const hashes = {};
  for (const [relativePath, content] of Object.entries(rawFiles)) {
    const absoluteFile = resolve(absoluteDir, relativePath);
    mkdirSync(dirname(absoluteFile), { recursive: true });
    writeFileSync(absoluteFile, content);
    hashes[relativePath] = sha256(content);
  }
  writeJson(resolve(rawDir, 'hashes.json'), { files: hashes });

  for (const [relativePath, content] of Object.entries(options.screenshotFiles || {})) {
    const normalizedPath = String(relativePath).replace(/\\/g, '/');
    const absoluteFile = resolve(absoluteDir, normalizedPath);
    mkdirSync(dirname(absoluteFile), { recursive: true });
    writeFileSync(absoluteFile, content);
  }

  const assembledEvidence = {
    ...evidence,
    raw_artifacts: rawArtifactsFromFiles(rawFiles, evidence.saved_at)
  };
  writeFileSync(resolve(absoluteDir, 'journal.md'), options.journalMarkdown || createJournalMarkdown(assembledEvidence));
  writeFileSync(resolve(absoluteDir, 'committee_brief.md'), options.committeeBriefMarkdown || createCommitteeBriefMarkdown(assembledEvidence));
  writeJson(resolve(absoluteDir, 'evidence.json'), assembledEvidence);
  return assembledEvidence;
}

export function assembleHewPackageFromCollectedData({ packageDir, collectedData = {}, validate = true } = {}) {
  if (!packageDir) throw new Error('packageDir is required');
  const manifest = loadHewManifest();
  const skeleton = createHewEvidenceSkeleton({
    symbol: collectedData.symbol,
    journalId: collectedData.journal_id,
    savedAt: collectedData.saved_at,
    manifest
  });
  const evidence = mergeCollectedEvidence(skeleton, collectedData);
  const writtenEvidence = writeHewPackage(packageDir, evidence, collectedData);
  const validation = validate ? validateEvidenceFile(resolve(packageDir, 'evidence.json'), { strategy: 'hew' }) : null;
  return { packageDir: resolve(packageDir), evidence: writtenEvidence, validation };
}

function parseArgs(argv) {
  const args = [...argv];
  const result = { collected: null, packageDir: null, help: false, validate: true };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') result.help = true;
    else if (arg === '--no-validate') result.validate = false;
    else if (arg === '--collected') result.collected = args[++index];
    else if (arg === '--package-dir') result.packageDir = args[++index];
  }
  return result;
}

function printHelp() {
  console.log('Usage: node scripts/create_hew_package.mjs --package-dir analysis_journal/<PACKAGE> [--collected collected.json] [--no-validate]');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.packageDir) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }
  const collectedData = args.collected && existsSync(args.collected) ? readJson(args.collected) : {};
  const result = assembleHewPackageFromCollectedData({
    packageDir: args.packageDir,
    collectedData,
    validate: args.validate
  });
  if (result.validation) {
    for (const error of result.validation.errors) console.error(`ERROR ${error}`);
    for (const warning of result.validation.warnings) console.warn(`WARN ${warning}`);
    console.log(`${result.validation.errors.length ? 'FAIL' : 'PASS'} ${resolve(args.packageDir, 'evidence.json')}`);
    process.exit(result.validation.errors.length ? 1 : 0);
  }
  console.log(`Wrote ${resolve(args.packageDir, 'evidence.json')}`);
}

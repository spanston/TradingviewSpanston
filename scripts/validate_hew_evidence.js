#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const contractVersion = 'hew_evidence_stack_v1';

const requiredTopLevel = [
  'journal_id',
  'saved_at',
  'symbol',
  'method',
  'workflow_version',
  'status',
  'evidence_contract',
  'asset_context',
  'analysis_checklist',
  'chart_prep',
  'screenshots',
  'timeframe_summaries',
  'primary_count',
  'alternate_counts',
  'pivot_map',
  'ratio_validation',
  'rule_validation',
  'corrective_structure',
  'alternation',
  'projection_targets',
  'invalidation_and_flip_levels',
  'trade_posture',
  'validation_log',
  'no_trade_gate',
  'red_team',
  'review_triggers',
  'missing_evidence',
  'confidence',
];

const requiredChecklistIds = [
  'source_tradingview_mcp',
  'top_down_timeframes_checked',
  'macro_count_prioritized',
  'chart_fitted_before_reads',
  'primary_count_defined',
  'macro_subwaves_mapped',
  'alternate_count_defined',
  'wave3_projection_checked',
  'c_of_3_checked',
  'support_invalidation_checked',
  'alternation_checked',
  'corrective_structure_checked',
  'projection_targets_clustered',
  'hard_invalidation_defined',
  'flip_level_defined',
  'trade_posture_scored',
  'validation_log_complete',
  'red_team_complete',
  'screenshots_aligned',
];

const requiredRuleIds = [
  'wave2_origin',
  'wave3_exceeds_wave1',
  'wave3_1764_floor',
  'wave4_respects_b_of_3',
  'wave5_exceeds_wave3',
  'b_of_5_respects_wave4',
];

const requiredNoTradeGateIds = [
  'location',
  'trigger',
  'invalidation',
  'reward',
  'timeframe_alignment',
];

const allowedChecklistStatuses = new Set([
  'pass',
  'pass_with_fallback',
  'fail',
  'partial',
  'not_applicable',
  'not_requested',
]);

const allowedValidationStatuses = new Set([
  'pass',
  'fail',
  'partial',
  'candidate',
  'not_applicable',
  'missing',
  'unavailable',
]);

const allowedTradePermissions = new Set([
  'allowed',
  'blocked',
  'watchlist_only',
  'structural_only',
]);

const allowedPostures = new Set([
  'BULLISH',
  'BEARISH',
  'ACCUMULATION',
  'STAND ASIDE',
]);

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function discoverEvidenceFiles() {
  const base = join(repoRoot, 'analysis_journal');
  if (!existsSync(base)) return [];

  return readdirSync(base, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.endsWith('_hew'))
    .map((entry) => join(base, entry.name, 'evidence.json'))
    .filter((file) => existsSync(file));
}

function parseJson(file, errors) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(`invalid JSON: ${error.message}`);
    return null;
  }
}

function indexById(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function validateObjectField(evidence, key, errors) {
  if (!evidence[key] || typeof evidence[key] !== 'object' || Array.isArray(evidence[key])) {
    errors.push(`${key} must be an object`);
  }
}

function validateEvidence(file) {
  const errors = [];
  const warnings = [];
  const evidence = parseJson(file, errors);
  if (!evidence) return { file, errors, warnings };

  for (const key of requiredTopLevel) {
    if (!hasOwn(evidence, key)) errors.push(`missing top-level section: ${key}`);
  }

  if (evidence.evidence_contract?.contract_version !== contractVersion) {
    errors.push(
      `evidence_contract.contract_version must be ${contractVersion}`,
    );
  }

  const tradePermission = evidence.evidence_contract?.trade_permission;
  if (tradePermission && !allowedTradePermissions.has(tradePermission)) {
    errors.push(`evidence_contract.trade_permission has unsupported value: ${tradePermission}`);
  }

  if (!String(evidence.method || '').toLowerCase().includes('hew')
    && !String(evidence.method || '').toLowerCase().includes('harmonic')) {
    warnings.push('method does not mention HEW or Harmonic Elliott Wave');
  }

  for (const key of [
    'asset_context',
    'chart_prep',
    'primary_count',
    'corrective_structure',
    'alternation',
    'invalidation_and_flip_levels',
    'trade_posture',
    'red_team',
    'confidence',
  ]) {
    if (hasOwn(evidence, key)) validateObjectField(evidence, key, errors);
  }

  if (!Array.isArray(evidence.analysis_checklist)) {
    errors.push('analysis_checklist must be an array');
  } else {
    const checklist = indexById(evidence.analysis_checklist);
    for (const id of requiredChecklistIds) {
      if (!checklist.has(id)) errors.push(`missing analysis_checklist id: ${id}`);
    }

    for (const item of evidence.analysis_checklist) {
      if (!item.id) errors.push('analysis_checklist item missing id');
      if (!item.status) errors.push(`${item.id || 'checklist item'} missing status`);
      if (item.status && !allowedChecklistStatuses.has(item.status)) {
        errors.push(`${item.id} has unsupported status: ${item.status}`);
      }
      if (!item.evidence) warnings.push(`${item.id || 'checklist item'} missing evidence`);
    }
  }

  if (!Array.isArray(evidence.screenshots) || evidence.screenshots.length === 0) {
    errors.push('screenshots must be a non-empty array');
  } else {
    for (const screenshot of evidence.screenshots) {
      if (!String(screenshot.path || '').startsWith('screenshots/')) {
        errors.push(`screenshot path must be package-relative: ${screenshot.path}`);
      }
    }
  }

  if (!Array.isArray(evidence.alternate_counts) || evidence.alternate_counts.length === 0) {
    errors.push('alternate_counts must be a non-empty array');
  }

  if (!Array.isArray(evidence.ratio_validation)) {
    errors.push('ratio_validation must be an array');
  } else {
    const ratio = indexById(evidence.ratio_validation);
    if (!ratio.has('wave3_1764_floor')) {
      errors.push('missing ratio_validation id: wave3_1764_floor');
    }
    for (const item of evidence.ratio_validation) {
      if (!item.id) errors.push('ratio_validation item missing id');
      if (!item.status) errors.push(`${item.id || 'ratio item'} missing status`);
      if (item.status && !allowedValidationStatuses.has(item.status)) {
        errors.push(`${item.id} has unsupported status: ${item.status}`);
      }
    }
  }

  if (!Array.isArray(evidence.rule_validation)) {
    errors.push('rule_validation must be an array');
  } else {
    const rules = indexById(evidence.rule_validation);
    for (const id of requiredRuleIds) {
      if (!rules.has(id)) errors.push(`missing rule_validation id: ${id}`);
    }
    for (const item of evidence.rule_validation) {
      if (!item.id) errors.push('rule_validation item missing id');
      if (!item.status) errors.push(`${item.id || 'rule item'} missing status`);
      if (item.status && !allowedValidationStatuses.has(item.status)) {
        errors.push(`${item.id} has unsupported status: ${item.status}`);
      }
    }
  }

  if (!Array.isArray(evidence.projection_targets) || evidence.projection_targets.length === 0) {
    errors.push('projection_targets must be a non-empty array');
  }

  if (!Array.isArray(evidence.validation_log) || evidence.validation_log.length === 0) {
    errors.push('validation_log must be a non-empty array');
  }

  if (!Array.isArray(evidence.no_trade_gate)) {
    errors.push('no_trade_gate must be an array');
  } else {
    const gates = indexById(evidence.no_trade_gate);
    for (const id of requiredNoTradeGateIds) {
      if (!gates.has(id)) errors.push(`missing no_trade_gate id: ${id}`);
    }
  }

  const posture = evidence.trade_posture?.posture;
  if (posture && !allowedPostures.has(posture)) {
    errors.push(`trade_posture.posture has unsupported value: ${posture}`);
  }

  if (tradePermission === 'allowed' && posture === 'STAND ASIDE') {
    errors.push('trade_permission is allowed while trade_posture.posture is STAND ASIDE');
  }

  return { file, errors, warnings };
}

const inputFiles = process.argv.slice(2).map((file) => resolve(file));
const files = inputFiles.length > 0 ? inputFiles : discoverEvidenceFiles();

if (files.length === 0) {
  console.error('No HEW evidence files found.');
  process.exit(1);
}

const results = files.map(validateEvidence);
let failures = 0;

for (const result of results) {
  const label = relative(repoRoot, result.file);
  if (result.errors.length === 0) {
    console.log(`PASS ${label}`);
  } else {
    failures += 1;
    console.error(`FAIL ${label}`);
    for (const error of result.errors) console.error(`  - ${error}`);
  }

  for (const warning of result.warnings) {
    console.warn(`WARN ${label}: ${warning}`);
  }
}

if (failures > 0) {
  console.error(`${failures} HEW evidence file(s) failed validation.`);
  process.exit(1);
}

console.log(`${results.length} HEW evidence file(s) validated.`);

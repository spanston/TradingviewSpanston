#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const contractVersion = 'wyckoff_evidence_stack_v1';

const requiredTopLevel = [
  'journal_id',
  'saved_at',
  'symbol',
  'method',
  'workflow_version',
  'status',
  'evidence_contract',
  'asset_context',
  'indicator_evidence_stack',
  'analysis_checklist',
  'chart_prep',
  'screenshots',
  'timeframe_summaries',
  'event_evidence',
  'wave_effort_result',
  'value_profile',
  'acceptance_rules',
  'no_trade_gate',
  'red_team',
  'review_triggers',
  'missing_evidence',
  'confidence',
];

const requiredStackIds = [
  'price_structure_volume',
  'value_profile',
  'avwap_cost_basis',
  'relative_strength',
  'weis_wave_effort_result',
  'momentum_sot',
  'order_flow_execution',
];

const requiredChecklistIds = [
  'source_tradingview_mcp',
  'asset_adapter_selected',
  'chart_fitted_before_reads',
  'structure_volume_primary',
  'value_profile_checked',
  'avwap_checked',
  'relative_strength_checked',
  'effort_result_checked',
  'momentum_sot_checked',
  'order_flow_execution_gate',
  'event_evidence_ledger_complete',
  'acceptance_rules_complete',
  'no_trade_gate_scored',
  'red_team_complete',
  'screenshots_aligned',
  'clean_trade_permission_respected',
];

const allowedStackStatuses = new Set([
  'native',
  'computed',
  'manual',
  'fallback',
  'proxy',
  'missing',
  'unavailable',
  'not_applicable',
  'not_requested',
]);

const allowedChecklistStatuses = new Set([
  'pass',
  'pass_with_fallback',
  'fail',
  'not_applicable',
  'not_requested',
]);

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function discoverEvidenceFiles() {
  const base = join(repoRoot, 'analysis_journal');
  if (!existsSync(base)) return [];

  return readdirSync(base, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
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

  if (!Array.isArray(evidence.indicator_evidence_stack)) {
    errors.push('indicator_evidence_stack must be an array');
  } else {
    const stack = indexById(evidence.indicator_evidence_stack);
    for (const id of requiredStackIds) {
      if (!stack.has(id)) errors.push(`missing indicator_evidence_stack id: ${id}`);
    }

    for (const item of evidence.indicator_evidence_stack) {
      if (!item.id) errors.push('indicator_evidence_stack item missing id');
      if (!item.status) errors.push(`${item.id || 'stack item'} missing status`);
      if (item.status && !allowedStackStatuses.has(item.status)) {
        errors.push(`${item.id} has unsupported status: ${item.status}`);
      }
      if (!item.source) warnings.push(`${item.id || 'stack item'} missing source`);
      if (!item.role) warnings.push(`${item.id || 'stack item'} missing role`);
    }

    const cleanTradePermission = String(
      evidence.evidence_contract?.clean_trade_permission || '',
    );
    if (cleanTradePermission === 'allowed') {
      for (const id of ['value_profile', 'avwap_cost_basis', 'relative_strength']) {
        const status = stack.get(id)?.status;
        if (['missing', 'unavailable'].includes(status)) {
          errors.push(
            `clean_trade_permission is allowed while ${id} is ${status}`,
          );
        }
      }
    }
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

  return { file, errors, warnings };
}

const inputFiles = process.argv.slice(2).map((file) => resolve(file));
const files = inputFiles.length > 0 ? inputFiles : discoverEvidenceFiles();

if (files.length === 0) {
  console.error('No Wyckoff evidence files found.');
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
  console.error(`${failures} evidence file(s) failed validation.`);
  process.exit(1);
}

console.log(`${results.length} evidence file(s) validated.`);

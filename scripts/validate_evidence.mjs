#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function hasOwn(object, key) {
  return object != null && Object.prototype.hasOwnProperty.call(object, key);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function parseJson(file, errors) {
  let raw;
  try {
    raw = readFileSync(file, 'utf8');
  } catch (error) {
    errors.push(error.code === 'ENOENT' ? `file not found: ${file}` : `read failed: ${file}: ${error.message}`);
    return null;
  }
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  try {
    return JSON.parse(raw);
  } catch (error) {
    errors.push(`invalid JSON in ${file}: ${error.message}`);
    return null;
  }
}

function getByPath(object, path) {
  return String(path || '').split('.').filter(Boolean).reduce((value, part) => {
    if (value == null) return undefined;
    return value[part];
  }, object);
}

function indexById(items, path, errors) {
  const map = new Map();
  for (const item of asArray(items)) {
    if (!item || typeof item !== 'object') continue;
    if (!item.id) {
      errors.push(`${path} item missing id`);
      continue;
    }
    if (map.has(item.id)) errors.push(`duplicate id in ${path}: ${item.id}`);
    map.set(item.id, item);
  }
  return map;
}

function inferStrategy(evidence) {
  const method = String(evidence?.method || evidence?.workflow_version || evidence?.journal_id || '').toLowerCase();
  if (/\bhew\b|harmonic elliott|elliott|wave count/.test(method)) return 'hew';
  if (/wyckoff|accumulation|distribution/.test(method)) return 'wyckoff';
  return null;
}

function loadManifest(strategy, errors) {
  const file = resolve(repoRoot, 'strategies', strategy, 'manifest.json');
  const manifest = parseJson(file, errors);
  if (!manifest) return null;
  validateManifest(manifest, file, errors);
  return manifest;
}

function validateManifest(manifest, file, errors) {
  const required = ['strategy_id', 'display_name', 'contract_version', 'required_top_level', 'stage_gates', 'action_rationale_fields', 'critic_review'];
  for (const key of required) {
    if (!hasOwn(manifest, key)) errors.push(`manifest ${file} missing ${key}`);
  }
  if (!Array.isArray(manifest.required_top_level)) errors.push(`manifest ${file} required_top_level must be an array`);
  if (!Array.isArray(manifest.stage_gates)) errors.push(`manifest ${file} stage_gates must be an array`);
  if (!manifest.allowed || typeof manifest.allowed !== 'object') errors.push(`manifest ${file} missing allowed object`);
}

function validateTopLevel(evidence, manifest, errors) {
  for (const key of manifest.required_top_level || []) {
    if (!hasOwn(evidence, key)) errors.push(`missing top-level field: ${key}`);
  }
}

function validateContractVersion(evidence, manifest, errors) {
  if (evidence.workflow_version !== manifest.contract_version) {
    errors.push(`workflow_version must equal manifest contract_version ${manifest.contract_version}: ${evidence.workflow_version}`);
  }
}

function validateStageGates(evidence, manifest, errors) {
  const gates = indexById(evidence.stage_gates, 'stage_gates', errors);
  const allowed = new Set(manifest.allowed?.stage_gate_statuses || ['pass', 'pass_with_fallback', 'not_applicable']);
  for (const id of manifest.stage_gates || []) {
    const gate = gates.get(id);
    if (!gate) {
      errors.push(`missing stage gate: ${id}`);
      continue;
    }
    if (!allowed.has(gate.status)) errors.push(`stage_gates.${id} status must be one of ${[...allowed].join(', ')}: ${gate.status}`);
    if (!String(gate.evidence || '').trim()) errors.push(`stage_gates.${id} missing evidence`);
  }
}

function validateIdCollections(evidence, manifest, errors) {
  for (const collection of manifest.id_collections || []) {
    const items = getByPath(evidence, collection.path);
    if (!Array.isArray(items)) {
      errors.push(`${collection.path} must be an array`);
      continue;
    }
    const byId = indexById(items, collection.path, errors);
    for (const id of collection.required_ids || []) {
      if (!byId.has(id)) errors.push(`${collection.path} missing required id: ${id}`);
    }
    const allowed = collection.allowed_statuses ? new Set(manifest.allowed?.[collection.allowed_statuses] || []) : null;
    if (allowed) {
      for (const item of items) {
        if (item?.id && !allowed.has(item.status)) {
          errors.push(`${collection.path}.${item.id} status must be one of ${[...allowed].join(', ')}: ${item.status}`);
        }
      }
    }
  }
}

function validateScreenshots(evidence, manifest, file, errors) {
  const packageDir = dirname(file);
  const screenshotsDir = resolve(packageDir, 'screenshots');
  const screenshotsPrefix = screenshotsDir.endsWith(sep) ? screenshotsDir : `${screenshotsDir}${sep}`;
  const roles = new Set();
  for (const screenshot of asArray(evidence.screenshots)) {
    if (!screenshot || typeof screenshot !== 'object') {
      errors.push('screenshots item must be an object');
      continue;
    }
    if (screenshot.role) roles.add(screenshot.role);
    const rawPath = String(screenshot.path || '').replace(/\\/g, '/');
    if (!rawPath) {
      errors.push('screenshots item missing path');
      continue;
    }
    if (!rawPath.startsWith('screenshots/')) {
      errors.push(`screenshot path must be package-relative under screenshots/: ${screenshot.path}`);
      continue;
    }
    const absolute = resolve(packageDir, rawPath);
    if (!(absolute === screenshotsDir || absolute.startsWith(screenshotsPrefix))) {
      errors.push(`screenshot path escapes package: ${screenshot.path}`);
      continue;
    }
    if (!existsSync(absolute)) errors.push(`screenshot file is missing: ${screenshot.path}`);
  }
  for (const role of manifest.required_screenshot_roles || []) {
    if (!roles.has(role)) errors.push(`missing screenshot role: ${role}`);
  }
}

function validateVisualPivotEvidence(evidence, manifest, errors) {
  const protocol = manifest.visual_pivot_protocol;
  if (!protocol) return;

  const pivotEvidence = evidence.visual_pivot_evidence;
  if (!pivotEvidence || typeof pivotEvidence !== 'object') {
    errors.push('missing top-level field: visual_pivot_evidence');
    return;
  }

  for (const field of ['indicator_name', 'study_filter', 'extraction_method', 'iteration_decision']) {
    if (!String(pivotEvidence[field] || '').trim()) errors.push(`visual_pivot_evidence.${field} is required`);
  }

  const screenshotPaths = new Set(asArray(evidence.screenshots).map((screenshot) => String(screenshot?.path || '').replace(/\\/g, '/')).filter(Boolean));
  const allowedTimeframes = new Set(protocol.allowed_timeframes || []);
  const requiredTimeframes = new Set(protocol.required_timeframes || []);
  const allowedPivotTypes = new Set(protocol.allowed_pivot_types || []);
  const allowedVerificationStatuses = new Set(protocol.allowed_verification_statuses || ['pass', 'pass_with_fallback']);
  const seenTimeframes = new Set();

  const timeframeEvidence = pivotEvidence.timeframes;
  if (!Array.isArray(timeframeEvidence)) {
    errors.push('visual_pivot_evidence.timeframes must be an array');
    return;
  }

  for (const item of timeframeEvidence) {
    if (!item || typeof item !== 'object') {
      errors.push('visual_pivot_evidence.timeframes item must be an object');
      continue;
    }

    const timeframe = String(item.timeframe || '').toLowerCase();
    if (!timeframe) {
      errors.push('visual_pivot_evidence.timeframes item missing timeframe');
    } else {
      seenTimeframes.add(timeframe);
      if (allowedTimeframes.size && !allowedTimeframes.has(timeframe)) {
        errors.push(`visual_pivot_evidence.${timeframe} invalid timeframe`);
      }
    }

    const screenshot = String(item.screenshot || '').replace(/\\/g, '/');
    if (!screenshot) {
      errors.push(`visual_pivot_evidence.${timeframe || '<unknown>'} missing screenshot`);
    } else if (!screenshotPaths.has(screenshot)) {
      errors.push(`visual_pivot_evidence.${timeframe || '<unknown>'} screenshot not listed in screenshots: ${item.screenshot}`);
    }

    const pivots = item.pivots;
    if (!Array.isArray(pivots) || pivots.length === 0) {
      errors.push(`visual_pivot_evidence.${timeframe || '<unknown>'}.pivots must be a non-empty array`);
    } else {
      indexById(pivots, `visual_pivot_evidence.${timeframe || '<unknown>'}.pivots`, errors);
      for (const pivot of pivots) {
        if (!pivot || typeof pivot !== 'object') continue;
        if (!String(pivot.type || '').trim()) errors.push(`visual_pivot_evidence.${timeframe || '<unknown>'}.pivots.${pivot.id || '<unknown>'} missing type`);
        if (pivot.type && allowedPivotTypes.size && !allowedPivotTypes.has(pivot.type)) {
          errors.push(`visual_pivot_evidence.${timeframe || '<unknown>'}.pivots.${pivot.id || '<unknown>'} invalid type: ${pivot.type}`);
        }
        if (typeof pivot.price !== 'number') errors.push(`visual_pivot_evidence.${timeframe || '<unknown>'}.pivots.${pivot.id || '<unknown>'}.price must be a number`);
        if (!String(pivot.source_text || '').trim()) errors.push(`visual_pivot_evidence.${timeframe || '<unknown>'}.pivots.${pivot.id || '<unknown>'} missing source_text`);
      }
    }

    const verifications = item.ohlcv_verification;
    if (!Array.isArray(verifications) || verifications.length === 0) {
      errors.push(`visual_pivot_evidence.${timeframe || '<unknown>'}.ohlcv_verification must be a non-empty array`);
    } else {
      for (const verification of verifications) {
        if (!verification || typeof verification !== 'object') continue;
        const status = String(verification.status || '').toLowerCase();
        if (!allowedVerificationStatuses.has(status)) {
          errors.push(`visual_pivot_evidence.${timeframe || '<unknown>'}.ohlcv_verification.${verification.pivot_id || '<unknown>'} status must be one of ${[...allowedVerificationStatuses].join(', ')}: ${verification.status}`);
        }
        if (!String(verification.pivot_id || '').trim()) errors.push(`visual_pivot_evidence.${timeframe || '<unknown>'}.ohlcv_verification item missing pivot_id`);
        if (!String(verification.evidence || '').trim()) errors.push(`visual_pivot_evidence.${timeframe || '<unknown>'}.ohlcv_verification.${verification.pivot_id || '<unknown>'} missing evidence`);
      }
    }
  }

  for (const timeframe of requiredTimeframes) {
    if (!seenTimeframes.has(timeframe)) errors.push(`visual_pivot_evidence missing required timeframe: ${timeframe}`);
  }
}

function validateChartModeProtocol(evidence, manifest, errors) {
  const protocol = manifest.chart_mode_protocol;
  if (!protocol) return;

  const path = protocol.path || 'chart_prep.chart_mode_checklist';
  const modes = getByPath(evidence, path);
  if (!Array.isArray(modes)) {
    errors.push(`${path} must be an array`);
    return;
  }

  const allowedStatuses = Array.isArray(protocol.allowed_statuses)
    ? protocol.allowed_statuses
    : (manifest.allowed?.[protocol.allowed_statuses] || ['pass', 'pass_with_fallback']);
  const allowed = new Set(allowedStatuses);
  const requiredModes = new Set(protocol.required_modes || []);
  const seenModes = new Set();

  for (const item of modes) {
    if (!item || typeof item !== 'object') {
      errors.push(`${path} item must be an object`);
      continue;
    }
    const mode = String(item.mode || item.id || '').trim();
    if (!mode) {
      errors.push(`${path} item missing mode`);
    } else {
      seenModes.add(mode);
    }
    const status = String(item.status || '').toLowerCase();
    if (!allowed.has(status)) {
      errors.push(`${path}.${mode || '<unknown>'} status must be one of ${[...allowed].join(', ')}: ${item.status}`);
    }
    if (!String(item.evidence || '').trim()) errors.push(`${path}.${mode || '<unknown>'} missing evidence`);

    if (mode === 'presentation') {
      if (item.pivot_scaffold_visible === true) {
        errors.push(`${path}.presentation pivot_scaffold_visible must not be true`);
      }
      if (!String(item.final_chart_state || '').trim()) {
        errors.push(`${path}.presentation missing final_chart_state`);
      }
    }
  }

  for (const mode of requiredModes) {
    if (!seenModes.has(mode)) errors.push(`${path} missing required mode: ${mode}`);
  }
}

function validateDrawingManifest(evidence, manifest, errors) {
  const drawings = getByPath(evidence, manifest.drawing_protocol?.path || 'chart_prep.drawing_manifest');
  if (!Array.isArray(drawings)) {
    errors.push(`${manifest.drawing_protocol?.path || 'chart_prep.drawing_manifest'} must be an array`);
    return;
  }
  indexById(drawings, manifest.drawing_protocol?.path || 'chart_prep.drawing_manifest', errors);
  const screenshotPaths = new Set(asArray(evidence.screenshots).map((screenshot) => String(screenshot?.path || '').replace(/\\/g, '/')).filter(Boolean));
  const forbiddenByRole = manifest.drawing_protocol?.forbidden_tools_by_role || {};
  const allowedByRole = manifest.drawing_protocol?.allowed_tools_by_role || {};
  const requiredRoles = new Set(manifest.drawing_protocol?.required_roles || []);
  const seenRoles = new Set();
  for (const drawing of drawings) {
    if (!drawing || typeof drawing !== 'object') continue;
    if (drawing.role) seenRoles.add(drawing.role);
    const role = drawing.role;
    const tool = drawing.tool;
    if (!role) errors.push(`drawing_manifest.${drawing.id || '<unknown>'} missing role`);
    if (!tool) errors.push(`drawing_manifest.${drawing.id || '<unknown>'} missing tool`);
    if (!String(drawing.screenshot || '').trim()) errors.push(`drawing_manifest.${drawing.id || role || '<unknown>'} missing screenshot`);
    const drawingScreenshot = String(drawing.screenshot || '').replace(/\\/g, '/');
    if (drawingScreenshot && !screenshotPaths.has(drawingScreenshot)) {
      errors.push(`drawing_manifest.${drawing.id || role} screenshot not listed in screenshots: ${drawing.screenshot}`);
    }
    const forbidden = forbiddenByRole[role] || [];
    if (forbidden.includes(tool)) errors.push(`forbidden drawing tool for ${role}: ${tool}`);
    const allowed = allowedByRole[role];
    if (allowed && !allowed.includes(tool)) errors.push(`drawing_manifest.${drawing.id || role} must use one of ${allowed.join(', ')}: ${tool}`);
    if (!['macro', 'daily', 'execution', 'all'].includes(drawing.timeframe_owner)) {
      errors.push(`drawing_manifest.${drawing.id || role} has invalid timeframe_owner: ${drawing.timeframe_owner}`);
    }
  }
  for (const role of requiredRoles) {
    if (!seenRoles.has(role)) errors.push(`missing drawing role: ${role}`);
  }
}

function validateHewStructureContext(evidence, manifest, errors) {
  const protocol = manifest.hew_structure_context_protocol;
  if (!protocol) return;

  const path = protocol.path || 'hew_structure_context';
  const context = getByPath(evidence, path);
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    errors.push(`${path} must be an object`);
    return;
  }

  const drawings = asArray(getByPath(evidence, manifest.drawing_protocol?.path || 'chart_prep.drawing_manifest'));
  const drawingsById = new Map();
  for (const drawing of drawings) {
    if (drawing?.id) drawingsById.set(drawing.id, drawing);
  }

  const allowedStatuses = new Set(protocol.allowed_statuses || ['pass', 'pass_with_fallback']);
  for (const itemContract of protocol.required_items || []) {
    const id = itemContract.id;
    const item = context[id];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push(`${path}.${id} is required`);
      continue;
    }

    const status = String(item.status || '').toLowerCase();
    if (!allowedStatuses.has(status)) {
      errors.push(`${path}.${id}.status must be one of ${[...allowedStatuses].join(', ')}: ${item.status}`);
    }
    if (!String(item.evidence || '').trim()) errors.push(`${path}.${id} missing evidence`);

    const rawDrawingIds = item.drawing_ids ?? item.drawing_id;
    const drawingIds = Array.isArray(rawDrawingIds) ? rawDrawingIds : (rawDrawingIds ? [rawDrawingIds] : []);
    if (!drawingIds.length) {
      errors.push(`${path}.${id} missing drawing_id or drawing_ids`);
      continue;
    }

    const requiredRole = itemContract.required_drawing_role;
    let requiredRoleSeen = false;
    for (const drawingId of drawingIds) {
      const drawing = drawingsById.get(drawingId);
      if (!drawing) {
        errors.push(`${path}.${id} references missing drawing_manifest id: ${drawingId}`);
        continue;
      }
      if (requiredRole && drawing.role === requiredRole) requiredRoleSeen = true;
    }
    if (requiredRole && !requiredRoleSeen) {
      errors.push(`${path}.${id} must reference a drawing with role ${requiredRole}`);
    }

    if (itemContract.requires_conditionality) {
      const conditionality = String(item.conditionality || item.label || item.evidence || '').toLowerCase();
      if (!/conditional|projection|scenario/.test(conditionality)) {
        errors.push(`${path}.${id} must label the forward path as conditional/projection/scenario, not fact`);
      }
    }
  }
}

function validateActionRationale(evidence, manifest, errors) {
  const action = evidence.action_rationale;
  if (!action || typeof action !== 'object') {
    errors.push('missing top-level field: action_rationale');
    return;
  }
  for (const field of manifest.action_rationale_fields || []) {
    if (!String(action[field] || '').trim()) errors.push(`action_rationale.${field} is required`);
  }
}

function validateZoneProbabilities(evidence, manifest, errors) {
  if (!manifest.zone_probabilities) return;
  const zones = evidence.zone_probabilities;
  if (!Array.isArray(zones)) {
    errors.push('zone_probabilities must be an array');
    return;
  }
  const allowedTypes = new Set(manifest.zone_probabilities.allowed_zone_types || []);
  const requiredTypes = new Set(manifest.zone_probabilities.required_zone_types || []);
  const seenTypes = new Set();
  indexById(zones, 'zone_probabilities', errors);
  for (const zone of zones) {
    if (!zone || typeof zone !== 'object') continue;
    if (zone.zone_type) seenTypes.add(zone.zone_type);
    if (!allowedTypes.has(zone.zone_type)) errors.push(`zone_probabilities.${zone.id || '<unknown>'} invalid zone_type: ${zone.zone_type}`);
    for (const field of ['price_range', 'probability', 'evidence', 'invalidation', 'upgrade_trigger', 'downgrade_trigger']) {
      if (!hasOwn(zone, field) || (typeof zone[field] === 'string' && !zone[field].trim())) {
        errors.push(`zone_probabilities.${zone.id || '<unknown>'} missing ${field}`);
      }
    }
    if (typeof zone.probability?.value !== 'number') errors.push(`zone_probabilities.${zone.id || '<unknown>'}.probability.value must be a number`);
    if (typeof zone.probability?.value === 'number' && (zone.probability.value < 0 || zone.probability.value > 100)) {
      errors.push(`zone_probabilities.${zone.id || '<unknown>'}.probability.value must be between 0 and 100: ${zone.probability.value}`);
    }
    if (!zone.probability?.band) errors.push(`zone_probabilities.${zone.id || '<unknown>'}.probability.band is required`);
    const low = zone.price_range?.low;
    const high = zone.price_range?.high;
    if (typeof low !== 'number' || typeof high !== 'number') {
      errors.push(`zone_probabilities.${zone.id || '<unknown>'}.price_range.low/high must be numbers`);
    } else if (!(low < high)) {
      errors.push(`zone_probabilities.${zone.id || '<unknown>'}.price_range.low must be less than high`);
    }
  }
  for (const type of requiredTypes) {
    if (!seenTypes.has(type)) errors.push(`zone_probabilities missing required zone_type: ${type}`);
  }
}

function validateCriticReview(evidence, manifest, errors) {
  const critic = evidence.critic_review;
  if (!critic || typeof critic !== 'object') {
    errors.push('missing top-level field: critic_review');
    return;
  }
  const allowedVerdicts = new Set(manifest.critic_review?.allowed_final_verdicts || ['pass', 'pass_with_fixes']);
  const verdict = String(critic.final_verdict || '').toLowerCase();
  if (!allowedVerdicts.has(verdict)) errors.push(`critic_review.final_verdict must be one of ${[...allowedVerdicts].join(', ')}: ${critic.final_verdict}`);
  const allowedTimeframes = new Set(manifest.critic_review?.allowed_max_detail_timeframes || ['daily', 'weekly', 'monthly']);
  const maxTf = String(critic.max_detail_timeframe || '').toLowerCase();
  if (!allowedTimeframes.has(maxTf)) errors.push(`critic_review.max_detail_timeframe must be one of ${[...allowedTimeframes].join(', ')}: ${critic.max_detail_timeframe}`);
  const checklist = indexById(critic.checklist, 'critic_review.checklist', errors);
  const allowedStatuses = new Set(manifest.critic_review?.allowed_checklist_statuses || ['pass', 'pass_with_fixes', 'not_applicable']);
  for (const id of manifest.critic_review?.required_checklist_ids || []) {
    const item = checklist.get(id);
    if (!item) {
      errors.push(`critic_review.checklist missing required id: ${id}`);
      continue;
    }
    const status = String(item.status || '').toLowerCase();
    if (!allowedStatuses.has(status)) errors.push(`critic_review.checklist.${id} status must be one of ${[...allowedStatuses].join(', ')}: ${item.status}`);
    if (!String(item.evidence || '').trim()) errors.push(`critic_review.checklist.${id} missing evidence`);
  }
  const blockingChecklistIds = new Set(manifest.critic_review?.blocking_checklist_ids || []);
  for (const id of blockingChecklistIds) {
    const item = checklist.get(id);
    if (!item) continue;
    const status = String(item.status || '').toLowerCase();
    if (status !== 'pass') {
      errors.push(`critic_review.checklist.${id} is blocking and must be pass: ${item.status}`);
    }
  }
  for (const finding of asArray(critic.findings)) {
    const severity = String(finding.severity || '').toLowerCase();
    const status = String(finding.status || '').toLowerCase();
    if (['high', 'critical'].includes(severity) && !['resolved', 'not_applicable'].includes(status)) {
      errors.push(`critic_review unresolved ${severity} finding: ${finding.id || '<unknown>'}`);
    }
  }
}

function validateJournalAlignment(evidence, file, errors, warnings) {
  const journalPath = join(dirname(file), 'journal.md');
  if (!existsSync(journalPath)) {
    errors.push(`journal.md missing next to evidence.json: ${journalPath}`);
    return;
  }
  const journal = readFileSync(journalPath, 'utf8');
  for (const screenshot of asArray(evidence.screenshots)) {
    if (screenshot?.path && !journal.includes(String(screenshot.path).replace(/\\/g, '/'))) {
      warnings.push(`journal.md does not reference screenshot path: ${screenshot.path}`);
    }
  }
}

export function validateEvidenceFile(file, options = {}) {
  const errors = [];
  const warnings = [];
  const absoluteFile = resolve(file);
  const evidence = parseJson(absoluteFile, errors);
  if (!evidence) return { file: absoluteFile, strategy: options.strategy || null, errors, warnings };
  const strategy = options.strategy || inferStrategy(evidence);
  if (!strategy) {
    errors.push(`cannot infer strategy from method/workflow_version/journal_id: ${evidence.method || ''}`);
    return { file: absoluteFile, strategy: null, errors, warnings };
  }
  const manifest = loadManifest(strategy, errors);
  if (!manifest) return { file: absoluteFile, strategy, errors, warnings };

  validateTopLevel(evidence, manifest, errors);
  validateContractVersion(evidence, manifest, errors);
  validateStageGates(evidence, manifest, errors);
  validateIdCollections(evidence, manifest, errors);
  validateScreenshots(evidence, manifest, absoluteFile, errors);
  validateVisualPivotEvidence(evidence, manifest, errors);
  validateChartModeProtocol(evidence, manifest, errors);
  validateDrawingManifest(evidence, manifest, errors);
  validateHewStructureContext(evidence, manifest, errors);
  validateZoneProbabilities(evidence, manifest, errors);
  validateActionRationale(evidence, manifest, errors);
  validateCriticReview(evidence, manifest, errors);
  validateJournalAlignment(evidence, absoluteFile, errors, warnings);

  return { file: absoluteFile, strategy, errors, warnings };
}

function discoverEvidenceFiles(strategy) {
  const base = resolve(repoRoot, 'analysis_journal');
  if (!existsSync(base)) return [];
  const suffix = `_${strategy}`;
  return readdirSync(base, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.endsWith(suffix))
    .map((entry) => join(base, entry.name, 'evidence.json'))
    .filter((file) => existsSync(file))
    .sort();
}

function parseArgs(argv) {
  const args = [...argv];
  let strategy = null;
  const files = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') return { help: true, strategy, files };
    if (arg === '--strategy') {
      strategy = args[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith('--strategy=')) {
      strategy = arg.slice('--strategy='.length);
      continue;
    }
    if (arg.startsWith('--')) continue;
    files.push(arg);
  }
  return { help: false, strategy, files };
}

function printHelp() {
  console.log(`Usage: node scripts/validate_evidence.mjs [--strategy hew|wyckoff] [evidence.json ...]\n\nIf no files are provided, validates analysis_journal/*_<strategy>/evidence.json.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { help, strategy, files } = parseArgs(process.argv.slice(2));
  if (help) {
    printHelp();
    process.exit(0);
  }
  const activeStrategy = strategy || 'wyckoff';
  const inputFiles = files.length ? files.map((file) => resolve(file)) : discoverEvidenceFiles(activeStrategy);
  if (!inputFiles.length) {
    console.error(`No evidence files found for strategy ${activeStrategy}.`);
    process.exit(1);
  }
  const results = inputFiles.map((file) => validateEvidenceFile(file, { strategy }));
  let errorCount = 0;
  let warningCount = 0;
  for (const result of results) {
    errorCount += result.errors.length;
    warningCount += result.warnings.length;
    const label = result.errors.length ? 'FAIL' : 'PASS';
    console.log(`${label} ${result.file}`);
    for (const warning of result.warnings) console.log(`  WARN ${warning}`);
    for (const error of result.errors) console.log(`  ERROR ${error}`);
  }
  console.log(`${results.length} evidence file(s) validated (${errorCount} error(s), ${warningCount} warning(s)).`);
  process.exit(errorCount ? 1 : 0);
}

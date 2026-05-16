#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  KONSILI_PIVOT_EXPORTER,
  parsePivotExporterRows
} from './pivot_engine.mjs';
import { scoreHewHypothesis } from './ratio_engine.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SUPPORTED_STRATEGY = 'hew';

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

function sha256File(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
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
  if (/\bhew\b|harmonic elliott|elliott|wave count|ian copsey|fractal forecasting/.test(method)) return 'hew';
  return null;
}

function loadManifest(strategy, errors) {
  if (strategy !== SUPPORTED_STRATEGY) {
    errors.push(`unsupported strategy: ${strategy}. Only Ian Copsey Fractal Forecasting (strategy id: hew) validation is supported.`);
    return null;
  }
  const file = resolve(repoRoot, 'strategies', strategy, 'manifest.json');
  const manifest = parseJson(file, errors);
  if (!manifest) return null;
  validateManifest(manifest, file, errors);
  return manifest;
}

function validateManifest(manifest, file, errors) {
  const required = ['strategy_id', 'display_name', 'contract_version', 'required_top_level', 'stage_gates', 'action_rationale_fields', 'critic_review', 'copsey_ratio_universe'];
  for (const key of required) {
    if (!hasOwn(manifest, key)) errors.push(`manifest ${file} missing ${key}`);
  }
  if (!Array.isArray(manifest.required_top_level)) errors.push(`manifest ${file} required_top_level must be an array`);
  if (!Array.isArray(manifest.stage_gates)) errors.push(`manifest ${file} stage_gates must be an array`);
  if (!manifest.allowed || typeof manifest.allowed !== 'object') errors.push(`manifest ${file} missing allowed object`);
}

function sortedStrings(values) {
  return [...new Set(asArray(values).map((value) => String(value)).filter(Boolean))].sort();
}

function normalizedToken(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function normalizedSet(values) {
  return new Set(asArray(values).map((value) => normalizedToken(value)).filter(Boolean));
}

function measurementType(measurement) {
  return measurement?.type || measurement?.kind;
}

function measurementMatchesSpec(measurement, spec) {
  if (!measurement || typeof measurement !== 'object') return false;
  const type = measurementType(measurement);
  if (spec.type && type !== spec.type) return false;
  if (!spec.role) return true;
  const expectedRole = normalizedToken(spec.role);
  const explicitRole = normalizedToken(measurement.role || measurement.measurement_role);
  const id = normalizedToken(measurement.id);
  return explicitRole === expectedRole || id === expectedRole || id.includes(expectedRole);
}

function hypothesisClaimsCompletedImpulse(hypothesis, protocol) {
  const completedTypes = normalizedSet(protocol.completed_impulse_structure_types || []);
  const structureType = normalizedToken(hypothesis.structure_type);
  const legacyCompletedImpulseClaim = /completed.*impulse|impulse.*completed/.test(structureType);
  return normalizedToken(hypothesis.selection_role) === 'primary' && (completedTypes.has(structureType) || legacyCompletedImpulseClaim);
}

function hypothesisClaimsWaveThreeComplete(hypothesis, protocol) {
  if (hypothesis.wave_iii_complete === true || hypothesis.wave3_complete === true) return true;
  if (hypothesisClaimsCompletedImpulse(hypothesis, protocol)) return true;
  const waveThreeCompleteTypes = normalizedSet(protocol.wave_iii_complete_structure_types || protocol.completed_impulse_structure_types || []);
  return waveThreeCompleteTypes.has(normalizedToken(hypothesis.structure_type));
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

function validatePackageArtifacts(evidence, manifest, file, errors) {
  const protocol = manifest.package_artifacts_protocol;
  if (!protocol) return;

  const packageDir = dirname(file);
  for (const relative of protocol.required_top_level_files || []) {
    const absolute = resolve(packageDir, relative);
    if (!existsSync(absolute)) errors.push(`package artifact missing: ${relative}`);
  }
  for (const relative of protocol.required_directories || []) {
    const absolute = resolve(packageDir, relative);
    if (!existsSync(absolute)) errors.push(`package directory missing: ${relative}`);
  }

  const rawArtifacts = getByPath(evidence, protocol.raw_artifacts_path || 'raw_artifacts');
  if (!rawArtifacts || typeof rawArtifacts !== 'object' || Array.isArray(rawArtifacts)) {
    errors.push('raw_artifacts must be an object');
    return;
  }
  const files = asArray(rawArtifacts.files);
  if (!files.length) errors.push('raw_artifacts.files must be a non-empty array');
  const byPath = new Map();
  const byRole = new Map();
  for (const artifact of files) {
    if (!artifact || typeof artifact !== 'object') continue;
    const rawPath = String(artifact.path || '').replace(/\\/g, '/');
    const role = String(artifact.role || '').trim();
    if (!rawPath) errors.push('raw_artifacts.files item missing path');
    if (!role) errors.push(`raw_artifacts.files.${rawPath || '<unknown>'} missing role`);
    if (!String(artifact.sha256 || '').trim()) errors.push(`raw_artifacts.files.${rawPath || '<unknown>'} missing sha256`);
    if (rawPath) byPath.set(rawPath, artifact);
    if (role) byRole.set(role, artifact);
    if (rawPath && !rawPath.startsWith('raw/')) {
      errors.push(`raw artifact path must be package-relative under raw/: ${rawPath}`);
      continue;
    }
    if (rawPath) {
      const absolute = resolve(packageDir, rawPath);
      const rawDir = resolve(packageDir, 'raw');
      const rawPrefix = rawDir.endsWith(sep) ? rawDir : `${rawDir}${sep}`;
      if (!(absolute === rawDir || absolute.startsWith(rawPrefix))) {
        errors.push(`raw artifact path escapes package: ${rawPath}`);
        continue;
      }
      if (!existsSync(absolute)) {
        errors.push(`raw artifact file is missing: ${rawPath}`);
      } else if (artifact.sha256 && sha256File(absolute) !== artifact.sha256) {
        errors.push(`raw_artifacts.files.${rawPath} sha256 does not match file contents`);
      }
    }
  }
  for (const role of protocol.required_raw_roles || []) {
    if (!byRole.has(role)) errors.push(`raw_artifacts missing required role: ${role}`);
  }
  for (const rawPath of protocol.required_raw_files || []) {
    if (!existsSync(resolve(packageDir, rawPath))) errors.push(`required raw file missing: ${rawPath}`);
  }

  const hashesPath = resolve(packageDir, protocol.hashes_path || 'raw/hashes.json');
  if (existsSync(hashesPath)) {
    const hashErrors = [];
    const hashes = parseJson(hashesPath, hashErrors);
    for (const error of hashErrors) errors.push(error);
    const fileHashes = hashes?.files || hashes;
    if (fileHashes && typeof fileHashes === 'object' && !Array.isArray(fileHashes)) {
      for (const [rawPath, expectedHash] of Object.entries(fileHashes)) {
        const normalized = String(rawPath).replace(/\\/g, '/');
        const absolute = resolve(packageDir, normalized);
        if (!existsSync(absolute)) {
          errors.push(`raw/hashes.json references missing file: ${normalized}`);
          continue;
        }
        if (sha256File(absolute) !== expectedHash) errors.push(`raw/hashes.json hash mismatch for ${normalized}`);
        const artifact = byPath.get(normalized);
        if (artifact && artifact.sha256 !== expectedHash) {
          errors.push(`raw_artifacts/files hash disagrees with raw/hashes.json for ${normalized}`);
        }
      }
    } else {
      errors.push('raw/hashes.json must contain a file hash object');
    }
  }
}

function finiteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validatePivotExporterParameterProfile(pivotEvidence, protocol, required, errors) {
  const profiles = protocol.instrument_parameter_profiles || {};
  if (!Object.keys(profiles).length) return required;

  const exporter = pivotEvidence.exporter || {};
  const instrumentClass = String(exporter.instrument_class || '').trim();
  if (!instrumentClass) {
    errors.push('visual_pivot_evidence.exporter.instrument_class is required for pinned Konsili Pivot Exporter parameters');
    return { ...required, parameter_profile: null };
  }

  const profile = profiles[instrumentClass];
  if (!profile) {
    errors.push(`visual_pivot_evidence.exporter.instrument_class must be one of ${Object.keys(profiles).join(', ')}: ${instrumentClass}`);
    return { ...required, parameter_profile: null };
  }

  const checks = [
    ['left_bars', 'left'],
    ['right_bars', 'right'],
    ['max_rows', 'max_rows']
  ];
  for (const [field, profileField] of checks) {
    const actual = finiteNumber(exporter[field]);
    const expected = finiteNumber(profile[profileField]);
    if (expected == null) continue;
    if (actual == null) {
      errors.push(`visual_pivot_evidence.exporter.${field} is required for ${instrumentClass} profile`);
    } else if (actual !== expected) {
      errors.push(`visual_pivot_evidence.exporter.${field} must match ${instrumentClass} profile ${expected}: ${actual}`);
    }
  }

  return { ...required, parameter_profile: profile, instrument_class: instrumentClass };
}

function validateRequiredPivotExporter(pivotEvidence, protocol, errors) {
  const required = protocol.required_exporter;
  if (!required) return null;

  const exporter = pivotEvidence.exporter;
  if (!exporter || typeof exporter !== 'object' || Array.isArray(exporter)) {
    errors.push('visual_pivot_evidence.exporter is required by the HEW pivot exporter contract');
    return required;
  }

  const expectedName = required.name || KONSILI_PIVOT_EXPORTER.name;
  const expectedVersion = Number(required.version ?? KONSILI_PIVOT_EXPORTER.version);
  const expectedStudyFilter = required.study_filter || KONSILI_PIVOT_EXPORTER.studyFilter;
  const expectedScript = required.pine_script || KONSILI_PIVOT_EXPORTER.pineScript;
  const expectedPrefix = required.row_prefix || KONSILI_PIVOT_EXPORTER.rowPrefix;

  if (exporter.name !== expectedName) errors.push(`visual_pivot_evidence.exporter.name must be ${expectedName}: ${exporter.name}`);
  if (Number(exporter.version) !== expectedVersion) errors.push(`visual_pivot_evidence.exporter.version must be ${expectedVersion}: ${exporter.version}`);
  if (exporter.study_filter !== expectedStudyFilter) errors.push(`visual_pivot_evidence.exporter.study_filter must be ${expectedStudyFilter}: ${exporter.study_filter}`);
  if (exporter.pine_script !== expectedScript) errors.push(`visual_pivot_evidence.exporter.pine_script must be ${expectedScript}: ${exporter.pine_script}`);
  if (exporter.row_prefix !== expectedPrefix) errors.push(`visual_pivot_evidence.exporter.row_prefix must be ${expectedPrefix}: ${exporter.row_prefix}`);

  const sourceTools = asArray(exporter.source_tools).map((tool) => String(tool));
  const allowedTools = new Set(required.allowed_source_tools || KONSILI_PIVOT_EXPORTER.sourceTools);
  if (!sourceTools.length) {
    errors.push('visual_pivot_evidence.exporter.source_tools must name the TradingView MCP read used');
  } else if (!sourceTools.some((tool) => allowedTools.has(tool))) {
    errors.push(`visual_pivot_evidence.exporter.source_tools must include one of ${[...allowedTools].join(', ')}: ${sourceTools.join(', ')}`);
  }

  if (pivotEvidence.indicator_name !== expectedName) {
    errors.push(`visual_pivot_evidence.indicator_name must be ${expectedName}: ${pivotEvidence.indicator_name}`);
  }
  if (pivotEvidence.study_filter !== expectedStudyFilter) {
    errors.push(`visual_pivot_evidence.study_filter must be ${expectedStudyFilter}: ${pivotEvidence.study_filter}`);
  }

  return validatePivotExporterParameterProfile(pivotEvidence, protocol, required, errors);
}

function validateTimeframePivotExporterRows(item, timeframe, requiredExporter, errors) {
  if (!requiredExporter) return new Map();

  const rows = item.exporter_rows;
  const itemPath = `visual_pivot_evidence.${timeframe || '<unknown>'}`;
  if (!Array.isArray(rows) || rows.length === 0) {
    errors.push(`${itemPath}.exporter_rows must be a non-empty array from Konsili Pivot Exporter`);
    return new Map();
  }

  const parsed = parsePivotExporterRows(rows, {
    rowPrefix: requiredExporter.row_prefix,
    version: requiredExporter.version
  });
  for (const error of parsed.errors) errors.push(`${itemPath}.exporter_rows ${error}`);

  const rowsById = new Map(parsed.pivots.map((pivot) => [pivot.id, pivot]));
  const matchingRows = parsed.pivots.filter((pivot) => pivot.timeframe === timeframe);
  if (!matchingRows.length) {
    errors.push(`${itemPath}.exporter_rows must include at least one ${timeframe} KPE row`);
  }

  const profile = requiredExporter.parameter_profile;
  if (profile) {
    for (const row of parsed.pivots) {
      if (finiteNumber(profile.left) != null && row.left !== finiteNumber(profile.left)) {
        errors.push(`${itemPath}.exporter_rows.${row.id} left must match ${requiredExporter.instrument_class} profile ${profile.left}: ${row.left}`);
      }
      if (finiteNumber(profile.right) != null && row.right !== finiteNumber(profile.right)) {
        errors.push(`${itemPath}.exporter_rows.${row.id} right must match ${requiredExporter.instrument_class} profile ${profile.right}: ${row.right}`);
      }
    }
  }

  return rowsById;
}

function validatePivotMatchesExporterRow(pivot, exporterRow, path, requiredExporter, errors) {
  const tolerance = Number(requiredExporter.price_tolerance_abs ?? 0.000001);
  const requiredFields = new Set(requiredExporter.required_pivot_fields || ['date', 'time', 'price', 'exporter_row_id']);

  if (requiredFields.has('date') && !String(pivot.date || '').trim()) errors.push(`${path}.date is required from exporter row`);
  if (requiredFields.has('time') && typeof pivot.time !== 'number') errors.push(`${path}.time must be the exporter row timestamp number`);
  if (requiredFields.has('price') && typeof pivot.price !== 'number') errors.push(`${path}.price must be the exporter row price number`);
  if (!exporterRow) return;

  if (pivot.type && pivot.type !== exporterRow.type) errors.push(`${path}.type must match exporter row ${exporterRow.id}: ${exporterRow.type}`);
  if (String(pivot.date || '') !== exporterRow.date) errors.push(`${path}.date must match exporter row ${exporterRow.id}: ${exporterRow.date}`);
  if (typeof pivot.time === 'number' && pivot.time !== exporterRow.time) errors.push(`${path}.time must match exporter row ${exporterRow.id}: ${exporterRow.time}`);
  if (typeof pivot.price === 'number' && Math.abs(pivot.price - exporterRow.price) > tolerance) {
    errors.push(`${path}.price must match exporter row ${exporterRow.id}: ${exporterRow.price}`);
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

  const requiredExporter = validateRequiredPivotExporter(pivotEvidence, protocol, errors);
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
    const exporterRowsById = validateTimeframePivotExporterRows(item, timeframe, requiredExporter, errors);

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
        if (requiredExporter) {
          const exporterRowId = String(pivot.exporter_row_id || '').trim();
          if (!exporterRowId) {
            errors.push(`visual_pivot_evidence.${timeframe || '<unknown>'}.pivots.${pivot.id || '<unknown>'} missing exporter_row_id`);
          } else if (!exporterRowsById.has(exporterRowId)) {
            errors.push(`visual_pivot_evidence.${timeframe || '<unknown>'}.pivots.${pivot.id || '<unknown>'} exporter_row_id not found in exporter_rows: ${exporterRowId}`);
          } else {
            validatePivotMatchesExporterRow(
              pivot,
              exporterRowsById.get(exporterRowId),
              `visual_pivot_evidence.${timeframe || '<unknown>'}.pivots.${pivot.id || '<unknown>'}`,
              requiredExporter,
              errors
            );
          }
        }
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

function validateIanCopseyWaveMap(evidence, manifest, errors) {
  const protocol = manifest.ian_copsey_wave_map_protocol;
  if (!protocol) return;

  const path = protocol.path || 'ian_copsey_wave_map';
  const waveMap = getByPath(evidence, path);
  if (!waveMap || typeof waveMap !== 'object' || Array.isArray(waveMap)) {
    errors.push(`${path} must be an object`);
    return;
  }

  if (waveMap.count_selection_authority !== protocol.required_authority) {
    errors.push(`${path}.count_selection_authority must be ${protocol.required_authority}: ${waveMap.count_selection_authority}`);
  }
  if (waveMap.mechanical_tool_boundary !== protocol.required_mechanical_boundary) {
    errors.push(`${path}.mechanical_tool_boundary must be ${protocol.required_mechanical_boundary}: ${waveMap.mechanical_tool_boundary}`);
  }
  if (waveMap.scanner_used_for_count_selection !== false) {
    errors.push(`${path}.scanner_used_for_count_selection must be false`);
  }
  if (!String(waveMap.selection_method || '').trim()) {
    errors.push(`${path}.selection_method is required`);
  }
  const source = String(waveMap.book_alignment_source || '').toLowerCase();
  if (!source.includes('fractal forecasting') || !source.includes('ian copsey')) {
    errors.push(`${path}.book_alignment_source must reference Fractal Forecasting and Ian Copsey`);
  }

  const forbiddenPattern = new RegExp((protocol.forbidden_count_authority_terms || []).map((term) => (
    String(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  )).join('|'), 'i');
  const serialized = JSON.stringify(waveMap);
  if (forbiddenPattern.source !== '(?:)' && forbiddenPattern.test(serialized)) {
    errors.push(`${path} must not use scanner/mechanical language as count-selection authority`);
  }

  const drawings = asArray(getByPath(evidence, manifest.drawing_protocol?.path || 'chart_prep.drawing_manifest'));
  const drawingsById = new Map();
  for (const drawing of drawings) {
    if (drawing?.id) drawingsById.set(drawing.id, drawing);
  }
  const ratioValidation = indexById(evidence.ratio_validation, 'ratio_validation', errors);

  const counts = asArray(waveMap.counts);
  if (!counts.length) {
    errors.push(`${path}.counts must be a non-empty array`);
  }
  const countsByRole = new Map();
  for (const count of counts) {
    if (!count || typeof count !== 'object') continue;
    const countPath = `${path}.counts.${count.id || '<unknown>'}`;
    if (!String(count.id || '').trim()) errors.push(`${countPath} missing id`);
    if (!String(count.role || '').trim()) errors.push(`${countPath} missing role`);
    if (count.role && !countsByRole.has(count.role)) countsByRole.set(count.role, count);
    if (!Array.isArray(count.pivots) || count.pivots.length < 4) errors.push(`${countPath}.pivots must contain at least 4 prices`);
    if (!String(count.copsey_rationale || count.structural_rationale || '').trim()) errors.push(`${countPath}.copsey_rationale is required`);
    validateReferencedDrawings(count, countPath, drawingsById, errors);
    if (!String(count.ratio_validation_id || '').trim()) {
      errors.push(`${countPath}.ratio_validation_id is required`);
    } else if (!ratioValidation.has(count.ratio_validation_id)) {
      errors.push(`${countPath} references missing ratio_validation id: ${count.ratio_validation_id}`);
    }
  }

  for (const role of protocol.required_count_roles || []) {
    if (!countsByRole.has(role)) errors.push(`${path}.counts missing required role: ${role}`);
  }

  const calculations = asArray(waveMap.ratio_calculations);
  if (!calculations.length) errors.push(`${path}.ratio_calculations must be a non-empty array`);
  for (const calculation of calculations) {
    if (!calculation || typeof calculation !== 'object') continue;
    const calcPath = `${path}.ratio_calculations.${calculation.id || '<unknown>'}`;
    if (!String(calculation.id || '').trim()) errors.push(`${calcPath} missing id`);
    if (!String(calculation.formula || '').trim()) errors.push(`${calcPath}.formula is required`);
    if (typeof calculation.actual_ratio !== 'number') errors.push(`${calcPath}.actual_ratio must be a number`);
    if (!String(calculation.interpretation || '').trim()) errors.push(`${calcPath}.interpretation is required`);
  }

  const alignment = asArray(waveMap.fractal_forecasting_alignment);
  if (!alignment.length) errors.push(`${path}.fractal_forecasting_alignment must be a non-empty array`);
  const alignmentById = indexById(alignment, `${path}.fractal_forecasting_alignment`, errors);
  for (const principle of protocol.required_alignment_principles || []) {
    if (!alignmentById.has(principle)) errors.push(`${path}.fractal_forecasting_alignment missing required principle: ${principle}`);
  }
  for (const item of alignment) {
    if (!item || typeof item !== 'object') continue;
    const itemPath = `${path}.fractal_forecasting_alignment.${item.id || '<unknown>'}`;
    if (!String(item.status || '').trim()) errors.push(`${itemPath}.status is required`);
    if (!String(item.evidence || '').trim()) errors.push(`${itemPath}.evidence is required`);
  }
}

function pivotSignature(hypothesis) {
  return asArray(hypothesis?.pivots).map((pivot) => {
    if (!pivot || typeof pivot !== 'object') return '<invalid>';
    const price = typeof pivot.price === 'number' && Number.isFinite(pivot.price) ? pivot.price.toFixed(6) : '<no-price>';
    return `${pivot.id || '<no-id>'}:${price}`;
  }).join('|');
}

function validateHypothesisDistinctness(hypotheses, path, protocol, errors) {
  const distinctness = protocol.structural_distinctness || {};
  if (distinctness.required !== true) return;

  const primaryRoles = new Set(distinctness.primary_roles || ['primary']);
  const alternateRoles = new Set(distinctness.alternate_roles || ['alternate']);
  const primaries = hypotheses.filter((hypothesis) => primaryRoles.has(normalizedToken(hypothesis?.selection_role)));
  const alternates = hypotheses.filter((hypothesis) => alternateRoles.has(normalizedToken(hypothesis?.selection_role)));

  if (!primaries.length) errors.push(`${path} must include a primary hypothesis for structural distinctness checks`);
  if (!alternates.length) errors.push(`${path} must include at least one alternate hypothesis for structural distinctness checks`);

  for (const primary of primaries) {
    const primarySignature = pivotSignature(primary);
    for (const alternate of alternates) {
      const alternateSignature = pivotSignature(alternate);
      if (primarySignature && primarySignature === alternateSignature) {
        errors.push(`${path}.${alternate.id || '<unknown>'} must be structurally distinct from primary ${primary.id || '<unknown>'}; pivot path is identical`);
      }
    }
  }
}

function validateHypotheses(evidence, manifest, errors) {
  const protocol = manifest.hypothesis_protocol;
  if (!protocol) return;

  const path = protocol.path || 'hypotheses';
  const hypotheses = getByPath(evidence, path);
  if (!Array.isArray(hypotheses)) {
    errors.push(`${path} must be an array`);
    return;
  }

  const minCount = Number(protocol.min_count || 1);
  if (hypotheses.length < minCount) errors.push(`${path} must contain at least ${minCount} hypothesis`);
  if (protocol.enforce_recommended_count && protocol.recommended_count_range) {
    const recommendedMin = Number(protocol.recommended_count_range.min);
    const recommendedMax = Number(protocol.recommended_count_range.max);
    if (Number.isFinite(recommendedMin) && hypotheses.length < recommendedMin) {
      errors.push(`${path} should contain ${recommendedMin}-${recommendedMax} hypotheses: ${hypotheses.length}`);
    }
    if (Number.isFinite(recommendedMax) && hypotheses.length > recommendedMax) {
      errors.push(`${path} should contain ${recommendedMin}-${recommendedMax} hypotheses: ${hypotheses.length}`);
    }
  }

  indexById(hypotheses, path, errors);
  const allowedRoles = new Set(protocol.allowed_selection_roles || []);
  const allowedStatuses = new Set(protocol.allowed_engine_statuses || ['pass', 'pass_with_warnings', 'fail']);
  const requiredEngineFields = new Set(protocol.required_engine_result_fields || []);
  const allowedLifecycles = normalizedSet(protocol.allowed_lifecycles || []);
  const allowedClassifications = normalizedSet(protocol.allowed_engine_classifications || []);
  const allowedDirections = normalizedSet(protocol.allowed_directions || []);
  const allowedStructureTypes = normalizedSet(protocol.allowed_structure_types || []);
  const minimumMeasurementTypes = new Set(protocol.minimum_measurement_types || []);
  const completedImpulseRequiredMeasurementTypes = new Set(protocol.required_measurement_types || []);
  const waveThreeCompleteRequiredMeasurementTypes = new Set(protocol.wave_iii_complete_required_measurement_types || []);

  for (const hypothesis of hypotheses) {
    if (!hypothesis || typeof hypothesis !== 'object' || Array.isArray(hypothesis)) {
      errors.push(`${path} item must be an object`);
      continue;
    }

    const hypothesisPath = `${path}.${hypothesis.id || '<unknown>'}`;
    if (!String(hypothesis.id || '').trim()) errors.push(`${hypothesisPath} missing id`);
    if (!String(hypothesis.selection_role || '').trim()) {
      errors.push(`${hypothesisPath}.selection_role is required`);
    } else if (allowedRoles.size && !allowedRoles.has(hypothesis.selection_role)) {
      errors.push(`${hypothesisPath}.selection_role must be one of ${[...allowedRoles].join(', ')}: ${hypothesis.selection_role}`);
    }
    const direction = normalizedToken(hypothesis.direction);
    if (!direction) {
      errors.push(`${hypothesisPath}.direction is required`);
    } else if (allowedDirections.size && !allowedDirections.has(direction)) {
      errors.push(`${hypothesisPath}.direction must be one of ${[...allowedDirections].join(', ')}: ${hypothesis.direction}`);
    }
    const structureType = normalizedToken(hypothesis.structure_type);
    if (!structureType) {
      errors.push(`${hypothesisPath}.structure_type is required`);
    } else if (allowedStructureTypes.size && !allowedStructureTypes.has(structureType)) {
      errors.push(`${hypothesisPath}.structure_type must be one of ${[...allowedStructureTypes].join(', ')}: ${hypothesis.structure_type}`);
    }
    const explicitLifecycle = normalizedToken(hypothesis.lifecycle || hypothesis.count_lifecycle || hypothesis.wave_lifecycle);
    if (explicitLifecycle && allowedLifecycles.size && !allowedLifecycles.has(explicitLifecycle)) {
      errors.push(`${hypothesisPath}.lifecycle must be one of ${[...allowedLifecycles].join(', ')}: ${hypothesis.lifecycle || hypothesis.count_lifecycle || hypothesis.wave_lifecycle}`);
    }

    if (!Array.isArray(hypothesis.pivots) || hypothesis.pivots.length < 4) {
      errors.push(`${hypothesisPath}.pivots must contain at least 4 pivot points`);
    } else {
      indexById(hypothesis.pivots, `${hypothesisPath}.pivots`, errors);
      for (const pivot of hypothesis.pivots) {
        if (!pivot || typeof pivot !== 'object') continue;
        if (typeof pivot.price !== 'number' || !Number.isFinite(pivot.price)) {
          errors.push(`${hypothesisPath}.pivots.${pivot.id || '<unknown>'}.price must be a finite number`);
        }
      }
    }

    if (!Array.isArray(hypothesis.measurements) || hypothesis.measurements.length === 0) {
      errors.push(`${hypothesisPath}.measurements must be a non-empty array`);
    } else {
      indexById(hypothesis.measurements, `${hypothesisPath}.measurements`, errors);
      const measurementTypes = new Set();
      for (const measurement of hypothesis.measurements) {
        if (!measurement || typeof measurement !== 'object') continue;
        const type = measurement.type || measurement.kind;
        if (!String(type || '').trim()) {
          errors.push(`${hypothesisPath}.measurements.${measurement.id || '<unknown>'}.type is required`);
        } else {
          measurementTypes.add(type);
        }
      }
      const requiredMeasurementTypes = hypothesisClaimsCompletedImpulse(hypothesis, protocol)
        ? completedImpulseRequiredMeasurementTypes
        : minimumMeasurementTypes;
      for (const type of requiredMeasurementTypes) {
        if (!measurementTypes.has(type)) errors.push(`${hypothesisPath}.measurements missing required type: ${type}`);
      }
      if (hypothesisClaimsWaveThreeComplete(hypothesis, protocol)) {
        for (const type of waveThreeCompleteRequiredMeasurementTypes) {
          if (!measurementTypes.has(type)) errors.push(`${hypothesisPath}.measurements missing required Wave III complete type: ${type}`);
        }
      }
      if (hypothesisClaimsCompletedImpulse(hypothesis, protocol)) {
        for (const spec of asArray(protocol.completed_impulse_required_measurement_roles)) {
          if (!hypothesis.measurements.some((measurement) => measurementMatchesSpec(measurement, spec))) {
            const label = spec.role ? `${spec.type}:${spec.role}` : spec.type;
            errors.push(`${hypothesisPath}.measurements missing required completed-impulse measurement: ${label}`);
          }
        }
      }
    }

    const engine = hypothesis.engine_result;
    if (!engine || typeof engine !== 'object' || Array.isArray(engine)) {
      errors.push(`${hypothesisPath}.engine_result must be an object`);
      continue;
    }

    const computed = scoreHewHypothesis(hypothesis, manifest.copsey_ratio_universe);
    for (const field of requiredEngineFields) {
      if (!hasOwn(engine, field)) errors.push(`${hypothesisPath}.engine_result.${field} is required`);
    }
    if (!allowedStatuses.has(engine.status)) {
      errors.push(`${hypothesisPath}.engine_result.status must be one of ${[...allowedStatuses].join(', ')}: ${engine.status}`);
    }
    if (hasOwn(engine, 'lifecycle_status')) {
      const lifecycleStatus = normalizedToken(engine.lifecycle_status);
      if (allowedLifecycles.size && !allowedLifecycles.has(lifecycleStatus)) {
        errors.push(`${hypothesisPath}.engine_result.lifecycle_status must be one of ${[...allowedLifecycles].join(', ')}: ${engine.lifecycle_status}`);
      }
      if (engine.lifecycle_status !== computed.lifecycle_status) {
        errors.push(`${hypothesisPath}.engine_result.lifecycle_status must match recomputed ratio engine lifecycle ${computed.lifecycle_status}: ${engine.lifecycle_status}`);
      }
    }
    if (hasOwn(engine, 'classification')) {
      const classification = normalizedToken(engine.classification);
      if (allowedClassifications.size && !allowedClassifications.has(classification)) {
        errors.push(`${hypothesisPath}.engine_result.classification must be one of ${[...allowedClassifications].join(', ')}: ${engine.classification}`);
      }
      if (engine.classification !== computed.classification) {
        errors.push(`${hypothesisPath}.engine_result.classification must match recomputed ratio engine classification ${computed.classification}: ${engine.classification}`);
      }
    }
    if (engine.status !== computed.status) {
      errors.push(`${hypothesisPath}.engine_result.status must match recomputed ratio engine status ${computed.status}: ${engine.status}`);
    }
    if (typeof engine.score !== 'number' || !Number.isFinite(engine.score)) {
      errors.push(`${hypothesisPath}.engine_result.score must be a finite number`);
    } else if (Math.abs(engine.score - computed.score) > 0.01) {
      errors.push(`${hypothesisPath}.engine_result.score must match recomputed ratio engine score ${computed.score}: ${engine.score}`);
    }
    if (engine.hard_rule_pass !== computed.hard_rule_pass) {
      errors.push(`${hypothesisPath}.engine_result.hard_rule_pass must match recomputed ratio engine value ${computed.hard_rule_pass}: ${engine.hard_rule_pass}`);
    }
    const expectedViolationIds = sortedStrings(computed.violations.map((violationItem) => violationItem.id));
    const providedViolationIds = sortedStrings(engine.violation_ids ?? asArray(engine.violations).map((violationItem) => violationItem?.id));
    if (expectedViolationIds.join('|') !== providedViolationIds.join('|')) {
      errors.push(`${hypothesisPath}.engine_result.violation_ids must match recomputed ratio engine violations ${expectedViolationIds.join(', ') || '<none>'}: ${providedViolationIds.join(', ') || '<none>'}`);
    }
    if (normalizedToken(hypothesis.selection_role) === 'primary' && computed.status !== 'pass') {
      errors.push(`${hypothesisPath} primary hypothesis must pass deterministic Copsey ratio engine before selection: ${expectedViolationIds.join(', ') || computed.status}`);
    }
  }

  validateHypothesisDistinctness(hypotheses, path, protocol, errors);
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
  const scaffoldingVisibility = protocol.scaffolding_visibility || {};
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

    const visibilityContract = scaffoldingVisibility[mode];
    if (visibilityContract) {
      for (const [field, expected] of Object.entries(visibilityContract)) {
        if (field === 'audit_mode_allows_visible') continue;
        const auditOverride = item.audit_mode === true && visibilityContract.audit_mode_allows_visible === true;
        if (!auditOverride && item[field] !== expected) {
          errors.push(`${path}.${mode}.${field} must be ${expected}`);
        }
      }
    }

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

function collectVerifiedPivotMaps(evidence) {
  const pivots = new Map();
  const ohlcvChecks = new Map();
  for (const timeframe of asArray(evidence.visual_pivot_evidence?.timeframes)) {
    for (const pivot of asArray(timeframe?.pivots)) {
      if (pivot?.id) pivots.set(pivot.id, pivot);
    }
    for (const check of asArray(timeframe?.ohlcv_verification)) {
      if (check?.pivot_id) ohlcvChecks.set(check.pivot_id, check);
      if (check?.id) ohlcvChecks.set(check.id, check);
    }
  }
  return { pivots, ohlcvChecks };
}

function validateDrawingPointLocking(drawing, role, protocol, pivotMaps, errors) {
  const pointLocking = protocol?.point_locking;
  if (!pointLocking) return;
  const requiredRoles = new Set(pointLocking.required_for_roles || []);
  const isRequired = requiredRoles.has(role);
  const path = `drawing_manifest.${drawing.id || role || '<unknown>'}`;

  if (isRequired && (!Array.isArray(drawing.points) || drawing.points.length === 0)) {
    errors.push(`${path}.points must be a non-empty pivot-locked geometry array`);
    return;
  }
  if (Array.isArray(drawing.levels) && Array.isArray(drawing.points) && drawing.points.length) {
    const prices = drawing.points.map((point) => Number(point?.price)).filter(Number.isFinite);
    const levels = drawing.levels.map(Number).filter(Number.isFinite);
    if (prices.length === levels.length) {
      for (let index = 0; index < levels.length; index += 1) {
        if (Math.abs(prices[index] - levels[index]) > 0.000001) {
          errors.push(`${path}.levels[${index}] must match points[${index}].price`);
        }
      }
    }
  }

  for (const [index, point] of asArray(drawing.points).entries()) {
    if (!point || typeof point !== 'object') {
      errors.push(`${path}.points[${index}] must be an object`);
      continue;
    }
    const pointPath = `${path}.points.${point.label || index}`;
    if (typeof point.price !== 'number' || !Number.isFinite(point.price)) errors.push(`${pointPath}.price must be a finite number`);
    const status = normalizedToken(point.point_status || 'verified');
    if (status === 'projected') {
      for (const field of pointLocking.projection_required_fields || []) {
        if (field === 'source_pivots') {
          if (!Array.isArray(point.source_pivots) || !point.source_pivots.length) errors.push(`${pointPath}.source_pivots must be a non-empty array`);
        } else if (!String(point[field] || '').trim()) {
          errors.push(`${pointPath}.${field} is required for projected points`);
        }
      }
      continue;
    }
    for (const field of pointLocking.real_point_required_fields || []) {
      if (!String(point[field] || '').trim()) errors.push(`${pointPath}.${field} is required for verified points`);
    }
    if (point.pivot_id && !pivotMaps.pivots.has(point.pivot_id)) {
      errors.push(`${pointPath}.pivot_id not found in visual_pivot_evidence: ${point.pivot_id}`);
    }
    if (point.pivot_id && point.source_row_id) {
      const pivot = pivotMaps.pivots.get(point.pivot_id);
      if (pivot && pivot.exporter_row_id !== point.source_row_id) {
        errors.push(`${pointPath}.source_row_id must match pivot exporter_row_id ${pivot.exporter_row_id}: ${point.source_row_id}`);
      }
    }
    if (point.ohlcv_check_id && !pivotMaps.ohlcvChecks.has(point.ohlcv_check_id)) {
      errors.push(`${pointPath}.ohlcv_check_id not found in visual_pivot_evidence OHLCV checks: ${point.ohlcv_check_id}`);
    }
  }
}

function validateZoneBoundaryProvenance(zone, path, errors) {
  if (!isObject(zone.price_range)) return;
  const refs = zone.boundary_refs;
  if (!isObject(refs)) {
    errors.push(`${path}.boundary_refs is required to pivot-lock zone boundaries`);
    return;
  }
  for (const side of ['low', 'high']) {
    const ref = refs[side];
    if (!isObject(ref)) {
      errors.push(`${path}.boundary_refs.${side} is required`);
      continue;
    }
    const hasPivot = String(ref.pivot_id || '').trim();
    const hasProjection = String(ref.projection_formula_id || '').trim();
    if (!hasPivot && !hasProjection) {
      errors.push(`${path}.boundary_refs.${side} must reference pivot_id or projection_formula_id`);
    }
  }
}

function validateDrawingManifest(evidence, manifest, errors) {
  const drawings = getByPath(evidence, manifest.drawing_protocol?.path || 'chart_prep.drawing_manifest');
  if (!Array.isArray(drawings)) {
    errors.push(`${manifest.drawing_protocol?.path || 'chart_prep.drawing_manifest'} must be an array`);
    return;
  }
  indexById(drawings, manifest.drawing_protocol?.path || 'chart_prep.drawing_manifest', errors);
  const screenshots = asArray(evidence.screenshots);
  const screenshotPaths = new Set(screenshots.map((screenshot) => String(screenshot?.path || '').replace(/\\/g, '/')).filter(Boolean));
  const finalScreenshotRoles = normalizedSet(manifest.drawing_protocol?.final_screenshot_roles || ['macro_structure', 'trade_posture']);
  const finalScreenshotPaths = new Set(screenshots
    .filter((screenshot) => finalScreenshotRoles.has(normalizedToken(screenshot?.role)))
    .map((screenshot) => String(screenshot?.path || '').replace(/\\/g, '/'))
    .filter(Boolean));
  const forbiddenFinalDrawingTerms = asArray(manifest.drawing_protocol?.forbidden_final_drawing_terms).map(normalizedToken).filter(Boolean);
  const deprecatedFinalRoles = new Set(asArray(manifest.drawing_protocol?.deprecated_final_roles).map(normalizedToken).filter(Boolean));
  const hypotheses = asArray(getByPath(evidence, manifest.hypothesis_protocol?.path || 'hypotheses'));
  const hypothesesById = new Map(hypotheses.filter((hypothesis) => hypothesis?.id).map((hypothesis) => [hypothesis.id, hypothesis]));
  const computedHypotheses = new Map(hypotheses.map((hypothesis) => [hypothesis?.id, scoreHewHypothesis(hypothesis, manifest.copsey_ratio_universe)]));
  const forbiddenByRole = manifest.drawing_protocol?.forbidden_tools_by_role || {};
  const allowedByRole = manifest.drawing_protocol?.allowed_tools_by_role || {};
  const requiredRoles = new Set(manifest.drawing_protocol?.required_roles || []);
  const pivotMaps = collectVerifiedPivotMaps(evidence);
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
    const auditOnly = drawing.audit_only === true || drawing.presentation_allowed === false;
    const finalScreenshot = finalScreenshotPaths.has(drawingScreenshot);
    const drawingDescriptor = normalizedToken([
      drawing.id,
      drawing.role,
      drawing.label,
      drawing.source_context,
      drawing.status
    ].filter(Boolean).join(' '));
    if (forbiddenFinalDrawingTerms.some((term) => drawingDescriptor.includes(term)) && !auditOnly) {
      errors.push(`drawing_manifest.${drawing.id || role} appears to be rejected/diagnostic and must be audit_only or presentation_allowed=false`);
    }
    if (deprecatedFinalRoles.has(normalizedToken(role)) && !auditOnly) {
      errors.push(`drawing_manifest.${drawing.id || role} uses deprecated final role ${role}; use zone boxes or mark the drawing audit_only`);
    }
    if (auditOnly && finalScreenshot) {
      errors.push(`drawing_manifest.${drawing.id || role} audit-only drawing cannot reference final presentation screenshot: ${drawing.screenshot}`);
    }
    if (String(drawing.source_hypothesis_id || '').trim()) {
      const sourceId = drawing.source_hypothesis_id;
      const sourceHypothesis = hypothesesById.get(sourceId);
      const computed = computedHypotheses.get(sourceId);
      if (!sourceHypothesis) {
        errors.push(`drawing_manifest.${drawing.id || role} references missing source_hypothesis_id: ${sourceId}`);
      } else if (
        computed?.status === 'fail'
        || computed?.classification === 'invalid_diagnostic'
        || ['rejected', 'diagnostic'].includes(computed?.lifecycle_status)
      ) {
        if (!auditOnly) {
          errors.push(`drawing_manifest.${drawing.id || role} references failed/rejected hypothesis ${sourceId} and must be audit_only or presentation_allowed=false`);
        }
        if (finalScreenshot) {
          errors.push(`drawing_manifest.${drawing.id || role} references failed/rejected hypothesis ${sourceId} in final presentation screenshot: ${drawing.screenshot}`);
        }
      }
    }
    const drawingEngineStatus = normalizedToken(drawing.engine_status || drawing.engine_result_status);
    if (drawingEngineStatus && drawingEngineStatus !== 'pass' && !auditOnly) {
      errors.push(`drawing_manifest.${drawing.id || role} has non-pass engine_status and must be audit_only or presentation_allowed=false: ${drawing.engine_status || drawing.engine_result_status}`);
    }
    if (tool === 'elliott_impulse_wave' && !auditOnly && Array.isArray(drawing.levels) && drawing.levels.length >= 6) {
      const levels = drawing.levels.map(Number);
      if (levels.slice(0, 6).every(Number.isFinite)) {
        const direction = normalizedToken(drawing.direction) || (levels[3] >= levels[0] ? 'bullish' : 'bearish');
        const failedFifth = direction === 'bearish'
          ? levels[5] >= levels[3]
          : levels[5] <= levels[3];
        if (failedFifth) {
          errors.push(`drawing_manifest.${drawing.id || role} failed_fifth_forbidden: Elliott impulse Wave 5 must exceed Wave 3 for ${direction} counts`);
        }
      }
    }
    const forbidden = forbiddenByRole[role] || [];
    if (forbidden.includes(tool)) errors.push(`forbidden drawing tool for ${role}: ${tool}`);
    const allowed = allowedByRole[role];
    if (allowed && !allowed.includes(tool)) errors.push(`drawing_manifest.${drawing.id || role} must use one of ${allowed.join(', ')}: ${tool}`);
    validateDrawingPointLocking(drawing, role, manifest.drawing_protocol, pivotMaps, errors);
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

function getDrawingIds(item) {
  const rawDrawingIds = item?.drawing_ids ?? item?.drawing_id;
  return Array.isArray(rawDrawingIds) ? rawDrawingIds.filter(Boolean) : (rawDrawingIds ? [rawDrawingIds] : []);
}

function getTextField(item, fields) {
  for (const field of fields) {
    const value = item?.[field];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const serialized = JSON.stringify(value);
      if (serialized !== '{}') return serialized;
    }
  }
  return '';
}

function hasAbcSequence(value) {
  const normalized = String(value || '').replace(/[^a-z0-9]+/gi, ' ').toLowerCase();
  return /\ba\b.*\bb\b.*\bc\b/.test(normalized);
}

function validateReferencedDrawings(item, path, drawingsById, errors) {
  const drawingIds = getDrawingIds(item);
  if (!drawingIds.length) {
    errors.push(`${path} missing drawing_id or drawing_ids`);
    return;
  }
  for (const drawingId of drawingIds) {
    if (!drawingsById.has(drawingId)) {
      errors.push(`${path} references missing drawing_manifest id: ${drawingId}`);
    }
  }
}

function numberFromFields(item, fields) {
  for (const field of fields) {
    const value = item?.[field];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

function validateWave3RuleItem(item, path, config, errors) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    errors.push(`${path} is required`);
    return;
  }

  if (!String(item.evidence || '').trim()) errors.push(`${path} missing evidence`);
  const minimumRatio = Number(config.minimum_ratio);
  const requiredRatio = numberFromFields(item, ['minimum_ratio', 'required_ratio', 'required']);
  if (requiredRatio == null) {
    errors.push(`${path} missing required_ratio/minimum_ratio`);
  } else if (requiredRatio < minimumRatio) {
    errors.push(`${path} required_ratio must be at least ${minimumRatio}: ${requiredRatio}`);
  }

  const status = String(item.status || '').toLowerCase();
  const allowedStatuses = new Set(config.allowed_statuses || ['pass', 'pass_with_fallback', 'rare_exception_downgraded']);
  if (!status) {
    errors.push(`${path}.status is required`);
  } else if (!allowedStatuses.has(status)) {
    errors.push(`${path}.status must be one of ${[...allowedStatuses].join(', ')}: ${item.status}`);
  }
  const exceptionStatuses = new Set(config.exception_statuses || []);
  const actualRatio = numberFromFields(item, ['actual_ratio', 'wave3_vs_wave1', 'actual']);
  const needsException = exceptionStatuses.has(status) || (actualRatio != null && actualRatio < minimumRatio);

  if (actualRatio != null && actualRatio < minimumRatio && !exceptionStatuses.has(status)) {
    errors.push(`${path}.status must be ${[...exceptionStatuses].join(' or ')} when actual_ratio is below ${minimumRatio}: ${actualRatio}`);
  }

  if (!needsException) return;

  const exception = item.exception || item.rare_exception;
  if (!exception || typeof exception !== 'object' || Array.isArray(exception)) {
    errors.push(`${path} rare exception requires exception object`);
    return;
  }

  for (const field of config.exception_required_fields || []) {
    if (!String(exception[field] || '').trim()) errors.push(`${path}.exception.${field} is required`);
  }
}

function validateCastawayOverlayLabel(item, path, config, errors) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    errors.push(`${path} must be an object`);
    return;
  }

  const label = getTextField(item, ['source_label', 'overlay_label', 'label']);
  if (!label) {
    errors.push(`${path} missing source_label/overlay_label`);
  } else {
    const lowerLabel = label.toLowerCase();
    for (const term of config.required_terms || []) {
      if (!lowerLabel.includes(term)) errors.push(`${path} label must include ${term}: ${label}`);
    }
    for (const term of config.forbidden_terms || []) {
      if (lowerLabel.includes(term)) errors.push(`${path} label must not treat Castaway as Copsey source: ${label}`);
    }
  }

  if (item.is_copsey_source !== false) {
    errors.push(`${path}.is_copsey_source must be false`);
  }
  if (!String(item.evidence || item.reason || '').trim()) {
    errors.push(`${path} missing evidence`);
  }
}

function validateHewCopseyPurity(evidence, manifest, errors) {
  const protocol = manifest.copsey_purity_protocol;
  if (!protocol) return;

  const path = protocol.path || 'copsey_hew_purity';
  const purity = getByPath(evidence, path);
  if (!purity || typeof purity !== 'object' || Array.isArray(purity)) {
    errors.push(`${path} must be an object`);
    return;
  }

  const allowedStatuses = new Set(protocol.allowed_statuses || ['pass', 'pass_with_fallback', 'not_applicable']);
  for (const id of protocol.required_items || []) {
    const item = purity[id];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push(`${path}.${id} is required`);
      continue;
    }
    const status = String(item.status || '').toLowerCase();
    if (!allowedStatuses.has(status)) {
      errors.push(`${path}.${id}.status must be one of ${[...allowedStatuses].join(', ')}: ${item.status}`);
    }
    if (!String(item.evidence || '').trim()) errors.push(`${path}.${id} missing evidence`);
  }

  const drawings = asArray(getByPath(evidence, manifest.drawing_protocol?.path || 'chart_prep.drawing_manifest'));
  const drawingsById = new Map();
  for (const drawing of drawings) {
    if (drawing?.id) drawingsById.set(drawing.id, drawing);
  }

  const internalConfig = protocol.internal_abc_motive_engines || {};
  const internal = purity.internal_abc_motive_engines;
  if (internal && typeof internal === 'object' && !Array.isArray(internal)) {
    const allowedCoverage = new Set(internalConfig.allowed_coverage_statuses || ['visible', 'visible_equivalent']);
    const waves = asArray(internal.macro_waves || internal.waves);
    if (!waves.length) errors.push(`${path}.internal_abc_motive_engines.macro_waves must be a non-empty array`);
    const wavesById = new Map();
    for (const wave of waves) {
      if (!wave || typeof wave !== 'object') continue;
      const waveId = String(wave.wave ?? wave.macro_wave ?? '').replace(/^wave\s*/i, '').trim();
      if (!waveId) {
        errors.push(`${path}.internal_abc_motive_engines.macro_waves item missing wave`);
        continue;
      }
      wavesById.set(waveId, wave);
    }

    for (const requiredWave of internalConfig.required_macro_waves || []) {
      const wave = wavesById.get(String(requiredWave));
      const wavePath = `${path}.internal_abc_motive_engines.wave_${requiredWave}`;
      if (!wave) {
        errors.push(`${wavePath} is required`);
        continue;
      }
      const coverageStatus = String(wave.coverage_status || wave.status || '').toLowerCase();
      if (!allowedCoverage.has(coverageStatus)) {
        errors.push(`${wavePath}.coverage_status must be one of ${[...allowedCoverage].join(', ')}: ${wave.coverage_status || wave.status}`);
      }
      const abcEngine = getTextField(wave, ['abc_engine', 'internal_abc_engine']);
      const visibleEquivalent = getTextField(wave, ['visible_equivalent']);
      if (!abcEngine && !visibleEquivalent) {
        errors.push(`${wavePath} missing internal A-B-C motive engine or visible_equivalent`);
      }
      if (abcEngine && !hasAbcSequence(abcEngine)) {
        errors.push(`${wavePath}.abc_engine must explicitly identify A-B-C structure`);
      }
      if (!String(wave.evidence || '').trim()) errors.push(`${wavePath} missing evidence`);
      validateReferencedDrawings(wave, wavePath, drawingsById, errors);
    }
  }

  const acConfig = protocol.ac_lower_degree_fives || {};
  const ac = purity.ac_lower_degree_fives;
  if (ac && typeof ac === 'object' && !Array.isArray(ac)) {
    const visibleStatuses = new Set(acConfig.visible_statuses || ['visible', 'pass']);
    const notVisibleStatuses = new Set(acConfig.not_visible_statuses || ['not_visible', 'not_applicable']);
    const legs = asArray(ac.legs);
    if (!legs.length) errors.push(`${path}.ac_lower_degree_fives.legs must be a non-empty array`);
    const legsById = new Map();
    for (const leg of legs) {
      if (!leg || typeof leg !== 'object') continue;
      const legId = String(leg.leg || '').toUpperCase();
      if (!legId) {
        errors.push(`${path}.ac_lower_degree_fives.legs item missing leg`);
        continue;
      }
      legsById.set(legId, leg);
    }

    for (const requiredLeg of acConfig.required_legs || []) {
      const leg = legsById.get(String(requiredLeg).toUpperCase());
      const legPath = `${path}.ac_lower_degree_fives.leg_${requiredLeg}`;
      if (!leg) {
        errors.push(`${legPath} is required`);
        continue;
      }
      const legStatus = String(leg.visibility_status || leg.status || '').toLowerCase();
      if (visibleStatuses.has(legStatus)) {
        if (!String(leg.five_wave_action || leg.lower_degree_five_wave_action || '').trim()) {
          errors.push(`${legPath} missing five_wave_action`);
        }
        if (!String(leg.evidence || '').trim()) errors.push(`${legPath} missing evidence`);
        validateReferencedDrawings(leg, legPath, drawingsById, errors);
      } else if (notVisibleStatuses.has(legStatus)) {
        if (!String(leg.visibility_reason || '').trim()) errors.push(`${legPath} missing visibility_reason`);
        if (!String(leg.downgrade_semantics || '').trim()) errors.push(`${legPath} missing downgrade_semantics`);
      } else {
        errors.push(`${legPath}.visibility_status must be visible/pass or not_visible/not_applicable: ${leg.visibility_status || leg.status}`);
      }
    }
  }

  const rescueConfig = protocol.classical_rescue_devices || {};
  const rescue = purity.classical_rescue_devices;
  if (rescue && typeof rescue === 'object' && !Array.isArray(rescue)) {
    const rejected = new Set(asArray(rescue.rejected_devices).map((device) => String(device).toLowerCase()));
    for (const device of rescueConfig.expected_rejected_devices || []) {
      if (!rejected.has(device)) errors.push(`${path}.classical_rescue_devices missing rejected device: ${device}`);
    }
    const usedDevices = asArray(rescue.used_devices).filter(Boolean);
    if (usedDevices.length) {
      errors.push(`${path}.classical_rescue_devices used_devices must be empty; classical rescue devices are forbidden: ${usedDevices.join(', ')}`);
    }
    if (rescue.no_use_confirmed !== true && rescue.no_use !== true) {
      errors.push(`${path}.classical_rescue_devices.no_use_confirmed must be true`);
    }
  }

  const castawayConfig = protocol.castaway_overlay || {};
  validateCastawayOverlayLabel(purity.castaway_overlay, `${path}.castaway_overlay`, castawayConfig, errors);
  if (!evidence.castaway_trade_model || typeof evidence.castaway_trade_model !== 'object' || Array.isArray(evidence.castaway_trade_model)) {
    errors.push('castaway_trade_model must be an object');
  } else {
    validateCastawayOverlayLabel(evidence.castaway_trade_model, 'castaway_trade_model', castawayConfig, errors);
  }

  const wave3Config = protocol.wave3_1764_rule || {};
  validateWave3RuleItem(purity.wave3_1764_rule, `${path}.wave3_1764_rule`, wave3Config, errors);

  if (!Array.isArray(evidence.ratio_validation)) {
    errors.push('ratio_validation must be an array');
    return;
  }
  const ratioValidation = indexById(evidence.ratio_validation, 'ratio_validation', errors);
  const ratioId = wave3Config.ratio_validation_id || 'wave3_1764_rule';
  const ratioItem = ratioValidation.get(ratioId);
  if (!ratioItem) {
    errors.push(`ratio_validation missing required id: ${ratioId}`);
  } else {
    validateWave3RuleItem(ratioItem, `ratio_validation.${ratioId}`, wave3Config, errors);
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

function validateCountState(evidence, manifest, errors) {
  const protocol = manifest.count_state_protocol;
  if (!protocol) return;

  const path = protocol.path || 'count_state';
  const state = getByPath(evidence, path);
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    errors.push(`${path} must be an object`);
    return;
  }

  for (const field of protocol.required_fields || []) {
    if (!String(state[field] || '').trim()) errors.push(`${path}.${field} is required`);
  }
  const allowedStatuses = new Set(protocol.allowed_continuity_statuses || []);
  if (allowedStatuses.size && !allowedStatuses.has(String(state.continuity_status || '').toLowerCase())) {
    errors.push(`${path}.continuity_status must be one of ${[...allowedStatuses].join(', ')}: ${state.continuity_status}`);
  }
  const minHashLength = Number(protocol.anchor_hash_min_length || 0);
  if (minHashLength && String(state.anchor_hash || '').length < minHashLength) {
    errors.push(`${path}.anchor_hash must be at least ${minHashLength} characters`);
  }
}

function validateCastawayTradeModelContract(evidence, manifest, errors) {
  const protocol = manifest.castaway_trade_model_protocol;
  if (!protocol) return;

  const path = protocol.path || 'castaway_trade_model';
  const model = getByPath(evidence, path);
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    errors.push(`${path} must be an object`);
    return;
  }

  const table = model.decision_table;
  if (!Array.isArray(table)) {
    errors.push(`${path}.decision_table must be an array`);
    return;
  }
  const rows = indexById(table, `${path}.decision_table`, errors);
  for (const rowId of protocol.required_decision_rows || []) {
    const row = rows.get(rowId);
    if (!row) {
      errors.push(`${path}.decision_table missing required row: ${rowId}`);
      continue;
    }
    for (const field of protocol.required_row_fields || []) {
      if (!String(row[field] || '').trim()) errors.push(`${path}.decision_table.${rowId}.${field} is required`);
    }
  }
}

function validateExecutionQuality(evidence, manifest, errors) {
  const protocol = manifest.execution_quality_protocol;
  if (!protocol) return;

  const path = protocol.path || 'execution_quality';
  const quality = getByPath(evidence, path);
  if (!quality || typeof quality !== 'object' || Array.isArray(quality)) {
    errors.push(`${path} must be an object`);
    return;
  }

  const allowedStatuses = new Set(protocol.allowed_statuses || ['pass', 'scheduled', 'not_required']);
  for (const item of protocol.required_items || []) {
    const id = item.id;
    const section = quality[id];
    if (!section || typeof section !== 'object' || Array.isArray(section)) {
      errors.push(`${path}.${id} is required`);
      continue;
    }
    const status = String(section.status || '').toLowerCase();
    if (!allowedStatuses.has(status)) errors.push(`${path}.${id}.status must be one of ${[...allowedStatuses].join(', ')}: ${section.status}`);
    for (const field of item.required_fields || []) {
      const value = section[field];
      if (!hasOwn(section, field) || value == null || (typeof value === 'string' && !value.trim())) {
        errors.push(`${path}.${id}.${field} is required`);
      }
    }
    for (const field of item.required_true_fields || []) {
      if (section[field] !== true) errors.push(`${path}.${id}.${field} must be true`);
    }
  }
}

function collectFallbackPaths(value, path = '', results = []) {
  if (!value || typeof value !== 'object') return results;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectFallbackPaths(item, `${path}[${index}]`, results));
    return results;
  }
  if (String(value.status || '').toLowerCase() === 'pass_with_fallback') results.push(path || '<root>');
  for (const [key, child] of Object.entries(value)) {
    if (child && typeof child === 'object') collectFallbackPaths(child, path ? `${path}.${key}` : key, results);
  }
  return results;
}

function validateFallbackPolicy(evidence, manifest, errors) {
  const policy = manifest.fallback_policy;
  if (!policy) return;

  const fallbackPaths = collectFallbackPaths(evidence);
  if (!fallbackPaths.length) return;

  const confidence = evidence.confidence;
  const allowedRatings = new Set(policy.allowed_confidence_ratings || ['low', 'very_low']);
  const rating = String(confidence?.rating || '').toLowerCase();
  if (!allowedRatings.has(rating)) {
    errors.push(`confidence.rating must be capped to ${[...allowedRatings].join(' or ')} when fallback is used: ${confidence?.rating || '<missing>'}`);
  }
  if (!String(confidence?.cap_reason || '').toLowerCase().includes('fallback')) {
    errors.push('confidence.cap_reason must disclose fallback usage');
  }

  const allowedActions = new Set((policy.allowed_actions || []).map((action) => normalizedToken(action)));
  const action = normalizedToken(evidence.action_rationale?.selected_action || evidence.trade_posture?.posture);
  if (allowedActions.size && !allowedActions.has(action)) {
    errors.push(`action_rationale.selected_action must be non-actionable when fallback is used: ${evidence.action_rationale?.selected_action || evidence.trade_posture?.posture || '<missing>'}`);
  }
}

function statusIsActionable(value) {
  return normalizedToken(value) === 'actionable';
}

function validateVerdict(evidence, manifest, errors) {
  const protocol = manifest.verdict_protocol;
  if (!protocol) return;
  const path = protocol.path || 'verdict';
  const verdict = getByPath(evidence, path);
  if (!verdict || typeof verdict !== 'object' || Array.isArray(verdict)) {
    errors.push(`${path} must be an object`);
    return;
  }
  const packageValidity = String(verdict.package_validity || '').toLowerCase();
  const evidenceGrade = String(verdict.evidence_grade || '').toLowerCase();
  const tradePermission = String(verdict.trade_permission || '').toLowerCase();
  const confidence = String(verdict.confidence || '').toLowerCase();
  if (!(protocol.allowed_package_validity || []).includes(packageValidity)) {
    errors.push(`${path}.package_validity must be one of ${(protocol.allowed_package_validity || []).join(', ')}: ${verdict.package_validity}`);
  }
  if (!(protocol.allowed_evidence_grades || []).includes(evidenceGrade)) {
    errors.push(`${path}.evidence_grade must be one of ${(protocol.allowed_evidence_grades || []).join(', ')}: ${verdict.evidence_grade}`);
  }
  if (!(protocol.allowed_trade_permission || []).includes(tradePermission)) {
    errors.push(`${path}.trade_permission must be one of ${(protocol.allowed_trade_permission || []).join(', ')}: ${verdict.trade_permission}`);
  }
  if (!(protocol.allowed_confidence || []).includes(confidence)) {
    errors.push(`${path}.confidence must be one of ${(protocol.allowed_confidence || []).join(', ')}: ${verdict.confidence}`);
  }
  if (!String(verdict.posture || '').trim()) errors.push(`${path}.posture is required`);
  if (tradePermission === 'blocked') {
    if (statusIsActionable(evidence.status) || statusIsActionable(verdict.posture) || statusIsActionable(evidence.trade_posture?.posture)) {
      errors.push(`${path}.trade_permission blocked cannot use ACTIONABLE status/posture`);
    }
    const blockedPostures = new Set(protocol.blocked_postures || []);
    if (verdict.posture && !blockedPostures.has(verdict.posture)) {
      errors.push(`${path}.posture must be a blocked posture when trade_permission is blocked: ${verdict.posture}`);
    }
  }
  if (evidenceGrade === 'qualified' && !['low', 'very_low'].includes(confidence)) {
    errors.push(`${path}.confidence must be low or very_low when evidence_grade is qualified: ${verdict.confidence}`);
  }
  if (confidence === 'high') {
    const zones = asArray(evidence.zone_scores);
    if (zones.some((zone) => zone?.zone_score?.calibrated_probability === false)) {
      errors.push(`${path}.confidence cannot be high while zone_scores are uncalibrated`);
    }
  }
  if (evidence.confidence?.rating && normalizedToken(evidence.confidence.rating) !== normalizedToken(verdict.confidence)) {
    errors.push(`${path}.confidence must match confidence.rating: ${evidence.confidence.rating}`);
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
  const allowedBands = new Set(manifest.zone_probabilities.allowed_probability_bands || []);
  const seenTypes = new Set();
  indexById(zones, 'zone_probabilities', errors);
  for (const zone of zones) {
    if (!zone || typeof zone !== 'object') continue;
    if (zone.zone_type) seenTypes.add(zone.zone_type);
    if (!allowedTypes.has(zone.zone_type)) errors.push(`zone_probabilities.${zone.id || '<unknown>'} invalid zone_type: ${zone.zone_type}`);
    for (const field of ['price_range', 'probability', 'evidence', 'invalidation', 'upgrade_condition', 'downgrade_condition']) {
      if (!hasOwn(zone, field) || (typeof zone[field] === 'string' && !zone[field].trim())) {
        errors.push(`zone_probabilities.${zone.id || '<unknown>'} missing ${field}`);
      }
    }
    if (typeof zone.probability?.value !== 'number') errors.push(`zone_probabilities.${zone.id || '<unknown>'}.probability.value must be a number`);
    if (typeof zone.probability?.value === 'number' && (zone.probability.value < 0 || zone.probability.value > 100)) {
      errors.push(`zone_probabilities.${zone.id || '<unknown>'}.probability.value must be between 0 and 100: ${zone.probability.value}`);
    }
    if (!zone.probability?.band) {
      errors.push(`zone_probabilities.${zone.id || '<unknown>'}.probability.band is required`);
    } else if (allowedBands.size && !allowedBands.has(zone.probability.band)) {
      errors.push(`zone_probabilities.${zone.id || '<unknown>'}.probability.band must be one of ${[...allowedBands].join(', ')}: ${zone.probability.band}`);
    }
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

function validateZoneScores(evidence, manifest, errors) {
  const config = manifest.zone_scores;
  if (!config) return;
  const zones = evidence.zone_scores;
  if (!Array.isArray(zones)) {
    errors.push('zone_scores must be an array');
    return;
  }
  const allowedTypes = new Set(config.allowed_zone_types || []);
  const requiredTypes = new Set(config.required_zone_types || []);
  const allowedBands = new Set(config.allowed_score_bands || []);
  const seenTypes = new Set();
  indexById(zones, 'zone_scores', errors);
  for (const zone of zones) {
    if (!zone || typeof zone !== 'object') continue;
    const path = `zone_scores.${zone.id || '<unknown>'}`;
    if (zone.zone_type) seenTypes.add(zone.zone_type);
    if (!allowedTypes.has(zone.zone_type)) errors.push(`${path} invalid zone_type: ${zone.zone_type}`);
    for (const field of ['price_range', 'zone_score', 'evidence', 'invalidation', 'upgrade_condition', 'downgrade_condition']) {
      if (!hasOwn(zone, field) || (typeof zone[field] === 'string' && !zone[field].trim())) errors.push(`${path} missing ${field}`);
    }
    const score = zone.zone_score || {};
    for (const field of config.required_score_fields || []) {
      if (field === 'drivers') {
        if (!Array.isArray(score.drivers) || !score.drivers.length) errors.push(`${path}.zone_score.drivers must be a non-empty array`);
      } else if (!hasOwn(score, field) || (typeof score[field] === 'string' && !score[field].trim())) {
        errors.push(`${path}.zone_score.${field} is required`);
      }
    }
    if (typeof score.score !== 'number' || score.score < 0 || score.score > 100) errors.push(`${path}.zone_score.score must be a number between 0 and 100`);
    if (allowedBands.size && !allowedBands.has(score.band)) errors.push(`${path}.zone_score.band must be one of ${[...allowedBands].join(', ')}: ${score.band}`);
    if (score.calibrated_probability !== false && !score.calibration_set) {
      errors.push(`${path}.zone_score.calibrated_probability cannot be true without calibration_set`);
    }
    const low = zone.price_range?.low;
    const high = zone.price_range?.high;
    if (typeof low !== 'number' || typeof high !== 'number') {
      errors.push(`${path}.price_range.low/high must be numbers`);
    } else if (!(low < high)) {
      errors.push(`${path}.price_range.low must be less than high`);
    }
    validateZoneBoundaryProvenance(zone, path, errors);
  }
  for (const type of requiredTypes) {
    if (!seenTypes.has(type)) errors.push(`zone_scores missing required zone_type: ${type}`);
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collectForbiddenTermHits(value, path, terms, hits) {
  if (value == null) return hits;
  if (typeof value === 'string') {
    for (const term of terms) {
      const pattern = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i');
      if (pattern.test(value)) hits.push({ path, term });
    }
    return hits;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectForbiddenTermHits(item, `${path}[${index}]`, terms, hits));
    return hits;
  }
  if (typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      collectForbiddenTermHits(child, path ? `${path}.${key}` : key, terms, hits);
    }
  }
  return hits;
}

function validateZoneFirstLanguage(evidence, manifest, errors) {
  const config = manifest.zone_first_language;
  if (!config) return;
  const terms = asArray(config.forbidden_terms).map((term) => String(term).trim()).filter(Boolean);
  if (!terms.length) return;
  const hits = [];
  for (const path of asArray(config.paths)) {
    const value = getByPath(evidence, path);
    if (value !== undefined) collectForbiddenTermHits(value, path, terms, hits);
  }
  for (const hit of hits) {
    errors.push(`zone_first_language forbidden term "${hit.term}" in ${hit.path}`);
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
  for (const field of manifest.critic_review?.required_top_level_fields || []) {
    if (!hasOwn(critic, field)) errors.push(`critic_review.${field} is required`);
  }
  const criticEnums = [
    ['package_validity_verdict', manifest.critic_review?.allowed_package_validity_verdicts],
    ['evidence_grade_verdict', manifest.critic_review?.allowed_evidence_grade_verdicts],
    ['trade_permission_verdict', manifest.critic_review?.allowed_trade_permission_verdicts],
    ['visual_readability_verdict', manifest.critic_review?.allowed_visual_readability_verdicts]
  ];
  for (const [field, allowedValues] of criticEnums) {
    const value = String(critic[field] || '').toLowerCase();
    if (allowedValues?.length && !allowedValues.includes(value)) {
      errors.push(`critic_review.${field} must be one of ${allowedValues.join(', ')}: ${critic[field]}`);
    }
  }
  for (const field of ['blocking_issues', 'material_non_blocking_issues', 'required_followups']) {
    if (hasOwn(critic, field) && !Array.isArray(critic[field])) errors.push(`critic_review.${field} must be an array`);
  }
  for (const field of ['strongest_bear_case_against_package', 'strongest_bull_case_against_package']) {
    if (hasOwn(critic, field) && !String(critic[field] || '').trim()) errors.push(`critic_review.${field} is required`);
  }
  if (evidence.verdict?.evidence_grade === 'qualified' && asArray(critic.material_non_blocking_issues).length === 0) {
    errors.push('critic_review.material_non_blocking_issues must name caveats when evidence_grade is qualified');
  }
  if (evidence.verdict?.trade_permission && critic.trade_permission_verdict && evidence.verdict.trade_permission !== critic.trade_permission_verdict) {
    errors.push(`critic_review.trade_permission_verdict must match verdict.trade_permission: ${evidence.verdict.trade_permission}`);
  }
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

  const independentConfig = manifest.critic_review?.independent_reviewer || {};
  if (independentConfig.required) {
    if (independentConfig.prompt_file && !existsSync(resolve(repoRoot, independentConfig.prompt_file))) {
      errors.push(`critic_review.independent_reviewer prompt_file is missing: ${independentConfig.prompt_file}`);
    }
    const reviewer = critic.independent_reviewer;
    if (!reviewer || typeof reviewer !== 'object' || Array.isArray(reviewer)) {
      errors.push('critic_review.independent_reviewer is required');
    } else {
      if (reviewer.independent_from_author !== true) errors.push('critic_review.independent_reviewer.independent_from_author must be true');
      const allowedTypes = new Set(independentConfig.allowed_reviewer_types || []);
      if (allowedTypes.size && !allowedTypes.has(String(reviewer.reviewer_type || '').toLowerCase())) {
        errors.push(`critic_review.independent_reviewer.reviewer_type must be one of ${[...allowedTypes].join(', ')}: ${reviewer.reviewer_type}`);
      }
      for (const field of independentConfig.required_fields || []) {
        if (!String(reviewer[field] || '').trim()) errors.push(`critic_review.independent_reviewer.${field} is required`);
      }
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
    errors.push(`cannot infer supported strategy from method/workflow_version/journal_id: ${evidence.method || ''}`);
    return { file: absoluteFile, strategy: null, errors, warnings };
  }
  const manifest = loadManifest(strategy, errors);
  if (!manifest) return { file: absoluteFile, strategy, errors, warnings };
  if (options.stage) {
    const supportedStages = new Set(manifest.stage_validation?.supported_stages || []);
    if (!supportedStages.has(options.stage)) {
      errors.push(`unsupported validation stage: ${options.stage}`);
      return { file: absoluteFile, strategy, errors, warnings };
    }
  }

  validateTopLevel(evidence, manifest, errors);
  validateContractVersion(evidence, manifest, errors);
  validateStageGates(evidence, manifest, errors);
  validateIdCollections(evidence, manifest, errors);
  validatePackageArtifacts(evidence, manifest, absoluteFile, errors);
  validateScreenshots(evidence, manifest, absoluteFile, errors);
  validateVisualPivotEvidence(evidence, manifest, errors);
  validateIanCopseyWaveMap(evidence, manifest, errors);
  validateHypotheses(evidence, manifest, errors);
  validateCountState(evidence, manifest, errors);
  validateChartModeProtocol(evidence, manifest, errors);
  validateDrawingManifest(evidence, manifest, errors);
  validateHewStructureContext(evidence, manifest, errors);
  validateHewCopseyPurity(evidence, manifest, errors);
  validateCastawayTradeModelContract(evidence, manifest, errors);
  validateExecutionQuality(evidence, manifest, errors);
  validateFallbackPolicy(evidence, manifest, errors);
  validateVerdict(evidence, manifest, errors);
  validateZoneProbabilities(evidence, manifest, errors);
  validateZoneScores(evidence, manifest, errors);
  validateZoneFirstLanguage(evidence, manifest, errors);
  validateActionRationale(evidence, manifest, errors);
  validateCriticReview(evidence, manifest, errors);
  validateJournalAlignment(evidence, absoluteFile, errors, warnings);

  return { file: absoluteFile, strategy, errors, warnings };
}

function discoverEvidenceFiles(strategy) {
  const base = resolve(repoRoot, 'analysis_journal');
  if (!existsSync(base)) return [];
  const suffix = `_${strategy}`;
  const manifestErrors = [];
  const manifest = loadManifest(strategy, manifestErrors);
  const currentContract = manifest?.contract_version;
  return readdirSync(base, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.endsWith(suffix))
    .map((entry) => join(base, entry.name, 'evidence.json'))
    .filter((file) => existsSync(file))
    .filter((file) => {
      if (!currentContract) return true;
      const evidence = parseJson(file, []);
      return evidence?.workflow_version === currentContract;
    })
    .sort();
}

function parseArgs(argv) {
  const args = [...argv];
  let strategy = null;
  let stage = null;
  const files = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') return { help: true, strategy, stage, files };
    if (arg === '--strategy') {
      strategy = args[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith('--strategy=')) {
      strategy = arg.slice('--strategy='.length);
      continue;
    }
    if (arg === '--stage') {
      stage = args[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith('--stage=')) {
      stage = arg.slice('--stage='.length);
      continue;
    }
    if (arg.startsWith('--')) continue;
    files.push(arg);
  }
  return { help: false, strategy, stage, files };
}

function printHelp() {
  console.log(`Usage: node scripts/validate_evidence.mjs [--strategy hew] [--stage extraction|verification|anchors|ratios|drawings|writing|critic|final] [evidence.json ...]\n\nIf no files are provided, validates analysis_journal/*_hew/evidence.json.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { help, strategy, stage, files } = parseArgs(process.argv.slice(2));
  if (help) {
    printHelp();
    process.exit(0);
  }
  const activeStrategy = strategy || SUPPORTED_STRATEGY;
  if (activeStrategy !== SUPPORTED_STRATEGY) {
    console.error(`Unsupported strategy: ${activeStrategy}. Only Ian Copsey Fractal Forecasting (strategy id: hew) validation is supported.`);
    process.exit(1);
  }
  const inputFiles = files.length ? files.map((file) => resolve(file)) : discoverEvidenceFiles(activeStrategy);
  if (!inputFiles.length) {
    console.log(`No evidence files found for strategy ${activeStrategy}; nothing to validate.`);
    process.exit(0);
  }
  const results = inputFiles.map((file) => validateEvidenceFile(file, { strategy, stage }));
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

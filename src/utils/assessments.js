/* =====================================================================
   RheumCompanion — Assessments data layer
   Patient-reported symptom scores + 28- and 68-joint map storage.
   All measures are standard, NON-PROPRIETARY patient-reported outcomes
   (no licensed instruments). Self-contained: uses its own prefixed
   localStorage keys (rheum_assess_*) and depends on no other app module.
   ===================================================================== */

const KEY_SCORES = 'rheum_assess_scores';
const KEY_JOINTS = 'rheum_assess_joints';

/* ---------- storage helpers ---------- */
function load(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; }
  catch { return []; }
}
function save(key, arr) {
  localStorage.setItem(key, JSON.stringify(arr));
}

/* =====================================================================
   Patient-reported symptom scores
   - pain      0-10  (0 = no pain, 10 = worst imaginable)
   - ptGlobal  0-10  (patient global: 0 = very well, 10 = very poorly)
   - fatigue   0-10  (0 = no fatigue, 10 = completely exhausted)
   - stiffSev  0-10  (morning stiffness severity)
   - stiffMin  minutes of morning stiffness on a typical recent morning
   All half-point steps allowed on the 0-10 scales.
   ===================================================================== */

export const SCORE_FIELDS = [
  { key: 'pain',     label: 'Pain',               short: 'Pain' },
  { key: 'ptGlobal', label: 'Patient global',     short: 'Global' },
  { key: 'fatigue',  label: 'Fatigue',            short: 'Fatigue' },
  { key: 'stiffSev', label: 'Stiffness severity', short: 'Stiff' },
];

export const STIFF_DURATIONS = [
  { min: 0,   label: 'None' },
  { min: 15,  label: '15 min' },
  { min: 30,  label: '30 min' },
  { min: 45,  label: '45 min' },
  { min: 60,  label: '1 hour' },
  { min: 90,  label: '1.5 h' },
  { min: 120, label: '2 h' },
  { min: 180, label: '3 h' },
  { min: 240, label: '4+ h' },
];

export function fmtStiffMin(min) {
  if (min == null) return '—';
  if (min === 0) return '0';
  if (min < 60) return min + 'm';
  const h = min / 60;
  return (Number.isInteger(h) ? h : h.toFixed(1)) + 'h';
}

export function validateScores(e) {
  const inRange = v => typeof v === 'number' && !Number.isNaN(v) && v >= 0 && v <= 10;
  return inRange(e.pain) && inRange(e.ptGlobal) && inRange(e.fatigue) &&
    inRange(e.stiffSev) &&
    typeof e.stiffMin === 'number' && e.stiffMin >= 0 && e.stiffMin <= 1440;
}

export function saveScoresEntry(entry) {
  if (!validateScores(entry)) return null;
  const list = load(KEY_SCORES);
  const rec = {
    id: 'sc_' + Date.now(),
    date: new Date().toISOString(),
    pain: entry.pain, ptGlobal: entry.ptGlobal, fatigue: entry.fatigue,
    stiffSev: entry.stiffSev, stiffMin: entry.stiffMin,
  };
  list.push(rec);
  save(KEY_SCORES, list);
  return rec;
}
export function getScoresEntries() {
  return load(KEY_SCORES).sort((a, b) => new Date(a.date) - new Date(b.date));
}
export function deleteScoresEntry(id) {
  save(KEY_SCORES, load(KEY_SCORES).filter(e => e.id !== id));
}

/* =====================================================================
   Joint maps, patient-reported. Two standard sets:
   - 28-joint set (DAS28): shoulders, elbows, wrists, MCP 1-5, PIP 1-5
     (pip1 = thumb IP), knees.
   - 68/66-joint set (ACR): adds TMJ, sternoclavicular, acromioclavicular,
     DIP 2-5, hips, ankles, tarsus, MTP 1-5 and toe IP/PIP 1-5. Hips are
     counted for tenderness only, so swollen counts are out of 66.
   The 28 set is a subset of the 68 set (same ids), so 28-joint counts are
   always available. Each joint: { t: tender/painful?, s: swollen? }
   ===================================================================== */

export const JOINTS_28 = [
  'shoulder_L','shoulder_R','elbow_L','elbow_R','wrist_L','wrist_R',
  'mcp1_L','mcp2_L','mcp3_L','mcp4_L','mcp5_L',
  'mcp1_R','mcp2_R','mcp3_R','mcp4_R','mcp5_R',
  'pip1_L','pip2_L','pip3_L','pip4_L','pip5_L',
  'pip1_R','pip2_R','pip3_R','pip4_R','pip5_R',
  'knee_L','knee_R',
];

const PER_SIDE_68 = [
  'tmj', 'sc', 'ac', 'shoulder', 'elbow', 'wrist',
  'mcp1', 'mcp2', 'mcp3', 'mcp4', 'mcp5',
  'pip1', 'pip2', 'pip3', 'pip4', 'pip5',
  'dip2', 'dip3', 'dip4', 'dip5',
  'hip', 'knee', 'ankle', 'tarsus',
  'mtp1', 'mtp2', 'mtp3', 'mtp4', 'mtp5',
  'tip1', 'tip2', 'tip3', 'tip4', 'tip5',
];
export const JOINTS_68 = ['R', 'L'].flatMap(side => PER_SIDE_68.map(b => `${b}_${side}`));

// Hips can't be examined for swelling, so they're excluded from the 66 swollen count.
export const canSwell = id => !id.startsWith('hip_');

const JOINT_NAMES = {
  tmj: 'jaw (TMJ)', sc: 'sternoclavicular', ac: 'acromioclavicular',
  shoulder: 'shoulder', elbow: 'elbow', wrist: 'wrist', hip: 'hip', knee: 'knee', ankle: 'ankle',
  tarsus: 'midfoot (tarsus)',
  mcp1: 'thumb MCP', mcp2: 'index MCP', mcp3: 'middle MCP', mcp4: 'ring MCP', mcp5: 'little MCP',
  pip1: 'thumb IP',  pip2: 'index PIP', pip3: 'middle PIP', pip4: 'ring PIP', pip5: 'little PIP',
  dip2: 'index DIP', dip3: 'middle DIP', dip4: 'ring DIP', dip5: 'little DIP',
  mtp1: 'big toe MTP', mtp2: '2nd toe MTP', mtp3: '3rd toe MTP', mtp4: '4th toe MTP', mtp5: '5th toe MTP',
  tip1: 'big toe IP', tip2: '2nd toe PIP', tip3: '3rd toe PIP', tip4: '4th toe PIP', tip5: '5th toe PIP',
};

export function jointLabel(id) {
  const side = id.endsWith('_L') ? 'left' : 'right';
  const base = id.replace(/_[LR]$/, '');
  return side + ' ' + (JOINT_NAMES[base] || base);
}

export function jointCounts(state) {
  const on = (j, k) => !!(state[j] && state[j][k]);
  return {
    tjc28: JOINTS_28.filter(j => on(j, 't')).length,
    sjc28: JOINTS_28.filter(j => on(j, 's')).length,
    tjc68: JOINTS_68.filter(j => on(j, 't')).length,
    sjc66: JOINTS_68.filter(j => canSwell(j) && on(j, 's')).length,
  };
}

/* ---------- pattern summary (descriptive counts, not a diagnosis) ---------- */
const SMALL = /^(wrist|mcp|pip|dip|mtp|tip)\d?_/;
const LARGE = /^(shoulder|elbow|hip|knee|ankle)_/;
const mirror = id => id.replace(/_([LR])$/, (m, s) => (s === 'L' ? '_R' : '_L'));

export function jointPattern(state, set = 28) {
  const ids = set === 68 ? JOINTS_68 : JOINTS_28;
  const hit = j => !!(state[j] && (state[j].t || state[j].s));
  const involved = ids.filter(hit);
  const n = involved.length;
  if (!n) return { n: 0, extent: 'none', text: 'No joints marked' };

  const extent = n === 1 ? 'monoarticular' : n <= 4 ? 'oligoarticular' : 'polyarticular';
  const paired = involved.filter(j => hit(mirror(j))).length;
  const ratio = paired / n;
  const symmetry = n < 2 ? null : ratio >= 0.75 ? 'symmetric' : ratio <= 0.25 ? 'asymmetric' : 'partly symmetric';
  const small = involved.filter(j => SMALL.test(j)).length;
  const large = involved.filter(j => LARGE.test(j)).length;
  const distribution = small / n >= 2 / 3 ? 'mainly small joints' : large / n >= 2 / 3 ? 'mainly large joints' : 'small and large joints';
  const dip = involved.some(j => j.startsWith('dip'));

  const parts = [`${extent[0].toUpperCase()}${extent.slice(1)} (${n} joint${n === 1 ? '' : 's'})`];
  if (symmetry) parts.push(symmetry);
  parts.push(distribution);
  if (dip) parts.push('includes DIP joints');
  return { n, extent, symmetry, distribution, dip, paired, text: parts.join(' · ') };
}

export function saveJointEntry(state, set = 28) {
  const list = load(KEY_JOINTS);
  const ids = set === 68 ? JOINTS_68 : JOINTS_28;
  const joints = Object.fromEntries(Object.entries(state).filter(([j]) => ids.includes(j)));
  const counts = jointCounts(joints);
  const rec = {
    id: 'jm_' + Date.now(),
    date: new Date().toISOString(),
    set, joints, tjc28: counts.tjc28, sjc28: counts.sjc28,
  };
  if (set === 68) { rec.tjc68 = counts.tjc68; rec.sjc66 = counts.sjc66; }
  list.push(rec);
  save(KEY_JOINTS, list);
  return list;
}
export function getJointEntries() {
  return load(KEY_JOINTS).sort((a, b) => new Date(a.date) - new Date(b.date));
}
export function deleteJointEntry(id) {
  save(KEY_JOINTS, load(KEY_JOINTS).filter(e => e.id !== id));
}

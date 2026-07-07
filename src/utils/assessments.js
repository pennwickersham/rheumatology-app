/* =====================================================================
   RheumCompanion — Assessments data layer
   Patient-reported symptom scores + 28-joint map storage.
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
   28-joint map (standard 28-joint set), patient-reported
   shoulders x2, elbows x2, wrists x2, MCP 1-5 x2, PIP 1-5 x2, knees x2
   Each joint: { t: tender/painful?, s: swollen? }
   ===================================================================== */

export const JOINTS_28 = [
  'shoulder_L','shoulder_R','elbow_L','elbow_R','wrist_L','wrist_R',
  'mcp1_L','mcp2_L','mcp3_L','mcp4_L','mcp5_L',
  'mcp1_R','mcp2_R','mcp3_R','mcp4_R','mcp5_R',
  'pip1_L','pip2_L','pip3_L','pip4_L','pip5_L',
  'pip1_R','pip2_R','pip3_R','pip4_R','pip5_R',
  'knee_L','knee_R',
];

export function jointLabel(id) {
  const side = id.endsWith('_L') ? 'left' : 'right';
  const base = id.replace(/_[LR]$/, '');
  const names = {
    shoulder: 'shoulder', elbow: 'elbow', wrist: 'wrist', knee: 'knee',
    mcp1: 'thumb MCP', mcp2: 'index MCP', mcp3: 'middle MCP', mcp4: 'ring MCP', mcp5: 'little MCP',
    pip1: 'thumb IP',  pip2: 'index PIP', pip3: 'middle PIP', pip4: 'ring PIP', pip5: 'little PIP',
  };
  return side + ' ' + (names[base] || base);
}

export function jointCounts(state) {
  let t = 0, s = 0;
  for (const j of JOINTS_28) {
    if (state[j] && state[j].t) t++;
    if (state[j] && state[j].s) s++;
  }
  return { tjc28: t, sjc28: s };
}

export function saveJointEntry(state) {
  const list = load(KEY_JOINTS);
  const counts = jointCounts(state);
  list.push({
    id: 'jm_' + Date.now(),
    date: new Date().toISOString(),
    joints: state, tjc28: counts.tjc28, sjc28: counts.sjc28,
  });
  save(KEY_JOINTS, list);
  return list;
}
export function getJointEntries() {
  return load(KEY_JOINTS).sort((a, b) => new Date(a.date) - new Date(b.date));
}
export function deleteJointEntry(id) {
  save(KEY_JOINTS, load(KEY_JOINTS).filter(e => e.id !== id));
}

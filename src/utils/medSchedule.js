import { loadFromStorage, saveToStorage } from './storage';

/* =====================================================================
   Medication schedules, dose log, injection-site rotation and holds.
   Everything stays in localStorage under the rheum_app_ prefix, so it is
   included in backups. All dates are LOCAL calendar days ('YYYY-MM-DD').

   A My Medications entry may carry:
     schedule: { unit: 'day'|'week'|'month'|'none', every: N, next: 'YYYY-MM-DD' }
     route:    'oral' | 'injection' | 'infusion'
     time:     'HH:MM' reminder time
     folate:   'off' | 'dayAfter' | 'dailyExcept'   (weekly methotrexate only)
     hold:     { since: 'YYYY-MM-DD', reason }
   Entries saved before schedules existed have none of these and are
   treated as daily oral medicines.
   ===================================================================== */

const DOSE_KEY = 'dose_log';
const HOLD_KEY = 'med_hold_log';

/* ---------- local calendar dates ---------- */
const pad = n => String(n).padStart(2, '0');
export const toKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const todayKey = () => toKey(new Date());
export const isDateKey = k => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);

export function addDays(key, n) {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

// Same day-of-month n months later, clamped to the month's last day (Jan 31 + 1 → Feb 28/29).
export function addMonths(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  const last = new Date(y, m - 1 + n + 1, 0).getDate();
  return toKey(new Date(y, m - 1 + n, Math.min(d, last)));
}

export const daysBetween = (a, b) => Math.round((fromKey(b) - fromKey(a)) / 864e5);

export const fmtDay = key => fromKey(key).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
export const fmtShort = key => fromKey(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/* ---------- schedule ---------- */
export const ROUTES = [
  { id: 'oral', label: 'Pill / by mouth' },
  { id: 'injection', label: 'Self-injection' },
  { id: 'infusion', label: 'Infusion (IV)' },
];

export const FREQUENCIES = [
  { value: 'day:1', label: 'Every day' },
  { value: 'week:1', label: 'Once a week' },
  { value: 'week:2', label: 'Every 2 weeks' },
  { value: 'week:3', label: 'Every 3 weeks' },
  { value: 'week:4', label: 'Every 4 weeks' },
  { value: 'month:1', label: 'Once a month (same date)' },
  { value: 'week:6', label: 'Every 6 weeks' },
  { value: 'week:8', label: 'Every 8 weeks' },
  { value: 'week:12', label: 'Every 12 weeks' },
  { value: 'month:3', label: 'Every 3 months' },
  { value: 'month:6', label: 'Every 6 months' },
  { value: 'none:0', label: 'As needed (no reminders)' },
];

export const FOLATE_OPTIONS = [
  { id: 'off', label: 'No reminder' },
  { id: 'dayAfter', label: 'The day after methotrexate' },
  { id: 'dailyExcept', label: 'Every day except methotrexate day' },
];

export function getSchedule(med) {
  const s = med.schedule;
  if (!s || !['day', 'week', 'month', 'none'].includes(s.unit)) return { unit: 'day', every: 1 };
  return { unit: s.unit, every: Math.max(1, Number(s.every) || 1), next: isDateKey(s.next) ? s.next : undefined };
}

export const getRoute = med => (ROUTES.some(r => r.id === med.route) ? med.route : 'oral');

export const freqValue = s => `${s.unit}:${s.unit === 'none' ? 0 : s.every}`;

// Non-daily schedules are anchored to a "next dose" date.
export const needsAnchor = s => s.unit === 'week' || s.unit === 'month';

export const isWeeklyMethotrexate = med => {
  const s = getSchedule(med);
  return med.id === 'methotrexate' && s.unit === 'week' && s.every === 1;
};

function occurrence(s, k) {
  return s.unit === 'week' ? addDays(s.next, 7 * s.every * k) : addMonths(s.next, s.every * k);
}

// Upcoming dose dates on or after `from` (default today), at most `count`, within `horizonDays`.
export function upcomingDoses(med, { from = todayKey(), count = 8, horizonDays = 400 } = {}) {
  const s = getSchedule(med);
  if (!needsAnchor(s) || !s.next) return [];
  const limit = addDays(from, horizonDays);
  const out = [];
  for (let k = 0; k < 2000 && out.length < count; k++) {
    const d = occurrence(s, k);
    if (d > limit) break;
    if (d >= from) out.push(d);
  }
  return out;
}

export function nextDue(med) {
  const s = getSchedule(med);
  if (s.unit === 'none') return null;
  if (s.unit === 'day') return todayKey();
  return upcomingDoses(med, { count: 1 })[0] || null;
}

// Date of the dose after one taken on `doseDate`.
export function advanceFrom(med, doseDate) {
  const s = getSchedule(med);
  if (s.unit === 'week') return addDays(doseDate, 7 * s.every);
  if (s.unit === 'month') return addMonths(doseDate, s.every);
  return null;
}

export function describeSchedule(med) {
  const s = getSchedule(med);
  const route = getRoute(med);
  let text;
  if (s.unit === 'none') text = 'As needed';
  else if (s.unit === 'day') text = 'Daily';
  else if (s.unit === 'week' && s.every === 1) {
    text = 'Weekly' + (s.next ? ' (' + fromKey(s.next).toLocaleDateString(undefined, { weekday: 'short' }) + ')' : '');
  } else if (s.unit === 'week') text = `Every ${s.every} weeks`;
  else text = s.every === 1 ? 'Monthly' : `Every ${s.every} months`;
  if (route !== 'oral') text += ' · ' + (route === 'injection' ? 'injection' : 'infusion');
  if (isWeeklyMethotrexate(med) && med.folate && med.folate !== 'off') {
    text += med.folate === 'dayAfter' ? ' + folic acid day after' : ' + folic acid other 6 days';
  }
  return text;
}

/* ---------- dose log ---------- */
// [{ id, medId, date: 'YYYY-MM-DD', site?, ts }]
export function getDoseLog() {
  const list = loadFromStorage(DOSE_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function logDose(medId, { date = todayKey(), site } = {}) {
  const rec = { id: 'dose_' + Date.now(), medId, date, ts: Date.now() };
  if (site) rec.site = site;
  const list = [...getDoseLog(), rec].sort((a, b) => (a.date === b.date ? a.ts - b.ts : a.date < b.date ? -1 : 1));
  saveToStorage(DOSE_KEY, list);
  return rec;
}

export function deleteDose(id) {
  saveToStorage(DOSE_KEY, getDoseLog().filter(d => d.id !== id));
}

export function dosesFor(medId) {
  return getDoseLog().filter(d => d.medId === medId);
}

export function lastDose(medId) {
  const list = dosesFor(medId);
  return list[list.length - 1] || null;
}

/* ---------- injection-site rotation ---------- */
// Rotation order alternates sides and regions so consecutive injections land far apart.
export const SITES = [
  { id: 'abdomen_L', label: 'Left abdomen', short: 'L abdomen' },
  { id: 'thigh_R', label: 'Right thigh', short: 'R thigh' },
  { id: 'abdomen_R', label: 'Right abdomen', short: 'R abdomen' },
  { id: 'thigh_L', label: 'Left thigh', short: 'L thigh' },
  { id: 'arm_L', label: 'Left upper arm', short: 'L arm' },
  { id: 'arm_R', label: 'Right upper arm', short: 'R arm' },
];

export const siteLabel = (id, short = false) => {
  const s = SITES.find(x => x.id === id);
  return s ? (short ? s.short : s.label) : id;
};

// Rotation is shared across all injectable medicines: the skin doesn't care which drug it was.
export function recentSites(n = 4) {
  return getDoseLog().filter(d => d.site).slice(-n).reverse();
}

export function suggestSite(useArms = true) {
  const order = useArms ? SITES : SITES.filter(s => !s.id.startsWith('arm'));
  const recent = recentSites(order.length).map(d => d.site);
  if (!recent.length) return order[0].id;
  const i = order.findIndex(s => s.id === recent[0]);
  for (let step = 1; step <= order.length; step++) {
    const cand = order[(Math.max(i, -1) + step) % order.length].id;
    if (!recent.slice(0, 2).includes(cand)) return cand;
  }
  return order[0].id;
}

/* ---------- holds ---------- */
// [{ id, medId, name, start, end?, reason }]
export const HOLD_REASONS = [
  { id: 'infection', label: 'Infection' },
  { id: 'surgery', label: 'Surgery or procedure' },
  { id: 'doctor', label: "Doctor's instructions" },
  { id: 'side-effect', label: 'Side effect' },
  { id: 'supply', label: 'Ran out / insurance' },
  { id: 'other', label: 'Other' },
];

export const holdReasonLabel = id => HOLD_REASONS.find(r => r.id === id)?.label || 'Other';

export function getHoldLog() {
  const list = loadFromStorage(HOLD_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function recordHoldStart(medId, name, reason, start = todayKey()) {
  const list = getHoldLog();
  list.push({ id: 'hold_' + Date.now(), medId, name, start, reason });
  saveToStorage(HOLD_KEY, list);
}

export function recordHoldEnd(medId, end = todayKey()) {
  const list = getHoldLog().map(h => (h.medId === medId && !h.end ? { ...h, end } : h));
  saveToStorage(HOLD_KEY, list);
}

// Holds that overlap the last `days` days, newest first.
export function recentHolds(days = 90) {
  const cutoff = addDays(todayKey(), -days);
  return getHoldLog().filter(h => !h.end || h.end >= cutoff).sort((a, b) => (a.start < b.start ? 1 : -1));
}

/* =====================================================================
   RheumCompanion — care-team report
   One place that gathers what a patient shares with their care team, so
   the PDF flowsheet and the plain-text version (for patient-portal
   messages) always say the same thing. Everything is read from this
   device; nothing is sent anywhere until the patient picks a destination
   in the share sheet.
   ===================================================================== */
import { getScoresEntries, getJointEntries, fmtStiffMin, jointLabel, jointPattern, JOINTS_28, JOINTS_68 } from './assessments';
import { weatherReportLines, getWeatherPrefs } from './weather';
import { photosForReport, photoCount } from './photoVault';
import { getTrackerData } from './tracker';
import { getMyMeds } from './myMeds';
import { getMedicationById } from '../data/medications';
import {
  describeSchedule, getSchedule, needsAnchor, nextDue, getDoseLog, recentHolds,
  holdReasonLabel, siteLabel, fmtShort, daysBetween, addDays, todayKey, toKey,
} from './medSchedule';
import { loadFromStorage, saveToStorage } from './storage';

export const REPORT_RANGES = [
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 180, label: '6 months' },
];

export const REPORT_SECTIONS = [
  { id: 'scores', label: 'Symptom scores', hint: 'pain, global, fatigue, morning stiffness' },
  { id: 'joints', label: 'Joint counts', hint: 'tender and swollen, 28- or 68-joint map' },
  { id: 'meds', label: 'Medications', hint: 'schedule, doses, injection sites, holds' },
  { id: 'tracker', label: 'Daily tracker', hint: 'averages, rash days, your notes' },
  { id: 'photos', label: 'Flare photos', hint: 'photos you marked to share, PDF only' },
  { id: 'weather', label: 'Weather and symptoms', hint: 'pressure, humidity and pain patterns' },
];

const ALL = { scores: true, joints: true, meds: true, tracker: true, photos: true, weather: true };
const PREFS_KEY = 'care_report_prefs';

// The note and choices are remembered as a draft so a patient can add to them before the visit.
export function getReportPrefs() {
  const p = loadFromStorage(PREFS_KEY, {});
  return {
    days: REPORT_RANGES.some(r => r.days === p.days) ? p.days : 30,
    include: { ...ALL, ...(p.include || {}) },
    note: typeof p.note === 'string' ? p.note : '',
  };
}

export function saveReportPrefs(prefs) {
  saveToStorage(PREFS_KEY, prefs);
}

const medName = m => getMedicationById(m.id)?.genericName || m.name || m.id;
const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');
const round1 = n => Math.round(n * 10) / 10;
const isoDay = iso => toKey(new Date(iso));

// Joint counts for an entry in its own set: 28, or 68 tender / 66 swollen.
export function jointCountText(e) {
  return e.set === 68 ? `tender ${e.tjc68}/68, swollen ${e.sjc66}/66 (28-joint: ${e.tjc28}/${e.sjc28})` : `tender ${e.tjc28}/28, swollen ${e.sjc28}/28`;
}

export const entryPattern = e => jointPattern(e.joints || {}, e.set || 28);

function jointSummary(entry) {
  return (entry.set === 68 ? JOINTS_68 : JOINTS_28).filter(j => entry.joints[j] && (entry.joints[j].t || entry.joints[j].s))
    .map(j => jointLabel(j) + (entry.joints[j].t && entry.joints[j].s ? ' (T+S)' : entry.joints[j].t ? ' (T)' : ' (S)'));
}

function collectMeds(since, days) {
  const meds = getMyMeds();
  const log = getDoseLog();
  const rows = meds.map(m => {
    const mine = log.filter(d => d.medId === m.id);
    const last = mine[mine.length - 1];
    return {
      name: medName(m),
      schedule: describeSchedule(m),
      lastDose: last ? last.date : null,
      nextDue: needsAnchor(getSchedule(m)) && !m.hold ? nextDue(m) : null,
      hold: m.hold ? { since: m.hold.since, reason: holdReasonLabel(m.hold.reason).toLowerCase() } : null,
    };
  });
  const doses = meds.map(m => {
    const recent = log.filter(d => d.medId === m.id && d.date >= since);
    if (!recent.length) return null;
    return { name: medName(m), count: recent.length, sites: recent.filter(d => d.site).map(d => siteLabel(d.site, true)) };
  }).filter(Boolean);
  const holds = recentHolds(days).map(h => {
    const n = daysBetween(h.start, h.end || todayKey());
    const span = h.end
      ? fmtShort(h.start) + ' – ' + fmtShort(h.end) + ', ' + plural(n, 'day')
      : 'since ' + fmtShort(h.start) + ', ongoing' + (n > 0 ? ' (' + plural(n, 'day') + ')' : '');
    return h.name + ' held ' + span + ' – ' + holdReasonLabel(h.reason).toLowerCase();
  });
  return { rows, doses, holds };
}

function collectTracker(since) {
  const entries = getTrackerData().filter(e => typeof e.date === 'string' && e.date >= since);
  if (!entries.length) return { days: 0, avgs: {}, rashDays: 0, notes: [] };
  const avgs = {};
  for (const k of ['pain', 'stiffness', 'fatigue', 'swelling']) {
    const vals = entries.map(e => Number(e[k])).filter(v => !Number.isNaN(v));
    if (vals.length) avgs[k[0].toUpperCase() + k.slice(1)] = round1(vals.reduce((a, b) => a + b, 0) / vals.length);
  }
  const notes = entries
    .filter(e => (e.notes && e.notes.trim()) || (e.triggers && e.triggers.trim()))
    .map(e => ({
      date: e.date,
      text: [e.notes?.trim(), e.triggers?.trim() ? 'Possible triggers: ' + e.triggers.trim() : null].filter(Boolean).join(' · '),
    }))
    .slice(-6);
  return { days: entries.length, avgs, rashDays: entries.filter(e => e.rash).length, notes };
}

export function collectReport({ days = 30, include = ALL, note = '' } = {}) {
  const today = todayKey();
  const since = addDays(today, -days);
  const scores = getScoresEntries().filter(e => isoDay(e.date) >= since);
  const joints = getJointEntries().filter(e => isoDay(e.date) >= since);
  return {
    generated: today,
    since,
    days,
    note: note.trim(),
    scores: include.scores ? scores : null,
    joints: include.joints ? joints : null,
    meds: include.meds ? collectMeds(since, days) : null,
    tracker: include.tracker ? collectTracker(since) : null,
    weather: include.weather ? weatherReportLines(days) : null,
    photos: null,        // filled in by attachPhotos() (photos live in IndexedDB, which is async)
    photoCount: 0,
    wantPhotos: !!include.photos,
  };
}

export async function attachPhotos(r, { images = true } = {}) {
  if (!r.wantPhotos) return r;
  try {
    r.photoCount = await photoCount(r.since);
    if (images) r.photos = await photosForReport(r.since);
  } catch { /* photo storage unavailable: leave the section out */ }
  return r;
}

// What's available, so the share screen can show counts next to each section.
export function sectionCounts(days) {
  const r = collectReport({ days });
  return {
    scores: plural(r.scores.length, 'check-in'),
    joints: plural(r.joints.length, 'joint map'),
    meds: plural(r.meds.rows.length, 'medication'),
    tracker: plural(r.tracker.days, 'day') + ' logged',
    photos: '',
    weather: getWeatherPrefs().enabled ? getWeatherPrefs().place : 'off (turn on in Weather & Symptoms)',
  };
}

export const rangeLabel = r => fmtShort(r.since) + ' – ' + fmtShort(r.generated) + ', ' + r.generated.slice(0, 4);

/* ---------- plain text, for patient-portal messages and email ---------- */
export function reportToText(r) {
  const L = [];
  const head = t => { L.push(''); L.push(t.toUpperCase()); };
  L.push('RHEUMCOMPANION VISIT SUMMARY');
  L.push(`Patient-entered data, last ${r.days} days (${rangeLabel(r)}). Not a medical record.`);

  if (r.note) { head('Note for my care team'); L.push(r.note); }

  if (r.scores) {
    head('Symptom scores (0-10)');
    if (!r.scores.length) L.push('No check-ins in this period.');
    r.scores.slice(-10).forEach(e => L.push(
      `${fmtShort(isoDay(e.date))}: pain ${e.pain}, patient global ${e.ptGlobal}, fatigue ${e.fatigue}, ` +
      `stiffness ${e.stiffSev}, morning stiffness ${fmtStiffMin(e.stiffMin)}`));
  }

  if (r.joints) {
    head('Joint counts');
    if (!r.joints.length) L.push('No joint maps in this period.');
    r.joints.slice(-6).forEach(e => L.push(`${fmtShort(isoDay(e.date))}: ${jointCountText(e)}`));
    const latest = r.joints[r.joints.length - 1];
    if (latest) {
      L.push('Latest pattern: ' + entryPattern(latest).text);
      if (jointSummary(latest).length) L.push('Latest joints: ' + jointSummary(latest).join(', '));
    }
  }

  if (r.meds) {
    head('Medications');
    if (!r.meds.rows.length) L.push('No medications listed.');
    r.meds.rows.forEach(m => L.push(`- ${m.name}: ${m.schedule}.` +
      (m.lastDose ? ` Last dose ${fmtShort(m.lastDose)}.` : '') +
      (m.nextDue ? ` Next due ${fmtShort(m.nextDue)}.` : '') +
      (m.hold ? ` ON HOLD since ${fmtShort(m.hold.since)} (${m.hold.reason}).` : '')));
    if (r.meds.doses.length) {
      L.push('Doses logged: ' + r.meds.doses.map(d => `${d.name} ${d.count}` + (d.sites.length ? ` (${d.sites.join(', ')})` : '')).join('; '));
    }
    if (r.meds.holds.length) L.push('Holds: ' + r.meds.holds.join('; '));
  }

  if (r.tracker) {
    head('Daily tracker');
    if (!r.tracker.days) L.push('No tracker entries in this period.');
    else {
      L.push(`${plural(r.tracker.days, 'day')} logged. Averages: ` +
        Object.entries(r.tracker.avgs).map(([k, v]) => `${k.toLowerCase()} ${v}/10`).join(', ') +
        (r.tracker.rashDays ? `. Rash on ${plural(r.tracker.rashDays, 'day')}.` : '.'));
      r.tracker.notes.forEach(n => L.push(`${fmtShort(n.date)}: ${n.text}`));
    }
  }

  if (r.weather) {
    head('Weather and symptoms' + (r.weather.place ? ` (${r.weather.place})` : ''));
    r.weather.lines.forEach(l => L.push(l));
  }

  if (r.wantPhotos && r.photoCount) {
    head('Flare photos');
    L.push(`${plural(r.photoCount, 'photo')} in this period. Photos are included in the PDF version only.`);
  }

  L.push('');
  L.push('Shared from the RheumCompanion app.');
  return L.join('\n');
}

/* ---------- share helpers: OS share sheet on native, download/clipboard on web ---------- */
async function isNative() {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch { return false; }
}

// Returns 'shared' (share sheet opened), 'copied' (web clipboard) or 'manual' (clipboard blocked).
export async function shareReportText(r) {
  const text = reportToText(await attachPhotos(r, { images: false }));
  if (await isNative()) {
    const { Share } = await import('@capacitor/share');
    await Share.share({ title: 'My RheumCompanion summary', text, dialogTitle: 'Send to your care team' });
    return 'shared';
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'manual';
  }
}

export async function shareReportPdf(r) {
  const { buildFlowsheetPdf } = await import('./flowsheet');
  const doc = buildFlowsheetPdf(await attachPhotos(r));
  const fname = 'RheumCompanion-Summary-' + r.generated + '.pdf';
  if (await isNative()) {
    /* Write to app cache, then open the OS share sheet: the patient
       chooses Files, iCloud, Drive, email, print — their storage. */
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const base64 = doc.output('datauristring').split(',')[1];
    const file = await Filesystem.writeFile({ path: fname, data: base64, directory: Directory.Cache });
    await Share.share({
      title: 'RheumCompanion summary',
      text: 'My symptom and medication summary for my care team.',
      url: file.uri,
      dialogTitle: 'Save or send your summary',
    });
    return 'shared';
  }
  doc.save(fname);
  return 'downloaded';
}

export { jointSummary, isoDay, plural };

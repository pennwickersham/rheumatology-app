/* =====================================================================
   RheumCompanion — PDF flowsheet
   Builds a clinician-scannable summary (one page, or two when the
   medication list is long) of patient-reported scores (pain, patient
   global, fatigue, morning stiffness severity and duration), 28-joint
   counts, the medication schedule with logged doses, injection sites and
   holds, and (if available) 30-day tracker averages, then hands the file
   to the patient:
     - Native (Capacitor): writes to app cache and opens the OS share
       sheet, so the patient can save to Files / iCloud / Google Drive /
       email — THEIR storage, not ours. No app-side cloud.
     - Web: downloads the PDF directly.
   Dependency: jspdf  (npm i jspdf)
   ===================================================================== */
import { jsPDF } from 'jspdf';
import { getScoresEntries, getJointEntries, fmtStiffMin, jointLabel, JOINTS_28 }
  from './assessments';
import { getMyMeds } from './myMeds';
import { getMedicationById } from '../data/medications';
import {
  describeSchedule, getSchedule, needsAnchor, nextDue, getDoseLog, recentHolds,
  holdReasonLabel, siteLabel, fmtShort, daysBetween, addDays, todayKey,
} from './medSchedule';

/* ---------- optional tracker adapter ----------
   The flowsheet will include 30-day symptom averages if it can find
   tracker data. Wire your existing tracker explicitly (preferred):
     import { setTrackerDataProvider } from '../utils/flowsheet';
     setTrackerDataProvider(() => ({ avgs:{Pain:4.2,...}, flareDays:3, meds:['MTX'] }));
   Otherwise a best-effort localStorage scan runs, and the section is
   skipped gracefully if nothing usable is found. */
let trackerProvider = null;
export function setTrackerDataProvider(fn) { trackerProvider = fn; }

function scanTrackerFallback() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!/rheum/i.test(k) || !/track/i.test(k)) continue;
      const data = JSON.parse(localStorage.getItem(k));
      const entries = Array.isArray(data) ? data
        : (data && Array.isArray(data.entries) ? data.entries : null);
      if (!entries || !entries.length) continue;
      const cutoff = Date.now() - 30 * 864e5;
      const recent = entries.filter(e => {
        const d = new Date(e.date || e.day || e.timestamp || 0).getTime();
        return d > cutoff;
      });
      if (!recent.length) continue;
      const sums = {}, counts = {};
      const SYMS = ['pain', 'stiffness', 'fatigue', 'swelling', 'rash'];
      for (const e of recent) {
        const src = e.symptoms || e;
        for (const s of SYMS) {
          const v = Number(src[s]);
          if (!Number.isNaN(v) && src[s] != null) {
            sums[s] = (sums[s] || 0) + v; counts[s] = (counts[s] || 0) + 1;
          }
        }
      }
      const avgs = {};
      for (const s of Object.keys(sums)) {
        avgs[s[0].toUpperCase() + s.slice(1)] = Math.round(sums[s] / counts[s] * 10) / 10;
      }
      if (Object.keys(avgs).length) return { avgs, days: recent.length };
    }
  } catch { /* tracker format unknown — skip section */ }
  return null;
}

/* ---------- drawing helpers ---------- */
const INK = '#1a2233', SUB = '#5a6478', LINE = '#c9d1e0', ACC = '#2f6fd0';

function sparkline(doc, x, y, w, h, values, max) {
  if (values.length < 2) return;
  doc.setDrawColor(LINE); doc.setLineWidth(0.6);
  doc.line(x, y + h, x + w, y + h);
  doc.setDrawColor(ACC); doc.setLineWidth(1.2);
  const step = w / (values.length - 1);
  let px = x, py = y + h - (values[0] / max) * h;
  for (let i = 1; i < values.length; i++) {
    const nx = x + i * step, ny = y + h - (values[i] / max) * h;
    doc.line(px, py, nx, ny); px = nx; py = ny;
  }
  doc.setFillColor(ACC);
  doc.circle(px, py, 1.6, 'F');
}

const fmtDate = iso => new Date(iso).toLocaleDateString(undefined,
  { month: 'short', day: 'numeric' });

const medName = m => getMedicationById(m.id)?.genericName || m.name || m.id;
const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');

/* Medication rows plus 30-day dose/site and 90-day hold summaries. */
function medicationSection(doc, M, W, y, ensure) {
  const meds = getMyMeds();
  y = ensure(y, 40);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(INK);
  doc.text('Medications — schedule, doses and holds', M, y);
  y += 14;
  if (!meds.length) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(SUB);
    doc.text('No medications listed in My Medications.', M, y);
    return y + 12;
  }

  const cols = [M, M + 115, M + 300, M + 368, M + 436];
  doc.setFontSize(8.5); doc.setTextColor(SUB); doc.setFont('helvetica', 'bold');
  ['Medication', 'Schedule', 'Last dose', 'Next due', 'Status'].forEach((h, i) => doc.text(h, cols[i], y));
  y += 4; doc.setDrawColor(LINE); doc.line(M, y, M + W, y); y += 11;

  const log = getDoseLog();
  for (const m of meds) {
    const sched = doc.splitTextToSize(describeSchedule(m), cols[2] - cols[1] - 8).slice(0, 2);
    y = ensure(y, sched.length * 10 + 2);
    const s = getSchedule(m);
    const mine = log.filter(d => d.medId === m.id);
    const last = mine[mine.length - 1];
    const due = needsAnchor(s) && !m.hold ? nextDue(m) : null;
    doc.setFont('helvetica', 'bold'); doc.setTextColor(INK);
    doc.text(doc.splitTextToSize(medName(m), cols[1] - cols[0] - 6)[0], cols[0], y);
    doc.setFont('helvetica', 'normal');
    doc.text(sched, cols[1], y);
    doc.text(last ? fmtShort(last.date) : '—', cols[2], y);
    doc.text(due ? fmtShort(due) : '—', cols[3], y);
    if (m.hold) {
      doc.setFont('helvetica', 'bold'); doc.setTextColor('#b42318');
      doc.text('HELD since ' + fmtShort(m.hold.since), cols[4], y);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(INK);
    } else {
      doc.text('Active', cols[4], y);
    }
    y += sched.length * 10 + 2;
  }

  /* doses and injection sites, last 30 days */
  const since30 = addDays(todayKey(), -30);
  const doseParts = meds.map(m => {
    const recent = log.filter(d => d.medId === m.id && d.date >= since30);
    if (!recent.length) return null;
    const sites = recent.filter(d => d.site).map(d => siteLabel(d.site, true));
    return medName(m) + ' ' + recent.length + (sites.length ? ' (' + sites.join(', ') + ')' : '');
  }).filter(Boolean);

  doc.setFontSize(8.5); doc.setTextColor(SUB);
  if (doseParts.length) {
    const lines = doc.splitTextToSize('Doses logged, last 30 days: ' + doseParts.join(' · '), W);
    y = ensure(y + 2, lines.length * 10);
    doc.text(lines, M, y); y += lines.length * 10;
  }

  /* holds overlapping the last 90 days */
  const holds = recentHolds(90).map(h => {
    const days = daysBetween(h.start, h.end || todayKey());
    const span = h.end
      ? fmtShort(h.start) + ' – ' + fmtShort(h.end) + ', ' + plural(days, 'day')
      : 'since ' + fmtShort(h.start) + ', ongoing' + (days > 0 ? ' (' + plural(days, 'day') + ')' : '');
    return h.name + ' held ' + span + ' – ' + holdReasonLabel(h.reason).toLowerCase();
  });
  if (holds.length) {
    const lines = doc.splitTextToSize('Holds, last 90 days: ' + holds.join('; '), W);
    y = ensure(y + 2, lines.length * 10);
    doc.setTextColor(INK);
    doc.text(lines, M, y); y += lines.length * 10;
  }
  return y + 2;
}

/* ---------- main builder ---------- */
export function buildFlowsheetPdf() {
  const sc = getScoresEntries();
  const jm = getJointEntries();
  const tracker = trackerProvider ? trackerProvider() : scanTrackerFallback();

  const doc = new jsPDF({ unit: 'pt', format: 'letter' });   // 612 x 792
  const M = 46, W = 612 - 2 * M;
  let y = 50;
  /* start a new page when `need` points would run into the footer */
  const ensure = (yy, need) => {
    if (yy + need <= 730) return yy;
    doc.addPage();
    return 50;
  };

  /* header */
  doc.setTextColor(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(17);
  doc.text('RheumCompanion — Patient Flowsheet', M, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(SUB);
  y += 15;
  doc.text('Patient-reported data, entered by the patient in the RheumCompanion app. ' +
    'Generated ' + new Date().toLocaleDateString() + '.', M, y);
  y += 12;
  doc.text('App content reviewed by Pendleton B. Wickersham, MD, Rheumatologist \u00B7 ' +
    'brewsterwickershampublications.com', M, y);
  y += 10; doc.setDrawColor(LINE); doc.setLineWidth(1); doc.line(M, y, M + W, y);
  y += 20;

  /* section 1 — patient-reported scores */
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(INK);
  doc.text('Patient-reported scores (0\u201310)', M, y);
  if (sc.length) {
    const recent = sc.slice(-8);
    sparkline(doc, M + 430, y - 9, 90, 26, recent.map(e => e.pain), 10);
    doc.setFontSize(7); doc.setTextColor(SUB);
    doc.text('pain trend', M + 430, y + 24);
    y += 14;
    doc.setFontSize(8.5); doc.setTextColor(SUB); doc.setFont('helvetica', 'bold');
    const cols = [M, M + 70, M + 130, M + 205, M + 270, M + 345];
    ['Date', 'Pain', 'Pt global', 'Fatigue', 'Stiffness', 'AM stiffness']
      .forEach((h, i) => doc.text(h, cols[i], y));
    y += 4; doc.setDrawColor(LINE); doc.line(M, y, M + W, y); y += 11;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(INK);
    for (const e of recent) {
      doc.text(fmtDate(e.date), cols[0], y);
      doc.setFont('helvetica', 'bold');
      doc.text(String(e.pain), cols[1], y);
      doc.setFont('helvetica', 'normal');
      doc.text(String(e.ptGlobal), cols[2], y);
      doc.text(String(e.fatigue), cols[3], y);
      doc.text(String(e.stiffSev), cols[4], y);
      doc.text(fmtStiffMin(e.stiffMin), cols[5], y);
      y += 12;
    }
    doc.setFontSize(7.5); doc.setTextColor(SUB);
    doc.text('Pain: 0 none \u2013 10 worst \u00B7 Pt global: 0 very well \u2013 10 very poorly \u00B7 ' +
      'Fatigue: 0 none \u2013 10 exhausted \u00B7 AM stiffness = duration on a typical morning', M, y);
    y += 12;
  } else {
    y += 14; doc.setFontSize(9); doc.setTextColor(SUB);
    doc.text('No symptom check-ins recorded yet.', M, y); y += 12;
  }
  y += 14;

  /* section 2 — joint counts */
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(INK);
  doc.text('Joint counts (28-joint set)', M, y);
  if (jm.length) {
    const recent = jm.slice(-8);
    sparkline(doc, M + 430, y - 9, 90, 26, recent.map(e => e.tjc28), 28);
    y += 14;
    doc.setFontSize(8.5); doc.setTextColor(SUB); doc.setFont('helvetica', 'bold');
    const cols = [M, M + 90, M + 190];
    ['Date', 'Tender (TJC28)', 'Swollen (SJC28)'].forEach((h, i) => doc.text(h, cols[i], y));
    y += 4; doc.setDrawColor(LINE); doc.line(M, y, M + 300, y); y += 11;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(INK);
    for (const e of recent) {
      doc.text(fmtDate(e.date), cols[0], y);
      doc.text(String(e.tjc28), cols[1], y);
      doc.text(String(e.sjc28), cols[2], y);
      y += 12;
    }
    /* latest involved joints, wrapped */
    const latest = jm[jm.length - 1];
    const involved = JOINTS_28.filter(j => latest.joints[j] &&
      (latest.joints[j].t || latest.joints[j].s))
      .map(j => jointLabel(j) +
        (latest.joints[j].t && latest.joints[j].s ? ' (T+S)'
          : latest.joints[j].t ? ' (T)' : ' (S)'));
    if (involved.length) {
      y += 2; doc.setFontSize(8.5); doc.setTextColor(SUB);
      const lines = doc.splitTextToSize(
        'Latest (' + fmtDate(latest.date) + '): ' + involved.join(', '), W);
      doc.text(lines.slice(0, 3), M, y);
      y += Math.min(lines.length, 3) * 10;
    }
  } else {
    y += 14; doc.setFontSize(9); doc.setTextColor(SUB);
    doc.text('No joint map entries recorded yet.', M, y); y += 12;
  }
  y += 14;

  /* section 3 — medications */
  y = medicationSection(doc, M, W, y, ensure);
  y += 14;

  /* section 4 — tracker 30-day summary (optional) */
  if (tracker && tracker.avgs && Object.keys(tracker.avgs).length) {
    y = ensure(y, 50);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(INK);
    doc.text('Symptom tracker — last 30 days', M, y); y += 14;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(INK);
    const parts = Object.entries(tracker.avgs)
      .map(([k, v]) => k + ' avg ' + v + '/10');
    if (tracker.days) parts.push(tracker.days + ' days logged');
    if (tracker.flareDays != null) parts.push(tracker.flareDays + ' flare day(s)');
    doc.text(doc.splitTextToSize(parts.join('  \u00B7  '), W), M, y);
    y += 14;
    if (tracker.meds && tracker.meds.length) {
      doc.setTextColor(SUB); doc.setFontSize(8.5);
      doc.text(doc.splitTextToSize('Medications logged: ' + tracker.meds.join(', '), W), M, y);
      y += 12;
    }
    y += 8;
  }

  /* footer, on every page */
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(LINE); doc.line(M, 742, M + W, 742);
    doc.setFontSize(7.5); doc.setTextColor(SUB);
    doc.text('Patient-entered data for discussion with the care team. Not a medical record and not medical advice. ' +
      'RheumCompanion \u00B7 from the author of The Resilient Path.', M, 754);
    if (pages > 1) doc.text('Page ' + p + ' of ' + pages, M + W, 766, { align: 'right' });
  }

  return doc;
}

/* ---------- export: share sheet on native, download on web ---------- */
export async function exportFlowsheet() {
  const doc = buildFlowsheetPdf();
  const fname = 'RheumCompanion-Flowsheet-' +
    new Date().toISOString().slice(0, 10) + '.pdf';

  let isNative = false;
  try {
    const { Capacitor } = await import('@capacitor/core');
    isNative = Capacitor.isNativePlatform();
  } catch { /* web build without capacitor core */ }

  if (isNative) {
    /* Write to app cache, then open the OS share sheet: the patient
       chooses Files, iCloud, Drive, email, print — their storage. */
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const base64 = doc.output('datauristring').split(',')[1];
    const file = await Filesystem.writeFile({
      path: fname, data: base64, directory: Directory.Cache,
    });
    await Share.share({
      title: 'RheumCompanion flowsheet',
      text: 'My symptom flowsheet for my next appointment.',
      url: file.uri,
      dialogTitle: 'Save or send your flowsheet',
    });
  } else {
    doc.save(fname);   // browser download
  }
  return fname;
}

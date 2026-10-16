/* =====================================================================
   RheumCompanion — PDF flowsheet
   Renders a care-team report (utils/careReport.js) as a clinician-
   scannable PDF: the patient's note, patient-reported scores, 28-joint
   counts, the medication schedule with logged doses, injection sites and
   holds, and the daily tracker summary. One page in the common case; a
   second page is added when there is more to show.
   Sharing (share sheet on native, download on web) lives in careReport.js.
   Dependency: jspdf  (npm i jspdf)
   ===================================================================== */
import { jsPDF } from 'jspdf';
import { fmtStiffMin, JOINTS_28, JOINTS_68 } from './assessments';
import { fmtShort } from './medSchedule';
import { collectReport, rangeLabel, jointSummary, entryPattern, isoDay, plural } from './careReport';
import { signLabel } from './photoVault';
import {
  BODY_W, BODY_POINTS, BODY_SIZE, BODY_HEAD, BODY_LINES, HAND_W, FOOT_W, handGeometry, footGeometry,
} from '../data/jointGeometry';

/* ---------- drawing helpers ---------- */
const INK = '#1a2233', SUB = '#5a6478', LINE = '#c9d1e0', ACC = '#2f6fd0', HOLD = '#b42318';
const M = 46, W = 612 - 2 * M, TOP = 50, BOTTOM = 730;

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

const day = iso => fmtShort(isoDay(iso));

/* ---------- joint diagram (same geometry as the on-screen map) ---------- */
const TENDER = '#e8590c', SWOLLEN = '#2f6fd0', FIGURE = '#d5dbe6';

function polyline(doc, line, ox, oy, k, closed = false) {
  const p = line.map(([x, y]) => [ox + x * k, oy + y * k]);
  for (let i = 1; i < p.length; i++) doc.line(p[i - 1][0], p[i - 1][1], p[i][0], p[i][1]);
  if (closed) doc.line(p[p.length - 1][0], p[p.length - 1][1], p[0][0], p[0][1]);
}

function jointDot(doc, x, y, r, st) {
  if (st && st.s) { doc.setFillColor(SWOLLEN); doc.circle(x, y, r, 'F'); }
  doc.setLineWidth(st && st.t ? 1.1 : 0.4);
  doc.setDrawColor(st && st.t ? TENDER : '#9aa5b8');
  doc.circle(x, y, st && st.t ? r + 0.5 : r, 'S');
}

// Draws the latest joint map with its top-left at (x0, y0); returns the y just below it.
function drawJointDiagram(doc, entry, x0, y0) {
  const set = entry.set === 68 ? 68 : 28;
  const ids = new Set(set === 68 ? JOINTS_68 : JOINTS_28);
  const joints = entry.joints || {};

  const kb = 0.36;
  const top = set === 68 ? 0 : 40, bodyH = (set === 68 ? 400 : 270) * kb;
  const ox = x0, oy = y0 - top * kb;
  doc.setDrawColor(FIGURE); doc.setLineWidth(0.8);
  doc.circle(ox + BODY_HEAD.cx * kb, oy + BODY_HEAD.cy * kb, BODY_HEAD.r * kb, 'S');
  BODY_LINES.forEach(l => polyline(doc, l, ox, oy, kb));
  for (const [id, [x, y]] of Object.entries(BODY_POINTS)) {
    if (!ids.has(id)) continue;
    const small = BODY_SIZE[id.replace(/_[LR]$/, '')];
    jointDot(doc, ox + x * kb, oy + y * kb, small ? 1.8 : 3, joints[id]);
  }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(SUB);
  doc.text('R', x0 + 4, y0 + 6); doc.text('L', x0 + BODY_W * kb - 8, y0 + 6);

  const kh = 0.27, hx = x0 + BODY_W * kb + 6, gap = 3;
  let hy = y0;
  ['R', 'L'].forEach((side, i) => {
    const g = handGeometry(side, set);
    const hox = hx + i * (HAND_W * kh + gap), hoy = y0 - g.view[1] * kh;
    doc.setDrawColor(FIGURE); doc.setLineWidth(0.6);
    polyline(doc, g.palm, hox, hoy, kh, true);
    g.fingers.forEach(f => polyline(doc, f, hox, hoy, kh));
    for (const [id, [x, y]] of Object.entries(g.points)) jointDot(doc, hox + x * kh, hoy + y * kh, 1.9, joints[id]);
    doc.text(side === 'R' ? 'Right hand' : 'Left hand', hox + 2, y0 + g.view[3] * kh + 7);
    hy = y0 + g.view[3] * kh + 12;
  });
  if (set === 68) {
    ['R', 'L'].forEach((side, i) => {
      const g = footGeometry(side);
      const fox = hx + i * (FOOT_W * kh + gap), foy = hy - g.view[1] * kh;
      doc.setDrawColor(FIGURE); doc.setLineWidth(0.6);
      polyline(doc, g.sole, fox, foy, kh, true);
      g.toes.forEach(t => polyline(doc, t, fox, foy, kh));
      for (const [id, [x, y]] of Object.entries(g.points)) jointDot(doc, fox + x * kh, foy + y * kh, 1.9, joints[id]);
      doc.text(side === 'R' ? 'Right foot' : 'Left foot', fox + 2, hy + g.view[3] * kh + 7);
    });
    hy += 140 * kh + 12;
  }

  const legendY = Math.max(y0 + bodyH, hy) + 6;
  doc.setLineWidth(1.1); doc.setDrawColor(TENDER); doc.circle(x0 + 3, legendY - 2, 2.4, 'S');
  doc.text('tender', x0 + 8, legendY);
  doc.setFillColor(SWOLLEN); doc.circle(x0 + 40, legendY - 2, 2.4, 'F');
  doc.text('swollen', x0 + 45, legendY);
  doc.text('Latest map, ' + set + '-joint set', x0 + 82, legendY);
  return legendY + 8;
}

/* ---------- main builder ---------- */
export function buildFlowsheetPdf(report = collectReport()) {
  const r = report;
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });   // 612 x 792
  let y = TOP;

  /* start a new page when `need` points would run into the footer */
  const ensure = need => { if (y + need > BOTTOM) { doc.addPage(); y = TOP; } };
  const title = text => {
    ensure(44);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(INK);
    doc.text(text, M, y);
  };
  const empty = text => {
    y += 14; doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(SUB);
    doc.text(text, M, y); y += 12;
  };
  const para = (text, { size = 8.5, color = SUB, maxLines = 99, width = W } = {}) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(size); doc.setTextColor(color);
    const lines = doc.splitTextToSize(text, width).slice(0, maxLines);
    ensure(lines.length * (size + 1.5));
    doc.text(lines, M, y);
    y += lines.length * (size + 1.5);
  };
  const header = (cols, labels, width = W) => {
    doc.setFontSize(8.5); doc.setTextColor(SUB); doc.setFont('helvetica', 'bold');
    labels.forEach((h, i) => doc.text(h, cols[i], y));
    y += 4; doc.setDrawColor(LINE); doc.setLineWidth(1); doc.line(M, y, M + width, y); y += 11;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(INK);
  };

  /* header */
  doc.setTextColor(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(17);
  doc.text('RheumCompanion — Patient Summary', M, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(SUB);
  y += 15;
  doc.text('Patient-reported data, entered by the patient in the RheumCompanion app. Covers the last ' +
    r.days + ' days (' + rangeLabel(r) + ').', M, y);
  y += 12;
  doc.text('App content reviewed by Pendleton B. Wickersham, MD, Rheumatologist · ' +
    'brewsterwickershampublications.com', M, y);
  y += 10; doc.setDrawColor(LINE); doc.setLineWidth(1); doc.line(M, y, M + W, y);
  y += 20;

  /* patient's note */
  if (r.note) {
    title('Note from the patient');
    y += 13;
    para(r.note, { size: 9.5, color: INK, maxLines: 12 });
    y += 12;
  }

  /* patient-reported scores */
  if (r.scores) {
    title('Patient-reported scores (0–10)');
    if (r.scores.length) {
      const recent = r.scores.slice(-8);
      sparkline(doc, M + 430, y - 9, 90, 26, recent.map(e => e.pain), 10);
      doc.setFontSize(7); doc.setTextColor(SUB);
      doc.text('pain trend', M + 430, y + 24);
      y += 14;
      const cols = [M, M + 70, M + 130, M + 205, M + 270, M + 345];
      header(cols, ['Date', 'Pain', 'Pt global', 'Fatigue', 'Stiffness', 'AM stiffness']);
      for (const e of recent) {
        doc.text(day(e.date), cols[0], y);
        doc.setFont('helvetica', 'bold');
        doc.text(String(e.pain), cols[1], y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(e.ptGlobal), cols[2], y);
        doc.text(String(e.fatigue), cols[3], y);
        doc.text(String(e.stiffSev), cols[4], y);
        doc.text(fmtStiffMin(e.stiffMin), cols[5], y);
        y += 12;
      }
      para((r.scores.length > recent.length ? 'Latest ' + recent.length + ' of ' + plural(r.scores.length, 'check-in') + ' in this period. ' : '') +
        'Pain: 0 none – 10 worst · Pt global: 0 very well – 10 very poorly · ' +
        'Fatigue: 0 none – 10 exhausted · AM stiffness = duration on a typical morning', { size: 7.5 });
    } else {
      empty('No symptom check-ins in this period.');
    }
    y += 14;
  }

  /* joint counts, with a body diagram of the latest map */
  if (r.joints) {
    if (r.joints.length) {
      const recent = r.joints.slice(-8);
      const latest = r.joints[r.joints.length - 1];
      ensure(190);
      title('Joint counts');
      const top = y + 6;
      y += 14;
      const cols = [M, M + 58, M + 124, M + 192];
      header(cols, ['Date', 'Tender', 'Swollen', 'Pattern'], 300);
      for (const e of recent) {
        doc.text(day(e.date), cols[0], y);
        doc.text(e.set === 68 ? e.tjc68 + '/68' : e.tjc28 + '/28', cols[1], y);
        doc.text(e.set === 68 ? e.sjc66 + '/66' : e.sjc28 + '/28', cols[2], y);
        doc.text(entryPattern(e).extent, cols[3], y);
        y += 12;
      }
      y += 2;
      para('Latest pattern: ' + entryPattern(latest).text, { color: INK, width: 300, maxLines: 3 });
      const involved = jointSummary(latest);
      if (involved.length) para('Latest joints: ' + involved.join(', '), { maxLines: 5, width: 300 });
      para('Pattern = count of marked joints and left/right match; descriptive, not a diagnosis.', { size: 7, width: 300 });
      y = Math.max(y, drawJointDiagram(doc, latest, M + 318, top));
    } else {
      title('Joint counts');
      empty('No joint map entries in this period.');
    }
    y += 14;
  }

  /* medications */
  if (r.meds) {
    title('Medications — schedule, doses and holds');
    y += 14;
    if (r.meds.rows.length) {
      const cols = [M, M + 115, M + 300, M + 368, M + 436];
      header(cols, ['Medication', 'Schedule', 'Last dose', 'Next due', 'Status']);
      for (const m of r.meds.rows) {
        const sched = doc.splitTextToSize(m.schedule, cols[2] - cols[1] - 8).slice(0, 2);
        ensure(sched.length * 10 + 2);
        doc.setFont('helvetica', 'bold'); doc.setTextColor(INK);
        doc.text(doc.splitTextToSize(m.name, cols[1] - cols[0] - 6)[0], cols[0], y);
        doc.setFont('helvetica', 'normal');
        doc.text(sched, cols[1], y);
        doc.text(m.lastDose ? fmtShort(m.lastDose) : '—', cols[2], y);
        doc.text(m.nextDue ? fmtShort(m.nextDue) : '—', cols[3], y);
        if (m.hold) {
          doc.setFont('helvetica', 'bold'); doc.setTextColor(HOLD);
          doc.text('HELD since ' + fmtShort(m.hold.since), cols[4], y);
          doc.setFont('helvetica', 'normal'); doc.setTextColor(INK);
        } else {
          doc.text('Active', cols[4], y);
        }
        y += sched.length * 10 + 2;
      }
      if (r.meds.doses.length) {
        y += 2;
        para('Doses logged in this period: ' + r.meds.doses.map(d =>
          d.name + ' ' + d.count + (d.sites.length ? ' (' + d.sites.join(', ') + ')' : '')).join(' · '));
      }
      if (r.meds.holds.length) {
        y += 2;
        para('Holds: ' + r.meds.holds.join('; '), { color: INK });
      }
    } else {
      y -= 14;
      empty('No medications listed in My Medications.');
    }
    y += 14;
  }

  /* daily tracker */
  if (r.tracker) {
    title('Daily symptom tracker');
    y += 14;
    if (r.tracker.days) {
      const parts = Object.entries(r.tracker.avgs).map(([k, v]) => k + ' avg ' + v + '/10');
      parts.push(plural(r.tracker.days, 'day') + ' logged');
      if (r.tracker.rashDays) parts.push('rash on ' + plural(r.tracker.rashDays, 'day'));
      para(parts.join('  ·  '), { size: 9, color: INK });
      if (r.tracker.notes.length) {
        y += 4;
        for (const n of r.tracker.notes) para(fmtShort(n.date) + ': ' + n.text, { maxLines: 2 });
      }
    } else {
      y -= 14;
      empty('No tracker entries in this period.');
    }
    y += 14;
  }

  /* weather and symptoms */
  if (r.weather) {
    title('Weather and symptoms' + (r.weather.place ? ' — ' + r.weather.place : ''));
    y += 14;
    for (const l of r.weather.lines) para(l.trim(), { color: l.startsWith('  ') ? SUB : INK });
    para('Associations within the patient’s own records, not evidence of cause.', { size: 7 });
    y += 14;
  }

  /* flare photos (only those the patient marked for sharing) */
  if (r.photos && r.photos.length) {
    const gap = 12, cw = (W - 2 * gap) / 3, ch = cw * 0.75, rowH = ch + 30;
    ensure(rowH + 24);
    title('Flare photos');
    y += 10;
    r.photos.forEach((p, i) => {
      const col = i % 3;
      if (col === 0 && i) y += rowH;
      if (col === 0) ensure(rowH);
      const x = M + col * (cw + gap);
      const k = Math.min(cw / p.w, ch / p.h), w = p.w * k, h = p.h * k;
      doc.setFillColor('#f3f5f9'); doc.rect(x, y, cw, ch, 'F');
      doc.addImage(p.dataUrl, 'JPEG', x + (cw - w) / 2, y + (ch - h) / 2, w, h);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(INK);
      doc.text(doc.splitTextToSize(fmtShort(p.date) + ' · ' + signLabel(p.sign), cw)[0], x, y + ch + 10);
      if (p.note) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(SUB);
        doc.text(doc.splitTextToSize(p.note, cw)[0], x, y + ch + 20);
      }
    });
    y += rowH;
  }

  /* footer, on every page */
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(LINE); doc.setLineWidth(1); doc.line(M, 742, M + W, 742);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(SUB);
    doc.text('Patient-entered data for discussion with the care team. Not a medical record and not medical advice. ' +
      'RheumCompanion · from the author of The Resilient Path.', M, 754);
    if (pages > 1) doc.text('Page ' + p + ' of ' + pages, M + W, 766, { align: 'right' });
  }

  return doc;
}

/* =====================================================================
   RheumCompanion - Appointment summary PDF
   Builds a multi-page summary for a rheumatology visit from data already
   on the device: My Medications, the last 30 days of the symptom tracker
   (scores, flares, triggers, notes), recent scores/joint counts, and the
   list of uploaded labs/tests/imaging (photos are embedded; PDFs listed).
   Generated entirely on the device with jsPDF; handed to the patient via
   the share sheet (native) or a download (web). No server involved.
   ===================================================================== */
import { jsPDF } from 'jspdf';
import { sharePdf } from './flowsheet';
import { getTrackerData } from './tracker';
import { getMyMeds } from './myMeds';
import { getMedicationById } from '../data/medications';
import { getScoresEntries, getJointEntries, fmtStiffMin } from './assessments';
import {
  getDocuments, getDocumentData, typeLabel, isImage, isPdf, formatDocDate, todayLocal,
} from './documents';

const INK = '#1a2233', SUB = '#5a6478', LINE = '#c9d1e0';
const PAGE_W = 612, PAGE_H = 792, M = 46, W = PAGE_W - 2 * M;
const BOTTOM = 730;            // keep clear of the footer
const DAYS = 30;
const FLARE_LEVEL = 7;         // pain or stiffness at/above this counts as a flare day

/* jsPDF's built-in fonts only cover Latin-1; swap common typographic
   characters and drop anything else (e.g. emoji) so text never garbles. */
const SWAP = {
  '\u2018': "'", '\u2019': "'", '\u201C': '"', '\u201D': '"',
  '\u2013': '-', '\u2014': '-', '\u2026': '...', '\u2022': '-', '\u00A0': ' ',
};
const clean = s => String(s ?? '')
  .replace(/[\u2018\u2019\u201C\u201D\u2013\u2014\u2026\u2022\u00A0]/g, c => SWAP[c])
  .replace(/[\t\r]/g, ' ')
  .replace(/[^\n -~\u00A1-\u00FF]/g, '')
  .trim();

const fmtShort = iso => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

function daysAgoLocal(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const avg = (list, f) => {
  const vals = list.map(f).filter(v => typeof v === 'number' && !Number.isNaN(v));
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : null;
};

/* Downscale a photo so the PDF stays a reasonable size to email. */
function loadImage(dataUrl, maxDim = 1400) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);   // flatten transparency
      ctx.drawImage(img, 0, 0, w, h);
      resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.82), w, h });
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/* ---------- page/layout helpers ---------- */
function makeWriter(doc) {
  let y = 50;
  const w = {
    get y() { return y; },
    set y(v) { y = v; },
    ensure(h) {
      if (y + h > BOTTOM) { doc.addPage(); y = 50; }
    },
    heading(text) {
      w.ensure(40);
      y += 6;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12.5); doc.setTextColor(INK);
      doc.text(text, M, y);
      y += 5; doc.setDrawColor(LINE); doc.setLineWidth(0.8); doc.line(M, y, M + W, y);
      y += 14;
    },
    para(text, { size = 9.5, color = INK, bold = false, indent = 0, gap = 3 } = {}) {
      doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(color);
      const lh = size * 1.3;
      for (const line of doc.splitTextToSize(clean(text), W - indent)) {
        w.ensure(lh);
        doc.text(line, M + indent, y);
        y += lh;
      }
      y += gap;
    },
    muted(text) { w.para(text, { size: 9, color: SUB }); },
    table(headers, cols, rows, { size = 9 } = {}) {
      const head = () => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(SUB);
        headers.forEach((h, i) => doc.text(h, M + cols[i], y));
        y += 4; doc.setDrawColor(LINE); doc.setLineWidth(0.6); doc.line(M, y, M + W, y); y += 11;
      };
      w.ensure(30); head();
      doc.setFont('helvetica', 'normal'); doc.setFontSize(size); doc.setTextColor(INK);
      for (const row of rows) {
        // Wrap the last column if it is long (titles); other columns are short values
        const lastW = W - cols[cols.length - 1];
        const lastLines = doc.splitTextToSize(clean(row[row.length - 1]), lastW);
        const h = Math.max(1, lastLines.length) * size * 1.3;
        if (y + h > BOTTOM) {
          doc.addPage(); y = 50; head();
          doc.setFont('helvetica', 'normal'); doc.setFontSize(size); doc.setTextColor(INK);
        }
        row.slice(0, -1).forEach((cell, i) => doc.text(clean(cell), M + cols[i], y));
        doc.text(lastLines, M + cols[cols.length - 1], y);
        y += h;
      }
      y += 6;
    },
  };
  return w;
}

/* ---------- builder ---------- */
export async function buildAppointmentPdf() {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });   // 612 x 792
  const w = makeWriter(doc);

  /* header */
  doc.setTextColor(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(17);
  doc.text('RheumCompanion \u2014 Appointment Summary', M, w.y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(SUB);
  w.y += 15;
  doc.text('Patient-reported information entered in the RheumCompanion app. Generated ' +
    new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) + '.', M, w.y);
  w.y += 10; doc.setDrawColor(LINE); doc.setLineWidth(1); doc.line(M, w.y, M + W, w.y);
  w.y += 12;

  /* 1 \u2014 medications */
  w.heading('Current medications');
  const meds = getMyMeds().map(m => getMedicationById(m.id)?.genericName || m.name || m.id);
  if (meds.length) meds.forEach(n => w.para('\u00B7 ' + n, { gap: 0 }));
  else w.muted('No medications listed in My Medications.');
  w.y += 4;

  /* 2 \u2014 tracker, last 30 days */
  const cutoff = daysAgoLocal(DAYS - 1);
  const entries = getTrackerData().filter(e => e && e.date >= cutoff).sort((a, b) => b.date.localeCompare(a.date));
  w.heading(`Symptom tracker \u2014 last ${DAYS} days`);
  if (!entries.length) {
    w.muted(`No symptom tracker entries in the last ${DAYS} days.`);
  } else {
    const flareDays = entries.filter(e => (e.pain || 0) >= FLARE_LEVEL || (e.stiffness || 0) >= FLARE_LEVEL).length;
    const rashDays = entries.filter(e => e.rash).length;
    const parts = [
      ['Pain', avg(entries, e => e.pain)], ['Stiffness', avg(entries, e => e.stiffness)],
      ['Fatigue', avg(entries, e => e.fatigue)], ['Swelling', avg(entries, e => e.swelling)],
    ].filter(([, v]) => v != null).map(([k, v]) => `${k} avg ${v}/10`);
    w.para(`${entries.length} day(s) logged \u00B7 ${flareDays} flare day(s) (pain or stiffness ${FLARE_LEVEL}+/10) \u00B7 ${rashDays} day(s) with rash`, { bold: true, gap: 2 });
    w.para(parts.join('  \u00B7  '), { gap: 2 });
    const customKeys = [...new Set(entries.flatMap(e => Object.keys(e.custom || {})))];
    if (customKeys.length) {
      w.para('Other symptoms: ' + customKeys.map(k => `${k} avg ${avg(entries, e => e.custom?.[k])}/10`).join(', '), { color: SUB });
    }
    w.y += 4;

    w.table(['Date', 'Pain', 'Stiffness', 'Fatigue', 'Swelling', 'Rash'], [0, 90, 150, 225, 295, 370],
      entries.map(e => [formatDocDate(e.date), String(e.pain ?? 0), String(e.stiffness ?? 0),
        String(e.fatigue ?? 0), String(e.swelling ?? 0), e.rash ? 'Yes' : 'No']));

    const notes = entries.filter(e => e.triggers || e.medications || e.notes);
    if (notes.length) {
      w.ensure(30);
      w.para('Triggers, treatments and notes', { bold: true, size: 10, gap: 4 });
      for (const e of notes) {
        w.para(formatDocDate(e.date), { bold: true, size: 9, gap: 1 });
        if (e.triggers) w.para('Triggers: ' + e.triggers, { size: 9, indent: 10, gap: 1 });
        if (e.medications) w.para('Medications/treatments: ' + e.medications, { size: 9, indent: 10, gap: 1 });
        if (e.notes) w.para('Notes: ' + e.notes, { size: 9, indent: 10, gap: 1 });
        w.y += 4;
      }
    }
  }

  /* 3 \u2014 scores and joint counts (My Scores) */
  const sc = getScoresEntries().slice(-5).reverse();
  const jm = getJointEntries().slice(-5).reverse();
  if (sc.length || jm.length) {
    w.heading('Recent scores and joint counts');
    if (sc.length) {
      w.table(['Date', 'Pain', 'Pt global', 'Fatigue', 'Stiffness', 'AM stiffness'], [0, 90, 150, 225, 295, 370],
        sc.map(e => [fmtShort(e.date), String(e.pain), String(e.ptGlobal), String(e.fatigue), String(e.stiffSev), fmtStiffMin(e.stiffMin)]));
    }
    if (jm.length) {
      w.table(['Date', 'Tender joints (of 28)', 'Swollen joints (of 28)'], [0, 90, 250],
        jm.map(e => [fmtShort(e.date), String(e.tjc28), String(e.sjc28)]));
    }
  }

  /* 4 \u2014 labs, tests and imaging */
  const docs = getDocuments();
  w.heading('Labs, tests and imaging');
  if (!docs.length) {
    w.muted('No labs, tests or imaging uploaded.');
  } else {
    w.table(['Date', 'Type', 'File', 'Title'], [0, 90, 150, 200],
      docs.map(d => [formatDocDate(d.date), typeLabel(d.type), isPdf(d) ? 'PDF' : 'Image', d.title]));
    if (docs.some(isPdf)) {
      w.muted('PDF files are listed here but not included in this summary. Share them from the Labs & Imaging screen if needed.');
    }
  }

  /* 5 \u2014 attached photos, each scaled to fit */
  const images = [];
  for (const d of docs.filter(isImage)) {
    const base64 = await getDocumentData(d.id);
    const img = base64 ? await loadImage(`data:${d.mimeType};base64,${base64}`) : null;
    images.push({ d, img });
  }
  if (images.length) {
    doc.addPage(); w.y = 50;
    w.heading('Attached images');
    for (const { d, img } of images) {
      const caption = `${typeLabel(d.type)} \u00B7 ${formatDocDate(d.date)} \u00B7 ${d.title}`;
      if (!img) {
        w.ensure(30);
        w.para(caption, { bold: true, size: 10, gap: 1 });
        w.muted('This image could not be added (file missing or unsupported format).');
        continue;
      }
      const maxH = BOTTOM - 50 - 40;
      const scale = Math.min(W / img.w, maxH / img.h);
      const iw = img.w * scale, ih = img.h * scale;
      w.ensure(ih + 30);
      w.para(caption, { bold: true, size: 10, gap: 2 });
      doc.addImage(img.dataUrl, 'JPEG', M, w.y, iw, ih);
      w.y += ih + 18;
    }
  }

  /* footer + page numbers on every page */
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(LINE); doc.setLineWidth(0.8); doc.line(M, 742, M + W, 742);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(SUB);
    doc.text('Patient-entered data for discussion with the care team. Not a medical record and not medical advice.', M, 754);
    doc.text(`Page ${i} of ${pages}`, M + W, 754, { align: 'right' });
  }
  return doc;
}

/* ---------- export: share sheet on native, download on web ---------- */
export async function exportAppointmentPdf() {
  const doc = await buildAppointmentPdf();
  const fname = `RheumCompanion-Appointment-Summary-${todayLocal()}.pdf`;
  await sharePdf(doc, fname, {
    title: 'RheumCompanion appointment summary',
    text: 'My summary for my rheumatology appointment.',
    dialogTitle: 'Save or send your appointment summary',
  });
  return fname;
}

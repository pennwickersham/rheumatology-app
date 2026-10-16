/* =====================================================================
   RheumCompanion — flare photo vault
   Photos of short-lived signs (rash, dactylitis, nail changes, livedo,
   swelling) kept ONLY on this device, in IndexedDB. Nothing is uploaded;
   a photo leaves the phone only inside a summary the patient shares.
   Every image is re-drawn through a canvas before it is stored, which
   downsizes it and drops EXIF metadata such as GPS location.
   ===================================================================== */
import { todayKey } from './medSchedule';

const DB_NAME = 'rheumcompanion-photos';
const STORE = 'photos';
const FULL_PX = 1600;
const THUMB_PX = 360;

export const SIGNS = [
  { id: 'malar-rash', label: 'Malar (butterfly) rash' },
  { id: 'rash', label: 'Other rash' },
  { id: 'joint-swelling', label: 'Joint swelling' },
  { id: 'dactylitis', label: 'Sausage finger or toe (dactylitis)' },
  { id: 'nails', label: 'Nail changes (pitting, lifting)' },
  { id: 'livedo', label: 'Lacy skin pattern (livedo)' },
  { id: 'raynaud', label: "Color change (Raynaud's)" },
  { id: 'ulcer', label: 'Mouth or skin ulcer' },
  { id: 'eye', label: 'Red or irritated eye' },
  { id: 'other', label: 'Other' },
];

export const signLabel = id => SIGNS.find(s => s.id === id)?.label || 'Other';

export const photosSupported = () => typeof indexedDB !== 'undefined';

let dbPromise = null;
function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { dbPromise = null; reject(req.error); };
    });
  }
  return dbPromise;
}

async function tx(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const result = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(result?.result ?? result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

/* ---------- image processing ---------- */
async function loadBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* fall back */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function encode(source, maxPx, quality) {
  const sw = source.width, sh = source.height;
  const scale = Math.min(1, maxPx / Math.max(sw, sh));
  const w = Math.round(sw * scale), h = Math.round(sh * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(source, 0, 0, w, h);
  return new Promise((resolve, reject) => canvas.toBlob(
    b => (b ? resolve({ blob: b, w, h }) : reject(new Error('Could not process this image.'))), 'image/jpeg', quality));
}

/* ---------- CRUD ---------- */
// meta: { date: 'YYYY-MM-DD', sign, note, share }
export async function addPhoto(file, meta = {}) {
  const bitmap = await loadBitmap(file);
  const full = await encode(bitmap, FULL_PX, 0.82);
  const thumb = await encode(bitmap, THUMB_PX, 0.75);
  bitmap.close?.();
  const rec = {
    id: 'ph_' + Date.now(),
    ts: Date.now(),
    date: meta.date || todayKey(),
    sign: meta.sign || 'other',
    note: (meta.note || '').trim(),
    share: meta.share !== false,
    w: full.w, h: full.h,
    blob: full.blob,
    thumb: thumb.blob,
  };
  await tx('readwrite', s => s.put(rec));
  return rec;
}

export async function listPhotos() {
  if (!photosSupported()) return [];
  const all = await tx('readonly', s => s.getAll());
  return (all || []).sort((a, b) => (a.date === b.date ? b.ts - a.ts : a.date < b.date ? 1 : -1));
}

export async function updatePhoto(id, patch) {
  const rec = await tx('readonly', s => s.get(id));
  if (!rec) return null;
  const next = { ...rec, ...patch };
  await tx('readwrite', s => s.put(next));
  return next;
}

export async function deletePhoto(id) {
  await tx('readwrite', s => s.delete(id));
}

export async function deleteAllPhotos() {
  if (!photosSupported()) return;
  await tx('readwrite', s => s.clear());
}

const toDataUrl = blob => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(r.error);
  r.readAsDataURL(blob);
});

// Photos the patient marked for sharing, taken on or after `since`, oldest first.
export async function photosForReport(since, max = 6) {
  const list = (await listPhotos()).filter(p => p.share !== false && p.date >= since).slice(0, max).reverse();
  return Promise.all(list.map(async p => ({
    date: p.date, sign: p.sign, note: p.note, w: p.w, h: p.h, dataUrl: await toDataUrl(p.blob),
  })));
}

export async function photoCount(since) {
  return (await listPhotos()).filter(p => p.share !== false && p.date >= since).length;
}

// src/utils/documents.js
// Lab results, tests and imaging the patient uploads. Everything stays on this device:
//   - the list (title, date, type) lives in localStorage like the rest of the app's data
//   - the file itself goes to app-private storage: Capacitor Filesystem (Directory.Data)
//     in the installed app, IndexedDB in a browser (localStorage is too small for scans).
// Nothing here is uploaded anywhere.
import { Capacitor } from '@capacitor/core';
import { saveToStorage, loadFromStorage } from './storage';

const KEY = 'documents';
const NATIVE_DIR = 'documents';
const IDB_NAME = 'rheum_app_documents';
const IDB_STORE = 'files';

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const ACCEPTED_TYPES = 'image/*,application/pdf';

export const DOCUMENT_TYPES = [
  { key: 'lab', label: 'Lab' },
  { key: 'test', label: 'Test' },
  { key: 'imaging', label: 'Imaging' },
];

export const typeLabel = key => DOCUMENT_TYPES.find(t => t.key === key)?.label || 'Other';
export const isImage = doc => /^image\//.test(doc?.mimeType || '');
export const isPdf = doc => doc?.mimeType === 'application/pdf';

const isNative = () => Capacitor.isNativePlatform();

/* ---------- list (metadata) ---------- */
export function getDocuments() {
  const list = loadFromStorage(KEY, []);
  if (!Array.isArray(list)) return [];
  // Newest first by document date, then by when it was added
  return [...list].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0));
}

function saveList(list) {
  saveToStorage(KEY, list);
}

/* ---------- file bytes ---------- */
function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idb(mode, fn) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, mode);
      const req = fn(tx.objectStore(IDB_STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

async function writeFileData(id, base64) {
  if (isNative()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    await Filesystem.writeFile({ path: `${NATIVE_DIR}/${id}`, data: base64, directory: Directory.Data, recursive: true });
  } else {
    await idb('readwrite', store => store.put(base64, id));
  }
}

// Returns the file as base64 (no data: prefix), or null if it is not on this device.
export async function getDocumentData(id) {
  try {
    if (isNative()) {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { data } = await Filesystem.readFile({ path: `${NATIVE_DIR}/${id}`, directory: Directory.Data });
      return typeof data === 'string' ? data : await blobToBase64(data);
    }
    const data = await idb('readonly', store => store.get(id));
    return typeof data === 'string' ? data : null;
  } catch {
    return null;
  }
}

async function deleteFileData(id) {
  try {
    if (isNative()) {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      await Filesystem.deleteFile({ path: `${NATIVE_DIR}/${id}`, directory: Directory.Data });
    } else {
      await idb('readwrite', store => store.delete(id));
    }
  } catch { /* already gone */ }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export function base64ToBlob(base64, mimeType) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

/* ---------- public API ---------- */
export async function addDocument({ title, date, type, file }) {
  if (!file) throw new Error('Choose a file to upload.');
  const mimeType = file.type || (/\.pdf$/i.test(file.name) ? 'application/pdf' : '');
  if (!/^image\//.test(mimeType) && mimeType !== 'application/pdf') {
    throw new Error('Please choose a photo/image or a PDF file.');
  }
  if (file.size > MAX_FILE_BYTES) throw new Error('That file is larger than 20 MB.');

  const id = 'doc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  await writeFileData(id, await blobToBase64(file));

  const rec = {
    id,
    title: title.trim() || file.name || 'Untitled',
    date,
    type: DOCUMENT_TYPES.some(t => t.key === type) ? type : 'lab',
    mimeType,
    fileName: file.name || '',
    size: file.size,
    createdAt: Date.now(),
  };
  saveList([...getDocuments(), rec]);
  return rec;
}

export async function deleteDocument(id) {
  await deleteFileData(id);
  saveList(getDocuments().filter(d => d.id !== id));
}

// Installed app: hand the file to the OS share sheet so the patient can open it in a
// viewer or save it to their own storage. The copy goes to the app cache, not a server.
export async function shareDocument(doc, base64) {
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');
  const ext = isPdf(doc) ? 'pdf' : (doc.mimeType.split('/')[1] || 'jpg').replace('jpeg', 'jpg').replace(/[^a-z0-9]/gi, '');
  const safe = (doc.title || 'document').replace(/[^a-z0-9 _-]/gi, '').trim().replace(/\s+/g, '-').slice(0, 40) || 'document';
  const file = await Filesystem.writeFile({ path: `${safe}.${ext}`, data: base64, directory: Directory.Cache });
  await Share.share({ title: doc.title, url: file.uri, dialogTitle: 'Open or save this file' });
}

export function formatDocDate(yyyyMmDd) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd || '')) return yyyyMmDd || '';
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

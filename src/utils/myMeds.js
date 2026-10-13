import { loadFromStorage, saveToStorage } from './storage';

// "My Medications": [{ id, name?, time? }]
// id matches a medication in data/medications.js; name is used for custom entries.
const KEY = 'my_meds';

export function getMyMeds() {
  const list = loadFromStorage(KEY, []);
  return Array.isArray(list) ? list : [];
}

export function isInMyMeds(id) {
  return getMyMeds().some(m => m.id === id);
}

export function addMyMed(id, extra = {}) {
  const list = getMyMeds();
  if (list.some(m => m.id === id)) return list;
  const next = [...list, { id, ...extra }];
  saveToStorage(KEY, next);
  return next;
}

export function updateMyMed(id, patch) {
  const next = getMyMeds().map(m => (m.id === id ? { ...m, ...patch } : m));
  saveToStorage(KEY, next);
  return next;
}

export function removeMyMed(id) {
  const next = getMyMeds().filter(m => m.id !== id);
  saveToStorage(KEY, next);
  return next;
}

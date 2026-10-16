import { loadFromStorage, saveToStorage } from './storage';
import { getDosingPreset } from '../data/dosingPresets';
import { todayKey, needsAnchor, recordHoldStart, recordHoldEnd } from './medSchedule';

// "My Medications": [{ id, name?, time?, schedule?, route?, folate?, hold? }]
// id matches a medication in data/medications.js; name is used for custom entries.
// Schedule fields are described in utils/medSchedule.js.
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
  const preset = getDosingPreset(id);
  const entry = { id, ...extra };
  if (preset) {
    entry.route = preset.route;
    if (preset.schedule) {
      entry.schedule = { ...preset.schedule };
      if (needsAnchor(preset.schedule)) entry.schedule.next = todayKey();
    }
  }
  const next = [...list, entry];
  saveToStorage(KEY, next);
  return next;
}

export function updateMyMed(id, patch) {
  const next = getMyMeds().map(m => (m.id === id ? { ...m, ...patch } : m));
  saveToStorage(KEY, next);
  return next;
}

export function removeMyMed(id) {
  if (getMyMeds().find(m => m.id === id)?.hold) recordHoldEnd(id);
  const next = getMyMeds().filter(m => m.id !== id);
  saveToStorage(KEY, next);
  return next;
}

export function holdMyMed(id, name, reason) {
  recordHoldStart(id, name, reason);
  return updateMyMed(id, { hold: { since: todayKey(), reason } });
}

export function resumeMyMed(id) {
  recordHoldEnd(id);
  return updateMyMed(id, { hold: undefined });
}

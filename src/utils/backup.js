import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// Only user-created data is backed up. Auth/subscription tokens are excluded.
const BACKUP_PREFIXES = ['rheum_app_', 'rheum_assess_'];
const BACKUP_VERSION = 1;

export function buildBackup() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && BACKUP_PREFIXES.some(p => key.startsWith(p))) {
      data[key] = localStorage.getItem(key);
    }
  }
  return { app: 'RheumCompanion', version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data };
}

export async function exportBackup() {
  const json = JSON.stringify(buildBackup(), null, 2);
  const filename = `rheumcompanion-backup-${new Date().toISOString().slice(0, 10)}.json`;

  if (Capacitor.isNativePlatform()) {
    await Filesystem.writeFile({ path: filename, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 });
    const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
    await Share.share({ title: 'RheumCompanion backup', url: uri, dialogTitle: 'Save your backup' });
    return filename;
  }

  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
  return filename;
}

export function importBackup(text) {
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new Error('That file is not a valid backup.'); }
  if (parsed?.app !== 'RheumCompanion' || typeof parsed.data !== 'object' || parsed.data === null) {
    throw new Error('That file is not a RheumCompanion backup.');
  }
  let count = 0;
  for (const [key, value] of Object.entries(parsed.data)) {
    if (BACKUP_PREFIXES.some(p => key.startsWith(p)) && typeof value === 'string') {
      localStorage.setItem(key, value);
      count++;
    }
  }
  return count;
}

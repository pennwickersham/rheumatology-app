import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { saveToStorage, loadFromStorage } from './storage';

// One repeating daily notification for the symptom tracker check-in.
// Medication reminders (reminders.js) own ids 4100-4199, so this uses its own id.
const CHECKIN_ID = 4200;
const KEY = 'checkin_reminder';
export const CHECKIN_ROUTE = '/tracker';

const DEFAULTS = { enabled: false, time: '19:00' };

export const checkinReminderSupported = () => Capacitor.isNativePlatform();

export function getCheckinReminder() {
  const saved = loadFromStorage(KEY, DEFAULTS);
  return { ...DEFAULTS, ...(saved && typeof saved === 'object' ? saved : {}) };
}

async function cancelCheckin() {
  await LocalNotifications.cancel({ notifications: [{ id: CHECKIN_ID }] });
}

async function scheduleCheckin(time) {
  const [hour, minute] = time.split(':').map(Number);
  await cancelCheckin();
  await LocalNotifications.schedule({
    notifications: [{
      id: CHECKIN_ID,
      title: 'Rheum Companion',
      // Generic text: nothing health-specific appears on the lock screen.
      body: 'Time for your daily check-in.',
      schedule: { on: { hour, minute }, allowWhileIdle: true },
      extra: { route: CHECKIN_ROUTE },
    }],
  });
}

// Turn the reminder on (asks for notification permission) or change its time.
export async function enableCheckinReminder(time) {
  if (!checkinReminderSupported()) return { ok: false, reason: 'Reminders work in the installed app.' };
  if (!/^\d{2}:\d{2}$/.test(time || '')) return { ok: false, reason: 'Choose a reminder time.' };
  try {
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') {
      saveToStorage(KEY, { enabled: false, time });
      return { ok: false, reason: 'Notification permission was not granted. You can allow it in your phone settings.' };
    }
    await scheduleCheckin(time);
    saveToStorage(KEY, { enabled: true, time });
    return { ok: true };
  } catch (e) {
    console.error('Check-in reminder error:', e);
    return { ok: false, reason: 'Could not schedule the reminder on this device.' };
  }
}

export async function disableCheckinReminder() {
  const { time } = getCheckinReminder();
  saveToStorage(KEY, { enabled: false, time });
  if (!checkinReminderSupported()) return { ok: true };
  try {
    await cancelCheckin();
    return { ok: true };
  } catch (e) {
    console.error('Check-in reminder cancel error:', e);
    return { ok: false, reason: 'Could not cancel the reminder on this device.' };
  }
}

// On app start: if the reminder is on but missing (e.g. restored from a backup on a new
// phone), schedule it again. Never prompts for permission.
export async function ensureCheckinReminder() {
  const { enabled, time } = getCheckinReminder();
  if (!enabled || !checkinReminderSupported()) return;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') return;
    const { notifications } = await LocalNotifications.getPending();
    if (!notifications.some(n => n.id === CHECKIN_ID)) await scheduleCheckin(time);
  } catch (e) {
    console.error('Check-in reminder restore error:', e);
  }
}

// Calls onRoute(path) when the user taps one of our notifications. Returns a cleanup function.
export function listenForNotificationTaps(onRoute) {
  if (!checkinReminderSupported()) return () => {};
  const sub = LocalNotifications.addListener('localNotificationActionPerformed', ({ notification }) => {
    const route = notification?.extra?.route;
    if (typeof route === 'string' && route.startsWith('/')) onRoute(route);
  });
  return () => { sub.then(l => l.remove()); };
}

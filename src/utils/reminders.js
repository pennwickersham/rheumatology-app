import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

// Reminder text is intentionally generic so no drug names appear on a lock screen.
const BASE_ID = 4100;

export const remindersSupported = () => Capacitor.isNativePlatform();

export async function syncReminders(list) {
  if (!remindersSupported()) return { ok: false, reason: 'Reminders work in the installed app.' };
  try {
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return { ok: false, reason: 'Notification permission was not granted.' };

    const pending = await LocalNotifications.getPending();
    const ours = pending.notifications.filter(n => n.id >= BASE_ID && n.id < BASE_ID + 100);
    if (ours.length) await LocalNotifications.cancel({ notifications: ours.map(n => ({ id: n.id })) });

    const notifications = [];
    list.forEach((m, idx) => {
      if (!m.time || !/^\d{2}:\d{2}$/.test(m.time)) return;
      const [hour, minute] = m.time.split(':').map(Number);
      notifications.push({
        id: BASE_ID + idx,
        title: 'Rheum Companion',
        body: 'Time to take your medication.',
        schedule: { on: { hour, minute }, allowWhileIdle: true },
      });
    });
    if (notifications.length) await LocalNotifications.schedule({ notifications });
    return { ok: true, count: notifications.length };
  } catch (e) {
    console.error('Reminder error:', e);
    return { ok: false, reason: 'Could not schedule reminders on this device.' };
  }
}

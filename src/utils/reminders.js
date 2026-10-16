import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import {
  getSchedule, getRoute, isWeeklyMethotrexate, upcomingDoses, addDays, fromKey,
} from './medSchedule';

// Reminder text is intentionally generic so no drug names appear on a lock screen.
// Each medication gets a block of SLOTS ids: 0-15 for its own doses, 16-22 for folic acid.
const BASE_ID = 4100;
const SLOTS = 25;
const MAX_MEDS = 40;
const FOLATE_SLOT = 16;
const TITLE = 'Rheum Companion';

// Daily and weekly reminders repeat on their own. Longer intervals are scheduled as
// one-off dates, topped up each time the app opens or the list changes. Counts stay
// small because iOS keeps at most 64 pending notifications per app.
const ONE_OFF_HORIZON_DAYS = 200;
const ONE_OFF_MAX = { infusion: 3, other: 6 };

export const remindersSupported = () => Capacitor.isNativePlatform();

const atTime = (key, hour, minute) => {
  const d = fromKey(key);
  d.setHours(hour, minute, 0, 0);
  return d;
};

// Capacitor weekdays run Sunday = 1 … Saturday = 7.
const capWeekday = key => fromKey(key).getDay() + 1;

export function buildNotifications(list, now = new Date()) {
  const notifications = [];
  list.slice(0, MAX_MEDS).forEach((m, idx) => {
    if (m.hold || !m.time || !/^\d{2}:\d{2}$/.test(m.time)) return;
    const [hour, minute] = m.time.split(':').map(Number);
    const s = getSchedule(m);
    const route = getRoute(m);
    const base = BASE_ID + idx * SLOTS;
    const push = (slot, body, schedule) => notifications.push({
      id: base + slot, title: TITLE, body, schedule: { ...schedule, allowWhileIdle: true },
    });

    if (s.unit === 'day') {
      push(0, 'Time to take your medication.', { on: { hour, minute } });
    } else if (s.unit === 'week' && s.every === 1 && s.next && route !== 'infusion') {
      push(0, route === 'injection' ? 'Your injection is due today.' : 'Your weekly medication is due today.',
        { on: { weekday: capWeekday(s.next), hour, minute } });
    } else if (s.unit === 'week' || s.unit === 'month') {
      let slot = 0;
      for (const d of upcomingDoses(m, { count: ONE_OFF_MAX[route] || ONE_OFF_MAX.other, horizonDays: ONE_OFF_HORIZON_DAYS })) {
        if (route === 'infusion') {
          // Heads-up the day before, so labs, rides and time off can be arranged.
          const before = atTime(addDays(d, -1), hour, minute);
          if (before > now) push(slot++, 'Reminder: you have a treatment appointment tomorrow.', { at: before });
        }
        const at = atTime(d, hour, minute);
        if (at > now) {
          push(slot++, route === 'infusion' ? 'You have a treatment appointment today.'
            : route === 'injection' ? 'Your injection is due today.' : 'Your scheduled medication is due today.', { at });
        }
      }
    }

    if (isWeeklyMethotrexate(m) && s.next && (m.folate === 'dayAfter' || m.folate === 'dailyExcept')) {
      const mtxDay = capWeekday(s.next);
      const days = m.folate === 'dayAfter'
        ? [mtxDay % 7 + 1]
        : [1, 2, 3, 4, 5, 6, 7].filter(w => w !== mtxDay);
      days.forEach((weekday, i) => push(FOLATE_SLOT + i, 'Time for your follow-up supplement.', { on: { weekday, hour, minute } }));
    }
  });
  return notifications;
}

// prompt: ask for notification permission if needed. Startup syncs pass false so the
// app never prompts on launch; they only refresh reminders the user already allowed.
export async function syncReminders(list, { prompt = true } = {}) {
  if (!remindersSupported()) return { ok: false, reason: 'Reminders work in the installed app.' };
  try {
    const perm = prompt ? await LocalNotifications.requestPermissions() : await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') return { ok: false, reason: 'Notification permission was not granted.' };

    const pending = await LocalNotifications.getPending();
    const ours = pending.notifications.filter(n => n.id >= BASE_ID && n.id < BASE_ID + MAX_MEDS * SLOTS);
    if (ours.length) await LocalNotifications.cancel({ notifications: ours.map(n => ({ id: n.id })) });

    const notifications = buildNotifications(list);
    if (notifications.length) await LocalNotifications.schedule({ notifications });
    return { ok: true, count: notifications.length };
  } catch (e) {
    console.error('Reminder error:', e);
    return { ok: false, reason: 'Could not schedule reminders on this device.' };
  }
}

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exportBackup, importBackup } from '../utils/backup';
import { TEXT_SIZES, getTextSize, setTextSize } from '../utils/textSize';
import {
  checkinReminderSupported, getCheckinReminder, enableCheckinReminder, disableCheckinReminder,
} from '../utils/checkinReminder';

export default function Settings() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [msg, setMsg] = useState('');
  const [size, setSize] = useState(() => getTextSize());
  const [reminder, setReminder] = useState(() => getCheckinReminder());
  const [reminderMsg, setReminderMsg] = useState('');
  const [reminderBusy, setReminderBusy] = useState(false);
  const canRemind = checkinReminderSupported();

  const applyReminder = async (enabled, time) => {
    setReminderBusy(true);
    setReminderMsg('');
    const r = enabled ? await enableCheckinReminder(time) : await disableCheckinReminder();
    setReminder(getCheckinReminder());
    if (!r.ok) setReminderMsg(r.reason);
    else setReminderMsg(enabled ? `Daily reminder set for ${formatTime(time)}.` : 'Daily reminder turned off.');
    setReminderBusy(false);
  };

  const onReminderToggle = () => {
    if (!canRemind || reminderBusy) return;
    applyReminder(!reminder.enabled, reminder.time);
  };

  const onReminderTime = (e) => {
    const time = e.target.value;
    if (!time) return;
    if (reminder.enabled) applyReminder(true, time);
    else setReminder(prev => ({ ...prev, time }));
  };

  const onExport = async () => {
    try {
      await exportBackup();
      setMsg('Backup created. Keep it somewhere private — it contains your health notes.');
    } catch (e) {
      console.error(e);
      setMsg('Could not create the backup.');
    }
  };

  const onImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const n = importBackup(await file.text());
      setMsg(`Restored ${n} items. Reopen the app screens to see them.`);
    } catch (err) {
      setMsg(err.message);
    }
  };

  const onSize = (key) => {
    setTextSize(key);
    setSize(key);
  };

  return (
    <div className="page-enter" style={{ paddingBottom: 'var(--space-3xl)' }}>
      <div className="section-header">
        <h1 className="section-header__title" style={{ fontSize: 'var(--font-3xl)' }}>Settings</h1>
      </div>

      <div className="card glass-morphism" style={{ padding: 'var(--space-lg)', display: 'block', marginBottom: 'var(--space-lg)' }}>
        <h2 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--space-sm)' }}>My Medications</h2>
        <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
          Keep a list of what you take, set daily reminders, and check interactions in one tap.
        </p>
        <button className="btn" onClick={() => navigate('/my-medications')}>Open My Medications</button>
      </div>

      <div className="card glass-morphism" style={{ padding: 'var(--space-lg)', display: 'block', marginBottom: 'var(--space-lg)' }}>
        <h2 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--space-sm)' }}>Text size</h2>
        <div role="radiogroup" aria-label="Text size" style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          {Object.entries(TEXT_SIZES).map(([key, cfg]) => (
            <button
              key={key}
              role="radio"
              aria-checked={size === key}
              className={size === key ? 'btn' : 'btn btn--outline'}
              onClick={() => onSize(key)}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card glass-morphism" style={{ padding: 'var(--space-lg)', display: 'block', marginBottom: 'var(--space-lg)' }}>
        <h2 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--space-sm)' }}>Daily check-in reminder</h2>
        <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-md)' }}>
          Get one notification a day to log your symptoms in the tracker. Tap it to open the tracker.
        </p>
        <div
          className="checkbox-wrapper"
          onClick={onReminderToggle}
          style={{ marginBottom: 'var(--space-md)', opacity: canRemind ? 1 : 0.5, cursor: canRemind ? 'pointer' : 'default' }}
        >
          <span id="checkin-toggle-label" style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>Remind me every day</span>
          <input
            type="checkbox"
            role="switch"
            aria-labelledby="checkin-toggle-label"
            checked={reminder.enabled}
            disabled={!canRemind || reminderBusy}
            onChange={() => {}} // Handled by wrapper
            className="checkbox-input"
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-md)', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
          Reminder time
          <input
            type="time"
            value={reminder.time}
            onChange={onReminderTime}
            disabled={!canRemind || reminderBusy}
            className="input-field"
            style={{ width: 'auto', colorScheme: 'dark' }}
          />
        </label>
        {!canRemind && (
          <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-md)' }}>Daily reminders are available in the installed app.</p>
        )}
        {reminderMsg && <p role="status" style={{ fontSize: 'var(--font-sm)', marginTop: 'var(--space-md)', color: 'var(--text-secondary)' }}>{reminderMsg}</p>}
      </div>

      <div className="card glass-morphism" style={{ padding: 'var(--space-lg)', display: 'block' }}>
        <h2 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--space-sm)' }}>Backup and restore</h2>
        <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-md)' }}>
          Your symptom tracker, scores, medication list, and checklists live only on this device. Create a backup before changing phones or reinstalling the app.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <button className="btn" onClick={onExport}>Create backup</button>
          <button className="btn btn--outline" onClick={() => fileRef.current?.click()}>Restore from file</button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={onImport} style={{ display: 'none' }} />
        </div>
        {msg && <p role="status" style={{ fontSize: 'var(--font-sm)', marginTop: 'var(--space-md)', color: 'var(--text-secondary)' }}>{msg}</p>}
      </div>
    </div>
  );
}

function formatTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

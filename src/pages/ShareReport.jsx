import { useState, useMemo, useRef, useEffect } from 'react';
import {
  REPORT_RANGES, REPORT_SECTIONS, getReportPrefs, saveReportPrefs, sectionCounts,
  collectReport, reportToText, shareReportPdf, shareReportText,
} from '../utils/careReport';
import { photoCount } from '../utils/photoVault';
import { addDays, todayKey } from '../utils/medSchedule';

const labelStyle = { fontSize: 'var(--font-sm)', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' };
const mutedStyle = { fontSize: 'var(--font-xs)', color: 'var(--text-muted)' };

export default function ShareReport() {
  const [prefs, setPrefs] = useState(getReportPrefs);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectPreview, setSelectPreview] = useState(false);
  const previewRef = useRef(null);

  // When the browser blocks the clipboard, show the text already selected so it can be copied by hand.
  useEffect(() => {
    if (!selectPreview || !previewRef.current) return;
    const range = document.createRange();
    range.selectNodeContents(previewRef.current);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    previewRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [selectPreview]);

  const update = patch => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    saveReportPrefs(next);
    setStatus('');
  };

  const counts = useMemo(() => sectionCounts(prefs.days), [prefs.days]);
  const [photoN, setPhotoN] = useState(null);
  useEffect(() => {
    let live = true;
    photoCount(addDays(todayKey(), -prefs.days)).then(n => live && setPhotoN(n)).catch(() => live && setPhotoN(0));
    return () => { live = false; };
  }, [prefs.days]);
  const shown = { ...counts, photos: photoN == null ? '…' : `${photoN} photo${photoN === 1 ? '' : 's'} to share` };
  const report = () => collectReport(prefs);
  const nothingSelected = !Object.values(prefs.include).some(Boolean) && !prefs.note.trim();

  const run = async (fn, done) => {
    setBusy(true); setStatus('');
    try {
      const result = await fn(report());
      setStatus(done[result] || '');
      if (result === 'manual') { setShowPreview(true); setSelectPreview(s => !s); }
    } catch (e) {
      // Closing the share sheet without choosing an app is not an error.
      if (!/cancel/i.test(e?.message || '')) setStatus('Could not share: ' + (e?.message || 'unknown error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-enter" style={{ paddingBottom: 'var(--space-3xl)' }}>
      <div className="section-header">
        <h1 className="section-header__title" style={{ fontSize: 'var(--font-3xl)' }}>Share with my care team</h1>
        <p className="section-header__subtitle">One summary of your scores, joints, medications and tracker</p>
      </div>

      <div className="card glass-morphism" style={{ padding: 'var(--space-lg)', display: 'block', marginBottom: 'var(--space-lg)' }}>
        <span style={labelStyle}>Time period</span>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }} role="radiogroup" aria-label="Time period">
          {REPORT_RANGES.map(r => (
            <button
              key={r.days}
              type="button"
              role="radio"
              aria-checked={prefs.days === r.days}
              className={prefs.days === r.days ? 'btn btn--sm' : 'btn btn--outline btn--sm'}
              onClick={() => update({ days: r.days })}
            >
              Last {r.label}
            </button>
          ))}
        </div>

        <span style={{ ...labelStyle, marginTop: 'var(--space-lg)' }}>Include</span>
        {REPORT_SECTIONS.map(s => (
          <label key={s.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px 0', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!!prefs.include[s.id]}
              onChange={e => update({ include: { ...prefs.include, [s.id]: e.target.checked } })}
              style={{ width: '20px', height: '20px', marginTop: '2px', flexShrink: 0 }}
            />
            <span>
              <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-primary)', fontWeight: 600 }}>{s.label}</span>
              <span style={{ ...mutedStyle, display: 'block' }}>{s.hint}{' · '}{shown[s.id]}</span>
            </span>
          </label>
        ))}

        <label htmlFor="care-note" style={{ ...labelStyle, marginTop: 'var(--space-lg)' }}>Note or questions for your visit (optional)</label>
        <textarea
          id="care-note"
          value={prefs.note}
          onChange={e => update({ note: e.target.value })}
          rows={4}
          maxLength={1200}
          placeholder="e.g. Morning stiffness is worse since I held my injection for surgery. Should I restart this week?"
          style={{ width: '100%', padding: '12px', borderRadius: '10px', resize: 'vertical', fontFamily: 'inherit' }}
        />
        <p style={{ ...mutedStyle, marginTop: '4px' }}>Saved on this device as a draft until you change it.</p>
      </div>

      <button
        className="btn btn--primary"
        style={{ width: '100%', padding: '15px' }}
        disabled={busy || nothingSelected}
        onClick={() => run(shareReportPdf, { downloaded: 'PDF downloaded. Print it, or attach it to a patient-portal message or email.', shared: '' })}
      >
        {busy ? 'Preparing…' : 'Share PDF summary'}
      </button>
      <p style={{ ...mutedStyle, margin: '6px 0 var(--space-md)' }}>
        Best for printing, emailing, or attaching to a patient-portal message.
      </p>

      <button
        className="btn btn--outline"
        style={{ width: '100%', padding: '13px' }}
        disabled={busy || nothingSelected}
        onClick={() => run(shareReportText, {
          copied: 'Summary copied. Paste it into your patient-portal message or email.',
          manual: 'Your browser blocked copying. The summary is selected below: copy it, then paste it into your message.',
          shared: '',
        })}
      >
        Share as text
      </button>
      <p style={{ ...mutedStyle, margin: '6px 0 var(--space-md)' }}>
        For portals that only accept typed messages (MyChart and similar): paste it straight into the message box.
      </p>

      {status && <p role="status" style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>{status}</p>}

      <button
        type="button"
        className="btn btn--outline btn--sm"
        onClick={() => setShowPreview(v => !v)}
        aria-expanded={showPreview}
        style={{ marginTop: 'var(--space-sm)' }}
      >
        {showPreview ? 'Hide preview' : 'Preview what will be shared'}
      </button>
      {showPreview && (
        <pre ref={previewRef} style={{
          whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', fontSize: 'var(--font-xs)',
          color: 'var(--text-secondary)', background: 'var(--bg-secondary, rgba(255,255,255,.04))',
          border: '1px solid var(--border, rgba(255,255,255,.1))', borderRadius: '10px', padding: 'var(--space-md)',
          marginTop: 'var(--space-sm)', maxHeight: '420px', overflowY: 'auto',
        }}>
          {reportToText({ ...report(), photoCount: photoN || 0 })}
        </pre>
      )}

      <p style={{ ...mutedStyle, marginTop: 'var(--space-lg)' }}>
        Your health data stays on this device. Sharing opens your phone's share sheet, so you choose exactly where it goes:
        your patient portal, email, Files, iCloud, Google Drive, or print. RheumCompanion never uploads it.
      </p>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Icon } from '../components/Icons';
import {
  DOCUMENT_TYPES, ACCEPTED_TYPES, getDocuments, addDocument, deleteDocument, getDocumentData,
  base64ToBlob, shareDocument, typeLabel, isImage, isPdf, formatDocDate, todayLocal,
} from '../utils/documents';
import { exportAppointmentPdf } from '../utils/appointmentPdf';

const TYPE_COLORS = { lab: '#06b6d4', test: '#8b5cf6', imaging: '#f59e0b' };

function DocumentViewer({ doc, onClose }) {
  const [state, setState] = useState({ loading: true, base64: null, url: null });
  const native = Capacitor.isNativePlatform();

  useEffect(() => {
    let url = null;
    let cancelled = false;
    getDocumentData(doc.id).then(base64 => {
      if (cancelled) return;
      if (base64) url = URL.createObjectURL(base64ToBlob(base64, doc.mimeType));
      setState({ loading: false, base64, url });
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [doc]);

  const onShare = async () => {
    try { await shareDocument(doc, state.base64); } catch (e) { console.error(e); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()} role="dialog" aria-label={doc.title}>
        <div className="modal-panel__handle" />
        <div className="modal-panel__header">
          <div style={{ minWidth: 0 }}>
            <div className="modal-panel__title" style={{ fontSize: 'var(--font-lg)', overflowWrap: 'anywhere' }}>{doc.title}</div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
              {typeLabel(doc.type)} · {formatDocDate(doc.date)}
            </div>
          </div>
          <button className="modal-panel__close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-panel__body">
          {state.loading ? (
            <div className="loading-container"><div className="spinner" /></div>
          ) : !state.base64 ? (
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              This file is not on this device. Uploaded files are not part of backups, so it may have been left behind on another phone. You can delete this entry and upload the file again.
            </p>
          ) : (
            <>
              {isImage(doc) && (
                <img src={state.url} alt={doc.title} style={{ width: '100%', borderRadius: 'var(--radius-md)', background: '#fff' }} />
              )}
              {isPdf(doc) && !native && (
                <iframe src={state.url} title={doc.title} style={{ width: '100%', height: '60vh', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: '#fff' }} />
              )}
              {isPdf(doc) && native && (
                <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Tap below to open this PDF in your phone&apos;s viewer, or to save or send it.
                </p>
              )}
              <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)', flexWrap: 'wrap' }}>
                {native ? (
                  <button className="btn btn--primary" onClick={onShare}>
                    <Icon name="share" size={16} /> {isPdf(doc) ? 'Open or share' : 'Share'}
                  </button>
                ) : (
                  <a className="btn btn--outline" href={state.url} target="_blank" rel="noreferrer">Open in new tab</a>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Documents() {
  const fileRef = useRef(null);
  const [list, setList] = useState(() => getDocuments());
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => todayLocal());
  const [type, setType] = useState('lab');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [viewing, setViewing] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');

  const onPick = (e) => {
    const f = e.target.files?.[0] || null;
    e.target.value = '';
    setFile(f);
    setMsg('');
    if (f && !title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ''));
  };

  const onSave = async () => {
    if (!file) { setMsg('Choose a photo or PDF first.'); return; }
    if (!title.trim()) { setMsg('Give it a title, e.g. "Blood work" or "Hand X-ray".'); return; }
    setSaving(true); setMsg('');
    try {
      await addDocument({ title, date, type, file });
      setList(getDocuments());
      setTitle(''); setFile(null); setDate(todayLocal());
      setMsg('Saved on this device.');
    } catch (e) {
      console.error(e);
      setMsg(e.message || 'Could not save this file.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (d) => {
    if (!window.confirm(`Delete "${d.title}" from this device?`)) return;
    await deleteDocument(d.id);
    setList(getDocuments());
  };

  const onExport = async () => {
    setExporting(true); setExportMsg('');
    try {
      await exportAppointmentPdf();
      setExportMsg('Summary ready — choose where to save or send it.');
    } catch (e) {
      console.error(e);
      setExportMsg('Export failed: ' + (e.message || 'unknown error'));
    } finally {
      setExporting(false);
    }
  };

  const labelStyle = { display: 'block', fontSize: 'var(--font-xs)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' };

  return (
    <div className="page-enter" style={{ paddingBottom: 'var(--space-3xl)' }}>
      <div className="section-header">
        <h1 className="section-header__title" style={{ fontSize: 'var(--font-3xl)' }}>Labs &amp; Imaging</h1>
        <p className="section-header__subtitle">Keep results and scans together — stored only on this device</p>
      </div>

      <div className="card glass-morphism" style={{ padding: 'var(--space-lg)', display: 'block', marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--space-md)' }}>Add a result</h2>

        <div style={{ marginBottom: 'var(--space-md)' }}>
          <span style={labelStyle}>Type</span>
          <div role="radiogroup" aria-label="Type" style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            {DOCUMENT_TYPES.map(t => (
              <button
                key={t.key}
                role="radio"
                aria-checked={type === t.key}
                className={type === t.key ? 'btn' : 'btn btn--outline'}
                onClick={() => setType(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 'var(--space-md)' }}>
          <label htmlFor="doc-title" style={labelStyle}>Title</label>
          <input id="doc-title" className="input-field" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. CBC and CRP, Hand X-ray" maxLength={120} />
        </div>

        <div style={{ marginBottom: 'var(--space-md)' }}>
          <label htmlFor="doc-date" style={labelStyle}>Date of test</label>
          <input id="doc-date" type="date" className="input-field" value={date} onChange={e => setDate(e.target.value)} style={{ colorScheme: 'dark' }} />
        </div>

        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <span style={labelStyle}>File</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            <button className="btn btn--outline" onClick={() => fileRef.current?.click()}>
              <Icon name="file" size={16} /> {file ? 'Choose a different file' : 'Choose photo or PDF'}
            </button>
            {file && <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', overflowWrap: 'anywhere' }}>{file.name}</span>}
          </div>
          <input ref={fileRef} type="file" accept={ACCEPTED_TYPES} onChange={onPick} style={{ display: 'none' }} />
        </div>

        <button className="btn btn--primary btn--full" onClick={onSave} disabled={saving} style={{ height: '48px', borderRadius: 'var(--radius-lg)' }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {msg && <p role="status" style={{ fontSize: 'var(--font-sm)', marginTop: 'var(--space-md)', color: 'var(--text-secondary)' }}>{msg}</p>}
      </div>

      {list.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon"><Icon name="file" size={48} /></div>
          <div className="empty-state__text">No results yet.<br />Add lab reports, test results, or imaging to bring them to your next visit.</div>
        </div>
      ) : (
        <div className="grid-1" style={{ marginBottom: 'var(--space-xl)' }}>
          {list.map(d => (
            <div key={d.id} className="card card--compact" style={{ padding: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '160px', cursor: 'pointer' }} onClick={() => setViewing(d)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: '2px' }}>
                  <span className="badge" style={{ background: `${TYPE_COLORS[d.type] || '#64748b'}22`, color: TYPE_COLORS[d.type] || 'var(--text-secondary)', fontSize: '10px' }}>
                    {typeLabel(d.type)}
                  </span>
                  <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                    {formatDocDate(d.date)} · {isPdf(d) ? 'PDF' : 'Image'}
                  </span>
                </div>
                <div className="card__title" style={{ overflowWrap: 'anywhere' }}>{d.title}</div>
              </div>
              <button className="btn btn--outline btn--sm" onClick={() => setViewing(d)}>View</button>
              <button className="btn btn--danger btn--sm" onClick={() => onDelete(d)} aria-label={`Delete ${d.title}`}>
                <Icon name="trash" size={14} /> Delete
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="card glass-morphism" style={{ padding: 'var(--space-lg)', display: 'block' }}>
        <h2 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--space-sm)' }}>Appointment summary</h2>
        <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-md)' }}>
          Create a PDF with your medications, the last 30 days of your symptom tracker, your scores, and this list of results (photos included).
        </p>
        <button className="btn btn--primary btn--full" onClick={onExport} disabled={exporting}>
          <Icon name="share" size={16} /> {exporting ? 'Building PDF…' : 'Export for my appointment'}
        </button>
        {exportMsg && <p role="status" style={{ fontSize: 'var(--font-sm)', marginTop: 'var(--space-md)', color: 'var(--text-secondary)' }}>{exportMsg}</p>}
      </div>

      <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-lg)', lineHeight: 1.5 }}>
        Files you add stay on this device and are never uploaded by the app. They leave your phone only when you choose to share them or an appointment PDF. Uploaded files are not included in Settings backups.
      </p>

      {viewing && <DocumentViewer doc={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

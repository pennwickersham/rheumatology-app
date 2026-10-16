import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SIGNS, signLabel, photosSupported, addPhoto, listPhotos, updatePhoto, deletePhoto, deleteAllPhotos,
} from '../utils/photoVault';
import { todayKey, fmtDay } from '../utils/medSchedule';

const labelStyle = { fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' };
const mutedStyle = { fontSize: 'var(--font-xs)', color: 'var(--text-muted)' };

function NewPhotoForm({ file, preview, onSaved, onCancel }) {
  const [sign, setSign] = useState('');
  const [date, setDate] = useState(todayKey());
  const [note, setNote] = useState('');
  const [share, setShare] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setBusy(true); setError('');
    try {
      await addPhoto(file, { sign, date, note, share });
      onSaved();
    } catch (e) {
      setError(e?.message || 'Could not save this photo.');
      setBusy(false);
    }
  };

  return (
    <div className="card glass-morphism" style={{ padding: 'var(--space-lg)', display: 'block', marginBottom: 'var(--space-lg)' }}>
      <img src={preview} alt="New photo" style={{ width: '100%', maxHeight: '320px', objectFit: 'contain', borderRadius: '10px', background: '#000' }} />
      <span style={{ ...labelStyle, marginTop: 'var(--space-md)' }}>What does it show?</span>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {SIGNS.map(s => (
          <button key={s.id} type="button" aria-pressed={sign === s.id}
            className={sign === s.id ? 'btn btn--sm' : 'btn btn--outline btn--sm'} onClick={() => setSign(s.id)}>
            {s.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
        <label>
          <span style={labelStyle}>Date taken</span>
          <input type="date" value={date} max={todayKey()} onChange={e => e.target.value && setDate(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '10px' }} />
        </label>
        <label>
          <span style={labelStyle}>Note (optional)</span>
          <input value={note} onChange={e => setNote(e.target.value)} maxLength={200} placeholder="e.g. appeared after sun, gone by evening"
            style={{ width: '100%', padding: '10px', borderRadius: '10px' }} />
        </label>
      </div>
      <label style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: 'var(--space-md)', fontSize: 'var(--font-sm)' }}>
        <input type="checkbox" checked={share} onChange={e => setShare(e.target.checked)} style={{ width: '18px', height: '18px' }} />
        Include when I share a summary with my care team
      </label>
      {error && <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--font-sm)' }}>{error}</p>}
      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
        <button className="btn btn--primary" style={{ flex: 1 }} onClick={save} disabled={busy || !sign}>{busy ? 'Saving…' : 'Save photo'}</button>
        <button className="btn btn--outline" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </div>
  );
}

function Viewer({ photo, onClose, onChanged }) {
  const [share, setShare] = useState(photo.share !== false);

  const toggleShare = async v => { setShare(v); await updatePhoto(photo.id, { share: v }); onChanged(); };
  const remove = async () => {
    if (!window.confirm('Delete this photo from this device? This cannot be undone.')) return;
    await deletePhoto(photo.id);
    onChanged(); onClose();
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Photo"
      style={{ zIndex: 2000, alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={onClose}>
      <div className="card" style={{ padding: 'var(--space-md)', display: 'block', maxWidth: '560px', width: '100%', maxHeight: '92vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <img src={photo.fullUrl} alt={signLabel(photo.sign)} style={{ width: '100%', borderRadius: '10px', background: '#000' }} />
        <div style={{ fontWeight: 700, marginTop: 'var(--space-sm)' }}>{signLabel(photo.sign)}</div>
        <div style={mutedStyle}>{fmtDay(photo.date)}{photo.note ? ' · ' + photo.note : ''}</div>
        <label style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: 'var(--space-md)', fontSize: 'var(--font-sm)' }}>
          <input type="checkbox" checked={share} onChange={e => toggleShare(e.target.checked)} style={{ width: '18px', height: '18px' }} />
          Include when I share with my care team
        </label>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
          <button className="btn btn--outline" style={{ flex: 1 }} onClick={onClose}>Close</button>
          <button className="btn btn--danger" onClick={remove}>Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function FlarePhotos() {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(null);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState('');
  const cameraRef = useRef(null);
  const libraryRef = useRef(null);
  // Object URLs for the photos (and a new photo's preview), released when the list
  // reloads or the page closes. Created here rather than in effects so they stay valid.
  const urlsRef = useRef([]);

  const refresh = useCallback(async () => {
    try {
      const list = (await listPhotos()).map(p => ({ ...p, thumbUrl: URL.createObjectURL(p.thumb), fullUrl: URL.createObjectURL(p.blob) }));
      urlsRef.current.forEach(u => URL.revokeObjectURL(u));
      urlsRef.current = list.flatMap(p => [p.thumbUrl, p.fullUrl]);
      setPhotos(list);
    } catch {
      setError('Photos are not available on this device.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => () => urlsRef.current.forEach(u => URL.revokeObjectURL(u)), []);

  const onPick = e => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) {
      const preview = URL.createObjectURL(f);
      urlsRef.current.push(preview);
      setPending({ file: f, preview });
    }
  };

  const removeAll = async () => {
    if (!window.confirm('Delete ALL flare photos from this device? This cannot be undone.')) return;
    await deleteAllPhotos();
    refresh();
  };

  if (!photosSupported()) {
    return <div className="empty-state"><div className="empty-state__text">Photo storage isn't available in this browser.</div></div>;
  }

  return (
    <div className="page-enter" style={{ paddingBottom: 'var(--space-3xl)' }}>
      <div className="section-header">
        <h1 className="section-header__title" style={{ fontSize: 'var(--font-3xl)' }}>Flare photos</h1>
        <p className="section-header__subtitle">Capture signs that fade before your appointment</p>
      </div>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={onPick} hidden />
      <input ref={libraryRef} type="file" accept="image/*" onChange={onPick} hidden />

      {pending ? (
        <NewPhotoForm file={pending.file} preview={pending.preview} onCancel={() => setPending(null)} onSaved={() => { setPending(null); refresh(); }} />
      ) : (
        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
          <button className="btn btn--primary" style={{ flex: 1, padding: '14px' }} onClick={() => cameraRef.current?.click()}>Take photo</button>
          <button className="btn btn--outline" style={{ flex: 1, padding: '14px' }} onClick={() => libraryRef.current?.click()}>Choose from library</button>
        </div>
      )}

      {error && <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--font-sm)' }}>{error}</p>}

      {loaded && !photos.length && !pending && (
        <div className="empty-state">
          <div className="empty-state__text">
            No photos yet. A rash, a swollen finger, or nail changes can be gone by the time you see your doctor.
            Take a photo when it happens, with something for scale if you can, in good natural light.
          </div>
        </div>
      )}

      {photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
          {photos.map(p => (
            <button key={p.id} type="button" onClick={() => setOpen(p)}
              aria-label={`${signLabel(p.sign)}, ${fmtDay(p.date)}${p.share === false ? ', not shared' : ''}`}
              style={{ padding: 0, border: '1px solid var(--border, rgba(255,255,255,.1))', borderRadius: '10px', overflow: 'hidden', background: 'none', cursor: 'pointer', textAlign: 'left', color: 'inherit' }}>
              {p.thumbUrl && <img src={p.thumbUrl} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block', opacity: p.share === false ? 0.5 : 1 }} />}
              <div style={{ padding: '4px 6px', fontSize: '11px', lineHeight: 1.3 }}>
                <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{signLabel(p.sign)}</div>
                <div style={mutedStyle}>{fmtDay(p.date)}{p.share === false ? ' · private' : ''}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && <Viewer photo={open} onClose={() => setOpen(null)} onChanged={refresh} />}

      {photos.length > 0 && (
        <button className="btn btn--outline mt-lg" style={{ width: '100%' }} onClick={() => navigate('/share')}>Share with my care team</button>
      )}

      <p style={{ ...mutedStyle, marginTop: 'var(--space-lg)', lineHeight: 1.5 }}>
        Photos are stored only on this device, inside RheumCompanion. They are not uploaded, not added to your
        phone's photo library, and location data is removed. A photo leaves your phone only if you include it in a summary
        you share. Photos are not part of app backups, so deleting the app deletes them.
      </p>
      {photos.length > 0 && (
        <button className="btn btn--outline btn--sm" style={{ marginTop: 'var(--space-sm)' }} onClick={removeAll}>Delete all photos</button>
      )}
    </div>
  );
}

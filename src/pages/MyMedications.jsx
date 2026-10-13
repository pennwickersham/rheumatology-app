import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { medications, getMedicationById } from '../data/medications';
import { getMyMeds, addMyMed, updateMyMed, removeMyMed } from '../utils/myMeds';
import { syncReminders, remindersSupported } from '../utils/reminders';

export default function MyMedications() {
  const navigate = useNavigate();
  const [list, setList] = useState(() => getMyMeds());
  const [pick, setPick] = useState('');
  const [custom, setCustom] = useState('');
  const [status, setStatus] = useState('');

  const nameOf = (m) => getMedicationById(m.id)?.genericName || m.name || m.id;

  const commit = async (next) => {
    setList(next);
    if (remindersSupported()) {
      const r = await syncReminders(next);
      setStatus(r.ok ? 'Reminders updated.' : r.reason);
    }
  };

  const addCatalog = () => {
    if (!pick) return;
    commit(addMyMed(pick));
    setPick('');
  };

  const addCustom = () => {
    const name = custom.trim();
    if (!name) return;
    commit(addMyMed('custom:' + name.toLowerCase(), { name }));
    setCustom('');
  };

  const checkInteractions = () => {
    navigate('/interactions', { state: { meds: list.map(nameOf) } });
  };

  return (
    <div className="page-enter" style={{ paddingBottom: 'var(--space-3xl)' }}>
      <div className="section-header">
        <h1 className="section-header__title" style={{ fontSize: 'var(--font-3xl)' }}>My Medications</h1>
        <p className="section-header__subtitle">Your list stays on this device</p>
      </div>

      <div className="card glass-morphism" style={{ padding: 'var(--space-lg)', display: 'block', marginBottom: 'var(--space-lg)' }}>
        <label htmlFor="mm-pick" style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>Add from the medication library</label>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: '6px' }}>
          <select id="mm-pick" value={pick} onChange={e => setPick(e.target.value)} style={{ flex: 1, minWidth: 0, padding: '12px', borderRadius: '10px' }}>
            <option value="">Choose a medication…</option>
            {[...medications].sort((a, b) => a.genericName.localeCompare(b.genericName)).map(m => (
              <option key={m.id} value={m.id}>{m.genericName} ({m.brandNames[0]})</option>
            ))}
          </select>
          <button className="btn btn--primary" onClick={addCatalog} disabled={!pick} style={{ flexShrink: 0 }}>Add</button>
        </div>
        <label htmlFor="mm-custom" style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', display: 'block', marginTop: 'var(--space-md)' }}>
          Or type any other medicine or supplement
        </label>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: '6px' }}>
          <input
            id="mm-custom"
            value={custom}
            onChange={e => setCustom(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCustom()}
            placeholder="e.g. lisinopril"
            style={{ flex: 1, minWidth: 0, padding: '12px', borderRadius: '10px' }}
          />
          <button className="btn btn--primary" onClick={addCustom} disabled={!custom.trim()} style={{ flexShrink: 0 }}>Add</button>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__text">No medications yet. Add the ones you take to check interactions in one tap and set daily reminders.</div>
        </div>
      ) : (
        <>
          <div className="grid-1">
            {list.map(m => (
              <div key={m.id} className="card card--compact" style={{ padding: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <div
                    className="card__title"
                    style={{ cursor: getMedicationById(m.id) ? 'pointer' : 'default' }}
                    onClick={() => getMedicationById(m.id) && navigate(`/medications/${m.id}`)}
                  >
                    {nameOf(m)}
                  </div>
                </div>
                {remindersSupported() && (
                  <label style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                    Daily reminder{' '}
                    <input type="time" value={m.time || ''} onChange={e => commit(updateMyMed(m.id, { time: e.target.value }))} />
                  </label>
                )}
                <button className="btn btn--outline" onClick={() => commit(removeMyMed(m.id))} aria-label={`Remove ${nameOf(m)}`}>Remove</button>
              </div>
            ))}
          </div>
          {list.length >= 2 && (
            <button className="btn mt-lg" style={{ width: '100%' }} onClick={checkInteractions}>Check interactions for my list</button>
          )}
        </>
      )}

      {status && <p role="status" style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-md)' }}>{status}</p>}
      {!remindersSupported() && list.length > 0 && (
        <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-md)' }}>Daily reminders are available in the installed app.</p>
      )}
      <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-lg)' }}>
        Reminder notifications never show drug names on your lock screen. This list is for your convenience and does not replace your doctor or pharmacist's instructions.
      </p>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { medications, getMedicationById } from '../data/medications';
import { getMyMeds, addMyMed, updateMyMed, removeMyMed, holdMyMed, resumeMyMed } from '../utils/myMeds';
import { syncReminders, remindersSupported } from '../utils/reminders';
import {
  ROUTES, FREQUENCIES, FOLATE_OPTIONS, HOLD_REASONS, SITES,
  getSchedule, getRoute, freqValue, needsAnchor, isWeeklyMethotrexate, describeSchedule,
  nextDue, advanceFrom, todayKey, fmtDay, fmtShort, holdReasonLabel,
  dosesFor, logDose, deleteDose, recentSites, suggestSite, siteLabel,
} from '../utils/medSchedule';

const labelStyle = { fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' };
const fieldStyle = { width: '100%', padding: '10px', borderRadius: '10px' };
const noteStyle = { fontSize: 'var(--font-xs)', color: 'var(--text-muted)', margin: 'var(--space-sm) 0 0' };
const panelStyle = { width: '100%', marginTop: 'var(--space-sm)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border, rgba(255,255,255,.1))' };

function SitePicker({ value, onChange }) {
  const suggested = suggestSite();
  const recent = recentSites(4);
  const lastUsed = recent[0]?.site;
  return (
    <div>
      <span style={labelStyle}>Injection site</span>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        {/* Laid out as the patient looks down at their own body: left on the left. */}
        {['arm', 'abdomen', 'thigh'].flatMap(region => ['L', 'R'].map(side => SITES.find(s => s.id === `${region}_${side}`))).map(s => {
          const on = value === s.id;
          return (
            <button
              key={s.id}
              type="button"
              className={on ? 'btn' : 'btn btn--outline'}
              onClick={() => onChange(s.id)}
              aria-pressed={on}
              style={{ padding: '10px 6px', fontSize: 'var(--font-sm)', flexDirection: 'column', gap: '2px' }}
            >
              {s.label}
              {s.id === suggested && <span style={{ fontSize: '10px', opacity: 0.85 }}>suggested next</span>}
              {s.id === lastUsed && <span style={{ fontSize: '10px', opacity: 0.85 }}>used last time</span>}
            </button>
          );
        })}
      </div>
      {recent.length > 0 && (
        <p style={noteStyle}>Recent: {recent.map(d => `${siteLabel(d.site, true)} (${fmtShort(d.date)})`).join(', ')}</p>
      )}
    </div>
  );
}

function MedCard({ m, name, onCommit, onOpenInfo, startOpen }) {
  const [panel, setPanel] = useState(startOpen ? 'schedule' : null);
  const [doseDate, setDoseDate] = useState(todayKey());
  const [site, setSite] = useState('');
  const [reason, setReason] = useState('');
  const [, bump] = useState(0);

  const s = getSchedule(m);
  const route = getRoute(m);
  const due = nextDue(m);
  const doses = dosesFor(m.id);
  const last = doses[doses.length - 1];
  const toggle = p => {
    setPanel(cur => (cur === p ? null : p));
    if (p === 'log') { setDoseDate(todayKey()); setSite(route === 'injection' ? suggestSite() : ''); }
    if (p === 'hold') setReason('');
  };

  const changeFreq = value => {
    const [unit, every] = value.split(':');
    const schedule = { unit, every: Number(every) || 1 };
    if (needsAnchor(schedule)) schedule.next = s.next || todayKey();
    onCommit(updateMyMed(m.id, { schedule }));
  };

  const saveDose = () => {
    logDose(m.id, { date: doseDate, site: route === 'injection' ? site : undefined });
    setPanel(null);
    if (needsAnchor(s)) {
      const next = advanceFrom(m, doseDate);
      onCommit(updateMyMed(m.id, { schedule: { ...s, next } }), `Dose logged. Next dose: ${fmtDay(next)}.`);
    } else {
      onCommit(getMyMeds(), 'Dose logged.');
    }
  };

  const removeDose = id => { deleteDose(id); bump(n => n + 1); };

  const saveHold = () => {
    setPanel(null);
    onCommit(holdMyMed(m.id, name, reason), `${name} is on hold. Its reminders are paused.`);
  };

  return (
    <div className="card card--compact" style={{ padding: 'var(--space-md)', display: 'block' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '160px' }}>
          <div
            className="card__title"
            style={{ cursor: getMedicationById(m.id) ? 'pointer' : 'default' }}
            onClick={() => getMedicationById(m.id) && onOpenInfo(m.id)}
          >
            {name} {m.hold && <span className="badge badge--warning" style={{ marginLeft: '6px', verticalAlign: 'middle' }}>On hold</span>}
          </div>
          <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {describeSchedule(m)}{m.time && s.unit !== 'none' ? ` · reminder ${m.time}` : ''}
          </div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
            {m.hold
              ? `Held since ${fmtShort(m.hold.since)} – ${holdReasonLabel(m.hold.reason).toLowerCase()}`
              : [due && needsAnchor(s) ? `Next: ${fmtDay(due)}` : null,
                 last ? `Last logged: ${fmtShort(last.date)}${last.site ? ` (${siteLabel(last.site, true)})` : ''}` : null,
                ].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: 'var(--space-sm)' }}>
        {!m.hold && s.unit !== 'day' && (
          <button className="btn btn--sm" onClick={() => toggle('log')} aria-expanded={panel === 'log'}>Log dose</button>
        )}
        <button className="btn btn--outline btn--sm" onClick={() => toggle('schedule')} aria-expanded={panel === 'schedule'}>Schedule</button>
        {m.hold
          ? <button className="btn btn--outline btn--sm" onClick={() => onCommit(resumeMyMed(m.id), `${name} resumed. Reminders are back on.`)}>Resume</button>
          : <button className="btn btn--outline btn--sm" onClick={() => toggle('hold')} aria-expanded={panel === 'hold'}>Hold</button>}
        <button className="btn btn--outline btn--sm" onClick={() => onCommit(removeMyMed(m.id))} aria-label={`Remove ${name}`}>Remove</button>
      </div>

      {panel === 'schedule' && (
        <div style={panelStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-sm)' }}>
            <label>
              <span style={labelStyle}>How it's given</span>
              <select value={route} onChange={e => onCommit(updateMyMed(m.id, { route: e.target.value }))} style={fieldStyle}>
                {ROUTES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </label>
            <label>
              <span style={labelStyle}>How often</span>
              <select value={freqValue(s)} onChange={e => changeFreq(e.target.value)} style={fieldStyle}>
                {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </label>
            {needsAnchor(s) && (
              <label>
                <span style={labelStyle}>{route === 'infusion' ? 'Next infusion date' : 'Next dose date'}</span>
                <input
                  type="date"
                  value={s.next || ''}
                  onChange={e => e.target.value && onCommit(updateMyMed(m.id, { schedule: { ...s, next: e.target.value } }))}
                  style={fieldStyle}
                />
              </label>
            )}
            {s.unit !== 'none' && (
              <label>
                <span style={labelStyle}>Reminder time</span>
                <input type="time" value={m.time || ''} onChange={e => onCommit(updateMyMed(m.id, { time: e.target.value }))} style={fieldStyle} />
              </label>
            )}
          </div>

          {m.id === 'methotrexate' && s.unit === 'day' && (
            <p role="alert" style={{ fontSize: 'var(--font-sm)', color: 'var(--danger)', margin: 'var(--space-sm) 0 0' }}>
              Methotrexate for arthritis and lupus is almost always taken once a week, not every day. Taking it daily by mistake can be
              very dangerous. Check your prescription label, and ask your pharmacist if you are unsure.
            </p>
          )}

          {isWeeklyMethotrexate(m) && (
            <label style={{ display: 'block', marginTop: 'var(--space-sm)' }}>
              <span style={labelStyle}>Folic acid reminder</span>
              <select value={m.folate || 'off'} onChange={e => onCommit(updateMyMed(m.id, { folate: e.target.value }))} style={fieldStyle}>
                {FOLATE_OPTIONS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
              <span style={{ ...noteStyle, display: 'block' }}>Follow the folic acid schedule your doctor gave you. Uses the same reminder time.</span>
            </label>
          )}

          {route === 'infusion' && needsAnchor(s) && (
            <p style={noteStyle}>You'll get a reminder the day before each infusion and on the day itself.</p>
          )}
          {needsAnchor(s) && <p style={noteStyle}>Logging a dose sets the next date from the day you actually took it.</p>}
          {!remindersSupported() && <p style={noteStyle}>Reminders are sent by the installed app.</p>}
        </div>
      )}

      {panel === 'log' && (
        <div style={panelStyle}>
          <label style={{ display: 'block', marginBottom: 'var(--space-sm)' }}>
            <span style={labelStyle}>Date taken</span>
            <input type="date" value={doseDate} max={todayKey()} onChange={e => e.target.value && setDoseDate(e.target.value)} style={fieldStyle} />
          </label>
          {route === 'injection' && <SitePicker value={site} onChange={setSite} />}
          <button className="btn mt-lg" style={{ width: '100%' }} onClick={saveDose} disabled={route === 'injection' && !site}>
            Save dose
          </button>
          {doses.length > 0 && (
            <div style={{ marginTop: 'var(--space-md)' }}>
              <span style={labelStyle}>Recent doses</span>
              {doses.slice(-3).reverse().map(d => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-sm)', padding: '4px 0' }}>
                  <span>{fmtDay(d.date)}{d.site ? ` · ${siteLabel(d.site)}` : ''}</span>
                  <button className="btn btn--outline btn--sm" onClick={() => removeDose(d.id)} aria-label={`Delete dose on ${fmtDay(d.date)}`}>Delete</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {panel === 'hold' && (
        <div style={panelStyle}>
          <span style={labelStyle}>Why is it on hold?</span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {HOLD_REASONS.map(r => (
              <button
                key={r.id}
                type="button"
                className={reason === r.id ? 'btn btn--sm' : 'btn btn--outline btn--sm'}
                aria-pressed={reason === r.id}
                onClick={() => setReason(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <p style={noteStyle}>
            A hold pauses this medicine's reminders and records the dates on your visit flowsheet. Only stop or skip a medicine when your
            care team has told you to; call them if you have a fever or infection while on an immune-suppressing medicine.
          </p>
          <button className="btn mt-lg" style={{ width: '100%' }} onClick={saveHold} disabled={!reason}>Put on hold</button>
        </div>
      )}
    </div>
  );
}

export default function MyMedications() {
  const navigate = useNavigate();
  const [list, setList] = useState(() => getMyMeds());
  const [pick, setPick] = useState('');
  const [custom, setCustom] = useState('');
  const [status, setStatus] = useState('');
  const [justAdded, setJustAdded] = useState(null);

  const nameOf = (m) => getMedicationById(m.id)?.genericName || m.name || m.id;

  const commit = async (next, message = '') => {
    setList(next);
    setStatus(message);
    if (remindersSupported()) {
      const r = await syncReminders(next);
      setStatus(r.ok ? [message, 'Reminders updated.'].filter(Boolean).join(' ') : r.reason);
    }
  };

  const addCatalog = () => {
    if (!pick) return;
    setJustAdded(pick);
    commit(addMyMed(pick));
    setPick('');
  };

  const addCustom = () => {
    const name = custom.trim();
    if (!name) return;
    const id = 'custom:' + name.toLowerCase();
    setJustAdded(id);
    commit(addMyMed(id, { name }));
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
          <select id="mm-pick" value={pick} onChange={e => setPick(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '10px' }}>
            <option value="">Choose a medication…</option>
            {[...medications].sort((a, b) => a.genericName.localeCompare(b.genericName)).map(m => (
              <option key={m.id} value={m.id}>{m.genericName} ({m.brandNames[0]})</option>
            ))}
          </select>
          <button className="btn" onClick={addCatalog} disabled={!pick}>Add</button>
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
            style={{ flex: 1, padding: '12px', borderRadius: '10px' }}
          />
          <button className="btn" onClick={addCustom} disabled={!custom.trim()}>Add</button>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__text">
            No medications yet. Add the ones you take to check interactions in one tap, set reminders for daily, weekly,
            every-few-weeks or infusion schedules, and track injection sites.
          </div>
        </div>
      ) : (
        <>
          <div className="grid-1">
            {list.map(m => (
              <MedCard
                key={m.id}
                m={m}
                name={nameOf(m)}
                onCommit={commit}
                onOpenInfo={id => navigate(`/medications/${id}`)}
                startOpen={m.id === justAdded}
              />
            ))}
          </div>
          {list.length >= 2 && (
            <button className="btn mt-lg" style={{ width: '100%' }} onClick={checkInteractions}>Check interactions for my list</button>
          )}
        </>
      )}

      {status && <p role="status" style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-md)' }}>{status}</p>}
      <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-lg)' }}>
        Suggested schedules are typical starting points only; set each one to match your prescription. Reminder notifications never show
        drug names on your lock screen. Doses, injection sites and holds appear on the flowsheet you can export from My Scores. This list
        is for your convenience and does not replace your doctor or pharmacist's instructions.
      </p>
    </div>
  );
}

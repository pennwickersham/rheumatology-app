/* RheumCompanion — Symptom scores check-in
   Pain, patient global, fatigue (0-10 scales, half steps), and morning
   stiffness severity + duration. Standard non-proprietary patient-reported
   measures. Self-contained; themes via CSS variables with dark fallbacks. */
import { useState } from 'react';
import {
  saveScoresEntry, validateScores, STIFF_DURATIONS,
} from '../utils/assessments';

const VAS = [];
for (let v = 0; v <= 10; v += 0.5) VAS.push(v);

function VasRow({ value, onPick }) {
  return (
    <div className="ss-vasrow">
      {VAS.map(v => (
        <button key={v} type="button"
          className={'ss-vas' + (value === v ? ' sel' : '')}
          onClick={() => onPick(v)}>{v}</button>
      ))}
    </div>
  );
}

export default function SymptomScores({ onSaved }) {
  const [pain, setPain] = useState(null);
  const [ptGlobal, setPtGlobal] = useState(null);
  const [fatigue, setFatigue] = useState(null);
  const [stiffSev, setStiffSev] = useState(null);
  const [stiffMin, setStiffMin] = useState(null);
  const [customMin, setCustomMin] = useState('');
  const [saved, setSaved] = useState(false);

  const entry = { pain, ptGlobal, fatigue, stiffSev, stiffMin };
  const complete = pain != null && ptGlobal != null && fatigue != null &&
    stiffSev != null && stiffMin != null && validateScores(entry);

  const pick = (setter) => (v) => { setter(v); setSaved(false); };

  const pickDuration = (min) => {
    setStiffMin(min); setCustomMin(''); setSaved(false);
  };
  const pickCustom = (raw) => {
    setCustomMin(raw);
    const n = parseInt(raw, 10);
    setStiffMin(Number.isNaN(n) || n < 0 ? null : Math.min(n, 1440));
    setSaved(false);
  };

  const handleSave = () => {
    if (!complete) return;
    const rec = saveScoresEntry(entry);
    if (rec) { setSaved(true); if (onSaved) onSaved(); }
  };

  const reset = () => {
    setPain(null); setPtGlobal(null); setFatigue(null);
    setStiffSev(null); setStiffMin(null); setCustomMin(''); setSaved(false);
  };

  const questions = [
    {
      title: 'How much pain have you had over the past week?',
      anchors: '0 = no pain · 10 = worst imaginable',
      value: pain, set: pick(setPain),
    },
    {
      title: 'Considering all the ways your condition affects you, how have you been doing?',
      anchors: '0 = very well · 10 = very poorly',
      value: ptGlobal, set: pick(setPtGlobal),
    },
    {
      title: 'How much of a problem has fatigue (tiredness) been?',
      anchors: '0 = no fatigue · 10 = completely exhausted',
      value: fatigue, set: pick(setFatigue),
    },
    {
      title: 'How severe has your morning stiffness been?',
      anchors: '0 = none · 10 = extremely severe',
      value: stiffSev, set: pick(setStiffSev),
    },
  ];

  return (
    <div className="ss">
      <style>{`
        .ss{color:var(--text-primary,#e8ecf6)}
        .ss .q{background:var(--bg-secondary,#131a2e);border:1px solid var(--border,#232c47);
          border-radius:var(--radius,12px);padding:12px;margin-bottom:10px}
        .ss .q p{margin:0 0 2px;font-size:14px;line-height:1.4;font-weight:600}
        .ss .anchors{margin:0 0 9px;font-size:11.5px;color:var(--text-secondary,#8a94b0)}
        .ss .ss-vasrow{display:flex;flex-wrap:wrap;gap:5px}
        .ss .ss-vas{width:44px;padding:9px 0;text-align:center;font-size:12.5px;border-radius:8px;
          border:1px solid var(--border,#2a3554);background:var(--bg-primary,#0a0e1a);
          color:var(--text-secondary,#aab4d0);cursor:pointer}
        .ss .ss-vas.sel{border-color:var(--accent,#4f8ef7);background:rgba(79,142,247,.14);
          color:var(--text-primary,#e8ecf6);font-weight:700}
        .ss .durrow{display:flex;flex-wrap:wrap;gap:6px}
        .ss .dur{padding:9px 12px;font-size:12.5px;border-radius:9px;cursor:pointer;
          border:1px solid var(--border,#2a3554);background:var(--bg-primary,#0a0e1a);
          color:var(--text-secondary,#aab4d0)}
        .ss .dur.sel{border-color:var(--accent,#4f8ef7);background:rgba(79,142,247,.14);
          color:var(--text-primary,#e8ecf6);font-weight:700}
        .ss .custom{display:flex;align-items:center;gap:8px;margin-top:9px;font-size:12.5px;
          color:var(--text-secondary,#8a94b0)}
        .ss .custom input{width:88px;padding:9px;border-radius:9px;font-size:13px;
          border:1px solid var(--border,#2a3554);background:var(--bg-primary,#0a0e1a);
          color:var(--text-primary,#e8ecf6)}
        .ss .done{margin-top:14px;padding:16px;border-radius:var(--radius,12px);
          border:1.5px solid var(--accent,#4f8ef7);background:var(--bg-secondary,#131a2e)}
        .ss .btnrow{display:flex;gap:8px}
        .ss button.primary{flex:1;padding:13px;border-radius:10px;border:none;font-weight:700;
          background:var(--accent,#4f8ef7);color:#fff;cursor:pointer;font-size:14px}
        .ss button.primary:disabled{opacity:.45;cursor:default}
        .ss button.ghost{padding:13px 14px;border-radius:10px;font-weight:600;cursor:pointer;
          background:transparent;border:1px solid var(--border,#2a3554);
          color:var(--text-secondary,#aab4d0);font-size:13px}
        .ss .note{font-size:11.5px;color:var(--text-secondary,#8a94b0);margin-top:10px;line-height:1.45}
      `}</style>

      {questions.map((q, i) => (
        <div className="q" key={i}>
          <p>{i + 1}. {q.title}</p>
          <p className="anchors">{q.anchors}</p>
          <VasRow value={q.value} onPick={q.set} />
        </div>
      ))}

      <div className="q">
        <p>5. On a typical morning this week, how long did stiffness last?</p>
        <p className="anchors">From waking until you loosened up as much as you were going to</p>
        <div className="durrow">
          {STIFF_DURATIONS.map(d => (
            <button key={d.min} type="button"
              className={'dur' + (stiffMin === d.min && customMin === '' ? ' sel' : '')}
              onClick={() => pickDuration(d.min)}>{d.label}</button>
          ))}
        </div>
        <div className="custom">
          or exactly:
          <input type="number" min="0" max="1440" inputMode="numeric"
            placeholder="minutes" value={customMin}
            onChange={e => pickCustom(e.target.value)}
            aria-label="Morning stiffness duration in minutes" />
          minutes
        </div>
      </div>

      <div className="done">
        <div className="btnrow">
          <button type="button" className="primary" onClick={handleSave}
            disabled={saved || !complete}>
            {saved ? 'Saved ✓' : 'Save today\u2019s check-in'}
          </button>
          <button type="button" className="ghost" onClick={reset}>Start over</button>
        </div>
        {!complete && !saved &&
          <p className="note">Answer all five to save — it takes under a minute.</p>}
      </div>

      <p className="note">
        These are the same core measures rheumatologists track between visits: pain,
        overall (global) assessment, fatigue, and morning stiffness. Your saved
        check-ins appear in History and on your exported flowsheet so your care team
        can see the trend, not just today. Information for your visit — not a diagnosis.
      </p>
    </div>
  );
}

/* RheumCompanion — Medication Interaction Review (replacement page)
   Facts come from FDA labels via src/api/interactions.js; the optional
   "Explain in plain language" uses your existing Gemini client ONLY to
   rephrase label text. No severity grades. Framed as pharmacist prep. */
import { useState } from 'react';
import {
  reviewInteractions, explainFindings, pharmacistQuestions, hasExplainProvider,
} from '../api/interactions';

export default function Interactions() {
  const [meds, setMeds] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [explains, setExplains] = useState({});   // pairKey -> text|'loading'

  const addMed = () => {
    const v = draft.trim();
    if (!v) return;
    if (!meds.some(m => m.toLowerCase() === v.toLowerCase())) setMeds([...meds, v]);
    setDraft('');
  };
  const removeMed = (m) => setMeds(meds.filter(x => x !== m));

  const run = async () => {
    setBusy(true); setError(''); setResult(null); setExplains({});
    try {
      const r = await reviewInteractions(meds, setProgress);
      setResult(r);
    } catch (e) {
      setError(e.message === 'Enter at least two medications.'
        ? e.message
        : 'The medication databases could not be reached. Check your connection and try again.');
    } finally {
      setBusy(false); setProgress('');
    }
  };

  const explain = async (pair, key) => {
    setExplains(prev => ({ ...prev, [key]: 'loading' }));
    try {
      const text = await explainFindings(pair);
      setExplains(prev => ({ ...prev, [key]: text || 'Explanation unavailable right now.' }));
    } catch {
      setExplains(prev => ({ ...prev, [key]: 'Explanation unavailable right now.' }));
    }
  };

  return (
    <div className="ix">
      <style>{`
        .ix{color:var(--text-primary,#e8ecf6);padding-bottom:24px}
        .ix .frame{background:var(--bg-secondary,#131a2e);border:1px solid var(--border,#232c47);
          border-radius:var(--radius,12px);padding:14px;margin-bottom:12px}
        .ix h1{font-size:20px;margin:0 0 6px}
        .ix .lead{font-size:13px;line-height:1.55;color:var(--text-secondary,#aab4d0);margin:0}
        .ix .lead b{color:var(--text-primary,#e8ecf6)}
        .ix .addrow{display:flex;gap:8px;margin-bottom:10px}
        .ix input{flex:1;padding:12px;border-radius:10px;font-size:14px;
          border:1px solid var(--border,#2a3554);background:var(--bg-primary,#0a0e1a);
          color:var(--text-primary,#e8ecf6)}
        .ix .add{padding:12px 16px;border-radius:10px;border:none;font-weight:700;
          background:var(--accent,#4f8ef7);color:#fff;cursor:pointer}
        .ix .chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
        .ix .chip{display:flex;align-items:center;gap:6px;padding:7px 10px;border-radius:999px;
          background:var(--bg-primary,#0a0e1a);border:1px solid var(--border,#2a3554);font-size:13px}
        .ix .chip button{border:none;background:none;color:var(--text-secondary,#8a94b0);
          cursor:pointer;font-size:14px;padding:0}
        .ix .go{width:100%;padding:14px;border-radius:11px;border:none;font-weight:800;
          font-size:15px;background:var(--accent,#4f8ef7);color:#fff;cursor:pointer}
        .ix .go:disabled{opacity:.5;cursor:default}
        .ix .prog,.ix .err{font-size:13px;margin-top:10px}
        .ix .err{color:#ff8a8a}
        .ix .pair{margin-top:12px}
        .ix .pair h3{font-size:15px;margin:0 0 8px}
        .ix .finding{margin-bottom:10px;padding:10px 12px;border-radius:10px;
          background:var(--bg-primary,#0a0e1a);border-left:3px solid var(--accent,#4f8ef7)}
        .ix .finding .src{font-size:11px;letter-spacing:.4px;text-transform:uppercase;
          color:var(--text-secondary,#8a94b0);margin-bottom:6px}
        .ix .finding p{margin:0 0 6px;font-size:13px;line-height:1.5;
          color:var(--text-secondary,#c9d2e8)}
        .ix .none{font-size:13px;line-height:1.55;color:var(--text-secondary,#aab4d0)}
        .ix .qs{margin:10px 0 0;padding:10px 12px;border-radius:10px;
          background:rgba(79,142,247,.08);border:1px dashed var(--accent,#4f8ef7)}
        .ix .qs b{font-size:12.5px}
        .ix .qs ul{margin:6px 0 0 18px;padding:0}
        .ix .qs li{font-size:12.5px;line-height:1.5;color:var(--text-secondary,#c9d2e8)}
        .ix .exbtn{margin-top:8px;padding:9px 12px;border-radius:9px;font-weight:600;
          font-size:12.5px;cursor:pointer;background:transparent;
          border:1px solid var(--accent,#4f8ef7);color:var(--accent,#8fb8ff)}
        .ix .extext{margin-top:8px;padding:10px 12px;border-radius:10px;font-size:13px;
          line-height:1.55;background:var(--bg-primary,#0a0e1a);
          border:1px solid var(--border,#2a3554);color:var(--text-secondary,#d0d8ec)}
        .ix .foot{font-size:11.5px;line-height:1.5;color:var(--text-secondary,#8a94b0);margin-top:14px}
      `}</style>

      <div className="frame">
        <h1>Medication interaction review</h1>
        <p className="lead">
          This tool looks up what the <b>official FDA labels</b> for your medicines say
          about taking them together, so you can <b>bring informed questions to your
          pharmacist</b>. It does not grade danger, and it never tells you to stop a
          medicine — decisions like that belong with your pharmacist and prescriber,
          who know your full picture.
        </p>
      </div>

      <div className="frame">
        <div className="addrow">
          <input value={draft} onChange={e => setDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addMed()}
            placeholder="Add a medication (e.g., methotrexate, Humira)"
            aria-label="Medication name" />
          <button type="button" className="add" onClick={addMed}>Add</button>
        </div>
        {meds.length > 0 && (
          <div className="chips">
            {meds.map(m => (
              <span className="chip" key={m}>{m}
                <button type="button" aria-label={'Remove ' + m}
                  onClick={() => removeMed(m)}>✕</button>
              </span>
            ))}
          </div>
        )}
        <button type="button" className="go" onClick={run}
          disabled={busy || meds.length < 2}>
          {busy ? 'Checking FDA labels…' : 'Review label information'}
        </button>
        {progress && <p className="prog">{progress}</p>}
        {error && <p className="err">{error}</p>}
        {meds.length < 2 && !busy &&
          <p className="prog">Add at least two medications to review.</p>}
      </div>

      {result && result.pairs.map(pair => {
        const key = pair.aInput + '|' + pair.bInput;
        const ex = explains[key];
        return (
          <div className="frame pair" key={key}>
            <h3>{pair.a} + {pair.b}</h3>

            {pair.findings.length > 0 ? (
              <>
                {pair.findings.map((f, i) => (
                  <div className="finding" key={i}>
                    <div className="src">FDA label for {f.labelOf} · {f.section} · mentions {f.mentions}</div>
                    {f.excerpts.map((e, j) => <p key={j}>“{e}”</p>)}
                  </div>
                ))}
                {hasExplainProvider() && (
                  ex == null
                    ? <button type="button" className="exbtn" onClick={() => explain(pair, key)}>
                        Explain this in plain language
                      </button>
                    : ex === 'loading'
                      ? <p className="prog">Writing a plain-language summary…</p>
                      : <div className="extext">{ex}</div>
                )}
              </>
            ) : (
              <p className="none">
                {(!pair.labelFoundA || !pair.labelFoundB)
                  ? 'An FDA label could not be found for one of these medications, so no label text could be checked. '
                  : 'The FDA label sections checked don’t specifically mention this combination. '}
                <b>That does not mean no interaction exists</b> — labels don’t list
                everything. Your pharmacist can check comprehensive interaction
                databases in seconds; it’s worth asking.
              </p>
            )}

            <div className="qs">
              <b>Questions to ask your pharmacist:</b>
              <ul>
                {pharmacistQuestions(pair).map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </div>
          </div>
        );
      })}

      <p className="foot">
        Sources: RxNorm (National Library of Medicine) for medication identification and
        openFDA drug labels for interaction text. Label excerpts are quoted verbatim from
        FDA-published labeling. Educational information only — not medical advice, and
        never a reason to change how you take a prescribed medicine. App content reviewed
        by Pendleton B. Wickersham, MD, Rheumatologist.
      </p>
    </div>
  );
}

/* RheumCompanion — My Scores (Assessments) page
   Symptom check-in (pain, patient global, fatigue, morning stiffness
   severity + duration) + 28-joint map + history + one-page PDF flowsheet
   export. Register at /assessments per INTEGRATION-GUIDE.md. */
import { useState, useCallback } from 'react';
import SymptomScores from '../components/SymptomScores';
import JointMap from '../components/JointMap';
import { ReviewedBadge, BrandFooter } from '../components/ReviewedBadge';
import {
  getScoresEntries, deleteScoresEntry, fmtStiffMin,
  getJointEntries, deleteJointEntry,
} from '../utils/assessments';
import { exportFlowsheet } from '../utils/flowsheet';

const fmt = iso => new Date(iso).toLocaleDateString(undefined,
  { year: '2-digit', month: 'short', day: 'numeric' });

export default function Assessments() {
  const [tab, setTab] = useState('scores');
  const [, bump] = useState(0);
  const refresh = useCallback(() => bump(n => n + 1), []);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');

  const sc = getScoresEntries();
  const jm = getJointEntries();

  const doExport = async () => {
    setExporting(true); setExportMsg('');
    try {
      await exportFlowsheet();
      setExportMsg('Flowsheet ready — choose where to save or send it.');
    } catch (e) {
      setExportMsg('Export failed: ' + (e.message || 'unknown error'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="as">
      <style>{`
        .as{color:var(--text-primary,#e8ecf6);padding-bottom:24px}
        .as h1{font-size:20px;margin:0 0 4px}
        .as .sub{font-size:13px;color:var(--text-secondary,#aab4d0);margin:0 0 12px;line-height:1.5}
        .as .tabs{display:flex;gap:6px;margin-bottom:14px}
        .as .tab{flex:1;padding:11px 6px;border-radius:10px;font-weight:700;font-size:12.5px;
          cursor:pointer;border:1px solid var(--border,#2a3554);
          background:var(--bg-secondary,#131a2e);color:var(--text-secondary,#aab4d0)}
        .as .tab.on{border-color:var(--accent,#4f8ef7);color:var(--text-primary,#e8ecf6);
          background:rgba(79,142,247,.12)}
        .as .hist{background:var(--bg-secondary,#131a2e);border:1px solid var(--border,#232c47);
          border-radius:var(--radius,12px);padding:12px;margin-bottom:12px;overflow-x:auto}
        .as .hist h3{margin:0 0 8px;font-size:14px}
        .as table{width:100%;border-collapse:collapse;font-size:12.5px}
        .as th{text-align:left;padding:6px 4px;color:var(--text-secondary,#8a94b0);
          font-size:10.5px;letter-spacing:.4px;text-transform:uppercase;
          border-bottom:1px solid var(--border,#232c47);white-space:nowrap}
        .as td{padding:7px 4px;border-bottom:1px solid rgba(255,255,255,.05)}
        .as td.num{font-weight:700}
        .as .del{border:none;background:none;color:var(--text-secondary,#707a96);
          cursor:pointer;font-size:13px}
        .as .empty{font-size:13px;color:var(--text-secondary,#8a94b0);line-height:1.5;
          padding:6px 2px}
        .as .export{width:100%;padding:15px;border-radius:12px;border:none;font-weight:800;
          font-size:15px;cursor:pointer;background:var(--accent,#4f8ef7);color:#fff}
        .as .export:disabled{opacity:.55}
        .as .exmsg{font-size:12.5px;margin-top:8px;color:var(--text-secondary,#aab4d0)}
        .as .privacy{font-size:11.5px;line-height:1.5;color:var(--text-secondary,#8a94b0);
          margin-top:10px}
      `}</style>

      <h1>My scores</h1>
      <p className="sub">
        Track the same measures your rheumatologist asks about — pain, overall
        wellbeing, fatigue, morning stiffness, and joint counts — and bring the
        trend, not just a memory, to your next visit.
      </p>
      <ReviewedBadge />

      <div className="tabs" role="tablist">
        {[['scores', 'Check-in'], ['joints', 'Joint map'], ['history', 'History & export']].map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k}
            className={'tab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'scores' && <SymptomScores onSaved={refresh} />}
      {tab === 'joints' && <JointMap onSaved={refresh} />}

      {tab === 'history' && (
        <>
          <div className="hist">
            <h3>Symptom check-ins</h3>
            {sc.length ? (
              <table>
                <thead><tr>
                  <th>Date</th><th>Pain</th><th>Global</th><th>Fatigue</th>
                  <th>Stiffness</th><th>AM stiff.</th><th></th>
                </tr></thead>
                <tbody>
                  {sc.slice(-10).reverse().map(e => (
                    <tr key={e.id}>
                      <td>{fmt(e.date)}</td>
                      <td className="num">{e.pain}</td>
                      <td>{e.ptGlobal}</td>
                      <td>{e.fatigue}</td>
                      <td>{e.stiffSev}</td>
                      <td>{fmtStiffMin(e.stiffMin)}</td>
                      <td><button type="button" className="del" aria-label="Delete entry"
                        onClick={() => { deleteScoresEntry(e.id); refresh(); }}>🗑</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="empty">No check-ins yet. The Check-in tab takes under a
                minute — pain, global, fatigue, and morning stiffness.</p>
            )}
          </div>

          <div className="hist">
            <h3>Joint count history</h3>
            {jm.length ? (
              <table>
                <thead><tr>
                  <th>Date</th><th>Tender (28)</th><th>Swollen (28)</th><th></th>
                </tr></thead>
                <tbody>
                  {jm.slice(-10).reverse().map(e => (
                    <tr key={e.id}>
                      <td>{fmt(e.date)}</td>
                      <td className="num">{e.tjc28}</td>
                      <td className="num">{e.sjc28}</td>
                      <td><button type="button" className="del" aria-label="Delete entry"
                        onClick={() => { deleteJointEntry(e.id); refresh(); }}>🗑</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="empty">No joint map entries yet. Mark tender and swollen joints
                on the Joint map tab.</p>
            )}
          </div>

          <button type="button" className="export" onClick={doExport}
            disabled={exporting || (!sc.length && !jm.length)}>
            {exporting ? 'Building your flowsheet…' : '📄 Export one-page flowsheet (PDF)'}
          </button>
          {exportMsg && <p className="exmsg">{exportMsg}</p>}
          {!sc.length && !jm.length &&
            <p className="exmsg">Record at least one check-in or joint map to enable export.</p>}

          <p className="privacy">
            Your scores are stored only on this device. Exporting opens your phone's
            share sheet so <b>you</b> choose where the PDF goes — Files, iCloud, Google
            Drive, email, or print. This app does not upload your health data anywhere.
          </p>
        </>
      )}

      <BrandFooter />
    </div>
  );
}

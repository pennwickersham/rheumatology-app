/* RheumCompanion — Red-flag alert popup
   Shown when scanForRedFlags() matches chat or tracker text. Interrupts
   with clear guidance but never blocks: the person can always continue.
   Usage:
     const [flag, setFlag] = useState(null);
     ...
     const rf = scanForRedFlags(text);
     if (rf) setFlag(rf);
     ...
     {flag && <RedFlagAlert flag={flag}
        onWhenToCall={() => navigate('/when-to-call')}
        onClose={() => setFlag(null)} />}
*/
import { TIER_INFO } from '../data/redFlags';

export default function RedFlagAlert({ flag, onWhenToCall, onClose }) {
  if (!flag) return null;
  const info = TIER_INFO[flag.tier] || TIER_INFO.urgent;
  const emergency = flag.tier === 'emergency';

  return (
    <div className="rfa-veil" role="alertdialog" aria-modal="true"
         aria-label={info.title}>
      <style>{`
        .rfa-veil{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;
          justify-content:center;background:rgba(6,9,18,.82);padding:20px;
          -webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px)}
        .rfa-card{width:100%;max-width:400px;background:var(--bg-secondary,#131a2e);
          border:2px solid ${info.color};border-radius:var(--radius,14px);
          padding:20px;color:var(--text-primary,#e8ecf6);
          box-shadow:0 18px 50px rgba(0,0,0,.55)}
        .rfa-head{display:flex;align-items:center;gap:10px;margin-bottom:10px}
        .rfa-head .ico{font-size:30px}
        .rfa-head h2{margin:0;font-size:18px;color:${info.color}}
        .rfa-item{margin:0 0 10px;padding:10px 12px;border-radius:10px;
          background:var(--bg-primary,#0a0e1a);border:1px solid var(--border,#2a3554)}
        .rfa-item b{display:block;font-size:13.5px;margin-bottom:4px}
        .rfa-item p{margin:0;font-size:13px;line-height:1.5;
          color:var(--text-secondary,#c2cbe2)}
        .rfa-actions{display:flex;flex-direction:column;gap:8px;margin-top:14px}
        .rfa-actions .call{padding:14px;border-radius:11px;border:none;font-weight:800;
          font-size:15px;cursor:pointer;text-align:center;text-decoration:none;
          background:${info.color};color:#10131f}
        .rfa-actions .wtc{padding:12px;border-radius:11px;font-weight:700;font-size:14px;
          cursor:pointer;background:transparent;border:1.5px solid var(--accent,#4f8ef7);
          color:var(--accent,#8fb8ff)}
        .rfa-actions .dismiss{padding:10px;border:none;background:none;cursor:pointer;
          color:var(--text-secondary,#8a94b0);font-size:12.5px;text-decoration:underline}
        .rfa-note{margin:12px 0 0;font-size:11px;line-height:1.45;
          color:var(--text-secondary,#8a94b0)}
      `}</style>
      <div className="rfa-card">
        <div className="rfa-head">
          <span className="ico" aria-hidden="true">{info.icon}</span>
          <h2>{info.title}</h2>
        </div>

        {flag.matches.map(m => (
          <div className="rfa-item" key={m.id}>
            <b>{m.label}</b>
            <p>{m.advice}</p>
          </div>
        ))}

        <div className="rfa-actions">
          {emergency
            ? <a className="call" href="tel:911">📞 Call 911</a>
            : <a className="call" href="tel:">📞 Call your care team</a>}
          {onWhenToCall && (
            <button type="button" className="wtc" onClick={onWhenToCall}>
              See “When to Call” guidance
            </button>
          )}
          <button type="button" className="dismiss" onClick={onClose}>
            I understand — continue anyway
          </button>
        </div>

        <p className="rfa-note">
          This automatic alert is based on words in your message and can be wrong in
          both directions. It never replaces your own judgment: if something feels
          seriously wrong, seek care. Nothing you type here is stored or sent anywhere
          by this alert. Guidance reviewed by Pendleton B. Wickersham, MD, Rheumatologist.
        </p>
      </div>
    </div>
  );
}

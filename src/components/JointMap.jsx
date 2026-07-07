/* RheumCompanion — 28-joint map (DAS28 joint set)
   Body figure for large joints + enlarged hand panels for MCP/PIP rows.
   Tap a joint to toggle it in the current mode (Tender or Swollen). */
import { useState } from 'react';
import { jointCounts, jointLabel, saveJointEntry } from '../utils/assessments';

/* Body-figure joint coordinates (viewBox 0 0 220 300) */
const BODY_JOINTS = {
  shoulder_R: [72, 78],  shoulder_L: [148, 78],
  elbow_R:    [58, 130], elbow_L:    [162, 130],
  wrist_R:    [50, 178], wrist_L:    [170, 178],
  knee_R:     [88, 242], knee_L:     [132, 242],
};

/* Hand-panel coordinates (viewBox 0 0 190 150), thumb at panel edge.
   Right hand shown palm-up on the left panel (mirrors clinical exam). */
const HAND_JOINTS = {
  R: {
    mcp1_R: [38, 108], pip1_R: [22, 84],
    mcp2_R: [66, 62],  pip2_R: [60, 36],
    mcp3_R: [92, 56],  pip3_R: [90, 28],
    mcp4_R: [118, 60], pip4_R: [120, 32],
    mcp5_R: [142, 70], pip5_R: [148, 46],
  },
  L: {
    mcp1_L: [152, 108], pip1_L: [168, 84],
    mcp2_L: [124, 62],  pip2_L: [130, 36],
    mcp3_L: [98, 56],   pip3_L: [100, 28],
    mcp4_L: [72, 60],   pip4_L: [70, 32],
    mcp5_L: [48, 70],   pip5_L: [42, 46],
  },
};

function Joint({ id, cx, cy, r, st, onTap }) {
  const t = st && st.t, s = st && st.s;
  return (
    <g onClick={() => onTap(id)} style={{ cursor: 'pointer' }}
       role="button" aria-label={jointLabel(id) + (t ? ', tender' : '') + (s ? ', swollen' : '')}>
      {/* generous invisible tap target for sore hands */}
      <circle cx={cx} cy={cy} r={r + 9} fill="transparent" />
      <circle cx={cx} cy={cy} r={r}
        fill={s ? 'var(--jm-swollen, #4f8ef7)' : 'var(--jm-idle, rgba(255,255,255,.10))'}
        stroke={t ? 'var(--jm-tender, #ff9f43)' : 'var(--jm-stroke, rgba(255,255,255,.35))'}
        strokeWidth={t ? 3.4 : 1.4} />
      {t && s && <circle cx={cx} cy={cy} r={r - 4.5} fill="none"
        stroke="rgba(10,14,26,.85)" strokeWidth="1.6" />}
    </g>
  );
}

export default function JointMap({ onSaved }) {
  const [mode, setMode] = useState('t');       // 't' tender | 's' swollen
  const [joints, setJoints] = useState({});
  const [saved, setSaved] = useState(false);

  const tap = (id) => {
    setSaved(false);
    setJoints(prev => {
      const cur = prev[id] || { t: false, s: false };
      return { ...prev, [id]: { ...cur, [mode]: !cur[mode] } };
    });
  };

  const counts = jointCounts(joints);
  const anySelected = counts.tjc28 > 0 || counts.sjc28 > 0;

  const handleSave = () => {
    saveJointEntry(joints);
    setSaved(true);
    if (onSaved) onSaved();
  };
  const clearAll = () => { setJoints({}); setSaved(false); };

  return (
    <div className="jm">
      <style>{`
        .jm{color:var(--text-primary,#e8ecf6)}
        .jm .modes{display:flex;gap:8px;margin-bottom:10px}
        .jm .mode{flex:1;padding:11px;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer;
          border:1.5px solid var(--border,#2a3554);background:var(--bg-secondary,#131a2e);
          color:var(--text-secondary,#aab4d0)}
        .jm .mode.t.on{border-color:var(--jm-tender,#ff9f43);color:var(--jm-tender,#ff9f43);
          background:rgba(255,159,67,.10)}
        .jm .mode.s.on{border-color:var(--jm-swollen,#4f8ef7);color:#9cc4ff;
          background:rgba(79,142,247,.12)}
        .jm .panel{background:var(--bg-secondary,#131a2e);border:1px solid var(--border,#232c47);
          border-radius:var(--radius,12px);padding:8px;margin-bottom:10px}
        .jm .panel h4{margin:2px 6px 4px;font-size:12px;font-weight:700;
          color:var(--text-secondary,#8a94b0);letter-spacing:.4px;text-transform:uppercase}
        .jm .hands{display:flex;gap:10px}
        .jm .hands .panel{flex:1}
        .jm svg{width:100%;height:auto;display:block}
        .jm .counts{display:flex;gap:10px;margin:4px 0 10px}
        .jm .count{flex:1;text-align:center;padding:10px;border-radius:10px;
          background:var(--bg-secondary,#131a2e);border:1px solid var(--border,#232c47)}
        .jm .count b{display:block;font-size:22px}
        .jm .count.t b{color:var(--jm-tender,#ff9f43)}
        .jm .count.s b{color:#9cc4ff}
        .jm .count small{color:var(--text-secondary,#8a94b0);font-size:11px}
        .jm .legend{font-size:12px;color:var(--text-secondary,#aab4d0);margin-bottom:10px}
        .jm .btnrow{display:flex;gap:8px}
        .jm button.primary{flex:1;padding:12px;border-radius:10px;border:none;font-weight:700;
          background:var(--accent,#4f8ef7);color:#fff;cursor:pointer;font-size:14px}
        .jm button.primary:disabled{opacity:.45;cursor:default}
        .jm button.ghost{padding:12px 14px;border-radius:10px;font-weight:600;cursor:pointer;
          background:transparent;border:1px solid var(--border,#2a3554);
          color:var(--text-secondary,#aab4d0);font-size:13px}
      `}</style>

      <div className="modes" role="tablist" aria-label="Marking mode">
        <button type="button" role="tab" aria-selected={mode === 't'}
          className={'mode t' + (mode === 't' ? ' on' : '')} onClick={() => setMode('t')}>
          ● Marking: Tender / painful
        </button>
        <button type="button" role="tab" aria-selected={mode === 's'}
          className={'mode s' + (mode === 's' ? ' on' : '')} onClick={() => setMode('s')}>
          ● Marking: Swollen
        </button>
      </div>

      <p className="legend">
        Tap each joint that is {mode === 't' ? 'tender or painful to touch' : 'visibly swollen'}.
        Orange ring = tender · Blue fill = swollen. Switch modes to mark both.
      </p>

      <div className="panel">
        <h4>Body — shoulders, elbows, wrists, knees</h4>
        <svg viewBox="0 0 220 300" aria-label="Body joint map">
          {/* simple figure silhouette */}
          <g fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="2">
            <circle cx="110" cy="40" r="18" />
            <path d="M110 58 L110 175 M72 78 L148 78 M72 78 L52 176 M148 78 L168 176
                     M110 175 L88 296 M110 175 L132 296" strokeLinecap="round" />
          </g>
          {Object.entries(BODY_JOINTS).map(([id, [x, y]]) => (
            <Joint key={id} id={id} cx={x} cy={y} r={11} st={joints[id]} onTap={tap} />
          ))}
          <text x="30" y="20" fill="rgba(255,255,255,.4)" fontSize="11">RIGHT</text>
          <text x="160" y="20" fill="rgba(255,255,255,.4)" fontSize="11">LEFT</text>
        </svg>
      </div>

      <div className="hands">
        {['R', 'L'].map(side => (
          <div className="panel" key={side}>
            <h4>{side === 'R' ? 'Right hand' : 'Left hand'} — knuckles (MCP) &amp; middle joints (PIP)</h4>
            <svg viewBox="0 0 190 150" aria-label={(side === 'R' ? 'Right' : 'Left') + ' hand joint map'}>
              <g fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="2">
                {side === 'R'
                  ? <path d="M60 145 Q52 100 66 62 M66 62 Q60 40 60 26 M92 56 Q90 32 90 18
                             M118 60 Q120 36 120 22 M142 70 Q148 50 150 38 M38 108 Q24 92 18 76
                             M60 145 Q110 150 150 120 Q150 90 142 70" strokeLinecap="round" />
                  : <path d="M130 145 Q138 100 124 62 M124 62 Q130 40 130 26 M98 56 Q100 32 100 18
                             M72 60 Q70 36 70 22 M48 70 Q42 50 40 38 M152 108 Q166 92 172 76
                             M130 145 Q80 150 40 120 Q40 90 48 70" strokeLinecap="round" />}
              </g>
              {Object.entries(HAND_JOINTS[side]).map(([id, [x, y]]) => (
                <Joint key={id} id={id} cx={x} cy={y} r={9} st={joints[id]} onTap={tap} />
              ))}
            </svg>
          </div>
        ))}
      </div>

      <div className="counts">
        <div className="count t"><b>{counts.tjc28}</b><small>Tender joints (of 28)</small></div>
        <div className="count s"><b>{counts.sjc28}</b><small>Swollen joints (of 28)</small></div>
      </div>

      <div className="btnrow">
        <button type="button" className="primary" onClick={handleSave}
          disabled={saved || !anySelected}>
          {saved ? 'Saved ✓' : 'Save joint counts'}
        </button>
        <button type="button" className="ghost" onClick={clearAll}>Clear</button>
      </div>
    </div>
  );
}

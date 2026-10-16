/* RheumCompanion — interactive joint map (homunculus)
   28-joint set (DAS28) for quick check-ins, or the full 68/66-joint set
   (adds jaw, sternoclavicular, acromioclavicular, DIP, hips, ankles,
   midfoot and toes). Body figure for large joints + enlarged hand and
   foot panels. Tap a joint to toggle it in the current mode (Tender or
   Swollen); a live summary shows counts, symmetry and pattern. */
import { useState } from 'react';
import {
  JOINTS_28, JOINTS_68, canSwell, jointCounts, jointLabel, jointPattern, saveJointEntry,
} from '../utils/assessments';
import {
  BODY_W, BODY_POINTS, BODY_SIZE, BODY_HEAD, BODY_LINES, handGeometry, footGeometry,
} from '../data/jointGeometry';

const SET_KEY = 'rheum_assess_jointset';
const pts = line => line.map(p => p.join(',')).join(' ');
const describe = st => (st.t && st.s ? 'tender and swollen' : st.t ? 'tender' : st.s ? 'swollen' : 'cleared');
const cap = s => s[0].toUpperCase() + s.slice(1);

function Joint({ id, cx, cy, r, hit, st, onTap, dim }) {
  const t = st && st.t, s = st && st.s;
  return (
    <g onClick={() => onTap(id)} style={{ cursor: 'pointer', opacity: dim ? 0.35 : 1 }}
       role="button" aria-label={jointLabel(id) + (t ? ', tender' : '') + (s ? ', swollen' : '')}>
      {/* generous invisible tap target for sore hands */}
      <circle cx={cx} cy={cy} r={hit ?? r + 9} fill="transparent" />
      <circle cx={cx} cy={cy} r={r}
        fill={s ? 'var(--jm-swollen, #4f8ef7)' : 'var(--jm-idle, rgba(255,255,255,.10))'}
        stroke={t ? 'var(--jm-tender, #ff9f43)' : 'var(--jm-stroke, rgba(255,255,255,.35))'}
        strokeWidth={t ? 3.4 : 1.4} />
      {t && s && <circle cx={cx} cy={cy} r={Math.max(r - 4.5, 2)} fill="none"
        stroke="rgba(10,14,26,.85)" strokeWidth="1.6" />}
    </g>
  );
}

export default function JointMap({ onSaved }) {
  const [set, setSet] = useState(() => {
    try { return localStorage.getItem(SET_KEY) === '68' ? 68 : 28; } catch { return 28; }
  });
  const [mode, setMode] = useState('t');       // 't' tender | 's' swollen
  const [joints, setJoints] = useState({});
  const [saved, setSaved] = useState(false);
  const [last, setLast] = useState('');

  const ids = new Set(set === 68 ? JOINTS_68 : JOINTS_28);
  const full = set === 68;

  const chooseSet = n => {
    setSet(n); setSaved(false); setLast('');
    try { localStorage.setItem(SET_KEY, String(n)); } catch { /* preference only */ }
  };

  const tap = (id) => {
    if (mode === 's' && !canSwell(id)) {
      setLast(cap(jointLabel(id)) + ': hips are counted for tenderness only.');
      return;
    }
    setSaved(false);
    const cur = joints[id] || { t: false, s: false };
    const next = { ...cur, [mode]: !cur[mode] };
    setJoints({ ...joints, [id]: next });
    setLast(cap(jointLabel(id)) + ': ' + describe(next));
  };

  const counts = jointCounts(joints);
  const tender = full ? counts.tjc68 : counts.tjc28;
  const swollen = full ? counts.sjc66 : counts.sjc28;
  const pattern = jointPattern(joints, set);

  const handleSave = () => {
    saveJointEntry(joints, set);
    setSaved(true);
    if (onSaved) onSaved();
  };
  const clearAll = () => { setJoints({}); setSaved(false); setLast(''); };

  const bodyIds = Object.keys(BODY_POINTS).filter(id => ids.has(id));

  return (
    <div className="jm">
      <style>{`
        .jm{color:var(--text-primary,#e8ecf6)}
        .jm .seg{display:flex;gap:6px;margin-bottom:10px}
        .jm .seg button{flex:1;padding:9px 6px;border-radius:10px;font-weight:700;font-size:12.5px;cursor:pointer;
          border:1px solid var(--border,#2a3554);background:var(--bg-secondary,#131a2e);color:var(--text-secondary,#aab4d0)}
        .jm .seg button.on{border-color:var(--accent,#4f8ef7);color:var(--text-primary,#e8ecf6);background:rgba(79,142,247,.12)}
        .jm .seg small{display:block;font-weight:500;font-size:10.5px;opacity:.8}
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
        .jm .pair{display:flex;gap:10px}
        .jm .pair .panel{flex:1;min-width:0}
        .jm .pair.stack{flex-direction:column;gap:0}
        .jm svg{width:100%;height:auto;display:block}
        .jm .counts{display:flex;gap:10px;margin:4px 0 8px}
        .jm .count{flex:1;text-align:center;padding:10px;border-radius:10px;
          background:var(--bg-secondary,#131a2e);border:1px solid var(--border,#232c47)}
        .jm .count b{display:block;font-size:22px}
        .jm .count.t b{color:var(--jm-tender,#ff9f43)}
        .jm .count.s b{color:#9cc4ff}
        .jm .count small{color:var(--text-secondary,#8a94b0);font-size:11px}
        .jm .pattern{font-size:13px;margin:0 0 4px;color:var(--text-primary,#e8ecf6);font-weight:600}
        .jm .note{font-size:11.5px;color:var(--text-secondary,#8a94b0);margin:0 0 10px;line-height:1.45}
        .jm .last{font-size:12.5px;color:var(--text-secondary,#aab4d0);min-height:18px;margin:0 0 8px}
        .jm .legend{font-size:12px;color:var(--text-secondary,#aab4d0);margin-bottom:10px}
        .jm .btnrow{display:flex;gap:8px}
        .jm button.primary{flex:1;padding:12px;border-radius:10px;border:none;font-weight:700;
          background:var(--accent,#4f8ef7);color:#fff;cursor:pointer;font-size:14px}
        .jm button.primary:disabled{opacity:.45;cursor:default}
        .jm button.ghost{padding:12px 14px;border-radius:10px;font-weight:600;cursor:pointer;
          background:transparent;border:1px solid var(--border,#2a3554);
          color:var(--text-secondary,#aab4d0);font-size:13px}
      `}</style>

      <div className="seg" role="radiogroup" aria-label="Joint set">
        {[[28, '28 joints', 'quick check'], [68, '68 joints', 'full map with feet']].map(([n, l, h]) => (
          <button key={n} type="button" role="radio" aria-checked={set === n}
            className={set === n ? 'on' : ''} onClick={() => chooseSet(n)}>
            {l}<small>{h}</small>
          </button>
        ))}
      </div>

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
        <h4>Body — {full ? 'jaw, collarbones, shoulders, elbows, wrists, hips, knees, ankles, midfoot' : 'shoulders, elbows, wrists, knees'}</h4>
        <svg viewBox={full ? `0 0 ${BODY_W} 400` : `0 40 ${BODY_W} 270`} aria-label="Body joint map">
          <g fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx={BODY_HEAD.cx} cy={BODY_HEAD.cy} r={BODY_HEAD.r} />
            {BODY_LINES.map((l, i) => <polyline key={i} points={pts(l)} />)}
          </g>
          {bodyIds.map(id => {
            const [x, y] = BODY_POINTS[id];
            const [r, hit] = BODY_SIZE[id.replace(/_[LR]$/, '')] || [full ? 10 : 11, full ? 15 : undefined];
            return <Joint key={id} id={id} cx={x} cy={y} r={r} hit={hit} st={joints[id]} onTap={tap}
              dim={mode === 's' && !canSwell(id)} />;
          })}
          <text x="14" y={full ? 18 : 58} fill="rgba(255,255,255,.4)" fontSize="11">RIGHT</text>
          <text x="196" y={full ? 18 : 58} fill="rgba(255,255,255,.4)" fontSize="11">LEFT</text>
        </svg>
      </div>

      <div className={'pair' + (full ? ' stack' : '')}>
        {['R', 'L'].map(side => {
          const g = handGeometry(side, set);
          return (
            <div className="panel" key={side}>
              <h4>{side === 'R' ? 'Right hand' : 'Left hand'} — knuckles (MCP), middle (PIP){full ? ', end joints (DIP)' : ''}</h4>
              <svg viewBox={g.view.join(' ')} aria-label={(side === 'R' ? 'Right' : 'Left') + ' hand joint map'}>
                <g fill="none" stroke="rgba(255,255,255,.14)" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points={pts(g.palm)} strokeWidth="2" fill="rgba(255,255,255,.03)" />
                  {g.fingers.map((f, i) => <polyline key={i} points={pts(f)} strokeWidth="14" />)}
                </g>
                {Object.entries(g.points).map(([id, [x, y]]) => (
                  <Joint key={id} id={id} cx={x} cy={y} r={full ? 8 : 9} hit={full ? 11 : undefined} st={joints[id]} onTap={tap} />
                ))}
              </svg>
            </div>
          );
        })}
      </div>

      {full && (
        <div className="pair stack">
          {['R', 'L'].map(side => {
            const g = footGeometry(side);
            return (
              <div className="panel" key={side}>
                <h4>{side === 'R' ? 'Right foot' : 'Left foot'} — toe bases (MTP) &amp; toe joints</h4>
                <svg viewBox={g.view.join(' ')} aria-label={(side === 'R' ? 'Right' : 'Left') + ' foot joint map'}>
                  <g fill="none" stroke="rgba(255,255,255,.14)" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points={pts(g.sole)} strokeWidth="2" fill="rgba(255,255,255,.03)" />
                    {g.toes.map((t, i) => <polyline key={i} points={pts(t)} strokeWidth={i === 0 ? 20 : 12} />)}
                  </g>
                  {Object.entries(g.points).map(([id, [x, y]]) => (
                    <Joint key={id} id={id} cx={x} cy={y} r={8} hit={11} st={joints[id]} onTap={tap} />
                  ))}
                </svg>
              </div>
            );
          })}
        </div>
      )}

      <p className="last" role="status">{last}</p>

      <div className="counts">
        <div className="count t"><b>{tender}</b><small>Tender joints (of {full ? 68 : 28})</small></div>
        <div className="count s"><b>{swollen}</b><small>Swollen joints (of {full ? 66 : 28})</small></div>
      </div>
      <p className="pattern">{pattern.text}</p>
      <p className="note">
        {full && <>28-joint subset: {counts.tjc28} tender, {counts.sjc28} swollen. </>}
        Pattern describes what you marked (how many joints, whether both sides match, small or large joints).
        It is not a diagnosis.
      </p>

      <div className="btnrow">
        <button type="button" className="primary" onClick={handleSave}
          disabled={saved || (tender === 0 && swollen === 0)}>
          {saved ? 'Saved ✓' : 'Save joint counts'}
        </button>
        <button type="button" className="ghost" onClick={clearAll}>Clear</button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getWeatherPrefs, enableWeather, disableWeather, refreshWeather, analyzeWeather, spikeSummary,
  isFalling, MIN_DAYS,
} from '../utils/weather';
import { fmtDay, fmtShort } from '../utils/medSchedule';

const mutedStyle = { fontSize: 'var(--font-xs)', color: 'var(--text-muted)', lineHeight: 1.5 };
const cardStyle = { padding: 'var(--space-lg)', display: 'block', marginBottom: 'var(--space-lg)' };
const toInHg = hpa => (hpa * 0.02953).toFixed(2);
const fmtSigned = n => (n > 0 ? '+' : '') + n;

/* Two small charts on one timeline (never two y-axes): pressure line on top,
   daily pain bars below. Days with falling pressure are shaded in both. */
function WeatherChart({ series, pain }) {
  const [hover, setHover] = useState(null);
  const W = 340, L = 34, R = 8, plotW = W - L - R;
  const n = series.length;
  const step = plotW / n;
  const x = i => L + step * (i + 0.5);

  const ps = series.map(d => d.p).filter(v => v != null);
  if (!ps.length) return <p style={mutedStyle}>No weather data for this period yet. Tap Update now.</p>;
  const pMin = Math.floor(Math.min(...ps) - 2), pMax = Math.ceil(Math.max(...ps) + 2);
  const PH = 110, PT = 14;
  const py = v => PT + (1 - (v - pMin) / (pMax - pMin)) * (PH - PT - 6);
  const BH = 96, BT = 10;
  const by = v => BT + (1 - v / 10) * (BH - BT - 16);

  const path = series.map((d, i) => (d.p == null ? null : `${x(i).toFixed(1)},${py(d.p).toFixed(1)}`)).filter(Boolean);
  const shade = series.map((d, i) => (isFalling(d) ? i : null)).filter(i => i != null);
  const barW = Math.max(2, step - 2);
  const h = hover != null ? series[hover] : null;
  const ticks = [0, Math.floor((n - 1) / 2), n - 1];

  const onMove = e => {
    const r = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * W;
    const i = Math.floor((vx - L) / step);
    setHover(i >= 0 && i < n ? i : null);
  };

  const grid = 'var(--border, rgba(255,255,255,.12))';
  const ink = 'var(--text-muted, #8a94b0)';

  return (
    <div>
      <div style={{ fontSize: 'var(--font-sm)', fontWeight: 700, margin: '0 0 2px' }}>Barometric pressure (hPa)</div>
      <svg viewBox={`0 0 ${W} ${PH}`} style={{ width: '100%', display: 'block' }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}
        onTouchStart={e => onMove(e.touches[0] ? { ...e, clientX: e.touches[0].clientX, currentTarget: e.currentTarget } : e)}
        role="img" aria-label="Daily barometric pressure">
        {shade.map(i => <rect key={i} x={L + step * i} y={PT - 6} width={step} height={PH - PT} fill="rgba(148,163,184,.14)" />)}
        {[pMin, Math.round((pMin + pMax) / 2), pMax].map(v => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={py(v)} y2={py(v)} stroke={grid} strokeWidth="1" />
            <text x={L - 4} y={py(v) + 3} textAnchor="end" fontSize="9" fill={ink}>{v}</text>
          </g>
        ))}
        <polyline points={path.join(' ')} fill="none" stroke="var(--accent-primary, #0ea5e9)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {h && h.p != null && <circle cx={x(hover)} cy={py(h.p)} r="4" fill="var(--accent-primary, #0ea5e9)" stroke="var(--bg-primary, #0a0e1a)" strokeWidth="2" />}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={PT - 6} y2={PH} stroke={ink} strokeWidth="1" strokeDasharray="2 2" />}
      </svg>

      <div style={{ fontSize: 'var(--font-sm)', fontWeight: 700, margin: '8px 0 2px' }}>Your daily pain (0–10)</div>
      <svg viewBox={`0 0 ${W} ${BH}`} style={{ width: '100%', display: 'block' }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}
        onTouchStart={e => onMove(e.touches[0] ? { ...e, clientX: e.touches[0].clientX, currentTarget: e.currentTarget } : e)}
        role="img" aria-label="Daily pain">
        {shade.map(i => <rect key={i} x={L + step * i} y={BT - 4} width={step} height={BH - BT - 12} fill="rgba(148,163,184,.14)" />)}
        {[0, 5, 10].map(v => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={by(v)} y2={by(v)} stroke={grid} strokeWidth="1" />
            <text x={L - 4} y={by(v) + 3} textAnchor="end" fontSize="9" fill={ink}>{v}</text>
          </g>
        ))}
        {series.map((d, i) => {
          const v = pain[d.date];
          if (v == null) return null;
          const top = by(v), base = by(0), hgt = Math.max(base - top, 1);
          const r = Math.min(2, barW / 2, hgt);
          return (
            <path key={d.date}
              d={`M${x(i) - barW / 2},${base} V${top + r} Q${x(i) - barW / 2},${top} ${x(i) - barW / 2 + r},${top} H${x(i) + barW / 2 - r} Q${x(i) + barW / 2},${top} ${x(i) + barW / 2},${top + r} V${base} Z`}
              fill="var(--accent-secondary, #8b5cf6)" opacity={hover == null || hover === i ? 1 : 0.55} />
          );
        })}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={BT - 4} y2={by(0)} stroke={ink} strokeWidth="1" strokeDasharray="2 2" />}
        {ticks.map(i => (
          <text key={i} x={x(i)} y={BH - 1} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} fontSize="9" fill={ink}>{fmtShort(series[i].date)}</text>
        ))}
      </svg>

      <p aria-live="polite" style={{ ...mutedStyle, minHeight: '36px', margin: '6px 0 0', color: 'var(--text-secondary)' }}>
        {h ? (
          <>
            <b>{fmtDay(h.date)}</b>
            {h.p != null ? ` · ${Math.round(h.p)} hPa (${toInHg(h.p)} inHg)` : ' · no weather data'}
            {h.dp24 != null ? ` · ${fmtSigned(h.dp24)} hPa in 24 h` : ''}
            {h.rh != null ? ` · humidity ${Math.round(h.rh)}%` : ''}
            {pain[h.date] != null ? ` · pain ${pain[h.date]}/10` : ' · no pain logged'}
          </>
        ) : 'Touch or hover a day for details. Shaded days: pressure falling 4+ hPa in 24 h or 6+ in 48 h.'}
      </p>
    </div>
  );
}

export default function Weather() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState(getWeatherPrefs);
  const [zip, setZip] = useState(prefs.zip);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [range, setRange] = useState(30);
  const [showTable, setShowTable] = useState(false);

  const analysis = prefs.enabled ? analyzeWeather(range) : null;

  const act = async (fn, done) => {
    setBusy(true); setStatus('');
    try {
      await fn();
      setPrefs(getWeatherPrefs());
      setStatus(done);
    } catch (e) {
      setStatus(e?.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const turnOff = () => {
    disableWeather();
    setPrefs(getWeatherPrefs());
    setStatus('Weather is off and downloaded weather data was deleted.');
  };

  const today = analysis?.series[analysis.series.length - 1];
  const spikes = analysis ? spikeSummary(analysis) : null;

  return (
    <div className="page-enter" style={{ paddingBottom: 'var(--space-3xl)' }}>
      <div className="section-header">
        <h1 className="section-header__title" style={{ fontSize: 'var(--font-3xl)' }}>Weather &amp; symptoms</h1>
        <p className="section-header__subtitle">See whether pressure, humidity or temperature track with your pain</p>
      </div>

      {!prefs.enabled ? (
        <div className="card glass-morphism" style={cardStyle}>
          <p style={{ fontSize: 'var(--font-sm)', marginTop: 0 }}>
            Many people with arthritis feel weather changes. Turn this on and the app downloads daily barometric pressure,
            humidity, UV index and temperature for your area, then compares them with the pain, swelling and stiffness you log.
          </p>
          <label htmlFor="wx-zip" style={{ fontSize: 'var(--font-sm)', fontWeight: 700, display: 'block', margin: 'var(--space-md) 0 6px' }}>Your ZIP code (US)</label>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <input id="wx-zip" inputMode="numeric" maxLength={5} value={zip} onChange={e => setZip(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 80302" style={{ flex: 1, minWidth: 0, padding: '12px', borderRadius: '10px' }} />
            <button className="btn btn--primary" disabled={busy || zip.length !== 5}
              onClick={() => act(() => enableWeather(zip), 'Weather is on. History for the last 6 months was downloaded.')}>
              {busy ? 'Turning on…' : 'Turn on'}
            </button>
          </div>
          <p style={{ ...mutedStyle, marginTop: 'var(--space-md)' }}>
            Privacy: your ZIP code is converted to an approximate location (about 10 km) using Zippopotam.us, and weather for
            that point is downloaded from Open-Meteo. No health information, name or account details are sent. Your ZIP code
            is kept only on this device, and all comparisons happen on this device.
          </p>
        </div>
      ) : (
        <>
          <div className="card glass-morphism" style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-sm)', flexWrap: 'wrap', alignItems: 'baseline' }}>
              <div style={{ fontWeight: 700 }}>{prefs.place}</div>
              <div style={mutedStyle}>Updated {prefs.lastFetch ? new Date(prefs.lastFetch).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}</div>
            </div>
            {today && today.p != null && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                {[
                  ['Pressure', `${Math.round(today.p)} hPa`, `${toInHg(today.p)} inHg${today.dp24 != null ? ` · ${fmtSigned(today.dp24)} today` : ''}`],
                  ['Humidity', `${Math.round(today.rh)}%`, 'daily average'],
                  ['UV index', today.uv != null ? today.uv.toFixed(1) : '—', 'daily max'],
                  ['Temperature', `${Math.round(today.tmax * 9 / 5 + 32)}°F`, `low ${Math.round(today.tmin * 9 / 5 + 32)}°F`],
                ].map(([k, v, s]) => (
                  <div key={k} style={{ padding: '10px', borderRadius: '10px', background: 'var(--bg-glass, rgba(255,255,255,.04))' }}>
                    <div style={mutedStyle}>{k}</div>
                    <div style={{ fontSize: 'var(--font-xl)', fontWeight: 800 }}>{v}</div>
                    <div style={mutedStyle}>{s}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: 'var(--space-md)' }}>
              <button className="btn btn--outline btn--sm" disabled={busy} onClick={() => act(() => refreshWeather({ force: true }), 'Weather updated.')}>
                {busy ? 'Updating…' : 'Update now'}
              </button>
              <button className="btn btn--outline btn--sm" onClick={turnOff}>Turn off</button>
            </div>
          </div>

          <div className="card glass-morphism" style={cardStyle}>
            <div style={{ display: 'flex', gap: '6px', marginBottom: 'var(--space-md)' }} role="radiogroup" aria-label="Time period">
              {[30, 90, 180].map(d => (
                <button key={d} type="button" role="radio" aria-checked={range === d}
                  className={range === d ? 'btn btn--sm' : 'btn btn--outline btn--sm'} onClick={() => setRange(d)}>
                  {d === 180 ? '6 months' : `${d} days`}
                </button>
              ))}
            </div>
            <WeatherChart series={analysis.series} pain={analysis.pain} />
            <button type="button" className="btn btn--outline btn--sm" style={{ marginTop: 'var(--space-sm)' }}
              onClick={() => setShowTable(v => !v)} aria-expanded={showTable}>
              {showTable ? 'Hide table' : 'Show as table'}
            </button>
            {showTable && (
              <div style={{ maxHeight: '320px', overflow: 'auto', marginTop: 'var(--space-sm)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead><tr>{['Date', 'hPa', '24 h', 'Humidity', 'UV', 'Pain'].map(t => (
                    <th key={t} style={{ textAlign: 'left', padding: '4px', color: 'var(--text-muted)' }}>{t}</th>))}</tr></thead>
                  <tbody>
                    {[...analysis.series].reverse().map(d => (
                      <tr key={d.date} style={{ borderTop: '1px solid var(--border, rgba(255,255,255,.08))' }}>
                        <td style={{ padding: '4px' }}>{fmtShort(d.date)}</td>
                        <td>{d.p != null ? Math.round(d.p) : '—'}</td>
                        <td>{d.dp24 != null ? fmtSigned(d.dp24) : '—'}</td>
                        <td>{d.rh != null ? Math.round(d.rh) + '%' : '—'}</td>
                        <td>{d.uv != null ? d.uv.toFixed(1) : '—'}</td>
                        <td>{analysis.pain[d.date] ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card glass-morphism" style={cardStyle}>
            <div style={{ fontWeight: 700, marginBottom: 'var(--space-sm)' }}>What your data shows</div>
            {!analysis.enough ? (
              <p style={{ fontSize: 'var(--font-sm)', margin: 0 }}>
                {analysis.n} of {MIN_DAYS} days with both weather and a pain score so far. Log pain in the Tracker or My Scores
                and this fills in automatically.
              </p>
            ) : (
              <ul style={{ fontSize: 'var(--font-sm)', margin: 0, paddingLeft: '18px', lineHeight: 1.55 }}>
                {analysis.drop && <li>{analysis.drop.text}</li>}
                {analysis.correlations.map(c => <li key={c.key}>{c.text}</li>)}
                <li>
                  {spikes.total
                    ? <>Pain spikes (6+ and at least 2 above your usual {analysis.baseline}): <b>{spikes.total}</b>.
                      {' '}{spikes.weather} followed falling pressure with no swelling or long morning stiffness, a pattern more typical
                      of weather-sensitive pain. {spikes.inflammatory} came with swelling or 1+ hour of morning stiffness, which can be
                      signs of inflammation and are worth raising with your rheumatologist. {spikes.unclear} had neither.</>
                    : 'No pain spikes in this period.'}
                </li>
              </ul>
            )}
            {analysis.spikes.length > 0 && (
              <div style={{ marginTop: 'var(--space-md)' }}>
                {[...analysis.spikes].reverse().slice(0, 8).map(s => (
                  <div key={s.date} style={{ fontSize: 'var(--font-xs)', padding: '6px 0', borderTop: '1px solid var(--border, rgba(255,255,255,.08))' }}>
                    <b>{fmtDay(s.date)}</b> · pain {s.pain} ·{' '}
                    {s.kind === 'inflammatory' ? `Inflammation signs: ${s.signs.join(', ')}` : s.kind === 'weather' ? 'Followed falling pressure' : 'No weather or inflammation signs'}
                    {s.kind === 'inflammatory' && s.weather ? ' (pressure also falling)' : ''}
                  </div>
                ))}
              </div>
            )}
            <p style={{ ...mutedStyle, marginTop: 'var(--space-md)' }}>
              These are patterns in your own records, not proof that weather causes symptoms and not a diagnosis. Swelling or long
              morning stiffness matters even when the weather is changing.
            </p>
          </div>

          <button className="btn btn--outline" style={{ width: '100%' }} onClick={() => navigate('/share')}>Share with my care team</button>
          <p style={{ ...mutedStyle, marginTop: 'var(--space-md)' }}>
            Weather updates automatically when you open the app (at most every 6 hours). Only an approximate location is sent to
            Open-Meteo; your symptoms never leave this device unless you share them.
          </p>
        </>
      )}

      {status && <p role="status" style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-md)' }}>{status}</p>}
    </div>
  );
}

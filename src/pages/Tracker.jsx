import { useState, useEffect, useMemo } from 'react';
import { Icon } from '../components/Icons';
import {
  getTrackerData,
  saveTrackerEntry,
  generateInsights,
  generateShareText,
  getCustomSymptoms,
  saveCustomSymptoms,
  analyzeFoodTriggers,
  getRecentFoods,
  STARTER_FOODS
} from '../utils/tracker';
import { Share } from '@capacitor/share';

/* ============================================================
   Helpers — all metrics are computed from a generic list of
   daily entries. When wearable sync is added later, merge those
   readings into the same entry objects (e.g. entry.hrv,
   entry.sleepScore) and extend CORE_METRICS below.
   ============================================================ */

const CORE_METRICS = [
  { key: 'pain', label: 'Pain', color: 'var(--danger)' },
  { key: 'stiffness', label: 'Stiffness', color: 'var(--accent-primary)' },
  { key: 'fatigue', label: 'Fatigue', color: 'var(--warning)' },
  { key: 'swelling', label: 'Swelling', color: 'var(--success)' },
];

function dayKey(d) {
  return d.toISOString().split('T')[0];
}

function daysAgo(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function entryBurden(e) {
  return ((e.pain || 0) + (e.stiffness || 0) + (e.fatigue || 0) + (e.swelling || 0)) / 4;
}

function avgBurden(list) {
  if (!list.length) return null;
  return list.reduce((s, e) => s + entryBurden(e), 0) / list.length;
}

function statusFromWellness(w) {
  if (w >= 70) return { label: 'Doing Well', color: 'var(--success)', desc: 'Symptoms appear well controlled.' };
  if (w >= 40) return { label: 'Moderate Activity', color: 'var(--warning)', desc: 'Some symptom activity — pace yourself and watch trends.' };
  return { label: 'High Activity', color: 'var(--danger)', desc: 'High symptom burden. Consider contacting your care team.' };
}

function friendlyDate(iso) {
  const today = dayKey(new Date());
  const yesterday = dayKey(daysAgo(1));
  if (iso === today) return 'Today';
  if (iso === yesterday) return 'Yesterday';
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/* ============= Small visual components (dependency-free SVG) ============= */

function StatusRing({ pct, color, size = 148 }) {
  const stroke = 11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = c * (Math.max(0, Math.min(100, pct)) / 100);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${filled} ${c - filled}`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  );
}

function Sparkline({ points, color }) {
  // points: array of { x: 0..1, v: 0..10 }
  if (points.length < 2) {
    return (
      <div style={{ height: '36px', display: 'flex', alignItems: 'center', fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
        Log more days to see a trend
      </div>
    );
  }
  const W = 100, H = 36, PAD = 3;
  const path = points
    .map((p, i) => {
      const x = PAD + p.x * (W - PAD * 2);
      const y = H - PAD - (p.v / 10) * (H - PAD * 2);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const last = points[points.length - 1];
  const lx = PAD + last.x * (W - PAD * 2);
  const ly = H - PAD - (last.v / 10) * (H - PAD * 2);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '36px', display: 'block' }}>
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r="2.6" fill={color} />
    </svg>
  );
}

function TrendArrow({ delta }) {
  // delta > 0 means burden decreased (improving)
  if (delta === null || Math.abs(delta) < 0.5) {
    return <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', fontWeight: 700 }}>— Steady</span>;
  }
  const improving = delta > 0;
  return (
    <span style={{ fontSize: 'var(--font-xs)', fontWeight: 800, color: improving ? 'var(--success)' : 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <Icon name="arrow-up" size={12} style={{ transform: improving ? 'none' : 'rotate(180deg)' }} />
      {improving ? 'Improving' : 'Worsening'} vs last week
    </span>
  );
}

/* ============================ Page ============================ */

export default function Tracker() {
  const [entries, setEntries] = useState([]);
  const [customSymptoms, setCustomSymptoms] = useState([]);
  const [insights, setInsights] = useState([]);

  const today = dayKey(new Date());
  const [date, setDate] = useState(today);

  const emptyForm = {
    pain: 0, stiffness: 0, fatigue: 0, swelling: 0,
    rash: false, triggers: '', medications: '', notes: '', custom: {}, foods: []
  };
  const [form, setForm] = useState(emptyForm);
  const [newCustomSymptom, setNewCustomSymptom] = useState('');
  const [foodDraft, setFoodDraft] = useState('');

  // 'dashboard' | 'log' | 'history' — dashboard is the landing view
  const [view, setView] = useState('dashboard');

  useEffect(() => {
    const data = getTrackerData();
    setEntries(data);
    setInsights(generateInsights(data));
    setCustomSymptoms(getCustomSymptoms());
  }, []);

  useEffect(() => {
    const existing = entries.find(e => e.date === date);
    if (existing) {
      setForm({ ...existing, custom: existing.custom || {}, foods: existing.foods || [] });
    } else {
      setForm(emptyForm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, entries]);

  /* ---------------- Dashboard metrics ---------------- */
  const dash = useMemo(() => {
    if (entries.length === 0) return null;

    const sorted = entries.slice().sort((a, b) => a.date.localeCompare(b.date));
    const latest = sorted[sorted.length - 1];

    const last7Start = dayKey(daysAgo(6));
    const prior7Start = dayKey(daysAgo(13));
    const last7 = sorted.filter(e => e.date >= last7Start);
    const prior7 = sorted.filter(e => e.date >= prior7Start && e.date < last7Start);

    const burdenNow = entryBurden(latest);
    const wellness = Math.round((10 - burdenNow) * 10);

    const a7 = avgBurden(last7);
    const p7 = avgBurden(prior7);
    const weekDelta = a7 !== null && p7 !== null ? p7 - a7 : null; // positive = improving

    // 14-day window for sparklines
    const win14Start = dayKey(daysAgo(13));
    const win = sorted.filter(e => e.date >= win14Start);
    const spanMs = daysAgo(0).getTime() - daysAgo(13).getTime();
    const trend = (key, isCustom = false) =>
      win
        .map(e => {
          const v = isCustom ? (e.custom ? e.custom[key] : undefined) : e[key];
          if (v === undefined || v === null) return null;
          const x = (new Date(e.date + 'T00:00:00').getTime() - daysAgo(13).getTime()) / spanMs;
          return { x: Math.max(0, Math.min(1, x)), v };
        })
        .filter(Boolean);

    const avg7 = (key) => {
      if (!last7.length) return null;
      return last7.reduce((s, e) => s + (e[key] || 0), 0) / last7.length;
    };

    // Logging consistency dots — last 7 calendar days
    const weekDots = [];
    for (let i = 6; i >= 0; i--) {
      const k = dayKey(daysAgo(i));
      weekDots.push({ key: k, logged: sorted.some(e => e.date === k) });
    }
    const loggedCount = weekDots.filter(d => d.logged).length;

    return { latest, wellness, burdenNow, weekDelta, trend, avg7, weekDots, loggedCount, last7 };
  }, [entries]);

  const foodAnalysis = useMemo(() => analyzeFoodTriggers(entries), [entries]);

  // Quick-add chips: the user's own recent foods first, then common triggers
  const foodSuggestions = useMemo(() => {
    const recent = getRecentFoods(entries);
    const merged = [...recent];
    STARTER_FOODS.forEach(f => {
      if (!merged.some(m => m.toLowerCase() === f.toLowerCase())) merged.push(f);
    });
    return merged
      .filter(f => !form.foods.some(x => x.toLowerCase() === f.toLowerCase()))
      .slice(0, 10);
  }, [entries, form.foods]);

  const addFood = (name) => {
    const v = (name !== undefined ? name : foodDraft).trim();
    if (!v) return;
    if (!form.foods.some(f => f.toLowerCase() === v.toLowerCase())) {
      setForm(prev => ({ ...prev, foods: [...prev.foods, v] }));
    }
    setFoodDraft('');
  };

  const removeFood = (name) => {
    setForm(prev => ({ ...prev, foods: prev.foods.filter(f => f !== name) }));
  };

  /* ---------------- Actions ---------------- */
  const handleSave = () => {
    const updated = saveTrackerEntry({ date, ...form });
    setEntries(updated);
    setInsights(generateInsights(updated));
    setView('dashboard');
  };

  const handleShare = async () => {
    const txt = generateShareText(entries);
    try {
      await Share.share({ title: 'Rheumatology Tracker Report', text: txt, dialogTitle: 'Share with Medical Team' });
    } catch (e) {
      console.error(e);
      navigator.clipboard.writeText(txt);
      alert('Report copied to clipboard instead! Your device may not support native sharing.');
    }
  };

  const addCustomSymptom = () => {
    if (!newCustomSymptom.trim()) return;
    const sName = newCustomSymptom.trim();
    if (!customSymptoms.includes(sName)) {
      const updated = [...customSymptoms, sName];
      setCustomSymptoms(updated);
      saveCustomSymptoms(updated);
    }
    setNewCustomSymptom('');
  };

  const goLogToday = () => {
    setDate(today);
    setView('log');
  };

  const renderSlider = (label, field, isCustom = false) => {
    const val = isCustom ? (form.custom[field] || 0) : form[field];
    return (
      <div style={{ marginBottom: 'var(--space-lg)' }} key={field}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
          <label style={{ fontWeight: 600, fontSize: 'var(--font-sm)', color: 'var(--text-primary)' }}>{label}</label>
          <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: 'var(--font-base)' }}>{val}/10</span>
        </div>
        <input
          type="range" min="0" max="10" value={val}
          onChange={(e) => {
            const num = parseInt(e.target.value, 10);
            if (isCustom) {
              setForm(prev => ({ ...prev, custom: { ...prev.custom, [field]: num } }));
            } else {
              setForm(prev => ({ ...prev, [field]: num }));
            }
          }}
          style={{ width: '100%', accentColor: 'var(--accent-primary)', height: '12px', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
          <span>None</span><span>Moderate</span><span>Severe</span>
        </div>
      </div>
    );
  };

  const tabBtn = (id, label) => (
    <button
      className="btn"
      style={{
        flex: 1,
        background: view === id ? 'var(--bg-glass-hover)' : 'transparent',
        color: view === id ? 'var(--text-primary)' : 'var(--text-muted)',
        borderRadius: 'var(--radius-md)',
        fontSize: 'var(--font-xs)'
      }}
      onClick={() => setView(id)}
    >
      {label}
    </button>
  );

  /* ============================ Render ============================ */

  return (
    <div className="page-enter" style={{ paddingBottom: 'var(--space-3xl)' }}>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <div>
          <h1 className="section-header__title" style={{ fontSize: 'var(--font-3xl)' }}>Symptom Tracker</h1>
          <p className="section-header__subtitle">Your disease activity at a glance</p>
        </div>
        <button className="btn btn--primary btn--sm" onClick={handleShare} style={{ borderRadius: 'var(--radius-md)' }}>
          <Icon name="share" size={16} /> Report
        </button>
      </div>

      <div className="glass" style={{ display: 'flex', padding: '4px', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-xl)' }}>
        {tabBtn('dashboard', 'Dashboard')}
        {tabBtn('log', 'Daily Journal')}
        {tabBtn('history', 'History')}
      </div>

      {/* ======================= DASHBOARD ======================= */}
      {view === 'dashboard' && (
        !dash ? (
          /* First-use onboarding — explains exactly how the tracker works */
          <div className="card glass-morphism stagger-item" style={{ display: 'block', padding: 'var(--space-xl)' }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
              <div className="flex-center" style={{ width: '64px', height: '64px', margin: '0 auto var(--space-md)', borderRadius: 'var(--radius-xl)', background: 'rgba(14,165,233,0.1)', color: 'var(--accent-primary)' }}>
                <Icon name="activity" size={32} />
              </div>
              <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 800, marginBottom: 'var(--space-xs)' }}>Welcome to your Tracker</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', lineHeight: 1.6 }}>
                Here's how it works:
              </p>
            </div>
            {[
              ['1', 'Log a Daily Journal entry', 'Rate your pain, stiffness, fatigue, and swelling each day, and jot down what you ate — it takes under a minute. The journal captures how you feel at a moment in time.'],
              ['2', 'Watch your Dashboard come to life', 'After a few entries, this screen shows your current status, weekly trends, personalized insights, and food-flare patterns — how you are doing over time.'],
              ['3', 'Share with your care team', 'Tap Report any time to send a summary of your recent history to your rheumatologist.'],
            ].map(([n, t, d]) => (
              <div key={n} style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', alignItems: 'flex-start' }}>
                <div className="flex-center" style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', fontWeight: 800, fontSize: 'var(--font-sm)', flexShrink: 0 }}>{n}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--font-sm)', marginBottom: '2px' }}>{t}</div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{d}</div>
                </div>
              </div>
            ))}
            <button className="btn btn--primary btn--full" style={{ height: '52px', borderRadius: 'var(--radius-lg)' }} onClick={goLogToday}>
              Log Your First Entry
            </button>
          </div>
        ) : (
          <>
            {/* Current status ring */}
            {(() => {
              const status = statusFromWellness(dash.wellness);
              const isToday = dash.latest.date === today;
              return (
                <div className="card glass-morphism stagger-item" style={{ display: 'block', padding: 'var(--space-xl)', marginBottom: 'var(--space-lg)', textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--font-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
                    Current Status · {friendlyDate(dash.latest.date)}
                  </div>
                  <div style={{ position: 'relative', width: '148px', height: '148px', margin: '0 auto var(--space-md)' }}>
                    <StatusRing pct={dash.wellness} color={status.color} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '2rem', fontWeight: 800, color: status.color, lineHeight: 1 }}>{dash.wellness}</span>
                      <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>/ 100</span>
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 'var(--font-lg)', color: status.color, marginBottom: '4px' }}>{status.label}</div>
                  <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>{status.desc}</p>
                  <TrendArrow delta={dash.weekDelta} />
                  {!isToday && (
                    <button className="btn btn--outline btn--full" style={{ marginTop: 'var(--space-lg)', borderRadius: 'var(--radius-md)' }} onClick={goLogToday}>
                      You haven't logged today — tap to journal
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Logging consistency */}
            <div className="card glass-morphism stagger-item" style={{ display: 'block', padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
              <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
                <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>This Week's Journals</span>
                <span style={{ fontSize: 'var(--font-xs)', fontWeight: 800, color: 'var(--accent-primary)' }}>{dash.loggedCount}/7 days</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {dash.weekDots.map(d => (
                  <div key={d.key} style={{ textAlign: 'center' }}>
                    <div style={{
                      width: '26px', height: '26px', borderRadius: '50%', margin: '0 auto 4px',
                      background: d.logged ? 'var(--accent-primary)' : 'rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {d.logged && <Icon name="check" size={14} color="#fff" />}
                    </div>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                      {new Date(d.key + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'narrow' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Insights */}
            {insights.length > 0 && (
              <div className="stagger-item" style={{ marginBottom: 'var(--space-lg)' }}>
                {insights.map((insight, i) => (
                  <div key={i} className={`insight-card insight-card--${insight.type || 'info'}`}>
                    <div className="flex-between" style={{ marginBottom: '4px' }}>
                      <h3 className="insight-card__title" style={{
                        color: insight.type === 'warning' ? 'var(--danger)' :
                               insight.type === 'success' ? 'var(--success)' : 'var(--accent-primary)'
                      }}>
                        {insight.title}
                      </h3>
                      <Icon
                        name={insight.type === 'warning' ? 'alert-circle' : insight.type === 'success' ? 'check-circle' : 'info'}
                        size={16}
                        color={insight.type === 'warning' ? 'var(--danger)' : insight.type === 'success' ? 'var(--success)' : 'var(--accent-primary)'}
                      />
                    </div>
                    <p className="insight-card__message">{insight.message}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Food & flare patterns */}
            <div className="card glass-morphism stagger-item" style={{ display: 'block', padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
              <div style={{ fontSize: 'var(--font-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
                Food &amp; Flare Patterns
              </div>
              {!foodAnalysis.ready ? (
                <div>
                  <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-md)' }}>
                    Log the foods you eat in your Daily Journal and this card will automatically compare your symptoms on days you ate each food (and the day after) against days you didn't — flagging possible flare triggers.
                  </p>
                  <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
                    {foodAnalysis.daysLogged === 0
                      ? 'No foods logged yet.'
                      : `Foods logged on ${foodAnalysis.daysLogged} day${foodAnalysis.daysLogged === 1 ? '' : 's'} so far — patterns appear after 4+ days of food logging.`}
                  </p>
                  <button className="btn btn--outline btn--full" style={{ borderRadius: 'var(--radius-md)' }} onClick={goLogToday}>
                    Start Your Food Diary
                  </button>
                </div>
              ) : (() => {
                const suspects = foodAnalysis.results.filter(r => r.delta >= 1);
                const cleared = foodAnalysis.results.filter(r => r.delta <= -1);
                return (
                  <div>
                    {suspects.length === 0 ? (
                      <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-sm)' }}>
                        No food stands out as a flare trigger yet. Keep logging — patterns get clearer with more days of data.
                      </p>
                    ) : (
                      <>
                        <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 'var(--space-md)' }}>
                          Your symptoms tend to run higher around these foods:
                        </p>
                        {suspects.slice(0, 4).map(r => (
                          <div key={r.food} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-md)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.15)', marginBottom: 'var(--space-sm)' }}>
                            <Icon name="alert-triangle" size={16} color="var(--warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 800, fontSize: 'var(--font-sm)', color: 'var(--warning)', marginBottom: '2px' }}>{r.food}</div>
                              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                Symptom burden averaged <b style={{ color: 'var(--text-primary)' }}>{r.expAvg.toFixed(1)}</b> the {r.window} vs <b style={{ color: 'var(--text-primary)' }}>{r.nonAvg.toFixed(1)}</b> otherwise · eaten on {r.timesEaten} logged days
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                    {cleared.length > 0 && (
                      <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 'var(--space-sm)' }}>
                        <Icon name="check-circle" size={12} color="var(--success)" />{' '}
                        <b style={{ color: 'var(--success)' }}>Looking fine so far:</b> {cleared.slice(0, 4).map(r => r.food).join(', ')}
                      </p>
                    )}
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 'var(--space-md)', marginBottom: 0 }}>
                      These are patterns in your own logs, not proof of cause. Discuss any suspected food triggers with your rheumatologist or a dietitian before changing your diet.
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* 14-day symptom trends */}
            <div className="card glass-morphism stagger-item" style={{ display: 'block', padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
              <div style={{ fontSize: 'var(--font-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>
                14-Day Trends
              </div>
              {CORE_METRICS.map(m => {
                const pts = dash.trend(m.key);
                const a = dash.avg7(m.key);
                const latestVal = dash.latest[m.key] || 0;
                return (
                  <div key={m.key} style={{ marginBottom: 'var(--space-lg)' }}>
                    <div className="flex-between" style={{ marginBottom: '4px' }}>
                      <span style={{ fontSize: 'var(--font-sm)', fontWeight: 700 }}>{m.label}</span>
                      <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                        Latest <b style={{ color: m.color }}>{latestVal}</b>
                        {a !== null && <> · 7-day avg <b style={{ color: 'var(--text-secondary)' }}>{a.toFixed(1)}</b></>}
                      </span>
                    </div>
                    <Sparkline points={pts} color={m.color} />
                  </div>
                );
              })}
              {customSymptoms.map(c => (
                <div key={c} style={{ marginBottom: 'var(--space-lg)' }}>
                  <div className="flex-between" style={{ marginBottom: '4px' }}>
                    <span style={{ fontSize: 'var(--font-sm)', fontWeight: 700 }}>{c}</span>
                  </div>
                  <Sparkline points={dash.trend(c, true)} color="var(--accent-secondary)" />
                </div>
              ))}
              {entries.length < 3 && (
                <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>
                  Trends and insights get sharper after 3+ days of journaling.
                </p>
              )}
            </div>

            {/* Latest journal snapshot */}
            <div className="card glass-morphism stagger-item" style={{ display: 'block', padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
              <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
                <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                  Latest Journal · {friendlyDate(dash.latest.date)}
                </span>
                <button className="btn btn--sm" style={{ color: 'var(--accent-primary)', fontSize: 'var(--font-xs)', fontWeight: 700 }}
                  onClick={() => { setDate(dash.latest.date); setView('log'); }}>
                  Edit <Icon name="chevron-right" size={12} />
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', marginBottom: (dash.latest.notes || dash.latest.triggers || dash.latest.medications) ? 'var(--space-md)' : 0 }}>
                {CORE_METRICS.map(m => (
                  <div key={m.key} className="glass flex-center" style={{ flexDirection: 'column', padding: '8px 12px', borderRadius: 'var(--radius-md)', minWidth: '62px' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>{m.label}</span>
                    <span style={{ fontSize: 'var(--font-base)', fontWeight: 800, color: m.color }}>{dash.latest[m.key] || 0}</span>
                  </div>
                ))}
                {dash.latest.rash && <span className="badge" style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--danger)', alignSelf: 'center' }}>Rash</span>}
              </div>
              {dash.latest.foods && dash.latest.foods.length > 0 && (
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  <b style={{ color: 'var(--text-primary)' }}>Foods:</b> {dash.latest.foods.join(', ')}
                </div>
              )}
              {dash.latest.triggers && (
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  <b style={{ color: 'var(--text-primary)' }}>Triggers:</b> {dash.latest.triggers}
                </div>
              )}
              {dash.latest.medications && (
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  <b style={{ color: 'var(--text-primary)' }}>Medications:</b> {dash.latest.medications}
                </div>
              )}
              {dash.latest.notes && (
                <div style={{ padding: 'var(--space-sm) var(--space-md)', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', lineHeight: 1.5, borderLeft: '2px solid var(--accent-primary)' }}>
                  {dash.latest.notes}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }} className="stagger-item">
              <button className="btn btn--primary" style={{ flex: 1, height: '52px', borderRadius: 'var(--radius-lg)' }} onClick={goLogToday}>
                {entries.some(e => e.date === today) ? "Update Today's Journal" : "Log Today's Journal"}
              </button>
              <button className="btn btn--outline" style={{ flex: 1, height: '52px', borderRadius: 'var(--radius-lg)' }} onClick={() => setView('history')}>
                View History
              </button>
            </div>
          </>
        )
      )}

      {/* ======================= DAILY JOURNAL (LOG) ======================= */}
      {view === 'log' && (
        <div className="card glass-morphism stagger-item" style={{ marginBottom: 'var(--space-2xl)' }}>
          <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 'var(--space-lg)' }}>
            Your journal is a snapshot of a single day. Rate each symptom, then tap <b>Save Entry</b> — your Dashboard updates automatically.
          </p>
          <div style={{ marginBottom: 'var(--space-xl)', paddingBottom: 'var(--space-md)', borderBottom: '1px solid var(--border)' }}>
            <label style={{ display: 'block', fontSize: 'var(--font-xs)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
              Log Date
            </label>
            <input
              type="date" value={date} onChange={e => setDate(e.target.value)}
              className="input-field"
              style={{ colorScheme: 'dark', fontSize: 'var(--font-base)', fontWeight: 600 }}
            />
          </div>

          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <h3 style={{ marginBottom: 'var(--space-lg)', fontSize: 'var(--font-base)', fontWeight: 700, color: 'var(--text-primary)' }}>Core Symptoms</h3>
            {renderSlider('Pain Level', 'pain')}
            {renderSlider('Morning Stiffness', 'stiffness')}
            {renderSlider('General Fatigue', 'fatigue')}
            {renderSlider('Joint Swelling', 'swelling')}
          </div>

          <div
            className="checkbox-wrapper"
            onClick={() => setForm({ ...form, rash: !form.rash })}
            style={{ marginBottom: 'var(--space-xl)' }}
          >
            <span style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>Experiencing Rash?</span>
            <input type="checkbox" checked={form.rash} onChange={() => {}} className="checkbox-input" />
          </div>

          {/* Food Diary */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
            <h3 style={{ marginBottom: 'var(--space-xs)', fontSize: 'var(--font-base)', fontWeight: 700, color: 'var(--text-primary)' }}>Food Diary</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)', marginBottom: 'var(--space-md)', lineHeight: 1.5 }}>
              Log what you ate today. After a few days, your Dashboard will flag foods that tend to precede worse symptoms.
            </p>

            {form.foods.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: 'var(--space-md)' }}>
                {form.foods.map(f => (
                  <span key={f} className="badge glass" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '999px', fontSize: 'var(--font-xs)', color: 'var(--text-primary)', border: '1px solid var(--accent-primary)' }}>
                    {f}
                    <button
                      onClick={() => removeFood(f)}
                      aria-label={`Remove ${f}`}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', padding: 0, lineHeight: 1 }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-md)' }}>
              <input
                type="text"
                placeholder="Add a food (e.g. dairy, tomatoes)..."
                value={foodDraft}
                onChange={e => setFoodDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addFood()}
                className="input-field"
              />
              <button className="btn btn--outline" style={{ borderRadius: 'var(--radius-md)' }} onClick={() => addFood()}>Add</button>
            </div>

            {foodSuggestions.length > 0 && (
              <>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Quick add
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {foodSuggestions.map(f => (
                    <button
                      key={f}
                      onClick={() => addFood(f)}
                      style={{
                        padding: '6px 12px', borderRadius: '999px', cursor: 'pointer',
                        background: 'var(--bg-glass)', border: '1px solid var(--border)',
                        color: 'var(--text-secondary)', fontSize: 'var(--font-xs)'
                      }}
                    >
                      + {f}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
            <h3 style={{ marginBottom: 'var(--space-xs)', fontSize: 'var(--font-base)', fontWeight: 700, color: 'var(--text-primary)' }}>Personalized Tracking</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)', marginBottom: 'var(--space-lg)' }}>
              Track symptoms specific to your condition.
            </p>
            {customSymptoms.map(c => renderSlider(c, c, true))}
            <div style={{ display: 'flex', gap: '8px', marginTop: 'var(--space-md)' }}>
              <input
                type="text" placeholder="Add custom symptom..."
                value={newCustomSymptom} onChange={e => setNewCustomSymptom(e.target.value)}
                className="input-field"
              />
              <button className="btn btn--outline" style={{ borderRadius: 'var(--radius-md)' }} onClick={addCustomSymptom}>Add</button>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 'var(--font-sm)', marginBottom: 'var(--space-sm)' }}>Flare Triggers</label>
            <textarea
              rows={2} value={form.triggers}
              onChange={(e) => setForm({ ...form, triggers: e.target.value })}
              placeholder="e.g. stress, weather change, missed dose..."
              className="input-field" style={{ resize: 'none' }}
            />
          </div>

          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 'var(--font-sm)', marginBottom: 'var(--space-sm)' }}>Medications & Treatments</label>
            <textarea
              rows={2} value={form.medications}
              onChange={(e) => setForm({ ...form, medications: e.target.value })}
              placeholder="Medications taken today to manage symptoms..."
              className="input-field" style={{ resize: 'none' }}
            />
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-xl)', marginBottom: 'var(--space-2xl)' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 'var(--font-sm)', marginBottom: 'var(--space-sm)' }}>Daily Notes</label>
            <textarea
              rows={3} value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any context or notes for your next doctor visit..."
              className="input-field" style={{ resize: 'none' }}
            />
          </div>

          <button className="btn btn--primary btn--full" onClick={handleSave} style={{ height: '56px', fontSize: 'var(--font-base)', borderRadius: 'var(--radius-lg)' }}>
            Save Entry
          </button>
        </div>
      )}

      {/* ======================= HISTORY ======================= */}
      {view === 'history' && (
        <div style={{ marginBottom: 'var(--space-3xl)' }}>
          {entries.length === 0 ? (
            <div className="empty-state stagger-item">
              <div className="empty-state__icon">
                <Icon name="clipboard" size={48} />
              </div>
              <div className="empty-state__text">No symptoms logged yet.<br />Your history will appear here.</div>
              <button className="btn btn--primary mt-lg" onClick={goLogToday}>Log Your First Entry</button>
            </div>
          ) : (
            <div className="stagger-item">
              {entries.slice().reverse().map(e => (
                <div key={e.date} className="card glass-morphism" style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-lg)', display: 'block' }}
                  onClick={() => { setDate(e.date); setView('log'); }}>
                  <div className="flex-between" style={{ marginBottom: 'var(--space-md)', paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 700, fontSize: 'var(--font-sm)', color: 'var(--text-primary)' }}>
                      {new Date(e.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    {e.rash && <span className="badge" style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--danger)', fontSize: '10px' }}>Rash</span>}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', marginBottom: (e.notes || (e.foods && e.foods.length)) ? 'var(--space-md)' : 0 }}>
                    {CORE_METRICS.map(m => (
                      <div key={m.key} className="glass flex-center" style={{ flexDirection: 'column', padding: '8px 12px', borderRadius: 'var(--radius-md)', minWidth: '60px' }}>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>{m.label}</span>
                        <span style={{ fontSize: 'var(--font-base)', fontWeight: 800, color: m.color }}>{e[m.key] || 0}</span>
                      </div>
                    ))}
                  </div>
                  {e.foods && e.foods.length > 0 && (
                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginBottom: e.notes ? 'var(--space-sm)' : 0 }}>
                      <b style={{ color: 'var(--text-primary)' }}>Foods:</b> {e.foods.join(', ')}
                    </div>
                  )}
                  {e.notes && (
                    <div style={{ padding: 'var(--space-sm) var(--space-md)', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', lineHeight: 1.5, borderLeft: '2px solid var(--accent-primary)' }}>
                      {e.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

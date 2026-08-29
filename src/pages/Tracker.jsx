import { useState, useEffect } from 'react';
import { Icon } from '../components/Icons';
import { 
  getTrackerData, 
  saveTrackerEntry, 
  generateInsights, 
  generateShareText,
  getCustomSymptoms,
  saveCustomSymptoms,
  COMMON_FOODS,
  getCustomFoods,
  saveCustomFoods,
  generateDietCorrelations
} from '../utils/tracker';
import { Share } from '@capacitor/share';

export default function Tracker() {
  const [entries, setEntries] = useState([]);
  const [customSymptoms, setCustomSymptoms] = useState([]);
  const [insights, setInsights] = useState([]);
  
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  
  const emptyForm = {
    pain: 0,
    stiffness: 0,
    fatigue: 0,
    swelling: 0,
    rash: false,
    foods: [],
    triggers: '',
    medications: '',
    notes: '',
    custom: {}
  };

  const [form, setForm] = useState(emptyForm);

  const [newCustomSymptom, setNewCustomSymptom] = useState('');
  const [customFoods, setCustomFoods] = useState([]);
  const [newCustomFood, setNewCustomFood] = useState('');
  const [dietCorrelations, setDietCorrelations] = useState([]);
  const [view, setView] = useState('log'); // 'log' | 'diet' | 'history'

  useEffect(() => {
    const data = getTrackerData();
    setEntries(data);
    setInsights(generateInsights(data));
    setDietCorrelations(generateDietCorrelations(data));
    setCustomSymptoms(getCustomSymptoms());
    setCustomFoods(getCustomFoods());
  }, []);
  
  // Load entry when date changes
  useEffect(() => {
    const existing = entries.find(e => e.date === date);
    if (existing) {
      setForm({ ...emptyForm, ...existing, custom: existing.custom || {}, foods: existing.foods || [] });
    } else {
      setForm(emptyForm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, entries]);

  const handleSave = () => {
    const entry = {
      date,
      ...form
    };
    const updated = saveTrackerEntry(entry);
    setEntries(updated);
    setInsights(generateInsights(updated));
    setDietCorrelations(generateDietCorrelations(updated));
    alert(`Entry saved for ${new Date(date).toLocaleDateString()}`);
  };

  const toggleFood = (food) => {
    setForm(prev => ({
      ...prev,
      foods: prev.foods.includes(food)
        ? prev.foods.filter(f => f !== food)
        : [...prev.foods, food]
    }));
  };

  const addCustomFood = () => {
    const fName = newCustomFood.trim();
    if (!fName) return;
    if (!customFoods.includes(fName) && !COMMON_FOODS.includes(fName)) {
      const updated = [...customFoods, fName];
      setCustomFoods(updated);
      saveCustomFoods(updated);
    }
    // Select it for today automatically
    setForm(prev => ({
      ...prev,
      foods: prev.foods.includes(fName) ? prev.foods : [...prev.foods, fName]
    }));
    setNewCustomFood('');
  };

  const handleShare = async () => {
    const txt = generateShareText(entries);
    try {
      await Share.share({
        title: 'Rheumatology Tracker Report',
        text: txt,
        dialogTitle: 'Share with Medical Team',
      });
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

  const renderSlider = (label, field, isCustom = false ) => {
    const val = isCustom ? (form.custom[field] || 0 ) : form[field];
    return (
      <div style={{ marginBottom: 'var(--space-lg)' }} key={field}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
          <label style={{ fontWeight: 600, fontSize: 'var(--font-sm)', color: 'var(--text-primary)' }}>{label}</label>
          <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: 'var(--font-base)' }}>{val}/10</span>
        </div>
        <input
          type="range"
          min="0" max="10"
          value={val}
          onChange={(e) => {
            const num = parseInt(e.target.value, 10 );
            if (isCustom) {
              setForm(prev => ({ ...prev, custom: { ...prev.custom, [field]: num } }));
            } else {
              setForm(prev => ({ ...prev, [field]: num }));
            }
          }}
          style={{ width: '100%', accentColor: 'var(--accent-primary)', height: '12px', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
          <span>None</span>
          <span>Moderate</span>
          <span>Severe</span>
        </div>
      </div>
    );
  };

  return (
    <div className="page-enter" style={{ paddingBottom: 'var(--space-3xl)' }}>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 className="section-header__title" style={{ fontSize: 'var(--font-3xl)' }}>Symptom Tracker</h1>
          <p className="section-header__subtitle">Monitor and share your disease activity</p>
        </div>
        <button className="btn btn--primary btn--sm" onClick={handleShare} style={{ borderRadius: 'var(--radius-md)' }}>
          <Icon name="share" size={16} /> 
          Report
        </button>
      </div>

      {insights.length > 0 && (
        <div style={{ marginBottom: 'var(--space-xl)' }}>
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

      <div className="glass" style={{ display: 'flex', padding: '4px', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-xl)' }}>
        {[
          { id: 'log', label: 'Daily Log' },
          { id: 'diet', label: 'Diet Trends' },
          { id: 'history', label: 'History' },
        ].map(tab => (
          <button 
            key={tab.id}
            className="btn" 
            style={{ 
              flex: 1, 
              background: view === tab.id ? 'var(--bg-glass-hover)' : 'transparent',
              color: view === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-xs)',
              padding: 'var(--space-sm) var(--space-xs)'
            }}
            onClick={() => setView(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === 'log' ? (
        <div className="card glass-morphism stagger-item" style={{ marginBottom: 'var(--space-2xl)' }}>
          <div style={{ marginBottom: 'var(--space-xl)', paddingBottom: 'var(--space-md)', borderBottom: '1px solid var(--border)' }}>
            <label style={{ display: 'block', fontSize: 'var(--font-xs)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
              Log Date
            </label>
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)}
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
            <input 
              type="checkbox" 
              checked={form.rash}
              onChange={() => {}} // Handled by wrapper
              className="checkbox-input"
            />
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
            <h3 style={{ marginBottom: 'var(--space-xs)', fontSize: 'var(--font-base)', fontWeight: 700, color: 'var(--text-primary)' }}>Personalized Tracking</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)', marginBottom: 'var(--space-lg)' }}>
              Track symptoms specific to your condition.
            </p>
            
            {customSymptoms.map(c => renderSlider(c, c, true))}

            <div style={{ display: 'flex', gap: '8px', marginTop: 'var(--space-md)' }}>
              <input 
                type="text" 
                placeholder="Add custom symptom..." 
                value={newCustomSymptom}
                onChange={e => setNewCustomSymptom(e.target.value)}
                className="input-field"
              />
              <button className="btn btn--outline" style={{ borderRadius: 'var(--radius-md)' }} onClick={addCustomSymptom}>Add</button>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
            <h3 style={{ marginBottom: 'var(--space-xs)', fontSize: 'var(--font-base)', fontWeight: 700, color: 'var(--text-primary)' }}>Diet Log</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)', marginBottom: 'var(--space-lg)' }}>
              Tap the foods you ate today. Over time the Diet Trends tab shows whether any of them track with your symptoms.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
              {[...COMMON_FOODS, ...customFoods].map(food => {
                const selected = form.foods.includes(food);
                return (
                  <button
                    key={food}
                    type="button"
                    onClick={() => toggleFood(food)}
                    className="food-chip"
                    style={{
                      background: selected ? 'rgba(14, 165, 233, 0.18)' : 'var(--bg-glass)',
                      borderColor: selected ? 'var(--border-accent)' : 'var(--border)',
                      color: selected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontWeight: selected ? 700 : 500,
                    }}
                  >
                    {selected && <Icon name="check" size={13} />}
                    {food}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="Add a food or ingredient..." 
                value={newCustomFood}
                onChange={e => setNewCustomFood(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addCustomFood(); }}
                className="input-field"
              />
              <button className="btn btn--outline" style={{ borderRadius: 'var(--radius-md)' }} onClick={addCustomFood}>Add</button>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 'var(--font-sm)', marginBottom: 'var(--space-sm)' }}>Flare Triggers</label>
            <textarea
              rows={2}
              value={form.triggers}
              onChange={(e) => setForm({ ...form, triggers: e.target.value })}
              placeholder="e.g. stress, weather change, missed dose..."
              className="input-field"
              style={{ resize: 'none' }}
            />
          </div>

          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 'var(--font-sm)', marginBottom: 'var(--space-sm)' }}>Medications & Treatments</label>
            <textarea
              rows={2}
              value={form.medications}
              onChange={(e) => setForm({ ...form, medications: e.target.value })}
              placeholder="Medications taken today to manage symptoms..."
              className="input-field"
              style={{ resize: 'none' }}
            />
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-xl)', marginBottom: 'var(--space-2xl)' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 'var(--font-sm)', marginBottom: 'var(--space-sm)' }}>Daily Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any context or notes for your next doctor visit..."
              className="input-field"
              style={{ resize: 'none' }}
            />
          </div>

          <button className="btn btn--primary btn--full" onClick={handleSave} style={{ height: '56px', fontSize: 'var(--font-base)', borderRadius: 'var(--radius-lg)' }}>
            Save Entry
          </button>
        </div>
      ) : view === 'diet' ? (
        <div style={{ marginBottom: 'var(--space-3xl)' }}>
          {dietCorrelations.length === 0 ? (
            <div className="empty-state stagger-item">
              <div className="empty-state__icon">
                <Icon name="search" size={48} />
              </div>
              <div className="empty-state__text">
                Not enough data yet.<br/>
                Log your symptoms and foods for at least 6 days, including 3 or more days with a given food, and trends will appear here.
              </div>
            </div>
          ) : (
            <div className="stagger-item">
              {dietCorrelations.filter(c => c.flagged).length > 0 && (
                <div className="insight-card insight-card--warning" style={{ marginBottom: 'var(--space-lg)' }}>
                  <h3 className="insight-card__title" style={{ color: 'var(--warning)' }}>Possible Diet Influence</h3>
                  <p className="insight-card__message">
                    Some foods below are associated with noticeably higher symptom scores in your log. Association is not proof of cause. Discuss any pattern with your rheumatology team before changing your diet.
                  </p>
                </div>
              )}

              {dietCorrelations.map(c => (
                <div key={c.food} className="card glass-morphism" style={{
                  marginBottom: 'var(--space-md)',
                  padding: 'var(--space-lg)',
                  display: 'block',
                  borderColor: c.flagged ? 'rgba(245, 158, 11, 0.35)' : 'var(--border)'
                }}>
                  <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
                    <div style={{ fontWeight: 700, fontSize: 'var(--font-base)', color: 'var(--text-primary)' }}>{c.food}</div>
                    <span className="badge" style={{
                      background: c.flagged ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.1)',
                      color: c.flagged ? 'var(--warning)' : 'var(--success)',
                      fontSize: 'var(--font-xs)', fontWeight: 700, padding: '4px 10px', borderRadius: 'var(--radius-full)'
                    }}>
                      {c.flagged ? 'Watch' : 'No clear link'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', marginBottom: 'var(--space-sm)' }}>
                    <div className="glass flex-center" style={{ flexDirection: 'column', padding: '8px 12px', borderRadius: 'var(--radius-md)', minWidth: '84px' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Baseline</span>
                      <span style={{ fontSize: 'var(--font-base)', fontWeight: 800, color: 'var(--text-secondary)' }}>{c.baselineAvg}</span>
                    </div>
                    <div className="glass flex-center" style={{ flexDirection: 'column', padding: '8px 12px', borderRadius: 'var(--radius-md)', minWidth: '84px' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Same Day</span>
                      <span style={{ fontSize: 'var(--font-base)', fontWeight: 800, color: c.sameDayDelta >= 1.0 ? 'var(--warning)' : 'var(--text-primary)' }}>
                        {c.sameDayAvg}
                        <span style={{ fontSize: 'var(--font-xs)', fontWeight: 600, marginLeft: '4px', color: c.sameDayDelta > 0 ? 'var(--warning)' : 'var(--success)' }}>
                          ({c.sameDayDelta > 0 ? '+' : ''}{c.sameDayDelta})
                        </span>
                      </span>
                    </div>
                    {c.nextDayAvg !== null && (
                      <div className="glass flex-center" style={{ flexDirection: 'column', padding: '8px 12px', borderRadius: 'var(--radius-md)', minWidth: '84px' }}>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Next Day</span>
                        <span style={{ fontSize: 'var(--font-base)', fontWeight: 800, color: c.nextDayDelta >= 1.0 ? 'var(--warning)' : 'var(--text-primary)' }}>
                          {c.nextDayAvg}
                          <span style={{ fontSize: 'var(--font-xs)', fontWeight: 600, marginLeft: '4px', color: c.nextDayDelta > 0 ? 'var(--warning)' : 'var(--success)' }}>
                            ({c.nextDayDelta > 0 ? '+' : ''}{c.nextDayDelta})
                          </span>
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                    Average of your four core symptom scores (0–10) across {c.daysEaten} day{c.daysEaten === 1 ? '' : 's'} with this food, compared to days without it.
                  </div>
                </div>
              ))}

              <div className="disclaimer" style={{ marginTop: 'var(--space-lg)' }}>
                <div className="disclaimer__icon">
                  <Icon name="info" size={20} color="var(--text-muted)" />
                </div>
                <div>
                  These comparisons are simple averages from your own log and can be influenced by medications, stress, weather, and other factors. They are educational, not a diagnosis of food intolerance.
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ marginBottom: 'var(--space-3xl)' }}>
          {entries.length === 0 ? (
            <div className="empty-state stagger-item">
              <div className="empty-state__icon">
                <Icon name="clipboard" size={48} />
              </div>
              <div className="empty-state__text">No symptoms logged yet.<br/>Your history will appear here.</div>
            </div>
          ) : (
            <div className="stagger-item">
              {entries.slice().reverse().map(e => (
                <div key={e.date} className="card glass-morphism" style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-lg)' }}>
                  <div className="flex-between" style={{ marginBottom: 'var(--space-md)', paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 700, fontSize: 'var(--font-sm)', color: 'var(--text-primary)' }}>
                      {new Date(e.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    {e.rash && <span className="badge" style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--danger)', fontSize: '10px' }}>Rash</span>}
                  </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                    <div className="glass flex-center" style={{ flexDirection: 'column', padding: '8px 12px', borderRadius: 'var(--radius-md)', minWidth: '60px' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Pain</span>
                      <span style={{ fontSize: 'var(--font-base)', fontWeight: 800, color: 'var(--danger)' }}>{e.pain}</span>
                    </div>
                    <div className="glass flex-center" style={{ flexDirection: 'column', padding: '8px 12px', borderRadius: 'var(--radius-md)', minWidth: '60px' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Fatigue</span>
                      <span style={{ fontSize: 'var(--font-base)', fontWeight: 800, color: 'var(--warning)' }}>{e.fatigue}</span>
                    </div>
                    <div className="glass flex-center" style={{ flexDirection: 'column', padding: '8px 12px', borderRadius: 'var(--radius-md)', minWidth: '60px' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Stiff</span>
                      <span style={{ fontSize: 'var(--font-base)', fontWeight: 800, color: 'var(--accent-primary)' }}>{e.stiffness}</span>
                    </div>
                    <div className="glass flex-center" style={{ flexDirection: 'column', padding: '8px 12px', borderRadius: 'var(--radius-md)', minWidth: '60px' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Swell</span>
                      <span style={{ fontSize: 'var(--font-base)', fontWeight: 800, color: 'var(--success)' }}>{e.swelling}</span>
                    </div>
                  </div>

                  {e.foods && e.foods.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: 'var(--space-sm)' }}>
                      {e.foods.map(f => (
                        <span key={f} className="badge" style={{
                          background: 'rgba(139, 92, 246, 0.12)',
                          color: 'var(--accent-secondary)',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-full)'
                        }}>
                          {f}
                        </span>
                      ))}
                    </div>
                  )}

                  {e.notes && (
                    <div style={{ 
                      marginTop: 'var(--space-sm)', 
                      padding: 'var(--space-sm) var(--space-md)', 
                      background: 'rgba(255, 255, 255, 0.02)', 
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--font-xs)', 
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      borderLeft: '2px solid var(--accent-primary)'
                    }}>
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

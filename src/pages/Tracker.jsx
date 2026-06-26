import { useState, useEffect } from 'react';
import { Icon } from '../components/Icons';
import { 
  getTrackerData, 
  saveTrackerEntry, 
  generateInsights, 
  generateShareText,
  getCustomSymptoms,
  saveCustomSymptoms
} from '../utils/tracker';
import { Share } from '@capacitor/share';

export default function Tracker() {
  const [entries, setEntries] = useState([]);
  const [customSymptoms, setCustomSymptoms] = useState([]);
  const [insights, setInsights] = useState([]);
  
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  
  const [form, setForm] = useState({
    pain: 0,
    stiffness: 0,
    fatigue: 0,
    swelling: 0,
    rash: false,
    triggers: '',
    medications: '',
    notes: '',
    custom: {}
  });

  const [newCustomSymptom, setNewCustomSymptom] = useState('');
  const [viewHistory, setViewHistory] = useState(false);

  useEffect(() => {
    const data = getTrackerData();
    setEntries(data);
    setInsights(generateInsights(data));
    setCustomSymptoms(getCustomSymptoms());
  }, []);
  
  // Load entry when date changes
  useEffect(() => {
    const existing = entries.find(e => e.date === date);
    if (existing) {
      setForm({ ...existing, custom: existing.custom || {} });
    } else {
      setForm({
        pain: 0,
        stiffness: 0,
        fatigue: 0,
        swelling: 0,
        rash: false,
        triggers: '',
        medications: '',
        notes: '',
        custom: {}
      });
    }
  }, [date, entries]);

  const handleSave = () => {
    const entry = {
      date,
      ...form
    };
    const updated = saveTrackerEntry(entry);
    setEntries(updated);
    setInsights(generateInsights(updated));
    alert(`Entry saved for ${new Date(date).toLocaleDateString()}`);
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

  const renderSlider = (label, field, isCustom = false) => {
    const val = isCustom ? (form.custom[field] || 0) : form[field];
    return (
      <div style={{ marginBottom: 'var(--space-lg)' }} key={field}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <label style={{ fontWeight: 600 }}>{label}</label>
          <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{val}/10</span>
        </div>
        <input 
          type="range" 
          min="0" max="10" 
          value={val}
          onChange={(e) => {
            const num = parseInt(e.target.value, 10);
            if (isCustom) {
              setForm(prev => ({ ...prev, custom: { ...prev.custom, [field]: num } }));
            } else {
              setForm(prev => ({ ...prev, [field]: num }));
            }
          }}
          style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
          <span>None</span>
          <span>Moderate</span>
          <span>Severe</span>
        </div>
      </div>
    );
  };

  return (
    <div className="page-enter">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="section-header__title">Tracker</h1>
          <p className="section-header__subtitle">Monitor your symptoms over time</p>
        </div>
        <button className="btn btn--outline btn--sm" onClick={handleShare}>
          <Icon name="clipboard" size={16} style={{ marginRight: '4px' }} /> Share
        </button>
      </div>

      {insights.map((insight, i) => (
        <div key={i} style={{
          padding: 'var(--space-md)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-lg)',
          backgroundColor: insight.type === 'warning' ? 'rgba(239, 68, 68, 0.15)' : 
                         insight.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(6, 182, 212, 0.15)',
          border: `1px solid ${insight.type === 'warning' ? 'rgba(239, 68, 68, 0.3)' : 
                             insight.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(6, 182, 212, 0.3)'}`
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: 'var(--font-base)', 
            color: insight.type === 'warning' ? '#f87171' : 
                   insight.type === 'success' ? '#34d399' : 'var(--accent-primary)'
          }}>
            {insight.title}
          </h3>
          <p style={{ margin: 0, fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
            {insight.message}
          </p>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
        <button 
          className={`btn ${!viewHistory ? 'btn--primary' : 'btn--outline'}`} 
          style={{ flex: 1 }}
          onClick={() => setViewHistory(false)}
        >
           Log Symptoms
        </button>
        <button 
          className={`btn ${viewHistory ? 'btn--primary' : 'btn--outline'}`} 
          style={{ flex: 1 }}
          onClick={() => setViewHistory(true)}
        >
          View History
        </button>
      </div>

      {!viewHistory ? (
        <div className="card" style={{ marginBottom: 'var(--space-2xl)' }}>
          <div style={{ marginBottom: 'var(--space-lg)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-md)' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>Select Date</label>
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)}
              style={{
                background: 'var(--bg-glass)', border: '1px solid var(--border)', color: 'var(--text-primary)',
                padding: '10px 14px', borderRadius: 'var(--radius-md)', width: '100%',
                colorScheme: 'dark'
              }}
            />
          </div>

          <h3 style={{ marginBottom: 'var(--space-md)', fontSize: 'var(--font-lg)', color: 'var(--text-primary)' }}>Core Symptoms</h3>
          
          {renderSlider('Pain Level', 'pain')}
          {renderSlider('Morning Stiffness', 'stiffness')}
          {renderSlider('Fatigue', 'fatigue')}
          {renderSlider('Joint Swelling', 'swelling')}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-xl)', padding: 'var(--space-sm) 0' }}>
            <label style={{ fontWeight: 600, fontSize: 'var(--font-base)' }}>Experiencing Rash?</label>
            <input 
              type="checkbox" 
              checked={form.rash}
              onChange={(e) => setForm({ ...form, rash: e.target.checked })}
              style={{ transform: 'scale(1.5)', accentColor: 'var(--accent-primary)' }}
            />
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            <h3 style={{ marginBottom: 'var(--space-sm)', fontSize: 'var(--font-lg)', color: 'var(--text-primary)' }}>Custom Symptoms</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)', marginBottom: 'var(--space-md)' }}>
              Track other symptoms specific to your condition.
            </p>
            
            {customSymptoms.map(c => renderSlider(c, c, true))}

            <div style={{ display: 'flex', gap: '8px', marginTop: 'var(--space-md)' }}>
              <input 
                type="text" 
                placeholder="New symptom..." 
                value={newCustomSymptom}
                onChange={e => setNewCustomSymptom(e.target.value)}
                style={{
                  flex: 1, background: 'var(--bg-glass)', border: '1px solid var(--border)', color: 'var(--text-primary)',
                  padding: '10px 14px', borderRadius: 'var(--radius-md)'
                }}
              />
              <button className="btn btn--outline" onClick={addCustomSymptom}>Add</button>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>Flare Triggers</label>
            <textarea
              rows={2}
              value={form.triggers}
              onChange={(e) => setForm({ ...form, triggers: e.target.value })}
              placeholder="e.g. stress, weather change, missed dose..."
              style={{
                width: '100%', background: 'var(--bg-glass)', border: '1px solid var(--border)', color: 'var(--text-primary)',
                padding: '10px 14px', borderRadius: 'var(--radius-md)', resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>Medications & Treatments</label>
            <textarea
              rows={2}
              value={form.medications}
              onChange={(e) => setForm({ ...form, medications: e.target.value })}
              placeholder="Medications taken today to manage symptoms..."
              style={{
                width: '100%', background: 'var(--bg-glass)', border: '1px solid var(--border)', color: 'var(--text-primary)',
                padding: '10px 14px', borderRadius: 'var(--radius-md)', resize: 'vertical'
              }}
            />
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>Daily Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any triggers, context, or notes for your doctor..."
              style={{
                width: '100%', background: 'var(--bg-glass)', border: '1px solid var(--border)', color: 'var(--text-primary)',
                padding: '10px 14px', borderRadius: 'var(--radius-md)', resize: 'vertical'
              }}
            />
          </div>

          <button className="btn btn--primary btn--full" onClick={handleSave} style={{ fontSize: 'var(--font-base)', padding: '14px', fontWeight: 700 }}>
            Save Entry
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: 'var(--space-2xl)' }}>
          {entries.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl) var(--space-md)' }}>
              <Icon name="clipboard" size={48} color="var(--text-muted)" style={{ marginBottom: 'var(--space-md)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>No symptoms logged yet.<br/>Your history will appear here.</p>
            </div>
          ) : (
            entries.slice().reverse().map(e => (
              <div key={e.date} className="card card--compact" style={{ marginBottom: 'var(--space-sm)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
                    {new Date(e.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <span className="badge badge--danger" title="Pain">Pain: {e.pain}</span>
                    <span className="badge badge--warning" title="Fatigue">Fatigue: {e.fatigue}</span>
                    <span className="badge badge--primary" title="Stiffness">Stiff: {e.stiffness}</span>
                    <span className="badge badge--success" title="Swelling">Swell: {e.swelling}</span>
                  </div>
                  {e.notes && (
                    <div style={{ marginTop: '8px', fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                      📝 {e.notes}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

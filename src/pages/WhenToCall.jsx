import { useState } from 'react';
import { urgencyLevels, searchUrgencyBySymptom } from '../data/whenToCall';
import { Icon } from '../components/Icons';

export default function WhenToCall() {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({ emergency: true });
  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));
  const results = search.trim() ? searchUrgencyBySymptom(search) : null;

  return (
    <div className="page-enter" style={{ paddingBottom: 'var(--space-3xl)' }}>
      <div className="section-header">
        <h1 className="section-header__title" style={{ fontSize: 'var(--font-3xl)' }}>Guidance</h1>
        <p className="section-header__subtitle">When to contact your rheumatology team</p>
      </div>

      <div className="stagger-item" style={{ 
        background: 'rgba(244, 63, 94, 0.1)', 
        border: '1px solid rgba(244, 63, 94, 0.2)', 
        borderRadius: 'var(--radius-xl)', 
        padding: 'var(--space-lg)',
        marginBottom: 'var(--space-xl)',
        display: 'flex',
        gap: 'var(--space-md)',
        alignItems: 'center'
      }}>
        <div className="flex-center" style={{ 
          width: '44px', 
          height: '44px', 
          borderRadius: '50%', 
          background: 'var(--danger)', 
          color: 'white',
          flexShrink: 0,
          boxShadow: '0 0 15px rgba(244, 63, 94, 0.4)'
        }}>
          <Icon name="alert-triangle" size={24} />
        </div>
        <div>
          <strong style={{ color: 'var(--danger)', display: 'block', fontSize: 'var(--font-sm)' }}>Emergency Situation?</strong>
          <p style={{ color: 'var(--text-primary)', fontSize: 'var(--font-xs)', marginTop: '2px', lineHeight: 1.4 }}>
            For life-threatening symptoms, call <strong>911</strong> or go to the nearest ER immediately.
          </p>
        </div>
      </div>

      <div className="search-bar stagger-item">
        <span className="search-bar__icon">
          <Icon name="search" size={18} />
        </span>
        <input 
          className="search-bar__input" 
          type="text" 
          placeholder="Search symptoms (e.g. fever, chest pain)..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
        />
      </div>

      {results ? (
        <div style={{ marginBottom: 'var(--space-2xl)' }}>
          <div className="section-header stagger-item">
            <h3 className="section-header__title" style={{ fontSize: 'var(--font-base)' }}>Search Results ({results.length})</h3>
          </div>
          {results.length > 0 ? (
            <div className="stagger-item">
              {results.map((r, i) => (
                <div key={i} className="urgency-item glass-morphism" style={{ borderLeftColor: r.color }}>
                  <div className="flex-between" style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.2rem' }}>{r.icon}</span>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: r.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{r.urgencyLevel}</span>
                    </div>
                    <Icon name="chevron-right" size={14} color="var(--text-muted)" />
                  </div>
                  <div className="urgency-item__symptom">{r.symptom}</div>
                  <div className="urgency-item__details" style={{ marginTop: '4px' }}>{r.details}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state stagger-item">
              <div className="empty-state__icon">
                <Icon name="search" size={48} />
              </div>
              <div className="empty-state__text">No specific guidance found. If you are concerned, please contact your rheumatologist's office.</div>
              <button className="btn btn--outline mt-lg" onClick={() => setSearch('')}>Clear Search</button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {urgencyLevels.map(level => (
            <div key={level.id} className="glass-morphism stagger-item" style={{ 
              borderRadius: 'var(--radius-xl)', 
              overflow: 'hidden',
              border: expanded[level.id] ? `1px solid ${level.color}33` : '1px solid var(--border)'
            }}>
              <button 
                className="flex-between w-full" 
                onClick={() => toggle(level.id)} 
                style={{ 
                  padding: 'var(--space-lg)', 
                  background: expanded[level.id] ? `${level.color}11` : 'transparent',
                  border: 'none',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
                  <div className="flex-center" style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: 'var(--radius-md)', 
                    background: `${level.color}22`,
                    color: level.color 
                  }}>
                    <Icon name={level.iconName || 'alert-circle'} size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--font-base)', fontWeight: 700, color: level.color }}>{level.level}</div>
                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>{level.instruction}</div>
                  </div>
                </div>
                <Icon 
                  name="chevron-down" 
                  size={16} 
                  style={{ 
                    color: 'var(--text-muted)', 
                    transition: 'transform 0.3s ease',
                    transform: expanded[level.id] ? 'rotate(180deg)' : 'none'
                  }} 
                />
              </button>

              {expanded[level.id] && (
                <div className="urgency-card__body">
                  {level.situations.map((s, i) => (
                    <div key={i} className="urgency-item" style={{ borderLeftColor: level.color, background: 'rgba(255,255,255,0.03)' }}>
                      <div className="urgency-item__symptom">{s.symptom}</div>
                      <div className="urgency-item__details">{s.details}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card glass-morphism stagger-item" style={{ 
        marginTop: 'var(--space-3xl)', 
        padding: 'var(--space-xl)',
        background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)'
      }}>
        <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 800, marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icon name="info" size={20} color="var(--accent-primary)" />
          General Tips
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {[
            { icon: 'phone', title: 'After-Hours', text: 'Know your office\'s after-hours number; most have an on-call provider.' },
            { icon: 'mail', title: 'Patient Portal', text: 'Use your patient portal for non-urgent questions and refills.' },
            { icon: 'check-circle', title: 'Better Safe', text: 'When in doubt, call. It is better to be reassured than to wait too long.' },
            { icon: 'clipboard', title: 'Be Prepared', text: 'Keep your medication list accessible when calling the office.' }
          ].map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <div className="flex-center" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-glass)', color: 'var(--accent-primary)', flexShrink: 0 }}>
                <Icon name={tip.icon} size={16} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: 'var(--font-xs)', color: 'var(--text-primary)' }}>{tip.title}</strong>
                <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: '2px' }}>{tip.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

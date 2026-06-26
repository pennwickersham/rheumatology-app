import { useState } from 'react';
import { urgencyLevels, searchUrgencyBySymptom } from '../data/whenToCall';

export default function WhenToCall() {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({ emergency: true });
  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));
  const results = search.trim() ? searchUrgencyBySymptom(search) : null;

  return (
    <div className="page-enter">
      <div className="section-header">
        <h1 className="section-header__title">When to Call Your Rheumatologist</h1>
        <p className="section-header__subtitle">Know when to seek help and how urgently</p>
      </div>
      <div className="disclaimer">
        <span className="disclaimer__icon">🚨</span>
        <strong>Life-threatening emergency? Call 911 or go to the ER immediately.</strong>
      </div>
      <div className="search-bar">
        <span className="search-bar__icon">🔍</span>
        <input className="search-bar__input" type="text" placeholder="Search symptoms for urgency level..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {results ? (
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>Results ({results.length})</h3>
          {results.length > 0 ? results.map((r, i) => (
            <div key={i} className="urgency-item" style={{ borderColor: r.color }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span>{r.icon}</span>
                <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: r.color, textTransform: 'uppercase' }}>{r.urgencyLevel}</span>
              </div>
              <div className="urgency-item__symptom">{r.symptom}</div>
              <div className="urgency-item__details">{r.details}</div>
            </div>
          )) : <div className="empty-state"><div className="empty-state__text">No specific guidance found. If concerned, call your rheumatologist.</div></div>}
        </div>
      ) : (
        urgencyLevels.map(level => (
          <div key={level.id} className="urgency-card">
            <div className="urgency-card__header" onClick={() => toggle(level.id)} style={{ background: level.bgColor }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flex: 1 }}>
                <span className="urgency-card__icon">{level.icon}</span>
                <div>
                  <div className="urgency-card__level" style={{ color: level.color }}>{level.level}</div>
                  <div className="urgency-card__instruction" style={{ color: level.color }}>{level.instruction}</div>
                </div>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{expanded[level.id] ? '▲' : '▼'}</span>
            </div>
            {expanded[level.id] && (
              <div className="urgency-card__body">
                {level.situations.map((s, i) => (
                  <div key={i} className="urgency-item" style={{ borderColor: level.color }}>
                    <div className="urgency-item__symptom">{s.symptom}</div>
                    <div className="urgency-item__details">{s.details}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)', marginTop: 'var(--space-xl)', marginBottom: 'var(--space-lg)' }}>
        <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>📋 General Tips</h3>
        <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          <p style={{ marginBottom: '8px' }}>• <strong>Know your office's after-hours number</strong> — most practices have an on-call provider.</p>
          <p style={{ marginBottom: '8px' }}>• <strong>Use your patient portal</strong> — for non-urgent questions.</p>
          <p style={{ marginBottom: '8px' }}>• <strong>When in doubt, call</strong> — better to be reassured than wait.</p>
          <p>• <strong>Keep your medication list accessible</strong> when calling.</p>
        </div>
      </div>
    </div>
  );
}

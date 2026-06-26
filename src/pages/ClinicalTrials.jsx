import { useState } from 'react';
import { Icon } from '../components/Icons';
import { diseases } from '../data/diseases';
import { searchTrials } from '../api/clinicaltrials';

export default function ClinicalTrials() {
  const [selectedCondition, setSelectedCondition] = useState('');
  const [customCondition, setCustomCondition] = useState('');
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const handleSearch = async () => {
    const condition = selectedCondition === '__custom__' 
      ? customCondition.trim() 
      : selectedCondition;
    
    if (!condition) {
      setError('Please select or enter a condition to search.');
      return;
    }

    setLoading(true);
    setError('');
    setTrials([]);
    setSearched(true);

    try {
      const results = await searchTrials(condition);
      setTrials(results);
    } catch (err) {
      setError(err.message || 'Failed to search clinical trials. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'RECRUITING': return '#10b981';
      case 'NOT_YET_RECRUITING': return '#f59e0b';
      case 'ACTIVE_NOT_RECRUITING': return '#6366f1';
      default: return 'var(--text-muted)';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'RECRUITING': return 'Recruiting';
      case 'NOT_YET_RECRUITING': return 'Not Yet Recruiting';
      case 'ACTIVE_NOT_RECRUITING': return 'Active, Not Recruiting';
      default: return status;
    }
  };

  return (
    <div className="page-enter" style={{ paddingBottom: 'var(--space-3xl)' }}>
      <div className="section-header">
        <h1 className="section-header__title" style={{ fontSize: 'var(--font-3xl)' }}>Clinical Trials</h1>
        <p className="section-header__subtitle">Explore live research from ClinicalTrials.gov</p>
      </div>

      <div className="card glass-morphism stagger-item" style={{ marginBottom: 'var(--space-2xl)', padding: 'var(--space-xl)' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', lineHeight: 1.6, marginBottom: 'var(--space-xl)' }}>
          Find recruiting studies for your rheumatologic condition. Results are sourced live from the <strong>U.S. National Library of Medicine</strong>.
        </p>

        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <label style={{ display: 'block', fontSize: 'var(--font-xs)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
            Diagnosis or Condition
          </label>
          <select
            value={selectedCondition}
            onChange={(e) => setSelectedCondition(e.target.value)}
            className="select-field"
            style={{ colorScheme: 'dark' }}
          >
            <option value="">— Select your condition —</option>
            {diseases.map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
            <option value="__custom__">Other Condition...</option>
          </select>
        </div>

        {selectedCondition === '__custom__' && (
          <div className="stagger-item" style={{ marginBottom: 'var(--space-xl)', animation: 'slideUp 0.3s ease' }}>
            <label style={{ display: 'block', fontSize: 'var(--font-xs)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
              Enter Condition Name
            </label>
            <input
              type="text"
              placeholder="e.g. Dermatomyositis..."
              value={customCondition}
              onChange={(e) => setCustomCondition(e.target.value)}
              className="input-field"
            />
          </div>
        )}

        {error && (
          <div className="badge badge--danger w-full stagger-item" style={{ 
            marginBottom: 'var(--space-lg)', 
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            justifyContent: 'center'
          }}>
            <Icon name="zap" size={16} />
            {error}
          </div>
        )}

        <button
          className="btn btn--primary btn--full"
          onClick={handleSearch}
          disabled={loading}
          style={{ height: '56px', fontSize: 'var(--font-base)', borderRadius: 'var(--radius-lg)' }}
        >
          {loading ? (
            <>
              <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
              <span>Searching NLM Database...</span>
            </>
          ) : (
            <>
              <Icon name="search" size={20} />
              <span>Search Clinical Trials</span>
            </>
          )}
        </button>
      </div>

      {searched && !loading && (
        <div className="stagger-item" style={{ marginBottom: 'var(--space-lg)', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)', fontWeight: 600 }}>
            {trials.length > 0
              ? `Found ${trials.length} active study findings`
              : 'No recruiting trials found for this search.'}
          </p>
        </div>
      )}

      <div style={{ marginBottom: 'var(--space-3xl)' }}>
        {trials.map((trial, i) => {
          const isExpanded = expandedId === trial.nctId;
          return (
            <div
              key={trial.nctId}
              className={`card glass-morphism stagger-item ${isExpanded ? 'active' : ''}`}
              style={{ 
                marginBottom: 'var(--space-md)', 
                cursor: 'pointer',
                padding: 'var(--space-lg)',
                borderLeft: isExpanded ? `4px solid ${getStatusColor(trial.status)}` : '1px solid var(--border)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onClick={() => setExpandedId(isExpanded ? null : trial.nctId)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-md)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', marginBottom: 'var(--space-md)' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '10px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#fff',
                      background: getStatusColor(trial.status),
                      boxShadow: `0 0 10px ${getStatusColor(trial.status)}44`
                    }}>
                      {getStatusLabel(trial.status)}
                    </span>
                    {trial.phase !== 'N/A' && (
                      <span className="badge glass" style={{ fontSize: '10px', color: 'var(--accent-primary)', borderColor: 'var(--border-accent)' }}>
                        {trial.phase}
                      </span>
                    )}
                  </div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: 'var(--font-base)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {trial.title}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    <span style={{ color: 'var(--accent-secondary)' }}>{trial.nctId}</span>
                    <span>•</span>
                    <span style={{ 
                      maxWidth: '180px', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap' 
                    }}>{trial.sponsor}</span>
                  </div>
                </div>
                <div style={{ 
                  color: 'var(--text-muted)', 
                  transform: isExpanded ? 'rotate(180deg)' : 'none', 
                  transition: 'transform 0.3s ease',
                  marginTop: 'var(--space-xs)'
                }}>
                  <Icon name="chevron-down" size={20} />
                </div>
              </div>

              {isExpanded && (
                <div style={{ marginTop: 'var(--space-xl)', paddingTop: 'var(--space-xl)', borderTop: '1px solid var(--border)', animation: 'fadeIn 0.4s ease' }}>
                  {trial.summary && (
                    <div style={{ marginBottom: 'var(--space-xl)' }}>
                      <h4 style={{ 
                        fontSize: 'var(--font-xs)', 
                        fontWeight: 700, 
                        color: 'var(--accent-primary)', 
                        marginBottom: 'var(--space-sm)', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.05em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <Icon name="info" size={14} />
                        Study Objective
                      </h4>
                      <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                        {trial.summary.length > 500 ? trial.summary.substring(0, 500) + '...' : trial.summary}
                      </p>
                    </div>
                  )}

                  {trial.interventions.length > 0 && (
                    <div style={{ marginBottom: 'var(--space-xl)' }}>
                      <h4 style={{ 
                        fontSize: 'var(--font-xs)', 
                        fontWeight: 700, 
                        color: 'var(--accent-secondary)', 
                        marginBottom: 'var(--space-md)', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.05em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <Icon name="activity" size={14} />
                        Interventions
                      </h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                        {trial.interventions.map((intv, i) => (
                          <span key={i} className="badge glass" style={{ padding: '8px 14px', borderRadius: 'var(--radius-md)' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>{intv.name}</strong>
                            <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>({intv.type})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {trial.locations.length > 0 && (
                    <div style={{ marginBottom: 'var(--space-xl)' }}>
                      <h4 style={{ 
                        fontSize: 'var(--font-xs)', 
                        fontWeight: 700, 
                        color: 'var(--accent-tertiary)', 
                        marginBottom: 'var(--space-md)', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.05em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <Icon name="map-pin" size={14} />
                        Study Locations
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                        {trial.locations.slice(0, 5).map((loc, i) => (
                          <div key={i} style={{ 
                            fontSize: 'var(--font-xs)', 
                            color: 'var(--text-secondary)', 
                            padding: '8px 12px',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex',
                            gap: '8px'
                          }}>
                            <span style={{ opacity: 0.6 }}>📍</span>
                            <span>{[loc.facility, loc.city, loc.state].filter(Boolean).join(', ')}</span>
                          </div>
                        ))}
                        {trial.locations.length > 5 && (
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', paddingLeft: 'var(--space-md)', marginTop: '4px' }}>
                            + {trial.locations.length - 5} more locations available on ClinicalTrials.gov
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div style={{ 
                    display: 'flex', 
                    gap: 'var(--space-lg)', 
                    padding: 'var(--space-md)', 
                    background: 'var(--bg-glass)', 
                    borderRadius: 'var(--radius-lg)',
                    marginBottom: 'var(--space-xl)'
                  }}>
                    {trial.enrollment && (
                      <div style={{ flex: 1 }}>
                        <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Enrollment</span>
                        <span style={{ fontSize: 'var(--font-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{trial.enrollment}</span>
                      </div>
                    )}
                    {trial.startDate && (
                      <div style={{ flex: 1 }}>
                        <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Start Date</span>
                        <span style={{ fontSize: 'var(--font-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{trial.startDate}</span>
                      </div>
                    )}
                  </div>

                  <a
                    href={trial.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="btn btn--outline btn--full"
                    style={{ borderRadius: 'var(--radius-lg)', justifyContent: 'center' }}
                  >
                    <Icon name="external-link" size={16} /> 
                    Full Study Details
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

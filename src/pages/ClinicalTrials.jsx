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
    <div className="page-enter">
      <div className="section-header">
        <h1 className="section-header__title">Clinical Trials</h1>
        <p className="section-header__subtitle">Find active studies by diagnosis</p>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-lg)' }}>
          Search <strong>ClinicalTrials.gov</strong> for recruiting studies related to your rheumatologic condition. Results are sourced live from the U.S. National Library of Medicine.
        </p>

        <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>Select Condition</label>
        <select
          value={selectedCondition}
          onChange={(e) => setSelectedCondition(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 14px',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-md)',
            fontSize: 'var(--font-base)',
            colorScheme: 'dark',
          }}
        >
          <option value="">— Choose a condition —</option>
          {diseases.map(d => (
            <option key={d.id} value={d.name}>{d.name} ({d.shortName})</option>
          ))}
          <option value="__custom__">Other (type your own)...</option>
        </select>

        {selectedCondition === '__custom__' && (
          <input
            type="text"
            placeholder="e.g. Dermatomyositis, Scleroderma..."
            value={customCondition}
            onChange={(e) => setCustomCondition(e.target.value)}
            className="form-input"
            style={{ width: '100%', marginBottom: 'var(--space-md)' }}
          />
        )}

        {error && (
          <div style={{ padding: 'var(--space-sm)', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', fontSize: 'var(--font-sm)' }}>
            {error}
          </div>
        )}

        <button
          className="btn btn--primary btn--full"
          onClick={handleSearch}
          disabled={loading}
          style={{ height: '48px', fontSize: 'var(--font-base)', fontWeight: 600 }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
              Searching...
            </span>
          ) : (
            'Search Clinical Trials'
          )}
        </button>
      </div>

      {searched && !loading && (
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-md)' }}>
            {trials.length > 0
              ? `Found ${trials.length} active trial${trials.length !== 1 ? 's' : ''}`
              : 'No recruiting trials found for this condition. Try broadening your search or check back later.'}
          </p>
        </div>
      )}

      <div style={{ marginBottom: 'var(--space-2xl)' }}>
        {trials.map(trial => {
          const isExpanded = expandedId === trial.nctId;
          return (
            <div
              key={trial.nctId}
              className="card"
              style={{ marginBottom: 'var(--space-sm)', cursor: 'pointer' }}
              onClick={() => setExpandedId(isExpanded ? null : trial.nctId)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-sm)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: 'var(--font-xs)',
                      fontWeight: 600,
                      color: '#fff',
                      background: getStatusColor(trial.status),
                    }}>
                      {getStatusLabel(trial.status)}
                    </span>
                    {trial.phase !== 'N/A' && (
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: 'var(--font-xs)',
                        fontWeight: 600,
                        color: 'var(--accent-primary)',
                        border: '1px solid var(--accent-primary)',
                      }}>
                        {trial.phase}
                      </span>
                    )}
                  </div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: 'var(--font-sm)', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    {trial.title}
                  </h3>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                    {trial.nctId} · {trial.sponsor}
                  </div>
                </div>
                <span style={{ color: 'var(--text-muted)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  ▼
                </span>
              </div>

              {isExpanded && (
                <div style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border)' }}>
                  {trial.summary && (
                    <div style={{ marginBottom: 'var(--space-md)' }}>
                      <h4 style={{ fontSize: 'var(--font-xs)', color: 'var(--accent-primary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Summary</h4>
                      <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                        {trial.summary.length > 400 ? trial.summary.substring(0, 400) + '...' : trial.summary}
                      </p>
                    </div>
                  )}

                  {trial.interventions.length > 0 && (
                    <div style={{ marginBottom: 'var(--space-md)' }}>
                      <h4 style={{ fontSize: 'var(--font-xs)', color: 'var(--accent-primary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Interventions</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {trial.interventions.map((intv, i) => (
                          <span key={i} style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: 'var(--font-xs)',
                            background: 'rgba(6, 182, 212, 0.15)',
                            color: 'var(--accent-primary)',
                            border: '1px solid rgba(6, 182, 212, 0.25)',
                          }}>
                            {intv.name} <span style={{ opacity: 0.6 }}>({intv.type})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {trial.locations.length > 0 && (
                    <div style={{ marginBottom: 'var(--space-md)' }}>
                      <h4 style={{ fontSize: 'var(--font-xs)', color: 'var(--accent-primary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Locations</h4>
                      {trial.locations.map((loc, i) => (
                        <div key={i} style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                          📍 {[loc.facility, loc.city, loc.state, loc.country].filter(Boolean).join(', ')}
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
                    {trial.enrollment && <span>👥 Target: {trial.enrollment} participants</span>}
                    {trial.startDate && <span>📅 Started: {trial.startDate}</span>}
                  </div>

                  <a
                    href={trial.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="btn btn--outline btn--sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                  >
                    <Icon name="link" size={14} /> View on ClinicalTrials.gov
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

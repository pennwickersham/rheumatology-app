import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { medications, drugClasses, getMedicationById, getMedicationsByClass, searchMedications, getDrugClassById } from '../data/medications';
import { getDrugDetails } from '../api/fda';
import { formatSectionTitle, getSectionPriority } from '../utils/formatFda';
import { Icon } from '../components/Icons';

export default function Medications() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [activeClass, setActiveClass] = useState(searchParams.get('class') || 'all');
  const [selectedMed, setSelectedMed] = useState(null);
  const [fdaData, setFdaData] = useState(null);
  const [loadingFda, setLoadingFda] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    if (id) {
      const med = getMedicationById(id);
      if (med) {
        setSelectedMed(med);
        loadFdaData(med);
      }
    } else {
      setSelectedMed(null);
      setFdaData(null);
    }
  }, [id]);

  async function loadFdaData(med) {
    setLoadingFda(true);
    try {
      const data = await getDrugDetails(med.fdaSearchTerm);
      setFdaData(data);
    } catch (e) {
      console.error('FDA data load error:', e);
    }
    setLoadingFda(false);
  }

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter medications
  let filtered = search ? searchMedications(search) : medications;
  if (activeClass !== 'all' && !search) {
    filtered = getMedicationsByClass(activeClass);
  }

  // Detail view
  if (selectedMed) {
    const drugClass = getDrugClassById(selectedMed.drugClass);
    const sectionOrder = getSectionPriority();

    return (
      <div className="page-enter" style={{ paddingBottom: 'var(--space-3xl)' }}>
        <button className="back-btn" onClick={() => navigate('/medications')}>
          <Icon name="arrow-left" size={16} />
          Back to Medications
        </button>

        <div className="glass-morphism" style={{
          padding: 'var(--space-xl) var(--space-lg)',
          borderRadius: 'var(--radius-2xl)',
          marginBottom: 'var(--space-xl)',
          border: '1px solid var(--border-light)',
          background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-lg)',
          }}>
            <div className="flex-center" style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: 'var(--radius-xl)',
              background: 'var(--bg-glass)',
              color: 'var(--accent-primary)',
              boxShadow: 'var(--shadow-glow)'
            }}>
              <Icon name={selectedMed.icon} size={32} />
            </div>
            <div>
              <h1 style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, lineHeight: 1.2 }}>{selectedMed.genericName}</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginTop: '4px' }}>
                {selectedMed.brandNames.join(', ')}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)', flexWrap: 'wrap' }}>
            <span className="badge glass" style={{ color: 'var(--accent-primary)' }}>
              <Icon name="info" size={12} />
              {drugClass?.name}
            </span>
          </div>
        </div>

        {/* Side Effects */}
        <div className="section-header stagger-item">
          <h2 className="section-header__title" style={{ fontSize: 'var(--font-lg)' }}>Safety Profile</h2>
        </div>

        <div className="card glass-morphism stagger-item" style={{ marginBottom: 'var(--space-2xl)', padding: 'var(--space-xl)' }}>
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <h4 style={{ 
              fontSize: 'var(--font-xs)', 
              fontWeight: 700, 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em',
              color: 'var(--warning)', 
              marginBottom: 'var(--space-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Icon name="zap" size={14} />
              Common Side Effects
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
              {selectedMed.commonSideEffects.map(se => (
                <span key={se} className="badge" style={{ 
                  padding: '8px 14px', 
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(245, 158, 11, 0.08)',
                  color: 'var(--warning)',
                  border: '1px solid rgba(245, 158, 11, 0.15)',
                  fontSize: 'var(--font-xs)'
                }}>{se}</span>
              ))}
            </div>
          </div>

          <div>
            <h4 style={{ 
              fontSize: 'var(--font-xs)', 
              fontWeight: 700, 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em',
              color: 'var(--danger)', 
              marginBottom: 'var(--space-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Icon name="alert-triangle" size={14} />
              Serious Side Effects
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
              {selectedMed.seriousSideEffects.map(se => (
                <span key={se} className="badge" style={{ 
                  padding: '8px 14px', 
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(244, 63, 94, 0.08)',
                  color: 'var(--danger)',
                  border: '1px solid rgba(244, 63, 94, 0.15)',
                  fontSize: 'var(--font-xs)'
                }}>{se}</span>
              ))}
            </div>
          </div>
        </div>

        {/* FDA Package Insert Data */}
        <div className="section-header stagger-item">
          <h2 className="section-header__title" style={{ fontSize: 'var(--font-lg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="clipboard" size={20} color="var(--accent-primary)" />
            FDA Package Insert
          </h2>
          <p className="section-header__subtitle">Official prescribing information for patients</p>
        </div>

        {loadingFda ? (
          <div className="loading-container">
            <div className="spinner" />
            <span>Connecting to FDA database...</span>
          </div>
        ) : fdaData ? (
          <div className="stagger-item">
            <div className="glass flex-between" style={{
              padding: 'var(--space-md) var(--space-lg)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: 'var(--space-lg)',
              fontSize: 'var(--font-xs)',
              color: 'var(--text-muted)',
            }}>
              <span>Manufacturer: <strong style={{ color: 'var(--text-secondary)' }}>{fdaData.manufacturer}</strong></span>
              {fdaData.applicationNumber && <span>NDA: <strong style={{ color: 'var(--text-secondary)' }}>{fdaData.applicationNumber}</strong></span>}
            </div>

            <div style={{ borderRadius: 'var(--radius-xl)' }}>
              {sectionOrder.map(key => {
                const content = fdaData[key];
                if (!content) return null;
                const title = formatSectionTitle(key);
                const isWarning = key === 'boxedWarning';
                const isExpanded = expandedSections[key];

                return (
                  <div
                    key={key}
                    className={`expandable ${isExpanded ? 'open' : ''} ${isWarning ? 'fda-section--warning' : ''}`}
                    style={{ 
                      marginBottom: isWarning ? 'var(--space-md)' : 0, 
                      marginTop: isWarning ? 'var(--space-md)' : 0,
                      borderRadius: isWarning ? 'var(--radius-md)' : 0,
                      borderBottom: isWarning ? undefined : (isExpanded || key === sectionOrder[sectionOrder.length - 1] ? 'none' : '1px solid var(--border)'),
                      borderTop: 'none',
                      borderLeft: 'none',
                      borderRight: 'none',
                      background: isWarning ? undefined : 'transparent',
                      padding: isWarning ? '0' : 0
                    }}
                  >
                    <button
                      className="expandable__header"
                      onClick={() => toggleSection(key)}
                      style={{ padding: isWarning ? undefined : 'var(--space-lg) 0' }}
                    >
                      <span className="fda-section__title" style={{ padding: 0 }}>
                        {title}
                      </span>
                      <Icon 
                        name="chevron-down" 
                        size={16} 
                        className="expandable__chevron" 
                      />
                    </button>
                    {isExpanded && (
                      <div className="expandable__body fda-section__content" style={{ padding: isWarning ? undefined : '0 0 var(--space-lg) 0', animation: 'fadeIn 0.3s ease' }}>
                        {content}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="disclaimer" style={{ marginTop: 'var(--space-2xl)' }}>
              <div className="disclaimer__icon">
                <Icon name="info" size={20} color="var(--text-muted)" />
              </div>
              <div>
                Data sourced from the FDA openFDA Drug Label API. This information is provided for educational purposes only. Always consult with your healthcare provider or pharmacist before making medical decisions.
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state stagger-item">
            <div className="empty-state__icon">
              <Icon name="clipboard" size={48} />
            </div>
            <div className="empty-state__text">FDA label data is currently unavailable.</div>
            <button className="btn btn--outline mt-lg" onClick={() => loadFdaData(selectedMed)}>
              Try Again
            </button>
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="page-enter" style={{ paddingBottom: 'var(--space-3xl)' }}>
      <div className="section-header">
        <h1 className="section-header__title" style={{ fontSize: 'var(--font-3xl)' }}>Medications</h1>
        <p className="section-header__subtitle">FDA prescribing information and safety data</p>
      </div>

      <div className="search-bar stagger-item">
        <span className="search-bar__icon">
          <Icon name="search" size={18} />
        </span>
        <input
          className="search-bar__input"
          type="text"
          placeholder="Search by generic or brand name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {!search && (
        <div className="pill-tabs stagger-item" style={{ marginBottom: 'var(--space-lg)' }}>
          <button
            className={`pill-tab ${activeClass === 'all' ? 'active' : ''}`}
            onClick={() => setActiveClass('all')}
            style={{ padding: '10px 20px' }}
          >
            All Drugs
          </button>
          {drugClasses.map(cls => (
            <button
              key={cls.id}
              className={`pill-tab ${activeClass === cls.id ? 'active' : ''}`}
              onClick={() => setActiveClass(cls.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
            >
              <Icon name={cls.icon} size={16} /> 
              <span>{cls.name}</span>
            </button>
          ))}
        </div>
      )}

      <div className="grid-1">
        {filtered.map((med, i) => {
          const cls = getDrugClassById(med.drugClass);
          return (
            <div
              key={med.id}
              className="card card--compact stagger-item"
              onClick={() => navigate(`/medications/${med.id}`)}
              style={{ padding: 'var(--space-lg)' }}
            >
              <div className="flex-center" style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: 'var(--radius-lg)',
                background: 'rgba(14, 165, 233, 0.1)',
                color: 'var(--accent-primary)',
                flexShrink: 0
              }}>
                <Icon name={med.icon} size={28} />
              </div>
              <div className="card__content">
                <div className="card__title" style={{ fontSize: 'var(--font-lg)' }}>{med.genericName}</div>
                <div className="card__subtitle" style={{ fontSize: 'var(--font-xs)', marginTop: '4px' }}>
                  {med.brandNames.join(', ')} • <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{cls?.name}</span>
                </div>
              </div>
              <Icon name="chevron-right" size={20} className="card__arrow" />
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state stagger-item">
          <div className="empty-state__icon">
            <Icon name="search" size={48} />
          </div>
          <div className="empty-state__text">No medications found matching "{search}"</div>
          <button className="btn btn--outline mt-lg" onClick={() => setSearch('')}>
            Clear Search
          </button>
        </div>
      )}
    </div>
  );
}

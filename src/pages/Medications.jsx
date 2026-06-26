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
      <div className="page-enter">
        <button className="back-btn" onClick={() => navigate('/medications')}>
          ← Back to Medications
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-md)',
          marginBottom: 'var(--space-sm)',
        }}>
          <span style={{ fontSize: '2.5rem', color: 'var(--info)' }}>
            <Icon name={selectedMed.icon} size={40} />
          </span>
          <div>
            <h1 style={{ fontSize: 'var(--font-2xl)', fontWeight: 700 }}>{selectedMed.genericName}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
              {selectedMed.brandNames.join(', ')}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
          <span className="badge badge--primary">{drugClass?.name}</span>
        </div>

        {/* Known Side Effects from our database */}
        <div className="section-header">
          <h2 className="section-header__title" style={{ fontSize: 'var(--font-lg)' }}>Known Side Effects</h2>
        </div>

        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <h4 style={{ fontSize: 'var(--font-sm)', color: 'var(--text-accent)', marginBottom: 'var(--space-sm)' }}>
            Common Side Effects
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
            {selectedMed.commonSideEffects.map(se => (
              <span key={se} className="badge badge--warning" style={{ padding: '6px 12px' }}>{se}</span>
            ))}
          </div>

          <h4 style={{ fontSize: 'var(--font-sm)', color: '#f87171', marginBottom: 'var(--space-sm)' }}>
            Serious Side Effects
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
            {selectedMed.seriousSideEffects.map(se => (
              <span key={se} className="badge badge--danger" style={{ padding: '6px 12px' }}>{se}</span>
            ))}
          </div>
        </div>

        {/* FDA Package Insert Data */}
        <div className="section-header">
          <h2 className="section-header__title" style={{ fontSize: 'var(--font-lg)' }}>
            📋 FDA Package Insert
          </h2>
          <p className="section-header__subtitle">Official prescribing information from the FDA</p>
        </div>

        {loadingFda ? (
          <div className="loading-container">
            <div className="spinner" />
            <span>Loading FDA drug label...</span>
          </div>
        ) : fdaData ? (
          <div>
            <div style={{
              display: 'flex',
              gap: 'var(--space-sm)',
              flexWrap: 'wrap',
              marginBottom: 'var(--space-md)',
              fontSize: 'var(--font-xs)',
              color: 'var(--text-muted)',
            }}>
              <span>Manufacturer: {fdaData.manufacturer}</span>
              {fdaData.applicationNumber && <span>· NDA: {fdaData.applicationNumber}</span>}
            </div>

            {sectionOrder.map(key => {
              const content = fdaData[key];
              if (!content) return null;
              const title = formatSectionTitle(key);
              const isWarning = key === 'boxedWarning';
              const isExpanded = expandedSections[key];
              const isLong = content.length > 300;

              return (
                <div
                  key={key}
                  className={`fda-section ${isWarning ? 'fda-section--warning' : ''}`}
                >
                  <div
                    className="expandable__header"
                    onClick={() => toggleSection(key)}
                    style={{ padding: 'var(--space-sm) 0' }}
                  >
                    <span className="fda-section__title" style={{ margin: 0, border: 'none', padding: 0 }}>
                      {title}
                    </span>
                    <span className={`expandable__chevron ${isExpanded ? '' : ''}`}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>
                  {isExpanded && (
                    <div className="fda-section__content" style={{ paddingBottom: 'var(--space-md)' }}>
                      {content}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="disclaimer" style={{ marginTop: 'var(--space-lg)' }}>
              <span className="disclaimer__icon">ℹ️</span>
              Data sourced from the FDA openFDA Drug Label API. For complete prescribing information, consult the full package insert or your pharmacist.
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state__icon">📋</div>
            <div className="empty-state__text">FDA label data unavailable. Try again later.</div>
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="page-enter">
      <div className="section-header">
        <h1 className="section-header__title">Medications</h1>
        <p className="section-header__subtitle">FDA package insert information</p>
      </div>

      <div className="search-bar">
        <span className="search-bar__icon">🔍</span>
        <input
          className="search-bar__input"
          type="text"
          placeholder="Search medications..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {!search && (
        <div className="pill-tabs">
          <button
            className={`pill-tab ${activeClass === 'all' ? 'active' : ''}`}
            onClick={() => setActiveClass('all')}
          >
            All
          </button>
          {drugClasses.map(cls => (
            <button
              key={cls.id}
              className={`pill-tab ${activeClass === cls.id ? 'active' : ''}`}
              onClick={() => setActiveClass(cls.id)}
            >
              <Icon name={cls.icon} size={16} style={{ marginRight: '4px' }} /> {cls.name}
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
            >
              <span className="card__icon" style={{ fontSize: '1.5rem', color: 'var(--info)' }}>
                <Icon name={med.icon} size={24} />
              </span>
              <div className="card__content">
                <div className="card__title" style={{ fontSize: 'var(--font-base)' }}>{med.genericName}</div>
                <div className="card__subtitle">
                  {med.brandNames[0]} · <span style={{ color: 'var(--text-muted)' }}>{cls?.name}</span>
                </div>
              </div>
              <span className="card__arrow">→</span>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__icon">💊</div>
          <div className="empty-state__text">No medications match your search.</div>
        </div>
      )}
    </div>
  );
}

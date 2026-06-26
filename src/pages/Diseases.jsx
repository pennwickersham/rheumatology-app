import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { diseases, getDiseaseById, searchDiseases } from '../data/diseases';
import { getMedicationById } from '../data/medications';
import { getDiseaseLiterature } from '../api/pubmed';
import { Icon } from '../components/Icons';
import { useAuth } from '../context/AuthContext';

export default function Diseases() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedDisease, setSelectedDisease] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loadingArticles, setLoadingArticles] = useState(false);

  useEffect(() => {
    if (id) {
      const disease = getDiseaseById(id);
      if (disease) {
        setSelectedDisease(disease);
        loadArticles(disease);
      }
    } else {
      setSelectedDisease(null);
      setArticles([]);
    }
  }, [id]);

  async function loadArticles(disease) {
    setLoadingArticles(true);
    try {
      const data = await getDiseaseLiterature(disease.name, disease.pubmedTerms);
      setArticles(data);
    } catch (e) {
      console.error('Failed to load articles:', e);
    }
    setLoadingArticles(false);
  }

  const filtered = search ? searchDiseases(search) : diseases;
  
  const displayDiseases = [...filtered].sort((a, b) => {
    if (!user || !user.diseases) return 0;
    const aSelected = user.diseases.includes(a.id);
    const bSelected = user.diseases.includes(b.id);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    return 0;
  });

  // Detail view
  if (selectedDisease) {
    return (
      <div className="page-enter" style={{ paddingBottom: 'var(--space-3xl)' }}>
        <button className="back-btn" onClick={() => navigate('/diseases')}>
          <Icon name="arrow-left" size={16} />
          Back to Diseases
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
              <Icon name={selectedDisease.icon} size={32} />
            </div>
            <div>
              <h1 style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, lineHeight: 1.2 }}>{selectedDisease.name}</h1>
              <div className="badge badge--primary mt-xs" style={{ marginTop: '4px' }}>
                <Icon name="info" size={12} />
                {selectedDisease.icd10}
              </div>
            </div>
          </div>
        </div>

        <div className="stagger-item">
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: 'var(--font-sm)',
            lineHeight: 1.8,
            marginBottom: 'var(--space-xl)',
          }}>
            {selectedDisease.description}
          </p>
        </div>

        {/* Symptoms */}
        <div className="section-header stagger-item">
          <h2 className="section-header__title" style={{ fontSize: 'var(--font-lg)' }}>Common Symptoms</h2>
        </div>
        <div className="stagger-item" style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-sm)',
          marginBottom: 'var(--space-xl)',
        }}>
          {selectedDisease.symptoms.map(s => (
            <span key={s} className="badge glass" style={{ padding: '8px 14px', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}>
              {s}
            </span>
          ))}
        </div>

        {/* Common Joints if available */}
        {selectedDisease.commonJoints && (
          <>
            <div className="section-header stagger-item">
              <h2 className="section-header__title" style={{ fontSize: 'var(--font-lg)' }}>Affected Joints</h2>
            </div>
            <div className="stagger-item" style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'var(--space-sm)',
              marginBottom: 'var(--space-xl)',
            }}>
              {selectedDisease.commonJoints.map(j => (
                <span key={j} className="badge" style={{ 
                  padding: '8px 14px', 
                  borderRadius: 'var(--radius-md)', 
                  background: 'rgba(16, 185, 129, 0.1)', 
                  color: 'var(--success)',
                  border: '1px solid rgba(16, 185, 129, 0.2)'
                }}>
                  {j}
                </span>
              ))}
            </div>
          </>
        )}

        {/* Related Medications */}
        <div className="section-header stagger-item">
          <h2 className="section-header__title" style={{ fontSize: 'var(--font-lg)' }}>Therapeutic Options</h2>
        </div>
        <div className="grid-1 stagger-item" style={{ marginBottom: 'var(--space-2xl)' }}>
          {selectedDisease.relatedMedications.map(medId => {
            const med = getMedicationById(medId);
            if (!med) return null;
            return (
              <div
                key={med.id}
                className="card card--compact"
                onClick={() => navigate(`/medications/${med.id}`)}
                style={{ padding: 'var(--space-md) var(--space-lg)' }}
              >
                <div className="flex-center" style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(59, 130, 246, 0.1)',
                  color: 'var(--info)'
                }}>
                  <Icon name={med.icon} size={20} />
                </div>
                <div className="card__content">
                  <div className="card__title" style={{ fontSize: 'var(--font-base)' }}>{med.genericName}</div>
                  <div className="card__subtitle">{med.brandNames[0]}</div>
                </div>
                <Icon name="chevron-right" size={16} className="card__arrow" />
              </div>
            );
          })}
        </div>

        {/* PubMed Literature */}
        <div className="section-header stagger-item">
          <h2 className="section-header__title" style={{ fontSize: 'var(--font-lg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="microscope" size={20} color="var(--accent-primary)" />
            Recent Research
          </h2>
          <p className="section-header__subtitle">Evidence-based patient education from PubMed</p>
        </div>

        {loadingArticles ? (
          <div className="loading-container">
            <div className="spinner" />
            <span>Curating latest research...</span>
          </div>
        ) : articles.length > 0 ? (
          <div className="stagger-item">
            {articles.map(article => (
              <div key={article.pmid} className="article-card glass-morphism">
                <div className="article-card__title">{article.title}</div>
                <div className="article-card__meta">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Icon name="user" size={12} />
                    {article.authors && article.authors.split(',')[0]}
                    {article.authors && article.authors.split(',').length > 1 ? ' et al.' : ''}
                  </span>
                  <span>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Icon name="calendar" size={12} />
                    {article.pubDate}
                  </span>
                </div>
                {article.abstract && (
                  <div className="article-card__abstract">
                    {article.abstract.length > 200 ? article.abstract.substring(0, 200) + '...' : article.abstract}
                  </div>
                )}
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--outline btn--sm btn--full"
                  style={{ borderRadius: 'var(--radius-md)', justifyContent: 'center' }}
                >
                  View on PubMed
                  <Icon name="external-link" size={14} />
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state stagger-item">
            <div className="empty-state__icon">
              <Icon name="search" size={48} />
            </div>
            <div className="empty-state__text">No recent articles found for this condition.</div>
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="page-enter" style={{ paddingBottom: 'var(--space-3xl)' }}>
      <div className="section-header">
        <h1 className="section-header__title" style={{ fontSize: 'var(--font-3xl)' }}>Disease Info</h1>
        <p className="section-header__subtitle">Medical insights on rheumatologic conditions</p>
      </div>

      <div className="search-bar stagger-item">
        <span className="search-bar__icon">
          <Icon name="search" size={18} />
        </span>
        <input
          className="search-bar__input"
          type="text"
          placeholder="Search conditions or symptoms..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid-1">
        {displayDiseases.map((disease, i) => {
          const isUserDisease = user && user.diseases && user.diseases.includes(disease.id);
          return (
          <div
            key={disease.id}
            className="card card--compact stagger-item"
            style={{ 
              padding: 'var(--space-lg)',
              borderColor: isUserDisease ? 'var(--border-accent)' : 'var(--border)',
              background: isUserDisease ? 'rgba(14, 165, 233, 0.05)' : 'var(--bg-card)'
            }}
            onClick={() => navigate(`/diseases/${disease.id}`)}
          >
            <div className="flex-center" style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-glass)',
              color: isUserDisease ? 'var(--accent-primary)' : 'var(--text-secondary)',
              flexShrink: 0
            }}>
              <Icon name={disease.icon} size={28} />
            </div>
            <div className="card__content">
              <div className="card__title" style={{ fontSize: 'var(--font-lg)' }}>
                {disease.name}
                {isUserDisease && (
                  <span style={{ 
                    marginLeft: '8px', 
                    fontSize: '10px', 
                    background: 'var(--accent-primary)', 
                    color: 'white', 
                    padding: '2px 6px', 
                    borderRadius: '4px',
                    verticalAlign: 'middle',
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}>Your Condition</span>
                )}
              </div>
              <div className="card__subtitle" style={{ fontSize: 'var(--font-xs)', marginTop: '4px' }}>
                {disease.description.substring(0, 90)}...
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
          <div className="empty-state__text">No conditions match your search criteria.</div>
          <button className="btn btn--outline mt-lg" onClick={() => setSearch('')}>
            Clear Search
          </button>
        </div>
      )}
    </div>
  );
}

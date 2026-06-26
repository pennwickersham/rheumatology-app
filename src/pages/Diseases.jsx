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
      <div className="page-enter">
        <button className="back-btn" onClick={() => navigate('/diseases')}>
          ← Back to Diseases
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-md)',
          marginBottom: 'var(--space-lg)',
        }}>
          <span style={{ fontSize: '2.5rem', color: 'var(--accent)' }}>
            <Icon name={selectedDisease.icon} size={40} />
          </span>
          <div>
            <h1 style={{ fontSize: 'var(--font-2xl)', fontWeight: 700 }}>{selectedDisease.name}</h1>
            <span className="badge badge--primary">{selectedDisease.icd10}</span>
          </div>
        </div>

        <p style={{
          color: 'var(--text-secondary)',
          fontSize: 'var(--font-sm)',
          lineHeight: 1.7,
          marginBottom: 'var(--space-xl)',
        }}>
          {selectedDisease.description}
        </p>

        {/* Symptoms */}
        <div className="section-header">
          <h2 className="section-header__title" style={{ fontSize: 'var(--font-lg)' }}>Common Symptoms</h2>
        </div>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-sm)',
          marginBottom: 'var(--space-xl)',
        }}>
          {selectedDisease.symptoms.map(s => (
            <span key={s} className="badge badge--primary" style={{ padding: '6px 12px' }}>
              {s}
            </span>
          ))}
        </div>

        {/* Common Joints if available */}
        {selectedDisease.commonJoints && (
          <>
            <div className="section-header">
              <h2 className="section-header__title" style={{ fontSize: 'var(--font-lg)' }}>Commonly Affected Joints</h2>
            </div>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'var(--space-sm)',
              marginBottom: 'var(--space-xl)',
            }}>
              {selectedDisease.commonJoints.map(j => (
                <span key={j} className="badge badge--success" style={{ padding: '6px 12px' }}>
                  {j}
                </span>
              ))}
            </div>
          </>
        )}

        {/* Related Medications */}
        <div className="section-header">
          <h2 className="section-header__title" style={{ fontSize: 'var(--font-lg)' }}>Related Medications</h2>
        </div>
        <div className="grid-1" style={{ marginBottom: 'var(--space-xl)' }}>
          {selectedDisease.relatedMedications.map(medId => {
            const med = getMedicationById(medId);
            if (!med) return null;
            return (
              <div
                key={med.id}
                className="card card--compact"
                onClick={() => navigate(`/medications/${med.id}`)}
              >
                <span className="card__icon" style={{ fontSize: '1.2rem', color: 'var(--info)' }}>
                  <Icon name={med.icon} size={20} />
                </span>
                <div className="card__content">
                  <div className="card__title" style={{ fontSize: 'var(--font-sm)' }}>{med.genericName}</div>
                  <div className="card__subtitle">{med.brandNames[0]}</div>
                </div>
                <span className="card__arrow">→</span>
              </div>
            );
          })}
        </div>

        {/* PubMed Literature */}
        <div className="section-header">
          <h2 className="section-header__title" style={{ fontSize: 'var(--font-lg)' }}>
            📚 Research from PubMed
          </h2>
          <p className="section-header__subtitle">Recent patient education literature</p>
        </div>

        {loadingArticles ? (
          <div className="loading-container">
            <div className="spinner" />
            <span>Loading research articles...</span>
          </div>
        ) : articles.length > 0 ? (
          articles.map(article => (
            <div key={article.pmid} className="article-card">
              <div className="article-card__title">{article.title}</div>
              <div className="article-card__meta">
                {article.authors && <span>{article.authors.split(',').slice(0, 3).join(', ')}{article.authors.split(',').length > 3 ? ' et al.' : ''}</span>}
                {article.pubDate && <span> · {article.pubDate}</span>}
              </div>
              {article.abstract && (
                <div className="article-card__abstract">
                  {article.abstract.length > 300 ? article.abstract.substring(0, 300) + '...' : article.abstract}
                </div>
              )}
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="article-card__link"
              >
                View on PubMed →
              </a>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-state__icon">📄</div>
            <div className="empty-state__text">No articles found. Try refreshing.</div>
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="page-enter">
      <div className="section-header">
        <h1 className="section-header__title">Disease Information</h1>
        <p className="section-header__subtitle">Learn about rheumatologic conditions from PubMed</p>
      </div>

      <div className="search-bar">
        <span className="search-bar__icon">🔍</span>
        <input
          className="search-bar__input"
          type="text"
          placeholder="Search diseases or symptoms..."
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
            style={isUserDisease ? { borderColor: 'var(--accent-primary)', background: 'rgba(6,182,212,0.08)' } : {}}
            onClick={() => navigate(`/diseases/${disease.id}`)}
          >
            <span className="card__icon" style={{ fontSize: '2rem', color: 'var(--accent)' }}>
              <Icon name={disease.icon} size={32} />
            </span>
            <div className="card__content">
              <div className="card__title">{disease.name}</div>
              <div className="card__subtitle">{disease.description.substring(0, 80)}...</div>
            </div>
            <span className="card__arrow">→</span>
          </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__icon">🔍</div>
          <div className="empty-state__text">No diseases match your search.</div>
        </div>
      )}
    </div>
  );
}

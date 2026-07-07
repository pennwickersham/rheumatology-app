import { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Icon } from '../components/Icons';
import { checkDrugInteractions } from '../api/gemini';

// Proxy URL — points to the Cloudflare Worker that holds the API key server-side.
// The API key NEVER appears in client code.
// Set VITE_PROXY_URL and VITE_APP_TOKEN in .env (local) or Appflow Environment (cloud builds).
const PROXY_URL = import.meta.env.VITE_PROXY_URL || '';
const APP_TOKEN = import.meta.env.VITE_APP_TOKEN || '';

export default function Interactions() {
  const [drugs, setDrugs] = useState(['', '']);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef(null);

  const handleDrugChange = (index, value) => {
    const newDrugs = [...drugs];
    newDrugs[index] = value;
    setDrugs(newDrugs);
  };

  const addDrugField = () => {
    setDrugs([...drugs, '']);
  };

  const removeDrugField = (index) => {
    if (drugs.length <= 2) return;
    const newDrugs = drugs.filter((_, i) => i !== index);
    setDrugs(newDrugs);
  };

  const handleCheck = async () => {
    if (!PROXY_URL) {
      setError('AI service not configured. Please set VITE_PROXY_URL environment variable.');
      return;
    }

    // Filter out empties
    const validDrugs = drugs.map(d => d.trim()).filter(d => d.length > 0);
    if (validDrugs.length < 2) {
      setError('Please enter at least two medications to check.');
      return;
    }

    setLoading(true);
    setIsStreaming(true);
    setError('');
    setResult(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const responseText = await checkDrugInteractions(
        validDrugs,
        (text) => setResult(text),
        controller.signal
      );
      setResult(responseText);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'An error occurred while checking interactions.');
    } finally {
      setLoading(false);
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  // Check if proxy URL is configured
  if (!PROXY_URL) {
    return (
      <div className="page-enter" style={{ paddingBottom: 'var(--space-3xl)', paddingTop: 'var(--space-lg)', paddingLeft: 'var(--space-lg)', paddingRight: 'var(--space-lg)' }}>
        <div className="section-header" style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
          <div className="flex-center" style={{ marginBottom: 'var(--space-xl)' }}>
            <div className="glass flex-center" style={{ 
              width: '96px', 
              height: '96px', 
              borderRadius: 'var(--radius-2xl)',
              background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.2) 0%, rgba(139, 92, 246, 0.2)',
              color: 'var(--accent-primary)',
              boxShadow: 'var(--shadow-glow)'
            }}>
              <Icon name="activity" size={48} />
            </div>
          </div>
          <h2 className="section-header__title" style={{ fontSize: 'var(--font-3xl)', marginBottom: 'var(--space-sm)' }}>Interactions</h2>
          <p className="section-header__subtitle">AI service not configured</p>
        </div>

        <div className="glass-morphism" style={{ padding: 'var(--space-xl)', borderRadius: 'var(--radius-xl)', textAlign: 'center' }}>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            The AI service is not yet connected. Please set the VITE_PROXY_URL environment variable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{ paddingBottom: 'var(--space-3xl)' }}>
      <div className="section-header" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h2 className="section-header__title" style={{ fontSize: 'var(--font-3xl)' }}>Interactions</h2>
          <p className="section-header__subtitle">Analyze medication safety with AI</p>
        </div>
      </div>

      <div className="card glass-morphism stagger-item" style={{ marginBottom: 'var(--space-2xl)', padding: 'var(--space-xl)' }}>
        <div className="flex-center" style={{ 
          width: '56px', 
          height: '56px', 
          borderRadius: 'var(--radius-xl)', 
          background: 'rgba(139, 92, 246, 0.1)', 
          color: 'var(--accent-secondary)',
          marginBottom: 'var(--space-lg)',
          boxShadow: '0 0 20px rgba(139, 92, 246, 0.2)'
        }}>
          <Icon name="activity" size={28} />
        </div>
        
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', lineHeight: 1.6, marginBottom: 'var(--space-xl)' }}>
          Enter brand or generic names to check for pharmacological interactions. This analysis uses Gemini AI referencing clinical frameworks.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {drugs.map((drug, index) => (
            <div key={index} className="stagger-item" style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <div className="search-bar" style={{ flex: 1, marginBottom: 0 }}>
                <span className="search-bar__icon" style={{ opacity: drug.length > 0 ? 1 : 0.4 }}>
                  <Icon name="clipboard" size={18} />
                </span>
                <input 
                  type="text"
                  placeholder={`Medication ${index + 1}`}
                  value={drug}
                  onChange={(e) => handleDrugChange(index, e.target.value)}
                  className="search-bar__input"
                  disabled={loading}
                />
              </div>
              {drugs.length > 2 && (
                <button 
                  className="btn glass" 
                  onClick={() => removeDrugField(index)}
                  style={{ width: '48px', color: 'var(--danger)', borderRadius: 'var(--radius-md)' }}
                  disabled={loading}
                >
                  <Icon name="trash" size={18} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-xl)', marginBottom: 'var(--space-2xl)' }}>
          <button className="btn btn--outline btn--sm" onClick={addDrugField} style={{ borderStyle: 'dashed', borderRadius: 'var(--radius-md)', padding: '10px 20px' }} disabled={loading}>
            <Icon name="plus" size={14} />
            Add Medication
          </button>
        </div>

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
          onClick={handleCheck} 
          disabled={loading}
          style={{ 
            height: '56px', 
            fontSize: 'var(--font-base)', 
            borderRadius: 'var(--radius-lg)', 
            background: 'var(--accent-gradient)',
            boxShadow: 'var(--shadow-glow)'
          }}
        >
          {loading ? (
             <>
               <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
               <span>Analyzing Interactions...</span>
             </>
          ) : (
            <>
              <Icon name="activity" size={20} />
              <span>Check Interactions</span>
            </>
          )}
        </button>
      </div>

      {result && (
        <div className="analysis-report stagger-item">
          <div className="analysis-report__header">
            <div className="flex-center" style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
              <Icon name="alert-triangle" size={22} />
            </div>
            <h3 className="analysis-report__title">Analysis Report</h3>
          </div>
          
          <div className="markdown-content">
            <ReactMarkdown>{result}</ReactMarkdown>
            {isStreaming && '…'}
          </div>

          <div className="disclaimer" style={{ marginTop: 'var(--space-2xl)' }}>
            <div className="disclaimer__icon">
              <Icon name="info" size={20} color="var(--text-muted)" />
            </div>
            <div>
              <strong>Medical Disclaimer:</strong> This AI-generated report is for educational purposes only. It is not a clinical diagnosis. Always consult with your rheumatologist or pharmacist before modifying any medication regimen.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

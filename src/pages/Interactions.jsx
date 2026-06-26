import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Icon } from '../components/Icons';
import { getApiKey, setApiKey, checkDrugInteractions } from '../api/gemini';

export default function Interactions() {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [keyError, setKeyError] = useState(false);
  
  const [drugs, setDrugs] = useState(['', '']);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedKey = getApiKey();
    if (savedKey) setApiKeyInput(savedKey);
    else setShowSettings(true);
  }, []);

  const handleSaveKey = () => {
    if (!apiKeyInput.trim()) {
      setKeyError(true);
      return;
    }
    setApiKey(apiKeyInput.trim());
    setKeyError(false);
    setShowSettings(false);
  };

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
    const savedKey = getApiKey();
    if (!savedKey) {
      setShowSettings(true);
      return;
    }

    // Filter out empties
    const validDrugs = drugs.map(d => d.trim()).filter(d => d.length > 0);
    if (validDrugs.length < 2) {
      setError('Please enter at least two medications to check.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await checkDrugInteractions(savedKey, validDrugs);
      setResult(response);
    } catch (err) {
      setError(err.message || 'An error occurred while checking interactions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-enter" style={{ paddingBottom: 'var(--space-3xl)' }}>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 className="section-header__title" style={{ fontSize: 'var(--font-3xl)' }}>Interactions</h1>
          <p className="section-header__subtitle">Analyze medication safety with AI</p>
        </div>
        <button 
          className="btn glass" 
          onClick={() => setShowSettings(!showSettings)}
          style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', padding: 0 }}
        >
          <Icon name="settings" size={20} />
        </button>
      </div>

      {showSettings && (
        <div className="settings-form glass-morphism stagger-item" style={{ marginBottom: 'var(--space-xl)', border: '1px solid var(--accent-primary)' }}>
          <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
            <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 800, color: 'var(--accent-primary)' }}>API Settings</h3>
            <button className="btn btn--sm" style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }} onClick={() => setShowSettings(false)}>
              <Icon name="trash" size={14} />
            </button>
          </div>
          <p className="settings-field__description">
            This feature requires a Google Gemini API key. Your key is stored securely on your device.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <div className="search-bar" style={{ flex: 1, marginBottom: 0 }}>
              <span className="search-bar__icon"><Icon name="lock" size={18} /></span>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="search-bar__input"
              />
            </div>
            <button className="btn btn--primary" onClick={handleSaveKey} style={{ borderRadius: 'var(--radius-md)' }}>Save</button>
          </div>
          {keyError && <p style={{ color: 'var(--danger)', fontSize: '10px', marginTop: '8px', fontWeight: 600 }}>Please enter a valid API key</p>}
        </div>
      )}

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
                />
              </div>
              {drugs.length > 2 && (
                <button 
                  className="btn glass" 
                  onClick={() => removeDrugField(index)}
                  style={{ width: '48px', color: 'var(--danger)', borderRadius: 'var(--radius-md)' }}
                >
                  <Icon name="trash" size={18} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-xl)', marginBottom: 'var(--space-2xl)' }}>
          <button className="btn btn--outline btn--sm" onClick={addDrugField} style={{ borderStyle: 'dashed', borderRadius: 'var(--radius-md)', padding: '10px 20px' }}>
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
          disabled={loading || showSettings}
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

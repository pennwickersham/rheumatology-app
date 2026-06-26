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
    <div className="page-enter" style={{ position: 'relative' }}>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="section-header__title">Drug Interactions</h1>
          <p className="section-header__subtitle">Analyze interactions safely</p>
        </div>
        <button 
          className="btn btn--outline btn--sm" 
          onClick={() => setShowSettings(!showSettings)}
          aria-label="Settings"
        >
          <Icon name="cog" size={20} />
        </button>
      </div>

      {showSettings && (
        <div className="card" style={{ marginBottom: 'var(--space-xl)', background: 'var(--bg-glass-hover)', border: '1px solid var(--accent-primary)' }}>
          <h3 style={{ margin: '0 0 var(--space-md) 0' }}>API Settings</h3>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
            This feature requires a Gemini API key. Please enter it securely below.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="form-input"
              style={{ flex: 1, borderColor: keyError ? 'var(--danger)' : 'var(--border)' }}
            />
            <button className="btn btn--primary" onClick={handleSaveKey}>Save</button>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 'var(--space-2xl)' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-lg)' }}>
          Enter the active ingredients or brand names of your medications to check for known pharmacological interactions.
        </p>

        {drugs.map((drug, index) => (
          <div key={index} style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
            <input 
              type="text"
              placeholder={`Medication ${index + 1}`}
              value={drug}
              onChange={(e) => handleDrugChange(index, e.target.value)}
              className="form-input"
              style={{ flex: 1 }}
            />
            {drugs.length > 2 && (
              <button 
                className="btn btn--outline" 
                onClick={() => removeDrugField(index)}
                style={{ padding: '0 var(--space-sm)', color: 'var(--danger)', borderColor: 'var(--danger)' }}
              >
                ✕
              </button>
            )}
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
          <button className="btn btn--outline btn--sm" onClick={addDrugField} style={{ borderStyle: 'dashed' }}>
             + Add Medication
          </button>
        </div>

        {error && (
          <div style={{ padding: 'var(--space-sm)', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)' }}>
            {error}
          </div>
        )}

        <button 
          className="btn btn--primary btn--full" 
          onClick={handleCheck} 
          disabled={loading || showSettings}
          style={{ height: '48px', fontSize: 'var(--font-base)', fontWeight: 600, background: 'var(--accent-secondary)' }}
        >
          {loading ? (
             <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
               <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
               Analyzing...
             </span>
          ) : (
            <>Check Interactions</>
          )}
        </button>
      </div>

      {result && (
        <div className="card" style={{ marginBottom: 'var(--space-2xl)', background: '#111827', border: '1px solid var(--border)' }}>
          <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-sm)', marginBottom: 'var(--space-md)', color: '#fcd34d' }}>
            Analysis Report
          </h3>
          <div className="chat-message__content" style={{ fontSize: 'var(--font-md)' }}>
            <ReactMarkdown>{result}</ReactMarkdown>
          </div>
          <div style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-sm)', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
            <strong>Disclaimer:</strong> This check uses generative AI referencing clinical interaction frameworks. It cannot replace professional medical advice. Always speak with your doctor or pharmacist prior to changing your medication regimen.
          </div>
        </div>
      )}
    </div>
  );
}

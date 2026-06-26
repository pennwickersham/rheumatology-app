import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { sendChatMessage, getApiKey, setApiKey, hasApiKey, suggestedQuestions } from '../api/gemini';
import { saveToStorage, loadFromStorage } from '../utils/storage';
import { Share } from '@capacitor/share';
import { Icon } from '../components/Icons';

export default function Chatbot() {
  const [messages, setMessages] = useState(() => loadFromStorage('chat_history', []));
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(!hasApiKey());
  const [apiKeyInput, setApiKeyInput] = useState(getApiKey());
  const messagesEnd = useRef(null);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    saveToStorage('chat_history', messages);
  }, [messages]);

  const handleSend = async (text = input) => {
    if (!text.trim() || loading) return;
    const key = getApiKey();
    if (!key) { setShowSettings(true); return; }

    const userMsg = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const response = await sendChatMessage(key, messages, text.trim());
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (e) {
      setError(e.message);
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Error: ${e.message}` }]);
    }
    setLoading(false);
  };

  const saveKey = () => {
    setApiKey(apiKeyInput);
    setShowSettings(false);
  };

  const clearChat = () => {
    setMessages([]);
    saveToStorage('chat_history', []);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Settings panel
  if (showSettings) {
    return (
      <div className="page-enter" style={{ paddingBottom: 'var(--space-3xl)', paddingTop: 'var(--space-lg)', paddingLeft: 'var(--space-lg)', paddingRight: 'var(--space-lg)', overflowY: 'auto', height: '100%' }}>
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
              <Icon name="chat" size={48} />
            </div>
          </div>
          <h1 className="section-header__title" style={{ fontSize: 'var(--font-3xl)', marginBottom: 'var(--space-sm)' }}>RheumBot Setup</h1>
          <p className="section-header__subtitle">Configure your AI medical companion</p>
        </div>

        <div className="settings-form glass-morphism">
          <div className="settings-field">
            <label className="settings-field__label">Google Gemini API Key</label>
            <p className="settings-field__description">
              Get a free API key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Google AI Studio</a>.
              Your key remains on your device and is only used to communicate with Google's secure AI infrastructure.
            </p>
            <div className="search-bar" style={{ marginBottom: 0 }}>
              <span className="search-bar__icon"><Icon name="lock" size={20} /></span>
              <input 
                className="search-bar__input" 
                type="password" 
                placeholder="Paste your AIza... key here" 
                value={apiKeyInput} 
                onChange={e => setApiKeyInput(e.target.value)} 
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <button className="btn btn--primary btn--full" onClick={saveKey} disabled={!apiKeyInput.trim()} style={{ height: '56px', borderRadius: 'var(--radius-lg)' }}>
              <Icon name="check" size={18} />
              Save & Start Chatting
            </button>
            {hasApiKey() && (
              <button className="btn btn--outline btn--full" onClick={() => setShowSettings(false)} style={{ height: '56px', borderRadius: 'var(--radius-lg)' }}>
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="stagger-item" style={{ 
          marginTop: 'var(--space-3xl)', 
          padding: 'var(--space-xl)',
          background: 'rgba(14, 165, 233, 0.05)',
          border: '1px solid rgba(14, 165, 233, 0.1)',
          borderRadius: 'var(--radius-xl)',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <Icon name="info" size={16} style={{ marginBottom: 'var(--space-xs)', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
            RheumBot uses the latest Gemini 1.5 Flash model for fast, accurate medical insights based on FDA labels and PubMed research.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container" style={{
      marginLeft: showSettings ? 0 : 'calc(-1 * var(--space-lg))',
      marginRight: showSettings ? 0 : 'calc(-1 * var(--space-lg))',
      marginTop: showSettings ? 0 : 'calc(-1 * var(--space-xl))',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: showSettings ? 'auto' : '100%'
    }}>
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="page-enter" style={{ textAlign: 'center', padding: 'var(--space-xl) var(--space-lg)' }}>
            <div className="flex-center" style={{ marginBottom: 'var(--space-lg)' }}>
              <div className="glass flex-center" style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: 'var(--radius-xl)',
                background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
                boxShadow: 'var(--shadow-glow)',
                animation: 'pulse 2s infinite ease-in-out'
              }}>
                <Icon name="chat" size={36} color="var(--accent-primary)" />
              </div>
            </div>
            <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, marginBottom: 'var(--space-sm)' }}>RheumBot</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', lineHeight: 1.7, marginBottom: 'var(--space-xl)', maxWidth: '320px', margin: '0 auto var(--space-xl)' }}>
              Your AI-powered rheumatology expert. Ask about medications, symptoms, or research findings.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', alignItems: 'center' }}>
              <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 700 }}>
                Suggested Topics
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', justifyContent: 'center' }}>
                {suggestedQuestions.slice(0, 3).map((q, i) => (
                  <button 
                    key={i} 
                    className="card glass-morphism stagger-item" 
                    onClick={() => handleSend(q)} 
                    style={{ 
                      padding: 'var(--space-md)', 
                      fontSize: 'var(--font-sm)', 
                      textAlign: 'left',
                      color: 'white',
                      borderRadius: 'var(--radius-lg)',
                      maxWidth: '300px',
                      width: '100%',
                      border: '1px solid var(--border-light)'
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', marginTop: 'var(--space-xl)' }}>
              <button className="btn btn--outline btn--sm" style={{ borderRadius: 'var(--radius-md)', padding: '8px 16px' }} onClick={() => setShowSettings(true)}>
                <Icon name="settings" size={14} /> 
                API Settings
              </button>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className="stagger-item" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <div className={`chat-bubble chat-bubble--${msg.role === 'user' ? 'user' : 'assistant'}`}>
              {msg.role === 'assistant' ? (
                <div className="markdown-content">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : msg.content}
            </div>
            {msg.role === 'assistant' && (
              <div style={{ alignSelf: 'flex-start', paddingLeft: '4px' }}>
                <button
                  onClick={async () => {
                    try {
                      await Share.share({
                        title: 'RheumBot Output',
                        text: msg.content,
                        dialogTitle: 'Share RheumBot output',
                      });
                    } catch (e) {
                      console.error(e);
                      navigator.clipboard.writeText(msg.content);
                      alert('Copied to clipboard!');
                    }
                  }}
                  className="btn btn--sm"
                  style={{
                    background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em'
                  }}
                >
                  <Icon name="share" size={14} style={{ marginRight: '6px' }} /> Share Output
                </button>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="chat-bubble chat-bubble--assistant stagger-item" style={{ border: '1px solid var(--border)', background: 'var(--bg-glass)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
              <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', fontWeight: 500 }}>RheumBot is thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEnd} style={{ height: '1px' }} />
      </div>

      <div className="chat-input-area glass-morphism">
        {messages.length > 0 && (
          <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-md)', marginLeft: 'var(--space-md)' }}>
            <button className="btn glass btn--sm" style={{ borderRadius: 'var(--radius-md)', fontSize: '11px', color: 'white' }} onClick={clearChat}>
              <Icon name="trash" size={14} /> Clear Chat
            </button>
            <button className="btn glass btn--sm" style={{ borderRadius: 'var(--radius-md)', fontSize: '11px', color: 'white' }} onClick={() => setShowSettings(true)}>
              <Icon name="settings" size={14} /> API Key
            </button>
          </div>
        )}
        <div className="chat-input-wrapper">
          <textarea 
            className="chat-input" 
            placeholder="Type your medical question..." 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            onKeyDown={handleKeyDown} 
            rows={1} 
          />
          <button 
            className="chat-send-btn" 
            onClick={() => handleSend()} 
            disabled={!input.trim() || loading}
            style={{ width: '52px', height: '52px', borderRadius: 'var(--radius-xl)' }}
          >
            <Icon name="arrow-up" size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}

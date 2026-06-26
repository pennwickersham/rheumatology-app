import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { sendChatMessage, getApiKey, setApiKey, hasApiKey, suggestedQuestions } from '../api/gemini';
import { saveToStorage, loadFromStorage } from '../utils/storage';
import { Share } from '@capacitor/share';

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
  }, [messages]);

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
      <div className="page-enter" style={{ padding: 'var(--space-lg)' }}>
        <div className="section-header">
          <h1 className="section-header__title">🤖 RheumBot Setup</h1>
          <p className="section-header__subtitle">Enter your Gemini API key to start chatting</p>
        </div>
        <div className="settings-form">
          <div className="settings-field">
            <label className="settings-field__label">Gemini API Key</label>
            <p className="settings-field__description">Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a>. Your key is stored locally and never sent to any server except Google's API.</p>
            <input className="settings-field__input" type="password" placeholder="AIza..." value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)} />
          </div>
          <button className="btn btn--primary btn--full" onClick={saveKey} disabled={!apiKeyInput.trim()}>Save & Start Chatting</button>
          {hasApiKey() && <button className="btn btn--outline btn--full" onClick={() => setShowSettings(false)}>Cancel</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: 'var(--space-xl) 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>🤖</div>
            <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, marginBottom: 'var(--space-sm)' }}>RheumBot</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-lg)', maxWidth: '300px', margin: '0 auto var(--space-lg)' }}>
              Ask me about rheumatologic diseases, medications, side effects, and more. I use FDA and PubMed data only.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', justifyContent: 'center' }}>
              {suggestedQuestions.slice(0, 4).map((q, i) => (
                <button key={i} className="btn btn--outline btn--sm" onClick={() => handleSend(q)} style={{ fontSize: 'var(--font-xs)', textAlign: 'left' }}>
                  {q}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center', marginTop: 'var(--space-md)' }}>
              <button className="btn btn--outline btn--sm" onClick={() => setShowSettings(true)}>⚙️ API Key</button>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div className={`chat-bubble chat-bubble--${msg.role === 'user' ? 'user' : 'assistant'}`}>
              {msg.role === 'assistant' ? <ReactMarkdown>{msg.content}</ReactMarkdown> : msg.content}
            </div>
            {msg.role === 'assistant' && (
              <div style={{ alignSelf: 'flex-start', paddingLeft: '8px' }}>
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
                      alert('Copied to clipboard instead!');
                    }
                  }}
                  style={{
                    background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 'var(--font-xs)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '1.2em' }}>📤</span> Share
                </button>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="chat-bubble chat-bubble--assistant">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
              <span style={{ color: 'var(--text-muted)' }}>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEnd} />
      </div>

      <div className="chat-input-area">
        {messages.length > 0 && (
          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
            <button className="btn btn--outline btn--sm" onClick={clearChat}>🗑️ Clear</button>
            <button className="btn btn--outline btn--sm" onClick={() => setShowSettings(true)}>⚙️ Key</button>
          </div>
        )}
        <div className="chat-input-wrapper">
          <textarea className="chat-input" placeholder="Ask about rheumatology..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} rows={1} />
          <button className="chat-send-btn" onClick={() => handleSend()} disabled={!input.trim() || loading}>➤</button>
        </div>
      </div>
    </div>
  );
}

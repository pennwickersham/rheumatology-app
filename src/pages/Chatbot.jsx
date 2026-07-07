import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { sendChatMessage, suggestedQuestions } from '../api/gemini';
import { saveToStorage, loadFromStorage } from '../utils/storage';
import { scanForRedFlags } from '../utils/redFlagScan';
import RedFlagAlert from '../components/RedFlagAlert';
import { Share } from '@capacitor/share';
import { Icon } from '../components/Icons';

// Proxy URL — points to the Cloudflare Worker that holds the API key server-side.
// The API key NEVER appears in client code.
// Set VITE_PROXY_URL and VITE_APP_TOKEN in .env (local) or Appflow Environment (cloud builds).
const PROXY_URL = import.meta.env.VITE_PROXY_URL || '';
const APP_TOKEN = import.meta.env.VITE_APP_TOKEN || '';

export default function Chatbot() {
  const [messages, setMessages] = useState(() => loadFromStorage('chat_history', []));
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [redFlag, setRedFlag] = useState(null);
  const messagesEnd = useRef(null);
  const navigate = useNavigate();
  const abortRef = useRef(null);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    saveToStorage('chat_history', messages);
  }, [messages]);

  const handleSend = useCallback(async (text = input) => {
    if (!text.trim() || loading) return;
    
    const rf = scanForRedFlags(text);
    if (rf) {
      setRedFlag(rf);
    }
    
    if (!PROXY_URL) {
      setError('AI service not configured.');
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Error: AI service not configured. Please set VITE_PROXY_URL environment variable.' }]);
      return;
    }

    const userMsg = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError('');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Placeholder message that streaming updates in place.
      const msgIndexRef = { current: -1 };
      setMessages(prev => {
        msgIndexRef.current = prev.length;
        return [...prev, { role: 'assistant', content: '', isStreaming: true }];
      });
      const updateStreaming = (text) => {
        setMessages(prev => prev.map((m, i) => (i === msgIndexRef.current ? { ...m, content: text } : m)));
      };

      const responseText = await sendChatMessage(
        messages,
        text.trim(),
        updateStreaming,
        controller.signal
      );

      // Finalize: clear streaming flag.
      setMessages(prev => prev.map((m, i) => (i === msgIndexRef.current ? { role: 'assistant', content: responseText } : m)));
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message);
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Error: ${err.message}`, isError: true }]);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [input, loading, messages]);

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

  // Check if proxy URL is configured
  if (!PROXY_URL) {
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
          <h2 className="section-header__title" style={{ fontSize: 'var(--font-3xl)', marginBottom: 'var(--space-sm)' }}>RheumBot</h2>
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
    <div className="chat-container" style={{
      marginLeft: 'calc(-1 * var(--space-lg))',
      marginRight: 'calc(-1 * var(--space-lg))',
      marginTop: 'calc(-1 * var(--space-xl))',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="page-enter" style={{ textAlign: 'center', padding: 'var(--space-xl) var(--space-lg)' }}>
            <div className="flex-center" style={{ marginBottom: 'var(--space-lg)' }}>
              <div className="glass flex-center" style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: 'var(--radius-xl)',
                background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%',
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
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className="stagger-item" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <div className={`chat-bubble chat-bubble--${msg.role === 'user' ? 'user' : 'assistant'}`} style={{
              ...(msg.isError ? { background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' } : {}),
              whiteSpace: 'pre-wrap'
            }}>
              {msg.role === 'assistant' ? (
                <div className="markdown-content">
                  <ReactMarkdown>{msg.content || (msg.isStreaming ? '…' : '')}</ReactMarkdown>
                </div>
              ) : msg.content}
            </div>
            {msg.isError && (
              <div style={{ alignSelf: 'flex-start', marginLeft: 'var(--space-md)' }}>
                <button
                  onClick={() => {
                    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                    if (lastUserMsg) {
                      setMessages(prev => prev.filter((_, idx) => idx !== i));
                      setInput(lastUserMsg.content);
                    }
                  }}
                  className="btn btn--sm"
                  style={{
                    background: 'none', border: 'none', color: 'var(--warning)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', padding: 0
                  }}
                >
                  Tap to retry
                </button>
              </div>
            )}
            {msg.role === 'assistant' && !msg.isError && !msg.isStreaming && (
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

        {loading && !messages[messages.length - 1]?.isStreaming && (
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
          </div>
        )}
        <div className="chat-input-wrapper">
          <textarea 
            className="chat-input" 
            placeholder="Type your medical question..." 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyDown={handleKeyDown} 
            rows={1} 
            disabled={loading}
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
      {redFlag && (
        <RedFlagAlert
          flag={redFlag}
          onWhenToCall={() => { setRedFlag(null); navigate('/when-to-call'); }}
          onClose={() => setRedFlag(null)}
        />
      )}
    </div>
  );
}

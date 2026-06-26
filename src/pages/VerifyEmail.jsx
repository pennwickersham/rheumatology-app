import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icons';

export default function VerifyEmail() {
  const { verifyEmail } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (code.length !== 6) {
      return setError('Please enter a valid 6-digit code.');
    }

    setLoading(true);
    try {
      await verifyEmail(code);
      // Verification successful! Send to home
      navigate('/');
    } catch (err) {
      setError(err.message || 'Invalid code');
    }
    setLoading(false);
  };

  return (
    <div className="page-enter" style={{ paddingBottom: 'var(--space-3xl)' }}>
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
            <Icon name="mail" size={48} />
          </div>
        </div>
        <h1 className="section-header__title" style={{ fontSize: 'var(--font-3xl)', marginBottom: 'var(--space-sm)' }}>Verify Email</h1>
        <p className="section-header__subtitle">We've sent a 6-digit code to your email address</p>
      </div>

      <div className="card glass-morphism stagger-item">
        {error && (
          <div className="badge badge--danger w-full" style={{ 
            marginBottom: 'var(--space-lg)', 
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            justifyContent: 'center'
          }}>
            <Icon name="zap" size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-md) var(--space-lg)',
            marginBottom: 0
          }}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0 0 0 0 0 0"
              style={{ 
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                letterSpacing: '12px', 
                textAlign: 'center', 
                fontSize: '1.5rem', 
                fontWeight: 700,
                padding: '0'
              }}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--full"
            disabled={loading || code.length < 6}
            style={{ 
              height: '56px', 
              fontSize: 'var(--font-base)',
              borderRadius: 'var(--radius-lg)'
            }}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
                <span>Verifying...</span>
              </>
            ) : 'Verify and Continue'}
          </button>
        </form>

        <div style={{ 
          marginTop: 'var(--space-xl)', 
          padding: 'var(--space-lg)',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--accent-primary)', display: 'block', marginBottom: '4px' }}>Demo Mode</strong>
            Enter the mock code <code>123456</code> to complete your registration.
          </p>
        </div>
      </div>

      <div className="stagger-item" style={{ textAlign: 'center', marginTop: 'var(--space-xl)' }}>
        <button className="btn btn--outline btn--sm" style={{ color: 'var(--text-muted)' }}>
          Didn't receive code? Resend
        </button>
      </div>
    </div>
  );
}

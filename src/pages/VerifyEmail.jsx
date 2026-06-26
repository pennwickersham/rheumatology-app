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
    <div className="page-enter" style={{ paddingBottom: 'var(--space-2xl)' }}>
      <div className="section-header">
        <h1 className="section-header__title">Verify Email</h1>
        <p className="section-header__subtitle">We've sent a 6-digit code to your email address.</p>
      </div>

      <div className="card">
        {error && (
          <div className="badge badge--danger" style={{ display: 'block', marginBottom: 'var(--space-md)', padding: 'var(--space-sm)' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 'var(--space-lg)', textAlign: 'center' }}>
          <span style={{ fontSize: '3rem', color: 'var(--accent)', display: 'block', marginBottom: 'var(--space-md)' }}>
            <Icon name="mail" size={48} />
          </span>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
            <strong>Demo mode:</strong> Since this is a local simulated demo without a real backend, please enter the mock code <code>123456</code> to complete your registration.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="search-bar" style={{ marginBottom: 0 }}>
            <span className="search-bar__icon"><Icon name="lock" size={16} /></span>
            <input
              type="number"
              className="search-bar__input"
              placeholder="6-digit code (e.g. 123456)"
              style={{ letterSpacing: '2px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 600 }}
              value={code}
              onChange={e => setCode(e.target.value.slice(0, 6))}
            />
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--full"
            disabled={loading || code.length < 6}
            style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-md)' }}
          >
            {loading ? 'Verifying...' : 'Verify and Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}

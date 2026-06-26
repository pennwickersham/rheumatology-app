import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icons';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      return setError('Please enter both email and password.');
    }

    setLoading(true);
    try {
      await login(email, password);
      // Login successful, send to home
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to sign in');
    }
    setLoading(false);
  };

  return (
    <div className="page-enter" style={{ paddingBottom: 'var(--space-2xl)' }}>
      <div className="section-header">
        <h1 className="section-header__title">Welcome Back</h1>
        <p className="section-header__subtitle">Sign in to your personalized dashboard</p>
      </div>

      <div className="card">
        {error && (
          <div className="badge badge--danger" style={{ display: 'block', marginBottom: 'var(--space-md)', padding: 'var(--space-sm)' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
            <strong>Demo mode:</strong> Enter your registered email, or use any email with the password <code>password</code> to try the demo account.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="search-bar" style={{ marginBottom: 0 }}>
            <span className="search-bar__icon"><Icon name="mail" size={16} /></span>
            <input
              type="email"
              className="search-bar__input"
              placeholder="Email Address"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="search-bar" style={{ marginBottom: 0 }}>
            <span className="search-bar__icon"><Icon name="lock" size={16} /></span>
            <input
              type="password"
              className="search-bar__input"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--full"
            disabled={loading}
            style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-md)' }}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)', fontSize: 'var(--font-sm)' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Don't have an account? </span>
          <Link to="/register" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Create Account</Link>
        </div>
      </div>
    </div>
  );
}

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
            <Icon name="lock" size={48} />
          </div>
        </div>
        <h1 className="section-header__title" style={{ fontSize: 'var(--font-3xl)', marginBottom: 'var(--space-sm)' }}>Welcome Back</h1>
        <p className="section-header__subtitle">Sign in to your personalized dashboard</p>
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div className="search-bar" style={{ marginBottom: 0 }}>
            <span className="search-bar__icon"><Icon name="mail" size={20} /></span>
            <input
              type="email"
              className="search-bar__input"
              placeholder="Email Address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="search-bar" style={{ marginBottom: 0 }}>
            <span className="search-bar__icon"><Icon name="lock" size={20} /></span>
            <input
              type="password"
              className="search-bar__input"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--full"
            disabled={loading}
            style={{ 
              height: '56px', 
              fontSize: 'var(--font-base)',
              borderRadius: 'var(--radius-lg)'
            }}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
                <span>Signing In...</span>
              </>
            ) : 'Sign In'}
          </button>
        </form>

        <div style={{ 
          marginTop: 'var(--space-xl)', 
          paddingTop: 'var(--space-xl)', 
          borderTop: '1px solid var(--border)',
          textAlign: 'center' 
        }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-md)' }}>
            Don't have an account?
          </p>
          <Link to="/register" className="btn btn--outline btn--full" style={{ borderRadius: 'var(--radius-lg)' }}>
            Create New Account
          </Link>
        </div>
      </div>

      <div className="stagger-item" style={{ 
        marginTop: 'var(--space-2xl)', 
        padding: 'var(--space-lg)',
        background: 'rgba(245, 158, 11, 0.05)',
        border: '1px solid rgba(245, 158, 11, 0.1)',
        borderRadius: 'var(--radius-lg)',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--warning)', display: 'block', marginBottom: '4px' }}>Demo Mode</strong>
          Enter any email with password <code>password</code> to try the demo account.
        </p>
      </div>
    </div>
  );
}

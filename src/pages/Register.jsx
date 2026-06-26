import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { diseases } from '../data/diseases';
import { Icon } from '../components/Icons';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    zip: '',
    diseases: []
  });

  const toggleDisease = (diseaseId) => {
    setFormData(prev => {
      const isSelected = prev.diseases.includes(diseaseId);
      if (isSelected) {
        return { ...prev, diseases: prev.diseases.filter(id => id !== diseaseId) };
      } else {
        return { ...prev, diseases: [...prev.diseases, diseaseId] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email || !formData.password || !formData.zip) {
      return setError('Please fill out all required fields.');
    }

    if (formData.diseases.length === 0) {
      return setError('Please select at least one condition of interest.');
    }

    setLoading(true);
    try {
      await register(formData);
      // Registration successful, send to verify
      navigate('/verify');
    } catch (err) {
      setError(err.message || 'Failed to register account');
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
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(14, 165, 233, 0.2)',
            color: 'var(--accent-secondary)',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <Icon name="user" size={48} />
          </div>
        </div>
        <h1 className="section-header__title" style={{ fontSize: 'var(--font-3xl)', marginBottom: 'var(--space-sm)' }}>Create Account</h1>
        <p className="section-header__subtitle">Personalize your rheumatology companion</p>
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
            <span className="search-bar__icon"><Icon name="user" size={18} /></span>
            <input
              type="text"
              className="search-bar__input"
              placeholder="Full Name"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="search-bar" style={{ marginBottom: 0 }}>
            <span className="search-bar__icon"><Icon name="mail" size={18} /></span>
            <input
              type="email"
              className="search-bar__input"
              placeholder="Email Address"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="search-bar" style={{ marginBottom: 0 }}>
            <span className="search-bar__icon"><Icon name="lock" size={18} /></span>
            <input
              type="password"
              className="search-bar__input"
              placeholder="Create Password"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          <div className="search-bar" style={{ marginBottom: 0 }}>
            <span className="search-bar__icon"><Icon name="map-pin" size={18} /></span>
            <input
              type="text"
              className="search-bar__input"
              placeholder="Zip Code"
              maxLength={5}
              value={formData.zip}
              onChange={e => setFormData({ ...formData, zip: e.target.value })}
              required
            />
          </div>

          <div style={{ 
            marginTop: 'var(--space-md)', 
            padding: 'var(--space-lg)',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 600, marginBottom: 'var(--space-xs)' }}>Conditions of Interest</h3>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
              Select conditions to personalize your medical feed:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
              {diseases.map(d => {
                const isSelected = formData.diseases.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDisease(d.id)}
                    className={`pill-tab ${isSelected ? 'active' : ''}`}
                    style={{ 
                      padding: '8px 14px', 
                      fontSize: 'var(--font-xs)',
                      borderRadius: 'var(--radius-md)'
                    }}
                  >
                    <Icon name={d.icon} size={14} style={{ marginRight: '6px' }} />
                    {d.shortName}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ 
            marginTop: 'var(--space-sm)', 
            fontSize: 'var(--font-xs)', 
            color: 'var(--text-muted)', 
            lineHeight: 1.5, 
            textAlign: 'center',
            padding: '0 var(--space-md)'
          }}>
            By creating an account, you consent to our use of local storage to securely personalize your medical data.
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--full"
            disabled={loading}
            style={{ 
              height: '56px', 
              fontSize: 'var(--font-base)',
              borderRadius: 'var(--radius-lg)',
              marginTop: 'var(--space-sm)'
            }}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
                <span>Creating Account...</span>
              </>
            ) : 'Continue to Verification'}
          </button>
        </form>

        <div style={{ 
          marginTop: 'var(--space-xl)', 
          paddingTop: 'var(--space-xl)', 
          borderTop: '1px solid var(--border)',
          textAlign: 'center' 
        }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-md)' }}>
            Already have an account?
          </p>
          <Link to="/login" className="btn btn--outline btn--full" style={{ borderRadius: 'var(--radius-lg)' }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

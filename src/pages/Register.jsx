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
    <div className="page-enter" style={{ paddingBottom: 'var(--space-2xl)' }}>
      <div className="section-header">
        <h1 className="section-header__title">Create Account</h1>
        <p className="section-header__subtitle">Personalize your app experience</p>
      </div>

      <div className="card">
        {error && (
          <div className="badge badge--danger" style={{ display: 'block', marginBottom: 'var(--space-md)', padding: 'var(--space-sm)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="search-bar" style={{ marginBottom: 0 }}>
            <span className="search-bar__icon"><Icon name="user" size={16} /></span>
            <input
              type="text"
              className="search-bar__input"
              placeholder="Full Name"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="search-bar" style={{ marginBottom: 0 }}>
            <span className="search-bar__icon"><Icon name="mail" size={16} /></span>
            <input
              type="email"
              className="search-bar__input"
              placeholder="Email Address"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="search-bar" style={{ marginBottom: 0 }}>
            <span className="search-bar__icon"><Icon name="lock" size={16} /></span>
            <input
              type="password"
              className="search-bar__input"
              placeholder="Create Password"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <div className="search-bar" style={{ marginBottom: 0 }}>
            <span className="search-bar__icon"><Icon name="map-pin" size={16} /></span>
            <input
              type="text"
              className="search-bar__input"
              placeholder="Zip Code"
              maxLength={5}
              value={formData.zip}
              onChange={e => setFormData({ ...formData, zip: e.target.value })}
            />
          </div>

          <div style={{ marginTop: 'var(--space-md)' }}>
            <h3 style={{ fontSize: 'var(--font-base)', marginBottom: 'var(--space-sm)' }}>Conditions of Interest</h3>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
              Select all that apply to personalize your content:
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
                    style={{ padding: '6px 12px', fontSize: 'var(--font-sm)' }}
                  >
                    <Icon name={d.icon} size={14} style={{ marginRight: '6px' }} />
                    {d.shortName}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-sm)', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4, textAlign: 'center' }}>
            By creating an account, you consent to our use of local storage cookies to securely track app usage and personalize your medical feed.
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--full"
            disabled={loading}
            style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-md)' }}
          >
            {loading ? 'Creating Account...' : 'Continue to Verification'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)', fontSize: 'var(--font-sm)' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Already have an account? </span>
          <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Sign In</Link>
        </div>
      </div>
    </div>
  );
}

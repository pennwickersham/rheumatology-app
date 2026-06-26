import { useNavigate } from 'react-router-dom';
import { diseases } from '../data/diseases';
import { drugClasses } from '../data/medications';
import { Icon } from '../components/Icons';
import { useAuth } from '../context/AuthContext';

const quickLinks = [
  { iconName: 'bone', title: 'Diseases', subtitle: 'Learn about your condition', path: '/diseases', color: '#8b5cf6' },
  { iconName: 'pill', title: 'Medications', subtitle: 'FDA drug information', path: '/medications', color: '#06b6d4' },
  { iconName: 'zap', title: 'Drug Interactions', subtitle: 'Check medication safety', path: '/interactions', color: '#f43f5e' },
  { iconName: 'microscope', title: 'Clinical Trials', subtitle: 'Find active studies', path: '/clinical-trials', color: '#a855f7' },
  { iconName: 'search', title: 'Symptom Lookup', subtitle: 'Symptom vs side effect', path: '/symptom-lookup', color: '#f59e0b' },
  { iconName: 'clipboard', title: 'Clinic Visit', subtitle: 'Maximize your visit', path: '/clinic-visit', color: '#10b981' },
  { iconName: 'phone', title: 'When to Call', subtitle: 'Urgency guidance', path: '/when-to-call', color: '#ef4444' },
  { iconName: 'chat', title: 'Ask RheumBot', subtitle: 'AI-powered Q&A', path: '/chatbot', color: '#3b82f6' },
];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Personalize diseases based on user profile
  let displayDiseases = diseases.slice(0, 4);
  let diseasesTitle = "Common Conditions";
  let diseasesSubtitle = "Quick access to disease info";
  
  if (user && user.diseases && user.diseases.length > 0) {
    const userDiseases = diseases.filter(d => user.diseases.includes(d.id));
    const otherDiseases = diseases.filter(d => !user.diseases.includes(d.id));
    displayDiseases = [...userDiseases, ...otherDiseases].slice(0, Math.max(4, userDiseases.length));
    diseasesTitle = "Your Conditions";
    diseasesSubtitle = "Personalized information based on your profile";
  }

  return (
    <div className="page-enter">
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(6,182,212,0.12) 0%, rgba(139,92,246,0.12) 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-xl) var(--space-lg)',
        marginBottom: 'var(--space-xl)',
        border: '1px solid var(--border)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{
            fontSize: 'var(--font-3xl)',
            fontWeight: 800,
            marginBottom: 'var(--space-sm)',
            lineHeight: 1.2,
          }}>
            Rheum <br/>
            <span style={{
              background: 'var(--accent-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>Companion</span>
          </h1>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: 'var(--font-sm)',
            lineHeight: 1.5,
            maxWidth: '300px',
          }}>
            Evidence-based information from FDA drug labels and PubMed research, right at your fingertips.
          </p>
        </div>
        {/* Decorative circle */}
        <div style={{
          position: 'absolute',
          right: '-20px',
          top: '-20px',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)',
        }} />
      </div>

      {/* Disclaimer */}
      <div className="disclaimer" style={{ 
        textAlign: 'center', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: 'var(--space-sm)',
        background: 'rgba(139, 69, 19, 0.15)',
        border: '1px solid rgba(139, 69, 19, 0.4)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-md)',
        maxWidth: '320px',
        margin: '0 auto',
      }}>
        <Icon name="stethoscope" size={24} color="#d97706" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          This app provides educational information only and is not a substitute for professional medical advice.
        </span>
      </div>

      {/* Quick Links */}
      <div className="section-header">
        <h2 className="section-header__title">Explore</h2>
        <p className="section-header__subtitle">Tap a section to get started</p>
      </div>

      <div 
        className="card stagger-item" 
        onClick={() => navigate('/tracker')} 
        style={{ 
          marginBottom: 'var(--space-md)', 
          cursor: 'pointer',
          background: 'rgba(6, 182, 212, 0.1)', 
          borderColor: 'rgba(6, 182, 212, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-md)',
          padding: 'var(--space-lg)'
        }}
      >
        <span className="card__icon" style={{ color: 'var(--accent-primary)', marginBottom: 0, display: 'flex' }}>
          <Icon name="activity" size={40} />
        </span>
        <div>
          <div className="card__title" style={{ fontSize: 'var(--font-xl)', color: 'var(--accent-primary)' }}>Symptom Tracker</div>
          <div className="card__subtitle" style={{ fontSize: 'var(--font-sm)' }}>Log your flares, triggers, and medications</div>
        </div>
      </div>

      <div className="grid-2">
        {quickLinks.map((link, i) => (
          <div
            key={link.path}
            className="card stagger-item"
            onClick={() => navigate(link.path)}
            style={{ cursor: 'pointer' }}
          >
            <span className="card__icon" style={{ color: link.color }}>
              <Icon name={link.iconName} size={24} color={link.color} />
            </span>
            <div className="card__title" style={{ fontSize: 'var(--font-base)' }}>{link.title}</div>
            <div className="card__subtitle" style={{ fontSize: 'var(--font-xs)' }}>{link.subtitle}</div>
          </div>
        ))}
      </div>

      {/* Common Conditions / Your Conditions */}
      <div className="section-header" style={{ marginTop: 'var(--space-xl)' }}>
        <h2 className="section-header__title">{diseasesTitle}</h2>
        <p className="section-header__subtitle">{diseasesSubtitle}</p>
      </div>

      <div className="grid-1">
        {displayDiseases.map((disease, i) => (
          <div
            key={disease.id}
            className="card card--compact stagger-item"
            onClick={() => navigate(`/diseases/${disease.id}`)}
          >
            <span className="card__icon">
              <Icon name={disease.icon} size={22} color="var(--accent)" />
            </span>
            <div className="card__content">
              <div className="card__title">{disease.name}</div>
              <div className="card__subtitle">{disease.shortName}</div>
            </div>
            <span className="card__arrow">→</span>
          </div>
        ))}
      </div>

      {/* Drug Classes */}
      <div className="section-header" style={{ marginTop: 'var(--space-xl)' }}>
        <h2 className="section-header__title">Medication Classes</h2>
        <p className="section-header__subtitle">Browse by drug category</p>
      </div>

      <div className="pill-tabs" style={{ marginBottom: 'var(--space-2xl)' }}>
        {drugClasses.map(cls => (
          <button
            key={cls.id}
            className="pill-tab"
            onClick={() => navigate(`/medications?class=${cls.id}`)}
          >
            <Icon name={cls.icon} size={24} style={{ marginRight: '8px' }} /> {cls.name}
          </button>
        ))}
      </div>
    </div>
  );
}

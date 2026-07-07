import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { diseases } from '../data/diseases';
import { drugClasses } from '../data/medications';
import { Icon } from '../components/Icons';
import { ReviewedBadge, BrandFooter } from '../components/ReviewedBadge';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';

const quickLinks = [
  { iconName: 'bone', title: 'Diseases', subtitle: 'Learn about your condition', path: '/diseases', color: '#8b5cf6' },
  { iconName: 'pill', title: 'Medications', subtitle: 'FDA drug information', path: '/medications', color: '#06b6d4' },
  { iconName: 'zap', title: 'Drug Interactions', subtitle: 'Check medication safety', path: '/interactions', color: '#f43f5e', gated: true },
  { iconName: 'microscope', title: 'Clinical Trials', subtitle: 'Find active studies', path: '/clinical-trials', color: '#a855f7' },
  { iconName: 'search', title: 'Symptom Lookup', subtitle: 'Symptom vs side effect', path: '/symptom-lookup', color: '#f59e0b' },
  { iconName: 'clipboard', title: 'Clinic Visit', subtitle: 'Maximize your visit', path: '/clinic-visit', color: '#10b981' },
  { iconName: 'phone', title: 'When to Call', subtitle: 'Urgency guidance', path: '/when-to-call', color: '#ef4444' },
  { iconName: 'chat', title: 'Ask RheumBot', subtitle: 'AI-powered Q&A', path: '/chatbot', color: '#3b82f6', gated: true },
];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSubscribed, isLoading, setShowPaywall } = useSubscription();
  
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

  const openPaywall = () => setShowPaywall(true);

  const handleNavigation = (path, gated = false) => {
    if (gated && !isSubscribed && !isLoading) {
      openPaywall();
      return;
    }

    navigate(path);
  };

  return (
    <div className="page-enter" style={{ paddingBottom: 'var(--space-3xl)' }}>
      {/* Hero Section */}
      <div className="glass-morphism" style={{
        background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
        borderRadius: 'var(--radius-2xl)',
        padding: 'var(--space-2xl) var(--space-xl)',
        marginBottom: 'var(--space-2xl)',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid var(--border-light)'
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{
            fontSize: 'var(--font-4xl)',
            fontWeight: 800,
            marginBottom: 'var(--space-sm)',
            lineHeight: 1.1,
            letterSpacing: '-0.02em'
          }}>
            Rheum <br/>
            <span className="text-gradient">Companion</span>
          </h1>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: 'var(--font-sm)',
            lineHeight: 1.7,
            maxWidth: '300px',
            marginTop: 'var(--space-md)'
          }}>
            Evidence-based rheumatology insights powered by FDA data and PubMed research.
          </p>
        </div>
        
        {/* Decorative elements */}
        <div style={{
          position: 'absolute',
          right: '-30px',
          top: '-30px',
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, transparent 70%)',
          filter: 'blur(20px)'
        }} />
        <div style={{
          position: 'absolute',
          right: '20px',
          bottom: '20px',
          opacity: 0.1,
          transform: 'rotate(-15deg)'
        }}>
          <Icon name="activity" size={80} color="var(--accent-primary)" />
        </div>
      </div>

      <button
        id="get-full-access-btn"
        onClick={openPaywall}
        className="card stagger-item"
        style={{
          width: '100%',
          marginBottom: 'var(--space-2xl)',
          cursor: 'pointer',
          padding: 'var(--space-xl)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-lg)',
          background: isSubscribed
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.9) 0%, rgba(5, 150, 105, 0.9) 100%)'
            : 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
          color: '#ffffff',
          border: 'none',
          boxShadow: isSubscribed
            ? '0 16px 40px -18px rgba(16, 185, 129, 0.65)'
            : '0 16px 40px -18px rgba(14, 165, 233, 0.65)'
        }}
      >
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 'var(--font-lg)', fontWeight: 800, marginBottom: '4px' }}>
            {isSubscribed ? 'Subscribed - Manage Plan' : 'Get Full Access'}
          </div>
          <div style={{ fontSize: 'var(--font-xs)', opacity: 0.85, lineHeight: 1.5 }}>
            {isSubscribed
              ? 'Open your subscription details and management options.'
              : '$6.99/month with a 7-day free trial. Cancel anytime.'}
          </div>
        </div>
        <div style={{
          padding: '10px 14px',
          borderRadius: 'var(--radius-lg)',
          background: 'rgba(255, 255, 255, 0.18)',
          fontSize: 'var(--font-sm)',
          fontWeight: 700,
          flexShrink: 0
        }}>
          {isSubscribed ? 'Manage' : 'Subscribe'}
        </div>
      </button>

      {/* Main Feature - Symptom Tracker */}
      <div 
        className="card stagger-item" 
        onClick={() => handleNavigation('/tracker', true)}
        style={{ 
          marginBottom: 'var(--space-2xl)', 
          cursor: 'pointer',
          background: 'rgba(14, 165, 233, 0.08)', 
          borderColor: 'rgba(14, 165, 233, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-xl)',
          padding: 'var(--space-xl)',
          boxShadow: '0 10px 30px -10px rgba(14, 165, 233, 0.2)',
          position: 'relative'
        }}
      >
        {!isSubscribed && !isLoading && (
          <div style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            width: '24px',
            height: '24px',
            borderRadius: '999px',
            background: 'rgba(15, 23, 42, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Lock size={12} color="var(--text-secondary)" />
          </div>
        )}
        <div className="flex-center" style={{ 
          width: '56px', 
          height: '56px', 
          borderRadius: 'var(--radius-lg)',
          background: 'rgba(14, 165, 233, 0.2)',
          color: 'var(--accent-primary)',
          flexShrink: 0
        }}>
          <Icon name="activity" size={32} />
        </div>
        <div>
          <div className="card__title" style={{ fontSize: 'var(--font-xl)', color: 'var(--text-primary)', marginBottom: '2px' }}>Symptom Tracker</div>
          <div className="card__subtitle" style={{ fontSize: 'var(--font-sm)' }}>Log flares, triggers, and medications</div>
        </div>
        <div style={{ marginLeft: 'auto', color: 'var(--accent-primary)' }}>
          <Icon name="chevron-right" size={20} />
        </div>
      </div>

      {/* Quick Links Grid */}
      <div className="section-header">
        <h2 className="section-header__title">Explore Resources</h2>
        <p className="section-header__subtitle">Specialized medical information</p>
      </div>

      <div className="grid-2">
        {quickLinks.map((link) => (
          <div
            key={link.path}
            className="card stagger-item"
            onClick={() => handleNavigation(link.path, link.gated)}
            style={{ 
              cursor: 'pointer',
              padding: 'var(--space-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-sm)',
              position: 'relative'
            }}
          >
            {link.gated && !isSubscribed && !isLoading && (
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                width: '24px',
                height: '24px',
                borderRadius: '999px',
                background: 'rgba(15, 23, 42, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Lock size={12} color="var(--text-secondary)" />
              </div>
            )}
            <div className="flex-center" style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: 'var(--radius-md)',
              background: `${link.color}15`,
              color: link.color,
              marginBottom: 'var(--space-xs)'
            }}>
              <Icon name={link.iconName} size={20} />
            </div>
            <div className="card__title" style={{ fontSize: 'var(--font-base)', marginBottom: '2px' }}>{link.title}</div>
            <div className="card__subtitle" style={{ fontSize: 'var(--font-xs)', lineHeight: 1.4 }}>{link.subtitle}</div>
          </div>
        ))}
      </div>

      {/* Conditions Section */}
      <div className="section-header" style={{ marginTop: 'var(--space-3xl)' }}>
        <h2 className="section-header__title">{diseasesTitle}</h2>
        <p className="section-header__subtitle">{diseasesSubtitle}</p>
      </div>

      <div className="grid-1" style={{ marginBottom: 'var(--space-md)' }}>
        {displayDiseases.map((disease) => (
          <div
            key={disease.id}
            className="card card--compact stagger-item"
            onClick={() => navigate(`/diseases/${disease.id}`)}
          >
            <div className="flex-center" style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-glass)',
              color: 'var(--accent-secondary)'
            }}>
              <Icon name={disease.icon} size={24} />
            </div>
            <div className="card__content">
              <div className="card__title">{disease.name}</div>
              <div className="card__subtitle">{disease.shortName}</div>
            </div>
            <Icon name="chevron-right" size={18} className="card__arrow" />
          </div>
        ))}
      </div>

      {/* Medication Classes */}
      <div style={{ marginLeft: 'calc(var(--space-lg) * -1)', marginRight: 'calc(var(--space-lg) * -1)' }}>
        <div className="section-header" style={{ marginTop: 'var(--space-3xl)', paddingLeft: 'var(--space-lg)', paddingRight: 'var(--space-lg)' }}>
          <h2 className="section-header__title">Medication Classes</h2>
          <p className="section-header__subtitle">Browse by pharmacological category</p>
        </div>

        <div className="pill-tabs" style={{ marginBottom: 'var(--space-2xl)' }}>
          {drugClasses.map((cls, index) => {
            const isFirst = index === 0;
            const isLast = index === drugClasses.length - 1;

            return (
              <button
                key={cls.id}
                className="pill-tab"
                onClick={() => navigate(`/medications?class=${cls.id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '14px 12px',
                  marginLeft: isFirst ? 'var(--space-lg)' : 0,
                  marginRight: isLast ? 'var(--space-lg)' : 0,
                }}
              >
                <Icon name={cls.icon} size={20} />
                <span>{cls.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="stagger-item" style={{ 
        textAlign: 'center', 
        background: 'rgba(245, 158, 11, 0.05)',
        border: '1px solid rgba(245, 158, 11, 0.1)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-xl)',
        marginTop: 'var(--space-2xl)'
      }}>
        <div className="flex-center" style={{ color: 'var(--warning)', marginBottom: 'var(--space-sm)' }}>
          <Icon name="stethoscope" size={20} />
        </div>
        <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          This application provides educational information only and is not a substitute for professional medical advice, diagnosis, or treatment.
        </p>
      </div>
      
      <ReviewedBadge date="July 2026" />
      <BrandFooter />
    </div>
  );
}

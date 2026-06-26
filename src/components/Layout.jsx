import { useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useSubscription } from '../context/SubscriptionContext';
import { Icon } from './Icons';
import Paywall from './Paywall';
import { Lock } from 'lucide-react';

// Define which paths are gated (require subscription)
const GATED_PATHS = ['/chatbot', '/tracker', '/interactions'];

const navItems = [
  { path: '/', iconName: 'home', label: 'Home', gated: false },
  { path: '/diseases', iconName: 'bone', label: 'Diseases', gated: false },
  { path: '/medications', iconName: 'pill', label: 'Meds', gated: false },
  { path: '/symptom-lookup', iconName: 'search', label: 'Lookup', gated: false },
  { path: '/tracker', iconName: 'activity', label: 'Tracker', gated: true },
  { path: '/chatbot', iconName: 'chat', label: 'Chat', gated: true },
];

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSubscribed, isLoading, showPaywall, setShowPaywall } = useSubscription();
  
  // Don't skip app-content for Chatbot page - Chatbot will handle its own layout
  const isChatPage = location.pathname === '/chatbot';
  
  const isGatedPage = GATED_PATHS.some(p => location.pathname.startsWith(p));

  // Handle clicking a gated nav item
  const handleNavClick = (e, item) => {
    if (item.gated && !isSubscribed && !isLoading) {
      e.preventDefault();
      setShowPaywall(true);
    }
  };

  // Show paywall when visiting gated pages without subscription
  useEffect(() => {
    if (isGatedPage && !isSubscribed && !isLoading) {
      setShowPaywall(true);
    }
  }, [location.pathname, isSubscribed, isLoading, setShowPaywall]);

  return (
    <div className="app-layout" style={{ background: 'var(--bg-primary)', height: '100vh' }}>
      {/* Header */}
      <header className="app-header" style={{ 
        background: 'rgba(5, 7, 10, 0.95)', 
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        height: 'calc(var(--header-height) + env(safe-area-inset-top, 0px))',
        padding: 'env(safe-area-inset-top, 0px) var(--space-md) 0'
      }}>
        <div className="app-header__title" onClick={() => navigate('/')} style={{ 
          cursor: 'pointer', 
          fontSize: 'var(--font-lg)', 
          fontWeight: 700, 
        }}>
          <Icon name="stethoscope" size={22} color="var(--accent-primary)" style={{ marginRight: '8px' }} />
          Rheum Companion
        </div>
      </header>

      {/* Content */}
      <main className={isChatPage ? 'app-chat-content' : 'app-content'}>
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav glass" style={{ 
        height: 'var(--nav-height)', 
        borderTop: '1px solid var(--border)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        background: 'rgba(5, 7, 10, 0.85)',
        padding: '0 var(--space-sm)',
        flexShrink: 0
      }}>
        {navItems.map(item => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          const isLocked = item.gated && !isSubscribed && !isLoading;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={(e) => handleNavClick(e, item)}
              className={`nav-item ${isActive ? 'active' : ''}`}
              style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '4px',
                color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                transition: 'all 0.3s ease',
                position: 'relative'
              }}
              end={item.path === '/'}
            >
              <div style={{ position: 'relative' }}>
                <Icon name={item.iconName} size={24} />
                {isLocked && (
                  <Lock size={10} style={{ 
                    position: 'absolute', 
                    top: '-4px', 
                    right: '-8px',
                    color: 'var(--text-muted)'
                  }} />
                )}
              </div>
              <span style={{ fontSize: '11px', fontWeight: isActive ? 700 : 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {showPaywall && (
        <Paywall onClose={() => setShowPaywall(false)} />
      )}
    </div>
  );
}

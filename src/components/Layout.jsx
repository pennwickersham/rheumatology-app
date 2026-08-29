import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useSubscription } from '../context/SubscriptionContext';
import { Icon } from './Icons';
import Paywall from './Paywall';
import GlobalSearch from './GlobalSearch';
import { Lock } from 'lucide-react';

// Define which paths are gated (require subscription)
const GATED_PATHS = ['/chatbot', '/tracker', '/interactions'];

const navItems = [
  { path: '/', iconName: 'home', label: 'Home', gated: false },
  { path: '/diseases', iconName: 'bone', label: 'Diseases', gated: false },
  { path: '/medications', iconName: 'pill', label: 'Meds', gated: false },
  { path: '/assessments', iconName: 'clipboard', label: 'Scores', gated: false },
  { path: '/symptom-lookup', iconName: 'search', label: 'Lookup', gated: false },
  { path: '/tracker', iconName: 'activity', label: 'Tracker', gated: true },
  { path: '/chatbot', iconName: 'chat', label: 'Chat', gated: true },
];

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSubscribed, isLoading, showPaywall, setShowPaywall } = useSubscription();
  const [searchOpen, setSearchOpen] = useState(false);

  // Don't skip app-content for Chatbot page - Chatbot will handle its own layout
  const isChatPage = location.pathname === '/chatbot';

  const isGatedPage = GATED_PATHS.some(p => location.pathname.startsWith(p));

  // Hide the global search trigger on auth pages
  const isAuthPage = ['/login', '/register', '/verify'].includes(location.pathname);

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
  }, [location.pathname, isGatedPage, isSubscribed, isLoading, setShowPaywall]);

  // Note: GlobalSearch closes itself (via onClose) before navigating,
  // so no route-change effect is needed here.

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
        {!isAuthPage && (
          <button
            className="app-header__settings"
            onClick={() => setSearchOpen(true)}
            aria-label="Search the app"
          >
            <Icon name="search" size={18} />
          </button>
        )}
      </header>

      {/* Content */}
      <main className={isChatPage ? 'app-chat-content' : 'app-content'}>
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        {navItems.map(item => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          const isLocked = item.gated && !isSubscribed && !isLoading;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={(e) => handleNavClick(e, item)}
              className={`nav-item ${isActive ? 'active' : ''}`}
              end={item.path === '/'}
            >
              <span className="nav-item__pill">
                <Icon name={item.iconName} size={22} />
                {isLocked && (
                  <Lock size={10} className="nav-item__lock" />
                )}
              </span>
              <span className="nav-item__label">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}

      {showPaywall && (
        <Paywall onClose={() => setShowPaywall(false)} />
      )}
    </div>
  );
}

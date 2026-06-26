import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon } from './Icons';

const navItems = [
  { path: '/', iconName: 'home', label: 'Home' },
  { path: '/diseases', iconName: 'bone', label: 'Diseases' },
  { path: '/medications', iconName: 'pill', label: 'Meds' },
  { path: '/symptom-lookup', iconName: 'search', label: 'Lookup' },
  { path: '/tracker', iconName: 'activity', label: 'Tracker' },
  { path: '/chatbot', iconName: 'chat', label: 'Chat' },
];

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isChatPage = location.pathname === '/chatbot';

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <div className="app-header__title" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <Icon name="stethoscope" size={22} color="var(--accent)" style={{ marginRight: '8px' }} />
          Rheum Companion
        </div>
        <div className="app-header__user">
          {user ? (
            <button 
              className="btn btn--outline btn--sm" 
              onClick={() => logout()}
              title="Sign Out"
              style={{ borderRadius: 'var(--radius-full)', padding: '4px 12px' }}
            >
              <Icon name="user" size={14} style={{ marginRight: '4px' }} />
              {user.name.split(' ')[0]}
            </button>
          ) : (
            <button 
              className="btn btn--primary btn--sm" 
              onClick={() => navigate('/login')}
              style={{ borderRadius: 'var(--radius-full)', padding: '4px 12px' }}
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className={isChatPage ? '' : 'app-content'}>
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-item ${isActive || (item.path !== '/' && location.pathname.startsWith(item.path)) ? 'active' : ''}`
            }
            end={item.path === '/'}
          >
            <span className="nav-item__icon">
              <Icon name={item.iconName} size={30} />
            </span>
            <span style={{ fontSize: '14px', marginTop: '4px' }}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

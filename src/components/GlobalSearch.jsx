import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icons';
import { searchApp } from '../utils/searchIndex';

/**
 * Full-screen search overlay reachable from the app header.
 * Searches diseases, medications, drug classes, urgency guidance,
 * clinic visit prep content, and the app's own features.
 */
export default function GlobalSearch({ onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setResults(searchApp(query));
  }, [query]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const goTo = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="global-search-overlay" role="dialog" aria-label="Search the app">
      <div className="global-search__bar">
        <span className="global-search__icon">
          <Icon name="search" size={18} color="var(--text-muted)" />
        </span>
        <input
          ref={inputRef}
          className="global-search__input"
          type="text"
          placeholder="Search diseases, medications, tools..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <button className="global-search__close" onClick={onClose} aria-label="Close search">
          Cancel
        </button>
      </div>

      <div className="global-search__results">
        {query.trim().length < 2 ? (
          <div className="empty-state" style={{ paddingTop: 'var(--space-2xl)' }}>
            <div className="empty-state__icon">
              <Icon name="search" size={44} />
            </div>
            <div className="empty-state__text">
              Search everything in Rheum Companion:<br/>
              conditions, medications, urgency guidance, visit prep, and app tools.
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: 'var(--space-2xl)' }}>
            <div className="empty-state__icon">
              <Icon name="search" size={44} />
            </div>
            <div className="empty-state__text">No results for "{query}".</div>
          </div>
        ) : (
          results.map(section => (
            <div key={section.group} style={{ marginBottom: 'var(--space-lg)' }}>
              <div className="global-search__group">{section.group}</div>
              {section.items.map((item, i) => (
                <button
                  key={`${item.path}-${item.title}-${i}`}
                  className="global-search__result"
                  onClick={() => goTo(item.path)}
                >
                  <span className="global-search__result-icon">
                    <Icon name={item.icon} size={18} />
                  </span>
                  <span className="global-search__result-text">
                    <span className="global-search__result-title">{item.title}</span>
                    {item.subtitle && (
                      <span className="global-search__result-subtitle">{item.subtitle}</span>
                    )}
                  </span>
                  <Icon name="chevron-right" size={16} color="var(--text-muted)" />
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

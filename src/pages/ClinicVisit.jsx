import { useState, useEffect } from 'react';
import { clinicVisitSections, sampleQuestions } from '../data/clinicVisit';
import { saveToStorage, loadFromStorage } from '../utils/storage';

export default function ClinicVisit() {
  const [expandedSections, setExpandedSections] = useState({ 'before-visit': true });
  const [checkedItems, setCheckedItems] = useState(() => loadFromStorage('clinic_checklist', {}));

  useEffect(() => {
    saveToStorage('clinic_checklist', checkedItems);
  }, [checkedItems]);

  const toggleSection = (id) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleCheck = (sectionId, itemIdx, checkIdx) => {
    const key = `${sectionId}-${itemIdx}-${checkIdx}`;
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isChecked = (sectionId, itemIdx, checkIdx) => {
    return !!checkedItems[`${sectionId}-${itemIdx}-${checkIdx}`];
  };

  const clearChecklist = () => {
    setCheckedItems({});
  };

  const totalItems = clinicVisitSections.reduce((acc, sec) =>
    acc + sec.items.reduce((a, item) => a + (item.checklist?.length || 0), 0), 0);
  const completedItems = Object.values(checkedItems).filter(Boolean).length;

  return (
    <div className="page-enter">
      <div className="section-header">
        <h1 className="section-header__title">Maximize Your Clinic Visit</h1>
        <p className="section-header__subtitle">Prepare, participate, and follow through</p>
      </div>

      {/* Progress */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-lg)',
        marginBottom: 'var(--space-lg)',
        border: '1px solid var(--border)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-sm)',
        }}>
          <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Preparation Progress</span>
          <span style={{ fontSize: 'var(--font-sm)', color: 'var(--accent-primary)' }}>
            {completedItems} / {totalItems}
          </span>
        </div>
        <div style={{
          height: '6px',
          background: 'var(--bg-glass)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${totalItems > 0 ? (completedItems / totalItems * 100) : 0}%`,
            background: 'var(--accent-gradient)',
            borderRadius: 'var(--radius-full)',
            transition: 'width 0.3s ease',
          }} />
        </div>
        {completedItems > 0 && (
          <button
            className="btn btn--outline btn--sm"
            style={{ marginTop: 'var(--space-sm)' }}
            onClick={clearChecklist}
          >
            Reset Checklist
          </button>
        )}
      </div>

      {/* Sections */}
      {clinicVisitSections.map(section => (
        <div key={section.id} className="urgency-card" style={{ marginBottom: 'var(--space-md)' }}>
          <div
            className="urgency-card__header"
            onClick={() => toggleSection(section.id)}
            style={{ background: `linear-gradient(135deg, ${section.color}22, ${section.color}11)` }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flex: 1 }}>
              <span className="urgency-card__icon">{section.icon}</span>
              <div>
                <div className="urgency-card__level" style={{ color: section.color }}>{section.title}</div>
              </div>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              {expandedSections[section.id] ? '▲' : '▼'}
            </span>
          </div>

          {expandedSections[section.id] && (
            <div className="urgency-card__body">
              {section.items.map((item, itemIdx) => (
                <div key={itemIdx} style={{
                  background: 'var(--bg-glass)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-md)',
                  marginBottom: 'var(--space-md)',
                }}>
                  <h3 style={{
                    fontSize: 'var(--font-base)',
                    fontWeight: 600,
                    marginBottom: 'var(--space-xs)',
                    color: 'var(--text-primary)',
                  }}>
                    {item.title}
                  </h3>
                  <p style={{
                    fontSize: 'var(--font-sm)',
                    color: 'var(--text-secondary)',
                    marginBottom: 'var(--space-md)',
                    lineHeight: 1.6,
                  }}>
                    {item.description}
                  </p>

                  {/* Checklist items */}
                  {item.checklist?.map((check, checkIdx) => (
                    <div key={checkIdx} className="checklist-item">
                      <button
                        className={`checklist-checkbox ${isChecked(section.id, itemIdx, checkIdx) ? 'checked' : ''}`}
                        onClick={() => toggleCheck(section.id, itemIdx, checkIdx)}
                      >
                        {isChecked(section.id, itemIdx, checkIdx) ? '✓' : ''}
                      </button>
                      <span
                        className={`checklist-label ${isChecked(section.id, itemIdx, checkIdx) ? 'checked' : ''}`}
                        onClick={() => toggleCheck(section.id, itemIdx, checkIdx)}
                      >
                        {check}
                      </span>
                    </div>
                  ))}

                  {/* Tips (non-checkable) */}
                  {item.tips?.map((tip, tipIdx) => (
                    <div key={tipIdx} style={{
                      display: 'flex',
                      gap: 'var(--space-sm)',
                      padding: 'var(--space-xs) 0',
                      fontSize: 'var(--font-sm)',
                      color: 'var(--text-secondary)',
                    }}>
                      <span style={{ color: 'var(--accent-primary)', flexShrink: 0 }}>•</span>
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Sample Questions */}
      <div className="section-header" style={{ marginTop: 'var(--space-xl)' }}>
        <h2 className="section-header__title" style={{ fontSize: 'var(--font-lg)' }}>
          💡 Questions to Ask Your Doctor
        </h2>
      </div>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--space-sm)',
        marginBottom: 'var(--space-2xl)',
      }}>
        {sampleQuestions.map((q, i) => (
          <div key={i} style={{
            background: 'var(--bg-glass)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-sm) var(--space-md)',
            fontSize: 'var(--font-xs)',
            color: 'var(--text-secondary)',
          }}>
            "{q}"
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { clinicVisitSections, sampleQuestions } from '../data/clinicVisit';
import { saveToStorage, loadFromStorage } from '../utils/storage';
import { Icon } from '../components/Icons';

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
    if (window.confirm('Reset all checklist items?')) {
      setCheckedItems({});
    }
  };

  const totalItems = clinicVisitSections.reduce((acc, sec) =>
    acc + sec.items.reduce((a, item) => a + (item.checklist?.length || 0), 0), 0);
  const completedItems = Object.values(checkedItems).filter(Boolean).length;
  const progressPercent = totalItems > 0 ? (completedItems / totalItems * 100) : 0;

  return (
    <div className="page-enter" style={{ paddingBottom: 'var(--space-3xl)' }}>
      <div className="section-header">
        <h1 className="section-header__title" style={{ fontSize: 'var(--font-3xl)' }}>Clinic Visit</h1>
        <p className="section-header__subtitle">Maximize your time with your rheumatologist</p>
      </div>

      {/* Progress Card */}
      <div className="card glass-morphism stagger-item" style={{
        padding: 'var(--space-xl)',
        marginBottom: 'var(--space-xl)',
        background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
      }}>
        <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
          <div>
            <span style={{ fontSize: 'var(--font-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>Visit Readiness</span>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>Check off items as you prepare</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 'var(--font-xl)', fontWeight: 800, color: 'var(--accent-primary)' }}>
              {Math.round(progressPercent)}%
            </span>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>{completedItems}/{totalItems} ITEMS</p>
          </div>
        </div>
        
        <div style={{
          height: '8px',
          background: 'var(--bg-glass)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
          marginBottom: completedItems > 0 ? 'var(--space-lg)' : 0
        }}>
          <div style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: 'var(--accent-gradient)',
            borderRadius: 'var(--radius-full)',
            transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 0 10px rgba(14, 165, 233, 0.4)'
          }} />
        </div>

        {completedItems > 0 && (
          <button
            className="btn btn--outline btn--sm btn--full"
            style={{ borderRadius: 'var(--radius-md)', borderColor: 'rgba(255,255,255,0.05)' }}
            onClick={clearChecklist}
          >
            <Icon name="trash" size={14} />
            Reset Preparation
          </button>
        )}
      </div>

      {/* Preparation Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {clinicVisitSections.map(section => (
          <div key={section.id} className="glass-morphism" style={{ 
            borderRadius: 'var(--radius-xl)', 
            overflow: 'hidden',
            border: expandedSections[section.id] ? `1px solid ${section.color}33` : '1px solid var(--border)'
          }}>
            <button
              className="flex-between w-full"
              onClick={() => toggleSection(section.id)}
              style={{ 
                padding: 'var(--space-lg)', 
                background: expandedSections[section.id] ? `${section.color}11` : 'transparent',
                border: 'none',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
                <div className="flex-center" style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: 'var(--radius-md)', 
                  background: `${section.color}22`,
                  color: section.color 
                }}>
                  <Icon name={section.iconName || 'clipboard'} size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 'var(--font-base)', fontWeight: 700, color: 'var(--text-primary)' }}>{section.title}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
                    {section.items.length} Focus Areas
                  </div>
                </div>
              </div>
              <Icon 
                name="chevron-down" 
                size={16} 
                style={{ 
                  color: 'var(--text-muted)', 
                  transition: 'transform 0.3s ease',
                  transform: expandedSections[section.id] ? 'rotate(180deg)' : 'none'
                }} 
              />
            </button>

            {expandedSections[section.id] && (
              <div style={{ padding: '0 var(--space-lg) var(--space-lg)', animation: 'fadeIn 0.3s ease' }}>
                {section.items.map((item, itemIdx) => (
                  <div key={itemIdx} style={{
                    marginTop: 'var(--space-lg)',
                    padding: 'var(--space-lg)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border)'
                  }}>
                    <h3 style={{
                      fontSize: 'var(--font-sm)',
                      fontWeight: 700,
                      marginBottom: 'var(--space-xs)',
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: section.color }} />
                      {item.title}
                    </h3>
                    <p style={{
                      fontSize: 'var(--font-xs)',
                      color: 'var(--text-secondary)',
                      marginBottom: 'var(--space-lg)',
                      lineHeight: 1.6,
                    }}>
                      {item.description}
                    </p>

                    {/* Checklist items */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                      {item.checklist?.map((check, checkIdx) => (
                        <div 
                          key={checkIdx} 
                          className="checklist-item"
                          onClick={() => toggleCheck(section.id, itemIdx, checkIdx)}
                        >
                          <div className={`checklist-checkbox ${isChecked(section.id, itemIdx, checkIdx) ? 'checked' : ''}`}>
                            {isChecked(section.id, itemIdx, checkIdx) && <Icon name="check" size={12} />}
                          </div>
                          <span className={`checklist-label ${isChecked(section.id, itemIdx, checkIdx) ? 'checked' : ''}`}>
                            {check}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Tips (non-checkable) */}
                    {item.tips && item.tips.length > 0 && (
                      <div style={{ 
                        marginTop: 'var(--space-md)', 
                        paddingTop: 'var(--space-md)', 
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-xs)'
                      }}>
                        {item.tips.map((tip, tipIdx) => (
                          <div key={tipIdx} style={{
                            display: 'flex',
                            gap: 'var(--space-sm)',
                            fontSize: 'var(--font-xs)',
                            color: 'var(--text-muted)',
                            lineHeight: 1.5
                          }}>
                            <Icon name="info" size={12} style={{ color: section.color, marginTop: '2px', flexShrink: 0 }} />
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sample Questions */}
      <div className="section-header stagger-item" style={{ marginTop: 'var(--space-3xl)' }}>
        <h2 className="section-header__title" style={{ fontSize: 'var(--font-xl)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icon name="help-circle" size={24} color="var(--accent-primary)" />
          Questions to Ask
        </h2>
        <p className="section-header__subtitle">Consider asking these during your appointment</p>
      </div>

      <div className="stagger-item" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-sm)',
        marginBottom: 'var(--space-xl)',
      }}>
        {sampleQuestions.map((q, i) => (
          <div key={i} className="glass flex-between" style={{
            padding: 'var(--space-md) var(--space-lg)',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--font-sm)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)'
          }}>
            <span style={{ lineHeight: 1.5 }}>{q}</span>
            <Icon name="plus" size={14} color="var(--accent-primary)" style={{ flexShrink: 0, marginLeft: 'var(--space-md)' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

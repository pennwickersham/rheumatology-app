import { useState, useMemo } from 'react';
import { diseases } from '../data/diseases';
import { medications, getMedicationById } from '../data/medications';
import { Icon } from '../components/Icons';

export default function SymptomLookup() {
  const [selectedDiseases, setSelectedDiseases] = useState([]);
  const [selectedMeds, setSelectedMeds] = useState([]);
  const [symptomQuery, setSymptomQuery] = useState('');

  const toggleDisease = (id) => {
    setSelectedDiseases(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const toggleMed = (id) => {
    setSelectedMeds(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  // Available medications based on selected diseases
  const relevantMeds = useMemo(() => {
    if (selectedDiseases.length === 0) return medications;
    const medIds = new Set();
    selectedDiseases.forEach(dId => {
      const disease = diseases.find(d => d.id === dId);
      disease?.relatedMedications?.forEach(m => medIds.add(m));
    });
    return medications.filter(m => medIds.has(m.id));
  }, [selectedDiseases]);

  // Search results
  const results = useMemo(() => {
    if (!symptomQuery.trim()) return null;
    const q = symptomQuery.toLowerCase();
    const matches = [];

    // Check disease symptoms
    selectedDiseases.forEach(dId => {
      const disease = diseases.find(d => d.id === dId);
      if (!disease) return;
      disease.symptoms.forEach(symptom => {
        if (symptom.toLowerCase().includes(q) || q.includes(symptom.toLowerCase().split(' ')[0])) {
          matches.push({
            type: 'disease',
            source: disease.name,
            icon: disease.icon,
            symptom,
            description: `This is a known symptom of ${disease.name}.`,
          });
        }
      });
    });

    // Check medication side effects
    selectedMeds.forEach(mId => {
      const med = getMedicationById(mId);
      if (!med) return;
      [...med.commonSideEffects, ...med.seriousSideEffects].forEach(se => {
        if (se.toLowerCase().includes(q) || q.includes(se.toLowerCase().split(' ')[0])) {
          const isSerious = med.seriousSideEffects.includes(se);
          matches.push({
            type: 'medication',
            source: `${med.genericName} (${med.brandNames[0]})`,
            icon: med.icon,
            symptom: se,
            isSerious,
            description: isSerious
              ? `⚠️ This is a SERIOUS side effect of ${med.genericName}. Contact your doctor if you experience this.`
              : `This is a common side effect of ${med.genericName}.`,
          });
        }
      });
    });

    // Check if it could be both
    const diseaseMatches = matches.filter(m => m.type === 'disease');
    const medMatches = matches.filter(m => m.type === 'medication');

    return { all: matches, diseaseMatches, medMatches, hasBoth: diseaseMatches.length > 0 && medMatches.length > 0 };
  }, [symptomQuery, selectedDiseases, selectedMeds]);

  return (
    <div className="page-enter" style={{ paddingBottom: 'var(--space-3xl)' }}>
      <div className="section-header">
        <h1 className="section-header__title" style={{ fontSize: 'var(--font-3xl)' }}>Symptom Checker</h1>
        <p className="section-header__subtitle">
          Is it a disease flare or a medication side effect?
        </p>
      </div>

      <div className="disclaimer stagger-item" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="disclaimer__icon">
          <Icon name="info" size={20} color="var(--warning)" />
        </div>
        <div>
          Select your conditions and medications, then search for a symptom to see how it correlates with your medical profile.
        </div>
      </div>

      {/* Disease Selection */}
      <div className="section-header stagger-item" style={{ marginBottom: 'var(--space-md)' }}>
        <h2 className="section-header__title" style={{ fontSize: 'var(--font-base)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
          1. Your Conditions
        </h2>
      </div>
      <div className="multi-select stagger-item">
        {diseases.map(d => (
          <button
            key={d.id}
            className={`multi-select__item ${selectedDiseases.includes(d.id) ? 'selected' : ''}`}
            onClick={() => toggleDisease(d.id)}
          >
            <Icon name={d.icon} size={16} />
            {d.shortName}
          </button>
        ))}
      </div>

      {/* Medication Selection */}
      <div className="section-header stagger-item" style={{ marginBottom: 'var(--space-md)' }}>
        <h2 className="section-header__title" style={{ fontSize: 'var(--font-base)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
          2. Your Medications
        </h2>
      </div>
      <div className="multi-select stagger-item">
        {relevantMeds.map(m => (
          <button
            key={m.id}
            className={`multi-select__item ${selectedMeds.includes(m.id) ? 'selected' : ''}`}
            onClick={() => toggleMed(m.id)}
          >
            <Icon name={m.icon} size={16} />
            {m.genericName}
          </button>
        ))}
      </div>

      {/* Symptom Search */}
      <div className="section-header stagger-item" style={{ marginBottom: 'var(--space-md)' }}>
        <h2 className="section-header__title" style={{ fontSize: 'var(--font-base)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
          3. Describe Symptom
        </h2>
      </div>
      <div className="search-bar stagger-item" style={{ marginBottom: 'var(--space-2xl)' }}>
        <span className="search-bar__icon">
          <Icon name="search" size={18} />
        </span>
        <input
          className="search-bar__input"
          type="text"
          placeholder="e.g. nausea, joint pain, rash..."
          value={symptomQuery}
          onChange={e => setSymptomQuery(e.target.value)}
          disabled={selectedDiseases.length === 0 && selectedMeds.length === 0}
        />
      </div>

      {/* Instructions */}
      {(selectedDiseases.length === 0 && selectedMeds.length === 0) && (
        <div className="empty-state stagger-item">
          <div className="empty-state__icon">
            <Icon name="activity" size={48} />
          </div>
          <div className="empty-state__text">Select at least one condition or medication above to begin the analysis.</div>
        </div>
      )}

      {/* Results */}
      {results && symptomQuery.trim() && (
        <div style={{ marginBottom: 'var(--space-3xl)' }}>
          {results.hasBoth && (
            <div className="symptom-result symptom-result--both stagger-item" style={{ marginBottom: 'var(--space-xl)' }}>
              <div className="symptom-result__source" style={{ color: 'var(--warning)' }}>
                <Icon name="alert-triangle" size={14} />
                Overlapping Symptom
              </div>
              <div className="symptom-result__text" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                This symptom is listed as both a disease symptom AND a medication side effect. Discuss this overlap with your rheumatologist.
              </div>
            </div>
          )}

          {results.diseaseMatches.length > 0 && (
            <div className="stagger-item" style={{ marginBottom: 'var(--space-xl)' }}>
              <h3 style={{
                fontSize: 'var(--font-xs)',
                fontWeight: 800,
                color: 'var(--accent-secondary)',
                marginBottom: 'var(--space-md)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}>
                Disease Symptoms ({results.diseaseMatches.length})
              </h3>
              {results.diseaseMatches.map((r, i) => (
                <div key={i} className="symptom-result symptom-result--disease glass-morphism">
                  <div className="symptom-result__source" style={{ color: 'var(--accent-secondary)' }}>
                    <Icon name={r.icon} size={14} />
                    {r.source}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--font-base)', color: 'var(--text-primary)', marginBottom: '4px' }}>{r.symptom}</div>
                  <div className="symptom-result__text">{r.description}</div>
                </div>
              ))}
            </div>
          )}

          {results.medMatches.length > 0 && (
            <div className="stagger-item">
              <h3 style={{
                fontSize: 'var(--font-xs)',
                fontWeight: 800,
                color: 'var(--accent-primary)',
                marginBottom: 'var(--space-md)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}>
                Medication Side Effects ({results.medMatches.length})
              </h3>
              {results.medMatches.map((r, i) => (
                <div key={i} className={`symptom-result symptom-result--medication glass-morphism`}>
                  <div className="symptom-result__source" style={{ color: r.isSerious ? 'var(--danger)' : 'var(--accent-primary)' }}>
                    <Icon name={r.isSerious ? 'alert-circle' : r.icon} size={14} />
                    {r.source}
                    {r.isSerious && <span className="badge badge--danger" style={{ marginLeft: '8px', fontSize: '8px' }}>SERIOUS</span>}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--font-base)', color: 'var(--text-primary)', marginBottom: '4px' }}>{r.symptom}</div>
                  <div className="symptom-result__text">{r.description}</div>
                </div>
              ))}
            </div>
          )}

          {results.all.length === 0 && (
            <div className="empty-state stagger-item">
              <div className="empty-state__icon">
                <Icon name="search" size={48} />
              </div>
              <div className="empty-state__text">
                No direct matches found in our database. Consider asking RheumBot for more detailed insights.
              </div>
            </div>
          )}

          <div className="disclaimer stagger-item" style={{ marginTop: 'var(--space-2xl)' }}>
            <div className="disclaimer__icon">
              <Icon name="info" size={20} color="var(--text-muted)" />
            </div>
            <div>
              This tool cross-references symptoms against known rheumatologic profiles and FDA drug labels. It is for educational purposes only.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

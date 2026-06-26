import { useState, useMemo } from 'react';
import { diseases } from '../data/diseases';
import { medications, getMedicationById } from '../data/medications';

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
    <div className="page-enter">
      <div className="section-header">
        <h1 className="section-header__title">Symptom Lookup</h1>
        <p className="section-header__subtitle">
          Is it a disease symptom or medication side effect?
        </p>
      </div>

      <div className="disclaimer">
        <span className="disclaimer__icon">💡</span>
        Select your condition(s) and medication(s), then search for a symptom to find out if it's related to your disease, your medication, or both.
      </div>

      {/* Disease Selection */}
      <div className="section-header" style={{ marginBottom: 'var(--space-sm)' }}>
        <h2 className="section-header__title" style={{ fontSize: 'var(--font-lg)' }}>
          1. Select Your Condition(s)
        </h2>
      </div>
      <div className="multi-select">
        {diseases.map(d => (
          <button
            key={d.id}
            className={`multi-select__item ${selectedDiseases.includes(d.id) ? 'selected' : ''}`}
            onClick={() => toggleDisease(d.id)}
          >
            {d.icon} {d.shortName}
          </button>
        ))}
      </div>

      {/* Medication Selection */}
      <div className="section-header" style={{ marginBottom: 'var(--space-sm)' }}>
        <h2 className="section-header__title" style={{ fontSize: 'var(--font-lg)' }}>
          2. Select Your Medication(s)
        </h2>
      </div>
      <div className="multi-select">
        {relevantMeds.map(m => (
          <button
            key={m.id}
            className={`multi-select__item ${selectedMeds.includes(m.id) ? 'selected' : ''}`}
            onClick={() => toggleMed(m.id)}
          >
            {m.icon} {m.genericName}
          </button>
        ))}
      </div>

      {/* Symptom Search */}
      <div className="section-header" style={{ marginBottom: 'var(--space-sm)' }}>
        <h2 className="section-header__title" style={{ fontSize: 'var(--font-lg)' }}>
          3. Describe Your Symptom
        </h2>
      </div>
      <div className="search-bar">
        <span className="search-bar__icon">🔍</span>
        <input
          className="search-bar__input"
          type="text"
          placeholder="e.g., nausea, joint pain, rash, fatigue..."
          value={symptomQuery}
          onChange={e => setSymptomQuery(e.target.value)}
          disabled={selectedDiseases.length === 0 && selectedMeds.length === 0}
        />
      </div>

      {/* Instructions */}
      {(selectedDiseases.length === 0 && selectedMeds.length === 0) && (
        <div className="empty-state">
          <div className="empty-state__icon">☝️</div>
          <div className="empty-state__text">Select at least one condition or medication to start.</div>
        </div>
      )}

      {/* Results */}
      {results && symptomQuery.trim() && (
        <div>
          {results.hasBoth && (
            <div className="symptom-result symptom-result--both" style={{ marginBottom: 'var(--space-lg)' }}>
              <div className="symptom-result__source" style={{ color: 'var(--warning)' }}>
                ⚠️ Could Be Both
              </div>
              <div className="symptom-result__text">
                This symptom appears in both your disease symptom list AND as a medication side effect.
                Discuss with your rheumatologist to determine the likely cause.
              </div>
            </div>
          )}

          {results.diseaseMatches.length > 0 && (
            <>
              <h3 style={{
                fontSize: 'var(--font-base)',
                fontWeight: 600,
                color: 'var(--accent-secondary)',
                marginBottom: 'var(--space-sm)',
              }}>
                🦴 Disease Symptoms ({results.diseaseMatches.length})
              </h3>
              {results.diseaseMatches.map((r, i) => (
                <div key={i} className="symptom-result symptom-result--disease">
                  <div className="symptom-result__source" style={{ color: 'var(--accent-secondary)' }}>
                    {r.icon} {r.source}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)', marginBottom: '4px' }}>{r.symptom}</div>
                  <div className="symptom-result__text">{r.description}</div>
                </div>
              ))}
            </>
          )}

          {results.medMatches.length > 0 && (
            <>
              <h3 style={{
                fontSize: 'var(--font-base)',
                fontWeight: 600,
                color: 'var(--accent-primary)',
                marginBottom: 'var(--space-sm)',
                marginTop: 'var(--space-md)',
              }}>
                💊 Medication Side Effects ({results.medMatches.length})
              </h3>
              {results.medMatches.map((r, i) => (
                <div key={i} className={`symptom-result symptom-result--medication`}>
                  <div className="symptom-result__source" style={{ color: r.isSerious ? '#f87171' : 'var(--accent-primary)' }}>
                    {r.isSerious ? '🚨' : r.icon} {r.source}
                    {r.isSerious && <span className="badge badge--danger" style={{ marginLeft: '8px' }}>SERIOUS</span>}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)', marginBottom: '4px' }}>{r.symptom}</div>
                  <div className="symptom-result__text">{r.description}</div>
                </div>
              ))}
            </>
          )}

          {results.all.length === 0 && (
            <div className="empty-state">
              <div className="empty-state__icon">🤔</div>
              <div className="empty-state__text">
                No matches found. Try different keywords or ask the chatbot for help.
              </div>
            </div>
          )}

          <div className="disclaimer" style={{ marginTop: 'var(--space-lg)' }}>
            <span className="disclaimer__icon">⚕️</span>
            This tool matches symptoms against known disease symptoms and FDA-listed medication side effects. It cannot diagnose conditions. Always consult your rheumatologist about new or concerning symptoms.
          </div>
        </div>
      )}
    </div>
  );
}

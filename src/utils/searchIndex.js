// src/utils/searchIndex.js
// Unified search index across every resource in the app:
// diseases, medications, drug classes, when-to-call guidance,
// clinic visit prep, and the app's feature pages themselves.

import { diseases } from '../data/diseases';
import { medications, drugClasses } from '../data/medications';
import { urgencyLevels } from '../data/whenToCall';
import { clinicVisitSections } from '../data/clinicVisit';

// App features so users can find tools, not just content
const featurePages = [
  { title: 'Symptom Tracker', subtitle: 'Log symptoms, diet, and flares', path: '/tracker', icon: 'activity', keywords: 'track log diary flare diet food pain fatigue stiffness swelling' },
  { title: 'Symptom Scores', subtitle: 'Patient-reported outcome measures and joint map', path: '/assessments', icon: 'clipboard', keywords: 'assessment score joint map homunculus pain global raps' },
  { title: 'Drug Interactions', subtitle: 'Check medication safety', path: '/interactions', icon: 'zap', keywords: 'interaction combination safety mixing drugs' },
  { title: 'Clinical Trials', subtitle: 'Find active research studies', path: '/clinical-trials', icon: 'microscope', keywords: 'trial study research enrollment recruiting' },
  { title: 'Symptom Lookup', subtitle: 'Symptom vs medication side effect', path: '/symptom-lookup', icon: 'search', keywords: 'side effect symptom lookup cause' },
  { title: 'Clinic Visit Prep', subtitle: 'Get the most from your appointment', path: '/clinic-visit', icon: 'clipboard', keywords: 'appointment visit prepare questions checklist doctor' },
  { title: 'When to Call', subtitle: 'Urgency guidance for symptoms', path: '/when-to-call', icon: 'phone', keywords: 'emergency urgent call 911 er doctor help' },
  { title: 'Ask RheumBot', subtitle: 'AI-powered rheumatology Q&A', path: '/chatbot', icon: 'chat', keywords: 'chat ai question ask bot' },
  { title: 'Disease Library', subtitle: 'Browse all conditions', path: '/diseases', icon: 'bone', keywords: 'disease condition diagnosis library' },
  { title: 'Medication Library', subtitle: 'Browse all medications', path: '/medications', icon: 'pill', keywords: 'medication drug library formulary' },
];

let cachedIndex = null;

function buildIndex() {
  if (cachedIndex) return cachedIndex;
  const idx = [];

  // Features / pages
  featurePages.forEach(f => {
    idx.push({
      group: 'App Features',
      title: f.title,
      subtitle: f.subtitle,
      path: f.path,
      icon: f.icon,
      haystack: `${f.title} ${f.subtitle} ${f.keywords}`.toLowerCase(),
    });
  });

  // Diseases
  diseases.forEach(d => {
    idx.push({
      group: 'Diseases',
      title: d.name,
      subtitle: d.shortName ? `${d.shortName} • ${d.icd10}` : d.icd10,
      path: `/diseases/${d.id}`,
      icon: d.icon || 'bone',
      haystack: `${d.name} ${d.shortName || ''} ${d.icd10 || ''} ${(d.symptoms || []).join(' ')} ${d.description || ''}`.toLowerCase(),
    });
  });

  // Medications
  medications.forEach(m => {
    idx.push({
      group: 'Medications',
      title: m.genericName,
      subtitle: (m.brandNames || []).join(', '),
      path: `/medications/${m.id}`,
      icon: m.icon || 'pill',
      haystack: `${m.genericName} ${(m.brandNames || []).join(' ')} ${m.drugClass || ''} ${(m.commonSideEffects || []).join(' ')}`.toLowerCase(),
    });
  });

  // Drug classes
  drugClasses.forEach(c => {
    idx.push({
      group: 'Medications',
      title: c.name,
      subtitle: c.description,
      path: `/medications?class=${c.id}`,
      icon: c.icon || 'pill',
      haystack: `${c.name} ${c.description}`.toLowerCase(),
    });
  });

  // When to call — individual situations
  urgencyLevels.forEach(level => {
    (level.situations || []).forEach(s => {
      idx.push({
        group: 'When to Call',
        title: s.symptom,
        subtitle: `${level.level} — ${level.instruction}`,
        path: '/when-to-call',
        icon: 'phone',
        haystack: `${s.symptom} ${s.details || ''} ${level.level}`.toLowerCase(),
      });
    });
  });

  // Clinic visit prep items
  clinicVisitSections.forEach(section => {
    (section.items || []).forEach(item => {
      idx.push({
        group: 'Clinic Visit Prep',
        title: item.title,
        subtitle: section.title,
        path: '/clinic-visit',
        icon: 'clipboard',
        haystack: `${item.title} ${item.description || ''} ${(item.checklist || []).join(' ')}`.toLowerCase(),
      });
    });
  });

  cachedIndex = idx;
  return idx;
}

/**
 * Searches the whole app. Returns results grouped in display order,
 * capped per group so the list stays scannable.
 * @param {string} query
 * @returns {{ group: string, items: object[] }[]}
 */
export function searchApp(query) {
  const q = (query || '').trim().toLowerCase();
  if (q.length < 2) return [];

  const terms = q.split(/\s+/);
  const idx = buildIndex();

  const scored = [];
  idx.forEach(item => {
    if (!terms.every(t => item.haystack.includes(t))) return;
    const titleLower = item.title.toLowerCase();
    let score = 1;
    if (titleLower.includes(q)) score = 3;
    if (titleLower.startsWith(q)) score = 4;
    scored.push({ ...item, score });
  });

  scored.sort((a, b) => b.score - a.score);

  const groupOrder = ['App Features', 'Diseases', 'Medications', 'When to Call', 'Clinic Visit Prep'];
  const grouped = [];
  groupOrder.forEach(g => {
    const items = scored.filter(r => r.group === g).slice(0, 5);
    if (items.length > 0) grouped.push({ group: g, items });
  });

  return grouped;
}

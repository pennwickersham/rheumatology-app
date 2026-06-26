/**
 * Utilities for parsing and formatting FDA label text
 */

/**
 * Parse FDA adverse reactions text into a more readable format
 */
export function parseAdverseReactions(text) {
  if (!text) return [];

  // Split into sections if possible
  const sections = text.split(/(?=\d+\.\d+\s)/).filter(Boolean);

  return sections.map(section => {
    const lines = section.split(/[.;]/).filter(s => s.trim().length > 10);
    return {
      text: section.trim(),
      bullets: lines.map(l => l.trim()).filter(Boolean),
    };
  });
}

/**
 * Truncate FDA text to a reasonable length with "read more"
 */
export function truncateFdaText(text, maxLength = 300) {
  if (!text || text.length <= maxLength) return { text: text || '', truncated: false };
  return {
    text: text.substring(0, maxLength).replace(/\s+\S*$/, '') + '...',
    truncated: true,
    fullText: text,
  };
}

/**
 * Format FDA section title from key name
 */
export function formatSectionTitle(key) {
  const titles = {
    indicationsAndUsage: 'Indications & Usage',
    dosageAndAdministration: 'Dosage & Administration',
    boxedWarning: '⚠️ Boxed Warning',
    warnings: 'Warnings & Precautions',
    adverseReactions: 'Adverse Reactions',
    drugInteractions: 'Drug Interactions',
    contraindications: 'Contraindications',
    useInSpecificPopulations: 'Use in Specific Populations',
    clinicalPharmacology: 'Clinical Pharmacology',
    howSupplied: 'How Supplied / Storage',
    patientInfo: 'Patient Information',
  };
  return titles[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}

/**
 * Get priority order for displaying FDA sections
 */
export function getSectionPriority() {
  return [
    'boxedWarning',
    'indicationsAndUsage',
    'dosageAndAdministration',
    'warnings',
    'adverseReactions',
    'drugInteractions',
    'contraindications',
    'useInSpecificPopulations',
    'patientInfo',
    'howSupplied',
    'clinicalPharmacology',
  ];
}

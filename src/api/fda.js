const FDA_BASE_URL = 'https://api.fda.gov/drug/label.json';

/**
 * Search for drug labels on openFDA
 * @param {string} drugName - Generic or brand name to search
 * @param {number} limit - Max results (default 5)
 * @returns {Promise<Array>} Array of label results
 */
export async function searchDrugLabels(drugName, limit = 5) {
  const query = encodeURIComponent(
    `openfda.generic_name:"${drugName}" OR openfda.brand_name:"${drugName}"`
  );
  const url = `${FDA_BASE_URL}?search=${query}&limit=${limit}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(`FDA API error: ${response.status}`);
    }
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('FDA search error:', error);
    return [];
  }
}

/**
 * Get detailed drug label information (full package insert)
 * @param {string} drugName - Generic name of the drug
 * @returns {Promise<Object|null>} Parsed drug label data
 */
export async function getDrugDetails(drugName) {
  const results = await searchDrugLabels(drugName, 1);
  if (results.length === 0) return null;

  const label = results[0];
  return {
    brandName: label.openfda?.brand_name?.[0] || drugName,
    genericName: label.openfda?.generic_name?.[0] || drugName,
    manufacturer: label.openfda?.manufacturer_name?.[0] || 'Unknown',
    indicationsAndUsage: cleanFdaText(label.indications_and_usage?.[0]),
    dosageAndAdministration: cleanFdaText(label.dosage_and_administration?.[0]),
    boxedWarning: cleanFdaText(label.boxed_warning?.[0]),
    warnings: cleanFdaText(label.warnings?.[0] || label.warnings_and_precautions?.[0]),
    adverseReactions: cleanFdaText(label.adverse_reactions?.[0]),
    drugInteractions: cleanFdaText(label.drug_interactions?.[0]),
    contraindications: cleanFdaText(label.contraindications?.[0]),
    useInSpecificPopulations: cleanFdaText(label.use_in_specific_populations?.[0]),
    clinicalPharmacology: cleanFdaText(label.clinical_pharmacology?.[0]),
    howSupplied: cleanFdaText(label.how_supplied?.[0] || label.storage_and_handling?.[0]),
    patientInfo: cleanFdaText(label.patient_medication_information?.[0] || label.information_for_patients?.[0]),
    lastUpdated: label.effective_time || 'Unknown',
    applicationNumber: label.openfda?.application_number?.[0] || '',
    // SPL Set ID lets us cite/link the exact label document on DailyMed (NLM)
    setId: label.set_id || label.openfda?.spl_set_id?.[0] || '',
  };
}

/**
 * Clean FDA text - remove section numbers and extra whitespace
 */
function cleanFdaText(text) {
  if (!text) return null;
  return text
    .replace(/\s+/g, ' ')
    .replace(/^\d+(\.\d+)*\s*/g, '')
    .trim();
}

/**
 * Get adverse reactions section parsed into categorized lists
 */
export async function getAdverseReactions(drugName) {
  const details = await getDrugDetails(drugName);
  if (!details?.adverseReactions) return null;

  return {
    rawText: details.adverseReactions,
    drugName: details.genericName,
    brandName: details.brandName,
  };
}

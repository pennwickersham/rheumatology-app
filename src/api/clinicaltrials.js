// src/api/clinicaltrials.js
const CT_API_BASE = 'https://clinicaltrials.gov/api/v2/studies';

/**
 * Search ClinicalTrials.gov for active studies by condition
 * @param {string} condition - Disease/condition name
 * @param {object} options - Optional filters
 * @returns {Promise<Array>} Array of parsed trial objects
 */
export async function searchTrials(condition, options = {}) {
  const {
    status = 'RECRUITING,NOT_YET_RECRUITING',
    pageSize = 20,
  } = options;

  const params = new URLSearchParams({
    'query.cond': condition,
    'filter.overallStatus': status,
    pageSize: String(pageSize),
    sort: 'LastUpdatePostDate:desc',
    fields: [
      'NCTId',
      'BriefTitle',
      'OfficialTitle',
      'OverallStatus',
      'BriefSummary',
      'Phase',
      'EnrollmentCount',
      'StartDate',
      'LeadSponsorName',
      'LocationCity',
      'LocationState',
      'LocationCountry',
      'LocationFacility',
      'Condition',
      'InterventionName',
      'InterventionType',
      'StudyType',
      'LastUpdatePostDate',
    ].join('|'),
  });

  try {
    const response = await fetch(`${CT_API_BASE}?${params}`);
    if (!response.ok) {
      throw new Error(`ClinicalTrials.gov API error: ${response.status}`);
    }
    const data = await response.json();
    return (data.studies || []).map(parseTrial);
  } catch (error) {
    console.error('Clinical trials search error:', error);
    throw error;
  }
}

function parseTrial(study) {
  const proto = study.protocolSection || {};
  const id = proto.identificationModule || {};
  const status = proto.statusModule || {};
  const desc = proto.descriptionModule || {};
  const design = proto.designModule || {};
  const sponsor = proto.sponsorCollaboratorsModule || {};
  const conditions = proto.conditionsModule || {};
  const interventions = proto.armsInterventionsModule || {};
  const contacts = proto.contactsLocationsModule || {};

  // Extract locations (first 3)
  const locations = (contacts.locations || []).slice(0, 3).map(loc => ({
    facility: loc.facility || '',
    city: loc.city || '',
    state: loc.state || '',
    country: loc.country || '',
  }));

  // Extract interventions
  const interventionList = (interventions.interventions || []).map(i => ({
    name: i.name || '',
    type: i.type || '',
  }));

  return {
    nctId: id.nctId || '',
    title: id.briefTitle || id.officialTitle || 'Untitled Study',
    status: status.overallStatus || 'Unknown',
    phase: (design.phases || []).join(', ') || 'N/A',
    summary: desc.briefSummary || '',
    enrollment: design.enrollmentInfo?.count || null,
    startDate: status.startDateStruct?.date || '',
    sponsor: sponsor.leadSponsor?.name || '',
    conditions: conditions.conditions || [],
    interventions: interventionList,
    locations,
    lastUpdated: status.lastUpdateSubmitDate || '',
    url: `https://clinicaltrials.gov/study/${id.nctId || ''}`,
  };
}

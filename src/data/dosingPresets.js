// Typical maintenance schedules used to pre-fill "My Medications" when a
// drug is added. These are common label/ACR starting points, NOT personal
// instructions: the patient confirms or changes them to match their
// prescription. Drugs with more than one common regimen (e.g. abatacept,
// tocilizumab, belimumab SC vs IV) only set the route.
//
// schedule: { unit: 'day' | 'week' | 'month', every: N }
// route:    'oral' | 'injection' | 'infusion'

export const PRESETS_LAST_REVIEWED = 'October 2026';

const presets = {
  methotrexate:   { route: 'oral',      schedule: { unit: 'week',  every: 1 } },
  anakinra:       { route: 'injection', schedule: { unit: 'day',   every: 1 } },
  etanercept:     { route: 'injection', schedule: { unit: 'week',  every: 1 } },
  adalimumab:     { route: 'injection', schedule: { unit: 'week',  every: 2 } },
  certolizumab:   { route: 'injection', schedule: { unit: 'week',  every: 2 } },
  sarilumab:      { route: 'injection', schedule: { unit: 'week',  every: 2 } },
  golimumab:      { route: 'injection', schedule: { unit: 'month', every: 1 } },
  secukinumab:    { route: 'injection', schedule: { unit: 'week',  every: 4 } },
  ixekizumab:     { route: 'injection', schedule: { unit: 'week',  every: 4 } },
  bimekizumab:    { route: 'injection', schedule: { unit: 'week',  every: 4 } },
  guselkumab:     { route: 'injection', schedule: { unit: 'week',  every: 8 } },
  risankizumab:   { route: 'injection', schedule: { unit: 'week',  every: 12 } },
  ustekinumab:    { route: 'injection', schedule: { unit: 'week',  every: 12 } },
  abatacept:      { route: 'injection' },
  tocilizumab:    { route: 'injection' },
  belimumab:      { route: 'injection' },
  canakinumab:    { route: 'injection' },
  infliximab:     { route: 'infusion',  schedule: { unit: 'week',  every: 8 } },
  anifrolumab:    { route: 'infusion',  schedule: { unit: 'week',  every: 4 } },
  pegloticase:    { route: 'infusion',  schedule: { unit: 'week',  every: 2 } },
  rituximab:      { route: 'infusion',  schedule: { unit: 'month', every: 6 } },
  inebilizumab:   { route: 'infusion',  schedule: { unit: 'month', every: 6 } },
  obinutuzumab:   { route: 'infusion' },
  cyclophosphamide: { route: 'infusion' },
  'immune-globulin-iv': { route: 'infusion', schedule: { unit: 'week', every: 4 } },
};

export function getDosingPreset(medId) {
  return presets[medId] || null;
}

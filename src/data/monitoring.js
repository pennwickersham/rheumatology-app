// General monitoring checklists shown on each medication page.
// These are typical ACR/label-based starting points, NOT personal instructions.
// Per-drug entries override the class default.

export const CONTENT_LAST_REVIEWED = 'October 2026';

const TB_HBV = 'Tuberculosis and hepatitis B screening before starting';

const classDefaults = {
  nsaids: ['Blood pressure', 'Kidney function (creatinine) and blood count periodically, especially if long-term or over age 60', 'Report black stools, vomiting blood, or stomach pain right away'],
  dmards: ['Blood count (CBC), liver tests, and kidney function — often every 2 to 3 months once stable', 'Hepatitis B and C screening before starting', 'Avoid live vaccines unless your doctor approves'],
  immunosuppressants: ['Blood count, liver tests, and kidney function on a regular schedule', 'Blood pressure and blood sugar', 'Screening for infections before starting; avoid live vaccines', 'Regular skin checks and age-appropriate cancer screening'],
  biologics: [TB_HBV, 'Report fever, cough, or any infection promptly', 'Avoid live vaccines; stay current on inactivated vaccines before starting', 'Blood count and liver tests as directed by your doctor'],
  'jak-inhibitors': [TB_HBV, 'Blood count, liver tests, and cholesterol (lipid) panel — typically at baseline and then periodically', 'Shingles vaccine before starting is recommended', 'Report leg swelling, chest pain, or sudden shortness of breath immediately (clot risk)', 'Regular skin checks'],
  corticosteroids: ['Blood pressure and blood sugar', 'Bone density if on long-term treatment', 'Eye exam for cataracts and glaucoma with long-term use', 'Do not stop suddenly after long-term use'],
  'gout-specific': ['Uric acid level (goal usually below 6 mg/dL)', 'Kidney function and liver tests', 'Expect possible flares when starting; ask about flare prevention'],
  other: ['Ask your pharmacist or doctor which labs, if any, are needed for this medicine'],
};

const overrides = {
  methotrexate: ['CBC, liver tests, and creatinine every 2 to 3 months', 'Take folic acid as prescribed', 'Limit alcohol; avoid pregnancy during and for a period after treatment', 'Report new cough or shortness of breath, mouth sores, or fever'],
  hydroxychloroquine: ['Baseline eye exam, then yearly screening after 5 years (sooner if kidney disease or higher dose)', 'Report any change in vision', 'Check your dose against your body weight with your doctor'],
  leflunomide: ['Liver tests and CBC regularly', 'Blood pressure', 'Avoid pregnancy; a washout procedure may be needed after stopping'],
  sulfasalazine: ['CBC and liver tests regularly, especially in the first 3 months', 'Check for sulfa allergy before starting', 'Drink plenty of fluids'],
  rituximab: [TB_HBV, 'Immunoglobulin levels (IgG) before repeat courses', 'CBC periodically', 'Watch for infusion reactions; report any new neurological symptoms right away'],
  tocilizumab: [TB_HBV, 'Liver tests, CBC (neutrophils and platelets), and cholesterol periodically', 'Report fever, severe abdominal pain, or any infection'],
  azathioprine: ['TPMT or NUDT15 testing before starting, where available', 'CBC and liver tests regularly', 'Do not combine with allopurinol or febuxostat without your doctor\'s guidance'],
  mycophenolate: ['CBC regularly', 'Pregnancy prevention counseling is required', 'Regular skin checks'],
  cyclophosphamide: ['CBC before each dose', 'Urinalysis for blood in the urine', 'Drink plenty of fluids; discuss fertility protection before starting'],
  tacrolimus: ['Drug level in the blood', 'Kidney function, potassium, magnesium, and blood sugar', 'Blood pressure'],
  voclosporin: ['Kidney function (eGFR) and blood pressure', 'Potassium', 'Avoid grapefruit and check all new medicines for interactions'],
  allopurinol: ['Uric acid level', 'Kidney and liver tests', 'HLA-B*5801 testing for people of Asian or African descent before starting where recommended', 'Report any rash immediately'],
  febuxostat: ['Uric acid level and liver tests', 'Report chest pain, shortness of breath, or fast heartbeat immediately (cardiovascular warning)'],
  colchicine: ['Kidney function and CBC periodically', 'Report muscle weakness, diarrhea that persists, or numbness', 'Many drug and grapefruit interactions; check before adding new medicines'],
  pegloticase: ['Uric acid level before each infusion — stop if it rises above 6 mg/dL', 'G6PD testing before starting', 'Pretreatment with an antihistamine and steroid', 'Observe after each infusion'],
  apremilast: ['Weight periodically', 'Mood changes, including depression, should be reported'],
  duloxetine: ['Blood pressure', 'Liver tests if risk factors', 'Do not stop suddenly; report mood changes or suicidal thoughts right away'],
  pilocarpine: ['Heart rate, and report new wheezing or vision changes'],
  cevimeline: ['Heart rate, and report new wheezing or vision changes'],
  'immune-globulin-iv': ['Kidney function and hydration before infusion', 'Blood pressure and signs of clotting (leg swelling, chest pain)', 'Infusion rate is slower for older patients and those at risk of clots or kidney problems', 'IgG trough levels if used for immune deficiency'],
  brepocitinib: ['Hepatitis B and tuberculosis screening before starting', 'CBC, liver tests, and cholesterol at baseline and periodically', 'Shingles vaccine before starting is recommended', 'Report leg swelling, chest pain, or sudden shortness of breath immediately'],
  obinutuzumab: [TB_HBV, 'CBC periodically', 'Premedication before infusions; report any neurological changes right away'],
  inebilizumab: [TB_HBV, 'Immunoglobulin levels before and during treatment', 'Report any neurological changes right away'],
  anakinra: ['CBC (neutrophils) at baseline, monthly for 3 months, then every 3 months', 'Report fever or any sign of infection promptly'],
  canakinumab: ['CBC (neutrophils) periodically', TB_HBV, 'Report fever or any sign of infection promptly'],
};

export function getMonitoring(med) {
  return overrides[med.id] || classDefaults[med.drugClass] || classDefaults.other;
}

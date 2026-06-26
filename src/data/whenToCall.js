export const urgencyLevels = [
  {
    id: 'emergency',
    level: 'Emergency',
    color: '#ff4757',
    bgColor: 'rgba(255, 71, 87, 0.15)',
    icon: '🚨',
    instruction: 'Go to the Emergency Room or call 911 immediately',
    situations: [
      {
        symptom: 'Difficulty breathing or chest pain',
        details: 'Could indicate a serious drug reaction, pulmonary embolism, or cardiac event. Biologic and JAK inhibitor users are at increased risk.',
      },
      {
        symptom: 'Severe allergic reaction',
        details: 'Swelling of face/throat, difficulty breathing, hives covering body, or anaphylaxis. Can occur with any medication, especially biologics and infusions.',
      },
      {
        symptom: 'Signs of stroke',
        details: 'Sudden numbness/weakness (one side), confusion, trouble speaking, vision loss, severe headache, difficulty walking. Higher risk with JAK inhibitors and vasculitis.',
      },
      {
        symptom: 'Severe bleeding',
        details: 'Vomiting blood, black/tarry stools, blood in urine. Can occur with NSAIDs, corticosteroids, or anticoagulants.',
      },
      {
        symptom: 'Seizures or loss of consciousness',
        details: 'May indicate CNS lupus, severe infection, or medication toxicity.',
      },
      {
        symptom: 'Severe abdominal pain with rigidity',
        details: 'Could indicate GI perforation, a known risk with NSAIDs, corticosteroids, tocilizumab, and JAK inhibitors.',
      },
    ],
  },
  {
    id: 'urgent',
    level: 'Urgent — Call Today',
    color: '#ffa502',
    bgColor: 'rgba(255, 165, 2, 0.15)',
    icon: '⚠️',
    instruction: 'Call your rheumatologist\'s office today; use the urgent/on-call line if after hours',
    situations: [
      {
        symptom: 'Fever > 100.4°F (38°C) while on immunosuppressants',
        details: 'Any fever on methotrexate, biologics, JAK inhibitors, or high-dose steroids could indicate serious infection. Do NOT wait.',
      },
      {
        symptom: 'New severe swelling of one joint (hot, red)',
        details: 'Could be an infection in the joint (septic arthritis), which is a medical emergency requiring urgent evaluation. More common in immunosuppressed patients.',
      },
      {
        symptom: 'Sudden vision changes on hydroxychloroquine',
        details: 'Blurred vision, difficulty reading, seeing flashing lights, or loss of color vision. Retinal toxicity requires immediate evaluation and potential drug discontinuation.',
      },
      {
        symptom: 'New rash with fever',
        details: 'Could indicate drug hypersensitivity, Stevens-Johnson syndrome, or DRESS syndrome. Especially concerning with allopurinol, sulfasalazine, or leflunomide.',
      },
      {
        symptom: 'Leg swelling, redness, or calf pain',
        details: 'Could indicate deep vein thrombosis (DVT). Higher risk with JAK inhibitors and active inflammatory disease.',
      },
      {
        symptom: 'Persistent vomiting or inability to keep medications down',
        details: 'Risk of disease flare from missing doses, and potential medication toxicity or GI issues.',
      },
      {
        symptom: 'New numbness, weakness, or tingling',
        details: 'Could indicate vasculitis, medication side effect (neuropathy), or spinal cord compression.',
      },
      {
        symptom: 'Exposure to chickenpox, shingles, or tuberculosis',
        details: 'If on immunosuppressants, exposure to these infections requires urgent prophylaxis or monitoring.',
      },
    ],
  },
  {
    id: 'soon',
    level: 'Call Within 1-2 Days',
    color: '#ffd93d',
    bgColor: 'rgba(255, 217, 61, 0.15)',
    icon: '📞',
    instruction: 'Call during regular office hours within the next 1-2 business days',
    situations: [
      {
        symptom: 'Disease flare (worsening joint pain, swelling, stiffness)',
        details: 'Increasing symptoms despite current treatment may need a medication adjustment or short course of steroids.',
      },
      {
        symptom: 'New side effects from medications',
        details: 'Persistent nausea, mouth sores, hair loss, rash, or other new symptoms that started after beginning a medication.',
      },
      {
        symptom: 'Abnormal lab results',
        details: 'If you have access to your lab results and notice abnormal values (liver, kidney, blood counts), contact your office for guidance.',
      },
      {
        symptom: 'Persistent low-grade fever (< 100.4°F)',
        details: 'Low-grade fevers lasting several days may indicate infection or disease activity.',
      },
      {
        symptom: 'New symptoms not clearly related to your disease',
        details: 'Weight changes, mood changes, persistent fatigue, or other symptoms that concern you.',
      },
      {
        symptom: 'Need to temporarily stop medication (surgery, illness, pregnancy)',
        details: 'Many rheumatology medications need specific wash-out periods before surgery or pregnancy. Plan ahead.',
      },
    ],
  },
  {
    id: 'routine',
    level: 'Routine — Next Appointment',
    color: '#2ed573',
    bgColor: 'rgba(46, 213, 115, 0.15)',
    icon: '📅',
    instruction: 'Bring up at your next regularly scheduled appointment',
    situations: [
      {
        symptom: 'Gradual changes in symptoms',
        details: 'Slowly worsening or new mild symptoms that are not interfering significantly with daily life.',
      },
      {
        symptom: 'Diet and lifestyle questions',
        details: 'Questions about exercise, diet modifications, supplements, or complementary therapies.',
      },
      {
        symptom: 'Medication cost or access issues',
        details: 'Difficulty affording medications, prior authorization issues, or interest in switching to a generic/biosimilar.',
      },
      {
        symptom: 'Interest in new treatment options',
        details: 'Questions about new medications, clinical trials, or changing therapy.',
      },
      {
        symptom: 'Preventive care questions',
        details: 'Vaccines, cancer screening, bone density testing, and other preventive health measures.',
      },
      {
        symptom: 'Family planning and pregnancy considerations',
        details: 'Discussing medication safety during pregnancy, breastfeeding, or fertility concerns.',
      },
    ],
  },
];

export function searchUrgencyBySymptom(query) {
  const q = query.toLowerCase();
  const results = [];
  for (const level of urgencyLevels) {
    for (const situation of level.situations) {
      if (
        situation.symptom.toLowerCase().includes(q) ||
        situation.details.toLowerCase().includes(q)
      ) {
        results.push({ ...situation, urgencyLevel: level.level, color: level.color, icon: level.icon });
      }
    }
  }
  return results;
}

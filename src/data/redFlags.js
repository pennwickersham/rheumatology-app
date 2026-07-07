/* =====================================================================
   RheumCompanion — Red-flag definitions
   Rheumatology-specific warning signs that warrant interrupting the UI
   with urgent guidance. Two tiers:
     emergency -> call 911 / go to the ER now
     urgent    -> call the rheumatology team the same day
   Patterns are intentionally conservative (specific phrases) to avoid
   alarm fatigue. All matching happens on-device; nothing is logged.
   Content reviewed by Pendleton B. Wickersham, MD, Rheumatologist.
   ===================================================================== */

export const RED_FLAGS = [
  /* -------- EMERGENCY tier -------- */
  {
    id: 'chest',
    tier: 'emergency',
    label: 'Chest pain or trouble breathing',
    patterns: [
      /chest (pain|pressure|tight)/i,
      /(trouble|difficulty|hard time) breathing/i,
      /short(ness)? of breath/i,
      /can'?t (breathe|catch my breath)/i,
    ],
    advice: 'Chest pain or new trouble breathing can be a medical emergency. Call 911 or go to the nearest emergency department now.',
  },
  {
    id: 'gca',
    tier: 'emergency',
    label: 'Possible giant cell arteritis (vision at risk)',
    patterns: [
      /(sudden|new).{0,20}(vision loss|lost vision|can'?t see|blind)/i,
      /(double vision|vision (change|blur)).{0,40}(headache|temple|scalp|jaw)/i,
      /(headache|temple pain).{0,40}(jaw (pain|claudication|tired)|scalp tender)/i,
      /jaw (claudication|pain when chewing|hurts .{0,10}chew)/i,
    ],
    advice: 'New vision changes with headache, scalp tenderness, or jaw pain when chewing can signal giant cell arteritis, which can threaten eyesight within hours. This is an emergency — call 911 or go to the ER now.',
  },
  {
    id: 'cordEquina',
    tier: 'emergency',
    label: 'Possible spinal cord / cauda equina problem',
    patterns: [
      /saddle (numbness|anesthesia)/i,
      /(numb|tingling).{0,30}(groin|inner thigh|genital)/i,
      /(lost|losing|can'?t) control.{0,20}(bladder|bowel|urine|stool)/i,
      /(sudden|new).{0,20}(leg weakness|foot drop|can'?t (walk|lift my foot))/i,
    ],
    advice: 'New leg weakness, numbness in the saddle area, or loss of bladder or bowel control can signal spinal cord compression. This is an emergency — call 911 or go to the ER now.',
  },
  {
    id: 'anaphylaxis',
    tier: 'emergency',
    label: 'Possible severe allergic reaction',
    patterns: [
      /(face|lips?|tongue|throat).{0,25}(swelling|swollen|swell)/i,
      /throat (closing|tight)/i,
      /(hives|rash).{0,40}(trouble breathing|dizzy|faint)/i,
    ],
    advice: 'Swelling of the face, lips, or throat, or a rash with trouble breathing, can be a severe allergic reaction. Use an epinephrine auto-injector if you have one, and call 911 now.',
  },
  {
    id: 'sjs',
    tier: 'emergency',
    label: 'Possible severe drug rash',
    patterns: [
      /(rash|skin).{0,40}(blister|peeling|sloughing)/i,
      /(mouth|lip|eye) (sores?|ulcers?).{0,40}rash/i,
      /rash.{0,40}(mouth|lip|eye) (sores?|ulcers?)/i,
    ],
    advice: 'A spreading rash with blistering, peeling, or sores in the mouth or eyes can be a severe medication reaction. Go to the emergency department now, and bring your medication list.',
  },
  {
    id: 'giBleed',
    tier: 'emergency',
    label: 'Possible internal bleeding',
    patterns: [
      /(black|tarry) stools?/i,
      /(vomit|throwing up).{0,15}blood/i,
      /blood.{0,15}(vomit|stool)/i,
      /coffee.?ground (vomit|emesis)/i,
    ],
    advice: 'Black or tarry stools, or vomiting blood, can signal internal bleeding (a known risk with NSAIDs and steroids). Go to the emergency department now.',
  },

  /* -------- URGENT tier (call the care team today) -------- */
  {
    id: 'feverImmuno',
    tier: 'urgent',
    label: 'Fever while on immune-suppressing medication',
    patterns: [
      /fever/i,
      /temp(erature)? (of |is )?(10[1-9]|38|39|40)/i,
      /(chills|shaking chills|rigors)/i,
    ],
    advice: 'Fever or shaking chills while taking a biologic, JAK inhibitor, methotrexate, or other immune-suppressing medicine needs prompt attention — infections can move faster when the immune system is dialed down. Call your rheumatology team today; if you feel very unwell, seek emergency care.',
  },
  {
    id: 'septicJoint',
    tier: 'urgent',
    label: 'One hot, swollen joint',
    patterns: [
      /(one|single|my) (knee|hip|shoulder|ankle|wrist|elbow|joint).{0,40}(hot|red|warm).{0,20}(swollen|swelling)/i,
      /(hot|red|warm).{0,20}swollen (knee|hip|shoulder|ankle|wrist|elbow|joint)/i,
    ],
    advice: 'A single joint that is suddenly hot, red, and very swollen — especially with fever — could be a joint infection, which needs same-day evaluation. Call your rheumatology team now; if you also have fever or feel very unwell, go to the ER.',
  },
  {
    id: 'pregnancyTeratogen',
    tier: 'urgent',
    label: 'Pregnancy while on methotrexate or leflunomide',
    patterns: [
      /pregnan.{0,60}(methotrexate|mtx|leflunomide|arava)/i,
      /(methotrexate|mtx|leflunomide|arava).{0,60}pregnan/i,
    ],
    advice: 'Methotrexate and leflunomide can seriously harm a pregnancy. Do not take your next dose, and call your rheumatology team today to discuss next steps.',
  },
  {
    id: 'infectionImmuno',
    tier: 'urgent',
    label: 'Possible infection while immune-suppressed',
    patterns: [
      /(cough(ing)? up|productive cough).{0,20}(green|yellow|blood)/i,
      /(burning|pain(ful)?).{0,15}(urinat|pee)/i,
      /(skin|wound|cut).{0,30}(spreading redness|red streaks|pus)/i,
    ],
    advice: 'Signs of infection — productive cough, painful urination, or a wound with spreading redness — deserve a same-day call to your care team when you take immune-suppressing medication.',
  },
];

export const TIER_INFO = {
  emergency: {
    title: 'This may be an emergency',
    icon: '🚨',
    color: '#ff5c5c',
    action: 'Call 911',
  },
  urgent: {
    title: 'This needs prompt attention',
    icon: '⚠️',
    color: '#ffb35c',
    action: 'Call your care team today',
  },
};

export const clinicVisitSections = [
  {
    id: 'before-visit',
    title: 'Before Your Visit',
    icon: '📋',
    color: '#4ecdc4',
    items: [
      {
        title: 'Track Your Symptoms',
        description: 'Keep a daily symptom diary for at least 1-2 weeks before your appointment. Note which joints hurt, severity (1-10), morning stiffness duration, and what makes it better or worse.',
        checklist: [
          'Record daily pain levels (scale 1-10)',
          'Note morning stiffness duration',
          'Track which joints are affected',
          'Note any new symptoms',
          'Record flare triggers (stress, weather, food, activity)',
        ],
      },
      {
        title: 'Prepare Your Medication List',
        description: 'Bring a complete, up-to-date list of all medications, supplements, and over-the-counter drugs you take.',
        checklist: [
          'List all prescription medications with doses',
          'Include over-the-counter medications',
          'List supplements and vitamins',
          'Note any medication changes since last visit',
          'Record any side effects experienced',
          'Bring medication bottles if possible',
        ],
      },
      {
        title: 'Gather Your Records',
        description: 'Bring any relevant medical records, lab results, or imaging studies, especially if done outside your rheumatologist\'s office.',
        checklist: [
          'Recent lab results',
          'Imaging reports (X-rays, MRI, ultrasound)',
          'Records from other specialists',
          'Insurance information / referrals',
          'Previous visit summaries',
        ],
      },
      {
        title: 'Write Down Your Questions',
        description: 'Prioritize your top 3-5 questions. Time with your doctor is limited, so having them written down ensures you don\'t forget.',
        checklist: [
          'List your top 3-5 questions',
          'Prioritize by importance',
          'Include questions about treatment goals',
          'Ask about any new symptoms',
          'Inquire about upcoming lab monitoring',
        ],
      },
    ],
  },
  {
    id: 'during-visit',
    title: 'During Your Visit',
    icon: '🏥',
    color: '#45b7d1',
    items: [
      {
        title: 'Be Honest and Specific',
        description: 'Your rheumatologist needs accurate information to make the best decisions. Don\'t downplay symptoms or overstate how well you\'re doing.',
        tips: [
          'Describe pain using specific terms (sharp, dull, burning, aching)',
          'Be specific about locations — point to exactly where it hurts',
          'Report medication adherence honestly',
          'Mention any over-the-counter remedies you\'ve tried',
          'Discuss impact on daily activities and work',
        ],
      },
      {
        title: 'Ask About Your Treatment Plan',
        description: 'Understanding your treatment plan helps you be an active partner in your care.',
        tips: [
          'Ask about treatment goals (remission vs. low disease activity)',
          'Understand the timeline for medication effects',
          'Ask about required monitoring (labs, eye exams)',
          'Discuss when to expect improvement',
          'Ask about available alternatives if current treatment isn\'t working',
        ],
      },
      {
        title: 'Take Notes',
        description: 'Bring a notebook or ask permission to record the conversation. Having someone with you can also help remember information.',
        tips: [
          'Write down key instructions',
          'Record medication changes',
          'Note when to follow up',
          'Ask for printed patient education materials',
          'Request a visit summary in your patient portal',
        ],
      },
    ],
  },
  {
    id: 'after-visit',
    title: 'After Your Visit',
    icon: '✅',
    color: '#96ceb4',
    items: [
      {
        title: 'Follow Through',
        description: 'Take action on your doctor\'s recommendations promptly.',
        checklist: [
          'Fill any new prescriptions',
          'Schedule recommended lab tests',
          'Make follow-up appointments',
          'Schedule specialist referrals',
          'Set up medication reminders',
        ],
      },
      {
        title: 'Review and Understand',
        description: 'Make sure you understand everything that was discussed.',
        checklist: [
          'Review visit summary / after-visit notes',
          'Look up any unfamiliar terms',
          'Call the office if you have questions',
          'Share updates with your primary care doctor',
          'Update your personal health record',
        ],
      },
    ],
  },
];

export const sampleQuestions = [
  'What is my current disease activity level?',
  'Are there any new treatment options available?',
  'What side effects should I watch for?',
  'Should I get any vaccines before starting treatment?',
  'How will this medication interact with my other drugs?',
  'When should I expect to see improvement?',
  'What lab monitoring do I need?',
  'Are there lifestyle changes that could help?',
  'What should I do if I miss a dose?',
  'Is my disease activity well-controlled?',
  'Should I see an eye doctor for this medication?',
  'Can I exercise? What types are safe?',
];

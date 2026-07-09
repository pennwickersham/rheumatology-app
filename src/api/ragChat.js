/* =====================================================================
   RheumCompanion — Retrieval-grounded chat (RheumBot)

   Every answer is grounded in a vetted source library, and every answer
   carries citations. The pipeline:

     1. RETRIEVE — match the question against the app's content library:
          - medications  -> live FDA prescribing information (openFDA)
          - diseases     -> physician-reviewed disease records (whose own
                            references are NIAMS / MedlinePlus / ACR) plus
                            recent PubMed literature
          - drug classes -> physician-reviewed class descriptions
     2. GROUND   — the model receives ONLY the numbered source excerpts
                   and must answer from them, citing [1], [2], ...
     3. ATTRIBUTE — the Sources list shown under each answer is built by
                   THIS code from what was actually retrieved. The model
                   cannot invent a citation the user will see.

   If nothing in the library matches the question, no model call is made:
   the bot explains its scope and suggests asking a rheumatologist.
   ===================================================================== */

import { callProxy } from './gemini';
import { medications, drugClasses } from '../data/medications';
import { diseases } from '../data/diseases';
import { getDrugDetails } from './fda';
import { searchArticles, fetchAbstracts } from './pubmed';

/* ---------------- 1. Entity matching ---------------- */

// Extra ways patients refer to conditions (beyond name/shortName)
const DISEASE_SYNONYMS = {
  'rheumatoid-arthritis': ['rheumatoid'],
  'systemic-lupus': ['lupus', 'sle'],
  'psoriatic-arthritis': ['psoriatic', 'psoriasis arthritis'],
  'ankylosing-spondylitis': ['ankylosing', 'spondylitis', 'spondyloarthritis', 'axial spa'],
  'gout': ['gout', 'gouty', 'uric acid'],
  'sjogrens-syndrome': ['sjogren', 'sjögren', 'sicca'],
  'vasculitis': ['vasculitis'],
  'osteoarthritis': ['osteoarthritis', 'degenerative joint'],
  'polymyalgia-rheumatica': ['polymyalgia'],
  'cppd-pseudogout': ['pseudogout', 'cppd', 'pyrophosphate', 'chondrocalcinosis'],
  'degenerative-disc-disease': ['disc disease', 'degenerative disc', 'disc degeneration'],
  'gpa': ['granulomatosis', 'wegener', 'polyangiitis'],
  'fibromyalgia': ['fibromyalgia', 'fibro fog'],
};

const CLASS_SYNONYMS = {
  'nsaids': ['nsaid', 'anti-inflammator'],
  'dmards': ['dmard', 'disease-modifying', 'disease modifying'],
  'immunosuppressants': ['immunosuppress'],
  'biologics': ['biologic', 'tnf', 'anti-tnf'],
  'jak-inhibitors': ['jak inhibitor', 'jak-inhibitor', 'janus kinase'],
  'corticosteroids': ['corticosteroid', 'steroid', 'glucocorticoid'],
  'gout-specific': ['urate lowering', 'urate-lowering'],
  'other': [],
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasWord = (text, term) =>
  new RegExp(`(^|[^a-z0-9])${escapeRe(term.toLowerCase())}`, 'i').test(text);
// Short acronyms (RA, OA, AS, SS, FM, SLE, PMR...) only match if the user
// typed them in ALL CAPS as a standalone token — avoids "as", "ra", etc.
const hasAcronym = (originalText, acronym) =>
  new RegExp(`(^|[^A-Za-z0-9])${escapeRe(acronym)}([^A-Za-z0-9]|$)`).test(originalText);

export function matchLibraryEntities(text) {
  const lower = (text || '').toLowerCase();
  const meds = medications.filter(m =>
    hasWord(lower, m.genericName) || m.brandNames.some(b => hasWord(lower, b))
  );
  const dxs = diseases.filter(d => {
    if (hasWord(lower, d.name)) return true;
    const syns = DISEASE_SYNONYMS[d.id] || [];
    if (syns.some(s => hasWord(lower, s))) return true;
    if (d.shortName && d.shortName.length <= 4 && hasAcronym(text, d.shortName)) return true;
    return false;
  });
  const classes = drugClasses.filter(c => {
    if (c.id !== 'other' && hasWord(lower, c.name)) return true;
    return (CLASS_SYNONYMS[c.id] || []).some(s => hasWord(lower, s));
  });
  return { meds, diseases: dxs, classes };
}

/* ---------------- 2. Source-chunk builders ---------------- */

const trunc = (s, n) => (s && s.length > n ? s.slice(0, n) + ' …' : s || '');

function dailyMedUrl(fda, genericName) {
  return fda && fda.setId
    ? `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${fda.setId}`
    : `https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=${encodeURIComponent(genericName)}`;
}

async function buildMedChunk(med) {
  let fda = null;
  try { fda = await getDrugDetails(med.fdaSearchTerm); } catch { /* offline tolerated */ }

  const parts = [];
  if (fda) {
    if (fda.boxedWarning) parts.push('BOXED WARNING: ' + trunc(fda.boxedWarning, 1200));
    if (fda.indicationsAndUsage) parts.push('INDICATIONS: ' + trunc(fda.indicationsAndUsage, 800));
    if (fda.adverseReactions) parts.push('ADVERSE REACTIONS: ' + trunc(fda.adverseReactions, 1500));
    if (fda.drugInteractions) parts.push('DRUG INTERACTIONS: ' + trunc(fda.drugInteractions, 1200));
    if (fda.warnings) parts.push('WARNINGS AND PRECAUTIONS: ' + trunc(fda.warnings, 1200));
    if (fda.patientInfo) parts.push('PATIENT INFORMATION: ' + trunc(fda.patientInfo, 1000));
  }
  // Physician-reviewed summary always available (also covers offline)
  parts.push(
    `PHYSICIAN-REVIEWED SUMMARY — ${med.genericName} (${med.brandNames.join(', ')}): ` +
    `Common side effects: ${med.commonSideEffects.join('; ')}. ` +
    `Serious side effects: ${med.seriousSideEffects.join('; ')}.`
  );

  return {
    content: parts.join('\n'),
    source: fda
      ? {
          type: 'fda',
          title: `FDA Prescribing Information — ${med.genericName}`,
          publisher: fda.manufacturer && fda.manufacturer !== 'Unknown'
            ? `${fda.manufacturer} · via openFDA Drug Label API (U.S. FDA)`
            : 'via openFDA Drug Label API (U.S. FDA)',
          url: dailyMedUrl(fda, med.genericName),
        }
      : {
          type: 'library',
          title: `${med.genericName} — RheumCompanion medication library`,
          publisher: 'Physician-reviewed summary derived from FDA prescribing information (live FDA label unavailable)',
          url: dailyMedUrl(null, med.genericName),
        },
  };
}

function buildDiseaseChunk(d) {
  const refs = (d.sources || [])
    .map(s => `${s.title} (${s.publisher})`)
    .join('; ');
  const content =
    `${d.name} (${d.shortName}, ICD-10 ${d.icd10}): ${d.description}\n` +
    `Common symptoms: ${d.symptoms.join('; ')}.` +
    (d.commonJoints ? `\nCommonly affected joints: ${d.commonJoints.join('; ')}.` : '') +
    `\nMedications used for this condition (per app library): ${d.relatedMedications.join(', ')}.`;
  return {
    content,
    source: {
      type: 'disease',
      title: `${d.name} — RheumCompanion disease library`,
      publisher: `Physician-reviewed; compiled from: ${refs || 'NIAMS, MedlinePlus, and ACR patient references'}`,
      url: d.sources && d.sources[0] ? d.sources[0].url : 'https://medlineplus.gov',
    },
  };
}

async function buildPubMedChunks(d, perDisease = 2) {
  try {
    const pmids = await searchArticles(d.pubmedTerms || `${d.name} patient education`, perDisease);
    if (!pmids.length) return [];
    const abstracts = await fetchAbstracts(pmids);
    return abstracts
      .filter(a => a.abstract)
      .map(a => ({
        content: `PubMed article: "${a.title}" (${a.journal}, ${a.year}).\nAbstract: ${trunc(a.abstract, 1800)}`,
        source: {
          type: 'pubmed',
          title: a.title,
          publisher: `${a.journal || 'PubMed'}${a.year ? ', ' + a.year : ''} · PMID ${a.pmid}`,
          url: a.url,
        },
      }));
  } catch {
    return [];
  }
}

function buildClassChunk(c) {
  const members = medications.filter(m => m.drugClass === c.id).map(m => m.genericName);
  return {
    content: `Drug class — ${c.name}: ${c.description}. Medications in this class covered by this app: ${members.join(', ')}.`,
    source: {
      type: 'library',
      title: `${c.name} — RheumCompanion medication library`,
      publisher: 'Physician-reviewed; derived from FDA prescribing information',
      url: 'https://open.fda.gov/apis/drug/label/',
    },
  };
}

/* ---------------- 3. Grounded chat ---------------- */

const GROUNDED_SYSTEM_PROMPT = `You are RheumBot, a medical information assistant for rheumatology patients inside the RheumCompanion app.

STRICT GROUNDING RULES:
1. You may ONLY use the numbered SOURCES provided in the user's message. Do not use any other knowledge, even if you believe it is correct.
2. Cite sources inline using bracketed numbers, e.g. [1] or [1][3], immediately after each claim they support. Every medical claim MUST carry at least one citation.
3. If the sources do not contain the information needed, say so plainly and recommend the patient ask their rheumatologist or pharmacist. Do NOT fill gaps from memory.
4. Never invent, renumber, or reference a source number that was not provided.
5. You are NOT a doctor. You never diagnose, never recommend starting/stopping/changing a medication or dose, and never grade the severity of drug interactions.
6. For emergencies (chest pain, trouble breathing, sudden vision loss, signs of severe infection), tell the patient to call 911 or go to the nearest emergency room.
7. Use plain, calm language. Explain medical terms briefly when you use them.
8. When discussing side effects, clearly separate COMMON from SERIOUS/RARE, as the sources do.
9. End every answer with a one-line reminder to discuss personal medical decisions with their rheumatologist.
10. Keep answers focused and concise. Use short headers or bullet points only when they help.`;

const SCOPE_MESSAGE =
  "I can only answer questions grounded in RheumCompanion's vetted source library — the rheumatologic conditions and medications covered in this app (backed by FDA prescribing information, NIH/MedlinePlus and ACR patient references, and PubMed literature).\n\n" +
  "I couldn't match your question to that library, so rather than guess, I'll pass. Try naming a specific condition (like rheumatoid arthritis, lupus, or gout) or a medication (like methotrexate or Humira) — or ask your rheumatologist, who can address anything beyond this app's scope.";

/**
 * Send a retrieval-grounded chat message.
 * @param {Array<{role,content}>} chatHistory - prior messages
 * @param {string} userMessage - new user message
 * @param {Function} onDelta - streaming callback (receives full text so far)
 * @param {AbortSignal} signal
 * @param {Function} onStatus - optional callback for retrieval progress text
 * @returns {Promise<{text: string, sources: Array, declined?: boolean}>}
 */
export async function sendGroundedChatMessage(chatHistory, userMessage, onDelta, signal, onStatus) {
  // Match against the current message; for follow-ups ("what about its
  // side effects?"), fall back to entities from recent conversation.
  let match = matchLibraryEntities(userMessage);
  if (!match.meds.length && !match.diseases.length && !match.classes.length) {
    const recent = (chatHistory || []).slice(-6).map(m => m.content).join('\n');
    match = matchLibraryEntities(recent);
  }

  if (!match.meds.length && !match.diseases.length && !match.classes.length) {
    return { text: SCOPE_MESSAGE, sources: [], declined: true };
  }

  if (onStatus) onStatus('Gathering sources…');

  // Cap retrieval so prompts stay fast and focused
  const meds = match.meds.slice(0, 3);
  const dxs = match.diseases.slice(0, 2);
  const classes = match.classes.slice(0, 2);

  const chunks = [];
  const medChunks = await Promise.all(meds.map(buildMedChunk));
  chunks.push(...medChunks);
  for (const d of dxs) {
    chunks.push(buildDiseaseChunk(d));
  }
  const pubmedChunks = await Promise.all(dxs.map(d => buildPubMedChunks(d)));
  pubmedChunks.forEach(list => chunks.push(...list));
  classes.forEach(c => chunks.push(buildClassChunk(c)));

  const sources = chunks.map(c => c.source);
  const sourcesBlock = chunks
    .map((c, i) => `[${i + 1}] ${c.source.title}\n${c.content}`)
    .join('\n\n---\n\n');

  // Conversation history (text only), then the grounded question
  const contents = [];
  for (const msg of (chatHistory || [])) {
    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    });
  }
  contents.push({
    role: 'user',
    parts: [{
      text:
        `SOURCES (the ONLY material you may use):\n\n${sourcesBlock}\n\n` +
        `QUESTION: ${userMessage}\n\n` +
        `Answer using only the sources above, citing them inline as [1], [2], etc.`,
    }],
  });

  if (onStatus) onStatus('');

  const body = {
    systemInstruction: { parts: [{ text: GROUNDED_SYSTEM_PROMPT }] },
    contents,
    generationConfig: { temperature: 0.2 },
  };

  const text = await callProxy(body, onDelta, signal);
  return { text, sources };
}

/* =====================================================================
   RheumCompanion — Grounded medication interaction review
   RESTRUCTURED per medical-safety review:

     FACTS  -> structured sources only
               - RxNorm (NLM) normalizes what the patient typed
                 (brand -> ingredient, misspellings)
               - OpenFDA drug labels supply the actual Drug Interactions
                 and Boxed Warning text (public domain, FDA)
     WORDS  -> the LLM may only REPHRASE the label excerpts in plain
               language. It never decides whether an interaction exists
               and never grades severity. No SEVERE/MODERATE/MILD.

   The feature is framed as preparation for a pharmacist conversation,
   not as a verdict. "No mentions found" explicitly does NOT mean "no
   interaction exists."

   Both APIs are free, keyless, and CORS-enabled.
   ===================================================================== */

const RXNAV = 'https://rxnav.nlm.nih.gov/REST';
const OPENFDA = 'https://api.fda.gov/drug/label.json';

/* ---------- optional plain-language explainer ----------
   Wire your existing Gemini client (already proxied through your
   Cloudflare Worker) in one line at app startup:
     import { setExplainProvider } from '../api/interactions';
     import { askGemini } from './gemini';            // your client
     setExplainProvider((prompt) => askGemini(prompt));
   If no provider is set, the "Explain in plain language" button
   simply doesn't render. */
let explainProvider = null;
export function setExplainProvider(fn) { explainProvider = fn; }
export function hasExplainProvider() { return typeof explainProvider === 'function'; }

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status + ' from ' + new URL(url).host);
  return res.json();
}

/* ---------- 1. Normalize what the patient typed via RxNorm ---------- */
export async function normalizeDrug(input) {
  const name = input.trim();
  const out = { input: name, rxcui: null, name: name, ingredients: [], synonyms: new Set([name.toLowerCase()]) };
  try {
    const approx = await getJSON(
      RXNAV + '/approximateTerm.json?maxEntries=1&term=' + encodeURIComponent(name));
    const cand = approx?.approximateGroup?.candidate?.[0];
    if (!cand) return out;
    out.rxcui = cand.rxcui;

    const prop = await getJSON(
      RXNAV + '/rxcui/' + out.rxcui + '/property.json?propName=RxNorm%20Name');
    const rxName = prop?.propConceptGroup?.propConcept?.[0]?.propValue;
    if (rxName) { out.name = rxName; out.synonyms.add(rxName.toLowerCase()); }

    /* ingredients (turns Humira -> adalimumab, Celebrex -> celecoxib) */
    const rel = await getJSON(RXNAV + '/rxcui/' + out.rxcui + '/related.json?tty=IN');
    const ins = rel?.relatedGroup?.conceptGroup?.flatMap(g => g.conceptProperties || []) || [];
    for (const c of ins.slice(0, 6)) {
      out.ingredients.push(c.name);
      out.synonyms.add(c.name.toLowerCase());
    }
    if (!out.ingredients.length) out.ingredients = [out.name];
  } catch {
    /* offline or RxNav hiccup: fall back to the raw input */
    out.ingredients = [name];
  }
  return out;
}

/* ---------- 2. Fetch FDA label sections for a drug ---------- */
export async function fetchLabelSections(drug) {
  const tryQueries = [];
  for (const ing of drug.ingredients.slice(0, 2)) {
    tryQueries.push('openfda.generic_name:"' + ing + '"');
  }
  tryQueries.push('openfda.brand_name:"' + drug.input + '"');

  for (const q of tryQueries) {
    try {
      const data = await getJSON(OPENFDA + '?limit=1&search=' + encodeURIComponent(q));
      const r = data?.results?.[0];
      if (!r) continue;
      return {
        found: true,
        source: (r.openfda?.brand_name?.[0] || r.openfda?.generic_name?.[0] || drug.name),
        sections: {
          'Drug Interactions': (r.drug_interactions || []).join(' '),
          'Boxed Warning': (r.boxed_warning || []).join(' '),
        },
      };
    } catch { /* try next query */ }
  }
  return { found: false, source: drug.name, sections: {} };
}

/* ---------- 3. Find sentences in A's label that mention B ---------- */
function sentencesMentioning(text, synonyms) {
  if (!text) return [];
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.;])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 15 && s.length < 420);
  const res = [];
  for (const s of sentences) {
    const low = s.toLowerCase();
    if ([...synonyms].some(syn => syn.length > 3 &&
        new RegExp('\\b' + syn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + 's?\\b').test(low))) {
      res.push(s);
      if (res.length >= 4) break;
    }
  }
  return res;
}

/* Drug-class terms that labels often use instead of specific names,
   so "ibuprofen" can match a methotrexate label that says "NSAIDs". */
const CLASS_SYNONYMS = {
  ibuprofen: ['nsaid', 'nonsteroidal anti-inflammatory'],
  naproxen: ['nsaid', 'nonsteroidal anti-inflammatory'],
  celecoxib: ['nsaid', 'nonsteroidal anti-inflammatory', 'cox-2'],
  meloxicam: ['nsaid', 'nonsteroidal anti-inflammatory'],
  diclofenac: ['nsaid', 'nonsteroidal anti-inflammatory'],
  aspirin: ['nsaid', 'salicylate'],
  prednisone: ['corticosteroid', 'glucocorticoid', 'steroid'],
  methylprednisolone: ['corticosteroid', 'glucocorticoid', 'steroid'],
  adalimumab: ['tnf blocker', 'tnf antagonist', 'biologic', 'anti-tnf'],
  etanercept: ['tnf blocker', 'tnf antagonist', 'biologic', 'anti-tnf'],
  infliximab: ['tnf blocker', 'tnf antagonist', 'biologic', 'anti-tnf'],
  tofacitinib: ['jak inhibitor'],
  upadacitinib: ['jak inhibitor'],
  baricitinib: ['jak inhibitor'],
  warfarin: ['anticoagulant', 'blood thinner'],
  apixaban: ['anticoagulant', 'blood thinner'],
  rivaroxaban: ['anticoagulant', 'blood thinner'],
};

function expandedSynonyms(drug) {
  const syns = new Set(drug.synonyms);
  for (const ing of drug.ingredients) {
    for (const extra of (CLASS_SYNONYMS[ing.toLowerCase()] || [])) syns.add(extra);
  }
  return syns;
}

/* ---------- 4. Full review across a medication list ---------- */
export async function reviewInteractions(drugNames, onProgress) {
  const clean = [...new Set(drugNames.map(d => d.trim()).filter(Boolean))];
  if (clean.length < 2) throw new Error('Enter at least two medications.');

  const drugs = [];
  for (const name of clean) {
    if (onProgress) onProgress('Identifying ' + name + '…');
    drugs.push(await normalizeDrug(name));
  }
  const labels = {};
  for (const d of drugs) {
    if (onProgress) onProgress('Reading FDA label for ' + d.name + '…');
    labels[d.input] = await fetchLabelSections(d);
  }

  const pairs = [];
  for (let i = 0; i < drugs.length; i++) {
    for (let j = i + 1; j < drugs.length; j++) {
      const A = drugs[i], B = drugs[j];
      const findings = [];
      for (const [X, Y] of [[A, B], [B, A]]) {
        const label = labels[X.input];
        if (!label.found) continue;
        const ySyns = expandedSynonyms(Y);
        for (const [section, text] of Object.entries(label.sections)) {
          const hits = sentencesMentioning(text, ySyns);
          if (hits.length) {
            findings.push({
              labelOf: label.source, section,
              mentions: Y.name, excerpts: hits,
            });
          }
        }
      }
      pairs.push({
        a: A.name, b: B.name,
        aInput: A.input, bInput: B.input,
        labelFoundA: labels[A.input].found,
        labelFoundB: labels[B.input].found,
        findings,
      });
    }
  }
  return { drugs, pairs };
}

/* ---------- 5. Optional plain-language rephrasing (LLM) ----------
   The model receives ONLY the label excerpts and may only restate them.
   It is instructed not to judge, grade, or advise stopping medication. */
export async function explainFindings(pair) {
  if (!explainProvider) return null;
  const excerptBlock = pair.findings
    .map(f => 'From the FDA label for ' + f.labelOf + ' (' + f.section + '), regarding ' +
      f.mentions + ':\n' + f.excerpts.map(e => '- ' + e).join('\n'))
    .join('\n\n');

  const prompt =
    'You are helping a patient prepare questions for their pharmacist. ' +
    'Below are excerpts from official FDA drug labels about taking ' +
    pair.a + ' and ' + pair.b + ' together.\n\n' +
    'Restate ONLY what these excerpts say, in plain, calm, non-technical ' +
    'language (8th-grade reading level, 3-5 sentences). Rules:\n' +
    '- Do not add information that is not in the excerpts.\n' +
    '- Do not rate severity, do not use words like "severe" or "dangerous" ' +
    'unless the excerpt itself does.\n' +
    '- Never advise starting, stopping, or changing any medication.\n' +
    '- End with exactly: "Please review this with your pharmacist or ' +
    'prescriber - they know your full picture."\n\n' + excerptBlock;

  return explainProvider(prompt);
}

/* ---------- 6. Pharmacist question starters (static, no AI) ---------- */
export function pharmacistQuestions(pair) {
  return [
    'Is it OK for me to take ' + pair.a + ' and ' + pair.b + ' together?',
    'Should the timing or doses change when these are combined?',
    'Is there anything I should watch for while taking both?',
    'Do any of my lab tests need closer monitoring because of this combination?',
  ];
}

/* =====================================================================
   RheumCompanion — Red-flag scanner
   scanForRedFlags(text) -> null | { tier, matches:[{id,label,advice}] }
   Scans free text (chat messages, tracker notes) on-device. Returns the
   highest tier found, with every matched concern. Nothing is stored or
   transmitted.
   ===================================================================== */
import { RED_FLAGS } from '../data/redFlags';

export function scanForRedFlags(text) {
  if (!text || typeof text !== 'string') return null;
  const hits = [];
  for (const flag of RED_FLAGS) {
    if (flag.patterns.some(re => re.test(text))) {
      hits.push({ id: flag.id, tier: flag.tier, label: flag.label, advice: flag.advice });
    }
  }
  if (!hits.length) return null;
  const tier = hits.some(h => h.tier === 'emergency') ? 'emergency' : 'urgent';
  return { tier, matches: hits.filter(h => h.tier === tier) };
}

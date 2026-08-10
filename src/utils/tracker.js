// src/utils/tracker.js
import { saveToStorage, loadFromStorage } from './storage';

export function getTrackerData() {
  return loadFromStorage('symptom_tracker', []);
}

export function saveTrackerEntry(entry) {
  const data = getTrackerData();
  const dateKey = entry.date;
  const existingIndex = data.findIndex(d => d.date === dateKey);
  
  if (existingIndex >= 0) {
    data[existingIndex] = entry;
  } else {
    data.push(entry);
    // Sort by date ascending
    data.sort((a, b) => new Date(a.date) - new Date(b.date));
  }
  
  saveToStorage('symptom_tracker', data);
  return data;
}

export function getCustomSymptoms() {
  return loadFromStorage('custom_symptoms', []);
}

export function saveCustomSymptoms(symptoms) {
  saveToStorage('custom_symptoms', symptoms);
}

export function generateInsights(entries) {
  const insights = [];
  if (!entries || entries.length < 3) return insights;

  // Only care about latest 7 days for current insights
  const recent = entries.slice(-7);
  if (recent.length < 3) return insights;

  // Flare Warning
  const last3 = recent.slice(-3);
  const avgPainLast3 = last3.reduce((sum, e) => sum + (e.pain || 0), 0) / last3.length;
  const avgStiffnessLast3 = last3.reduce((sum, e) => sum + (e.stiffness || 0), 0) / last3.length;

  if (avgPainLast3 >= 7 || avgStiffnessLast3 >= 7) {
    insights.push({
      type: 'warning',
      title: 'Current Flare Warning',
      message: 'Your pain or stiffness has been very high over the last 3 days. Consider contacting your rheumatology team.'
    });
  }

  // Trend Detection - Fatigue
  const f1 = last3[last3.length - 3].fatigue || 0;
  const f2 = last3[last3.length - 2].fatigue || 0;
  const f3 = last3[last3.length - 1].fatigue || 0;
  
  if (f3 > f2 && f2 > f1 && f3 >= 6) {
    insights.push({
      type: 'info',
      title: 'Fatigue Trend detected',
      message: 'Your fatigue levels have been steadily increasing recently. Make sure to rest and pace your activities.'
    });
  }

  // Identify good days!
  if (avgPainLast3 <= 3 && avgStiffnessLast3 <= 3) {
    insights.push({
      type: 'success',
      title: 'Mild Symptoms',
      message: 'Your core symptoms seem well controlled over the last few days. Great job sticking to your plan!'
    });
  }

  return insights;
}

/* ============================================================
   Food Diary — trigger pattern analysis
   Compares average symptom burden (mean of pain, stiffness,
   fatigue, swelling) on days a food was eaten — and the day
   after — against days it wasn't. Foods eaten on 3+ logged days
   with a meaningfully higher burden are flagged as possible
   triggers. This is pattern detection, not proof of causation.
   ============================================================ */

// Common rheumatology flare-trigger foods offered as quick-add chips
export const STARTER_FOODS = [
  'Red meat', 'Dairy', 'Gluten', 'Alcohol', 'Sugar / sweets',
  'Processed food', 'Shellfish', 'Nightshades', 'Coffee', 'Fried food'
];

function foodEntryBurden(e) {
  return ((e.pain || 0) + (e.stiffness || 0) + (e.fatigue || 0) + (e.swelling || 0)) / 4;
}

export function getRecentFoods(entries, limit = 12) {
  const seen = new Set();
  const out = [];
  entries
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach(e => {
      (e.foods || []).forEach(f => {
        const key = f.trim().toLowerCase();
        if (key && !seen.has(key)) {
          seen.add(key);
          out.push(f.trim());
        }
      });
    });
  return out.slice(0, limit);
}

export function analyzeFoodTriggers(entries) {
  const sorted = entries.slice().sort((a, b) => a.date.localeCompare(b.date));
  const withFoods = sorted.filter(e => Array.isArray(e.foods) && e.foods.length > 0);
  const daysLogged = withFoods.length;

  // Need enough data for exposure vs non-exposure comparison
  if (daysLogged < 4 || sorted.length < 6) {
    return { ready: false, daysLogged, results: [] };
  }

  const byDate = new Map(sorted.map(e => [e.date, e]));
  const allDates = sorted.map(e => e.date);

  const prevKey = (iso) => {
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  // canonical (lowercased) name -> { display, dates eaten }
  const foods = new Map();
  withFoods.forEach(e => {
    e.foods.forEach(raw => {
      const key = raw.trim().toLowerCase();
      if (!key) return;
      if (!foods.has(key)) foods.set(key, { display: raw.trim(), dates: new Set() });
      foods.get(key).dates.add(e.date);
    });
  });

  const avg = a => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
  const results = [];

  foods.forEach((info) => {
    if (info.dates.size < 3) return; // too few exposures to say anything

    // Same-day window
    const expSame = [], nonSame = [];
    allDates.forEach(d => {
      (info.dates.has(d) ? expSame : nonSame).push(foodEntryBurden(byDate.get(d)));
    });

    // Next-day window (flares often lag food by a day)
    const expNext = [], nonNext = [];
    allDates.forEach(d => {
      (info.dates.has(prevKey(d)) ? expNext : nonNext).push(foodEntryBurden(byDate.get(d)));
    });

    const evalWindow = (exp, non) => {
      const ea = avg(exp), na = avg(non);
      if (ea === null || na === null || exp.length < 3 || non.length < 2) return null;
      return { delta: ea - na, expAvg: ea, nonAvg: na, n: exp.length };
    };

    const same = evalWindow(expSame, nonSame);
    const next = evalWindow(expNext, nonNext);

    let best = null, windowLabel = null;
    if (same && (!next || same.delta >= next.delta)) { best = same; windowLabel = 'same day'; }
    if (next && (!same || next.delta > same.delta)) { best = next; windowLabel = 'day after'; }
    if (!best) return;

    results.push({
      food: info.display,
      timesEaten: info.dates.size,
      window: windowLabel,
      delta: best.delta,
      expAvg: best.expAvg,
      nonAvg: best.nonAvg,
    });
  });

  results.sort((a, b) => b.delta - a.delta);
  return { ready: true, daysLogged, results };
}

export function generateShareText(entries) {
  if (!entries || entries.length === 0) return 'No tracker data available to share.';
  
  // Last 30 days maximum
  const recent = entries.slice(-30).reverse();
  
  let txt = `RHEUMATOLOGY PATIENT LOG\nGenerated on: ${new Date().toLocaleDateString()}\n\n`;
  
  recent.forEach(e => {
    txt += `--- Date: ${e.date} ---\n`;
    txt += `Pain: ${e.pain || 0}/10\n`;
    txt += `Stiffness: ${e.stiffness || 0}/10\n`;
    txt += `Fatigue: ${e.fatigue || 0}/10\n`;
    txt += `Swelling: ${e.swelling || 0}/10\n`;
    txt += `Rash: ${e.rash ? 'Yes' : 'No'}\n`;
    if (e.custom && Object.keys(e.custom).length > 0) {
      txt += `Other:\n`;
      Object.entries(e.custom).forEach(([key, val]) => {
        txt += `- ${key}: ${val}/10\n`;
      });
    }
    if (e.foods && e.foods.length > 0) {
      txt += `Foods: ${e.foods.join(', ')}\n`;
    }
    if (e.triggers) {
      txt += `Triggers: ${e.triggers}\n`;
    }
    if (e.medications) {
      txt += `Medications: ${e.medications}\n`;
    }
    if (e.notes) {
      txt += `Notes: ${e.notes}\n`;
    }
    txt += `\n`;
  });
  
  return txt;
}

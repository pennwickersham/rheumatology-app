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

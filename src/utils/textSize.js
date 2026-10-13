import { loadFromStorage, saveToStorage } from './storage';

export const TEXT_SIZES = {
  normal: { label: 'Normal', px: 16 },
  large: { label: 'Large', px: 18 },
  xlarge: { label: 'Extra large', px: 20 },
};

export function getTextSize() {
  const v = loadFromStorage('text_size', 'normal');
  return TEXT_SIZES[v] ? v : 'normal';
}

export function applyTextSize(key = getTextSize()) {
  document.documentElement.style.fontSize = `${TEXT_SIZES[key].px}px`;
}

export function setTextSize(key) {
  saveToStorage('text_size', key);
  applyTextSize(key);
}

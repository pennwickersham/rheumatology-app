/* =====================================================================
   RheumCompanion — weather and symptom correlation (opt-in)
   The patient's US ZIP code is turned into an approximate location
   (rounded to 0.1°, about 10 km) via Zippopotam.us, and daily weather for
   that point is downloaded from Open-Meteo. Only the rounded coordinates
   are sent; no health data, ZIP code or account details. All matching of
   weather to symptoms happens on this device.
   ===================================================================== */
import { loadFromStorage, saveToStorage, removeFromStorage } from './storage';
import { getTrackerData } from './tracker';
import { getScoresEntries, getJointEntries } from './assessments';
import { todayKey, addDays, toKey, fmtShort } from './medSchedule';

const PREFS_KEY = 'weather_prefs';
const DAYS_KEY = 'weather_days';
const KEEP_DAYS = 200;
const REFRESH_MS = 6 * 3600 * 1000;

// "Falling pressure": a 24-hour drop of 4 hPa or more, or 6 hPa over 48 hours.
export const DROP_24 = -4;
export const DROP_48 = -6;

const round1 = n => Math.round(n * 10) / 10;

export function getWeatherPrefs() {
  const p = loadFromStorage(PREFS_KEY, {});
  return { enabled: !!p.enabled, zip: p.zip || '', lat: p.lat, lon: p.lon, place: p.place || '', lastFetch: p.lastFetch || 0 };
}

export function getWeatherDays() {
  const d = loadFromStorage(DAYS_KEY, {});
  return d && typeof d === 'object' ? d : {};
}

export async function lookupZip(zip) {
  const z = String(zip).trim();
  if (!/^\d{5}$/.test(z)) throw new Error('Enter a 5-digit US ZIP code.');
  const res = await fetch(`https://api.zippopotam.us/us/${z}`);
  if (res.status === 404) throw new Error('That ZIP code was not found.');
  if (!res.ok) throw new Error('Could not look up that ZIP code. Check your connection.');
  const place = (await res.json()).places?.[0];
  if (!place) throw new Error('That ZIP code was not found.');
  return {
    zip: z,
    lat: round1(Number(place.latitude)),
    lon: round1(Number(place.longitude)),
    place: `${place['place name']}, ${place['state abbreviation']}`,
  };
}

export async function enableWeather(zip) {
  const loc = await lookupZip(zip);
  const prev = getWeatherPrefs();
  if (prev.lat !== loc.lat || prev.lon !== loc.lon) removeFromStorage(DAYS_KEY);
  saveToStorage(PREFS_KEY, { ...loc, enabled: true, lastFetch: 0 });
  return refreshWeather({ force: true });
}

export function disableWeather() {
  removeFromStorage(PREFS_KEY);
  removeFromStorage(DAYS_KEY);
}

// Fetches missing days (up to 200 back) plus the last few days, which get revised.
// Without `force`, does nothing if weather is off or was refreshed in the last 6 hours.
export async function refreshWeather({ force = false } = {}) {
  const prefs = getWeatherPrefs();
  if (!prefs.enabled || prefs.lat == null) return { ok: false, skipped: true };
  if (!force && Date.now() - prefs.lastFetch < REFRESH_MS) return { ok: true, skipped: true };

  const days = getWeatherDays();
  const today = todayKey();
  const known = Object.keys(days).sort();
  const oldest = addDays(today, -(KEEP_DAYS - 1));
  const start = known.length && known[0] <= addDays(oldest, 7) ? addDays(known[known.length - 1], -3) : oldest;

  const url = 'https://historical-forecast-api.open-meteo.com/v1/forecast' +
    `?latitude=${prefs.lat}&longitude=${prefs.lon}` +
    '&daily=pressure_msl_mean,relative_humidity_2m_mean,uv_index_max,temperature_2m_max,temperature_2m_min,precipitation_sum' +
    `&start_date=${start < oldest ? oldest : start}&end_date=${today}&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather service is not responding. Try again later.');
  const d = (await res.json()).daily;
  if (!d?.time) throw new Error('Weather service returned no data.');

  d.time.forEach((t, i) => {
    if (d.pressure_msl_mean[i] == null) return;
    days[t] = {
      p: d.pressure_msl_mean[i],
      rh: d.relative_humidity_2m_mean[i],
      uv: d.uv_index_max[i],
      tmax: d.temperature_2m_max[i],
      tmin: d.temperature_2m_min[i],
      rain: d.precipitation_sum[i],
    };
  });
  for (const k of Object.keys(days)) if (k < oldest) delete days[k];
  saveToStorage(DAYS_KEY, days);
  saveToStorage(PREFS_KEY, { ...prefs, lastFetch: Date.now() });
  return { ok: true, count: d.time.length };
}

/* ---------- per-day series ---------- */
export function weatherSeries(days) {
  const w = getWeatherDays();
  const today = todayKey();
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const k = addDays(today, -i);
    const cur = w[k], prev = w[addDays(k, -1)], prev2 = w[addDays(k, -2)];
    out.push({
      date: k,
      ...(cur || {}),
      dp24: cur && prev ? round1(cur.p - prev.p) : null,
      dp48: cur && prev2 ? round1(cur.p - prev2.p) : null,
    });
  }
  return out;
}

export const isFalling = d => d && ((d.dp24 != null && d.dp24 <= DROP_24) || (d.dp48 != null && d.dp48 <= DROP_48));

// Daily pain: the tracker's daily entry wins; otherwise the average of that day's check-ins.
function painByDay() {
  const out = {};
  const sums = {};
  for (const e of getScoresEntries()) {
    const k = toKey(new Date(e.date));
    sums[k] = sums[k] || [0, 0];
    sums[k][0] += Number(e.pain) || 0; sums[k][1]++;
  }
  for (const [k, [s, n]] of Object.entries(sums)) out[k] = round1(s / n);
  for (const e of getTrackerData()) if (typeof e.date === 'string' && e.pain != null) out[e.date] = Number(e.pain);
  return out;
}

// Signs that point toward inflammation rather than weather or mechanical pain.
function inflammatoryByDay() {
  const out = {};
  const mark = (k, why) => { (out[k] = out[k] || new Set()).add(why); };
  for (const e of getScoresEntries()) if (e.stiffMin >= 60) mark(toKey(new Date(e.date)), 'morning stiffness 1 hour or more');
  for (const e of getJointEntries()) {
    const sw = e.set === 68 ? e.sjc66 : e.sjc28;
    if (sw > 0) mark(toKey(new Date(e.date)), `${sw} swollen joint${sw === 1 ? '' : 's'}`);
  }
  for (const e of getTrackerData()) if (typeof e.date === 'string' && Number(e.swelling) >= 5) mark(e.date, 'swelling rated 5+');
  return out;
}

function pearson(xs, ys) {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
}

const strength = r => {
  const a = Math.abs(r);
  return a < 0.2 ? 'no clear' : a < 0.4 ? 'a weak' : a < 0.6 ? 'a moderate' : 'a strong';
};
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const median = a => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

export const MIN_DAYS = 10;

/* Local analysis over the last `days` days. Descriptive only: associations in one
   person's data, not proof that weather causes symptoms, and not a diagnosis. */
export function analyzeWeather(days = 90) {
  const series = weatherSeries(days);
  const pain = painByDay();
  const infl = inflammatoryByDay();
  const paired = series.filter(d => d.p != null && pain[d.date] != null).map(d => ({ ...d, pain: pain[d.date] }));
  const result = { days, n: paired.length, enough: paired.length >= MIN_DAYS, series, pain, correlations: [], drop: null, spikes: [] };
  if (!result.enough) return result;

  const corr = (key, label) => {
    const pts = paired.filter(d => d[key] != null);
    const r = pearson(pts.map(d => d[key]), pts.map(d => d.pain));
    if (r == null || pts.length < MIN_DAYS) return;
    const when = key === 'dp24'
      ? (r > 0 ? 'pressure was rising' : 'pressure was falling')
      : `${label} was ${r > 0 ? 'higher' : 'lower'}`;
    result.correlations.push({
      key, r: Math.round(r * 100) / 100, n: pts.length,
      text: Math.abs(r) < 0.2
        ? `No clear link between ${label} and pain (${pts.length} days).`
        : `${strength(r)[0].toUpperCase()}${strength(r).slice(1)} link: pain tended to be higher when ${when} (r = ${r.toFixed(2)}, ${pts.length} days).`,
    });
  };
  corr('p', 'barometric pressure');
  corr('dp24', 'the 24-hour pressure change');
  corr('rh', 'humidity');
  corr('tmax', 'the daily high temperature');

  const falling = paired.filter(isFalling), steady = paired.filter(d => !isFalling(d));
  if (falling.length >= 3 && steady.length >= 3) {
    const a = mean(falling.map(d => d.pain)), b = mean(steady.map(d => d.pain));
    result.drop = {
      fallingDays: falling.length, steadyDays: steady.length, fallingPain: round1(a), steadyPain: round1(b),
      text: `Average pain was ${round1(a)}/10 on ${falling.length} days with falling pressure, vs ${round1(b)}/10 on other days.`,
    };
  }

  // Pain spikes: at least 2 points above the person's usual (median) pain and 6 or more.
  const base = median(paired.map(d => d.pain));
  const byDate = Object.fromEntries(series.map(d => [d.date, d]));
  for (const d of paired) {
    if (d.pain < Math.max(base + 2, 6)) continue;
    const near = [addDays(d.date, -1), d.date, addDays(d.date, 1)];
    const signs = [...new Set(near.flatMap(k => [...(infl[k] || [])]))];
    const weather = isFalling(d) || isFalling(byDate[addDays(d.date, -1)]);
    result.spikes.push({
      date: d.date, pain: d.pain, signs, weather,
      kind: signs.length ? 'inflammatory' : weather ? 'weather' : 'unclear',
    });
  }
  result.baseline = round1(base);
  return result;
}

export function spikeSummary(a) {
  const c = k => a.spikes.filter(s => s.kind === k).length;
  return { total: a.spikes.length, weather: c('weather'), inflammatory: c('inflammatory'), unclear: c('unclear') };
}

// Short lines for the shared summary (PDF and text).
export function weatherReportLines(days) {
  const prefs = getWeatherPrefs();
  if (!prefs.enabled) return null;
  const a = analyzeWeather(days);
  if (!a.enough) return { place: prefs.place, lines: [`Not enough overlapping days yet (${a.n} of ${MIN_DAYS} needed) to compare weather with pain.`] };
  const lines = [];
  if (a.drop) lines.push(a.drop.text);
  a.correlations.filter(c => c.key === 'p' || c.key === 'rh').forEach(c => lines.push(c.text));
  const s = spikeSummary(a);
  if (s.total) {
    lines.push(`Pain spikes (6+/10 and 2+ above usual ${a.baseline}): ${s.total}. ` +
      `${s.weather} followed falling pressure without swelling or long morning stiffness; ` +
      `${s.inflammatory} came with swelling or 1+ hour of morning stiffness; ${s.unclear} had neither.`);
    a.spikes.filter(x => x.kind === 'inflammatory').slice(-4).forEach(x =>
      lines.push(`  ${fmtShort(x.date)}: pain ${x.pain} – ${x.signs.join(', ')}${x.weather ? ' (pressure also falling)' : ''}`));
  } else {
    lines.push('No pain spikes in this period.');
  }
  return { place: prefs.place, lines };
}

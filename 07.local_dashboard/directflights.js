const DATA_PATH = '../06.raw_data/aviation/fact_directflights.csv';
const REGION_COLORS = {
  'アジア': '#2563eb', '北米': '#c2410c', 'ヨーロッパ': '#7c3aed',
  'オセアニア': '#16a34a', '中東': '#e11d48', '中南米': '#0891b2', 'アフリカ': '#d97706',
};
const colorFor = (r) => REGION_COLORS[r] || '#64748b';

const state = { rows: [], season: '', airportType: 'all', country: 'all' };
const el = (id) => document.getElementById(id);

init();
async function init() {
  state.rows = parse(await (await fetch(DATA_PATH)).text());
  const seasons = unique(state.rows.map((r) => r.season)).sort();
  state.season = seasons[seasons.length - 1];
  fill(el('seasonSelect'), seasons, state.season, (v) => `${v}`);
  el('seasonSelect').addEventListener('change', () => { state.season = el('seasonSelect').value; refreshCountry(); render(); });
  el('airportType').addEventListener('change', () => { state.airportType = el('airportType').value; render(); });
  refreshCountry();
  el('countrySelect').addEventListener('change', () => { state.country = el('countrySelect').value; render(); });
  render();
}

function parse(text) {
  const lines = text.replace(/^﻿/, '').trim().split('\n').map((l) => l.split(','));
  const H = lines[0];
  return lines.slice(1).map((c) => {
    const o = {}; H.forEach((h, i) => { o[h] = c[i]; });
    return { airport: o.airport, major: o.is_major === '1', region: o.region, country: o.country,
      city: o.city, airline: o.airline, flights: +o.weekly_flights, season: o.season };
  });
}
function fill(sel, vals, cur, fmt) {
  sel.innerHTML = '';
  vals.forEach((v) => { const o = document.createElement('option'); o.value = v; o.textContent = fmt(v); sel.appendChild(o); });
  sel.value = cur;
}
function refreshCountry() {
  const cs = unique(seasonRows().map((r) => r.country)).sort((a, b) => a.localeCompare(b, 'ja'));
  fill(el('countrySelect'), ['all', ...cs], 'all', (v) => v === 'all' ? 'すべての国・地域' : v);
  state.country = 'all';
}
function seasonRows() { return state.rows.filter((r) => r.season === state.season); }
function filtered() {
  return seasonRows().filter((r) =>
    (state.airportType === 'all' || (state.airportType === 'major' ? r.major : !r.major)) &&
    (state.country === 'all' || r.country === state.country));
}

function render() {
  const rows = filtered();
  renderMetrics(rows);
  renderBars(el('countryBars'), aggregate(rows, 'country'), 15, (k, items) => colorFor(items[0].region));
  renderBars(el('airportBars'), aggregate(rows, 'airport'), 30, (k, items) => items[0].major ? '#1d4ed8' : '#0d9488');
  renderRegional();
  renderTable(rows);
}

function aggregate(rows, key) {
  const m = new Map();
  rows.forEach((r) => { if (!m.has(r[key])) m.set(r[key], []); m.get(r[key]).push(r); });
  return [...m.entries()].map(([k, items]) => ({ key: k, items, flights: items.reduce((s, x) => s + x.flights, 0) }))
    .sort((a, b) => b.flights - a.flights);
}

function renderMetrics(rows) {
  const total = rows.reduce((s, r) => s + r.flights, 0);
  const regional = rows.filter((r) => !r.major).reduce((s, r) => s + r.flights, 0);
  const countries = unique(rows.map((r) => r.country)).length;
  const airports = unique(rows.map((r) => r.airport)).length;
  el('mTotal').textContent = `${total.toLocaleString(undefined, { maximumFractionDigits: 1 })} 便/週`;
  el('mCountries').textContent = `${countries} 国・地域`;
  el('mAirports').textContent = `${airports} 空港`;
  el('mRegional').textContent = total ? `${(regional / total * 100).toFixed(1)}%` : '-';
}

function renderBars(svg, data, topN, colorFn) {
  const items = data.slice(0, topN);
  const rowH = 22, pad = { l: 92, r: 56, t: 8, b: 8 };
  const W = 600, H = pad.t + pad.b + items.length * rowH;
  const max = Math.max(...items.map((d) => d.flights), 1);
  const iw = W - pad.l - pad.r;
  let s = '';
  items.forEach((d, i) => {
    const y = pad.t + i * rowH;
    const w = d.flights / max * iw;
    s += `<text x="${pad.l - 6}" y="${y + rowH / 2 + 4}" font-size="11" fill="#334155" text-anchor="end">${d.key}</text>`;
    s += `<rect x="${pad.l}" y="${y + 3}" width="${w}" height="${rowH - 8}" rx="3" fill="${colorFn(d.key, d.items)}" fill-opacity="0.85"/>`;
    s += `<text x="${pad.l + w + 5}" y="${y + rowH / 2 + 4}" font-size="11" fill="#475569">${Math.round(d.flights).toLocaleString()}</text>`;
  });
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = s;
}

function renderRegional() {
  // 地方空港(主要5以外)ごとの 便数/週 と 就航国・地域数
  const rows = seasonRows().filter((r) => !r.major &&
    (state.country === 'all' || r.country === state.country));
  const agg = aggregate(rows, 'airport');
  let h = '<thead><tr><th>地方空港</th><th>便数/週</th><th>就航国・地域</th><th>主な就航先</th></tr></thead><tbody>';
  agg.forEach((d) => {
    const countries = unique(d.items.map((x) => x.country));
    const top = aggregate(d.items, 'country').slice(0, 4).map((x) => `${x.key}(${Math.round(x.flights)})`).join('、');
    h += `<tr><td>${d.key}</td><td class="num">${Math.round(d.flights)}</td><td class="num">${countries.length}</td><td>${top}</td></tr>`;
  });
  h += '</tbody>';
  el('regionalTable').innerHTML = h;
}

function renderTable(rows) {
  const sorted = [...rows].sort((a, b) => b.flights - a.flights).slice(0, 200);
  let h = '<thead><tr><th>空港</th><th>区分</th><th>地域</th><th>国・地域</th><th>都市</th><th>航空会社</th><th>便数/週</th></tr></thead><tbody>';
  sorted.forEach((r) => {
    h += `<tr><td>${r.airport}</td><td>${r.major ? '主要5' : '地方'}</td>
      <td><span class="dot" style="background:${colorFor(r.region)}"></span>${r.region}</td>
      <td>${r.country}</td><td>${r.city}</td><td>${r.airline}</td><td class="num">${Math.round(r.flights)}</td></tr>`;
  });
  h += '</tbody>';
  el('routeTable').innerHTML = h;
}

function unique(a) { return [...new Set(a)]; }

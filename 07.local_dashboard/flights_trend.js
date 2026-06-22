const DATA_PATH = '../06.raw_data/aviation/fact_flights_seasonal_trend.csv';
const SEASON_ORDER = ['2019W','2023S','2023W','2024S','2024W','2025S','2026S'];
const el = (id) => document.getElementById(id);
const state = { rows: [] };

init();
async function init() {
  state.rows = parse(await (await fetch(DATA_PATH)).text());
  render();
}
function parse(text) {
  const lines = text.replace(/^﻿/, '').trim().split('\n').map((l) => l.split(','));
  const H = lines[0];
  return lines.slice(1).map((c) => { const o = {}; H.forEach((h, i) => { o[h] = c[i]; });
    return { season: o.season, order: +o.season_order, type: o.metric_type, name: o.name, val: +o.flights_per_week }; });
}
const get = (type, name) => {
  const m = {}; state.rows.filter((r) => r.type === type && r.name === name).forEach((r) => { m[r.season] = r.val; });
  return m;
};

function render() {
  renderMetrics();
  // 合計トレンド（旅客+貨物 / 旅客便）
  lineChart(el('totalChart'), SEASON_ORDER, [
    { name: '合計(旅客+貨物)', color: '#1d4ed8', data: get('total', '合計(旅客+貨物)') },
    { name: '旅客便', color: '#0d9488', data: get('total', '合計(旅客便)') },
  ], { yLabel: '便/週' });
  // 方面別（2025Sまで）
  const dirSeasons = SEASON_ORDER.slice(0, 6);
  lineChart(el('directionChart'), dirSeasons, [
    { name: 'アジア・オセアニア', color: '#2563eb', data: get('direction', 'アジア・オセアニア') },
    { name: 'アメリカ', color: '#c2410c', data: get('direction', 'アメリカ') },
    { name: '欧州・中東・アフリカ', color: '#7c3aed', data: get('direction', '欧州・中東・アフリカ') },
  ], { yLabel: '便/週' });
  renderLegend(el('directionLegend'), [['アジア・オセアニア', '#2563eb'], ['アメリカ', '#c2410c'], ['欧州・中東・アフリカ', '#7c3aed']]);
  // 空港別
  const aps = [['成田', '#1d4ed8'], ['羽田', '#0891b2'], ['関西', '#c2410c'], ['中部', '#7c3aed'], ['福岡', '#16a34a'], ['地方空港計', '#dc2626']];
  lineChart(el('airportChart'), dirSeasons, aps.map(([n, c]) => ({ name: n, color: c, data: get('airport', n) })), { yLabel: '便/週' });
  renderLegend(el('airportLegend'), aps);
}

function renderMetrics() {
  const t = get('total', '合計(旅客+貨物)');
  const cur = t['2026S'], prev = t['2025S'], y2019 = t['2019W'];
  el('mLatest').textContent = `${cur.toLocaleString()} 便/週`;
  el('mYoY').textContent = pct(cur / prev - 1);
  el('mYoY').style.color = cur >= prev ? '#16a34a' : '#dc2626';
  el('m2019').textContent = pct(cur / y2019 - 1);
  el('m2019').style.color = cur >= y2019 ? '#16a34a' : '#dc2626';
}
const pct = (v) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;

function renderLegend(node, items) {
  node.innerHTML = items.map(([n, c]) => `<span><i style="background:${c}"></i>${n}</span>`).join('');
}

function lineChart(svg, seasons, series, opts) {
  const W = 640, H = 320, pad = { l: 56, r: 16, t: 14, b: 36 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const all = series.flatMap((s) => seasons.map((se) => s.data[se]).filter((v) => v !== undefined));
  const ymax = Math.max(...all) * 1.08, ymin = 0;
  const x = (i) => pad.l + (seasons.length === 1 ? 0 : i / (seasons.length - 1) * iw);
  const y = (v) => pad.t + ih - (v - ymin) / (ymax - ymin) * ih;
  let s = '';
  // gridlines
  for (let g = 0; g <= 4; g++) {
    const gv = ymax / 4 * g, gy = y(gv);
    s += `<line x1="${pad.l}" y1="${gy}" x2="${pad.l + iw}" y2="${gy}" stroke="#eef2f6"/>`;
    s += `<text x="${pad.l - 6}" y="${gy + 3}" font-size="10" fill="#94a3b8" text-anchor="end">${Math.round(gv).toLocaleString()}</text>`;
  }
  // x labels
  seasons.forEach((se, i) => {
    s += `<text x="${x(i)}" y="${H - 12}" font-size="10" fill="#64748b" text-anchor="middle">${se}</text>`;
  });
  // lines
  series.forEach((ser) => {
    const pts = seasons.map((se, i) => ser.data[se] === undefined ? null : [x(i), y(ser.data[se])]).filter(Boolean);
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    s += `<path d="${d}" fill="none" stroke="${ser.color}" stroke-width="2.5"/>`;
    pts.forEach((p) => { s += `<circle cx="${p[0]}" cy="${p[1]}" r="3.2" fill="${ser.color}"/>`; });
    // end label
    const last = pts[pts.length - 1];
    s += `<text x="${last[0] - 4}" y="${last[1] - 7}" font-size="10" fill="${ser.color}" text-anchor="end">${ser.data[seasons[seasons.length-1]] ?? ''}</text>`;
  });
  s += `<text x="14" y="${pad.t + ih / 2}" font-size="10" fill="#64748b" text-anchor="middle" transform="rotate(-90 14 ${pad.t + ih / 2})">${opts.yLabel}</text>`;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = s;
}

const DATA_PATH = '../06.raw_data/fact_market_value_annual.csv';

const state = { rows: [], year: '' };

const el = {
  yearSelect: document.getElementById('yearSelect'),
  metricTotal: document.getElementById('metricTotal'),
  metricTop: document.getElementById('metricTop'),
  metricGap: document.getElementById('metricGap'),
  metricPremium: document.getElementById('metricPremium'),
  scatterGrowth: document.getElementById('scatterGrowth'),
  scatterPrice: document.getElementById('scatterPrice'),
  rankTable: document.getElementById('rankTable'),
  growthNote: document.getElementById('growthNote'),
  priceNote: document.getElementById('priceNote'),
};

const SERIES_COLORS = {
  '東アジア': '#2563eb', '東南アジア': '#0891b2', '北米': '#c2410c',
  '欧州': '#7c3aed', 'オセアニア': '#16a34a', '南アジア': '#d97706',
  '中東': '#e11d48', '南米': '#0f766e',
};
const colorFor = (region) => SERIES_COLORS[region] || '#64748b';

init();

async function init() {
  const text = await (await fetch(DATA_PATH)).text();
  state.rows = parseRows(text);
  const years = unique(state.rows.map((r) => r.year)).sort();
  state.year = years[years.length - 1];
  years.forEach((y) => {
    const o = document.createElement('option');
    o.value = y; o.textContent = `${y}年`;
    el.yearSelect.appendChild(o);
  });
  el.yearSelect.value = state.year;
  el.yearSelect.addEventListener('change', () => { state.year = el.yearSelect.value; render(); });
  render();
}

function parseRows(text) {
  const lines = text.replace(/^﻿/, '').trim().split('\n').map((l) => l.split(','));
  const header = lines[0];
  return lines.slice(1).map((cols) => {
    const o = {};
    header.forEach((h, i) => { o[h] = cols[i]; });
    return {
      year: o.year, region: o.region, country: o.country,
      visitors: +o.visitors, spend: +o.spend_per_capita_yen,
      total: +o.total_consumption_yen, share: +o.consumption_share_pct,
      crank: +o.consumption_rank, vrank: +o.visitor_rank, prank: +o.spend_per_capita_rank,
      yoy: o.total_consumption_yoy === '' ? null : +o.total_consumption_yoy,
    };
  });
}

function current() {
  return state.rows.filter((r) => r.year === state.year);
}

function render() {
  const rows = current();
  renderMetrics(rows);
  renderScatter(el.scatterGrowth, rows, {
    x: (r) => r.visitors, y: (r) => (r.yoy === null ? 0 : r.yoy * 100),
    xLog: true, yZeroLine: true, yLabel: '総消費 前年比(%)', xLabel: '訪日客数(対数)',
    note: el.growthNote,
    quadrants: ['育成: 小規模・高成長', '主力: 大規模・高成長', '様子見: 小規模・停滞', 'テコ入れ: 大規模・停滞'],
  });
  renderScatter(el.scatterPrice, rows, {
    x: (r) => r.visitors, y: (r) => r.spend,
    xLog: true, yZeroLine: false, yLabel: '1人当たり消費単価(円)', xLabel: '訪日客数(対数)',
    note: el.priceNote,
    quadrants: ['ニッチ高単価', '最優先: 多い×高い', '優先度低', '単価引上げ余地'],
  });
  renderTable(rows);
}

function renderMetrics(rows) {
  const total = rows.reduce((s, r) => s + r.total, 0);
  const top = [...rows].sort((a, b) => b.total - a.total)[0];
  // 人数順位と消費順位の乖離が最大の市場（単価で順位を落とす/上げる市場）
  const gap = [...rows].sort((a, b) => (a.vrank - a.crank) - (b.vrank - b.crank))[0];
  const premium = [...rows].sort((a, b) => b.spend - a.spend)[0];
  el.metricTotal.textContent = `${(total / 1e12).toFixed(2)} 兆円`;
  el.metricTop.textContent = `${top.country}（${top.share.toFixed(1)}%）`;
  el.metricPremium.textContent = `${premium.country}（${Math.round(premium.spend / 1000)}千円）`;
  el.metricGap.textContent = `${gap.country}（人数${gap.vrank}位→消費${gap.crank}位）`;
}

function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function renderScatter(svg, rows, cfg) {
  const W = 600, H = 400, pad = { l: 64, r: 16, t: 16, b: 44 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const xs = rows.map(cfg.x), ys = rows.map(cfg.y);
  const tx = (v) => cfg.xLog ? Math.log10(v) : v;
  const xMin = Math.min(...xs.map(tx)), xMax = Math.max(...xs.map(tx));
  const yMin = Math.min(0, ...ys), yMax = Math.max(...ys);
  const xPad = (xMax - xMin) * 0.08 || 1, yPad = (yMax - yMin) * 0.1 || 1;
  const x0 = xMin - xPad, x1 = xMax + xPad, y0 = yMin - yPad, y1 = yMax + yPad;
  const px = (v) => pad.l + (tx(v) - x0) / (x1 - x0) * iw;
  const py = (v) => pad.t + ih - (v - y0) / (y1 - y0) * ih;

  const xSplit = median(xs), ySplit = cfg.yZeroLine ? 0 : median(ys);
  let s = '';
  // axes
  s += `<line x1="${pad.l}" y1="${pad.t + ih}" x2="${pad.l + iw}" y2="${pad.t + ih}" stroke="#cbd5e1"/>`;
  s += `<line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${pad.t + ih}" stroke="#cbd5e1"/>`;
  // quadrant dividers
  s += `<line x1="${px(xSplit)}" y1="${pad.t}" x2="${px(xSplit)}" y2="${pad.t + ih}" stroke="#e2e8f0" stroke-dasharray="4 4"/>`;
  s += `<line x1="${pad.l}" y1="${py(ySplit)}" x2="${pad.l + iw}" y2="${py(ySplit)}" stroke="#94a3b8" stroke-dasharray="4 4"/>`;
  // quadrant labels (TL,TR,BL,BR)
  const qs = cfg.quadrants;
  s += quadLabel(qs[0], pad.l + 6, pad.t + 14, 'start');
  s += quadLabel(qs[1], pad.l + iw - 6, pad.t + 14, 'end');
  s += quadLabel(qs[2], pad.l + 6, pad.t + ih - 6, 'start');
  s += quadLabel(qs[3], pad.l + iw - 6, pad.t + ih - 6, 'end');
  // points
  rows.forEach((r) => {
    const cx = px(cfg.x(r)), cy = py(cfg.y(r));
    s += `<circle cx="${cx}" cy="${cy}" r="5.5" fill="${colorFor(r.region)}" fill-opacity="0.82"/>`;
    s += `<text x="${cx + 7}" y="${cy + 3}" font-size="10" fill="#334155">${r.country}</text>`;
  });
  // axis labels
  s += `<text x="${pad.l + iw / 2}" y="${H - 8}" font-size="11" fill="#64748b" text-anchor="middle">${cfg.xLabel}</text>`;
  s += `<text x="14" y="${pad.t + ih / 2}" font-size="11" fill="#64748b" text-anchor="middle" transform="rotate(-90 14 ${pad.t + ih / 2})">${cfg.yLabel}</text>`;
  svg.innerHTML = s;
}

function quadLabel(txt, x, y, anchor) {
  return `<text x="${x}" y="${y}" font-size="10" fill="#94a3b8" text-anchor="${anchor}">${txt}</text>`;
}

function renderTable(rows) {
  const sorted = [...rows].sort((a, b) => a.crank - b.crank);
  let h = '<thead><tr><th>消費順位</th><th>国・地域</th><th>地域</th><th>訪日客数</th><th>1人単価(円)</th><th>総消費(億円)</th><th>構成比</th><th>前年比</th><th>人数順位</th></tr></thead><tbody>';
  sorted.forEach((r) => {
    const yoy = r.yoy === null ? '-' : `${(r.yoy * 100).toFixed(1)}%`;
    const yoyCls = r.yoy === null ? '' : (r.yoy >= 0 ? 'pos' : 'neg');
    h += `<tr>
      <td>${r.crank}</td><td>${r.country}</td><td><span class="dot" style="background:${colorFor(r.region)}"></span>${r.region}</td>
      <td class="num">${r.visitors.toLocaleString()}</td>
      <td class="num">${Math.round(r.spend).toLocaleString()}</td>
      <td class="num">${Math.round(r.total / 1e8).toLocaleString()}</td>
      <td class="num">${r.share.toFixed(1)}%</td>
      <td class="num ${yoyCls}">${yoy}</td>
      <td class="num">${r.vrank}</td>
    </tr>`;
  });
  h += '</tbody>';
  el.rankTable.innerHTML = h;
}

function unique(a) { return [...new Set(a)]; }

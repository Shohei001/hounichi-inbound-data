const DATA_PATH = '../06.raw_data/fact_journey_country.csv';
const JOURNEY_QUAL = '../06.raw_data/inbound_customer_journey.csv';

const STAGES = [
  { key: '認知', type: 'lead', label: '認知', note: '関心の高まり（Google Trends等）', score: null },
  { key: '検討', type: 'lead', label: '検討', note: '来やすさ（為替・航空座席）', score: null },
  { key: '予約', type: 'lead', label: '予約', note: '直近予約（観光予報）', score: null },
  { key: '来訪', type: 'data', label: '来訪', note: '訪日客数・前年比・2019年比', scoreKey: 'visit_score' },
  { key: '滞在', type: 'data', label: '滞在', note: '泊数・消費単価・地方泊率', scoreKey: 'stay_score' },
  { key: '再訪', type: 'data', label: '再訪', note: 'リピーター率', scoreKey: 'repeat_score' },
];

const state = { rows: [], qual: [], country: '' };
const el = (id) => document.getElementById(id);

init();

async function init() {
  state.rows = parseRows(await (await fetch(DATA_PATH)).text());
  try { state.qual = parseQual(await (await fetch(JOURNEY_QUAL)).text()); } catch (e) { state.qual = []; }
  state.rows.sort((a, b) => b.visitors - a.visitors);
  state.country = state.rows[0].country;
  const sel = el('countrySelect');
  state.rows.forEach((r) => {
    const o = document.createElement('option'); o.value = r.country; o.textContent = r.country; sel.appendChild(o);
  });
  sel.value = state.country;
  sel.addEventListener('change', () => { state.country = sel.value; render(); });
  render();
}

function parseRows(text) {
  const lines = text.replace(/^﻿/, '').trim().split('\n').map((l) => l.split(','));
  const H = lines[0];
  // handle quoted source field with commas: rebuild via simple parse
  return lines.slice(1).map((cols) => {
    const o = {}; H.forEach((h, i) => { o[h] = cols[i]; });
    return {
      country: o.country, region: o.region, visitors: +o.visitors,
      visitors_yoy: num(o.visitors_yoy), visitors_vs_2019: num(o.visitors_vs_2019),
      avg_nights: num(o.avg_nights), spend_per_capita: num(o.spend_per_capita),
      local_stay_share: num(o.local_stay_share), repeat_rate: num(o.repeat_rate),
      visit_score: num(o.visit_score), stay_score: num(o.stay_score), repeat_score: num(o.repeat_score),
      bottleneck_stage: o.bottleneck_stage,
    };
  });
}
function num(v) { return v === '' || v === undefined ? null : +v; }

function parseQual(text) {
  const lines = text.replace(/^﻿/, '').trim().split('\n');
  const H = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cols = splitCsv(line); const o = {}; H.forEach((h, i) => { o[h] = cols[i]; }); return o;
  });
}
function splitCsv(line) {
  const out = []; let v = '', q = false;
  for (let i = 0; i < line.length; i++) { const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { v += '"'; i++; } else if (c === '"') q = false; else v += c; }
    else if (c === '"') q = true; else if (c === ',') { out.push(v); v = ''; } else v += c; }
  out.push(v); return out;
}

const scoreColor = (s) => s === null ? '#cbd5e1' : s >= 60 ? '#16a34a' : s >= 35 ? '#d97706' : '#dc2626';
const fmtPct = (v) => v === null ? '-' : `${(v * 100).toFixed(1)}%`;

function render() {
  const r = state.rows.find((x) => x.country === state.country);
  renderHeader(r);
  renderFunnel(r);
  renderKpis(r);
  renderOverview();
}

function renderHeader(r) {
  el('cName').textContent = `${r.country}（${r.region}）`;
  el('cBottleneck').textContent = r.bottleneck_stage || '-';
  el('cBottleneck').style.color = '#dc2626';
}

function renderFunnel(r) {
  let h = '<div class="cj-stage-flow">';
  STAGES.forEach((st, index) => {
    const score = st.scoreKey ? r[st.scoreKey] : null;
    const isLead = st.type === 'lead';
    const isBn = st.key === r.bottleneck_stage;
    const w = score === null ? 0 : score;
    h += `<article class="cj-stage-card ${isLead ? 'lead' : ''} ${isBn ? 'bottleneck' : ''}">
      <div class="stage-top">
        <span class="stage-index">${String(index + 1).padStart(2, '0')}</span>
        <div class="stage-score" style="color:${isLead ? '#94a3b8' : scoreColor(score)}">
          ${isLead ? '-' : (score === null ? '-' : score)}
          <small>${isLead ? '定量対象外' : 'score'}</small>
        </div>
      </div>
      <div class="stage-name">
        <strong>${st.label}${isBn ? ' <span class="bn-tag">ボトルネック</span>' : ''}</strong>
        <small>${st.note}</small>
      </div>
      <div class="stage-bar"><span class="stage-fill" style="width:${Math.max(4, w)}%;background:${isLead ? '#cbd5e1' : scoreColor(score)}"></span></div>
    </article>`;
  });
  h += '</div>';
  el('funnel').innerHTML = h;
  // qualitative actions for bottleneck stage
  const q = state.qual.filter((x) => x.country === state.country && x.stage === r.bottleneck_stage)[0];
  el('bnAction').innerHTML = q
    ? `<strong>${r.bottleneck_stage}の打ち手:</strong> ${q.action}<br><small>着眼: ${q.strategic_question}</small>`
    : '';
}

function renderKpis(r) {
  const cards = [
    ['訪日客数(2025)', r.visitors.toLocaleString(), '来訪'],
    ['前年比', fmtPct(r.visitors_yoy), '来訪'],
    ['2019年比', fmtPct(r.visitors_vs_2019), '来訪'],
    ['平均泊数', r.avg_nights === null ? '-' : `${r.avg_nights} 泊`, '滞在'],
    ['1人当たり消費', r.spend_per_capita === null ? '-' : `${Math.round(r.spend_per_capita / 1000)} 千円`, '滞在'],
    ['地方泊率', fmtPct(r.local_stay_share), '滞在'],
    ['リピーター率', r.repeat_rate === null ? '-' : `${r.repeat_rate}%`, '再訪'],
  ];
  el('kpis').innerHTML = cards.map(([k, v, s]) =>
    `<article class="metric"><span>${k}</span><strong>${v}</strong><small>${s}</small></article>`).join('');
}

function renderOverview() {
  const rows = [...state.rows].sort((a, b) => b.visitors - a.visitors);
  let h = '<thead><tr><th>国・地域</th><th>来訪</th><th>滞在</th><th>再訪</th><th>ボトルネック</th></tr></thead><tbody>';
  rows.forEach((r) => {
    const cell = (s) => `<td class="num"><span class="chip" style="background:${scoreColor(s)}">${s === null ? '-' : s}</span></td>`;
    const on = r.country === state.country ? ' class="sel"' : '';
    h += `<tr${on} data-c="${r.country}"><td>${r.country}</td>${cell(r.visit_score)}${cell(r.stay_score)}${cell(r.repeat_score)}<td>${r.bottleneck_stage}</td></tr>`;
  });
  h += '</tbody>';
  const t = el('overview'); t.innerHTML = h;
  t.querySelectorAll('tr[data-c]').forEach((tr) => tr.addEventListener('click', () => {
    state.country = tr.getAttribute('data-c'); el('countrySelect').value = state.country; render();
  }));
}

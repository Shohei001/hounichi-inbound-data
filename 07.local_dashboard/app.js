'use strict';
const P = {
  visitors: '../06.raw_data/view_dashboard_monthly_visitors_manual.csv',
  lodging: '../06.raw_data/lodging_statistics/lodging_country_prefecture_monthly.csv',
  flights: '../06.raw_data/aviation/fact_directflights.csv',
  ftrend: '../06.raw_data/aviation/fact_flights_seasonal_trend.csv',
};
const D = { visitors: [], lodging: [], flights: [], ftrend: [] };
const FLIGHT_SEASON = '2023冬ダイヤ';
const MAJORS = ['韓国','中国','台湾','香港','米国','タイ','豪州','シンガポール','ベトナム','フィリピン','インドネシア','マレーシア','インド','英国','フランス','ドイツ','イタリア','スペイン','カナダ','豪州'];
const COLORS = ['#1d4ed8','#0d9488','#c2410c','#7c3aed','#0891b2','#dc2626','#16a34a','#d97706'];

const el = (id) => document.getElementById(id);
const uniq = (a) => [...new Set(a)];
const sum = (a) => a.reduce((s, x) => s + x, 0);
const fmtN = (v) => v === null || v === undefined || isNaN(v) ? '-' : Math.round(v).toLocaleString();
const fmtPct = (v) => v === null || v === undefined || v === '' || isNaN(v) ? '-' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;
const jp = (a, b) => a.localeCompare(b, 'ja');

function parseCsv(text) {
  const rows = []; let row = [], val = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i+1] === '"') { val += '"'; i++; } else if (c === '"') q = false; else val += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(val); val = ''; }
    else if (c === '\n') { row.push(val); rows.push(row); row = []; val = ''; }
    else if (c !== '\r') val += c;
  }
  if (val !== '' || row.length) { row.push(val); rows.push(row); }
  const H = rows[0].map((h) => h.replace(/^﻿/, ''));
  return rows.slice(1).filter((r) => r.length > 1).map((r) => { const o = {}; H.forEach((h, i) => o[h] = r[i]); return o; });
}
async function load(path) { return parseCsv(await (await fetch(path)).text()); }

init();
async function init() {
  const [v, l, f, t] = await Promise.all([load(P.visitors), load(P.lodging), load(P.flights), load(P.ftrend)]);
  D.visitors = v.map((r) => ({ ym: r.ym, region: r.region, country: r.country, visitors: +r.visitors,
    yoy: r.visitors_yoy === '' ? null : +r.visitors_yoy, vs19: r.visitors_vs_2019 === '' ? null : +r.visitors_vs_2019 }));
  D.lodging = l.map((r) => ({ ym: r.ym, country: r.country, pref: r.prefecture, block: r.region_block,
    nights: r.foreign_guest_nights === '' ? null : +r.foreign_guest_nights, yoy: r.guest_nights_yoy === '' ? null : +r.guest_nights_yoy }));
  D.flights = f.map((r) => ({ airport: r.airport, major: r.is_major === '1', region: r.region, country: r.country,
    city: r.city, airline: r.airline, flights: +r.weekly_flights, season: r.season }));
  D.ftrend = t.map((r) => ({ season: r.season, order: +r.season_order, type: r.metric_type, name: r.name, val: +r.flights_per_week }));
  buildS1(); buildS2(); buildS3();
}

/* ---------- chart helpers ---------- */
function lineChart(svg, xkeys, series, opts = {}) {
  const W = 640, H = 300, pad = { l: 54, r: 14, t: 12, b: 30 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const vals = series.flatMap((s) => xkeys.map((k) => s.data[k]).filter((x) => x !== undefined && x !== null));
  if (!vals.length) { svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.innerHTML = `<text x="${W/2}" y="${H/2}" font-size="12" fill="#94a3b8" text-anchor="middle">データなし</text>`; return; }
  const ymax = Math.max(...vals) * 1.08, ymin = Math.min(0, ...vals);
  const X = (i) => pad.l + (xkeys.length === 1 ? iw/2 : i / (xkeys.length - 1) * iw);
  const Y = (v) => pad.t + ih - (v - ymin) / (ymax - ymin) * ih;
  let s = '';
  for (let g = 0; g <= 4; g++) { const gv = ymin + (ymax - ymin)/4*g, gy = Y(gv);
    s += `<line x1="${pad.l}" y1="${gy}" x2="${pad.l+iw}" y2="${gy}" stroke="#eef2f6"/>`;
    s += `<text x="${pad.l-6}" y="${gy+3}" font-size="9" fill="#94a3b8" text-anchor="end">${fmtN(gv)}</text>`; }
  const every = opts.xEvery || Math.ceil(xkeys.length / 8);
  xkeys.forEach((k, i) => { if (i % every === 0 || i === xkeys.length-1) s += `<text x="${X(i)}" y="${H-10}" font-size="9" fill="#64748b" text-anchor="middle">${opts.xfmt ? opts.xfmt(k) : k}</text>`; });
  series.forEach((ser) => {
    let dpath = '', started = false;
    xkeys.forEach((k, i) => { const v = ser.data[k]; if (v === undefined || v === null) { started = false; return; }
      dpath += `${started ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)} `; started = true; });
    s += `<path d="${dpath}" fill="none" stroke="${ser.color}" stroke-width="${ser.w || 2.3}"/>`;
    if (opts.dots !== false) xkeys.forEach((k, i) => { const v = ser.data[k]; if (v != null && v !== undefined) s += `<circle cx="${X(i)}" cy="${Y(v)}" r="2.4" fill="${ser.color}"/>`; });
  });
  if (opts.yLabel) s += `<text x="13" y="${pad.t+ih/2}" font-size="9" fill="#64748b" text-anchor="middle" transform="rotate(-90 13 ${pad.t+ih/2})">${opts.yLabel}</text>`;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.innerHTML = s;
}
function barH(svg, items, opts = {}) {
  const rowH = 22, pad = { l: opts.labelW || 96, r: 52, t: 6, b: 6 }, W = 640;
  const top = items.slice(0, opts.top || 15);
  const H = pad.t + pad.b + top.length * rowH;
  const max = Math.max(...top.map((d) => d.value), 1), iw = W - pad.l - pad.r;
  let s = '';
  top.forEach((d, i) => { const y = pad.t + i*rowH, w = d.value/max*iw;
    s += `<text x="${pad.l-6}" y="${y+rowH/2+4}" font-size="11" fill="#334155" text-anchor="end">${d.label}</text>`;
    s += `<rect x="${pad.l}" y="${y+3}" width="${Math.max(w,0).toFixed(1)}" height="${rowH-8}" rx="3" fill="${d.color||'#1d4ed8'}" fill-opacity="0.85"/>`;
    s += `<text x="${pad.l+Math.max(w,0)+5}" y="${y+rowH/2+4}" font-size="10.5" fill="#475569">${opts.fmt ? opts.fmt(d.value) : fmtN(d.value)}</text>`; });
  if (!top.length) s = `<text x="${W/2}" y="30" font-size="12" fill="#94a3b8" text-anchor="middle">データなし</text>`;
  svg.setAttribute('viewBox', `0 0 ${W} ${H || 40}`); svg.innerHTML = s;
}
function fillSelect(sel, opts, cur) { sel.innerHTML = ''; opts.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); }); if (cur !== undefined) sel.value = cur; }
function legend(node, items) { node.innerHTML = items.map(([n, c]) => `<span><i style="background:${c}"></i>${n}</span>`).join(''); }

/* ================= Section 1: 訪日動向 ================= */
const s1 = { country: '総数', range: 36 };
function buildS1() {
  const countries = uniq(D.visitors.filter((r) => r.region !== '集計').map((r) => r.country)).sort(jp);
  fillSelect(el('s1Country'), [['総数','総数(全体)'], ...countries.map((c) => [c, c])], '総数');
  el('s1Country').onchange = () => { s1.country = el('s1Country').value; renderS1(); };
  el('s1Range').onchange = () => { s1.range = +el('s1Range').value; renderS1(); };
  renderS1();
}
function renderS1() {
  const rows = D.visitors.filter((r) => r.country === s1.country).sort((a, b) => a.ym.localeCompare(b.ym));
  const latest = rows[rows.length - 1];
  el('s1Metrics').innerHTML = metric('最新月 訪日数', fmtN(latest.visitors), latest.ym + '・' + s1.country)
    + metric('前年同月比', fmtPct(latest.yoy), '', latest.yoy >= 0 ? 'pos' : 'neg')
    + metric('2019年同月比', fmtPct(latest.vs19), '', latest.vs19 >= 0 ? 'pos' : 'neg')
    + metric('表示期間', s1.range ? `直近${s1.range}ヶ月` : '全期間', '月次推移');
  // monthly trend
  let mr = rows; if (s1.range) mr = rows.slice(-s1.range);
  const xs = mr.map((r) => r.ym);
  el('s1TrendSub').textContent = `${s1.country} の月次訪日数（${xs[0]}〜${xs[xs.length-1]}）`;
  lineChart(el('s1Trend'), xs, [{ name: s1.country, color: '#1d4ed8', data: Object.fromEntries(mr.map((r) => [r.ym, r.visitors])) }],
    { yLabel: '人', xfmt: (k) => k.slice(2) });
  // year comparison
  const years = ['2019','2023','2024','2025','2026'];
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const series = years.map((y, i) => ({ name: y + '年', color: COLORS[i % COLORS.length],
    data: Object.fromEntries(rows.filter((r) => r.ym.startsWith(y + '-')).map((r) => [String(+r.ym.split('-')[1]), r.visitors])) }))
    .filter((s) => Object.keys(s.data).length);
  lineChart(el('s1Year'), months, series, { yLabel: '人', xEvery: 1, xfmt: (k) => k + '月', dots: false });
  legend(el('s1YearLegend'), series.map((s) => [s.name, s.color]));
}

/* ================= Section 2: 国×地域 ================= */
const s2 = { mode: 'country', primary: '', compare: '', period: '12m' };
function lodgingMonths() { return uniq(D.lodging.map((r) => r.ym)).sort(); }
function last12() { const ms = lodgingMonths(); return ms.slice(-12); }
function buildS2() {
  el('s2Mode').querySelectorAll('button').forEach((b) => b.onclick = () => {
    el('s2Mode').querySelectorAll('button').forEach((x) => x.classList.remove('active'));
    b.classList.add('active'); s2.mode = b.dataset.mode; refreshS2Selectors(); renderS2();
  });
  el('s2Period').onchange = () => { s2.period = el('s2Period').value; renderS2(); };
  el('s2Primary').onchange = () => { s2.primary = el('s2Primary').value; renderS2(); };
  el('s2Compare').onchange = () => { s2.compare = el('s2Compare').value; renderS2(); };
  refreshS2Selectors(); renderS2();
}
function refreshS2Selectors() {
  if (s2.mode === 'country') {
    const cs = uniq(D.lodging.filter((r) => r.country !== '総数').map((r) => r.country)).sort(jp);
    fillSelect(el('s2Primary'), cs.map((c) => [c, c]), cs.includes('韓国') ? '韓国' : cs[0]);
    fillSelect(el('s2Compare'), [['', '比較なし'], ...cs.map((c) => [c, c])], '');
  } else {
    const ps = uniq(D.lodging.map((r) => r.pref));
    fillSelect(el('s2Primary'), ps.map((p) => [p, p]), ps.includes('東京都') ? '東京都' : ps[0]);
    fillSelect(el('s2Compare'), [['', '比較なし'], ...ps.map((p) => [p, p])], '');
  }
  s2.primary = el('s2Primary').value; s2.compare = '';
}
function nightsFor(filterFn) {
  const months = s2.period === 'latest' ? [lodgingMonths().slice(-1)[0]] : last12();
  return sum(D.lodging.filter((r) => months.includes(r.ym) && r.nights != null && filterFn(r)).map((r) => r.nights));
}
function renderS2() {
  const periodLabel = s2.period === 'latest' ? lodgingMonths().slice(-1)[0] : `直近12ヶ月(${last12()[0]}〜${last12().slice(-1)[0]})`;
  let rankItems = [], rankTitle = '', rankSub = '', metrics = '';
  const months = s2.period === 'latest' ? [lodgingMonths().slice(-1)[0]] : last12();
  if (s2.mode === 'country') {
    rankTitle = `${s2.primary} の訪問先（都道府県）ランキング`;
    rankSub = `外国人延べ宿泊者数・${periodLabel}`;
    const byPref = {};
    D.lodging.filter((r) => r.country === s2.primary && months.includes(r.ym) && r.nights != null)
      .forEach((r) => byPref[r.pref] = (byPref[r.pref] || 0) + r.nights);
    rankItems = Object.entries(byPref).map(([k, v]) => ({ label: k, value: v, color: '#1d4ed8' })).sort((a, b) => b.value - a.value);
    const total = sum(rankItems.map((x) => x.value));
    const top3 = sum(rankItems.slice(0, 3).map((x) => x.value));
    metrics = metric('延べ宿泊(全国計)', fmtN(total), periodLabel)
      + metric('最大の訪問先', rankItems[0] ? rankItems[0].label : '-', rankItems[0] ? fmtN(rankItems[0].value) : '')
      + metric('上位3都道府県 集中度', total ? (top3/total*100).toFixed(1) + '%' : '-', '都市集中の度合い')
      + metric('訪問先 都道府県数', rankItems.filter((x) => x.value > 0).length, '宿泊実績あり');
  } else {
    rankTitle = `${s2.primary} への客源国ランキング`;
    rankSub = `外国人延べ宿泊者数・${periodLabel}`;
    const byC = {};
    D.lodging.filter((r) => r.pref === s2.primary && r.country !== '総数' && months.includes(r.ym) && r.nights != null)
      .forEach((r) => byC[r.country] = (byC[r.country] || 0) + r.nights);
    rankItems = Object.entries(byC).map(([k, v]) => ({ label: k, value: v, color: '#0d9488' })).sort((a, b) => b.value - a.value);
    const total = nightsFor((r) => r.pref === s2.primary && r.country === '総数');
    const top3 = sum(rankItems.slice(0, 3).map((x) => x.value));
    metrics = metric('外国人延べ宿泊(総数)', fmtN(total), periodLabel)
      + metric('最大の客源国', rankItems[0] ? rankItems[0].label : '-', rankItems[0] ? fmtN(rankItems[0].value) : '')
      + metric('上位3国 集中度', total ? (top3/total*100).toFixed(1) + '%' : '-', '客源の偏り')
      + metric('客源 国・地域数', rankItems.filter((x) => x.value > 0).length, '宿泊実績あり');
  }
  el('s2RankTitle').textContent = rankTitle; el('s2RankSub').textContent = rankSub;
  el('s2Metrics').innerHTML = metrics;
  barH(el('s2Rank'), rankItems, { top: 15, labelW: 76 });
  // trend (monthly) for primary (+compare)
  const allM = lodgingMonths();
  const trendOf = (key) => {
    const map = {};
    allM.forEach((m) => {
      let v;
      if (s2.mode === 'country') v = sum(D.lodging.filter((r) => r.country === key && r.ym === m && r.nights != null).map((r) => r.nights));
      else v = sum(D.lodging.filter((r) => r.pref === key && r.country === '総数' && r.ym === m && r.nights != null).map((r) => r.nights));
      map[m] = v;
    });
    return map;
  };
  const series = [{ name: s2.primary, color: '#1d4ed8', data: trendOf(s2.primary) }];
  if (s2.compare) series.push({ name: s2.compare, color: '#c2410c', data: trendOf(s2.compare) });
  el('s2TrendSub').textContent = s2.mode === 'country' ? `${s2.primary}${s2.compare ? ' vs ' + s2.compare : ''} の全国計・月次` : `${s2.primary}${s2.compare ? ' vs ' + s2.compare : ''}（総数）の月次`;
  lineChart(el('s2Trend'), allM, series, { yLabel: '人泊', xfmt: (k) => k.slice(2) });
  legend(el('s2TrendLegend'), series.map((s) => [s.name, s.color]));
}

/* ================= Section 3: 空港別 ================= */
const s3 = { airport: '成田' };
function buildS3() {
  const aps = uniq(D.flights.filter((r) => r.season === FLIGHT_SEASON).map((r) => r.airport));
  // sort by flights desc
  const ord = aps.map((a) => [a, sum(D.flights.filter((r) => r.season === FLIGHT_SEASON && r.airport === a).map((r) => r.flights))]).sort((x, y) => y[1] - x[1]).map((x) => x[0]);
  fillSelect(el('s3Airport'), ord.map((a) => [a, a]), '成田');
  el('s3Airport').onchange = () => { s3.airport = el('s3Airport').value; renderS3(); };
  renderS3();
}
function renderS3() {
  const rows = D.flights.filter((r) => r.season === FLIGHT_SEASON && r.airport === s3.airport);
  const total = sum(rows.map((r) => r.flights));
  const byC = {}; rows.forEach((r) => byC[r.country] = (byC[r.country] || 0) + r.flights);
  const items = Object.entries(byC).map(([k, v]) => ({ label: k, value: v, color: '#1d4ed8' })).sort((a, b) => b.value - a.value);
  const major = rows[0] ? rows[0].major : false;
  // 最新の空港別総便数（航空局スケジュール発表: 2025夏期まで。個別の地方空港は『地方空港計』に内包）
  const TREND_NAMES = ['成田','羽田','関西','中部','福岡','地方空港計'];
  let latestAgg = null, latestNote = '地方空港計に内包';
  if (TREND_NAMES.includes(s3.airport)) {
    const ft = D.ftrend.find((r) => r.type === 'airport' && r.name === s3.airport && r.season === '2025S');
    if (ft) { latestAgg = ft.val; latestNote = '2025夏期・航空局公表'; }
  }
  el('s3Metrics').innerHTML = metric('便数 2023冬ダイヤ(週)', fmtN(total), s3.airport + '・路線明細(公表最新)')
    + metric('便数 2025夏期(週)', latestAgg != null ? fmtN(latestAgg) : '—', latestNote)
    + metric('就航 国・地域数', items.length, '2023冬ダイヤ時点')
    + metric('空港区分', major ? '主要5空港' : '地方空港', '');
  el('s3CountryTitle').textContent = `${s3.airport}：就航国・地域別の便数`;
  el('s3CountrySub').textContent = '週間便数・2023年冬ダイヤ（航空局が公表する最新の路線明細。2024/2025年の明細は未公表）';
  barH(el('s3Country'), items, { top: 15, labelW: 84, fmt: (v) => fmtN(v) + '便' });
  // trend lines (airport seasonal)
  const seasons = uniq(D.ftrend.filter((r) => r.type === 'airport').map((r) => r.season)).sort((a, b) => (D.ftrend.find((x)=>x.season===a).order) - (D.ftrend.find((x)=>x.season===b).order));
  const names = ['成田','羽田','関西','中部','福岡','地方空港計'];
  const series = names.map((n, i) => ({ name: n, color: COLORS[i % COLORS.length], w: (n === s3.airport ? 3.4 : 1.6),
    data: Object.fromEntries(D.ftrend.filter((r) => r.type === 'airport' && r.name === n).map((r) => [r.season, r.val])) }));
  lineChart(el('s3Trend'), seasons, series, { yLabel: '便/週', dots: false });
  legend(el('s3TrendLegend'), names.map((n, i) => [n, COLORS[i % COLORS.length]]));
  renderMatrix();
}
function renderMatrix() {
  const cols = ['成田','羽田','関西','中部','福岡','その他(地方)'];
  const rows = D.flights.filter((r) => r.season === FLIGHT_SEASON);
  const byCountry = {};
  rows.forEach((r) => { const col = ['成田','羽田','関西','中部','福岡'].includes(r.airport) ? r.airport : 'その他(地方)';
    (byCountry[r.country] = byCountry[r.country] || {})[col] = (byCountry[r.country][col] || 0) + r.flights; });
  const totals = Object.entries(byCountry).map(([c, m]) => [c, sum(Object.values(m))]).sort((a, b) => b[1] - a[1]).slice(0, 15);
  const max = Math.max(...rows.map((r) => r.flights), 1);
  let h = '<thead><tr><th class="name">国・地域＼空港</th>' + cols.map((c) => `<th>${c}</th>`).join('') + '<th>計</th></tr></thead><tbody>';
  totals.forEach(([c, t]) => {
    h += `<tr><td class="name">${c}</td>` + cols.map((col) => {
      const v = (byCountry[c] && byCountry[c][col]) || 0;
      const a = v ? (0.12 + 0.78 * Math.min(v / 200, 1)) : 0;
      return `<td class="num" style="background:rgba(29,78,216,${a.toFixed(2)});color:${a > 0.5 ? '#fff' : '#334155'}">${v ? fmtN(v) : ''}</td>`;
    }).join('') + `<td class="num"><strong>${fmtN(t)}</strong></td></tr>`;
  });
  h += '</tbody>';
  el('s3Matrix').innerHTML = h;
}

/* ---------- shared ---------- */
function metric(label, value, small, cls) {
  return `<div class="metric"><span>${label}</span><strong${cls ? ` style="color:${cls==='pos'?'#16a34a':'#dc2626'}"` : ''}>${value}</strong><small>${small || ''}</small></div>`;
}

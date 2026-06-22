/* =====================================================================
   アクセス解析（Google Analytics 4）＋ Cookie告知バー  共有スクリプト
   方式: オプトアウト（日本の一般的な運用）
   ---------------------------------------------------------------------
   - 既定でGAを読み込み、初回訪問時に「Cookieを利用します／拒否可」の
     告知バーを表示します（明示的な事前同意は求めません）。
   - 訪問者が「拒否する」を押すと計測を停止し、以後も無効化します。
   - 画面右下「Cookie設定」からいつでも拒否/許可を変更できます。
   使い方:
   1) 下の GA_MEASUREMENT_ID を自分のGA4測定ID（G-65P50TCQZF）に置換。
   2) 各HTMLの <head> に <script src="analytics.js" defer></script>（設定済み）。
   - 測定IDが未設定（プレースホルダー）の場合、GAは読み込まれません（安全）。
   ===================================================================== */
(function () {
  'use strict';
  // ▼▼▼ ここに取得した測定IDを貼り付け（例: 'G-ABCDE12345'）▼▼▼
  var GA_MEASUREMENT_ID = 'G-65P50TCQZF';
  // ▲▲▲ -------------------------------------------------- ▲▲▲

  var KEY = 'inbound_analytics_consent'; // 'denied' | 'ack'（=告知確認済み・許可）
  var isPlaceholder = /XXXX/.test(GA_MEASUREMENT_ID);
  var DISABLE_FLAG = 'ga-disable-' + GA_MEASUREMENT_ID;

  function getState() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function setState(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  function loadGA() {
    if (isPlaceholder) { console.info('[analytics] GA測定ID未設定のため計測は無効です。'); return; }
    if (window.__gaLoaded) return; window.__gaLoaded = true;
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, { anonymize_ip: true });
  }

  function optOut() { window[DISABLE_FLAG] = true; setState('denied'); }
  function optIn() { window[DISABLE_FLAG] = false; setState('ack'); loadGA(); }

  function injectStyles() {
    if (document.getElementById('cc-style')) return;
    var css = document.createElement('style'); css.id = 'cc-style';
    css.textContent =
      '#cc-banner{position:fixed;left:16px;right:16px;bottom:16px;max-width:760px;margin:0 auto;background:#0f172a;color:#e2e8f0;' +
      'border-radius:14px;padding:14px 18px;box-shadow:0 10px 30px rgba(0,0,0,.25);font-size:13px;line-height:1.7;z-index:9999;' +
      'display:flex;gap:14px;flex-wrap:wrap;align-items:center;justify-content:space-between;}' +
      '#cc-banner p{margin:0;flex:1 1 320px;}#cc-banner a{color:#93c5fd;}' +
      '#cc-banner .cc-btns{display:flex;gap:8px;flex-wrap:wrap;}' +
      '#cc-banner button{font-size:13px;padding:8px 16px;border-radius:8px;border:0;cursor:pointer;}' +
      '#cc-ok{background:#2563eb;color:#fff;}#cc-deny{background:#334155;color:#e2e8f0;}' +
      '#cc-settings{position:fixed;right:14px;bottom:14px;font-size:11px;color:#64748b;background:#fff;border:1px solid #e2e8f0;' +
      'border-radius:999px;padding:5px 12px;cursor:pointer;z-index:9998;}';
    document.head.appendChild(css);
  }

  function showNotice() {
    injectStyles();
    if (document.getElementById('cc-banner')) return;
    var b = document.createElement('div'); b.id = 'cc-banner';
    b.innerHTML =
      '<p>当サイトでは、利用状況の把握のため Google Analytics（Cookie）を使用します。' +
      '計測を希望されない場合は「拒否する」を押してください。' +
      '<a href="privacy.html">プライバシーポリシー</a></p>' +
      '<span class="cc-btns"><button id="cc-deny">拒否する</button>' +
      '<button id="cc-ok">OK</button></span>';
    document.body.appendChild(b);
    document.getElementById('cc-ok').onclick = function () { optIn(); close(); };
    document.getElementById('cc-deny').onclick = function () { optOut(); close(); };
  }
  function close() { var b = document.getElementById('cc-banner'); if (b) b.remove(); ensureSettingsLink(); }

  function ensureSettingsLink() {
    if (document.getElementById('cc-settings')) return;
    injectStyles();
    var s = document.createElement('button'); s.id = 'cc-settings'; s.textContent = 'Cookie設定';
    s.onclick = function () { s.remove(); showNotice(); };
    document.body.appendChild(s);
  }

  function start() {
    var st = getState();
    if (st === 'denied') { window[DISABLE_FLAG] = true; ensureSettingsLink(); }   // 計測しない
    else if (st === 'ack') { loadGA(); ensureSettingsLink(); }                    // 許可済み
    else { loadGA(); showNotice(); }   // オプトアウト方式: 既定で計測しつつ初回告知
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

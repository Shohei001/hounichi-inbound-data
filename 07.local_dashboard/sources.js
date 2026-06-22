const SOURCES_PATH = '../06.raw_data/inbound_data_sources.csv';

const sourceElements = {
  count: document.getElementById('sourceCount'),
  tableBody: document.getElementById('sourceTableBody'),
};

loadSources();

async function loadSources() {
  try {
    const text = await loadCsvText(SOURCES_PATH);
    const rows = parseCsv(text).filter((row) => row.source_id && row.name);
    sourceElements.count.textContent = `${rows.length}件`;
    sourceElements.tableBody.innerHTML = rows.map(sourceRowHtml).join('');
  } catch (error) {
    sourceElements.count.textContent = '-';
    sourceElements.tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty">データソースCSVを読み込めませんでした: ${escapeHtml(error.message)}</td>
      </tr>
    `;
  }
}

async function loadCsvText(path) {
  if (location.protocol === 'file:') {
    throw new Error('ローカルサーバー経由で開いてください');
  }
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`CSVの読み込みに失敗しました: ${response.status}`);
  }
  return response.text();
}

function sourceRowHtml(row) {
  return `
    <tr>
      <td>${badgeHtml(row.badges || row.category)}</td>
      <td><strong>${escapeHtml(row.name)}</strong></td>
      <td>${escapeHtml(row.description)}</td>
      <td>${escapeHtml(row.update_frequency)}</td>
      <td>${escapeHtml(row.latest_update)}</td>
      <td><strong class="next-check">${escapeHtml(row.next_check)}</strong></td>
      <td>${escapeHtml(row.usage)}</td>
      <td><a href="${escapeHtml(row.url)}" target="_blank" rel="noreferrer">開く</a></td>
    </tr>
  `;
}

function badgeHtml(value) {
  return String(value)
    .split('|')
    .filter(Boolean)
    .map((label) => `<span class="source-badge ${badgeClass(label)}">${escapeHtml(label)}</span>`)
    .join('');
}

function badgeClass(label) {
  const map = {
    公的: 'official',
    民間: 'private',
    官民: 'private',
    定量: 'quantitative',
    定性: 'qualitative',
    ニュース: 'qualitative',
    可視化: 'dashboard',
    予定: 'schedule',
    外部要因: 'external',
    地域: 'regional',
    政策: 'qualitative',
  };
  return map[label] || '';
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(value);
      value = '';
    } else if (char === '\n') {
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else if (char !== '\r') {
      value += char;
    }
  }

  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }

  const headers = rows.shift().map((header) => header.replace(/^\uFEFF/, ''));
  return rows.filter((items) => items.some(Boolean)).map((items) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = items[index] || '';
    });
    return record;
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

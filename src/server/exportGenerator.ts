import { ReportOutput } from './types.js';

export function generateStandaloneHtml(report: ReportOutput): string {
  const jsonString = JSON.stringify(report).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Laporan Keputusan: ${escapeHtml(report.productName)}</title>
  <style>
    :root { --font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--font-sans); background: #f8fafc; color: #0f172a; line-height: 1.5; padding-bottom: 80px; }
    .container { max-width: 1100px; margin: 0 auto; padding: 0 16px; }
    header.hero { background: #ffffff; border-bottom: 1px solid #e2e8f0; padding: 40px 0; }
    .hero-grid { display: grid; grid-template-columns: 1fr; gap: 32px; }
    @media (min-width: 900px) { .hero-grid { grid-template-columns: 1.5fr 1fr; align-items: center; } }
    .badge { display: inline-block; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; padding: 4px 10px; border-radius: 9999px; background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; margin-bottom: 12px; }
    h1 { font-size: 32px; font-weight: 900; line-height: 1.2; color: #0f172a; margin-bottom: 12px; }
    .score-card { background: #020617; color: #ffffff; padding: 28px; border-radius: 24px; border: 1px solid #1e293b; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
    .score-val { font-size: 48px; font-weight: 900; line-height: 1; }
    .score-max { font-size: 18px; color: #64748b; font-weight: 700; margin-left: 4px; }
    .score-row { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 16px; border-bottom: 1px solid #1e293b; margin-bottom: 16px; }
    .verdict-row { display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; border-bottom: 1px solid #1e293b; font-size: 14px; }
    .verdict-val { font-weight: 800; color: #34d399; }
    .grid-layout { display: grid; grid-template-columns: 1fr; gap: 32px; margin-top: 32px; }
    @media (min-width: 900px) { .grid-layout { grid-template-columns: 2fr 1fr; } }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 24px; margin-bottom: 24px; }
    .card h2 { font-size: 20px; font-weight: 900; margin-bottom: 16px; }
    .spec-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
    .spec-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
    .spec-table tr:hover { background: #f8fafc; }
    .spec-table td.label { font-weight: 700; color: #475569; width: 35%; }
    .spec-table td.val { font-weight: 600; color: #0f172a; }
    .cite-btn { display: inline-block; font-family: monospace; font-size: 11px; font-weight: 700; padding: 1px 6px; border-radius: 4px; background: #eff6ff; color: #2563eb; border: 1px solid #dbeafe; cursor: pointer; text-decoration: none; margin-left: 4px; }
    .cite-btn:hover { background: #dbeafe; }
    .progress-bar { width: 100%; height: 8px; background: #e2e8f0; border-radius: 9999px; overflow: hidden; margin-top: 6px; }
    .progress-fill { height: 100%; background: #2563eb; border-radius: 9999px; }
    .box-green { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 20px; padding: 20px; margin-bottom: 20px; color: #064e3b; }
    .box-amber { background: #fffbeb; border: 1px solid #fde68a; border-radius: 20px; padding: 20px; margin-bottom: 20px; color: #78350f; }
    .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(2px); z-index: 999; align-items: center; justify-content: center; padding: 16px; }
    .modal-overlay.active { display: flex; }
    .modal-box { background: #ffffff; border-radius: 20px; max-width: 600px; width: 100%; max-height: 85vh; overflow-y: auto; padding: 24px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <header class="hero">
    <div class="container">
      <div class="hero-grid">
        <div>
          <span class="badge">Laporan Evaluasi Keputusan Deterministik</span>
          <h1>${escapeHtml(report.productName)}</h1>
          <p style="color: #64748b; font-size: 15px; margin-bottom: 16px;">
            Laporan independen berbasis bukti terverifikasi dengan cakupan data ${report.coveragePercent}%.
          </p>
          <div style="font-size: 12px; color: #475569; font-weight: 600;">
            ID Laporan: <code>${escapeHtml(report.reportId)}</code> · Digenerate: ${escapeHtml(report.dateGenerated.split('T')[0])}
          </div>
        </div>
        <div>
          <div class="score-card">
            <div class="score-row">
              <div>
                <span style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 700;">Skor Keputusan</span>
              </div>
              <div class="score-val">
                ${report.overallScore !== null ? report.overallScore.toFixed(1) : '-'}<span class="score-max">/5.0</span>
              </div>
            </div>
            <div class="verdict-row">
              <span style="color: #94a3b8;">Status Rekomendasi</span>
              <span class="verdict-val">${escapeHtml(report.decisionLabel)}</span>
            </div>
            <div class="verdict-row">
              <span style="color: #94a3b8;">Tingkat Keyakinan</span>
              <span style="font-weight: 800; color: #60a5fa;">${escapeHtml(report.confidenceLabel)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>

  <main class="container">
    <div class="grid-layout">
      <div>
        <!-- Quick Decision -->
        <div class="box-green">
          <h3 style="font-size: 16px; font-weight: 800; margin-bottom: 10px;">✅ Sangat Cocok Untuk:</h3>
          <ul style="font-size: 13px; font-weight: 600; padding-left: 20px;">
            ${report.quickDecision.recommendedFor.map(r => `
              <li style="margin-bottom: 6px;">
                ${escapeHtml(r.text)}
                ${r.evidenceIds.map(id => `<button class="cite-btn" onclick="openEvidence('${escapeHtml(id)}')">[${escapeHtml(id)}]</button>`).join(' ')}
              </li>
            `).join('')}
          </ul>
        </div>

        ${report.quickDecision.notRecommendedFor.length > 0 ? `
        <div class="box-amber">
          <h3 style="font-size: 16px; font-weight: 800; margin-bottom: 10px;">⚠️ Perlu Dipertimbangkan:</h3>
          <ul style="font-size: 13px; font-weight: 600; padding-left: 20px;">
            ${report.quickDecision.notRecommendedFor.map(r => `
              <li style="margin-bottom: 6px;">
                ${escapeHtml(r.text)}
                ${r.evidenceIds.map(id => `<button class="cite-btn" onclick="openEvidence('${escapeHtml(id)}')">[${escapeHtml(id)}]</button>`).join(' ')}
              </li>
            `).join('')}
          </ul>
        </div>
        ` : ''}

        <!-- 7 Criteria Breakdown -->
        <div class="card">
          <h2>Evaluasi 7 Kriteria</h2>
          <div style="display: flex; flex-direction: column; gap: 16px;">
            ${Object.values(report.criteriaScores).map(c => `
              <div style="border: 1px solid #f1f5f9; padding: 12px 16px; border-radius: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px;">
                  <span style="font-weight: 800;">${escapeHtml(c.criterionNameId)}</span>
                  <span style="font-weight: 800; font-family: monospace;">${c.score !== null ? c.score.toFixed(1) + ' / 5.0' : 'UNRATED'}</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${c.score !== null ? (c.score / 5) * 100 : 0}%;"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Spec Table -->
        <div class="card">
          <h2>Spesifikasi Teknis (Bukti Terverifikasi)</h2>
          ${report.specTable.map(group => `
            <div style="margin-bottom: 16px;">
              <h3 style="font-size: 13px; text-transform: uppercase; font-weight: 800; color: #64748b; margin-bottom: 8px;">${escapeHtml(group.topicLabel)}</h3>
              <table class="spec-table">
                <tbody>
                  ${group.rows.map(row => `
                    <tr>
                      <td class="label">${escapeHtml(row.label)}</td>
                      <td class="val">
                        ${escapeHtml(row.value)}
                        ${row.evidenceIds.map(id => `<button class="cite-btn" onclick="openEvidence('${escapeHtml(id)}')">[${escapeHtml(id)}]</button>`).join(' ')}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Sidebar -->
      <div>
        <div class="card">
          <h2>Ringkasan Harga</h2>
          <div style="font-size: 24px; font-weight: 900; color: #ea580c; margin-bottom: 8px;">
            ${report.priceSummary.min !== null ? 'Rp ' + report.priceSummary.min.toLocaleString('id-ID') : 'Tidak Tersedia'}
          </div>
          <p style="font-size: 12px; color: #64748b;">
            Rentang data tercatat: ${escapeHtml(report.capturedAtRange.earliest)} s/d ${escapeHtml(report.capturedAtRange.latest)}
          </p>
        </div>

        <div class="card">
          <h2>Pendorong Skor & Pengurang</h2>
          <div style="font-size: 12px;">
            ${report.strengths.map(s => `
              <div style="margin-bottom: 10px; padding: 8px; background: #ecfdf5; border-radius: 8px;">
                <strong>+ ${escapeHtml(s.title)}</strong>
                <p style="color: #475569; margin-top: 4px;">${escapeHtml(s.description)}</p>
              </div>
            `).join('')}
            ${report.tradeoffs.map(t => `
              <div style="margin-bottom: 10px; padding: 8px; background: #fef2f2; border-radius: 8px;">
                <strong style="color: #991b1b;">− ${escapeHtml(t.title)}</strong>
                <p style="color: #475569; margin-top: 4px;">${escapeHtml(t.description)}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  </main>

  <!-- Evidence Inspector Modal (Offline Standalone) -->
  <div id="modal" class="modal-overlay" onclick="closeModal(event)">
    <div class="modal-box" onclick="event.stopPropagation()">
      <div class="modal-header">
        <h3 id="modal-id" style="font-family: monospace; font-size: 14px; font-weight: 800; color: #2563eb;"></h3>
        <button onclick="closeModal()" style="border: none; background: transparent; font-size: 20px; cursor: pointer; color: #64748b;">&times;</button>
      </div>
      <div id="modal-body" style="font-size: 13px; line-height: 1.6;"></div>
    </div>
  </div>

  <script id="report-data" type="application/json">
    ${jsonString}
  </script>

  <script>
    const report = JSON.parse(document.getElementById('report-data').textContent);
    window.__REPORT_DATA__ = report;
    const pool = new Map(report.evidencePool.map(e => [e.evidence_id, e]));

    function openEvidence(id) {
      const e = pool.get(id);
      if (!e) return;
      document.getElementById('modal-id').textContent = id;
      document.getElementById('modal-body').innerHTML = \`
        <div style="margin-bottom: 12px;">
          <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b;">Klaim:</span>
          <p style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px;">"\${e.claim}"</p>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
          <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b;">Kutipan Sumber Verbatim:</span>
          <p style="font-style: italic; color: #334155; margin-top: 2px;">"\${e.source_excerpt}"</p>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px; margin-bottom: 12px;">
          <div><strong>Sumber:</strong> \${e.source}</div>
          <div><strong>Tipe Bukti:</strong> \${e.type}</div>
          <div><strong>Timestamp:</strong> \${e.timestamp_start || '-'}</div>
          <div><strong>Status Validasi:</strong> \${e.validation ? e.validation.finalStatus : 'VALID'}</div>
        </div>
      \`;
      document.getElementById('modal').classList.add('active');
    }

    function closeModal() {
      document.getElementById('modal').classList.remove('active');
    }
  </script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

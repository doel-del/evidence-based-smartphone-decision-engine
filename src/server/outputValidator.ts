import { ReportOutput } from './types.js';

export class OutputValidationError extends Error {
  constructor(message: string) {
    super(`OUTPUT_VALIDATION_ERROR: ${message}`);
    this.name = 'OutputValidationError';
  }
}

/**
 * Validates that every section and sentence in the final report carries valid evidence IDs
 * that exist within the report's evidence pool.
 * Fails report generation if any claim or item is unsupported.
 */
export function validateReportOutput(report: ReportOutput): void {
  const validIds = new Set(report.evidencePool.map(e => e.evidence_id));

  const checkEvidenceIds = (ids: string[] | undefined, contextName: string) => {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new OutputValidationError(`Konten pada '${contextName}' tidak memiliki evidenceIds pendukung.`);
    }
    for (const id of ids) {
      if (!validIds.has(id)) {
        throw new OutputValidationError(
          `ID bukti '${id}' pada '${contextName}' tidak ditemukan dalam repositori bukti tervalidasi.`
        );
      }
    }
  };

  // 1. Validate Criteria Scores & Drivers
  for (const [cid, cs] of Object.entries(report.criteriaScores)) {
    if (cs.isRated) {
      checkEvidenceIds(cs.evidenceIdsUsed, `Kriteria ${cid} (evidenceIdsUsed)`);
      for (let i = 0; i < cs.positiveDrivers.length; i++) {
        checkEvidenceIds(cs.positiveDrivers[i].evidenceIds, `Kriteria ${cid} driver positif #${i + 1}`);
      }
      for (let i = 0; i < cs.negativeDeductions.length; i++) {
        checkEvidenceIds(cs.negativeDeductions[i].evidenceIds, `Kriteria ${cid} pemangkas negatif #${i + 1}`);
      }
    }
  }

  // 2. Validate Strengths
  for (let i = 0; i < report.strengths.length; i++) {
    const s = report.strengths[i];
    checkEvidenceIds(s.evidenceIds, `Kelebihan utama #${i + 1} (${s.title})`);
  }

  // 3. Validate Tradeoffs
  for (let i = 0; i < report.tradeoffs.length; i++) {
    const t = report.tradeoffs[i];
    checkEvidenceIds(t.evidenceIds, `Kekurangan utama #${i + 1} (${t.title})`);
  }

  // 4. Validate Decision Reasons
  for (let i = 0; i < report.decisionReasons.length; i++) {
    const dr = report.decisionReasons[i];
    checkEvidenceIds(dr.evidenceIds, `Alasan keputusan #${i + 1} (${dr.title})`);
  }

  // 5. Validate Quick Decision
  for (let i = 0; i < report.quickDecision.recommendedFor.length; i++) {
    checkEvidenceIds(report.quickDecision.recommendedFor[i].evidenceIds, `Cocok Untuk #${i + 1}`);
  }
  for (let i = 0; i < report.quickDecision.notRecommendedFor.length; i++) {
    checkEvidenceIds(report.quickDecision.notRecommendedFor[i].evidenceIds, `Kurang Cocok #${i + 1}`);
  }

  // 6. Validate Specification Table
  for (const group of report.specTable) {
    for (const row of group.rows) {
      checkEvidenceIds(row.evidenceIds, `Tabel Spesifikasi: ${group.topicLabel} - ${row.label}`);
    }
  }

  // 7. Validate Claim vs Reality
  for (const cr of report.claimVsReality) {
    checkEvidenceIds(cr.evidenceIds, `Klaim vs Realita: ${cr.metric}`);
  }

  // 8. Validate Reviewer Quotes
  for (const q of report.quotes) {
    checkEvidenceIds(q.evidenceIds, `Kutipan Reviewer: ${q.source}`);
  }

  // 9. Validate Alternatives
  for (const alt of report.alternatives) {
    checkEvidenceIds(alt.evidenceIds, `Alternatif Pesaing: ${alt.productName}`);
  }

  // 10. Validate FAQ
  for (const faq of report.faq) {
    checkEvidenceIds(faq.evidenceIds, `FAQ: ${faq.question}`);
  }
}

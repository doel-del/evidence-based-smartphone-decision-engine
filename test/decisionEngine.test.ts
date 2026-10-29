import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { generateSmartphoneReport } from '../src/server/decisionEngine.js';
import { RawEvidenceRecord, ReportOutput } from '../src/server/types.js';
import { validateReportOutput, OutputValidationError } from '../src/server/outputValidator.js';
import { generateStandaloneHtml } from '../src/server/exportGenerator.js';
import { normalizeValueAndUnit, verifyRealEvidenceMatch, ingestAndNormalizeEvidence } from '../src/server/evidenceNormalizer.js';
import { detectGenericConflicts } from '../src/server/conflictDetector.js';

console.log('--- STARTING GENERIC DECISION ENGINE TEST SUITE ---');

let passedTests = 0;
let totalTests = 0;

function it(desc: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ PASS: ${desc}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ✗ FAIL: ${desc}`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

// 1. Requirement: Generic Execution on 2 Different Smartphones
it('executes generic decision pipeline on 2 completely different smartphones', () => {
  // Smartphone 1: Samsung Galaxy A26 5G from data/
  const a26Data: RawEvidenceRecord[] = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'data/evidence_data_94.json'), 'utf-8')
  );
  const report1 = generateSmartphoneReport(a26Data);
  assert.strictEqual(report1.productName, 'Samsung Galaxy A26 5G');
  assert.ok(report1.overallScore !== null && report1.overallScore >= 0 && report1.overallScore <= 5);
  assert.ok(report1.evidencePool.length >= 5);
  assert.ok(report1.specTable.length > 0);

  // Smartphone 2: Google Pixel 8a from fixtures/phone_b.json
  const px8aData: RawEvidenceRecord[] = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'fixtures/phone_b.json'), 'utf-8')
  );
  const report2 = generateSmartphoneReport(px8aData);
  assert.strictEqual(report2.productName, 'Google Pixel 8a');
  assert.ok(report2.overallScore !== null && report2.overallScore >= 0 && report2.overallScore <= 5);
  assert.strictEqual(report2.decisionStatus, 'PUBLISHED');
  assert.ok(report2.strengths.length > 0 || report2.tradeoffs.length > 0);
  assert.notStrictEqual(report1.productName, report2.productName);
});

// 2. Requirement: Mutation Test (88 min vs 45 min charging time)
it('mutation test: faster charging duration (88m -> 45m) strictly increases battery criteria score', () => {
  const baseFixture: RawEvidenceRecord[] = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'fixtures/phone_b.json'), 'utf-8')
  );

  // Fixture A: 88 mins charging
  const recordsSlow = baseFixture.map(r => {
    if (r.attribute === 'charging_duration' || r.subtopic === 'charging_time') {
      return {
        ...r,
        value: 88,
        unit: 'menit',
        claim: 'Pengisian daya penuh membutuhkan 88 menit',
        source_excerpt: 'Pengisian daya penuh membutuhkan 88 menit dengan charger bawaan.'
      };
    }
    return r;
  });

  // Fixture B: 45 mins charging (fast)
  const recordsFast = baseFixture.map(r => {
    if (r.attribute === 'charging_duration' || r.subtopic === 'charging_time') {
      return {
        ...r,
        value: 45,
        unit: 'menit',
        claim: 'Pengisian daya penuh membutuhkan 45 menit',
        source_excerpt: 'Pengisian daya penuh membutuhkan 45 menit dengan charger super cepat.'
      };
    }
    return r;
  });

  const reportSlow = generateSmartphoneReport(recordsSlow);
  const reportFast = generateSmartphoneReport(recordsFast);

  const batteryScoreSlow = reportSlow.criteriaScores.battery_and_charging.score!;
  const batteryScoreFast = reportFast.criteriaScores.battery_and_charging.score!;

  assert.ok(
    batteryScoreFast > batteryScoreSlow,
    `Expected fast charging (45m: score ${batteryScoreFast}) to beat slow charging (88m: score ${batteryScoreSlow})`
  );
});

// 3. Requirement: Empty Evidence input yields INSUFFICIENT_EVIDENCE
it('yields INSUFFICIENT_EVIDENCE and null score on empty evidence', () => {
  const emptyReport = generateSmartphoneReport([]);
  assert.strictEqual(emptyReport.decisionStatus, 'INSUFFICIENT_EVIDENCE');
  assert.strictEqual(emptyReport.overallScore, null);
  assert.strictEqual(emptyReport.decisionLabel, 'Data Tidak Mencukupi');
});

// 4. Requirement: Minimum Gate: < 5 valid records yields INSUFFICIENT_EVIDENCE
it('gate check: rejects or marks INSUFFICIENT_EVIDENCE when valid records < 5', () => {
  const baseFixture: RawEvidenceRecord[] = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'fixtures/phone_b.json'), 'utf-8')
  );
  const sub5 = baseFixture.slice(0, 3); // only 3 records

  const report = generateSmartphoneReport(sub5);
  assert.strictEqual(report.decisionStatus, 'INSUFFICIENT_EVIDENCE');
  assert.strictEqual(report.overallScore, null);
  assert.strictEqual(report.decisionLabel, 'Data Tidak Mencukupi');
});

// 5. Requirement: 1-source input caps confidence to LOW
it('caps confidence to LOW when evidence comes from only 1 independent source', () => {
  const baseFixture: RawEvidenceRecord[] = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'fixtures/phone_b.json'), 'utf-8')
  );
  // Force all records to come from single source
  const singleSource = baseFixture.map(r => ({
    ...r,
    source: 'TechReview ID'
  }));

  const report = generateSmartphoneReport(singleSource);
  assert.strictEqual(report.independentSourceCount, 1);
  assert.strictEqual(report.confidenceLabel, 'LOW');
});

// 6. Requirement: Generic Conflict Detection (Victus vs Victus+)
it('detects generic conflict for protection_glass and flags unresolved conflict', () => {
  const baseFixture: RawEvidenceRecord[] = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'fixtures/phone_b.json'), 'utf-8')
  );

  const conflictFixture: RawEvidenceRecord[] = [
    ...baseFixture,
    {
      evidence_id: 'glass-src-1',
      product_name: 'Google Pixel 8a',
      captured_at: '2025-02-10',
      source: 'Source A',
      review_id: 'rev-a',
      video_url: 'https://youtube.com/a',
      video_title: 'Review A',
      timestamp_start: '01:00',
      timestamp_end: '01:30',
      topic: 'durability',
      subtopic: 'screen_protection',
      attribute: 'protection_glass',
      value: 'Corning Gorilla Glass Victus',
      unit: null,
      claim: 'Layar dilindungi Corning Gorilla Glass Victus',
      source_excerpt: 'Layar dilindungi Corning Gorilla Glass Victus standar.',
      type: 'FACT',
      certainty: 'explicit',
      context: 'Proteksi kaca',
      validation: { status: 'PASS' }
    },
    {
      evidence_id: 'glass-src-2',
      product_name: 'Google Pixel 8a',
      captured_at: '2025-02-12',
      source: 'Source B',
      review_id: 'rev-b',
      video_url: 'https://youtube.com/b',
      video_title: 'Review B',
      timestamp_start: '02:00',
      timestamp_end: '02:30',
      topic: 'durability',
      subtopic: 'screen_protection',
      attribute: 'protection_glass',
      value: 'Corning Gorilla Glass Victus Plus',
      unit: null,
      claim: 'Layar dilindungi Corning Gorilla Glass Victus Plus terbaru',
      source_excerpt: 'Layar dilindungi Corning Gorilla Glass Victus Plus terbaru.',
      type: 'FACT',
      certainty: 'explicit',
      context: 'Proteksi kaca',
      validation: { status: 'PASS' }
    }
  ];

  const report = generateSmartphoneReport(conflictFixture);
  const glassConflict = report.diagnostics.conflictsDetected.find(
    c => c.canonicalAttribute === 'protection_type' || c.canonicalAttribute === 'protection_glass'
  );
  assert.ok(glassConflict, 'Should detect conflict on protection_type');
  assert.strictEqual(glassConflict?.resolved, false);
  assert.strictEqual(glassConflict?.claims.length, 2);
});

// 7. Requirement: Delta sum strictly matches difference from baseScore to final score (clamped)
it('rule engine: score matches baseScore + sum(deltas) clamped between 0 and 5', () => {
  const px8aData: RawEvidenceRecord[] = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'fixtures/phone_b.json'), 'utf-8')
  );
  const report = generateSmartphoneReport(px8aData);

  for (const [cid, crit] of Object.entries(report.criteriaScores)) {
    if (crit.isRated && crit.score !== null) {
      const posSum = crit.positiveDrivers.reduce((sum, d) => sum + d.delta, 0);
      const negSum = crit.negativeDeductions.reduce((sum, d) => sum + d.delta, 0);
      const deltaSum = Math.round((posSum + negSum) * 100) / 100;
      const expectedScore = Math.min(5, Math.max(0, Math.round((crit.baseScore + deltaSum) * 10) / 10));
      assert.strictEqual(
        crit.score,
        expectedScore,
        `Criteria ${cid} score ${crit.score} must match clamped(baseScore ${crit.baseScore} + deltas ${deltaSum}) = ${expectedScore}`
      );
    }
  }
});

// 8. Requirement: Output Validator rejects report if any content lacks valid evidenceIds
it('output validator throws OutputValidationError when text lacks evidenceIds or has invalid IDs', () => {
  const px8aData: RawEvidenceRecord[] = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'fixtures/phone_b.json'), 'utf-8')
  );
  const validReport = generateSmartphoneReport(px8aData);

  // Validate valid report passes
  assert.doesNotThrow(() => validateReportOutput(validReport));

  // Tamper report with empty evidenceIds in strength
  const corruptedReport1: ReportOutput = JSON.parse(JSON.stringify(validReport));
  corruptedReport1.strengths.push({
    title: 'Kelebihan palsu tanpa bukti',
    description: 'Deskripsi buatan sendiri tanpa bukti',
    impactCategory: 'Performa',
    evidenceIds: [] // EMPTY!
  });

  assert.throws(
    () => validateReportOutput(corruptedReport1),
    (err: any) => err instanceof OutputValidationError && err.message.includes('tidak memiliki evidenceIds')
  );

  // Tamper report with non-existent evidence ID
  const corruptedReport2: ReportOutput = JSON.parse(JSON.stringify(validReport));
  corruptedReport2.specTable[0].rows[0].evidenceIds = ['FAKE-NON-EXISTENT-ID-999'];

  assert.throws(
    () => validateReportOutput(corruptedReport2),
    (err: any) => err instanceof OutputValidationError && err.message.includes('tidak ditemukan dalam repositori')
  );
});

// 9. Requirement: Standalone HTML Export works offline with embedded JSON and modal
it('generates offline standalone HTML with embedded report JSON and interactive modal script', () => {
  const px8aData: RawEvidenceRecord[] = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'fixtures/phone_b.json'), 'utf-8')
  );
  const report = generateSmartphoneReport(px8aData);
  const html = generateStandaloneHtml(report);

  assert.ok(html.includes('<!DOCTYPE html>'));
  assert.ok(html.includes(report.productName));
  assert.ok(html.includes('window.__REPORT_DATA__'));
  assert.ok(html.includes('function openEvidence'));
  assert.ok(html.includes('id="modal"'));
});

// 10. Requirement: Single-Product Rule throws error if product_name is mixed
it('rejects input with mixed product_name across evidence records', () => {
  const mixedRecords: RawEvidenceRecord[] = [
    {
      evidence_id: 'mix-1',
      product_name: 'Brand X Phone 1',
      captured_at: '2025-01-01',
      source: 'Source 1',
      review_id: 'r1',
      video_url: 'https://youtube.com/1',
      video_title: 'V1',
      topic: 'price',
      subtopic: 'launch_price',
      claim: 'Harga 5 juta',
      source_excerpt: 'Harga 5 juta pas.',
      value: 5000000,
      unit: 'IDR',
      type: 'FACT',
      certainty: 'explicit',
      validation: { status: 'PASS' }
    },
    {
      evidence_id: 'mix-2',
      product_name: 'Brand Y Phone 2', // DIFFERENT PRODUCT!
      captured_at: '2025-01-02',
      source: 'Source 2',
      review_id: 'r2',
      video_url: 'https://youtube.com/2',
      video_title: 'V2',
      topic: 'price',
      subtopic: 'launch_price',
      claim: 'Harga 6 juta',
      source_excerpt: 'Harga 6 juta pas.',
      value: 6000000,
      unit: 'IDR',
      type: 'FACT',
      certainty: 'explicit',
      validation: { status: 'PASS' }
    }
  ];

  assert.throws(
    () => generateSmartphoneReport(mixedRecords),
    (err: any) => err.message.includes('lebih dari satu produk') || err.message.includes('SATU produk')
  );
});

// 11. Requirement A.1: "120 Hz" -> 120 Hz, "60 Hz" -> 60 Hz (no accidental duration parsing)
it('normalization A.1: "120 Hz" -> 120 Hz, "60 Hz" -> 60 Hz (no Hz duration bug)', () => {
  const r120 = normalizeValueAndUnit(120, 'Hz', 'refresh_rate', 'Layar 120 Hz halus', 'Mendukung refresh rate hingga 120 Hz.');
  assert.strictEqual(r120.normalizedValue, 120);
  assert.strictEqual(r120.normalizedUnit, 'Hz');

  const r60 = normalizeValueAndUnit('60', 'Hz', 'refresh_rate', 'Layar 60 Hz', 'Layar standar 60 Hz.');
  assert.strictEqual(r60.normalizedValue, 60);
  assert.strictEqual(r60.normalizedUnit, 'Hz');

  // Verify time parsing still works when time context is present
  const rDuration = normalizeValueAndUnit(null, null, 'charging_time_full', 'Pengisian 1 jam 28 menit', 'Butuh 1 jam 28 menit hingga penuh.');
  assert.strictEqual(rDuration.normalizedValue, 88);
  assert.strictEqual(rDuration.normalizedUnit, 'menit');
});

// 12. Requirement A.2: AnTuTu 600,000 remains unitless, no "> 100000 = IDR" heuristic
it('normalization A.2: AnTuTu 600,000 remains unitless and not IDR', () => {
  const antutuRes = normalizeValueAndUnit(600000, null, 'antutu_score', 'Skor AnTuTu tembus 600000', 'Mendapatkan skor 600.000 pada AnTuTu v10.');
  assert.strictEqual(antutuRes.normalizedValue, 600000);
  assert.strictEqual(antutuRes.normalizedUnit, null, 'AnTuTu score must remain without unit');

  // Price with IDR / juta / price attribute must have IDR
  const priceRes = normalizeValueAndUnit(3500000, 'IDR', 'price', 'Harga 3,5 juta', 'Dijual dengan harga Rp 3.500.000.');
  assert.strictEqual(priceRes.normalizedValue, 3500000);
  assert.strictEqual(priceRes.normalizedUnit, 'IDR');
});

// 13. Requirement A.3: verifyRealEvidenceMatch recognizes "ribu", "juta", "setengah jam", "dual", "triple"
it('normalization A.3: verifyRealEvidenceMatch recognizes Indonesian number words and units', () => {
  // 600 ribu
  const matchRibu = verifyRealEvidenceMatch({
    evidence_id: 't-1',
    product_name: 'Test Phone',
    captured_at: '2025-01-01',
    topic: 'performance',
    type: 'MEASUREMENT',
    claim: 'Skor AnTuTu mencapai 600 ribu',
    source_excerpt: 'Skor AnTuTu tembus sekitar 600 ribuan poin.',
    value: 600000,
    certainty: 'explicit',
    source: 'Channel 1',
    review_id: 'r1',
    validation: { status: 'PASS' }
  });
  assert.strictEqual(matchRibu.matches, true, 'Should match "600 ribuan" for 600000');

  // 4 juta
  const matchJuta = verifyRealEvidenceMatch({
    evidence_id: 't-2',
    product_name: 'Test Phone',
    captured_at: '2025-01-01',
    topic: 'price',
    type: 'FACT',
    claim: 'Harga 4 juta',
    source_excerpt: 'HP ini dibanderol dengan harga 4 juta rupiah saat rilis.',
    value: 4000000,
    certainty: 'explicit',
    source: 'Channel 1',
    review_id: 'r1',
    validation: { status: 'PASS' }
  });
  assert.strictEqual(matchJuta.matches, true, 'Should match "4 juta" for 4000000');

  // setengah jam (30 menit)
  const matchSetengahJam = verifyRealEvidenceMatch({
    evidence_id: 't-3',
    product_name: 'Test Phone',
    captured_at: '2025-01-01',
    topic: 'battery',
    type: 'MEASUREMENT',
    claim: 'Mengisi daya selama 30 menit',
    source_excerpt: 'Dalam waktu setengah jam baterai sudah terisi 50%.',
    value: 30,
    certainty: 'explicit',
    source: 'Channel 1',
    review_id: 'r1',
    validation: { status: 'PASS' }
  });
  assert.strictEqual(matchSetengahJam.matches, true, 'Should match "setengah jam" for 30');

  // dual (2) & triple (3)
  const matchDual = verifyRealEvidenceMatch({
    evidence_id: 't-4',
    product_name: 'Test Phone',
    captured_at: '2025-01-01',
    topic: 'connectivity',
    type: 'FACT',
    claim: 'Menggunakan 2 speaker',
    source_excerpt: 'Perangkat ini dilengkapi dual stereo speaker yang lantang.',
    value: 2,
    certainty: 'explicit',
    source: 'Channel 1',
    review_id: 'r1',
    validation: { status: 'PASS' }
  });
  assert.strictEqual(matchDual.matches, true, 'Should match "dual" for 2');

  const matchTriple = verifyRealEvidenceMatch({
    evidence_id: 't-5',
    product_name: 'Test Phone',
    captured_at: '2025-01-01',
    topic: 'camera',
    type: 'FACT',
    claim: 'Konfigurasi 3 kamera',
    source_excerpt: 'Terdapat triple camera di bagian belakang.',
    value: 3,
    certainty: 'explicit',
    source: 'Channel 1',
    review_id: 'r1',
    validation: { status: 'PASS' }
  });
  assert.strictEqual(matchTriple.matches, true, 'Should match "triple" for 3');
});

// 14. Requirement B.4 & C.9: Multi-cardinality attributes do NOT participate in conflict detection
it('taxonomy B.4 & SpecTable C.9: multi-cardinality attributes (box_contents, security_features) do not trigger conflicts', () => {
  const baseFixture: RawEvidenceRecord[] = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'fixtures/phone_b.json'), 'utf-8')
  );

  const multiRecords: RawEvidenceRecord[] = [
    ...baseFixture,
    {
      evidence_id: 'box-1',
      product_name: 'Google Pixel 8a',
      captured_at: '2025-02-10',
      source: 'Source A',
      review_id: 'rev-a',
      topic: 'retail_price',
      subtopic: 'box_contents',
      attribute: 'package_contents',
      value: 'Kabel USB-C',
      unit: null,
      claim: 'Dalam boks terdapat kabel USB-C',
      source_excerpt: 'Dalam boks penjualan terdapat kabel USB-C.',
      type: 'FACT',
      certainty: 'explicit',
      validation: { status: 'PASS' }
    },
    {
      evidence_id: 'box-2',
      product_name: 'Google Pixel 8a',
      captured_at: '2025-02-11',
      source: 'Source B',
      review_id: 'rev-b',
      topic: 'retail_price',
      subtopic: 'box_contents',
      attribute: 'package_contents',
      value: 'SIM ejector dan buku panduan',
      unit: null,
      claim: 'Dalam boks terdapat SIM ejector dan buku panduan',
      source_excerpt: 'Dalam boks terdapat SIM ejector dan buku panduan.',
      type: 'FACT',
      certainty: 'explicit',
      validation: { status: 'PASS' }
    }
  ];

  const report = generateSmartphoneReport(multiRecords);
  const boxConflict = report.diagnostics.conflictsDetected.find(
    c => c.canonicalAttribute === 'box_contents' || c.canonicalAttribute === 'package_contents'
  );
  assert.strictEqual(boxConflict, undefined, 'Multi attribute box_contents must never trigger conflict');

  // Check SpecTable row for box_contents
  let foundBoxRow = false;
  for (const group of report.specTable) {
    for (const row of group.rows) {
      if (row.canonicalAttribute === 'box_contents') {
        foundBoxRow = true;
        assert.strictEqual(row.isMulti, true, 'box_contents row must have isMulti: true');
        assert.ok(row.values && row.values.length >= 2, 'box_contents row must contain unique values');
        assert.strictEqual(row.hasConflict, false, 'Multi attribute row hasConflict must be false');
      }
    }
  }
  assert.strictEqual(foundBoxRow, true, 'Should find box_contents in spec table');
});

// 15. Requirement B.6: Unmapped attributes excluded from specTable and tracked in diagnostics
it('taxonomy B.6: unmapped attributes excluded from specTable and tracked in diagnostics', () => {
  const baseFixture: RawEvidenceRecord[] = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'fixtures/phone_b.json'), 'utf-8')
  );

  const fixtureWithUnmapped: RawEvidenceRecord[] = [
    ...baseFixture,
    {
      evidence_id: 'unmapped-1',
      product_name: 'Google Pixel 8a',
      captured_at: '2025-02-10',
      source: 'Source A',
      review_id: 'rev-a',
      topic: 'custom_topic',
      subtopic: 'custom_subtopic',
      attribute: 'completely_unknown_custom_spec',
      value: 'Nilai Spesifikasi Custom',
      unit: null,
      claim: 'Spesifikasi kustom dengan nilai Nilai Spesifikasi Custom',
      source_excerpt: 'Spesifikasi kustom dengan nilai Nilai Spesifikasi Custom yang tidak ada di taxonomy.',
      type: 'FACT',
      certainty: 'explicit',
      validation: { status: 'PASS' }
    }
  ];

  const report = generateSmartphoneReport(fixtureWithUnmapped);

  // 1. Must NOT be in specTable
  for (const g of report.specTable) {
    for (const r of g.rows) {
      assert.notStrictEqual(r.canonicalAttribute, 'completely_unknown_custom_spec');
    }
  }

  // 2. Must be tracked in diagnostics.unmappedAttributes
  const unmapped = report.diagnostics.unmappedAttributes.find(
    u => u.attribute === 'completely_unknown_custom_spec'
  );
  assert.ok(unmapped, 'Unmapped attribute must be recorded in diagnostics.unmappedAttributes');
  assert.strictEqual(unmapped?.count, 1);
});

// 16. Requirement C.7: Backend-Frontend Contract integrity check
it('contract C.7: backend sends all required contract fields (verdict, attribute, conflict, notes, videos)', () => {
  const a26Data: RawEvidenceRecord[] = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'data/evidence_data_94.json'), 'utf-8')
  );
  const report = generateSmartphoneReport(a26Data);

  // Check SpecRows
  for (const group of report.specTable) {
    for (const row of group.rows) {
      assert.ok(typeof row.attribute === 'string', `SpecRow.attribute must be string, found ${row.attribute}`);
      assert.strictEqual(row.attribute, row.canonicalAttribute, 'SpecRow.attribute must equal canonicalAttribute');
      if (row.hasConflict) {
        assert.ok(row.conflict !== undefined && typeof row.conflict.id === 'string', 'SpecRow.conflict must be full ConflictItem');
      }
    }
  }

  // Check ClaimVsReality
  for (const cvr of report.claimVsReality) {
    assert.ok(
      cvr.verdict === 'EXCEEDS' || cvr.verdict === 'MATCHES' || cvr.verdict === 'BELOW' || cvr.verdict === 'CAVEAT',
      `ClaimVsRealityItem.verdict must be valid enum, found: ${cvr.verdict}`
    );
    assert.ok(typeof cvr.verdictLabel === 'string' && cvr.verdictLabel.length > 0, 'verdictLabel must be non-empty string');
  }

  // Check Quotes
  for (const q of report.quotes) {
    assert.ok(typeof q.videoTitle === 'string' && q.videoTitle.length > 0, 'ReviewerQuoteItem.videoTitle must be string');
    assert.ok(typeof q.youtubeTimestampUrl === 'string', 'ReviewerQuoteItem.youtubeTimestampUrl must be string');
  }

  // Check Alternatives
  for (const alt of report.alternatives) {
    assert.ok(typeof alt.comparisonNote === 'string' && alt.comparisonNote.length > 0, 'AlternativeItem.comparisonNote must be string');
    assert.ok(typeof alt.reasonCategory === 'string' && alt.reasonCategory.length > 0, 'AlternativeItem.reasonCategory must be string');
  }

  // Check Diagnostics rejected & unmapped
  assert.ok(typeof report.diagnostics.rejectedAtIngestCount === 'number');
  assert.ok(typeof report.diagnostics.validationFailedCount === 'number');
  assert.ok(Array.isArray(report.diagnostics.rejectedRecords));
  assert.ok(Array.isArray(report.diagnostics.unmappedAttributes));
});

console.log(`\nALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);

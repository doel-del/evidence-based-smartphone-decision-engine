import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { generateSmartphoneReport } from '../src/server/decisionEngine.js';
import { RawEvidenceRecord, ReportOutput } from '../src/server/types.js';
import { validateReportOutput, OutputValidationError } from '../src/server/outputValidator.js';
import { generateStandaloneHtml } from '../src/server/exportGenerator.js';

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
  assert.ok(report.confidenceLabel === 'LOW' || report.confidenceLabel === 'Rendah');
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
    criteriaId: 'performance_and_gaming',
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
      validation: { status: 'PASS' }
    }
  ];

  assert.throws(
    () => generateSmartphoneReport(mixedRecords),
    (err: any) => err.message.includes('lebih dari satu produk') || err.message.includes('SATU produk')
  );
});

console.log(`\nALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);

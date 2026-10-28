import assert from 'assert';
import { loadAllEvidenceDatasets } from '../src/server/evidenceLoader.js';
import { normalizeEvidenceRecords } from '../src/server/evidenceNormalizer.js';
import { validateEvidenceEligibility } from '../src/server/evidenceValidator.js';
import { EvidenceRepository } from '../src/server/evidenceRepository.js';
import { runDecisionEngine } from '../src/server/decisionEngine.js';
import { calculateConfidence } from '../src/server/confidenceEngine.js';
import { CRITERIA_DEFINITIONS, RUBRICS_CONFIG } from '../src/server/decisionRules.js';
import { RawEvidenceRecord } from '../src/server/types.js';

console.log('--- STARTING AUTOMATED TEST SUITE FOR DECISION ENGINE ---');

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

// 1. JSON Loading & Parsing
it('loads all 3 JSON datasets and preserves source metadata', () => {
  const loader = loadAllEvidenceDatasets();
  assert.strictEqual(loader.datasets.length, 3, 'Should have 3 dataset configurations');
  
  const sources = loader.datasets.map(d => d.source);
  assert.ok(sources.includes('Jagat Review'), 'Should include Jagat Review dataset');
  assert.ok(sources.includes('TrendingTek'), 'Should include TrendingTek dataset');
  assert.ok(sources.includes('rizkinhk'), 'Should include rizkinhk dataset');

  assert.ok(loader.allRecordsWithSourceFile.length > 150, 'Should load substantial evidence records across 3 datasets');
  
  // Verify missing PRD reporting
  assert.strictEqual(loader.missingRequiredFiles.length, 1);
  assert.strictEqual(loader.missingRequiredFiles[0].filename, 'PRD_Evidence_Based_Smartphone_Decision_Engine.md');
});

// 2. Normalization
it('normalizes evidence records and builds accurate timestamp links', () => {
  const loader = loadAllEvidenceDatasets();
  const normalizer = normalizeEvidenceRecords(loader.allRecordsWithSourceFile);
  assert.ok(normalizer.normalizedRecords.length > 0);

  const sample = normalizer.normalizedRecords.find(r => r.timestamp_start !== null && r.video_url.includes('youtube'));
  assert.ok(sample, 'Should have a record with timestamp');
  assert.ok(sample?.youtubeTimestampUrl?.includes('&t=') || sample?.youtubeTimestampUrl?.includes('?t='), 'Should format YouTube URL with timestamp parameter');
});

// 3. Validation & Rejected Evidence Isolation
it('rejects evidence with accepted === false or invalid status and prevents them from influencing scoring', () => {
  const testRecords: { record: RawEvidenceRecord; filename: string }[] = [
    {
      record: {
        evidence_id: 'TEST-VALID-01',
        topic: 'battery',
        subtopic: 'test',
        type: 'FACT',
        claim: 'Valid claim',
        value: 5000,
        unit: 'mAh',
        attribute: 'battery_capacity',
        attribute_value: '5000 mAh',
        context: 'test',
        certainty: 'explicit',
        source_excerpt: 'valid',
        validation: { accepted: true, finalStatus: 'VALID' },
        timestamp_start: null,
        timestamp_end: null,
        source: 'Reviewer A',
        review_id: 'rev-a',
        video_url: 'https://youtube.com',
        video_title: 'Title'
      },
      filename: 'test.json'
    },
    {
      record: {
        evidence_id: 'TEST-REJECTED-01',
        topic: 'battery',
        subtopic: 'test',
        type: 'FACT',
        claim: 'Bogus rejected claim',
        value: 99999,
        unit: 'mAh',
        attribute: 'battery_capacity',
        attribute_value: '99999 mAh',
        context: 'test',
        certainty: 'explicit',
        source_excerpt: 'rejected',
        validation: { accepted: false, finalStatus: 'INVALID' },
        timestamp_start: null,
        timestamp_end: null,
        source: 'Reviewer B',
        review_id: 'rev-b',
        video_url: 'https://youtube.com',
        video_title: 'Title'
      },
      filename: 'test.json'
    }
  ];

  const norm = normalizeEvidenceRecords(testRecords);
  const val = validateEvidenceEligibility(norm.normalizedRecords);
  assert.strictEqual(val.eligibleRecords.length, 1);
  assert.strictEqual(val.eligibleRecords[0].evidence_id, 'TEST-VALID-01');
  assert.strictEqual(val.excludedRecords.length, 1);
  assert.strictEqual(val.excludedRecords[0].evidence.evidence_id, 'TEST-REJECTED-01');

  const repo = new EvidenceRepository(norm.normalizedRecords, val.eligibleRecords, val.excludedRecords);
  assert.strictEqual(repo.getByTopic('battery', true).length, 1);
  assert.strictEqual(repo.getByTopic('battery', true)[0].evidence_id, 'TEST-VALID-01');
});

// 4. Duplicate Evidence IDs Handling
it('identifies duplicate evidence IDs and excludes duplicates without double-counting', () => {
  const testRecords: { record: RawEvidenceRecord; filename: string }[] = [
    {
      evidence_id: 'DUP-001',
      topic: 'camera',
      subtopic: 'main',
      type: 'FACT',
      claim: 'Duplicate record 1',
      value: 50,
      unit: 'MP',
      attribute: 'res',
      attribute_value: '50 MP',
      context: 'test',
      certainty: 'explicit',
      source_excerpt: 'first',
      validation: { accepted: true, finalStatus: 'VALID' },
      timestamp_start: null,
      timestamp_end: null,
      source: 'Source 1',
      review_id: 'r1',
      video_url: '',
      video_title: ''
    },
    {
      evidence_id: 'DUP-001',
      topic: 'camera',
      subtopic: 'main',
      type: 'FACT',
      claim: 'Duplicate record 2',
      value: 50,
      unit: 'MP',
      attribute: 'res',
      attribute_value: '50 MP',
      context: 'test',
      certainty: 'explicit',
      source_excerpt: 'second',
      validation: { accepted: true, finalStatus: 'VALID' },
      timestamp_start: null,
      timestamp_end: null,
      source: 'Source 1',
      review_id: 'r1',
      video_url: '',
      video_title: ''
    }
  ].map(r => ({ record: r as RawEvidenceRecord, filename: 'test.json' }));

  const norm = normalizeEvidenceRecords(testRecords);
  assert.ok(norm.duplicateIds.includes('DUP-001'));
  const val = validateEvidenceEligibility(norm.normalizedRecords);
  assert.strictEqual(val.eligibleRecords.length, 1, 'Only one instance should be eligible');
  assert.strictEqual(val.excludedRecords.length, 1, 'Duplicate instance must be excluded');
  assert.ok(val.excludedRecords[0].reason.includes('Duplicate'));
});

// 5. Conflict Detection
it('detects and categorizes technical claim variances and critical conflicts', () => {
  const loader = loadAllEvidenceDatasets();
  const norm = normalizeEvidenceRecords(loader.allRecordsWithSourceFile);
  const val = validateEvidenceEligibility(norm.normalizedRecords);
  const repo = new EvidenceRepository(norm.normalizedRecords, val.eligibleRecords, val.excludedRecords);

  const conflicts = repo.detectConflicts();
  assert.ok(Array.isArray(conflicts));
  // Pricing and benchmark variances should be recognized and reconciled
  const priceConflict = conflicts.find(c => c.id === 'variance-pricing');
  assert.ok(priceConflict, 'Should track pricing variance between SRP and flash sale');
  assert.strictEqual(priceConflict?.resolved, true);
  assert.strictEqual(priceConflict?.isCritical, false);
});

// 6. Score Calculation Formula & Fixed Weights
it('enforces PRD fixed 7 criteria weights summing to 1.00', () => {
  const weights = Object.values(CRITERIA_DEFINITIONS).map(d => d.weight);
  const sumWeights = weights.reduce((acc, w) => acc + w, 0);
  assert.strictEqual(Math.round(sumWeights * 100) / 100, 1.00, 'Sum of weights must equal 1.00');

  assert.strictEqual(CRITERIA_DEFINITIONS.price_and_value.weight, 0.20);
  assert.strictEqual(CRITERIA_DEFINITIONS.performance_and_gaming.weight, 0.15);
  assert.strictEqual(CRITERIA_DEFINITIONS.battery_and_charging.weight, 0.15);
  assert.strictEqual(CRITERIA_DEFINITIONS.software_and_security.weight, 0.15);
  assert.strictEqual(CRITERIA_DEFINITIONS.display_and_design.weight, 0.10);
  assert.strictEqual(CRITERIA_DEFINITIONS.camera.weight, 0.10);
  assert.strictEqual(CRITERIA_DEFINITIONS.durability_and_protection.weight, 0.15);
});

// 7. Deterministic Decision Engine
it('produces identical deterministic outputs for identical inputs', () => {
  const loader1 = loadAllEvidenceDatasets();
  const norm1 = normalizeEvidenceRecords(loader1.allRecordsWithSourceFile);
  const val1 = validateEvidenceEligibility(norm1.normalizedRecords);
  const repo1 = new EvidenceRepository(norm1.normalizedRecords, val1.eligibleRecords, val1.excludedRecords);
  const result1 = runDecisionEngine(repo1);

  const loader2 = loadAllEvidenceDatasets();
  const norm2 = normalizeEvidenceRecords(loader2.allRecordsWithSourceFile);
  const val2 = validateEvidenceEligibility(norm2.normalizedRecords);
  const repo2 = new EvidenceRepository(norm2.normalizedRecords, val2.eligibleRecords, val2.excludedRecords);
  const result2 = runDecisionEngine(repo2);

  assert.strictEqual(result1.overallScore, result2.overallScore);
  assert.strictEqual(result1.overallScoreExact, result2.overallScoreExact);
  assert.strictEqual(result1.decisionLabel, result2.decisionLabel);
  assert.strictEqual(result1.confidenceLabel, result2.confidenceLabel);
  assert.strictEqual(result1.coveragePercent, result2.coveragePercent);
});

// 8. Overall Decision Thresholds & Score Range
it('correctly categorizes decision labels according to PRD thresholds', () => {
  const loader = loadAllEvidenceDatasets();
  const norm = normalizeEvidenceRecords(loader.allRecordsWithSourceFile);
  const val = validateEvidenceEligibility(norm.normalizedRecords);
  const repo = new EvidenceRepository(norm.normalizedRecords, val.eligibleRecords, val.excludedRecords);
  const result = runDecisionEngine(repo);

  assert.ok(result.overallScore !== null && result.overallScore >= 0 && result.overallScore <= 5.0);
  if (result.overallScore >= 4.0) {
    assert.strictEqual(result.decisionLabel, 'Sangat direkomendasikan');
  } else if (result.overallScore >= 3.0) {
    assert.strictEqual(result.decisionLabel, 'Direkomendasikan dengan pertimbangan');
  } else if (result.overallScore >= 2.0) {
    assert.strictEqual(result.decisionLabel, 'Cocok secara terbatas');
  } else {
    assert.strictEqual(result.decisionLabel, 'Tidak direkomendasikan');
  }
});

// 9. Confidence Calculation & Multi-Source Rules
it('requires coverage >= 80% and >= 2 independent sources covering >= 70% weight for HIGH confidence', () => {
  const loader = loadAllEvidenceDatasets();
  const norm = normalizeEvidenceRecords(loader.allRecordsWithSourceFile);
  const val = validateEvidenceEligibility(norm.normalizedRecords);
  const repo = new EvidenceRepository(norm.normalizedRecords, val.eligibleRecords, val.excludedRecords);
  const result = runDecisionEngine(repo);

  assert.strictEqual(result.coveragePercent, 100);
  assert.strictEqual(result.confidenceLabel, 'HIGH');
});

// 10. Insufficient Coverage Gate
it('prevents publication of overall score when coverage is below 60%', () => {
  const fakeScores: any = {
    price_and_value: { isRated: true, score: 4.0, weight: 0.20, evidenceIdsUsed: [] },
    performance_and_gaming: { isRated: true, score: 4.0, weight: 0.15, evidenceIdsUsed: [] },
    battery_and_charging: { isRated: false, score: null, weight: 0.15, evidenceIdsUsed: [] },
    software_and_security: { isRated: false, score: null, weight: 0.15, evidenceIdsUsed: [] },
    display_and_design: { isRated: false, score: null, weight: 0.10, evidenceIdsUsed: [] },
    camera: { isRated: false, score: null, weight: 0.10, evidenceIdsUsed: [] },
    durability_and_protection: { isRated: false, score: null, weight: 0.15, evidenceIdsUsed: [] }
  };
  // Total weight rated = 0.35 (35% < 60%)
  const conf = calculateConfidence(fakeScores, [], []);
  assert.strictEqual(conf.coveragePercent, 35);
  assert.strictEqual(conf.confidenceLabel, 'LOW');
});

// 11. Evidence Traceability
it('guarantees every strength, tradeoff, and decision reason references valid evidence IDs', () => {
  const loader = loadAllEvidenceDatasets();
  const norm = normalizeEvidenceRecords(loader.allRecordsWithSourceFile);
  const val = validateEvidenceEligibility(norm.normalizedRecords);
  const repo = new EvidenceRepository(norm.normalizedRecords, val.eligibleRecords, val.excludedRecords);
  const result = runDecisionEngine(repo);

  const allEligibleIds = new Set(val.eligibleRecords.map(e => e.evidence_id));

  for (const s of result.strengths) {
    assert.ok(s.evidenceIds.length > 0, `Strength '${s.title}' must reference evidence IDs`);
    for (const id of s.evidenceIds) {
      assert.ok(allEligibleIds.has(id), `Evidence ID ${id} in strength must exist in eligible dataset`);
    }
  }

  for (const t of result.tradeoffs) {
    assert.ok(t.evidenceIds.length > 0, `Tradeoff '${t.title}' must reference evidence IDs`);
    for (const id of t.evidenceIds) {
      assert.ok(allEligibleIds.has(id), `Evidence ID ${id} in tradeoff must exist in eligible dataset`);
    }
  }

  for (const r of result.decisionReasons) {
    assert.ok(r.evidenceIds.length > 0, `Decision reason '${r.title}' must reference evidence IDs`);
    for (const id of r.evidenceIds) {
      assert.ok(allEligibleIds.has(id), `Evidence ID ${id} in reason must exist in eligible dataset`);
    }
  }
});

// 12. Versioned Rubrics Completeness
it('audits versioned rubrics configuration for all 7 criteria', () => {
  for (const cid of Object.keys(CRITERIA_DEFINITIONS) as (keyof typeof CRITERIA_DEFINITIONS)[]) {
    const rubric = RUBRICS_CONFIG[cid];
    assert.ok(rubric, `Rubric for criterion ${cid} must exist`);
    assert.strictEqual(rubric.isFullySpecified, true, `Rubric for ${cid} must be fully specified`);
    assert.ok(rubric.version.length > 0);
    assert.ok(rubric.rulesDescription.length > 0);
  }
});

// 13. Critical Conflict Gate
it('prevents decision publication when an unresolved critical conflict is detected', () => {
  const loader = loadAllEvidenceDatasets();
  const norm = normalizeEvidenceRecords(loader.allRecordsWithSourceFile);
  const val = validateEvidenceEligibility(norm.normalizedRecords);
  const repo = new EvidenceRepository(norm.normalizedRecords, val.eligibleRecords, val.excludedRecords);

  // Inject a critical unresolved conflict
  const originalDetect = repo.detectConflicts.bind(repo);
  repo.detectConflicts = () => [
    ...originalDetect(),
    {
      id: 'mock-critical',
      attribute: 'screen_size',
      topic: 'display',
      claims: [
        { source: 'Reviewer A', claim: '6.7 inch', value: 6.7, evidenceId: 'mock-1' },
        { source: 'Reviewer B', claim: '5.5 inch', value: 5.5, evidenceId: 'mock-2' }
      ],
      isCritical: true,
      resolved: false,
      resolutionNote: 'Contradictory physical screen dimensions.'
    }
  ];

  const result = runDecisionEngine(repo);
  assert.strictEqual(result.decisionStatus, 'UNRESOLVED_CRITICAL_CONFLICT');
  assert.strictEqual(result.decisionLabel, 'Data Tidak Mencukupi');
  assert.strictEqual(result.confidenceLabel, 'INSUFFICIENT');
});

// 14. Missing Rubric Rule / UNRATED Criterion Handling
it('handles unrated criteria cleanly without inventing numeric scores', () => {
  const fakeScores: any = {
    price_and_value: { isRated: true, score: 4.0, weight: 0.20, evidenceIdsUsed: [] },
    performance_and_gaming: { isRated: true, score: 4.0, weight: 0.15, evidenceIdsUsed: [] },
    battery_and_charging: { isRated: true, score: 4.0, weight: 0.15, evidenceIdsUsed: [] },
    software_and_security: { isRated: true, score: 4.0, weight: 0.15, evidenceIdsUsed: [] },
    display_and_design: { isRated: true, score: 4.0, weight: 0.10, evidenceIdsUsed: [] },
    camera: { isRated: false, score: null, weight: 0.10, isUnrated: true, unratedReason: 'Missing calibration rubric', evidenceIdsUsed: [] },
    durability_and_protection: { isRated: true, score: 4.0, weight: 0.15, evidenceIdsUsed: [] }
  };
  const conf = calculateConfidence(fakeScores, [], []);
  assert.strictEqual(conf.coveragePercent, 90); // 0.90 of 1.00 = 90%
  assert.strictEqual(fakeScores.camera.score, null);
});

console.log(`\nALL ${passedTests}/${totalTests} AUTOMATED TESTS PASSED SUCCESSFULLY!`);

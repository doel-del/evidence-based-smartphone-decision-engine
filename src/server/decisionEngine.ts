import { randomUUID } from 'crypto';
import { 
  ConflictItem, 
  DecisionLabel, 
  DecisionStatus, 
  NormalizedEvidence, 
  RawEvidenceRecord, 
  ReportOutput 
} from './types.js';
import { ingestAndNormalizeEvidence } from './evidenceNormalizer.js';
import { detectGenericConflicts } from './conflictDetector.js';
import { executeRuleEngine, getRubricConfig } from './ruleEngine.js';
import { calculateConfidence } from './confidenceEngine.js';
import { 
  computeCapturedAtMetadata, 
  deriveCompetitorAlternatives, 
  deriveQuickDecision, 
  deriveStrengthsAndTradeoffs, 
  generateClaimVsReality, 
  generateFaq, 
  generateReviewerQuotes, 
  generateSpecTable 
} from './derivedContent.js';
import { validateReportOutput } from './outputValidator.js';

export interface DecisionEngineOptions {
  datasetFilename?: string;
}

export function generateSmartphoneReport(
  rawRecords: RawEvidenceRecord[],
  options: DecisionEngineOptions = {}
): ReportOutput {
  const config = getRubricConfig();
  const reportId = `rep-${randomUUID().substring(0, 8)}`;
  const dateGenerated = new Date().toISOString();

  // Step 1: Ingest, Schema Validation, Single Product Check & Normalization
  const ingest = ingestAndNormalizeEvidence(rawRecords, options.datasetFilename || 'upload.json');
  if (ingest.singleProductViolation) {
    throw new Error(ingest.singleProductViolation);
  }

  const allNormalized = ingest.normalizedRecords;
  const eligibleEvidence = allNormalized.filter(e => e.isEligibleForScoring);
  const productName = ingest.productName || 'Smartphone Tanpa Nama';

  // Minimum gate check: < 5 valid records -> INSUFFICIENT_EVIDENCE
  const hasMinimumRecords = eligibleEvidence.length >= 5;

  // Step 2: Generic Conflict Detection
  const conflicts = detectGenericConflicts(allNormalized);
  const hasCriticalConflict = conflicts.some(c => c.isCritical && !c.resolved);

  // Step 3: Rule Engine Execution
  const { criteriaScores, ruleHits, priceSummary } = executeRuleEngine(allNormalized);

  // Step 4: Confidence & Coverage
  const confResult = calculateConfidence(criteriaScores, eligibleEvidence, conflicts);

  // Step 5: Overall Score Calculation (Weighted Formula)
  let weightedSum = 0;
  let ratedWeightSum = 0;

  for (const cid of Object.keys(criteriaScores) as (keyof typeof criteriaScores)[]) {
    const item = criteriaScores[cid];
    if (item.isRated && item.score !== null) {
      weightedSum += item.weight * item.score;
      ratedWeightSum += item.weight;
    }
  }

  const overallScoreExact = ratedWeightSum > 0 ? weightedSum / ratedWeightSum : null;
  const overallScore = overallScoreExact !== null ? Math.round(overallScoreExact * 10) / 10 : null;

  // Step 6: Decision Gate & Thresholds
  let decisionStatus: DecisionStatus = 'PUBLISHED';
  let decisionLabel: DecisionLabel = 'Data Tidak Mencukupi';

  const isPriceRated = criteriaScores.price_and_value?.isRated === true;

  if (!hasMinimumRecords || confResult.coveragePercent < 60 || !isPriceRated || hasCriticalConflict) {
    decisionStatus = hasCriticalConflict ? 'UNRESOLVED_CRITICAL_CONFLICT' : 'INSUFFICIENT_EVIDENCE';
    decisionLabel = 'Data Tidak Mencukupi';
  } else if (overallScore !== null) {
    for (const thresh of config.decisionThresholds) {
      if (overallScore >= thresh.min && overallScore <= thresh.max) {
        decisionLabel = thresh.label as DecisionLabel;
        break;
      }
    }
  }

  // Step 7: Derived Content Generation
  const capturedAtRange = computeCapturedAtMetadata(eligibleEvidence);
  const specTable = generateSpecTable(allNormalized, conflicts);
  const claimVsReality = generateClaimVsReality(eligibleEvidence);
  const quotes = generateReviewerQuotes(eligibleEvidence);
  const { strengths, tradeoffs } = deriveStrengthsAndTradeoffs(ruleHits, criteriaScores);
  const quickDecision = deriveQuickDecision(eligibleEvidence, ruleHits);
  const alternatives = deriveCompetitorAlternatives(eligibleEvidence);
  const faq = generateFaq(eligibleEvidence);

  // Decision Reasons from top rule hits and strengths
  const decisionReasons: { id: string; title: string; description: string; evidenceIds: string[]; impact: 'positive' | 'negative' }[] = strengths.slice(0, 3).map((s, idx) => ({
    id: `reason-${idx + 1}`,
    title: s.title,
    description: s.description,
    evidenceIds: s.evidenceIds,
    impact: 'positive'
  }));

  if (tradeoffs.length > 0) {
    decisionReasons.push({
      id: `reason-${decisionReasons.length + 1}`,
      title: tradeoffs[0].title,
      description: tradeoffs[0].description,
      evidenceIds: tradeoffs[0].evidenceIds,
      impact: 'negative' as const
    });
  }

  // Diagnostics report
  const excludedEvidence = allNormalized.filter(e => !e.isEligibleForScoring);
  const exclusionBreakdown: Record<string, number> = {};
  for (const ex of excludedEvidence) {
    const reason = ex.exclusionReason || 'Unknown';
    exclusionBreakdown[reason] = (exclusionBreakdown[reason] || 0) + 1;
  }

  const sourcesSet = new Set<string>();
  const independentReviewSources = [];
  for (const ev of eligibleEvidence) {
    if (!sourcesSet.has(ev.source)) {
      sourcesSet.add(ev.source);
      independentReviewSources.push({
        source: ev.source,
        reviewId: ev.review_id,
        videoTitle: ev.video_title,
        videoUrl: ev.video_url,
        recordCount: eligibleEvidence.filter(e => e.source === ev.source).length
      });
    }
  }

  const diagnostics = {
    totalRecordsLoaded: rawRecords.length,
    totalNormalizedRecords: allNormalized.length,
    totalAcceptedRecords: eligibleEvidence.length,
    totalExcludedRecords: excludedEvidence.length,
    duplicateIdsFound: ingest.duplicateIds,
    normalizationErrors: ingest.rejectedRecords.map(r => ({ id: r.recordId, issue: r.reason })),
    exclusionReasonsBreakdown: exclusionBreakdown,
    conflictsDetected: conflicts,
    rulesetVersion: '2.0.0-generic-deterministic',
    independentReviewSources
  };

  const report: ReportOutput = {
    schemaVersion: '2.0.0',
    reportId,
    productName,
    dateGenerated,
    capturedAtRange,
    priceSummary,
    overallScore: decisionStatus === 'PUBLISHED' ? overallScore : null,
    overallScoreExact: decisionStatus === 'PUBLISHED' ? overallScoreExact : null,
    decisionLabel,
    decisionStatus,
    confidenceLabel: confResult.confidenceLabel,
    coveragePercent: confResult.coveragePercent,
    independentSourceCount: confResult.independentSourceCount,
    criteriaScores,
    strengths,
    tradeoffs,
    decisionReasons,
    quickDecision,
    specTable,
    claimVsReality,
    quotes,
    alternatives,
    faq,
    evidencePool: eligibleEvidence,
    diagnostics
  };

  // Step 8: Output Validation (throws OutputValidationError if any content lacks valid evidenceIds)
  validateReportOutput(report);

  return report;
}

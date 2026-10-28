/**
 * Types for Evidence-Based Smartphone Decision Engine
 */

export type EvidenceType = 'FACT' | 'MEASUREMENT' | 'OBSERVATION' | 'OPINION' | 'RECOMMENDATION' | 'COMPARISON' | 'CLAIM';

export interface ValidationRuleResult {
  pass: boolean;
  status: 'PASS' | 'SUSPECT' | 'FAIL';
  rule: string;
  reason?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface EvidenceValidation {
  accepted: boolean;
  results?: ValidationRuleResult[];
  finalStatus: 'VALID' | 'VALID_WITH_NORMALIZATION' | 'INVALID' | 'SUSPECT' | string;
}

export interface RawEvidenceRecord {
  evidence_id: string;
  topic: string;
  subtopic: string | null;
  type: EvidenceType | string;
  claim: string;
  value: number | string | null;
  unit: string | null;
  attribute: string | null;
  attribute_value: string | null;
  context: string | null;
  comparison_target?: string | null;
  reviewer_assessment?: 'positive' | 'negative' | 'neutral' | null;
  certainty: string;
  source_excerpt: string;
  related_evidence_ids?: string[] | null;
  source_coordinates?: {
    chunk_index?: number;
    segment_start_index?: number;
    segment_end_index?: number;
    char_start?: number | null;
    char_end?: number | null;
  };
  validation: EvidenceValidation;
  timestamp_start: string | null;
  timestamp_end: string | null;
  source: string;
  review_id: string;
  video_url: string;
  video_title: string;
  merged_subtopics?: string[];
  merged_from_evidence_ids?: string[];
}

export interface NormalizedEvidence extends RawEvidenceRecord {
  datasetFile: string;
  isEligibleForScoring: boolean;
  exclusionReason?: string;
  sourceReviewer: string;
  youtubeTimestampUrl?: string;
}

export type CriterionId =
  | 'price_and_value'
  | 'performance_and_gaming'
  | 'battery_and_charging'
  | 'software_and_security'
  | 'display_and_design'
  | 'camera'
  | 'durability_and_protection';

export interface CriterionDefinition {
  id: CriterionId;
  name: string;
  nameId: string; // Indonesian title
  weight: number; // 0.0 - 1.0 (Sum = 1.0)
  description: string;
}

export interface CriterionRubric {
  criterionId: CriterionId;
  version: string;
  isFullySpecified: boolean;
  unratedReason?: string;
  baseScoreFormula: string;
  rulesDescription: string[];
}

export interface CriterionScoreResult {
  criterionId: CriterionId;
  criterionName: string;
  criterionNameId: string;
  weight: number;
  score: number | null; // 0.0 - 5.0, or null if unrated
  isRated: boolean;
  unratedReason?: string;
  rubricVersion: string;
  evidenceIdsUsed: string[];
  primaryFindings: string[];
  positiveDrivers: { text: string; evidenceIds: string[]; delta?: number }[];
  negativeDeductions: { text: string; evidenceIds: string[]; delta?: number }[];
}

export type DecisionStatus = 'PUBLISHED' | 'INSUFFICIENT_EVIDENCE' | 'UNRESOLVED_CRITICAL_CONFLICT';
export type DecisionLabel =
  | 'Sangat direkomendasikan'
  | 'Direkomendasikan dengan pertimbangan'
  | 'Cocok secara terbatas'
  | 'Tidak direkomendasikan'
  | 'Data Tidak Mencukupi';

export type ConfidenceLabel = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';

export interface DecisionReasonItem {
  id: string;
  title: string;
  description: string;
  evidenceIds: string[];
  impact: 'positive' | 'negative' | 'neutral';
}

export interface StrengthItem {
  title: string;
  description: string;
  evidenceIds: string[];
  impactCategory: string;
}

export interface TradeoffItem {
  title: string;
  description: string;
  scoreDeduction?: number;
  evidenceIds: string[];
  mitigation?: string;
}

export interface ConflictItem {
  id: string;
  attribute: string;
  topic: string;
  claims: { source: string; claim: string; value: any; evidenceId: string }[];
  isCritical: boolean;
  resolved: boolean;
  resolutionNote?: string;
}

export interface DecisionResult {
  productId: string;
  productName: string;
  overallScore: number | null; // Rounded to 1 decimal place (0.0 - 5.0)
  overallScoreExact: number | null; // Full precision internal score
  decisionLabel: DecisionLabel;
  decisionStatus: DecisionStatus;
  confidenceLabel: ConfidenceLabel;
  coveragePercent: number; // 0 - 100
  criteriaScores: Record<CriterionId, CriterionScoreResult>;
  strengths: StrengthItem[];
  tradeoffs: TradeoffItem[];
  decisionReasons: DecisionReasonItem[];
  evidenceUsed: string[]; // List of evidence IDs actually used in rated scores & reasons
  evidenceExcluded: { evidenceId: string; reason: string; source: string }[];
  unresolvedConflicts: ConflictItem[];
  rulesetVersion: string;
  evidenceDatasetVersion: string;
  generatedAt: string;
  quickDecision: {
    recommendedFor: { text: string; evidenceIds: string[] }[];
    notRecommendedFor: { text: string; evidenceIds: string[] }[];
  };
}

export interface DatasetReport {
  filesProcessed: {
    filename: string;
    source: string;
    reviewId: string;
    totalRecords: number;
    acceptedRecords: number;
    excludedRecords: number;
    status: 'LOADED_SUCCESSFULLY' | 'MISSING' | 'ERROR';
    error?: string;
  }[];
  missingRequiredFiles: {
    filename: string;
    reason: string;
  }[];
  totalRecordsLoaded: number;
  totalNormalizedRecords: number;
  totalAcceptedRecords: number;
  totalExcludedRecords: number;
  duplicateIdsFound: string[];
  normalizationErrors: { id?: string; issue: string }[];
  exclusionReasonsBreakdown: Record<string, number>;
  conflictsDetected: ConflictItem[];
  rulesetVersion: string;
  evidenceDatasetVersion: string;
  independentReviewSources: {
    source: string;
    reviewId: string;
    videoTitle: string;
    videoUrl: string;
    recordCount: number;
  }[];
}

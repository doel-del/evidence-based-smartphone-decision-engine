/**
 * Types for Generic Evidence-Based Smartphone Decision Engine
 * Product-agnostic, schema-validated, deterministic architecture.
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
  accepted?: boolean;
  status?: string;
  results?: ValidationRuleResult[];
  finalStatus?: 'VALID' | 'VALID_WITH_NORMALIZATION' | 'INVALID' | 'SUSPECT' | string;
}

export interface RawEvidenceRecord {
  evidence_id: string;
  product_name: string;
  captured_at: string; // ISO date YYYY-MM-DD or full timestamp
  topic: string;
  subtopic?: string | null;
  type: EvidenceType | string;
  claim: string;
  value?: number | string | null;
  unit?: string | null;
  attribute?: string | null;
  attribute_value?: string | null;
  context?: string | null;
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
  timestamp_start?: string | null;
  timestamp_end?: string | null;
  source: string;
  review_id: string;
  video_url?: string;
  video_title?: string;
  merged_subtopics?: string[];
  merged_from_evidence_ids?: string[];
}

export interface NormalizedEvidence extends RawEvidenceRecord {
  canonicalAttribute: string;
  normalizedValue: number | string | null;
  normalizedUnit: string | null;
  isEligibleForScoring: boolean;
  exclusionReason?: string;
  youtubeTimestampUrl?: string;
  datasetFile?: string;
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
  nameId: string;
  weight: number;
  baseScore: number;
  minEvidence: number;
  description: string;
}

export type PriceTierId = 'entry' | 'mid' | 'upper_mid' | 'flagship';

export interface RuleBand {
  priceTiers?: PriceTierId[];
  gte?: number;
  gt?: number;
  lte?: number;
  lt?: number;
  eq?: number | string;
  contains?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  delta: number;
  label: string;
  template: string;
}

export interface EngineRule {
  id: string;
  criterion: CriterionId;
  description: string;
  match: {
    attribute?: string;
    topic?: string;
    type?: string;
    subtopic?: string;
  };
  metric?: {
    field: 'normalized_value' | 'text';
    unit?: string;
  };
  sentimentImpact?: boolean;
  bands: RuleBand[];
  polarity: 'positive' | 'negative';
  maxApply?: number;
}

export interface RuleHit {
  ruleId: string;
  criterion: CriterionId;
  delta: number;
  label: string;
  text: string;
  polarity: 'positive' | 'negative';
  evidenceIds: string[];
}

export interface CriterionScoreResult {
  criterionId: CriterionId;
  criterionName: string;
  criterionNameId: string;
  weight: number;
  baseScore: number;
  score: number | null;
  isRated: boolean;
  unratedReason?: string;
  rubricVersion: string;
  evidenceIdsUsed: string[];
  primaryFindings: { text: string; evidenceIds: string[] }[];
  positiveDrivers: { text: string; evidenceIds: string[]; delta: number }[];
  negativeDeductions: { text: string; evidenceIds: string[]; delta: number }[];
}

export type DecisionStatus = 'PUBLISHED' | 'INSUFFICIENT_EVIDENCE' | 'UNRESOLVED_CRITICAL_CONFLICT';
export type DecisionLabel =
  | 'Sangat direkomendasikan'
  | 'Direkomendasikan dengan pertimbangan'
  | 'Cocok secara terbatas'
  | 'Tidak direkomendasikan'
  | 'Data Tidak Mencukupi';

export type ConfidenceLabel = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';

export interface ConflictItem {
  id: string;
  canonicalAttribute: string;
  topic: string;
  isCritical: boolean;
  resolved: boolean;
  resolutionNote: string;
  claims: {
    source: string;
    claim: string;
    rawValue: any;
    normalizedValue: any;
    evidenceId: string;
  }[];
}

export interface SpecRow {
  label: string;
  canonicalAttribute: string;
  attribute: string; // Contract required: (= canonicalAttribute)
  value: string;
  sources: string[];
  evidenceIds: string[];
  hasConflict: boolean;
  conflictingClaims?: { source: string; value: string; evidenceId: string }[];
  conflict?: ConflictItem; // Contract required: full ConflictItem when conflict exists
  isMulti?: boolean;
  values?: string[];
}

export interface SpecTopicGroup {
  topicId: string;
  topicLabel: string;
  rows: SpecRow[];
}

export interface ClaimVsRealityItem {
  metric: string;
  canonicalAttribute: string;
  factoryClaim: string;
  realTested: string;
  delta: string;
  status: string;
  statusBadge: string;
  verdict: 'EXCEEDS' | 'MATCHES' | 'BELOW' | 'CAVEAT';
  verdictLabel: string;
  evidenceIds: string[];
}

export interface ReviewerQuoteItem {
  source: string;
  videoTitle: string;
  quote: string;
  timestamp: string;
  youtubeUrl?: string;
  youtubeTimestampUrl: string;
  evidenceIds: string[];
}

export interface AlternativeItem {
  productName: string;
  description: string;
  comparisonNote: string;
  categoryBadge: string;
  reasonCategory: string;
  evidenceIds: string[];
}

export interface FaqItem {
  question: string;
  answer: string;
  evidenceIds: string[];
}

export type StrengthItem = { title: string; description: string; evidenceIds: string[]; impactCategory: string };
export type TradeoffItem = { title: string; description: string; scoreDeduction?: number; evidenceIds: string[]; mitigation?: string };

export interface ReportOutput {
  schemaVersion: string;
  reportId: string;
  productName: string;
  dateGenerated: string;
  capturedAtRange: {
    earliest: string;
    latest: string;
    isOlderThan90Days: boolean;
  };
  priceSummary: {
    min: number | null;
    max: number | null;
    currency: string;
    evidenceIds: string[];
  };
  overallScore: number | null;
  overallScoreExact: number | null;
  decisionLabel: DecisionLabel;
  decisionStatus: DecisionStatus;
  confidenceLabel: ConfidenceLabel;
  coveragePercent: number;
  independentSourceCount: number;
  criteriaScores: Record<CriterionId, CriterionScoreResult>;
  strengths: StrengthItem[];
  tradeoffs: TradeoffItem[];
  decisionReasons: { id: string; title: string; description: string; evidenceIds: string[]; impact: 'positive' | 'negative' }[];
  quickDecision: {
    recommendedFor: { text: string; evidenceIds: string[] }[];
    notRecommendedFor: { text: string; evidenceIds: string[] }[];
  };
  specTable: SpecTopicGroup[];
  claimVsReality: ClaimVsRealityItem[];
  quotes: ReviewerQuoteItem[];
  alternatives: AlternativeItem[];
  faq: FaqItem[];
  evidencePool: NormalizedEvidence[];
  diagnostics: DatasetReport;
}

export interface DatasetReport {
  totalRecordsLoaded: number;
  totalNormalizedRecords: number;
  totalAcceptedRecords: number;
  totalExcludedRecords: number;
  duplicateIdsFound: string[];
  normalizationErrors: { id?: string; issue: string }[];
  exclusionReasonsBreakdown: Record<string, number>;
  conflictsDetected: ConflictItem[];
  rulesetVersion: string;
  independentReviewSources: {
    source: string;
    reviewId: string;
    videoTitle?: string;
    videoUrl?: string;
    recordCount: number;
  }[];
  rejectedAtIngestCount: number;
  validationFailedCount: number;
  rejectedRecords: { recordId: string; reason: string; stage: 'ingest' | 'validation' }[];
  unmappedAttributes: { attribute: string; count: number }[];
}

export interface TaxonomyAttributeConfig {
  label: string;
  topic: string;
  type: 'number' | 'string' | 'duration' | 'price';
  cardinality: 'single' | 'multi';
  unit?: string;
  tolerance?: number;
  critical?: boolean;
}

export interface TaxonomyConfig {
  topics: { id: string; label: string; order: number }[];
  criticalAttributes: string[];
  attributes: Record<string, TaxonomyAttributeConfig>;
  aliases: Record<string, string>;
}

import { ConfidenceLabel, ConflictItem, CriterionId, CriterionScoreResult, NormalizedEvidence } from './types.js';
import { CRITERIA_DEFINITIONS } from './decisionRules.js';

export interface ConfidenceCalculationResult {
  confidenceLabel: ConfidenceLabel;
  coveragePercent: number;
  totalWeightRated: number;
  independentSourceCount: number;
  independentSources: string[];
  sourcesCovering70PercentWeight: boolean;
  hasUnresolvedCriticalConflict: boolean;
  reasons: string[];
}

export function calculateConfidence(
  criteriaScores: Record<CriterionId, CriterionScoreResult>,
  eligibleEvidence: NormalizedEvidence[],
  unresolvedConflicts: ConflictItem[]
): ConfidenceCalculationResult {
  const reasons: string[] = [];

  // 1. Calculate Coverage
  let totalRatedWeight = 0;
  let totalPossibleWeight = 0;

  for (const cid of Object.keys(CRITERIA_DEFINITIONS) as CriterionId[]) {
    const def = CRITERIA_DEFINITIONS[cid];
    totalPossibleWeight += def.weight;
    if (criteriaScores[cid]?.isRated) {
      totalRatedWeight += def.weight;
    }
  }

  const coveragePercent = Math.round((totalRatedWeight / totalPossibleWeight) * 100);

  // 2. Determine independent review sources used in scoring
  const evidenceIdsInScoring = new Set<string>();
  for (const scoreResult of Object.values(criteriaScores)) {
    if (scoreResult.isRated) {
      scoreResult.evidenceIdsUsed.forEach(id => evidenceIdsInScoring.add(id));
    }
  }

  const sourcesUsedSet = new Set<string>();
  const criteriaBySource = new Map<string, Set<CriterionId>>();

  for (const ev of eligibleEvidence) {
    if (evidenceIdsInScoring.has(ev.evidence_id)) {
      sourcesUsedSet.add(ev.source);

      // track which criteria this source supports
      for (const [cid, scoreResult] of Object.entries(criteriaScores)) {
        if (scoreResult.evidenceIdsUsed.includes(ev.evidence_id)) {
          if (!criteriaBySource.has(ev.source)) {
            criteriaBySource.set(ev.source, new Set());
          }
          criteriaBySource.get(ev.source)!.add(cid as CriterionId);
        }
      }
    }
  }

  const independentSources = Array.from(sourcesUsedSet);
  const independentSourceCount = independentSources.length;

  // Check if at least 2 independent sources cover criteria representing >= 70% of total weight
  // Calculate union weight of criteria covered by any 2 sources
  let sourcesCovering70PercentWeight = false;
  if (independentSourceCount >= 2) {
    // Find maximum combined weight of any pair of independent sources
    const sourcesList = Array.from(criteriaBySource.keys());
    for (let i = 0; i < sourcesList.length; i++) {
      for (let j = i + 1; j < sourcesList.length; j++) {
        const combinedCriteria = new Set([
          ...criteriaBySource.get(sourcesList[i])!,
          ...criteriaBySource.get(sourcesList[j])!
        ]);
        let combinedWeight = 0;
        for (const cid of combinedCriteria) {
          combinedWeight += CRITERIA_DEFINITIONS[cid].weight;
        }
        if (combinedWeight >= 0.70) {
          sourcesCovering70PercentWeight = true;
          break;
        }
      }
      if (sourcesCovering70PercentWeight) break;
    }
  }

  // 3. Critical conflict check
  const hasUnresolvedCriticalConflict = unresolvedConflicts.some(c => c.isCritical && !c.resolved);

  // 4. Derive Confidence Category
  let confidenceLabel: ConfidenceLabel;

  if (hasUnresolvedCriticalConflict) {
    confidenceLabel = 'INSUFFICIENT';
    reasons.push('Terdapat konflik kritis yang belum terselesaikan antar sumber review.');
  } else if (coveragePercent >= 80 && independentSourceCount >= 2 && sourcesCovering70PercentWeight) {
    confidenceLabel = 'HIGH';
    reasons.push(`Cakupan kriteria tinggi (${coveragePercent}%), diverifikasi oleh ${independentSourceCount} sumber independen (${independentSources.join(', ')}) yang mencakup >= 70% bobot kriteria.`);
  } else if (coveragePercent >= 60) {
    confidenceLabel = 'MEDIUM';
    reasons.push(`Cakupan kriteria memadai (${coveragePercent}%), namun syarat multi-sumber HIGH belum terpenuhi secara penuh.`);
  } else if (coveragePercent > 0) {
    confidenceLabel = 'LOW';
    reasons.push(`Cakupan kriteria rendah (${coveragePercent}% < 60%).`);
  } else {
    confidenceLabel = 'INSUFFICIENT';
    reasons.push('Tidak ada kriteria yang dapat dinilai secara defensibel.');
  }

  return {
    confidenceLabel,
    coveragePercent,
    totalWeightRated: totalRatedWeight,
    independentSourceCount,
    independentSources,
    sourcesCovering70PercentWeight,
    hasUnresolvedCriticalConflict,
    reasons
  };
}

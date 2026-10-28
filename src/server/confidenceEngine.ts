import { ConfidenceLabel, ConflictItem, CriterionId, CriterionScoreResult, NormalizedEvidence } from './types.js';
import { getRubricConfig } from './ruleEngine.js';

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
  conflicts: ConflictItem[]
): ConfidenceCalculationResult {
  const config = getRubricConfig();
  const reasons: string[] = [];

  // 1. Calculate Coverage
  let totalRatedWeight = 0;
  let totalPossibleWeight = 0;

  for (const [cid, def] of Object.entries(config.criteria) as [CriterionId, typeof config.criteria[CriterionId]][]) {
    totalPossibleWeight += def.weight;
    if (criteriaScores[cid]?.isRated && criteriaScores[cid]?.score !== null) {
      totalRatedWeight += def.weight;
    }
  }

  const coveragePercent = Math.round((totalRatedWeight / totalPossibleWeight) * 100);

  // 2. Identify independent sources
  const sourcesSet = new Set<string>();
  const criteriaBySource = new Map<string, Set<CriterionId>>();

  for (const ev of eligibleEvidence) {
    if (ev.source) {
      sourcesSet.add(ev.source);

      // Track which rated criteria this source contributes to
      for (const [cid, scoreResult] of Object.entries(criteriaScores)) {
        if (scoreResult.isRated && scoreResult.evidenceIdsUsed.includes(ev.evidence_id)) {
          if (!criteriaBySource.has(ev.source)) {
            criteriaBySource.set(ev.source, new Set());
          }
          criteriaBySource.get(ev.source)!.add(cid as CriterionId);
        }
      }
    }
  }

  const independentSources = Array.from(sourcesSet);
  const independentSourceCount = independentSources.length;

  // 3. Multi-source 70% weight coverage check
  let sourcesCovering70PercentWeight = false;
  if (independentSourceCount >= 2) {
    const sourcesList = Array.from(criteriaBySource.keys());
    for (let i = 0; i < sourcesList.length; i++) {
      for (let j = i + 1; j < sourcesList.length; j++) {
        const combinedCriteria = new Set([
          ...(criteriaBySource.get(sourcesList[i]) || []),
          ...(criteriaBySource.get(sourcesList[j]) || [])
        ]);
        let combinedWeight = 0;
        for (const cid of combinedCriteria) {
          combinedWeight += config.criteria[cid].weight;
        }
        if (combinedWeight >= 0.70) {
          sourcesCovering70PercentWeight = true;
          break;
        }
      }
      if (sourcesCovering70PercentWeight) break;
    }
  }

  // 4. Critical unresolved conflict check
  const hasUnresolvedCriticalConflict = conflicts.some(c => c.isCritical && !c.resolved);

  // 5. Determine Confidence Label
  let confidenceLabel: ConfidenceLabel;

  if (hasUnresolvedCriticalConflict) {
    confidenceLabel = 'INSUFFICIENT';
    reasons.push('Terdapat konflik kritis yang belum terselesaikan antar sumber review.');
  } else if (independentSourceCount <= 1) {
    // Warning if only 1 source: confidence capped to LOW
    confidenceLabel = 'LOW';
    reasons.push('Hanya terdapat 1 sumber review independen; confidence dibatasi pada tingkat LOW.');
  } else if (coveragePercent >= 80 && independentSourceCount >= 2 && sourcesCovering70PercentWeight) {
    confidenceLabel = 'HIGH';
    reasons.push(`Cakupan kriteria tinggi (${coveragePercent}%), diverifikasi oleh ${independentSourceCount} sumber independen (${independentSources.join(', ')}) yang mencakup >= 70% bobot kriteria.`);
  } else if (coveragePercent >= 60) {
    confidenceLabel = 'MEDIUM';
    reasons.push(`Cakupan kriteria memadai (${coveragePercent}%), namun multi-sumber belum mencakup 70% bobot kriteria.`);
  } else if (coveragePercent > 0) {
    confidenceLabel = 'LOW';
    reasons.push(`Cakupan kriteria rendah (${coveragePercent}% < 60%).`);
  } else {
    confidenceLabel = 'INSUFFICIENT';
    reasons.push('Tidak ada kriteria yang dapat dinilai.');
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

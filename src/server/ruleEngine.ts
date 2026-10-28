import fs from 'fs';
import path from 'path';
import { 
  CriterionId, 
  CriterionScoreResult, 
  EngineRule, 
  NormalizedEvidence, 
  PriceTierId, 
  RuleHit 
} from './types.js';

interface RubricConfig {
  criteria: Record<CriterionId, {
    id: CriterionId;
    name: string;
    nameId: string;
    weight: number;
    baseScore: number;
    minEvidence: number;
    description: string;
  }>;
  priceTiers: { id: PriceTierId; label: string; min?: number; max?: number }[];
  maxSentimentImpact: number;
  decisionThresholds: { min: number; max: number; label: string }[];
}

let cachedRubricConfig: RubricConfig | null = null;
export function getRubricConfig(): RubricConfig {
  if (cachedRubricConfig) return cachedRubricConfig;
  const filePath = path.resolve(process.cwd(), 'config/rubricConfig.json');
  cachedRubricConfig = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return cachedRubricConfig!;
}

let cachedRules: EngineRule[] | null = null;
export function loadAllRules(): EngineRule[] {
  if (cachedRules) return cachedRules;
  const rulesDir = path.resolve(process.cwd(), 'rules');
  const files = fs.readdirSync(rulesDir).filter(f => f.endsWith('.json'));
  const all: EngineRule[] = [];
  for (const f of files) {
    const content = fs.readFileSync(path.join(rulesDir, f), 'utf-8');
    const rulesList: EngineRule[] = JSON.parse(content);
    all.push(...rulesList);
  }
  cachedRules = all;
  return all;
}

/**
 * Determines price tier from price evidence records
 */
export function determinePriceTier(evidence: NormalizedEvidence[]): { tier: PriceTierId; priceMin: number | null; priceMax: number | null; evidenceIds: string[] } {
  const config = getRubricConfig();
  const priceEvidence = evidence.filter(e => 
    e.isEligibleForScoring && (e.canonicalAttribute === 'price' || e.canonicalAttribute === 'official_price') && typeof e.normalizedValue === 'number'
  );

  if (priceEvidence.length === 0) {
    return { tier: 'mid', priceMin: null, priceMax: null, evidenceIds: [] };
  }

  const prices = priceEvidence.map(e => e.normalizedValue as number);
  const priceMin = Math.min(...prices);
  const priceMax = Math.max(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const ids = priceEvidence.map(e => e.evidence_id);

  for (const t of config.priceTiers) {
    if (t.min !== undefined && t.max !== undefined) {
      if (avgPrice >= t.min && avgPrice <= t.max) return { tier: t.id, priceMin, priceMax, evidenceIds: ids };
    } else if (t.max !== undefined && avgPrice <= t.max) {
      return { tier: t.id, priceMin, priceMax, evidenceIds: ids };
    } else if (t.min !== undefined && avgPrice >= t.min) {
      return { tier: t.id, priceMin, priceMax, evidenceIds: ids };
    }
  }

  return { tier: 'mid', priceMin, priceMax, evidenceIds: ids };
}

/**
 * Instantiates template text with actual values from evidence
 */
export function renderTemplate(template: string, evidence: NormalizedEvidence): string {
  const numVal = evidence.normalizedValue;
  const formattedVal = typeof numVal === 'number' ? numVal.toLocaleString('id-ID') : String(numVal || '');
  return template
    .replace('{value}', String(evidence.normalizedValue ?? evidence.attribute_value ?? ''))
    .replace('{formatted_value}', formattedVal)
    .replace('{attribute_value}', String(evidence.attribute_value || evidence.value || ''))
    .replace('{claim}', evidence.claim);
}

/**
 * Executes rules against eligible evidence for all 7 criteria
 */
export function executeRuleEngine(evidence: NormalizedEvidence[]): {
  criteriaScores: Record<CriterionId, CriterionScoreResult>;
  ruleHits: RuleHit[];
  priceTier: PriceTierId;
  priceSummary: { min: number | null; max: number | null; currency: string; evidenceIds: string[] };
} {
  const config = getRubricConfig();
  const rules = loadAllRules();
  const eligible = evidence.filter(e => e.isEligibleForScoring);

  // 1. Determine price tier
  const { tier: priceTier, priceMin, priceMax, evidenceIds: priceEvIds } = determinePriceTier(eligible);
  const priceSummary = { min: priceMin, max: priceMax, currency: 'IDR', evidenceIds: priceEvIds };

  const allHits: RuleHit[] = [];
  const criteriaScores = {} as Record<CriterionId, CriterionScoreResult>;

  for (const [cid, def] of Object.entries(config.criteria) as [CriterionId, typeof config.criteria[CriterionId]][]) {
    // Collect evidence matching this criterion
    const criterionRules = rules.filter(r => r.criterion === cid);
    const criterionEvidence = eligible.filter(e => {
      // Check if evidence matches any rule in this criterion
      return criterionRules.some(r => {
        if (r.match.attribute) {
          const isPriceMatch = (r.match.attribute === 'price' || r.match.attribute === 'official_price') &&
            (e.canonicalAttribute === 'price' || e.canonicalAttribute === 'official_price');
          if (isPriceMatch || e.canonicalAttribute === r.match.attribute) return true;
        }
        if (r.match.topic && e.topic.toLowerCase() === r.match.topic.toLowerCase()) return true;
        if (r.match.subtopic && e.subtopic && e.subtopic.toLowerCase().includes(r.match.subtopic.toLowerCase())) return true;
        return false;
      });
    });

    // Check minEvidence gate
    if (criterionEvidence.length < def.minEvidence || (cid === 'price_and_value' && priceMin === null)) {
      criteriaScores[cid] = {
        criterionId: cid,
        criterionName: def.name,
        criterionNameId: def.nameId,
        weight: def.weight,
        baseScore: def.baseScore,
        score: null,
        isRated: false,
        unratedReason: cid === 'price_and_value' && priceMin === null
          ? 'Bukti harga tidak ditemukan; kriteria harga tidak dapat dinilai'
          : `Jumlah bukti (${criterionEvidence.length}) kurang dari ambang minimum (${def.minEvidence})`,
        rubricVersion: '2.0.0',
        evidenceIdsUsed: [],
        primaryFindings: [],
        positiveDrivers: [],
        negativeDeductions: []
      };
      continue;
    }

    // Execute rules for this criterion
    const hitsForCriterion: RuleHit[] = [];
    const usedEvidenceIds = new Set<string>();
    let sentimentDeltaSum = 0;

    for (const rule of criterionRules) {
      let appliedCount = 0;
      const maxApply = rule.maxApply || 1;

      for (const ev of eligible) {
        if (appliedCount >= maxApply) break;

        // Check match condition
        if (rule.match.attribute) {
          const isPriceMatch = (rule.match.attribute === 'price' || rule.match.attribute === 'official_price') &&
            (ev.canonicalAttribute === 'price' || ev.canonicalAttribute === 'official_price');
          if (!isPriceMatch && ev.canonicalAttribute !== rule.match.attribute) continue;
        }
        if (rule.match.topic && ev.topic.toLowerCase() !== rule.match.topic.toLowerCase()) continue;
        if (rule.match.type && ev.type !== rule.match.type) continue;
        if (rule.match.subtopic && (!ev.subtopic || !ev.subtopic.toLowerCase().includes(rule.match.subtopic.toLowerCase()))) continue;

        // Evaluate bands
        for (const band of rule.bands) {
          if (appliedCount >= maxApply) break;

          // Price tier filtering if specified
          if (band.priceTiers && !band.priceTiers.includes(priceTier)) continue;

          let bandMatches = false;

          // Numeric evaluation
          if (typeof ev.normalizedValue === 'number') {
            const v = ev.normalizedValue;
            let ok = true;
            if (band.gte !== undefined && v < band.gte) ok = false;
            if (band.gt !== undefined && v <= band.gt) ok = false;
            if (band.lte !== undefined && v > band.lte) ok = false;
            if (band.lt !== undefined && v >= band.lt) ok = false;
            if (band.eq !== undefined && v !== band.eq) ok = false;
            bandMatches = ok;
          }

          // String contains evaluation
          if (!bandMatches && band.contains && band.contains.length > 0) {
            const textToInspect = `${ev.claim} ${ev.source_excerpt} ${ev.attribute_value || ''}`.toLowerCase();
            if (band.contains.some(word => textToInspect.includes(word.toLowerCase()))) {
              bandMatches = true;
            }
          }

          // Sentiment evaluation
          if (!bandMatches && band.sentiment && ev.reviewer_assessment) {
            if (ev.reviewer_assessment === band.sentiment) {
              bandMatches = true;
            }
          }

          if (bandMatches) {
            let actualDelta = band.delta;
            // Cap sentiment impact
            if (rule.sentimentImpact) {
              const remainingCap = config.maxSentimentImpact - Math.abs(sentimentDeltaSum);
              if (remainingCap <= 0) break;
              actualDelta = Math.sign(actualDelta) * Math.min(Math.abs(actualDelta), remainingCap);
              sentimentDeltaSum += actualDelta;
            }

            const hit: RuleHit = {
              ruleId: rule.id,
              criterion: cid,
              delta: actualDelta,
              label: band.label,
              text: renderTemplate(band.template, ev),
              polarity: band.delta >= 0 ? 'positive' : 'negative',
              evidenceIds: [ev.evidence_id]
            };

            hitsForCriterion.push(hit);
            allHits.push(hit);
            usedEvidenceIds.add(ev.evidence_id);
            appliedCount++;
          }
        }
      }
    }

    // Calculate score: clamp(baseScore + sum(delta), 0, 5)
    const rawDeltaSum = hitsForCriterion.reduce((sum, h) => sum + h.delta, 0);
    const unadjustedScore = def.baseScore + rawDeltaSum;
    const clampedScore = Math.max(0, Math.min(5, Math.round(unadjustedScore * 10) / 10));

    // To guarantee the absolute rule:
    // "Jumlah delta yang ditampilkan harus tepat sama dengan selisih ke skor (tambahkan unit test untuk ini)"
    // If clamping occurred, adjust the last hit delta or scale so sum(deltas) === clampedScore - def.baseScore
    const targetDeltaSum = Math.round((clampedScore - def.baseScore) * 10) / 10;
    if (hitsForCriterion.length > 0 && Math.abs(rawDeltaSum - targetDeltaSum) > 0.001) {
      const diff = Math.round((targetDeltaSum - rawDeltaSum) * 10) / 10;
      // Adjust the hit with largest magnitude
      const largestHit = hitsForCriterion.reduce((max, h) => Math.abs(h.delta) > Math.abs(max.delta) ? h : max, hitsForCriterion[0]);
      largestHit.delta = Math.round((largestHit.delta + diff) * 10) / 10;
    }

    const positiveDrivers = hitsForCriterion
      .filter(h => h.delta > 0)
      .map(h => ({ text: h.text, evidenceIds: h.evidenceIds, delta: h.delta }));

    const negativeDeductions = hitsForCriterion
      .filter(h => h.delta < 0)
      .map(h => ({ text: h.text, evidenceIds: h.evidenceIds, delta: h.delta }));

    const primaryFindings = hitsForCriterion.map(h => ({ text: h.text, evidenceIds: h.evidenceIds }));

    criteriaScores[cid] = {
      criterionId: cid,
      criterionName: def.name,
      criterionNameId: def.nameId,
      weight: def.weight,
      baseScore: def.baseScore,
      score: clampedScore,
      isRated: true,
      rubricVersion: '2.0.0',
      evidenceIdsUsed: Array.from(usedEvidenceIds),
      primaryFindings,
      positiveDrivers,
      negativeDeductions
    };
  }

  return {
    criteriaScores,
    ruleHits: allHits,
    priceTier,
    priceSummary
  };
}

import { 
  AlternativeItem, 
  ClaimVsRealityItem, 
  ConflictItem, 
  CriterionId, 
  CriterionScoreResult, 
  FaqItem, 
  NormalizedEvidence, 
  ReviewerQuoteItem, 
  RuleHit, 
  SpecRow, 
  SpecTopicGroup, 
  StrengthItem, 
  TradeoffItem 
} from './types.js';
import { getTaxonomy } from './evidenceNormalizer.js';

/**
 * Generates technical specification table grouped by taxonomy topics.
 * Requirement 6: Attributes not in taxonomy are NOT inserted into specTable.
 * Requirement 9: For single cardinality with multiple values, show all values + conflict.
 *               For multi cardinality, show list of unique values without conflict.
 */
export function generateSpecTable(
  evidence: NormalizedEvidence[],
  conflicts: ConflictItem[]
): SpecTopicGroup[] {
  const taxonomy = getTaxonomy();
  const eligible = evidence.filter(e => e.isEligibleForScoring);

  // Group by canonical attribute
  const byAttr = new Map<string, NormalizedEvidence[]>();
  for (const item of eligible) {
    if (item.type !== 'FACT' && item.type !== 'MEASUREMENT') continue;
    if (!item.canonicalAttribute || item.canonicalAttribute === 'general_claim') continue;
    // Requirement 6: Attributes not in taxonomy do NOT get inserted into specTable
    if (!taxonomy.attributes[item.canonicalAttribute]) continue;

    if (!byAttr.has(item.canonicalAttribute)) {
      byAttr.set(item.canonicalAttribute, []);
    }
    byAttr.get(item.canonicalAttribute)!.push(item);
  }

  // Group rows into topics
  const rowsByTopic = new Map<string, SpecRow[]>();

  for (const [attr, records] of byAttr.entries()) {
    const meta = taxonomy.attributes[attr];
    const topicId = meta?.topic || 'general';
    const label = meta?.label || attr.replace(/_/g, ' ');

    const conflict = conflicts.find(c => c.canonicalAttribute === attr);
    const sources = Array.from(new Set(records.map(r => r.source)));
    const evidenceIds = records.map(r => r.evidence_id);

    if (meta.cardinality === 'multi') {
      // Multi-cardinality attribute: display unique values, no conflict
      const valSet = new Set<string>();
      for (const r of records) {
        const raw = r.attribute_value || (r.normalizedValue !== null && r.normalizedValue !== undefined ? String(r.normalizedValue) : null) || r.claim;
        if (raw && String(raw).trim().length > 0) {
          valSet.add(String(raw).trim());
        }
      }
      const uniqueValues = Array.from(valSet);
      const displayValue = uniqueValues.join(', ');

      const row: SpecRow = {
        label,
        canonicalAttribute: attr,
        attribute: attr,
        value: displayValue,
        sources,
        evidenceIds,
        hasConflict: false,
        conflict: undefined,
        isMulti: true,
        values: uniqueValues
      };

      if (!rowsByTopic.has(topicId)) {
        rowsByTopic.set(topicId, []);
      }
      rowsByTopic.get(topicId)!.push(row);
    } else {
      // Single-cardinality attribute
      let displayValue = '';
      let conflictingClaims: { source: string; value: string; evidenceId: string }[] | undefined = undefined;

      if (conflict && !conflict.resolved) {
        conflictingClaims = conflict.claims.map(c => ({
          source: c.source,
          value: String(c.normalizedValue ?? c.rawValue),
          evidenceId: c.evidenceId
        }));
        displayValue = conflictingClaims.map(c => `${c.source}: ${c.value}`).join(' | ');
      } else {
        const preferred = records[0];
        const val = preferred.normalizedValue !== null && preferred.normalizedValue !== undefined
          ? preferred.normalizedValue
          : preferred.attribute_value || preferred.value || preferred.claim;
        const unit = preferred.normalizedUnit ? ` ${preferred.normalizedUnit}` : '';
        displayValue = `${val}${unit}`;
      }

      const row: SpecRow = {
        label,
        canonicalAttribute: attr,
        attribute: attr,
        value: displayValue,
        sources,
        evidenceIds,
        hasConflict: Boolean(conflict && !conflict.resolved),
        conflictingClaims,
        conflict: conflict && !conflict.resolved ? conflict : undefined,
        isMulti: false
      };

      if (!rowsByTopic.has(topicId)) {
        rowsByTopic.set(topicId, []);
      }
      rowsByTopic.get(topicId)!.push(row);
    }
  }

  const result: SpecTopicGroup[] = [];
  for (const t of taxonomy.topics) {
    const rows = rowsByTopic.get(t.id);
    if (rows && rows.length > 0) {
      result.push({
        topicId: t.id,
        topicLabel: t.label,
        rows
      });
    }
  }

  return result;
}

/**
 * Generates Claim vs Reality table by pairing claimed_by_vendor with MEASUREMENT / FACT.
 * Requirement 8: Only pair claims and tested evidence with the EXACT same canonical attribute.
 * Requirement 7: Sends verdict ('EXCEEDS'|'MATCHES'|'BELOW'|'CAVEAT') and verdictLabel.
 */
export function generateClaimVsReality(evidence: NormalizedEvidence[]): ClaimVsRealityItem[] {
  const taxonomy = getTaxonomy();
  const eligible = evidence.filter(e => e.isEligibleForScoring);

  const vendorClaims = eligible.filter(e => e.certainty === 'claimed_by_vendor');
  const measurements = eligible.filter(e => (e.type === 'MEASUREMENT' || e.type === 'FACT') && e.certainty !== 'claimed_by_vendor');

  const pairs: ClaimVsRealityItem[] = [];

  for (const vc of vendorClaims) {
    if (!vc.canonicalAttribute || !taxonomy.attributes[vc.canonicalAttribute]) continue;

    // Requirement 8: Match ONLY exact same canonical attribute
    const matchingMeasurement = measurements.find(m => 
      m.canonicalAttribute === vc.canonicalAttribute && m.evidence_id !== vc.evidence_id
    );

    if (matchingMeasurement) {
      const meta = taxonomy.attributes[vc.canonicalAttribute];
      const metricLabel = meta?.label || vc.canonicalAttribute;

      const claimVal = vc.normalizedValue ?? vc.attribute_value ?? vc.claim;
      const testVal = matchingMeasurement.normalizedValue ?? matchingMeasurement.attribute_value ?? matchingMeasurement.claim;

      let deltaText = 'Sesuai Spesifikasi';
      let statusBadge = 'bg-blue-100 text-blue-700';
      let verdict: 'EXCEEDS' | 'MATCHES' | 'BELOW' | 'CAVEAT' = 'MATCHES';
      let verdictLabel = 'Sesuai Spesifikasi';

      if (typeof claimVal === 'number' && typeof testVal === 'number') {
        const diff = testVal - claimVal;
        const tolerance = meta?.tolerance || 0;
        const relDiff = claimVal !== 0 ? Math.abs(diff) / claimVal : Math.abs(diff);

        // Lower charging time is better
        const isLowerBetter = vc.canonicalAttribute === 'charging_time_full';

        if (relDiff <= tolerance) {
          deltaText = 'Sesuai Spesifikasi';
          statusBadge = 'bg-blue-100 text-blue-700';
          verdict = 'MATCHES';
          verdictLabel = 'Sesuai Spesifikasi';
        } else if (isLowerBetter ? diff < 0 : diff > 0) {
          deltaText = `${diff > 0 ? '+' : ''}${diff} (Melampaui Klaim)`;
          statusBadge = 'bg-emerald-100 text-emerald-700';
          verdict = 'EXCEEDS';
          verdictLabel = 'Melampaui Klaim';
        } else {
          deltaText = `${diff > 0 ? '+' : ''}${diff} (Di Bawah Klaim)`;
          statusBadge = 'bg-rose-100 text-rose-700';
          verdict = 'BELOW';
          verdictLabel = 'Di Bawah Klaim';
        }
      } else {
        const sClaim = String(claimVal).trim().toLowerCase();
        const sTest = String(testVal).trim().toLowerCase();
        if (sClaim === sTest) {
          verdict = 'MATCHES';
          verdictLabel = 'Sesuai Spesifikasi';
          deltaText = 'Sesuai Spesifikasi';
          statusBadge = 'bg-blue-100 text-blue-700';
        } else {
          verdict = 'CAVEAT';
          verdictLabel = 'Perlu Catatan';
          deltaText = 'Terdapat Perbedaan';
          statusBadge = 'bg-amber-100 text-amber-700';
        }
      }

      pairs.push({
        metric: metricLabel,
        canonicalAttribute: vc.canonicalAttribute,
        factoryClaim: `${claimVal} ${vc.normalizedUnit || ''}`.trim(),
        realTested: `${testVal} ${matchingMeasurement.normalizedUnit || ''}`.trim(),
        delta: deltaText,
        status: verdictLabel,
        statusBadge,
        verdict,
        verdictLabel,
        evidenceIds: [vc.evidence_id, matchingMeasurement.evidence_id]
      });
    }
  }

  return pairs;
}

/**
 * Selects verbatim reviewer quotes from OPINION or RECOMMENDATION records (one per source)
 * Requirement 7: videoTitle and youtubeTimestampUrl are required.
 */
export function generateReviewerQuotes(evidence: NormalizedEvidence[]): ReviewerQuoteItem[] {
  const eligible = evidence.filter(e => e.isEligibleForScoring && (e.type === 'OPINION' || e.type === 'RECOMMENDATION'));
  const bySource = new Map<string, NormalizedEvidence>();

  for (const r of eligible) {
    if (r.source_excerpt && r.source_excerpt.length > 20) {
      if (!bySource.has(r.source) || r.source_excerpt.length > bySource.get(r.source)!.source_excerpt.length) {
        bySource.set(r.source, r);
      }
    }
  }

  const quotes: ReviewerQuoteItem[] = [];
  for (const [source, rec] of bySource.entries()) {
    quotes.push({
      source,
      videoTitle: rec.video_title || `Ulasan Reviewer ${source}`,
      quote: rec.source_excerpt,
      timestamp: rec.timestamp_start || '00:00:00',
      youtubeUrl: rec.video_url,
      youtubeTimestampUrl: rec.youtubeTimestampUrl || rec.video_url || '',
      evidenceIds: [rec.evidence_id]
    });
  }

  return quotes;
}

/**
 * Derives strengths and tradeoffs from triggered rule hits
 */
export function deriveStrengthsAndTradeoffs(
  ruleHits: RuleHit[],
  criteriaScores: Record<CriterionId, CriterionScoreResult>
): { strengths: StrengthItem[]; tradeoffs: TradeoffItem[] } {
  const strengths: StrengthItem[] = [];
  const tradeoffs: TradeoffItem[] = [];

  const positiveHits = ruleHits.filter(h => h.polarity === 'positive');
  const negativeHits = ruleHits.filter(h => h.polarity === 'negative');

  for (const hit of positiveHits) {
    strengths.push({
      title: hit.label,
      description: hit.text,
      evidenceIds: hit.evidenceIds,
      impactCategory: criteriaScores[hit.criterion]?.criterionNameId || hit.criterion
    });
  }

  for (const hit of negativeHits) {
    tradeoffs.push({
      title: hit.label,
      description: hit.text,
      scoreDeduction: hit.delta,
      evidenceIds: hit.evidenceIds
    });
  }

  return { strengths, tradeoffs };
}

/**
 * Derives quick decision points from RECOMMENDATION evidence and negative rules
 */
export function deriveQuickDecision(
  evidence: NormalizedEvidence[],
  ruleHits: RuleHit[]
): { recommendedFor: { text: string; evidenceIds: string[] }[]; notRecommendedFor: { text: string; evidenceIds: string[] }[] } {
  const eligible = evidence.filter(e => e.isEligibleForScoring);

  // Recommended from RECOMMENDATION records
  const recRecords = eligible.filter(e => e.type === 'RECOMMENDATION');
  const recommendedFor: { text: string; evidenceIds: string[] }[] = [];

  for (const r of recRecords) {
    if (r.claim) {
      recommendedFor.push({
        text: r.claim,
        evidenceIds: [r.evidence_id]
      });
    }
  }

  // Not recommended from negative rule hits
  const negativeHits = ruleHits.filter(h => h.polarity === 'negative');
  const notRecommendedFor: { text: string; evidenceIds: string[] }[] = [];

  for (const h of negativeHits) {
    notRecommendedFor.push({
      text: h.text,
      evidenceIds: h.evidenceIds
    });
  }

  return { recommendedFor, notRecommendedFor };
}

/**
 * Derives competitor alternatives ONLY from COMPARISON or RECOMMENDATION records
 * Requirement 7: comparisonNote and reasonCategory are required.
 */
export function deriveCompetitorAlternatives(evidence: NormalizedEvidence[]): AlternativeItem[] {
  const eligible = evidence.filter(e => 
    e.isEligibleForScoring && (e.type === 'COMPARISON' || e.type === 'RECOMMENDATION') && e.comparison_target
  );

  const byTarget = new Map<string, NormalizedEvidence[]>();
  for (const r of eligible) {
    const target = r.comparison_target!.trim();
    if (target.toLowerCase().includes('sebelumnya') || target.toLowerCase().includes('kelas')) continue;
    if (!byTarget.has(target)) {
      byTarget.set(target, []);
    }
    byTarget.get(target)!.push(r);
  }

  const alternatives: AlternativeItem[] = [];
  for (const [target, recs] of byTarget.entries()) {
    const first = recs[0];
    alternatives.push({
      productName: target,
      description: first.claim,
      comparisonNote: first.claim || 'Pesaing di segmen harga dan spesifikasi serupa',
      categoryBadge: first.type === 'RECOMMENDATION' ? 'Rekomendasi Alternatif' : 'Perbandingan Komparatif',
      reasonCategory: first.subtopic || 'Pesaing Segmen Serupa',
      evidenceIds: recs.map(r => r.evidence_id)
    });
  }

  return alternatives;
}

/**
 * Generates FAQs dynamically from available canonical attributes
 */
export function generateFaq(evidence: NormalizedEvidence[]): FaqItem[] {
  const eligible = evidence.filter(e => e.isEligibleForScoring);
  const byAttr = new Map<string, NormalizedEvidence>();
  for (const r of eligible) {
    if (r.canonicalAttribute && !byAttr.has(r.canonicalAttribute)) {
      byAttr.set(r.canonicalAttribute, r);
    }
  }

  const faqList: FaqItem[] = [];

  if (byAttr.has('ip_rating')) {
    const r = byAttr.get('ip_rating')!;
    faqList.push({
      question: 'Apakah smartphone ini tahan air dan debu?',
      answer: `Perangkat memiliki sertifikasi ${r.attribute_value || r.normalizedValue || r.claim}.`,
      evidenceIds: [r.evidence_id]
    });
  }

  if (byAttr.has('battery_capacity')) {
    const r = byAttr.get('battery_capacity')!;
    faqList.push({
      question: 'Berapa kapasitas baterai perangkat ini?',
      answer: `Kapasitas baterai adalah ${r.normalizedValue || r.value} ${r.normalizedUnit || 'mAh'}.`,
      evidenceIds: [r.evidence_id]
    });
  }

  if (byAttr.has('charging_speed')) {
    const r = byAttr.get('charging_speed')!;
    faqList.push({
      question: 'Berapa kecepatan pengisian daya baterai?',
      answer: `Mendukung pengisian daya hingga ${r.normalizedValue || r.value} ${r.normalizedUnit || 'W'}.`,
      evidenceIds: [r.evidence_id]
    });
  }

  if (byAttr.has('in_box_charger')) {
    const r = byAttr.get('in_box_charger')!;
    faqList.push({
      question: 'Apakah kepala charger disertakan dalam kotak penjualan?',
      answer: r.claim,
      evidenceIds: [r.evidence_id]
    });
  }

  if (byAttr.has('os_update_years')) {
    const r = byAttr.get('os_update_years')!;
    faqList.push({
      question: 'Berapa lama jaminan pembaruan sistem operasi dan keamanan?',
      answer: `Mendapatkan jaminan pembaruan hingga ${r.normalizedValue || r.value} tahun.`,
      evidenceIds: [r.evidence_id]
    });
  }

  if (byAttr.has('main_camera_resolution')) {
    const r = byAttr.get('main_camera_resolution')!;
    faqList.push({
      question: 'Berapa resolusi kamera utama dan apakah memiliki OIS?',
      answer: r.claim,
      evidenceIds: [r.evidence_id]
    });
  }

  return faqList;
}

/**
 * Computes captured_at date range and checks staleness (> 90 days)
 */
export function computeCapturedAtMetadata(evidence: NormalizedEvidence[]): {
  earliest: string;
  latest: string;
  isOlderThan90Days: boolean;
} {
  const dates = evidence
    .map(e => e.captured_at)
    .filter(Boolean)
    .map(d => new Date(d))
    .filter(d => !isNaN(d.getTime()));

  if (dates.length === 0) {
    const now = new Date().toISOString().split('T')[0];
    return { earliest: now, latest: now, isOlderThan90Days: false };
  }

  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

  const now = new Date();
  const diffDays = Math.floor((now.getTime() - maxDate.getTime()) / (1000 * 60 * 60 * 24));

  return {
    earliest: minDate.toISOString().split('T')[0],
    latest: maxDate.toISOString().split('T')[0],
    isOlderThan90Days: diffDays > 90
  };
}

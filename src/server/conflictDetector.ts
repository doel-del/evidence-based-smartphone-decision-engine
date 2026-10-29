import { ConflictItem, NormalizedEvidence } from './types.js';
import { getTaxonomy } from './evidenceNormalizer.js';

export function detectGenericConflicts(evidence: NormalizedEvidence[]): ConflictItem[] {
  const taxonomy = getTaxonomy();
  const eligible = evidence.filter(e => e.isEligibleForScoring);
  const conflicts: ConflictItem[] = [];

  // Group evidence by canonical attribute
  const byAttr = new Map<string, NormalizedEvidence[]>();
  for (const item of eligible) {
    if (!item.canonicalAttribute || item.canonicalAttribute === 'general_claim') continue;
    // Requirement 6: Attributes not in taxonomy do NOT participate in conflict detection
    const attrMeta = taxonomy.attributes[item.canonicalAttribute];
    if (!attrMeta) continue;
    // Requirement 4: Multi-cardinality attributes do NOT participate in conflict detection
    if (attrMeta.cardinality === 'multi') continue;

    if (!byAttr.has(item.canonicalAttribute)) {
      byAttr.set(item.canonicalAttribute, []);
    }
    byAttr.get(item.canonicalAttribute)!.push(item);
  }

  for (const [attr, records] of byAttr.entries()) {
    // Only check if multiple different sources report this attribute
    const bySource = new Map<string, NormalizedEvidence>();
    for (const r of records) {
      if (!bySource.has(r.source)) {
        bySource.set(r.source, r);
      }
    }

    if (bySource.size < 2) continue; // Single source, no inter-source conflict possible

    const sourceRecords = Array.from(bySource.values());
    const attrMeta = taxonomy.attributes[attr];
    const isCritical = taxonomy.criticalAttributes.includes(attr) || (attrMeta && attrMeta.critical === true);
    const tolerance = attrMeta?.tolerance || 0;

    // Compare values across sources
    let hasDivergence = false;
    let numericDiffMax = 0;

    const values = sourceRecords.map(r => {
      const v = r.normalizedValue !== null && r.normalizedValue !== undefined ? r.normalizedValue : r.attribute_value || r.claim;
      return typeof v === 'string' ? v.trim().toLowerCase() : v;
    });

    // Check equivalence
    const firstVal = values[0];
    for (let i = 1; i < values.length; i++) {
      const currentVal = values[i];
      if (typeof firstVal === 'number' && typeof currentVal === 'number') {
        const diff = Math.abs(firstVal - currentVal) / Math.max(firstVal, currentVal);
        if (diff > numericDiffMax) numericDiffMax = diff;
        if (diff > tolerance) {
          hasDivergence = true;
        }
      } else {
        // String comparison: exact match on normalized alphanumeric string
        const clean1 = String(firstVal).replace(/[^a-z0-9]/g, '');
        const clean2 = String(currentVal).replace(/[^a-z0-9]/g, '');
        if (clean1 !== clean2) {
          hasDivergence = true;
        }
      }
    }

    if (hasDivergence) {
      // Reconciled ONLY if tolerance permits and numeric difference is under tolerance
      const isReconciled = tolerance > 0 && numericDiffMax <= tolerance;

      const resolutionNote = isReconciled
        ? `Varians numerik ${(numericDiffMax * 100).toFixed(1)}% berada di dalam batas toleransi (${(tolerance * 100).toFixed(1)}%).`
        : `Ditemukan perbedaan nilai yang tidak dapat direkonsiliasi antara sumber review untuk atribut ${attrMeta?.label || attr}.`;

      conflicts.push({
        id: `conflict-${attr}`,
        canonicalAttribute: attr,
        topic: attrMeta?.topic || 'general',
        isCritical: isCritical && !isReconciled,
        resolved: isReconciled,
        resolutionNote,
        claims: sourceRecords.map(r => ({
          source: r.source,
          claim: r.claim,
          rawValue: r.attribute_value || r.value || r.claim,
          normalizedValue: r.normalizedValue,
          evidenceId: r.evidence_id
        }))
      });
    }
  }

  return conflicts;
}

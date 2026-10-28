import { NormalizedEvidence } from './types.js';

export interface ValidatorResult {
  eligibleRecords: NormalizedEvidence[];
  excludedRecords: { evidence: NormalizedEvidence; reason: string }[];
  exclusionBreakdown: Record<string, number>;
}

export function validateEvidenceEligibility(records: NormalizedEvidence[]): ValidatorResult {
  const eligibleRecords: NormalizedEvidence[] = [];
  const excludedRecords: { evidence: NormalizedEvidence; reason: string }[] = [];
  const exclusionBreakdown: Record<string, number> = {};
  const processedUniqueIds = new Set<string>();

  for (const item of records) {
    let exclusionReason: string | null = null;

    // Check 1: Duplicate check (first occurrence wins, duplicates excluded from scoring)
    if (processedUniqueIds.has(item.evidence_id)) {
      exclusionReason = `Duplicate evidence ID (${item.evidence_id}); excluded to prevent double-counting.`;
    } else {
      processedUniqueIds.add(item.evidence_id);
    }

    // Check 2: Validation acceptance
    if (!exclusionReason && (!item.validation || item.validation.accepted !== true)) {
      exclusionReason = `Rejected by validation pipeline (validation.accepted is false).`;
    }

    // Check 3: Final status check
    if (!exclusionReason) {
      const status = item.validation?.finalStatus;
      if (status === 'VALID') {
        // Fully valid
      } else if (status === 'VALID_WITH_NORMALIZATION') {
        // Valid with explicit normalization recorded
        // Permitted under PRD section 5 when required normalization is recorded
      } else if (status === 'INVALID' || status === 'REJECTED') {
        exclusionReason = `Final status marked as '${status}'.`;
      } else if (!status) {
        exclusionReason = `Missing final status in validation object.`;
      } else {
        exclusionReason = `Unsupported final status '${status}'.`;
      }
    }

    // Check 4: Must have verifiable claim
    if (!exclusionReason && (!item.claim || item.claim.trim().length === 0)) {
      exclusionReason = `Claim text is empty or missing.`;
    }

    // Check 5: Must have provenance source
    if (!exclusionReason && (!item.source || item.source === 'Unknown')) {
      exclusionReason = `Missing authentic review source provenance.`;
    }

    if (exclusionReason) {
      item.isEligibleForScoring = false;
      item.exclusionReason = exclusionReason;
      excludedRecords.push({ evidence: item, reason: exclusionReason });
      exclusionBreakdown[exclusionReason] = (exclusionBreakdown[exclusionReason] || 0) + 1;
    } else {
      item.isEligibleForScoring = true;
      eligibleRecords.push(item);
    }
  }

  return {
    eligibleRecords,
    excludedRecords,
    exclusionBreakdown
  };
}

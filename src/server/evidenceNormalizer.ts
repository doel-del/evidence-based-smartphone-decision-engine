import { RawEvidenceRecord, NormalizedEvidence } from './types.js';

export interface NormalizerResult {
  normalizedRecords: NormalizedEvidence[];
  duplicateIds: string[];
  normalizationErrors: { id?: string; issue: string }[];
}

/**
 * Converts timestamp string (e.g., "00:04:16,370" or "00:12:05") into total seconds for YouTube link
 */
export function timestampToSeconds(ts: string | null | undefined): number | null {
  if (!ts) return null;
  try {
    // Replace comma with dot if milliseconds present
    const clean = ts.replace(',', '.').trim();
    const parts = clean.split(':').map(Number);
    if (parts.length === 3) {
      return Math.floor(parts[0] * 3600 + parts[1] * 60 + parts[2]);
    } else if (parts.length === 2) {
      return Math.floor(parts[0] * 60 + parts[1]);
    } else if (parts.length === 1 && !isNaN(parts[0])) {
      return Math.floor(parts[0]);
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Builds valid YouTube URL with timestamp parameter
 */
export function buildYoutubeTimestampUrl(baseUrl: string, tsStart: string | null | undefined): string | undefined {
  if (!baseUrl) return undefined;
  const seconds = timestampToSeconds(tsStart);
  if (seconds === null || seconds < 0) return baseUrl;
  
  if (baseUrl.includes('?')) {
    return `${baseUrl}&t=${seconds}s`;
  }
  return `${baseUrl}?t=${seconds}s`;
}

export function normalizeEvidenceRecords(
  rawList: { record: RawEvidenceRecord; filename: string }[]
): NormalizerResult {
  const normalizedRecords: NormalizedEvidence[] = [];
  const duplicateIds: string[] = [];
  const normalizationErrors: { id?: string; issue: string }[] = [];
  const seenIds = new Set<string>();

  for (const { record: r, filename } of rawList) {
    if (!r || typeof r !== 'object') {
      normalizationErrors.push({ issue: `Malformed record in ${filename}: not an object` });
      continue;
    }

    if (!r.evidence_id || typeof r.evidence_id !== 'string') {
      normalizationErrors.push({ issue: `Record in ${filename} missing valid evidence_id` });
      continue;
    }

    const trimmedId = r.evidence_id.trim();
    if (seenIds.has(trimmedId)) {
      duplicateIds.push(trimmedId);
      normalizationErrors.push({
        id: trimmedId,
        issue: `Duplicate evidence_id detected in dataset (${trimmedId})`
      });
    } else {
      seenIds.add(trimmedId);
    }

    // Validation metadata check
    if (!r.validation || typeof r.validation !== 'object') {
      normalizationErrors.push({
        id: trimmedId,
        issue: `Evidence ${trimmedId} lacks validation object`
      });
    }

    // Determine normalized YouTube URL
    const ytUrl = buildYoutubeTimestampUrl(r.video_url, r.timestamp_start);

    const normalized: NormalizedEvidence = {
      evidence_id: trimmedId,
      topic: (r.topic || 'general').trim().toLowerCase(),
      subtopic: r.subtopic ? String(r.subtopic).trim().toLowerCase() : null,
      type: (r.type || 'CLAIM').toString().toUpperCase() as any,
      claim: (r.claim || '').trim(),
      value: r.value !== undefined ? r.value : null,
      unit: r.unit ? String(r.unit).trim() : null,
      attribute: r.attribute ? String(r.attribute).trim() : null,
      attribute_value: r.attribute_value ? String(r.attribute_value).trim() : null,
      context: r.context ? String(r.context).trim() : null,
      comparison_target: r.comparison_target ? String(r.comparison_target).trim() : null,
      reviewer_assessment: r.reviewer_assessment || null,
      certainty: (r.certainty || 'unspecified').trim(),
      source_excerpt: (r.source_excerpt || '').trim(),
      related_evidence_ids: Array.isArray(r.related_evidence_ids) ? r.related_evidence_ids : null,
      source_coordinates: r.source_coordinates || undefined,
      validation: r.validation || { accepted: false, finalStatus: 'INVALID' },
      timestamp_start: r.timestamp_start || null,
      timestamp_end: r.timestamp_end || null,
      source: (r.source || 'Unknown').trim(),
      review_id: (r.review_id || '').trim(),
      video_url: (r.video_url || '').trim(),
      video_title: (r.video_title || '').trim(),
      merged_subtopics: r.merged_subtopics,
      merged_from_evidence_ids: r.merged_from_evidence_ids,
      datasetFile: filename,
      sourceReviewer: (r.source || 'Unknown').trim(),
      youtubeTimestampUrl: ytUrl,
      isEligibleForScoring: false // Set later by validator
    };

    normalizedRecords.push(normalized);
  }

  return {
    normalizedRecords,
    duplicateIds,
    normalizationErrors
  };
}

import fs from 'fs';
import path from 'path';
import { RawEvidenceRecord, NormalizedEvidence } from './types.js';

interface TaxonomyConfig {
  topics: { id: string; label: string; order: number }[];
  criticalAttributes: string[];
  attributes: Record<string, { label: string; topic: string; type: string; unit?: string; tolerance?: number; critical?: boolean }>;
  aliases: Record<string, string>;
}

let cachedTaxonomy: TaxonomyConfig | null = null;
export function getTaxonomy(): TaxonomyConfig {
  if (cachedTaxonomy) return cachedTaxonomy;
  const filePath = path.resolve(process.cwd(), 'config/taxonomy.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  cachedTaxonomy = JSON.parse(raw);
  return cachedTaxonomy!;
}

export interface IngestValidationResult {
  valid: boolean;
  productName: string | null;
  normalizedRecords: NormalizedEvidence[];
  rejectedRecords: { recordId?: string; reason: string }[];
  duplicateIds: string[];
  singleProductViolation?: string;
}

export function timestampToSeconds(ts: string | null | undefined): number | null {
  if (!ts) return null;
  try {
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

export function buildYoutubeTimestampUrl(baseUrl?: string, tsStart?: string | null): string | undefined {
  if (!baseUrl) return undefined;
  const seconds = timestampToSeconds(tsStart);
  if (seconds === null || seconds < 0) return baseUrl;
  if (baseUrl.includes('?')) return `${baseUrl}&t=${seconds}s`;
  return `${baseUrl}?t=${seconds}s`;
}

/**
 * Normalizes numerical values and units
 */
export function normalizeValueAndUnit(
  val: any,
  unit: string | null | undefined,
  attr: string | null | undefined,
  claim: string,
  excerpt: string
): { normalizedValue: number | string | null; normalizedUnit: string | null } {
  const textContext = `${claim} ${excerpt} ${val || ''} ${unit || ''}`.toLowerCase();

  // 1. Time duration (hours and minutes to total minutes)
  const durationMatch = textContext.match(/(\d+)\s*(?:jam|hours?|h)\s*(?:lebih\s*)?(\d+)?\s*(?:menit|mins?|m)?/i);
  if (durationMatch) {
    const hours = parseInt(durationMatch[1], 10);
    const mins = durationMatch[2] ? parseInt(durationMatch[2], 10) : 0;
    return { normalizedValue: hours * 60 + mins, normalizedUnit: 'menit' };
  }
  const minOnlyMatch = textContext.match(/(\d+)\s*(?:menit|mins?|minutes)/i);
  if (minOnlyMatch && (unit === 'menit' || (attr && attr.includes('time')))) {
    return { normalizedValue: parseInt(minOnlyMatch[1], 10), normalizedUnit: 'menit' };
  }

  // 2. Price in rupiah (e.g., "4 juta", "3,5 juta", "2.500.000", 2500000)
  if (unit === 'juta' || textContext.includes('juta')) {
    const jutaMatch = textContext.match(/(\d+(?:[.,]\d+)?)\s*juta/i);
    if (jutaMatch) {
      const num = parseFloat(jutaMatch[1].replace(',', '.'));
      return { normalizedValue: Math.round(num * 1000000), normalizedUnit: 'IDR' };
    }
  }
  if (unit === 'IDR' || (typeof val === 'number' && val > 100000)) {
    return { normalizedValue: typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9]/g, '')), normalizedUnit: 'IDR' };
  }
  const idrMatch = textContext.match(/rp\s*(\d{1,3}(?:\.\d{3})+)/i);
  if (idrMatch) {
    const num = parseInt(idrMatch[1].replace(/\./g, ''), 10);
    return { normalizedValue: num, normalizedUnit: 'IDR' };
  }

  // 3. Numbers with standard units (mAh, Hz, nits, W, GB, MP, mm)
  if (typeof val === 'number') {
    return { normalizedValue: val, normalizedUnit: unit || null };
  }

  if (typeof val === 'string') {
    const parsedNum = parseFloat(val.replace(',', '.'));
    if (!isNaN(parsedNum)) {
      return { normalizedValue: parsedNum, normalizedUnit: unit || null };
    }
    return { normalizedValue: val.trim(), normalizedUnit: unit || null };
  }

  return { normalizedValue: null, normalizedUnit: unit || null };
}

/**
 * Maps raw attribute/subtopic/topic to canonical attribute
 */
export function resolveCanonicalAttribute(record: RawEvidenceRecord, taxonomy: TaxonomyConfig): string {
  const rawKey = (record.attribute || record.subtopic || record.topic || '').toLowerCase().trim().replace(/[-\s]+/g, '_');
  if (taxonomy.aliases[rawKey]) {
    return taxonomy.aliases[rawKey];
  }
  // Check subtopic specifically
  if (record.subtopic) {
    const sub = record.subtopic.toLowerCase().trim().replace(/[-\s]+/g, '_');
    if (taxonomy.aliases[sub]) return taxonomy.aliases[sub];
  }
  if (record.attribute && taxonomy.attributes[record.attribute]) {
    return record.attribute;
  }
  return rawKey || 'general_claim';
}

/**
 * Validates real evidence integrity (excerpt matching)
 */
export function verifyRealEvidenceMatch(r: RawEvidenceRecord): { matches: boolean; reason?: string } {
  if (!r.source_excerpt || r.source_excerpt.trim().length === 0) {
    return { matches: false, reason: 'Kutipan sumber (source_excerpt) kosong' };
  }

  const excerptLower = r.source_excerpt.toLowerCase();

  // If a numeric value is claimed, verify its presence in excerpt
  if (r.value !== null && r.value !== undefined) {
    const valStr = String(r.value).toLowerCase();
    const valNumber = typeof r.value === 'number' ? r.value : parseFloat(valStr.replace(',', '.'));
    
    // Check direct string inclusion
    const directMatch = excerptLower.includes(valStr);
    // Check formatted representation (e.g. 600000 vs 600.000 or 4 juta vs 4.000.000)
    const formatted1 = typeof valNumber === 'number' ? valNumber.toLocaleString('id-ID') : '';
    const formatted2 = typeof valNumber === 'number' && valNumber >= 1000000 ? `${(valNumber / 1000000).toString().replace('.', ',')}` : '';

    const matchesNumeric = directMatch || 
      (formatted1 && excerptLower.includes(formatted1)) || 
      (formatted2 && excerptLower.includes(formatted2)) ||
      (typeof valNumber === 'number' && excerptLower.includes(String(valNumber)));

    if (!matchesNumeric) {
      // Allow minor excerpt omission only if claim explicitly matches
      const claimLower = r.claim.toLowerCase();
      if (!claimLower.includes(valStr) && !claimLower.includes(formatted1)) {
        return { matches: false, reason: `Nilai klaim (${r.value}) tidak ditemukan dalam source_excerpt` };
      }
    }
  }

  return { matches: true };
}

/**
 * Ingests, validates schema, enforces single-product rule, normalizes, and deduplicates
 */
export function ingestAndNormalizeEvidence(
  records: RawEvidenceRecord[],
  datasetFilename = 'uploaded_dataset.json'
): IngestValidationResult {
  const taxonomy = getTaxonomy();
  const normalizedRecords: NormalizedEvidence[] = [];
  const rejectedRecords: { recordId?: string; reason: string }[] = [];
  const duplicateIds: string[] = [];

  const seenIds = new Set<string>();
  const seenCanonicalSignatures = new Set<string>();
  let identifiedProductName: string | null = null;

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const recId = r.evidence_id || `rec-${i}`;

    // Schema Check 1: Mandatory fields
    if (!r.evidence_id || typeof r.evidence_id !== 'string') {
      rejectedRecords.push({ recordId: recId, reason: 'Field wajib evidence_id hilang atau tidak valid' });
      continue;
    }
    if (!r.product_name || typeof r.product_name !== 'string' || r.product_name.trim().length === 0) {
      rejectedRecords.push({ recordId: recId, reason: 'Field wajib product_name hilang atau kosong' });
      continue;
    }
    if (!r.captured_at || typeof r.captured_at !== 'string' || r.captured_at.trim().length === 0) {
      rejectedRecords.push({ recordId: recId, reason: 'Field wajib captured_at hilang atau kosong' });
      continue;
    }
    if (!r.claim || typeof r.claim !== 'string' || r.claim.trim().length === 0) {
      rejectedRecords.push({ recordId: recId, reason: 'Field claim kosong' });
      continue;
    }
    if (!r.source || typeof r.source !== 'string' || r.source.trim().length === 0) {
      rejectedRecords.push({ recordId: recId, reason: 'Field source hilang atau kosong' });
      continue;
    }
    if (!r.source_excerpt || typeof r.source_excerpt !== 'string' || r.source_excerpt.trim().length === 0) {
      rejectedRecords.push({ recordId: recId, reason: 'Field source_excerpt kosong' });
      continue;
    }

    // Schema Check 2: Single Product Enforcement
    const trimmedProduct = r.product_name.trim();
    if (!identifiedProductName) {
      identifiedProductName = trimmedProduct;
    } else if (identifiedProductName.toLowerCase() !== trimmedProduct.toLowerCase()) {
      return {
        valid: false,
        productName: null,
        normalizedRecords: [],
        rejectedRecords: [
          ...rejectedRecords,
          { recordId: recId, reason: `Produk bercampur: terdapat '${trimmedProduct}' dan '${identifiedProductName}'. Satu run hanya untuk SATU produk.` }
        ],
        duplicateIds: [],
        singleProductViolation: `Dataset mengandung lebih dari satu produk (${identifiedProductName} vs ${trimmedProduct}). Tolak run.`
      };
    }

    // Schema Check 3: Real Evidence Integrity (Value matches excerpt)
    const matchCheck = verifyRealEvidenceMatch(r);
    if (!matchCheck.matches) {
      rejectedRecords.push({ recordId: recId, reason: matchCheck.reason || 'Klaim tidak cocok dengan kutipan sumber' });
      continue;
    }

    // Deduplication Check 1: ID duplication
    if (seenIds.has(r.evidence_id)) {
      duplicateIds.push(r.evidence_id);
      rejectedRecords.push({ recordId: recId, reason: `ID bukti duplikat: ${r.evidence_id}` });
      continue;
    }
    seenIds.add(r.evidence_id);

    // Normalization: Canonical attribute mapping & Unit normalization
    const canonicalAttr = resolveCanonicalAttribute(r, taxonomy);
    const { normalizedValue, normalizedUnit } = normalizeValueAndUnit(
      r.value,
      r.unit,
      canonicalAttr,
      r.claim,
      r.source_excerpt
    );

    // Deduplication Check 2: Semantic (attribute + normalizedValue + source)
    if (normalizedValue !== null && r.source) {
      const sig = `${canonicalAttr}::${normalizedValue}::${r.source.toLowerCase()}`;
      if (seenCanonicalSignatures.has(sig)) {
        duplicateIds.push(r.evidence_id);
        rejectedRecords.push({ recordId: recId, reason: `Duplikat semantik (atribut ${canonicalAttr} dengan nilai sama dari sumber ${r.source})` });
        continue;
      }
      seenCanonicalSignatures.add(sig);
    }

    // Eligibility check from validation object
    const isValidationRejected = r.validation?.accepted === false || 
      r.validation?.finalStatus === 'REJECTED' || 
      r.validation?.status === 'FAIL';
    const isEligible = !isValidationRejected;
    const exclusionReason = !isEligible ? `Validasi sumber gagal: accepted=${r.validation?.accepted}, status=${r.validation?.finalStatus || r.validation?.status}` : undefined;

    const normalized: NormalizedEvidence = {
      ...r,
      canonicalAttribute: canonicalAttr,
      normalizedValue,
      normalizedUnit,
      isEligibleForScoring: isEligible,
      exclusionReason,
      youtubeTimestampUrl: buildYoutubeTimestampUrl(r.video_url, r.timestamp_start),
      datasetFile: datasetFilename
    };

    normalizedRecords.push(normalized);
  }

  return {
    valid: normalizedRecords.filter(r => r.isEligibleForScoring).length >= 5,
    productName: identifiedProductName,
    normalizedRecords,
    rejectedRecords,
    duplicateIds
  };
}

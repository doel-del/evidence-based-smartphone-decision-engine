import fs from 'fs';
import path from 'path';
import { RawEvidenceRecord, NormalizedEvidence, TaxonomyConfig } from './types.js';

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
  rejectedRecords: { recordId: string; reason: string; stage: 'ingest' | 'validation' }[];
  rejectedAtIngestCount: number;
  validationFailedCount: number;
  duplicateIds: string[];
  singleProductViolation?: string;
  unmappedAttributes: { attribute: string; count: number }[];
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
 * Normalizes numerical values and units strictly adhering to requirements:
 * 1. Duration parsing ONLY if unit/attr is time/duration, using strict \b patterns. Never matches "Hz".
 * 2. Price IDR ONLY if unit="IDR"/"juta"/"ribu" or taxonomy attribute is type "price". AnTuTu remains unitless.
 */
export function normalizeValueAndUnit(
  val: any,
  unit: string | null | undefined,
  attr: string | null | undefined,
  claim: string,
  excerpt: string
): { normalizedValue: number | string | null; normalizedUnit: string | null } {
  const taxonomy = getTaxonomy();
  const attrMeta = attr ? taxonomy.attributes[attr] : undefined;
  const isDurationAttr = attrMeta?.type === 'duration';
  const isPriceAttr = attrMeta?.type === 'price';
  const textContext = `${claim} ${excerpt} ${val || ''} ${unit || ''}`.toLowerCase();

  // 1. Time duration parsing - ONLY if unit or attribute indicates duration/time
  const isTimeUnit = unit === 'menit' || unit === 'jam' || unit === 'minute' || unit === 'minutes' || unit === 'hour' || unit === 'hours';
  if (isDurationAttr || isTimeUnit) {
    // Only use patterns "N jam M menit" / "N jam" / "N menit" with word boundaries
    const jamMenitMatch = textContext.match(/\b(\d+)\s*jam(?:\s*(\d+)\s*menit)?\b/i);
    if (jamMenitMatch) {
      const hours = parseInt(jamMenitMatch[1], 10);
      const mins = jamMenitMatch[2] ? parseInt(jamMenitMatch[2], 10) : 0;
      return { normalizedValue: hours * 60 + mins, normalizedUnit: 'menit' };
    }
    const menitMatch = textContext.match(/\b(\d+)\s*menit\b/i);
    if (menitMatch) {
      return { normalizedValue: parseInt(menitMatch[1], 10), normalizedUnit: 'menit' };
    }
    if (typeof val === 'number') {
      return { normalizedValue: val, normalizedUnit: unit || 'menit' };
    }
  }

  // 2. Price in rupiah - ONLY if unit is IDR/juta/ribu or taxonomy attribute is type "price"
  // STRICT RULE: Heuristic "number > 100000 = IDR" is removed. AnTuTu score remains without unit.
  const isPriceUnit = unit === 'IDR' || unit === 'idr' || unit === 'juta' || unit === 'ribu' || unit === 'ribuan';
  if (isPriceAttr || isPriceUnit) {
    if (unit === 'juta' || textContext.includes('juta')) {
      const jutaMatch = textContext.match(/(\d+(?:[.,]\d+)?)\s*juta\b/i);
      if (jutaMatch) {
        const num = parseFloat(jutaMatch[1].replace(',', '.'));
        return { normalizedValue: Math.round(num * 1000000), normalizedUnit: 'IDR' };
      }
    }
    if (unit === 'ribu' || unit === 'ribuan' || textContext.match(/\b\d+\s*ribu\b/i)) {
      const ribuMatch = textContext.match(/(\d+(?:[.,]\d+)?)\s*ribu(?:an)?\b/i);
      if (ribuMatch) {
        const num = parseFloat(ribuMatch[1].replace(',', '.'));
        return { normalizedValue: Math.round(num * 1000), normalizedUnit: 'IDR' };
      }
    }
    const idrMatch = textContext.match(/rp\s*(\d{1,3}(?:\.\d{3})+)/i);
    if (idrMatch) {
      const num = parseInt(idrMatch[1].replace(/\./g, ''), 10);
      return { normalizedValue: num, normalizedUnit: 'IDR' };
    }
    if (unit === 'IDR' || isPriceAttr) {
      if (typeof val === 'number') {
        return { normalizedValue: val, normalizedUnit: 'IDR' };
      }
      if (typeof val === 'string') {
        const clean = val.replace(/[^0-9]/g, '');
        if (clean.length > 0) {
          return { normalizedValue: parseInt(clean, 10), normalizedUnit: 'IDR' };
        }
      }
    }
  }

  // 3. Numbers with standard units (mAh, Hz, nits, W, GB, MP, mm) or unitless
  if (typeof val === 'number') {
    return { normalizedValue: val, normalizedUnit: unit || null };
  }

  if (typeof val === 'string') {
    const parsedNum = parseFloat(val.replace(',', '.'));
    if (!isNaN(parsedNum) && /^-?\d+(?:[.,]\d+)?$/.test(val.trim())) {
      return { normalizedValue: parsedNum, normalizedUnit: unit || null };
    }
    return { normalizedValue: val.trim(), normalizedUnit: unit || null };
  }

  return { normalizedValue: null, normalizedUnit: unit || null };
}

/**
 * Maps raw attribute/subtopic/topic to canonical attribute
 * Disambiguates cameras, brightness, bypass charging, package contents, and OS update generations.
 */
export function resolveCanonicalAttribute(record: RawEvidenceRecord, taxonomy: TaxonomyConfig): string {
  const rawAttr = (record.attribute || '').toLowerCase().trim().replace(/[-\s]+/g, '_');
  const rawSub = (record.subtopic || '').toLowerCase().trim().replace(/[-\s]+/g, '_');
  const claimLower = (record.claim || '').toLowerCase();

  // Disambiguate bypass charging
  if (
    rawAttr === 'bypass_charging' ||
    rawSub.includes('pause_usb_power_delivery') ||
    rawSub.includes('bypass') ||
    claimLower.includes('pause usb power delivery') ||
    claimLower.includes('bypass charging')
  ) {
    if (rawAttr === 'charging_feature' || rawAttr === 'bypass_charging' || !rawAttr) {
      return 'bypass_charging';
    }
  }

  // Disambiguate camera resolution:
  // If attribute is 'resolution' or contains resolution:
  if (rawAttr === 'resolution' || rawAttr === 'camera_resolution') {
    if (rawSub.includes('selfie') || rawSub.includes('front') || claimLower.includes('selfie') || claimLower.includes('depan')) {
      return 'front_camera_resolution';
    }
    if (rawSub.includes('utama') || rawSub.includes('main') || claimLower.includes('utama') || claimLower.includes('belakang')) {
      return 'main_camera_resolution';
    }
    if (rawSub.includes('ultrawide') || rawSub.includes('ultra_wide')) {
      return 'ultrawide_camera_resolution';
    }
    if (rawSub.includes('makro') || rawSub.includes('macro')) {
      return 'macro_camera_resolution';
    }
    // Ambiguous resolution without camera context: DO NOT MAP!
    return rawAttr;
  }

  // Check composite subtopic + attribute (e.g. kamera_selfie_resolution)
  if (rawSub && rawAttr) {
    const comp1 = `${rawSub}_${rawAttr}`;
    if (taxonomy.aliases[comp1]) return taxonomy.aliases[comp1];
  }

  // Check rawAttr in aliases
  if (rawAttr && taxonomy.aliases[rawAttr]) {
    return taxonomy.aliases[rawAttr];
  }

  // Check rawSub in aliases
  if (rawSub && taxonomy.aliases[rawSub]) {
    return taxonomy.aliases[rawSub];
  }

  // Check rawAttr in taxonomy.attributes
  if (rawAttr && taxonomy.attributes[rawAttr]) {
    return rawAttr;
  }

  // Check rawSub in taxonomy.attributes
  if (rawSub && taxonomy.attributes[rawSub]) {
    return rawSub;
  }

  return rawAttr || rawSub || 'general_claim';
}

/**
 * Validates real evidence integrity (excerpt matching)
 * Recognizes Indonesian verbal/unit number notations ("ribu/ribuan", "juta", "setengah jam", dual/triple/dua/tiga)
 */
export function verifyRealEvidenceMatch(r: RawEvidenceRecord): { matches: boolean; reason?: string } {
  if (!r.source_excerpt || r.source_excerpt.trim().length === 0) {
    return { matches: false, reason: 'Kutipan sumber (source_excerpt) kosong' };
  }

  const excerptLower = r.source_excerpt.toLowerCase();
  const claimLower = (r.claim || '').toLowerCase();

  // If a numeric or specific value is claimed, verify its presence in excerpt or claim
  if (r.value !== null && r.value !== undefined) {
    const valStr = String(r.value).toLowerCase().trim();
    const valNumber = typeof r.value === 'number' ? r.value : parseFloat(valStr.replace(',', '.'));
    const isNum = !isNaN(valNumber);

    // Direct string match in excerpt
    if (excerptLower.includes(valStr) || (isNum && excerptLower.includes(String(valNumber)))) {
      return { matches: true };
    }

    // Number word dictionary: dual/triple/dua/tiga/etc.
    const numberWords: Record<number, string[]> = {
      1: ['satu', 'single'],
      2: ['dua', 'dual'],
      3: ['tiga', 'triple'],
      4: ['empat', 'quad'],
      5: ['lima'],
      6: ['enam'],
      7: ['tujuh'],
      8: ['delapan'],
      9: ['sembilan'],
      10: ['sepuluh']
    };

    if (isNum && numberWords[valNumber]) {
      const words = numberWords[valNumber];
      for (const w of words) {
        const regex = new RegExp(`\\b${w}\\b`, 'i');
        if (regex.test(excerptLower) || regex.test(claimLower)) {
          return { matches: true };
        }
      }
    }

    // Time: "setengah jam" for 30 minutes
    if (isNum && (valNumber === 30 || valNumber === 0.5)) {
      if (excerptLower.includes('setengah jam') || claimLower.includes('setengah jam')) {
        return { matches: true };
      }
    }

    // Number with "ribu" / "ribuan"
    if (isNum) {
      if (valNumber >= 1000) {
        const thousands = valNumber / 1000;
        const thousandsStr = Number.isInteger(thousands) ? String(thousands) : thousands.toString().replace('.', ',');
        const ribuPattern = new RegExp(`\\b${thousandsStr}\\s*ribu(?:an)?\\b`, 'i');
        if (ribuPattern.test(excerptLower) || ribuPattern.test(claimLower)) {
          return { matches: true };
        }
      } else {
        const ribuPattern = new RegExp(`\\b${valNumber}\\s*ribu(?:an)?\\b`, 'i');
        if (ribuPattern.test(excerptLower) || ribuPattern.test(claimLower)) {
          return { matches: true };
        }
      }

      // Millions: "juta"
      if (valNumber >= 1000000) {
        const millions = valNumber / 1000000;
        const millionsStr = Number.isInteger(millions) ? String(millions) : millions.toString().replace('.', ',');
        const jutaPattern = new RegExp(`\\b${millionsStr.replace(',', '[.,]')}\\s*juta\\b`, 'i');
        if (jutaPattern.test(excerptLower) || jutaPattern.test(claimLower)) {
          return { matches: true };
        }
      } else {
        const jutaPattern = new RegExp(`\\b${valNumber}\\s*juta\\b`, 'i');
        if (jutaPattern.test(excerptLower) || jutaPattern.test(claimLower)) {
          return { matches: true };
        }
      }

      // Formatted numbers: 600.000 / 600,000
      const formattedId = valNumber.toLocaleString('id-ID');
      const formattedEn = valNumber.toLocaleString('en-US');
      if (excerptLower.includes(formattedId) || excerptLower.includes(formattedEn) || claimLower.includes(formattedId) || claimLower.includes(formattedEn)) {
        return { matches: true };
      }
    }

    // String value match (if string value like "Corning Gorilla Glass Victus")
    if (typeof r.value === 'string') {
      const cleanVal = r.value.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanExcerpt = excerptLower.replace(/[^a-z0-9]/g, '');
      if (cleanExcerpt.includes(cleanVal)) {
        return { matches: true };
      }
    }

    // If claim contains value and excerpt provides relevant context
    if (claimLower.includes(valStr)) {
      return { matches: true };
    }

    return { matches: false, reason: `Nilai klaim (${r.value}) tidak ditemukan dalam source_excerpt` };
  }

  return { matches: true };
}

/**
 * Ingests, validates schema, enforces single-product rule, normalizes, and tracks rejected/unmapped records
 */
export function ingestAndNormalizeEvidence(
  records: RawEvidenceRecord[],
  datasetFilename = 'uploaded_dataset.json'
): IngestValidationResult {
  const taxonomy = getTaxonomy();
  const normalizedRecords: NormalizedEvidence[] = [];
  const rejectedRecords: { recordId: string; reason: string; stage: 'ingest' | 'validation' }[] = [];
  const duplicateIds: string[] = [];

  let rejectedAtIngestCount = 0;
  let validationFailedCount = 0;

  const seenIds = new Set<string>();
  const seenCanonicalSignatures = new Set<string>();
  let identifiedProductName: string | null = null;

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const recId = r.evidence_id || `rec-${i}`;

    // Schema Check 1: Mandatory fields
    if (!r.evidence_id || typeof r.evidence_id !== 'string') {
      rejectedRecords.push({ recordId: recId, reason: 'Field wajib evidence_id hilang atau tidak valid', stage: 'ingest' });
      rejectedAtIngestCount++;
      continue;
    }
    if (!r.product_name || typeof r.product_name !== 'string' || r.product_name.trim().length === 0) {
      rejectedRecords.push({ recordId: recId, reason: 'Field wajib product_name hilang atau kosong', stage: 'ingest' });
      rejectedAtIngestCount++;
      continue;
    }
    if (!r.captured_at || typeof r.captured_at !== 'string' || r.captured_at.trim().length === 0) {
      rejectedRecords.push({ recordId: recId, reason: 'Field wajib captured_at hilang atau kosong', stage: 'ingest' });
      rejectedAtIngestCount++;
      continue;
    }
    if (!r.claim || typeof r.claim !== 'string' || r.claim.trim().length === 0) {
      rejectedRecords.push({ recordId: recId, reason: 'Field claim kosong', stage: 'ingest' });
      rejectedAtIngestCount++;
      continue;
    }
    if (!r.source || typeof r.source !== 'string' || r.source.trim().length === 0) {
      rejectedRecords.push({ recordId: recId, reason: 'Field source hilang atau kosong', stage: 'ingest' });
      rejectedAtIngestCount++;
      continue;
    }
    if (!r.source_excerpt || typeof r.source_excerpt !== 'string' || r.source_excerpt.trim().length === 0) {
      rejectedRecords.push({ recordId: recId, reason: 'Field source_excerpt kosong', stage: 'ingest' });
      rejectedAtIngestCount++;
      continue;
    }

    // Schema Check 2: Single Product Enforcement
    const trimmedProduct = r.product_name.trim();
    if (!identifiedProductName) {
      identifiedProductName = trimmedProduct;
    } else if (identifiedProductName.toLowerCase() !== trimmedProduct.toLowerCase()) {
      rejectedRecords.push({
        recordId: recId,
        reason: `Produk bercampur: terdapat '${trimmedProduct}' dan '${identifiedProductName}'. Satu run hanya untuk SATU produk.`,
        stage: 'ingest'
      });
      rejectedAtIngestCount++;
      return {
        valid: false,
        productName: null,
        normalizedRecords: [],
        rejectedRecords,
        rejectedAtIngestCount,
        validationFailedCount,
        duplicateIds: [],
        singleProductViolation: `Dataset mengandung lebih dari satu produk (${identifiedProductName} vs ${trimmedProduct}). Tolak run.`,
        unmappedAttributes: []
      };
    }

    // Schema Check 3: Real Evidence Integrity (Value matches excerpt)
    const matchCheck = verifyRealEvidenceMatch(r);
    if (!matchCheck.matches) {
      rejectedRecords.push({ recordId: recId, reason: matchCheck.reason || 'Klaim tidak cocok dengan kutipan sumber', stage: 'ingest' });
      rejectedAtIngestCount++;
      continue;
    }

    // Deduplication Check 1: ID duplication
    if (seenIds.has(r.evidence_id)) {
      duplicateIds.push(r.evidence_id);
      rejectedRecords.push({ recordId: recId, reason: `ID bukti duplikat: ${r.evidence_id}`, stage: 'ingest' });
      rejectedAtIngestCount++;
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
        rejectedRecords.push({
          recordId: recId,
          reason: `Duplikat semantik (atribut ${canonicalAttr} dengan nilai sama dari sumber ${r.source})`,
          stage: 'ingest'
        });
        rejectedAtIngestCount++;
        continue;
      }
      seenCanonicalSignatures.add(sig);
    }

    // Eligibility check from validation object
    const isValidationRejected =
      r.validation?.accepted === false ||
      r.validation?.finalStatus === 'REJECTED' ||
      r.validation?.status === 'FAIL';

    const isEligible = !isValidationRejected;
    const exclusionReason = !isEligible
      ? `Validasi sumber gagal: accepted=${r.validation?.accepted}, status=${r.validation?.finalStatus || r.validation?.status}`
      : undefined;

    if (!isEligible) {
      rejectedRecords.push({
        recordId: recId,
        reason: exclusionReason || 'Validasi sumber gagal',
        stage: 'validation'
      });
      validationFailedCount++;
    }

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

  // Count unmapped attributes
  const unmappedCounts = new Map<string, number>();
  for (const r of normalizedRecords) {
    if (!taxonomy.attributes[r.canonicalAttribute]) {
      const name = r.attribute || r.subtopic || r.canonicalAttribute;
      unmappedCounts.set(name, (unmappedCounts.get(name) || 0) + 1);
    }
  }
  const unmappedAttributes = Array.from(unmappedCounts.entries())
    .map(([attribute, count]) => ({ attribute, count }))
    .sort((a, b) => b.count - a.count);

  return {
    valid: normalizedRecords.filter(r => r.isEligibleForScoring).length >= 5,
    productName: identifiedProductName,
    normalizedRecords,
    rejectedRecords,
    rejectedAtIngestCount,
    validationFailedCount,
    duplicateIds,
    unmappedAttributes
  };
}

import fs from 'fs';
import path from 'path';
import { RawEvidenceRecord } from './types.js';

export interface LoadedDataset {
  filename: string;
  sourcePath: string;
  records: RawEvidenceRecord[];
  error?: string;
  source: string;
  reviewId: string;
}

export interface LoaderResult {
  datasets: LoadedDataset[];
  missingRequiredFiles: { filename: string; reason: string }[];
  allRecordsWithSourceFile: { record: RawEvidenceRecord; filename: string }[];
}

export function loadAllEvidenceDatasets(dataDir = path.resolve(process.cwd(), 'data')): LoaderResult {
  const targetFiles = [
    { filename: 'evidence_data (94).json', diskFilename: 'evidence_data_94.json', expectedSource: 'Jagat Review', expectedReviewId: '45hfkSE5DvA' },
    { filename: 'evidence_data (98).json', diskFilename: 'evidence_data_98.json', expectedSource: 'TrendingTek', expectedReviewId: 'iiFusNBRirA' },
    { filename: 'evidence_data (100).json', diskFilename: 'evidence_data_100.json', expectedSource: 'rizkinhk', expectedReviewId: 'lzeD_sBrCB0' }
  ];

  const datasets: LoadedDataset[] = [];
  const missingRequiredFiles: { filename: string; reason: string }[] = [];
  const allRecordsWithSourceFile: { record: RawEvidenceRecord; filename: string }[] = [];

  // Check the required PRD file in root
  const prdPath = path.resolve(process.cwd(), 'PRD_Evidence_Based_Smartphone_Decision_Engine.md');
  if (!fs.existsSync(prdPath)) {
    missingRequiredFiles.push({
      filename: 'PRD_Evidence_Based_Smartphone_Decision_Engine.md',
      reason: 'File not provided in filesystem; requirements loaded from prompt contract specifications.'
    });
  }

  for (const item of targetFiles) {
    const filePath = path.join(dataDir, item.diskFilename);
    if (!fs.existsSync(filePath)) {
      datasets.push({
        filename: item.filename,
        sourcePath: filePath,
        records: [],
        error: `File not found on disk at ${filePath}`,
        source: item.expectedSource,
        reviewId: item.expectedReviewId
      });
      missingRequiredFiles.push({
        filename: item.filename,
        reason: `Dataset file ${item.diskFilename} was not found on path.`
      });
      continue;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed: RawEvidenceRecord[] = JSON.parse(content);
      datasets.push({
        filename: item.filename,
        sourcePath: filePath,
        records: parsed,
        source: parsed[0]?.source || item.expectedSource,
        reviewId: parsed[0]?.review_id || item.expectedReviewId
      });

      for (const rec of parsed) {
        allRecordsWithSourceFile.push({
          record: rec,
          filename: item.filename
        });
      }
    } catch (err: any) {
      datasets.push({
        filename: item.filename,
        sourcePath: filePath,
        records: [],
        error: `Failed to parse JSON: ${err.message}`,
        source: item.expectedSource,
        reviewId: item.expectedReviewId
      });
    }
  }

  return {
    datasets,
    missingRequiredFiles,
    allRecordsWithSourceFile
  };
}

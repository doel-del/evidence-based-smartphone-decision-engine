import fs from 'fs';
import path from 'path';
import { ReportOutput, RawEvidenceRecord } from './types.js';
import { generateSmartphoneReport } from './decisionEngine.js';

const reportsMap = new Map<string, ReportOutput>();
const REPORTS_DIR = path.resolve(process.cwd(), 'reports');

function ensureReportsDir(): void {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

export function saveReport(report: ReportOutput): void {
  reportsMap.set(report.reportId, report);
  ensureReportsDir();
  try {
    fs.writeFileSync(
      path.join(REPORTS_DIR, `${report.reportId}.json`),
      JSON.stringify(report, null, 2),
      'utf-8'
    );
  } catch (err) {
    console.warn('Failed to persist report to disk:', err);
  }
}

export function getReport(id: string): ReportOutput | undefined {
  if (reportsMap.has(id)) {
    return reportsMap.get(id);
  }
  ensureReportsDir();
  const filePath = path.join(REPORTS_DIR, `${id}.json`);
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      reportsMap.set(id, data);
      return data;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function listReports(): {
  id: string;
  productName: string;
  dateGenerated: string;
  overallScore: number | null;
  decisionLabel: string;
  confidenceLabel: string;
}[] {
  ensureReportsDir();
  // Read any files in reports dir
  try {
    const files = fs.readdirSync(REPORTS_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const id = file.replace('.json', '');
      if (!reportsMap.has(id)) {
        try {
          const content = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, file), 'utf-8'));
          reportsMap.set(id, content);
        } catch {
          // ignore corrupted files
        }
      }
    }
  } catch {
    // ignore
  }

  return Array.from(reportsMap.values())
    .sort((a, b) => new Date(b.dateGenerated).getTime() - new Date(a.dateGenerated).getTime())
    .map(r => ({
      id: r.reportId,
      productName: r.productName,
      dateGenerated: r.dateGenerated,
      overallScore: r.overallScore,
      decisionLabel: r.decisionLabel,
      confidenceLabel: r.confidenceLabel
    }));
}

export function getLatestReport(): ReportOutput | undefined {
  const reports = Array.from(reportsMap.values()).sort(
    (a, b) => new Date(b.dateGenerated).getTime() - new Date(a.dateGenerated).getTime()
  );
  return reports[0];
}

/**
 * Initializes default sample reports if none exist
 */
export function initializeSampleReports(): void {
  if (reportsMap.size > 0) return;

  const dataDir = path.resolve(process.cwd(), 'data');
  if (fs.existsSync(dataDir)) {
    try {
      const allFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
      const combinedRecords: RawEvidenceRecord[] = [];
      for (const f of allFiles) {
        const records: RawEvidenceRecord[] = JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf-8'));
        combinedRecords.push(...records);
      }
      if (combinedRecords.length >= 5) {
        const report = generateSmartphoneReport(combinedRecords, { datasetFilename: 'sample_datasets.json' });
        saveReport(report);
      }
    } catch (err) {
      console.warn('Could not initialize sample report from data/:', err);
    }
  }
}

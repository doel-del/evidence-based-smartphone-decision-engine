import express, { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { RawEvidenceRecord } from './types.js';
import { generateSmartphoneReport } from './decisionEngine.js';
import { getReport, listReports, saveReport, getLatestReport, initializeSampleReports } from './reportStorage.js';
import { generateStandaloneHtml } from './exportGenerator.js';

// Setup in-memory multipart upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

export function createApiRouter(): express.Router {
  const router = express.Router();

  // Initialize samples on start
  initializeSampleReports();

  // 1. GET /api/sample-datasets: List pre-loaded datasets for 1-click test
  router.get('/sample-datasets', (_req: Request, res: Response) => {
    try {
      const samples: {
        id: string;
        filename: string;
        productName: string;
        recordCount: number;
        sources: string[];
        description: string;
      }[] = [];

      const searchDirs = [
        path.resolve(process.cwd(), 'data'),
        path.resolve(process.cwd(), 'fixtures')
      ];

      for (const dir of searchDirs) {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
        for (const file of files) {
          try {
            const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
            const records: RawEvidenceRecord[] = JSON.parse(raw);
            if (Array.isArray(records) && records.length > 0) {
              const productName = records[0].product_name || 'Smartphone Tanpa Nama';
              const sources = Array.from(new Set(records.map(r => r.source || 'Sumber Anonim')));
              samples.push({
                id: file,
                filename: file,
                productName,
                recordCount: records.length,
                sources,
                description: `${productName} (${records.length} rekaman bukti dari ${sources.length} sumber)`
              });
            }
          } catch {
            // ignore non-json or unreadable
          }
        }
      }

      res.json(samples);
    } catch (err: any) {
      res.status(500).json({ error: 'FAILED_TO_LOAD_SAMPLES', message: err.message });
    }
  });

  // 2. POST /api/reports: Ingest evidence and generate deterministic report
  // Supports multipart files OR JSON body: { records: RawEvidenceRecord[] } OR { sampleId: string }
  router.post('/reports', upload.array('files'), async (req: Request, res: Response) => {
    try {
      let rawRecords: RawEvidenceRecord[] = [];
      let datasetFilename = 'uploaded_evidence.json';

      const files = req.files as Express.Multer.File[] | undefined;

      if (files && files.length > 0) {
        datasetFilename = files.map(f => f.originalname).join(', ');
        for (const file of files) {
          try {
            const parsed = JSON.parse(file.buffer.toString('utf-8'));
            if (Array.isArray(parsed)) {
              rawRecords.push(...parsed);
            } else if (parsed && typeof parsed === 'object') {
              rawRecords.push(parsed);
            }
          } catch {
            return res.status(400).json({
              error: 'INVALID_JSON_FILE',
              message: `File ${file.originalname} bukan format JSON yang valid.`
            });
          }
        }
      } else if (req.body && req.body.sampleId) {
        // Load from sample file
        const sampleId = req.body.sampleId;
        const searchPaths = [
          path.resolve(process.cwd(), 'data', sampleId),
          path.resolve(process.cwd(), 'fixtures', sampleId)
        ];
        let found = false;
        for (const p of searchPaths) {
          if (fs.existsSync(p)) {
            const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
            rawRecords = Array.isArray(data) ? data : [data];
            datasetFilename = sampleId;
            found = true;
            break;
          }
        }
        if (!found) {
          return res.status(404).json({ error: 'SAMPLE_NOT_FOUND', message: `Sample dataset ${sampleId} tidak ditemukan.` });
        }
      } else if (req.body && Array.isArray(req.body.records)) {
        rawRecords = req.body.records;
        datasetFilename = req.body.datasetFilename || 'api_payload.json';
      } else {
        return res.status(400).json({
          error: 'NO_EVIDENCE_PROVIDED',
          message: 'Harap unggah berkas JSON atau berikan array records di payload.'
        });
      }

      if (rawRecords.length === 0) {
        return res.status(400).json({
          error: 'EMPTY_EVIDENCE_PAYLOAD',
          message: 'Dataset bukti kosong. Minimal dibutuhkan 5 rekaman bukti valid.'
        });
      }

      // Execute deterministic decision engine
      const report = generateSmartphoneReport(rawRecords, { datasetFilename });
      saveReport(report);

      return res.status(201).json(report);
    } catch (err: any) {
      if (err.message && err.message.includes('SATU produk')) {
        return res.status(400).json({
          error: 'MIXED_PRODUCT_NAMES',
          message: err.message
        });
      }
      return res.status(400).json({
        error: 'DECISION_GENERATION_FAILED',
        message: err.message || 'Gagal memproses rekaman bukti.'
      });
    }
  });

  // 3. GET /api/reports: List all reports
  router.get('/reports', (_req: Request, res: Response) => {
    res.json(listReports());
  });

  // 4. GET /api/reports/latest: Get latest generated report
  router.get('/reports/latest', (_req: Request, res: Response) => {
    const report = getLatestReport();
    if (!report) {
      return res.status(404).json({ error: 'NO_REPORTS_AVAILABLE', message: 'Belum ada laporan yang digenerate.' });
    }
    res.json(report);
  });

  // 5. GET /api/reports/:id: Get specific report by ID
  router.get('/reports/:id', (req: Request, res: Response) => {
    const report = getReport(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'REPORT_NOT_FOUND', message: `Laporan ${req.params.id} tidak ditemukan.` });
    }
    res.json(report);
  });

  // 6. GET /api/reports/:id/diagnostics: Get diagnostic data
  router.get('/reports/:id/diagnostics', (req: Request, res: Response) => {
    const report = getReport(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'REPORT_NOT_FOUND', message: `Laporan ${req.params.id} tidak ditemukan.` });
    }
    res.json(report.diagnostics);
  });

  // 7. GET /api/reports/:id/export?format=json|html: Export standalone report
  router.get('/reports/:id/export', (req: Request, res: Response) => {
    const report = getReport(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'REPORT_NOT_FOUND', message: `Laporan ${req.params.id} tidak ditemukan.` });
    }

    const format = (req.query.format as string || 'html').toLowerCase();
    const safeName = report.productName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}-report.json"`);
      return res.send(JSON.stringify(report, null, 2));
    }

    // Default: Standalone HTML with embedded JSON & offline modal
    const html = generateStandaloneHtml(report);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}-report.html"`);
    return res.send(html);
  });

  return router;
}

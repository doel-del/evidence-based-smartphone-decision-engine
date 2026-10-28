import express, { Request, Response } from 'express';
import { loadAllEvidenceDatasets } from './evidenceLoader.js';
import { normalizeEvidenceRecords } from './evidenceNormalizer.js';
import { validateEvidenceEligibility } from './evidenceValidator.js';
import { EvidenceRepository } from './evidenceRepository.js';
import { runDecisionEngine } from './decisionEngine.js';
import { DatasetReport } from './types.js';
import { RULESET_VERSION, EVIDENCE_DATASET_VERSION } from './decisionRules.js';

export function createApiRouter(): express.Router {
  const router = express.Router();

  // Initialize pipeline
  const loaderResult = loadAllEvidenceDatasets();
  const normalizerResult = normalizeEvidenceRecords(loaderResult.allRecordsWithSourceFile);
  const validatorResult = validateEvidenceEligibility(normalizerResult.normalizedRecords);
  const repository = new EvidenceRepository(
    normalizerResult.normalizedRecords,
    validatorResult.eligibleRecords,
    validatorResult.excludedRecords
  );

  // 1. Decision endpoint: GET /api/products/samsung-galaxy-a26-5g/decision
  router.get('/products/samsung-galaxy-a26-5g/decision', (req: Request, res: Response) => {
    try {
      const decision = runDecisionEngine(repository);
      res.json(decision);
    } catch (err: any) {
      res.status(500).json({
        error: 'DECISION_ENGINE_ERROR',
        message: err.message || 'Internal decision engine failure'
      });
    }
  });

  // 2. Diagnostics endpoint: GET /api/diagnostics/evidence
  router.get('/diagnostics/evidence', (req: Request, res: Response) => {
    try {
      const filesProcessed = loaderResult.datasets.map(ds => {
        const fileNorm = normalizerResult.normalizedRecords.filter(r => r.datasetFile === ds.filename);
        const accepted = fileNorm.filter(r => r.isEligibleForScoring).length;
        const excluded = fileNorm.filter(r => !r.isEligibleForScoring).length;
        return {
          filename: ds.filename,
          source: ds.source,
          reviewId: ds.reviewId,
          totalRecords: ds.records.length,
          acceptedRecords: accepted,
          excludedRecords: excluded,
          status: (ds.error ? 'ERROR' : 'LOADED_SUCCESSFULLY') as 'LOADED_SUCCESSFULLY' | 'ERROR',
          error: ds.error
        };
      });

      const independentReviewSources = loaderResult.datasets.map(ds => {
        const first = ds.records[0];
        return {
          source: ds.source,
          reviewId: ds.reviewId,
          videoTitle: first?.video_title || '',
          videoUrl: first?.video_url || '',
          recordCount: ds.records.length
        };
      });

      const report: DatasetReport = {
        filesProcessed,
        missingRequiredFiles: loaderResult.missingRequiredFiles,
        totalRecordsLoaded: loaderResult.allRecordsWithSourceFile.length,
        totalNormalizedRecords: normalizerResult.normalizedRecords.length,
        totalAcceptedRecords: validatorResult.eligibleRecords.length,
        totalExcludedRecords: validatorResult.excludedRecords.length,
        duplicateIdsFound: normalizerResult.duplicateIds,
        normalizationErrors: normalizerResult.normalizationErrors,
        exclusionReasonsBreakdown: validatorResult.exclusionBreakdown,
        conflictsDetected: repository.detectConflicts(),
        rulesetVersion: RULESET_VERSION,
        evidenceDatasetVersion: EVIDENCE_DATASET_VERSION,
        independentReviewSources
      };

      res.json(report);
    } catch (err: any) {
      res.status(500).json({
        error: 'DIAGNOSTICS_ERROR',
        message: err.message || 'Internal diagnostics failure'
      });
    }
  });

  // 3. Evidence detail by ID: GET /api/evidence/:id
  router.get('/evidence/:id', (req: Request, res: Response) => {
    const id = req.params.id;
    const record = repository.getById(id);
    if (!record) {
      return res.status(404).json({ error: 'NOT_FOUND', message: `Evidence record ${id} not found` });
    }
    res.json(record);
  });

  // 4. Evidence list: GET /api/evidence
  router.get('/evidence', (req: Request, res: Response) => {
    const { topic, source, eligibleOnly, search } = req.query;
    let list = repository.getAllRecords();

    if (topic && typeof topic === 'string') {
      list = list.filter(r => r.topic.toLowerCase() === topic.toLowerCase());
    }
    if (source && typeof source === 'string') {
      list = list.filter(r => r.source.toLowerCase().includes(source.toLowerCase()));
    }
    if (eligibleOnly === 'true') {
      list = list.filter(r => r.isEligibleForScoring);
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.claim.toLowerCase().includes(q) ||
        r.evidence_id.toLowerCase().includes(q) ||
        r.source_excerpt.toLowerCase().includes(q) ||
        (r.subtopic && r.subtopic.toLowerCase().includes(q))
      );
    }

    res.json({
      total: list.length,
      records: list
    });
  });

  return router;
}

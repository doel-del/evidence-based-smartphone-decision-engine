import React, { useEffect, useState } from 'react';
import { ReportOutput, RawEvidenceRecord } from './server/types.js';
import { Navbar } from './components/Navbar.js';
import { HeroScore } from './components/HeroScore.js';
import { QuickDecision } from './components/QuickDecision.js';
import { SpecTable } from './components/SpecTable.js';
import { CriteriaBreakdown } from './components/CriteriaBreakdown.js';
import { StrengthsAndTradeoffs } from './components/StrengthsAndTradeoffs.js';
import { ClaimVsReality } from './components/ClaimVsReality.js';
import { ReviewerEvidence } from './components/ReviewerEvidence.js';
import { MarketCheckAndAlternatives } from './components/MarketCheckAndAlternatives.js';
import { FaqSection } from './components/FaqSection.js';
import { PricingAside } from './components/PricingAside.js';
import { EvidenceModal } from './components/EvidenceModal.js';
import { DiagnosticsView } from './components/DiagnosticsView.js';
import { 
  Upload, 
  FileCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  RefreshCw, 
  Smartphone, 
  Database,
  ArrowRight,
  ShieldCheck,
  Layers,
  FileText
} from 'lucide-react';

interface SampleDatasetItem {
  id: string;
  filename: string;
  productName: string;
  recordCount: number;
  sources: string[];
  description: string;
}

export default function App() {
  const [report, setReport] = useState<ReportOutput | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeEvidenceId, setActiveEvidenceId] = useState<string | null>(null);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(false);

  // Upload view state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileAnalysis, setFileAnalysis] = useState<{
    valid: boolean;
    productName: string | null;
    totalRecords: number;
    issues: string[];
    records: RawEvidenceRecord[];
  } | null>(null);
  const [sampleDatasets, setSampleDatasets] = useState<SampleDatasetItem[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [embedCopied, setEmbedCopied] = useState<boolean>(false);

  // Load sample datasets and latest report on mount
  useEffect(() => {
    fetch('/api/sample-datasets')
      .then(res => res.json())
      .then((data: SampleDatasetItem[]) => {
        setSampleDatasets(data);
      })
      .catch(() => {});

    fetch('/api/reports/latest')
      .then(res => {
        if (!res.ok) throw new Error('No reports yet');
        return res.json();
      })
      .then((data: ReportOutput) => {
        setReport(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  // Handle file selection and client-side pre-validation
  const handleFileChange = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    setSelectedFiles(fileArray);
    setError(null);

    const issues: string[] = [];
    let combinedRecords: RawEvidenceRecord[] = [];
    let identifiedProduct: string | null = null;

    for (const file of fileArray) {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const records: RawEvidenceRecord[] = Array.isArray(parsed) ? parsed : [parsed];
        combinedRecords.push(...records);

        for (const r of records) {
          if (!r.product_name) {
            issues.push(`Rekor '${r.evidence_id || 'tanpa-id'}' kehilangan field wajib 'product_name'.`);
          } else {
            if (!identifiedProduct) {
              identifiedProduct = r.product_name.trim();
            } else if (identifiedProduct.toLowerCase() !== r.product_name.trim().toLowerCase()) {
              issues.push(`Produk bercampur: terdeteksi '${identifiedProduct}' dan '${r.product_name}'. Seluruh rekor wajib untuk SATU produk.`);
              break;
            }
          }
          if (!r.captured_at) {
            issues.push(`Rekor '${r.evidence_id || 'tanpa-id'}' kehilangan field wajib 'captured_at'.`);
          }
        }
      } catch {
        issues.push(`Berkas '${file.name}' tidak dapat dibaca sebagai format JSON valid.`);
      }
    }

    if (combinedRecords.length < 5) {
      issues.push(`Jumlah rekor valid (${combinedRecords.length}) kurang dari batas minimum (5 rekor). Status akan menjadi INSUFFICIENT_EVIDENCE.`);
    }

    setFileAnalysis({
      valid: issues.length === 0 && combinedRecords.length >= 5,
      productName: identifiedProduct,
      totalRecords: combinedRecords.length,
      issues,
      records: combinedRecords
    });
  };

  // Submit upload to backend API
  const handleGenerateReport = async () => {
    if (!fileAnalysis || fileAnalysis.records.length === 0) return;
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: fileAnalysis.records,
          datasetFilename: selectedFiles.map(f => f.name).join(', ')
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal memproses dataset bukti');
      }

      setReport(data);
      setSelectedFiles([]);
      setFileAnalysis(null);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memproses laporan');
    } finally {
      setIsGenerating(false);
    }
  };

  // 1-Click Load Sample Dataset
  const handleLoadSample = async (sampleId: string) => {
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sampleId })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal memproses sample dataset');
      }

      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat dataset sampel');
    } finally {
      setIsGenerating(false);
    }
  };

  // Export handlers
  const handleExport = (format: 'html' | 'json') => {
    if (!report) return;
    window.location.href = `/api/reports/${report.reportId}/export?format=${format}`;
  };

  const handleCopyEmbed = () => {
    if (!report) return;
    const embedHtml = `<iframe src="${window.location.origin}/api/reports/${report.reportId}/export?format=html" width="100%" height="800" frameborder="0"></iframe>`;
    navigator.clipboard.writeText(embedHtml).then(() => {
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), 3000);
    });
  };

  return (
    <div className="bg-gray-50 text-gray-900 min-h-screen font-sans flex flex-col selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navbar */}
      <Navbar
        report={report}
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        onNewEvaluation={() => setReport(null)}
        onExport={handleExport}
        onCopyEmbed={handleCopyEmbed}
      />

      {/* Embed Copied Toast */}
      {embedCopied && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Kode iframe embed disalin ke clipboard!</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="grow">
        {/* Error Notification */}
        {error && (
          <div className="max-w-6xl mx-auto px-4 mt-6">
            <div className="bg-red-50 border border-red-200 text-red-900 p-5 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Kesalahan Evaluasi Bukti:</p>
                <p className="text-xs mt-0.5 text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* MODE 1: UPLOAD & INGEST STUDIO (Shown when no report is active) */}
        {!report ? (
          <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-extrabold rounded-full border border-blue-200">
                <ShieldCheck className="w-4 h-4" />
                <span>Mesin Keputusan Generik untuk Semua Smartphone</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
                Evaluasi Smartphone Berbasis Bukti Nyata
              </h1>
              <p className="text-sm text-gray-600 max-w-xl mx-auto leading-relaxed">
                Unggah berkas bukti review (JSON array minimal 5 rekor valid) untuk mengeksekusi rule engine deterministik dan menghasilkan laporan keputusan tanpa intervensi manual.
              </p>
            </div>

            {/* Upload Zone */}
            <div className="bg-white rounded-3xl border-2 border-dashed border-gray-300 hover:border-blue-500 p-8 text-center transition-colors">
              <input
                type="file"
                id="file-upload"
                multiple
                accept=".json,application/json"
                onChange={(e) => handleFileChange(e.target.files)}
                className="hidden"
              />
              <label 
                htmlFor="file-upload" 
                className="cursor-pointer flex flex-col items-center justify-center space-y-3"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-base font-bold text-gray-900 block">
                    Klik untuk memilih berkas JSON bukti
                  </span>
                  <span className="text-xs text-gray-500 block mt-1">
                    Mendukung banyak berkas JSON sekaligus (skema RawEvidenceRecord dengan <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">product_name</code> & <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">captured_at</code>)
                  </span>
                </div>
              </label>
            </div>

            {/* Selected Files & Pre-Validation Summary */}
            {fileAnalysis && (
              <div className="bg-white rounded-3xl border border-gray-200 p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-blue-600" />
                    <h3 className="font-extrabold text-sm text-gray-900">
                      Ringkasan Validasi Berkas Input
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-gray-500">
                    {fileAnalysis.totalRecords} Rekor Terbaca
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-gray-500 block mb-1">Perangkat Terdeteksi:</span>
                    <span className="font-extrabold text-gray-900 text-sm">
                      {fileAnalysis.productName || 'Belum Terdeteksi'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-gray-500 block mb-1">Status Kelayakan:</span>
                    <span className={`font-extrabold text-sm ${fileAnalysis.valid ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {fileAnalysis.valid ? 'Memenuhi Syarat (≥ 5 Rekor)' : 'Perlu Perhatian'}
                    </span>
                  </div>
                </div>

                {/* Issues if any */}
                {fileAnalysis.issues.length > 0 && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                    <span className="font-bold block">Catatan Validasi:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                      {fileAnalysis.issues.map((iss, i) => (
                        <li key={i}>{iss}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Generate Button */}
                <button
                  onClick={handleGenerateReport}
                  disabled={isGenerating}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-black py-3.5 px-6 rounded-2xl transition-colors flex items-center justify-center gap-2 text-sm shadow-md"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Mengeksekusi Decision Engine...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Laporan Keputusan Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* 1-Click Sample Datasets Selector */}
            {sampleDatasets.length > 0 && (
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-wider">
                  <Database className="w-4 h-4 text-blue-600" />
                  <span>Uji Coba Cepat dengan Dataset Sampel (1-Click Test)</span>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {sampleDatasets.map((sample) => (
                    <button
                      key={sample.id}
                      onClick={() => handleLoadSample(sample.id)}
                      disabled={isGenerating}
                      className="p-5 rounded-2xl bg-white border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all text-left flex flex-col justify-between group cursor-pointer"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
                            {sample.productName}
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                            {sample.recordCount} Bukti
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          {sample.sources.join(', ')}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-blue-600">
                        <span>Evaluasi Dataset Ini</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* MODE 2: INTERACTIVE DECISION REPORT VIEW */
          <div className="space-y-10 pb-16">
            {/* Hero Section */}
            <HeroScore report={report} onOpenEvidence={(id) => setActiveEvidenceId(id)} />

            {/* Report Content Grid */}
            <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Main Analysis Column (Left 8 cols) */}
              <div className="lg:col-span-8 space-y-10">
                {/* 1. Quick Decision */}
                <QuickDecision report={report} onOpenEvidence={(id) => setActiveEvidenceId(id)} />

                {/* 2. Criteria Breakdown */}
                <CriteriaBreakdown report={report} onOpenEvidence={(id) => setActiveEvidenceId(id)} />

                {/* 3. Strengths and Tradeoffs */}
                <StrengthsAndTradeoffs report={report} onOpenEvidence={(id) => setActiveEvidenceId(id)} />

                {/* 4. Claim vs Tested Reality (only if present) */}
                <ClaimVsReality report={report} onOpenEvidence={(id) => setActiveEvidenceId(id)} />

                {/* 5. Specification Table */}
                <SpecTable report={report} onOpenEvidence={(id) => setActiveEvidenceId(id)} />

                {/* 6. Reviewer Verbatim Quotes */}
                <ReviewerEvidence report={report} onOpenEvidence={(id) => setActiveEvidenceId(id)} />

                {/* 7. Competitor Alternatives (only if present) */}
                <MarketCheckAndAlternatives report={report} onOpenEvidence={(id) => setActiveEvidenceId(id)} />

                {/* 8. FAQ */}
                <FaqSection report={report} onOpenEvidence={(id) => setActiveEvidenceId(id)} />
              </div>

              {/* Sidebar Column (Right 4 cols) */}
              <div className="lg:col-span-4">
                <PricingAside report={report} onOpenEvidence={(id) => setActiveEvidenceId(id)} />
              </div>

            </div>
          </div>
        )}
      </main>

      {/* Evidence Detail Modal */}
      <EvidenceModal
        evidenceId={activeEvidenceId}
        evidencePool={report?.evidencePool}
        onClose={() => setActiveEvidenceId(null)}
      />

      {/* Diagnostics Audit Modal */}
      <DiagnosticsView
        isOpen={isDiagnosticsOpen}
        report={report}
        onClose={() => setIsDiagnosticsOpen(false)}
      />

      {/* Global Footer */}
      <footer className="border-t border-gray-200 bg-white py-8 text-xs text-gray-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Evidence-Based Smartphone Decision Engine · 100% Deterministik</p>
          <p className="text-[11px] text-gray-400">Seluruh klaim, kutipan, dan skor berakar langsung pada rekaman bukti terverifikasi.</p>
        </div>
      </footer>
    </div>
  );
}

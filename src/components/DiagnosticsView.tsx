import React from 'react';
import { ReportOutput } from '../server/types.js';
import { Activity, AlertTriangle, CheckCircle2, Database, ShieldCheck, X, FileQuestion, Ban } from 'lucide-react';

interface DiagnosticsViewProps {
  isOpen: boolean;
  report: ReportOutput | null;
  onClose: () => void;
}

export const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({ isOpen, report, onClose }) => {
  if (!isOpen || !report) return null;

  const diag = report.diagnostics;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Diagnostik Dataset & Audit Pipeline: {report.productName}
              </h2>
              <p className="text-xs text-slate-400">
                Audit integritas data mentah, normalisasi, aturan validasi, penolakan, dan konflik sumber.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-8 text-slate-800">
          {/* Summary Metrics with separated Ingest Rejects vs Validation Fails (Requirement 3) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Rekor Dimuat</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block tabular-nums">{diag.totalRecordsLoaded}</span>
              <span className="text-[11px] text-slate-500 font-medium">Rekaman input</span>
            </div>

            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">Memenuhi Syarat</span>
              <span className="text-2xl font-black text-emerald-800 mt-1 block tabular-nums">{diag.totalAcceptedRecords}</span>
              <span className="text-[11px] text-emerald-700 font-medium">Masuk scoring</span>
            </div>

            <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-200">
              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">Ditolak Saat Ingest</span>
              <span className="text-2xl font-black text-rose-800 mt-1 block tabular-nums">{diag.rejectedAtIngestCount}</span>
              <span className="text-[11px] text-rose-700 font-medium">Integritas / duplikat</span>
            </div>

            <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200">
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">Gagal Validasi</span>
              <span className="text-2xl font-black text-amber-800 mt-1 block tabular-nums">{diag.validationFailedCount}</span>
              <span className="text-[11px] text-amber-700 font-medium">Status validasi non-pass</span>
            </div>
          </div>

          {/* Rejected Records Details Table (Requirement 3) */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Ban className="w-4 h-4 text-rose-600" />
              Daftar Rekor Ditolak / Gagal ({diag.rejectedRecords?.length || 0})
            </h3>
            {(!diag.rejectedRecords || diag.rejectedRecords.length === 0) ? (
              <p className="text-xs text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-200">
                Tidak ada rekor yang ditolak pada dataset ini.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-60 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Tahap</th>
                      <th className="py-2.5 px-4 font-semibold">ID Rekor</th>
                      <th className="py-2.5 px-4 font-semibold">Alasan Penolakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {diag.rejectedRecords.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            r.stage === 'ingest' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {r.stage === 'ingest' ? 'Saat Ingest' : 'Gagal Validasi'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {r.recordId}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {r.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Unmapped Attributes Table (Requirement 6) */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileQuestion className="w-4 h-4 text-indigo-600" />
              Atribut Tak Terpetakan di Taxonomy ({diag.unmappedAttributes?.length || 0})
            </h3>
            <p className="text-xs text-slate-500">
              Atribut berikut tidak terdaftar di taxonomy.json sehingga tidak dimasukkan ke tabel spesifikasi dan tidak memicu konflik. Daftar ini disediakan agar user dapat memperbaikinya pada aplikasi ekstraksi.
            </p>
            {(!diag.unmappedAttributes || diag.unmappedAttributes.length === 0) ? (
              <p className="text-xs text-emerald-700 bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                Semua atribut dalam dataset berhasil dipetakan ke taxonomy.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-52 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Nama Atribut Tak Terpetakan</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Jumlah Rekor Bukti</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {diag.unmappedAttributes.map((u, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 font-mono font-bold text-indigo-900">{u.attribute}</td>
                        <td className="py-2.5 px-4 text-right tabular-nums text-slate-700 font-bold">{u.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Sources breakdown */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              Kanal Reviewer Independen ({diag.independentReviewSources.length})
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Kanal Reviewer</th>
                    <th className="py-3 px-4 font-semibold">Review ID</th>
                    <th className="py-3 px-4 font-semibold">Judul Video</th>
                    <th className="py-3 px-4 font-semibold text-right">Rekor Bukti</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {diag.independentReviewSources.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-900">{s.source}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{s.reviewId}</td>
                      <td className="py-3 px-4 text-slate-700 truncate max-w-xs">{s.videoTitle || '-'}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-blue-600 font-bold">{s.recordCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Conflicts Detected */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-blue-600" />
              Deteksi Perbedaan & Konflik Antar Sumber ({diag.conflictsDetected.length})
            </h3>
            {diag.conflictsDetected.length === 0 ? (
              <p className="text-xs text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-200">
                Tidak ada perbedaan atau konflik nilai antar sumber review pada dataset ini.
              </p>
            ) : (
              <div className="space-y-3">
                {diag.conflictsDetected.map((conf, idx) => (
                  <div 
                    key={idx} 
                    className={`p-4 rounded-2xl border text-xs space-y-2 ${
                      conf.isCritical && !conf.resolved ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-slate-900 uppercase">{conf.canonicalAttribute}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-400">({conf.topic})</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        conf.resolved ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {conf.resolved ? 'Terekonsiliasi (Dalam Toleransi)' : 'Konflik Terbuka'}
                      </span>
                    </div>
                    <p className="text-slate-600 font-medium leading-relaxed">
                      {conf.resolutionNote}
                    </p>
                    <div className="pt-1 flex flex-wrap gap-2 text-[11px]">
                      {conf.claims.map((c, ci) => (
                        <span key={ci} className="px-2 py-1 bg-white rounded-md border border-slate-200 text-slate-700">
                          <strong>{c.source}:</strong> {String(c.normalizedValue ?? c.rawValue ?? c.claim)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Version Info */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500 font-medium">
            <div>
              <span>Versi Ruleset: </span>
              <span className="font-mono font-bold text-slate-800">{diag.rulesetVersion}</span>
            </div>
            <div>
              <span>ID Laporan: </span>
              <span className="font-mono font-bold text-slate-800">{report.reportId}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
          >
            Tutup Diagnostik
          </button>
        </div>
      </div>
    </div>
  );
};

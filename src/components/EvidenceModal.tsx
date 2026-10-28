import React, { useEffect, useState } from 'react';
import { NormalizedEvidence } from '../server/types.js';
import { ExternalLink, X, ShieldCheck, Video, Clock, FileText, AlertCircle } from 'lucide-react';

interface EvidenceModalProps {
  evidenceId: string | null;
  evidencePool?: NormalizedEvidence[];
  onClose: () => void;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({ evidenceId, evidencePool, onClose }) => {
  const [evidence, setEvidence] = useState<NormalizedEvidence | null>(null);

  useEffect(() => {
    if (!evidenceId) {
      setEvidence(null);
      return;
    }

    if (evidencePool) {
      const found = evidencePool.find(e => e.evidence_id === evidenceId);
      if (found) {
        setEvidence(found);
        return;
      }
    }

    // Fallback search or clear
    setEvidence(null);
  }, [evidenceId, evidencePool]);

  if (!evidenceId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="evidence-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-1 bg-blue-100 text-blue-800 rounded">
              {evidenceId}
            </span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Detail Bukti Terverifikasi
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            aria-label="Tutup modal bukti"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!evidence ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Memuat data bukti [{evidenceId}]...
            </div>
          ) : (
            <>
              {/* Claim Card */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Klaim Pengujian
                </span>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                  <p className="text-sm font-bold text-slate-900 leading-snug">
                    "{evidence.claim}"
                  </p>
                </div>
              </div>

              {/* Verbatim Excerpt */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Kutipan Transkrip Verbatim (Transkrip Nyata)
                </span>
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200/70 text-slate-800">
                  <p className="text-xs italic leading-relaxed">
                    "{evidence.source_excerpt}"
                  </p>
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">Topik / Atribut</span>
                  <span className="font-bold text-slate-800">{evidence.topic}</span>
                  {evidence.canonicalAttribute && (
                    <span className="block text-[10px] font-mono text-slate-500">
                      canon: {evidence.canonicalAttribute}
                    </span>
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">Nilai Ternormalisasi</span>
                  <span className="font-bold text-slate-800">
                    {evidence.normalizedValue !== null ? String(evidence.normalizedValue) : '-'}
                    {evidence.normalizedUnit ? ` ${evidence.normalizedUnit}` : ''}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">Tipe & Kepastian</span>
                  <span className="font-bold text-slate-800">{evidence.type}</span>
                  <span className="block text-[10px] text-slate-500">{evidence.certainty}</span>
                </div>
              </div>

              {/* Provenance Video Info */}
              <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-blue-400">
                    <Video className="w-4 h-4" />
                    <span>Sumber Video Reviewer</span>
                  </div>
                  <span className="font-semibold text-slate-300">{evidence.source}</span>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-200 line-clamp-1">
                    {evidence.video_title || 'Video Pengujian'}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      Timestamp: {evidence.timestamp_start || '-'} s/d {evidence.timestamp_end || '-'}
                    </span>
                    {evidence.youtubeTimestampUrl && (
                      <a
                        href={evidence.youtubeTimestampUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-bold hover:underline"
                      >
                        <span>Putar di YouTube</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Validation Status */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Status Kelayakan: Memenuhi Syarat Skoring</span>
                </div>
                <span className="text-slate-400 text-[11px] font-mono">
                  Review ID: {evidence.review_id}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

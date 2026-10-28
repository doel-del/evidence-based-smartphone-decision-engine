import React from 'react';
import { DecisionResult } from '../server/types.js';
import { ShieldCheck, Star } from 'lucide-react';

interface HeroScoreProps {
  decision: DecisionResult | null;
  loading: boolean;
  onOpenEvidence: (id: string) => void;
}

export const HeroScore: React.FC<HeroScoreProps> = ({ decision, loading, onOpenEvidence }) => {
  const overallScoreDisplay = decision?.overallScore !== null && decision?.overallScore !== undefined 
    ? decision.overallScore.toFixed(1) 
    : '-';

  return (
    <section className="bg-white border-b border-gray-200 pt-10 pb-14 shadow-2xs">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        
        {/* Kolom Kiri: Judul & Headline Editorial */}
        <div className="lg:col-span-7">
          <div className="inline-flex items-center gap-2 text-xs font-black px-3 py-1 rounded-full mb-4 tracking-wider uppercase bg-blue-50 text-blue-800 border border-blue-200">
            <span>📱 Independent Tech Review</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-4 leading-tight text-gray-900 tracking-tight">
            Review Samsung Galaxy A26 5G: Siap Menguras THR Anda?
          </h1>

          <p className="text-lg text-gray-600 mb-6 leading-relaxed font-medium">
            Analisis lengkap dari pengujian lapangan mengenai performa gaming, kamera, One UI 7, hingga daya tahan IP67 dan jaminan update 6 tahun{' '}
            <button
              onClick={() => onOpenEvidence('45hfkSE5DvA-E006')}
              className="inline-flex items-center text-blue-600 hover:text-blue-800 text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer border border-blue-200"
              title="Lihat bukti bukti 6 tahun update"
            >
              [cite: E006]
            </button>.
          </p>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <span>✓ Tested (Pengujian Lapangan)</span>
              <button
                onClick={() => onOpenEvidence('45hfkSE5DvA-E118')}
                className="text-emerald-700 hover:underline font-mono text-[11px]"
                title="Buka bukti pengujian"
              >
                [cite: E118]
              </button>
            </span>

            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              🏆 Top Value Mid-Range
            </span>

            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
              🛡️ Hardware Knox Vault
            </span>
          </div>
        </div>

        {/* Kolom Kanan: Score Box Eksklusif */}
        <div className="lg:col-span-5 bg-slate-950 text-white p-7 md:p-8 rounded-3xl shadow-2xl border border-slate-800 relative overflow-hidden">
          {/* Subtle gradient glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="space-y-6 relative z-10">
            {/* Editor Score Header */}
            <div className="flex justify-between items-end border-b border-slate-800 pb-5">
              <div>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-1">
                  Editor Decision Score
                </p>
                <div className="flex items-center gap-1 text-yellow-400">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        decision && decision.overallScore && star <= Math.round(decision.overallScore)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="text-right">
                {loading ? (
                  <div className="w-16 h-10 bg-slate-800 animate-pulse rounded-lg"></div>
                ) : (
                  <div className="text-5xl font-black text-white tabular-nums tracking-tight">
                    {overallScoreDisplay}
                    <span className="text-lg text-slate-500 font-bold ml-1">/5</span>
                  </div>
                )}
              </div>
            </div>

            {/* Verdict Label */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <span className="text-slate-400 font-medium text-sm">Hasil Rekomendasi</span>
              <span className="text-sm font-bold text-emerald-400 text-right">
                {decision?.decisionLabel || 'Menghitung...'}
              </span>
            </div>

            {/* Confidence & Coverage */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <span className="text-slate-400 font-medium text-sm block">Confidence Level</span>
                <span className="text-[11px] text-slate-500">Cakupan Kriteria: {decision?.coveragePercent ?? 0}%</span>
              </div>
              <span className="text-xs font-black bg-blue-500/20 text-blue-300 border border-blue-400/30 px-3 py-1 rounded-md flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                {decision?.confidenceLabel || 'CALCULATING'}
              </span>
            </div>

            {/* Engine Notice */}
            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Ruleset: {decision?.rulesetVersion || 'v1.0.0'}</span>
              <span>100% Deterministic Engine</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

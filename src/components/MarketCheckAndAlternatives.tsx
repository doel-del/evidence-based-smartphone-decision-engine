import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { ReportOutput } from '../server/types.js';

interface MarketCheckAndAlternativesProps {
  report: ReportOutput;
  onOpenEvidence: (id: string) => void;
}

export const MarketCheckAndAlternatives: React.FC<MarketCheckAndAlternativesProps> = ({
  report,
  onOpenEvidence
}) => {
  if (!report.alternatives || report.alternatives.length === 0) return null;

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-xs">
        <header className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                Alternatif Pembanding di Pasar
              </h2>
            </div>
            <p className="text-xs font-semibold text-gray-500 mt-1">
              Pilihan perangkat pesaing yang disebutkan langsung oleh reviewer dalam data pengujian
            </p>
          </div>
        </header>

        <div className="grid md:grid-cols-2 gap-4">
          {report.alternatives.map((alt, idx) => (
            <div 
              key={idx}
              className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3 hover:border-blue-300 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-black text-gray-900 uppercase tracking-wide">
                    {alt.productName}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {alt.reasonCategory}
                  </span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  {alt.comparisonNote}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                <span className="text-[11px] text-gray-400 font-medium">Bukti terlampir:</span>
                <div className="flex items-center gap-1.5">
                  {alt.evidenceIds.map(eid => (
                    <button
                      key={eid}
                      onClick={() => onOpenEvidence(eid)}
                      className="font-mono text-[10px] font-bold text-blue-600 hover:underline bg-white px-1.5 py-0.5 rounded border border-blue-200"
                      title={`Buka bukti ${eid}`}
                    >
                      {eid}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

import React from 'react';
import { ReportOutput } from '../server/types.js';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StrengthsAndTradeoffsProps {
  report: ReportOutput | null;
  onOpenEvidence: (id: string) => void;
}

export const StrengthsAndTradeoffs: React.FC<StrengthsAndTradeoffsProps> = ({ report, onOpenEvidence }) => {
  if (!report) return null;

  return (
    <section id="transparansi" className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-xs space-y-8">
      <header className="border-b border-gray-100 pb-4">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">
          Pendorong Skor Naik vs Faktor Pemangkas Skor
        </h2>
        <p className="text-xs font-semibold text-gray-500 mt-1">
          Transparansi penuh: tanpa bobot tersembunyi, seluruh poin berdasar bukti pengujian nyata
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-8 md:gap-10">
        {/* Left Column: Strengths / Positive Drivers */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-emerald-100 pb-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-black text-emerald-800 uppercase tracking-wider">
              Kelebihan Utama (Pendorong Skor Naik)
            </h3>
          </div>

          <div className="space-y-3">
            {report.strengths.map((str, idx) => (
              <div key={idx} className="flex gap-3 items-start p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100/80">
                <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm leading-none">
                  +
                </span>
                <div className="w-full space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-gray-900 leading-snug">
                      {str.title}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 font-medium leading-relaxed">
                    {str.description}
                  </p>
                  <div className="pt-1 flex flex-wrap gap-1">
                    {str.evidenceIds.map(id => (
                      <button
                        key={id}
                        onClick={() => onOpenEvidence(id)}
                        className="text-[10px] font-mono font-bold text-emerald-700 hover:text-emerald-900 bg-white px-1.5 py-0.5 rounded border border-emerald-200 cursor-pointer"
                        title={`Buka bukti ${id}`}
                      >
                        [{id}]
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Tradeoffs / Negative Deductions */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-amber-100 pb-2">
            <TrendingDown className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-black text-amber-900 uppercase tracking-wider">
              Kelemahan & Catatan (Pemangkas Skor)
            </h3>
          </div>

          <div className="space-y-3">
            {report.tradeoffs.map((tro, idx) => (
              <div key={idx} className="flex gap-3 items-start p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100/80">
                <span className="shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-black text-sm leading-none">
                  -
                </span>
                <div className="w-full space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-gray-900 leading-snug">
                      {tro.title}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 font-medium leading-relaxed">
                    {tro.description}
                  </p>
                  <div className="pt-1 flex flex-wrap gap-1">
                    {tro.evidenceIds.map(id => (
                      <button
                        key={id}
                        onClick={() => onOpenEvidence(id)}
                        className="text-[10px] font-mono font-bold text-amber-800 hover:text-amber-950 bg-white px-1.5 py-0.5 rounded border border-amber-200 cursor-pointer"
                        title={`Buka bukti ${id}`}
                      >
                        [{id}]
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

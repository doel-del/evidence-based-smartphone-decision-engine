import React from 'react';
import { Scale, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { ReportOutput } from '../server/types.js';

interface ClaimVsRealityProps {
  report: ReportOutput;
  onOpenEvidence: (id: string) => void;
}

export const ClaimVsReality: React.FC<ClaimVsRealityProps> = ({ report, onOpenEvidence }) => {
  if (!report.claimVsReality || report.claimVsReality.length === 0) return null;

  const getVerdictStyle = (verdict: string) => {
    switch (verdict) {
      case 'EXCEEDS':
        return { badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2, iconColor: 'text-emerald-600' };
      case 'MATCHES':
        return { badge: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle2, iconColor: 'text-blue-600' };
      case 'CAVEAT':
        return { badge: 'bg-amber-100 text-amber-800 border-amber-200', icon: AlertTriangle, iconColor: 'text-amber-600' };
      default:
        return { badge: 'bg-rose-100 text-rose-800 border-rose-200', icon: AlertCircle, iconColor: 'text-rose-600' };
    }
  };

  return (
    <section id="klaim-vs-fakta" className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-xs space-y-6">
      <header className="border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-200 shadow-inner">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              Klaim vs Realita Pengujian
            </h2>
            <p className="text-xs font-semibold text-gray-500 mt-0.5">
              Perbandingan objektif antara janji spesifikasi dengan fakta hasil uji nyata para reviewer
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-4">
        {report.claimVsReality.map((item, idx) => {
          const style = getVerdictStyle(item.verdict);
          const Icon = style.icon;

          return (
            <div 
              key={idx}
              className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-300 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <span className="font-extrabold text-gray-900 text-sm">
                  {item.metric}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-md border ${style.badge} self-start sm:self-auto`}>
                  <Icon className={`w-3.5 h-3.5 ${style.iconColor}`} />
                  <span>{item.verdictLabel}</span>
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-white p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-extrabold uppercase text-gray-400 block mb-1">
                    Klaim / Ekspektasi Spesifikasi:
                  </span>
                  <p className="font-semibold text-gray-800">
                    {item.factoryClaim}
                  </p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-extrabold uppercase text-blue-500 block mb-1">
                    Fakta Pengujian Terverifikasi:
                  </span>
                  <p className="font-semibold text-gray-900">
                    {item.realTested}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                <span className="text-[11px] text-gray-400 font-medium">Bukti teruji:</span>
                <div className="flex items-center gap-1.5">
                  {item.evidenceIds.map(eid => (
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
          );
        })}
      </div>
    </section>
  );
};

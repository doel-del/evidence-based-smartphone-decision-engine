import React, { useState } from 'react';
import { ReportOutput, CriterionId } from '../server/types.js';
import { ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';

interface CriteriaBreakdownProps {
  report: ReportOutput | null;
  onOpenEvidence: (id: string) => void;
}

export const CriteriaBreakdown: React.FC<CriteriaBreakdownProps> = ({ report, onOpenEvidence }) => {
  const [expandedCriterion, setExpandedCriterion] = useState<string | null>(null);

  if (!report) return null;

  const toggleExpand = (id: string) => {
    setExpandedCriterion(prev => prev === id ? null : id);
  };

  return (
    <section id="kriteria" className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-xs space-y-6">
      <header className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            Breakdown 7 Kriteria Keputusan
          </h2>
          <p className="text-xs font-semibold text-gray-500 mt-1">
            Bobot tetap (Total 100%) dengan rubric berbasis bukti deterministik
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
            Cakupan: {report.coveragePercent}%
          </span>
        </div>
      </header>

      <div className="space-y-4">
        {Object.entries(report.criteriaScores).map(([cid, item]) => {
          const isExpanded = expandedCriterion === cid;
          const percentage = item.score !== null ? (item.score / 5) * 100 : 0;
          const weightPercent = Math.round(item.weight * 100);

          return (
            <div 
              key={cid}
              className="border border-gray-200 rounded-2xl overflow-hidden transition-all hover:border-gray-300"
            >
              <div 
                onClick={() => toggleExpand(cid)}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer bg-white hover:bg-slate-50/70 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-bold text-gray-900 text-base">
                      {item.criterionNameId}
                    </h3>
                    <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      Bobot: {weightPercent}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium">
                    {item.isRated ? `Basis Skor: ${item.baseScore.toFixed(1)} / 5.0` : (item.unratedReason || 'Belum dinilai')}
                  </p>
                </div>

                <div className="flex items-center gap-5">
                  <div className="text-right">
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="text-2xl font-black text-gray-900 tabular-nums">
                        {item.score !== null ? item.score.toFixed(1) : '-'}
                      </span>
                      <span className="text-xs text-gray-400 font-bold">/ 5.0</span>
                    </div>
                    {/* Score mini progress bar */}
                    <div className="w-28 h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                      <div 
                        className={`h-full rounded-full ${
                          (item.score || 0) >= 4.0 ? 'bg-emerald-500' :
                          (item.score || 0) >= 3.0 ? 'bg-blue-500' :
                          (item.score || 0) >= 2.0 ? 'bg-amber-500' : 'bg-gray-300'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>

                  <button className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-2 bg-slate-50/80 border-t border-gray-100 space-y-4 text-xs">
                  {/* Positive drivers */}
                  {item.positiveDrivers.length > 0 && (
                    <div className="space-y-2">
                      <span className="font-extrabold text-emerald-800 uppercase tracking-wider text-[11px]">
                        Faktor Penguat (+):
                      </span>
                      <ul className="space-y-1.5">
                        {item.positiveDrivers.map((d, i) => (
                          <li key={i} className="flex items-start justify-between gap-2 bg-white p-2.5 rounded-lg border border-emerald-100 text-gray-800">
                            <div>
                              <span>{d.text}</span>
                              {d.evidenceIds.map(eid => (
                                <button
                                  key={eid}
                                  onClick={(e) => { e.stopPropagation(); onOpenEvidence(eid); }}
                                  className="ml-1 text-[10px] font-mono font-bold text-blue-600 hover:underline"
                                >
                                  [{eid}]
                                </button>
                              ))}
                            </div>
                            <span className="font-mono font-bold text-emerald-600 shrink-0">
                              +{d.delta.toFixed(1)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Negative deductions */}
                  {item.negativeDeductions.length > 0 && (
                    <div className="space-y-2">
                      <span className="font-extrabold text-amber-800 uppercase tracking-wider text-[11px]">
                        Faktor Pemangkas (-):
                      </span>
                      <ul className="space-y-1.5">
                        {item.negativeDeductions.map((d, i) => (
                          <li key={i} className="flex items-start justify-between gap-2 bg-white p-2.5 rounded-lg border border-amber-100 text-gray-800">
                            <div>
                              <span>{d.text}</span>
                              {d.evidenceIds.map(eid => (
                                <button
                                  key={eid}
                                  onClick={(e) => { e.stopPropagation(); onOpenEvidence(eid); }}
                                  className="ml-1 text-[10px] font-mono font-bold text-blue-600 hover:underline"
                                >
                                  [{eid}]
                                </button>
                              ))}
                            </div>
                            <span className="font-mono font-bold text-amber-600 shrink-0">
                              {d.delta.toFixed(1)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Evidence count */}
                  <div className="flex items-center justify-between text-gray-500 pt-2 border-t border-gray-200/60 text-[11px]">
                    <span>Bukti Digunakan: {item.evidenceIdsUsed.length} item</span>
                    <span className="font-mono">Versi Rubric: {item.rubricVersion}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

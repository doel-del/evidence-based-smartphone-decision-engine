import React from 'react';
import { Award, Calendar, CheckCircle2, DollarSign, Layers, ShieldCheck, AlertTriangle } from 'lucide-react';
import { ReportOutput } from '../server/types.js';

interface HeroScoreProps {
  report: ReportOutput;
  onOpenEvidence: (id: string) => void;
}

export const HeroScore: React.FC<HeroScoreProps> = ({ report, onOpenEvidence }) => {
  const isPublished = report.decisionStatus === 'PUBLISHED' && report.overallScore !== null;

  // Format currency
  const formatPrice = (amount: number | null) => {
    if (amount === null) return '-';
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  const getConfidenceBadgeColor = (conf: string) => {
    const c = conf.toUpperCase();
    if (c === 'HIGH' || c === 'TINGGI') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (c === 'MEDIUM' || c === 'SEDANG') return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-rose-100 text-rose-800 border-rose-200';
  };

  const getDecisionBadgeColor = (status: string) => {
    if (status === 'PUBLISHED') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (status === 'UNRESOLVED_CRITICAL_CONFLICT') return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  };

  return (
    <section className="bg-white border-b border-gray-200 py-10 md:py-14">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Info (Left 7 cols) */}
          <div className="lg:col-span-7">
            {/* Meta badges */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Mesin Keputusan Deterministik</span>
              </span>

              {report.capturedAtRange && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                  <span>
                    Data rilis: {report.capturedAtRange.earliest}
                    {report.capturedAtRange.earliest !== report.capturedAtRange.latest ? ` s/d ${report.capturedAtRange.latest}` : ''}
                  </span>
                </span>
              )}
            </div>

            {/* Product Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 tracking-tight leading-tight mb-4">
              {report.productName}
            </h1>

            {/* Price Banner */}
            {report.priceSummary && (report.priceSummary.min !== null || report.priceSummary.max !== null) && (
              <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 mb-6">
                <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs text-gray-600 font-semibold">Rentang Harga Bukti:</span>
                <span className="text-sm font-extrabold text-gray-900">
                  {report.priceSummary.min === report.priceSummary.max
                    ? formatPrice(report.priceSummary.min)
                    : `${formatPrice(report.priceSummary.min)} - ${formatPrice(report.priceSummary.max)}`}
                </span>
                {report.priceSummary.evidenceIds.length > 0 && (
                  <button
                    onClick={() => onOpenEvidence(report.priceSummary.evidenceIds[0])}
                    className="text-[10px] font-mono font-bold text-blue-600 hover:underline ml-1"
                  >
                    [{report.priceSummary.evidenceIds[0]}]
                  </button>
                )}
              </div>
            )}

            {/* Key Decision Reasons */}
            <div className="space-y-3 mt-2">
              <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                Faktor Penentu Utama
              </h3>
              <div className="space-y-2">
                {report.decisionReasons.slice(0, 4).map((reason) => (
                  <div 
                    key={reason.id} 
                    className="flex items-start gap-2.5 text-sm text-gray-700 bg-gray-50/80 p-2.5 rounded-lg border border-gray-100"
                  >
                    {reason.impact === 'positive' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <span className="font-bold text-gray-900 mr-1.5">{reason.title}:</span>
                      <span>{reason.description}</span>
                      {reason.evidenceIds.map(eid => (
                        <button
                          key={eid}
                          onClick={() => onOpenEvidence(eid)}
                          className="inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                        >
                          {eid}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Decision Card (Right 5 cols) */}
          <div className="lg:col-span-5">
            <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-800">
              {/* Verdict Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-6">
                <span className="text-xs font-extrabold tracking-wider text-slate-400 uppercase">
                  Hasil Evaluasi Algoritmik
                </span>
                <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${getDecisionBadgeColor(report.decisionStatus)}`}>
                  {report.decisionStatus}
                </span>
              </div>

              {/* Score Display */}
              <div className="flex items-baseline justify-between mb-6">
                <div>
                  <span className="text-xs text-slate-400 block font-semibold mb-1">Skor Tertimbang</span>
                  <div className="flex items-baseline">
                    <span className="text-5xl md:text-6xl font-black tracking-tight text-white">
                      {isPublished ? report.overallScore?.toFixed(1) : '-'}
                    </span>
                    <span className="text-slate-500 text-lg font-bold ml-1.5">/ 5.0</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-semibold mb-1">Rekomendasi</span>
                  <div className="text-sm font-extrabold text-emerald-400 max-w-[170px] leading-snug">
                    {report.decisionLabel}
                  </div>
                </div>
              </div>

              {/* Trust & Coverage Metrics */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800/80 mb-6 text-xs">
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">Tingkat Kepercayaan</span>
                  <span className={`inline-block px-2 py-0.5 text-[11px] font-extrabold rounded-md border ${getConfidenceBadgeColor(report.confidenceLabel)}`}>
                    {report.confidenceLabel}
                  </span>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">Cakupan Data</span>
                  <div className="font-extrabold text-white flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    <span>{report.coveragePercent}%</span>
                  </div>
                </div>
              </div>

              {/* Source Provenance */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80">
                <span>Sumber Terverifikasi:</span>
                <span className="font-bold text-slate-200">
                  {report.independentSourceCount} Kanal Reviewer Independen
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

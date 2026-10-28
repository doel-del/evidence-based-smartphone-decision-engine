import React from 'react';
import { ExternalLink, Video, Quote } from 'lucide-react';
import { ReportOutput } from '../server/types.js';

interface ReviewerEvidenceProps {
  report: ReportOutput;
  onOpenEvidence: (id: string) => void;
}

export const ReviewerEvidence: React.FC<ReviewerEvidenceProps> = ({ report, onOpenEvidence }) => {
  if (!report.quotes || report.quotes.length === 0) return null;

  return (
    <section className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-xs space-y-6">
      <header className="border-b border-gray-100 pb-4">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">
          Testimoni & Suara Nyata Para Reviewer
        </h2>
        <p className="text-xs font-semibold text-gray-500 mt-1">
          Kutipan verbatim langsung dari transkrip video pengujian lapangan terverifikasi ({report.independentSourceCount} kanal independen)
        </p>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {report.quotes.map((rev, idx) => (
          <div 
            key={idx}
            className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4 hover:border-blue-300 transition-colors"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 truncate max-w-[150px]">
                  {rev.source}
                </span>
                {rev.timestamp && (
                  <span className="text-[11px] font-mono text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                    ⏱ {rev.timestamp}
                  </span>
                )}
              </div>

              <div className="relative pl-6">
                <Quote className="w-4 h-4 text-slate-300 absolute left-0 top-0.5" />
                <p className="text-xs font-medium text-slate-800 leading-relaxed italic">
                  "{rev.quote}"
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <span className="text-gray-500 font-semibold truncate max-w-[140px]" title={rev.videoTitle}>
                {rev.videoTitle}
              </span>
              <div className="flex items-center gap-2">
                {rev.evidenceIds.map(eid => (
                  <button
                    key={eid}
                    onClick={() => onOpenEvidence(eid)}
                    className="font-mono text-[10px] font-bold text-blue-600 hover:underline bg-white px-1.5 py-0.5 rounded border border-blue-200"
                    title={`Buka bukti ${eid}`}
                  >
                    {eid}
                  </button>
                ))}
                {rev.youtubeTimestampUrl && (
                  <a
                    href={rev.youtubeTimestampUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    title="Buka video pada timestamp kutipan"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

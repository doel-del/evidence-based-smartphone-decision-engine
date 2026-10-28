import React from 'react';
import { HelpCircle } from 'lucide-react';
import { ReportOutput } from '../server/types.js';

interface FaqSectionProps {
  report: ReportOutput;
  onOpenEvidence: (id: string) => void;
}

export const FaqSection: React.FC<FaqSectionProps> = ({ report, onOpenEvidence }) => {
  if (!report.faq || report.faq.length === 0) return null;

  return (
    <section className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-xs">
      <div className="flex items-center gap-2.5 mb-6">
        <HelpCircle className="w-6 h-6 text-blue-600 shrink-0" />
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            Frequently Asked Questions (FAQ)
          </h2>
          <p className="text-xs text-gray-500 font-semibold mt-0.5">
            Pertanyaan umum yang dijawab langsung berdasarkan rekaman bukti terverifikasi
          </p>
        </div>
      </div>

      <div className="space-y-3.5">
        {report.faq.map((item, idx) => (
          <details 
            key={idx} 
            className="group rounded-2xl border border-gray-200 p-4 open:border-blue-300 open:bg-slate-50/50 transition-colors"
          >
            <summary className="cursor-pointer font-bold text-sm text-gray-900 flex items-center justify-between outline-hidden">
              <span>{item.question}</span>
              <span className="text-blue-600 group-open:rotate-180 transition-transform font-bold text-base">
                ↓
              </span>
            </summary>
            <div className="mt-3 text-xs leading-relaxed text-gray-600 font-medium border-t border-gray-100 pt-3">
              <p>{item.answer}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-gray-400 font-semibold">Bukti:</span>
                {item.evidenceIds.map(eid => (
                  <button
                    key={eid}
                    onClick={() => onOpenEvidence(eid)}
                    className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded hover:bg-blue-100 transition-colors"
                  >
                    {eid}
                  </button>
                ))}
              </div>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
};

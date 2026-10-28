import React from 'react';
import { DecisionResult } from '../server/types.js';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface QuickDecisionProps {
  decision: DecisionResult | null;
  onOpenEvidence: (id: string) => void;
}

export const QuickDecision: React.FC<QuickDecisionProps> = ({ decision, onOpenEvidence }) => {
  if (!decision) return null;

  return (
    <div id="quick-decision" className="space-y-4">
      {/* Recommended For */}
      <div className="bg-emerald-50 border border-emerald-200 p-6 md:p-7 rounded-3xl shadow-2xs">
        <div className="flex items-center gap-2.5 text-emerald-800 font-black text-lg mb-4">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          <h3>Sangat Cocok Untuk:</h3>
        </div>

        <ul className="text-emerald-950 space-y-3.5 text-sm font-semibold leading-relaxed">
          {decision.quickDecision.recommendedFor.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5">
              <span className="text-emerald-600 mt-1 text-base leading-none">•</span>
              <div className="w-full">
                <span>{item.text}</span>
                <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
                  {item.evidenceIds.map((id) => (
                    <button
                      key={id}
                      onClick={() => onOpenEvidence(id)}
                      className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-100/80 hover:bg-emerald-200 px-1.5 py-0.5 rounded border border-emerald-300 transition-colors cursor-pointer"
                      title={`Buka bukti ${id}`}
                    >
                      [{id.split('-').pop()}]
                    </button>
                  ))}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Tradeoffs / Needs Consideration */}
      <div className="bg-amber-50/80 border border-amber-200 p-6 md:p-7 rounded-3xl shadow-2xs">
        <div className="flex items-center gap-2.5 text-amber-900 font-black text-lg mb-4">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
          <h3>Kurang Cocok / Perlu Dipertimbangkan Jika:</h3>
        </div>

        <ul className="text-amber-950 space-y-3 text-sm font-semibold leading-relaxed">
          {decision.quickDecision.notRecommendedFor.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5">
              <span className="text-amber-600 mt-1 text-base leading-none">•</span>
              <div className="w-full">
                <span>{item.text}</span>
                <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
                  {item.evidenceIds.map((id) => (
                    <button
                      key={id}
                      onClick={() => onOpenEvidence(id)}
                      className="text-[11px] font-mono font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-1.5 py-0.5 rounded border border-amber-300 transition-colors cursor-pointer"
                      title={`Buka bukti ${id}`}
                    >
                      [{id.split('-').pop()}]
                    </button>
                  ))}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

import React from 'react';
import { AlertCircle, Smartphone } from 'lucide-react';
import { ReportOutput } from '../server/types.js';

interface SpecTableProps {
  report: ReportOutput;
  onOpenEvidence: (id: string) => void;
}

export const SpecTable: React.FC<SpecTableProps> = ({ report, onOpenEvidence }) => {
  if (!report.specTable || report.specTable.length === 0) return null;

  return (
    <section id="spesifikasi" className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-xs">
      <header className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl shadow-inner border border-blue-200">
            <Smartphone className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              Spesifikasi Teknis
            </h2>
            <p className="text-xs font-semibold text-gray-500 mt-0.5">
              Data spesifikasi tervalidasi dari {report.independentSourceCount} kanal sumber independen
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-6">
        {report.specTable.map((group) => (
          <div key={group.topicId} className="border border-gray-100 rounded-2xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-gray-100 text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              {group.topicLabel}
            </div>
            <table className="w-full text-sm text-left border-collapse">
              <tbody className="divide-y divide-gray-100">
                {group.rows.map((row) => (
                  <tr key={row.attribute} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-gray-600 w-2/5 md:w-1/3 align-top">
                      {row.label}
                    </td>
                    <td className="py-3 px-4 text-gray-900 align-top">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold">{row.value}</span>
                        {row.evidenceIds.map((eid) => (
                          <button
                            key={eid}
                            onClick={() => onOpenEvidence(eid)}
                            className="inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                            title={`Buka rincian bukti ${eid}`}
                          >
                            {eid}
                          </button>
                        ))}
                      </div>

                      {/* Conflict alert if present on this attribute */}
                      {row.conflict && (
                        <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                          <div className="flex items-center gap-1.5 font-bold mb-1">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Perbedaan Klaim Antar Sumber:</span>
                          </div>
                          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                            {row.conflict.claims.map((c, i) => (
                              <li key={i}>
                                <strong>{c.source}:</strong> {String(c.normalizedValue ?? c.rawValue ?? c.claim)}
                              </li>
                            ))}
                          </ul>
                          <p className="mt-1 text-[11px] text-amber-700 italic">
                            Catatan: {row.conflict.resolutionNote}
                          </p>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </section>
  );
};

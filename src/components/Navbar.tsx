import React from 'react';
import { Activity, Download, PlusCircle, Smartphone, Code, FileText } from 'lucide-react';
import { ReportOutput } from '../server/types.js';

interface NavbarProps {
  report: ReportOutput | null;
  onOpenDiagnostics: () => void;
  onNewEvaluation: () => void;
  onExport: (format: 'html' | 'json') => void;
  onCopyEmbed: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  report,
  onOpenDiagnostics,
  onNewEvaluation,
  onExport,
  onCopyEmbed
}) => {
  const [showExportMenu, setShowExportMenu] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button 
            onClick={onNewEvaluation}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs group-hover:bg-blue-700 transition-colors">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-gray-900 text-sm sm:text-base leading-tight block">
                DecisionEngine
              </span>
              <span className="text-[10px] text-gray-500 font-medium block">
                Evidence-Based Smartphone
              </span>
            </div>
          </button>

          {report && (
            <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-gray-200">
              <span className="text-xs font-semibold text-gray-500">Evaluasi:</span>
              <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md truncate max-w-[200px]">
                {report.productName}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {report && (
            <>
              {/* Export Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-200"
                  aria-expanded={showExportMenu}
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>Ekspor</span>
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 text-xs font-semibold">
                    <button
                      onClick={() => { setShowExportMenu(false); onExport('html'); }}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 text-gray-700 hover:text-blue-600 flex items-center gap-2"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-500" />
                      <span>Standalone HTML (Offline)</span>
                    </button>
                    <button
                      onClick={() => { setShowExportMenu(false); onExport('json'); }}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 text-gray-700 hover:text-blue-600 flex items-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Data JSON Terstruktur</span>
                    </button>
                    <button
                      onClick={() => { setShowExportMenu(false); onCopyEmbed(); }}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 text-gray-700 hover:text-blue-600 flex items-center gap-2"
                    >
                      <Code className="w-3.5 h-3.5 text-purple-500" />
                      <span>Salin Kode Embed iFrame</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Diagnostics Button */}
              <button
                onClick={onOpenDiagnostics}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-200"
                title="Lihat Diagnostik Bukti"
              >
                <Activity className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Diagnostik</span>
              </button>
            </>
          )}

          {/* New Evaluation button */}
          <button
            onClick={onNewEvaluation}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Upload Bukti Baru</span>
          </button>
        </div>
      </div>
    </header>
  );
};

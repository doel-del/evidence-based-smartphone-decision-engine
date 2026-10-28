import React from 'react';
import { ExternalLink, ShoppingCart, AlertTriangle, ShieldCheck, Video } from 'lucide-react';
import { ReportOutput } from '../server/types.js';

interface PricingAsideProps {
  report: ReportOutput;
  onOpenEvidence: (id: string) => void;
}

export const PricingAside: React.FC<PricingAsideProps> = ({ report, onOpenEvidence }) => {
  const priceMin = report.priceSummary?.min;
  const priceMax = report.priceSummary?.max;

  // Check if capturedAt is > 90 days old
  const isOutdated = report.capturedAtRange?.isOlderThan90Days || false;

  const formatPrice = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '-';
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

  const encodedProduct = encodeURIComponent(report.productName);

  return (
    <aside className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white shadow-xs sticky top-20 overflow-hidden">
        
        {/* 1. Pricing Card */}
        <div className="p-6 border-b border-gray-100">
          <span className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full inline-block mb-4">
            Ringkasan Harga
          </span>
          <h3 className="text-base font-bold text-gray-900 mb-1">
            Rentang Harga Bukti
          </h3>
          <p className="text-xs text-gray-500 mb-3 font-medium">
            Terekam dari data review terverifikasi
            {report.priceSummary?.evidenceIds[0] && (
              <button
                onClick={() => onOpenEvidence(report.priceSummary.evidenceIds[0])}
                className="text-blue-600 hover:underline font-mono text-[10px] ml-1.5"
              >
                [{report.priceSummary.evidenceIds[0]}]
              </button>
            )}
          </p>

          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-2xl font-black text-gray-900 tracking-tight tabular-nums">
              {priceMin !== null && priceMax !== null && priceMin !== priceMax
                ? `${formatPrice(priceMin)} - ${formatPrice(priceMax)}`
                : formatPrice(priceMin || priceMax)}
            </span>
          </div>

          {/* Outdated warning if > 90 days */}
          {isOutdated && (
            <div className="p-3 mb-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Perhatian:</strong> Data harga terekam lebih dari 90 hari yang lalu ({report.capturedAtRange?.latest}). Harga pasar saat ini mungkin telah mengalami penurunan atau penyesuaian promo.
              </span>
            </div>
          )}

          {/* Live Marketplace Links */}
          <div className="space-y-2.5">
            <a
              href={`https://www.tokopedia.com/search?st=product&q=${encodedProduct}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-xs shadow-2xs"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Cek Harga di Tokopedia</span>
              <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
            </a>
            <a
              href={`https://shopee.co.id/search?keyword=${encodedProduct}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-xs shadow-2xs"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Cek Harga di Shopee</span>
              <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
            </a>
          </div>
        </div>

        {/* 2. Review Provenance Channels */}
        <div className="p-6 bg-slate-50/70 border-b border-gray-100 space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
            <Video className="w-3.5 h-3.5 text-blue-600" />
            <span>Kanal Sumber ({report.independentSourceCount})</span>
          </div>
          <ul className="space-y-2 text-xs">
            {report.diagnostics?.independentReviewSources?.map((src, i) => (
              <li key={i} className="flex items-center justify-between text-gray-700 bg-white p-2 rounded-lg border border-gray-100">
                <span className="font-semibold truncate max-w-[150px]">{src.source}</span>
                <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                  {src.recordCount} bukti
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* 3. Methodology Tag */}
        <div className="p-5 text-[11px] text-gray-500 space-y-2">
          <div className="flex items-center gap-1.5 text-gray-700 font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Tanpa Afiliasi Terselubung</span>
          </div>
          <p className="leading-relaxed">
            Skor dihitung 100% secara deterministik melalui eksekusi rule engine berbasis bukti video reviewer independen.
          </p>
        </div>

      </div>
    </aside>
  );
};

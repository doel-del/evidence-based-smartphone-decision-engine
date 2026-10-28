import React from 'react';
import { ChevronRight } from 'lucide-react';

interface MarketCheckAndAlternativesProps {
  onOpenEvidence: (id: string) => void;
}

export const MarketCheckAndAlternatives: React.FC<MarketCheckAndAlternativesProps> = ({ onOpenEvidence }) => {
  return (
    <div className="space-y-8">
      {/* Market Reality Check */}
      <section className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-xs">
        <header className="mb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                Market Reality Check
              </h2>
            </div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              Dianalisis dari data pasar dan ketersediaan stok
            </p>
          </div>
          <span className="px-3 py-1 text-[11px] font-black rounded-full border uppercase tracking-wider bg-blue-100 text-blue-700 border-blue-200 shrink-0">
            Best THR Deal (Rp 3,3M - 3,8M)
          </span>
        </header>

        <p className="text-sm font-medium text-gray-700 mb-6 leading-relaxed">
          Di harga ritel normal Rp 3.999.000 mungkin bersaing ketat, tetapi promo marketplace (di rentang Rp 3,3 - 3,8 jutaan) membuat Samsung Galaxy A26 5G menjadi deal yang sangat menguras THR berkat kombinasi langka IP67 + update 6 tahun{' '}
          <button
            onClick={() => onOpenEvidence('45hfkSE5DvA-E178')}
            className="text-xs font-mono font-bold text-blue-600 hover:underline"
          >
            [cite: E178]
          </button>.
        </p>

        {/* Signals Bar */}
        <div className="grid grid-cols-2 gap-6 p-5 bg-gray-50 rounded-2xl border border-gray-100 text-xs">
          <div>
            <div className="flex justify-between items-end mb-2">
              <span className="font-bold text-gray-500 uppercase tracking-wider text-[11px]">Popularitas & Minat</span>
              <span className="font-black text-gray-900 text-sm tabular-nums">92%</span>
            </div>
            <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-slate-400" style={{ width: '92%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-2">
              <span className="font-bold text-gray-500 uppercase tracking-wider text-[11px]">Real Performance Score</span>
              <span className="font-black text-gray-900 text-sm tabular-nums">89%</span>
            </div>
            <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-blue-600" style={{ width: '89%' }}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Alternatives */}
      <section className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-xs">
        <header className="mb-5">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            Beli atau Cari HP Lain? (Alternatif Pesaing)
          </h2>
          <p className="text-xs font-medium text-gray-500 mt-1">
            Rekomendasi objektif jika beberapa kelemahan A26 5G menjadi deal-breaker bagi Anda
          </p>
        </header>

        <div className="space-y-3.5">
          <div className="rounded-2xl border border-gray-200 p-5 hover:border-blue-400 hover:shadow-xs transition-all bg-white group">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-gray-900 group-hover:text-blue-600 transition-colors">
                Samsung Galaxy A35 5G
              </h3>
              <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                Pilihan Alternatif Layar Punch-hole
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-2 leading-relaxed">
              Opsi terbaik (kakak seri tahun lalu) jika Anda keberatan dengan poni Infinity-U waterdrop pada A26, dan menginginkan speaker stereo ganda serta desain layar Infinity-O modern dengan harga yang kini sudah turun setara.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 p-5 hover:border-blue-400 hover:shadow-xs transition-all bg-white group">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-gray-900 group-hover:text-blue-600 transition-colors">
                POCO X6 Pro 5G
              </h3>
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                Alternatif Gaming Murni
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-2 leading-relaxed">
              Alternatif jika prioritas utama Anda adalah 100% performa gaming kelas atas (Dimensity 8300-Ultra) dan pengisian daya 67W kilat, meski harus mengorbankan durabilitas software 6 tahun, kamera OIS Samsung, dan rating IP67.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

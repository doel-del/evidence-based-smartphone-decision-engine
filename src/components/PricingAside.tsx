import React from 'react';
import { ExternalLink, ShoppingCart } from 'lucide-react';

interface PricingAsideProps {
  onOpenEvidence: (id: string) => void;
}

export const PricingAside: React.FC<PricingAsideProps> = ({ onOpenEvidence }) => {
  return (
    <aside className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white shadow-xs sticky top-20 overflow-hidden">
        
        {/* 1. Pricing Card */}
        <div className="p-6 border-b border-gray-100">
          <span className="bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full inline-block mb-4">
            Best Value Deal
          </span>
          <h3 className="text-base font-bold text-gray-900 mb-1">
            Cek Harga Pasaran
          </h3>
          <p className="text-xs text-gray-500 mb-3 font-medium">
            Estimasi harga promo marketplace{' '}
            <button
              onClick={() => onOpenEvidence('45hfkSE5DvA-E178')}
              className="text-blue-600 hover:underline font-mono text-[10px]"
            >
              [cite: E178]
            </button>:
          </p>
          <div className="flex items-baseline gap-2 mb-5">
            <span className="text-3xl font-black text-orange-600 tracking-tight tabular-nums">
              Rp 3.399.000
            </span>
            <span className="text-xs text-gray-400 font-medium line-through tabular-nums">
              Rp 3.999.000
            </span>
          </div>

          <div className="space-y-2.5">
            <a
              href="https://www.tokopedia.com/find/samsung-galaxy-a26-5g"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-xs shadow-2xs"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Cek Promo Tokopedia</span>
              <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
            </a>
            <a
              href="https://shopee.co.id/search?keyword=samsung%20galaxy%20a26%205g"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-xs shadow-2xs"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Cek Promo Shopee</span>
              <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
            </a>
          </div>
          <p className="text-[10px] text-gray-400 mt-3 italic text-center leading-tight">
            Harga dapat bervariasi tergantung ketersediaan promo & voucher toko.
          </p>
        </div>

        {/* 2. Pros & Cons Quick Summary */}
        <div className="p-6 space-y-5 text-xs">
          {/* Pros */}
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span>👍</span> Kelebihan Utama
            </h4>
            <ul className="space-y-2 text-slate-700 font-medium">
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold">✔</span>
                <span>Update OS hingga 6 tahun & security patch</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold">✔</span>
                <span>Tahan air & debu sertifikasi IP67</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold">✔</span>
                <span>Bodi ramping 7.7mm + proteksi kaca Victus+</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold">✔</span>
                <span>Kamera utama 50MP OIS stabil</span>
              </li>
            </ul>
          </div>

          {/* Cons */}
          <div className="pt-3 border-t border-gray-100">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span>👎</span> Catatan Penting
            </h4>
            <ul className="space-y-2 text-slate-700 font-medium">
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">✘</span>
                <span>Masih memakai poni Infinity-U notch</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">✘</span>
                <span>Charging 25W butuh ~88 menit penuh</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">✘</span>
                <span>Adaptor charger tidak ada dalam kotak</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">✘</span>
                <span>Speaker mono (kembali ke single speaker)</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 3. Metadata & Source Integrity */}
        <div className="bg-slate-50 border-t border-gray-200 p-6 text-xs text-slate-600 space-y-4">
          <div>
            <h5 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
              🔍 Sumber Bukti Reviewer
            </h5>
            <ul className="space-y-1.5 font-medium">
              <li className="flex items-center gap-2">
                <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded">Media</span>
                <span>Jagat Review (Pengujian Lab)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded">Media</span>
                <span>TrendingTek (Ulasan 1 Bulan)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded">Media</span>
                <span>rizkinhk (Unboxing & Retail)</span>
              </li>
            </ul>
          </div>

          <div className="pt-2 border-t border-slate-200 text-[11px] flex justify-between">
            <span><strong>Bias:</strong> Independen</span>
            <span><strong>Sponsor:</strong> TIDAK ADA</span>
          </div>
        </div>

      </div>
    </aside>
  );
};

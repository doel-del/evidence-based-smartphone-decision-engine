import React from 'react';

interface SpecTableProps {
  onOpenEvidence: (id: string) => void;
}

export const SpecTable: React.FC<SpecTableProps> = ({ onOpenEvidence }) => {
  return (
    <section id="spesifikasi" className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-xs">
      <header className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl shadow-inner border border-blue-200">
            📱
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              Spesifikasi Teknis
            </h2>
            <p className="text-xs font-semibold text-gray-500 mt-0.5">
              Data spesifikasi resmi tervalidasi dari 3 reviewer independen
            </p>
          </div>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <tbody className="divide-y divide-gray-100">
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-3.5 px-4 font-bold text-gray-600 w-1/3">Tipe / Model</td>
              <td className="py-3.5 px-4 font-bold text-gray-900">
                Samsung Galaxy A26 5G
              </td>
            </tr>

            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-3.5 px-4 font-bold text-gray-600">Chipset (Prosesor)</td>
              <td className="py-3.5 px-4 font-medium text-gray-900">
                <span>Exynos 1380 (5nm) Octa-Core (GPU Mali-G68 MP5)</span>
                <button
                  onClick={() => onOpenEvidence('45hfkSE5DvA-E063')}
                  className="ml-2 text-[11px] font-mono font-bold text-blue-600 hover:underline"
                >
                  [cite: E063]
                </button>
              </td>
            </tr>

            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-3.5 px-4 font-bold text-gray-600">Layar</td>
              <td className="py-3.5 px-4 font-medium text-gray-900">
                <span className="font-bold text-blue-600">6.7" Super AMOLED, 120Hz, FHD+ (2340 x 1080)</span>
                <span className="block text-xs text-gray-500 mt-0.5">
                  Peak brightness 1025 nits, Gorilla Glass Victus+, Infinity-U Notch
                  <button
                    onClick={() => onOpenEvidence('45hfkSE5DvA-E032')}
                    className="ml-1 text-[11px] font-mono text-blue-600 hover:underline"
                  >
                    [cite: E032]
                  </button>
                </span>
              </td>
            </tr>

            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-3.5 px-4 font-bold text-gray-600">RAM & ROM</td>
              <td className="py-3.5 px-4 font-medium text-gray-900">
                <span>8GB LPDDR4X / 256GB UFS 2.2</span>
                <span className="block text-xs text-gray-500 mt-0.5">
                  Slot Hybrid (Dual Nano SIM / Single SIM + MicroSD), RAM Plus +8GB
                  <button
                    onClick={() => onOpenEvidence('45hfkSE5DvA-E073')}
                    className="ml-1 text-[11px] font-mono text-blue-600 hover:underline"
                  >
                    [cite: E073]
                  </button>
                </span>
              </td>
            </tr>

            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-3.5 px-4 font-bold text-gray-600">Kamera Belakang</td>
              <td className="py-3.5 px-4 font-medium text-gray-900">
                <span>50 MP (OIS, f/1.8, 4K30fps) + 8 MP (Ultrawide f/2.2) + 2 MP (Macro)</span>
                <button
                  onClick={() => onOpenEvidence('45hfkSE5DvA-E051')}
                  className="ml-2 text-[11px] font-mono font-bold text-blue-600 hover:underline"
                >
                  [cite: E051]
                </button>
              </td>
            </tr>

            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-3.5 px-4 font-bold text-gray-600">Kamera Depan</td>
              <td className="py-3.5 px-4 font-medium text-gray-900">
                <span>13 MP (f/2.2, perekaman video up to 1080p 30fps)</span>
                <button
                  onClick={() => onOpenEvidence('45hfkSE5DvA-E047')}
                  className="ml-2 text-[11px] font-mono font-bold text-blue-600 hover:underline"
                >
                  [cite: E047]
                </button>
              </td>
            </tr>

            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-3.5 px-4 font-bold text-gray-600">Software & Keamanan</td>
              <td className="py-3.5 px-4 font-medium text-gray-900">
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="bg-gray-100 text-gray-800 px-2.5 py-1 rounded-md text-xs font-semibold">
                    One UI 7 (Android 15)
                  </span>
                  <span className="bg-gray-100 text-gray-800 px-2.5 py-1 rounded-md text-xs font-semibold">
                    6 Tahun OS & Security
                  </span>
                  <span className="bg-gray-100 text-gray-800 px-2.5 py-1 rounded-md text-xs font-semibold">
                    Knox Vault Hardware
                  </span>
                  <button
                    onClick={() => onOpenEvidence('45hfkSE5DvA-E087')}
                    className="text-[11px] font-mono text-blue-600 hover:underline"
                  >
                    [cite: E087]
                  </button>
                </div>
              </td>
            </tr>

            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-3.5 px-4 font-bold text-gray-600">Baterai & Pengisian</td>
              <td className="py-3.5 px-4 font-medium text-gray-900">
                <span>5000 mAh, 25W Fast Charging (Bypass Charging support)</span>
                <button
                  onClick={() => onOpenEvidence('45hfkSE5DvA-E104')}
                  className="ml-2 text-[11px] font-mono font-bold text-blue-600 hover:underline"
                >
                  [cite: E104]
                </button>
              </td>
            </tr>

            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-3.5 px-4 font-bold text-gray-600">Durabilitas & Dimensi</td>
              <td className="py-3.5 px-4 font-medium text-gray-900">
                <span>IP67 Tahan Air & Debu, Tebal 7.7mm, Bobot ~200g, Kaca Victus+</span>
                <button
                  onClick={() => onOpenEvidence('45hfkSE5DvA-E001')}
                  className="ml-2 text-[11px] font-mono font-bold text-blue-600 hover:underline"
                >
                  [cite: E001]
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
};

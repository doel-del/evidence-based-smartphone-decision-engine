import React from 'react';

interface ClaimVsRealityProps {
  onOpenEvidence: (id: string) => void;
}

export const ClaimVsReality: React.FC<ClaimVsRealityProps> = ({ onOpenEvidence }) => {
  const comparisons = [
    {
      metric: 'Dukungan Software',
      factoryClaim: '6 Tahun OS & Security Updates',
      realTested: 'Terkonfirmasi One UI 7 (Android 15) dengan komitmen update terpanjang di kelas Rp 3 jutaan',
      delta: 'Nilai Langka',
      deltaColor: 'text-blue-600',
      status: 'Excellent',
      statusBadge: 'bg-blue-100 text-blue-700',
      evidenceId: '45hfkSE5DvA-E006'
    },
    {
      metric: 'Durabilitas Bodi',
      factoryClaim: 'Tahan Air & Debu IP67',
      realTested: 'Sertifikasi IP67 resmi teruji aman dari cipratan, hujan deras, dan perendaman 1 meter 30 menit',
      delta: 'Sesuai Spesifikasi',
      deltaColor: 'text-emerald-600',
      status: 'As Expected',
      statusBadge: 'bg-emerald-100 text-emerald-700',
      evidenceId: '45hfkSE5DvA-E001'
    },
    {
      metric: 'Kecerahan Layar',
      factoryClaim: 'Peak 1000 nits Super AMOLED',
      realTested: 'Pengujian Jagat Review mencatatkan peak brightness mencapai 1025 nits dan simulasi outdoor 741 nits',
      delta: '+25 nits (Melampaui Klaim)',
      deltaColor: 'text-emerald-600',
      status: 'Verified',
      statusBadge: 'bg-emerald-100 text-emerald-700',
      evidenceId: '45hfkSE5DvA-E032'
    },
    {
      metric: 'Stabilisasi Video',
      factoryClaim: 'OIS 50MP Camera',
      realTested: 'Video 1080p 30fps sangat stabil, namun EIS tidak aktif pada resolusi 4K atau 1080p 60fps',
      delta: 'Terbatas di 1080p 30fps',
      deltaColor: 'text-amber-600',
      status: 'Caveat',
      statusBadge: 'bg-amber-100 text-amber-700',
      evidenceId: '45hfkSE5DvA-E145'
    },
    {
      metric: 'Desain Layar',
      factoryClaim: 'Infinity-U Display 120Hz',
      realTested: 'Poni waterdrop dan dagu bawah tebal terlihat tertinggal dari punch-hole modern HP sekelas',
      delta: 'Desain Agak Lawas',
      deltaColor: 'text-red-600',
      status: 'Outdated Look',
      statusBadge: 'bg-red-100 text-red-700',
      evidenceId: '45hfkSE5DvA-E179'
    },
    {
      metric: 'Baterai & Charging',
      factoryClaim: '5000 mAh, 25W Fast Charging',
      realTested: 'Baterai awet hingga 25 jam YouTube, namun butuh 88 menit untuk penuh dan tanpa charger di box',
      delta: 'Pengisian Agak Pelan',
      deltaColor: 'text-amber-600',
      status: 'Moderate',
      statusBadge: 'bg-amber-100 text-amber-700',
      evidenceId: '45hfkSE5DvA-E166'
    }
  ];

  return (
    <section id="klaim-vs-fakta" className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-xs">
      <header className="mb-6">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">
          Klaim Pabrikan vs Pengujian Lapangan Nyata
        </h2>
        <p className="text-xs font-semibold text-gray-500 mt-1">
          Perbandingan spesifikasi resmi pabrikan dengan data uji lapangan reviewer independen
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 font-semibold">Metrik</th>
              <th className="py-3 px-4 font-semibold">Klaim Pabrik</th>
              <th className="py-3 px-4 font-semibold">Hasil Uji Nyata</th>
              <th className="py-3 px-4 font-semibold">Delta</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold text-right">Bukti</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {comparisons.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3.5 px-4 font-bold text-slate-900">{row.metric}</td>
                <td className="py-3.5 px-4 text-slate-600">{row.factoryClaim}</td>
                <td className="py-3.5 px-4 text-slate-800 font-medium">{row.realTested}</td>
                <td className={`py-3.5 px-4 font-bold ${row.deltaColor}`}>{row.delta}</td>
                <td className="py-3.5 px-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${row.statusBadge}`}>
                    {row.status}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => onOpenEvidence(row.evidenceId)}
                    className="font-mono text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    [{row.evidenceId.split('-').pop()}]
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

import React from 'react';

interface FaqSectionProps {
  onOpenEvidence: (id: string) => void;
}

export const FaqSection: React.FC<FaqSectionProps> = ({ onOpenEvidence }) => {
  const faqs = [
    {
      q: 'Apakah kamera belakangnya sudah dilengkapi OIS?',
      a: 'Ya, kamera utama 50MP sudah dibekali hardware OIS (Optical Image Stabilization) sehingga video yang dihasilkan stabil pada perekaman 1080p 30fps dan foto malam hari minim guncangan.',
      evidenceId: '45hfkSE5DvA-E051'
    },
    {
      q: 'Apakah HP ini aman jika terkena hujan deras atau tumpahan air?',
      a: 'Sangat aman. Galaxy A26 5G mengantongi sertifikasi IP67 yang menjamin bodi perangkat kedap debu dan tahan terendam air tawar hingga kedalaman 1 meter selama 30 menit.',
      evidenceId: '45hfkSE5DvA-E001'
    },
    {
      q: 'Berapa lama jaminan pembaruan sistem operasi dan keamanan?',
      a: 'Samsung memberikan komitmen jaminan 6 generasi OS update (hingga Android 21) dan 6 tahun patch keamanan, salah satu yang terpanjang di kelas smartphone Rp 3 jutaan.',
      evidenceId: '45hfkSE5DvA-E006'
    },
    {
      q: 'Apakah charger adaptor disertakan di dalam kotak kemasan?',
      a: 'Tidak. Paket penjualan hanya menyertakan kabel data USB Type-C to Type-C, SIM ejector, dan buku panduan. Kepala charger 25W harus dibeli terpisah seharga sekitar Rp 200 ribuan.',
      evidenceId: 'lzeD_sBrCB0-E002'
    },
    {
      q: 'Apakah Galaxy A26 5G sanggup memainkan Genshin Impact?',
      a: 'Bisa dijalankan di rentang 30–40 fps pada pengaturan Highest 60fps tanpa kipas. Namun bodi akan menghangat hingga 43–45°C sehingga disarankan memakai mode Balanced atau pendingin tambahan.',
      evidenceId: '45hfkSE5DvA-E132'
    }
  ];

  return (
    <section className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-xs">
      <h2 className="text-2xl font-black text-gray-900 mb-6 tracking-tight">
        Frequently Asked Questions (FAQ)
      </h2>
      <div className="space-y-3.5">
        {faqs.map((faq, idx) => (
          <details 
            key={idx} 
            className="group rounded-2xl border border-gray-200 p-4 open:border-blue-300 open:bg-slate-50/50 transition-colors"
          >
            <summary className="cursor-pointer font-bold text-sm text-gray-900 flex items-center justify-between outline-hidden">
              <span>{faq.q}</span>
              <span className="text-blue-600 group-open:rotate-180 transition-transform font-bold text-base">
                ↓
              </span>
            </summary>
            <div className="mt-3 text-xs leading-relaxed text-gray-600 font-medium border-t border-gray-100 pt-3">
              <p>{faq.a}</p>
              <button
                onClick={() => onOpenEvidence(faq.evidenceId)}
                className="mt-2 text-[11px] font-mono font-bold text-blue-600 hover:underline inline-block"
              >
                [Verifikasi Bukti: {faq.evidenceId.split('-').pop()}]
              </button>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
};

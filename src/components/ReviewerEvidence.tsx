import React from 'react';
import { ExternalLink, Video, Quote } from 'lucide-react';

interface ReviewerEvidenceProps {
  onOpenEvidence: (id: string) => void;
}

export const ReviewerEvidence: React.FC<ReviewerEvidenceProps> = ({ onOpenEvidence }) => {
  const reviews = [
    {
      source: 'Jagat Review',
      videoTitle: 'Lebih Kencang & Tipis, Update 6 Thn, Tahan Air IP67 | Review Samsung Galaxy A26 5G',
      quote: 'AnTuTu-nya sudah 600.000-an, bisa main game berat seperti Genshin Impact. Jaminan pembaruan panjang sampai 6 tahun, bodinya juga slim di 7,7 mm, dan sekarang sudah tahan air IP67.',
      timestamp: '00:00:20',
      youtubeUrl: 'https://www.youtube.com/watch?v=45hfkSE5DvA&t=20s',
      evidenceId: '45hfkSE5DvA-E006',
      badge: 'Uji Laboratorium & Gaming'
    },
    {
      source: 'TrendingTek',
      videoTitle: 'Review Samsung A26 5G | Beli Atau Cari HP Lain?',
      quote: 'Samsung Galaxy A26 ini enak dan bagus buat harganya. Material bodi belakang dikasih kaca Victus+ dan ada rating IP67. Paling yang bikin agak mundur untuk beli itu desain layar waterdrop-nya saja.',
      timestamp: '00:12:21',
      youtubeUrl: 'https://www.youtube.com/watch?v=iiFusNBRirA&t=741s',
      evidenceId: 'iiFusNBRirA-E099',
      badge: 'Review Pemakaian 1 Bulan'
    },
    {
      source: 'rizkinhk',
      videoTitle: 'Unboxing Samsung A26 5G',
      quote: 'Official-nya di 4 juta, aku dapat promo di 3,8 juta. Layar Super AMOLED 120Hz dan One UI 7 Android 15 dengan 6 tahun update. Sayang kepala charger dijual terpisah tidak dapat di dalam kotak.',
      timestamp: '00:00:43',
      youtubeUrl: 'https://www.youtube.com/watch?v=lzeD_sBrCB0&t=43s',
      evidenceId: 'lzeD_sBrCB0-E005',
      badge: 'Unboxing & Harga Ritel'
    }
  ];

  return (
    <section className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-xs space-y-6">
      <header className="border-b border-gray-100 pb-4">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">
          Testimoni & Suara Nyata Para Reviewer
        </h2>
        <p className="text-xs font-semibold text-gray-500 mt-1">
          Kutipan langsung dari transkrip video pengujian lapangan terverifikasi
        </p>
      </header>

      <div className="grid md:grid-cols-3 gap-5">
        {reviews.map((rev, idx) => (
          <div 
            key={idx}
            className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4 hover:border-blue-300 transition-colors"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  {rev.badge}
                </span>
                <span className="text-[11px] font-mono text-slate-500 font-bold">
                  {rev.timestamp}
                </span>
              </div>

              <div className="relative pt-1">
                <Quote className="w-5 h-5 text-blue-300 mb-1" />
                <p className="text-xs text-slate-700 font-medium italic leading-relaxed">
                  "{rev.quote}"
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-red-600" />
                  {rev.source}
                </p>
                <button
                  onClick={() => onOpenEvidence(rev.evidenceId)}
                  className="text-[10px] font-mono text-blue-600 hover:underline mt-0.5 text-left block"
                >
                  Bukti [{rev.evidenceId.split('-').pop()}]
                </button>
              </div>

              <a
                href={rev.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 transition-colors shrink-0"
                title={`Tonton ${rev.source} di YouTube`}
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

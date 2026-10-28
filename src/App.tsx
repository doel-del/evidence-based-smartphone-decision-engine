import React, { useEffect, useState } from 'react';
import { DecisionResult } from './server/types.js';
import { Navbar } from './components/Navbar.js';
import { HeroScore } from './components/HeroScore.js';
import { QuickDecision } from './components/QuickDecision.js';
import { SpecTable } from './components/SpecTable.js';
import { CriteriaBreakdown } from './components/CriteriaBreakdown.js';
import { StrengthsAndTradeoffs } from './components/StrengthsAndTradeoffs.js';
import { ClaimVsReality } from './components/ClaimVsReality.js';
import { ReviewerEvidence } from './components/ReviewerEvidence.js';
import { MarketCheckAndAlternatives } from './components/MarketCheckAndAlternatives.js';
import { FaqSection } from './components/FaqSection.js';
import { PricingAside } from './components/PricingAside.js';
import { EvidenceModal } from './components/EvidenceModal.js';
import { DiagnosticsView } from './components/DiagnosticsView.js';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function App() {
  const [decision, setDecision] = useState<DecisionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeEvidenceId, setActiveEvidenceId] = useState<string | null>(null);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

  const fetchDecision = () => {
    setLoading(true);
    setError(null);
    fetch('/api/products/samsung-galaxy-a26-5g/decision')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: DecisionResult) => {
        setDecision(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Gagal memuat hasil evaluasi keputusan dari backend API');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDecision();
  }, []);

  return (
    <div className="bg-gray-50 text-gray-900 min-h-screen font-sans flex flex-col selection:bg-blue-100 selection:text-blue-900">
      {/* Top Bar Navigation */}
      <Navbar onOpenDiagnostics={() => setIsDiagnosticsOpen(true)} />

      {/* Main Container */}
      <main className="grow">
        {/* API Error Alert State */}
        {error && (
          <div className="max-w-6xl mx-auto px-4 mt-6">
            <div className="bg-red-50 border border-red-200 text-red-900 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-sm">Gagal Mengambil Data Evaluasi dari Backend</h3>
                  <p className="text-xs text-red-700 mt-0.5 font-medium">{error}</p>
                </div>
              </div>
              <button
                onClick={fetchDecision}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Coba Lagi</span>
              </button>
            </div>
          </div>
        )}

        {/* Hero & Score Box Header */}
        <HeroScore
          decision={decision}
          loading={loading}
          onOpenEvidence={(id) => setActiveEvidenceId(id)}
        />

        {/* Content Body (2-Column Layout) */}
        <div className="max-w-6xl mx-auto px-4 mt-8 pb-24 grid gap-8 lg:grid-cols-[2fr_1fr] items-start">
          
          {/* Kolom Kiri: Analisis Utama */}
          <div className="space-y-8">
            {/* Quick Decision Box */}
            <QuickDecision
              decision={decision}
              onOpenEvidence={(id) => setActiveEvidenceId(id)}
            />

            {/* Spec Table */}
            <SpecTable
              onOpenEvidence={(id) => setActiveEvidenceId(id)}
            />

            {/* Section Highlight: Performa & Gaming */}
            <section className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-xs">
              <header className="mb-4 border-b border-gray-100 pb-3">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
                  <span className="text-yellow-500">⚡</span>
                  Performa: Gaming & Antarmuka One UI 7
                </h2>
              </header>

              <p className="text-sm text-gray-700 leading-relaxed font-medium mb-5">
                Ditenagai oleh Exynos 1380 (5nm), Samsung Galaxy A26 5G membuktikan bahwa perangkat mid-range terjangkau sanggup menangani game esports di 90fps (MLBB) dan 60fps (PUBG Mobile). Sistem pendingin Layer Stack Graphite 3,7x lebih luas membantu meredam panas saat beban kerja berat{' '}
                <button
                  onClick={() => setActiveEvidenceId('45hfkSE5DvA-E068')}
                  className="text-xs font-mono font-bold text-blue-600 hover:underline"
                >
                  [cite: E068]
                </button>.
              </p>

              <div className="bg-blue-50/70 border border-blue-200/80 p-5 rounded-2xl">
                <p className="text-xs sm:text-sm italic font-semibold text-gray-800 leading-relaxed">
                  "Harganya menarik, dapat promo cuma 3,3 sampai 3,8 jutaan aja, unboxing dengan One UI 7 Android 15 langsung, jaminan 6 tahun update, dan hasil gaming serta kamera test-nya memuaskan."
                </p>
                <div className="mt-2 text-[11px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2">
                  <span>Reviewer Consensus (Jagat Review, TrendingTek, rizkinhk)</span>
                </div>
              </div>
            </section>

            {/* Strengths & Tradeoffs (Faktor Pendorong & Pemangkas Skor) */}
            <StrengthsAndTradeoffs
              decision={decision}
              onOpenEvidence={(id) => setActiveEvidenceId(id)}
            />

            {/* 7 Criteria Breakdown */}
            <CriteriaBreakdown
              decision={decision}
              onOpenEvidence={(id) => setActiveEvidenceId(id)}
            />

            {/* Marketing Claims vs Tested Reality */}
            <ClaimVsReality
              onOpenEvidence={(id) => setActiveEvidenceId(id)}
            />

            {/* Reviewer Voices & Evidence Quotes */}
            <ReviewerEvidence
              onOpenEvidence={(id) => setActiveEvidenceId(id)}
            />

            {/* Market Reality & Competitor Alternatives */}
            <MarketCheckAndAlternatives
              onOpenEvidence={(id) => setActiveEvidenceId(id)}
            />

            {/* FAQ */}
            <FaqSection
              onOpenEvidence={(id) => setActiveEvidenceId(id)}
            />
          </div>

          {/* Kolom Kanan / Sidebar: Pricing, Pros/Cons & Source Meta */}
          <PricingAside
            onOpenEvidence={(id) => setActiveEvidenceId(id)}
          />

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-10 text-center text-xs text-gray-500 font-medium">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <p className="font-semibold text-gray-700">
            Evidence-Based Smartphone Decision Engine © 2026 GripAndReview
          </p>
          <p className="text-[11px] text-gray-400">
            Engine Ruleset: {decision?.rulesetVersion || 'v1.0.0-deterministic-prd'} · Dataset: {decision?.evidenceDatasetVersion || 'v1.0.0-multi-source-indonesia'}
          </p>
          <div className="pt-2">
            <button
              onClick={() => setIsDiagnosticsOpen(true)}
              className="text-blue-600 hover:text-blue-800 underline font-semibold text-xs"
            >
              Buka Laporan Audit Diagnostik Dataset
            </button>
          </div>
        </div>
      </footer>

      {/* Evidence Traceability Inspector Modal */}
      <EvidenceModal
        evidenceId={activeEvidenceId}
        onClose={() => setActiveEvidenceId(null)}
      />

      {/* Dataset Diagnostics Modal */}
      <DiagnosticsView
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
      />
    </div>
  );
}

import { EvidenceRepository } from './evidenceRepository.js';
import { 
  CriterionId, 
  CriterionScoreResult, 
  DecisionLabel, 
  DecisionResult, 
  DecisionStatus, 
  StrengthItem, 
  TradeoffItem, 
  DecisionReasonItem 
} from './types.js';
import { CRITERIA_DEFINITIONS, RUBRICS_CONFIG, RULESET_VERSION, EVIDENCE_DATASET_VERSION } from './decisionRules.js';
import { calculateConfidence } from './confidenceEngine.js';

export function runDecisionEngine(repository: EvidenceRepository): DecisionResult {
  const eligibleEvidence = repository.getEligibleRecords();
  const excludedEvidence = repository.getExcludedRecords();
  const conflicts = repository.detectConflicts();

  // Helper to collect existing evidence IDs
  const findEvidenceIds = (predicate: (ev: any) => boolean): string[] => {
    return eligibleEvidence.filter(predicate).map(e => e.evidence_id);
  };

  // 1. Evaluate Criterion 1: Price and Value for Money (20%)
  const priceEvidenceIds = findEvidenceIds(e => 
    e.attribute === 'price' || e.attribute === 'official_price' || e.attribute === 'purchase_price' ||
    e.subtopic === 'harganya' || e.subtopic === 'harga' || e.topic === 'retail-package'
  );
  const chargerEvidenceIds = findEvidenceIds(e =>
    e.subtopic === 'kepala-charger' || e.subtopic === 'kepala charger' || e.attribute === 'charger_included'
  );

  const priceScore: CriterionScoreResult = {
    criterionId: 'price_and_value',
    criterionName: CRITERIA_DEFINITIONS.price_and_value.name,
    criterionNameId: CRITERIA_DEFINITIONS.price_and_value.nameId,
    weight: CRITERIA_DEFINITIONS.price_and_value.weight,
    score: 4.3,
    isRated: true,
    rubricVersion: RUBRICS_CONFIG.price_and_value.version,
    evidenceIdsUsed: [
      ...priceEvidenceIds.filter(id => ['45hfkSE5DvA-E178', 'lzeD_sBrCB0-E004', 'lzeD_sBrCB0-E005'].includes(id)),
      ...chargerEvidenceIds.filter(id => ['lzeD_sBrCB0-E002', 'lzeD_sBrCB0-E003', 'lzeD_sBrCB0-E021', 'lzeD_sBrCB0-E072'].includes(id))
    ],
    primaryFindings: [
      'Harga resmi SRP berada di Rp 3.999.000 / Rp 4.000.000 untuk varian 8GB / 256GB.',
      'Dapat dibeli dengan harga promo pasar hingga kisaran Rp 3.399.000 - Rp 3.800.000.',
      'Nilai sangat tinggi di kelas mid-range budget dengan garansi OS 6 tahun dan sertifikasi IP67.'
    ],
    positiveDrivers: [
      { text: 'Harga promo marketplace tembus Rp 3,3 - 3,8 jutaan untuk varian 8/256GB', evidenceIds: ['lzeD_sBrCB0-E005', '45hfkSE5DvA-E178'], delta: +0.6 }
    ],
    negativeDeductions: [
      { text: 'Adaptor charger dijual terpisah dan tidak ada dalam kotak ritel', evidenceIds: ['lzeD_sBrCB0-E002', 'lzeD_sBrCB0-E021', 'lzeD_sBrCB0-E072'], delta: -0.3 }
    ]
  };

  // 2. Evaluate Criterion 2: Performance and Gaming (15%)
  const perfEvidenceIds = findEvidenceIds(e =>
    e.topic === 'performance' || e.topic === 'gaming' || e.topic === 'benchmark'
  );

  const perfScore: CriterionScoreResult = {
    criterionId: 'performance_and_gaming',
    criterionName: CRITERIA_DEFINITIONS.performance_and_gaming.name,
    criterionNameId: CRITERIA_DEFINITIONS.performance_and_gaming.nameId,
    weight: CRITERIA_DEFINITIONS.performance_and_gaming.weight,
    score: 4.0,
    isRated: true,
    rubricVersion: RUBRICS_CONFIG.performance_and_gaming.version,
    evidenceIdsUsed: [
      '45hfkSE5DvA-E063', '45hfkSE5DvA-E064', '45hfkSE5DvA-E065', '45hfkSE5DvA-E107',
      '45hfkSE5DvA-E113', '45hfkSE5DvA-E117', '45hfkSE5DvA-E118', '45hfkSE5DvA-E120',
      '45hfkSE5DvA-E121', '45hfkSE5DvA-E127', '45hfkSE5DvA-E128', '45hfkSE5DvA-E130',
      'lzeD_sBrCB0-E047', 'iiFusNBRirA-E017'
    ].filter(id => perfEvidenceIds.includes(id)),
    primaryFindings: [
      'Chipset Exynos 1380 (5nm) 8-core mencetak skor AnTuTu 10 di kisaran ~608.000 - 609.000.',
      'Game kompetitif berjalan mulus: MLBB Ultra 90fps, PUBG Mobile Smooth Extreme 60fps, Free Fire Ultra 60fps.',
      'Stabilitas 3DMark Wild Life Extreme mencapai 93,4% tanpa kipas.',
      'Pada game berat (Genshin Impact, Wuthering Waves) suhu bodi mencapai 43-45°C dengan frame rate 25-40 fps.'
    ],
    positiveDrivers: [
      { text: 'Performa kompetitif tinggi dengan 90fps mulus pada Mobile Legends dan 60fps PUBG', evidenceIds: ['45hfkSE5DvA-E118', '45hfkSE5DvA-E121'], delta: +0.5 },
      { text: 'Stabilitas stress test grafis tinggi mencapai 93,4%', evidenceIds: ['45hfkSE5DvA-E113'], delta: +0.2 }
    ],
    negativeDeductions: [
      { text: 'Suhu bodi naik hingga 45°C pada game berat (Wuthering Waves/Genshin) dan disarankan cooler eksternal', evidenceIds: ['45hfkSE5DvA-E128', '45hfkSE5DvA-E130'], delta: -0.3 }
    ]
  };

  // 3. Evaluate Criterion 3: Battery and Charging (15%)
  const battEvidenceIds = findEvidenceIds(e =>
    e.topic === 'battery' || e.topic === 'charging'
  );

  const batteryScore: CriterionScoreResult = {
    criterionId: 'battery_and_charging',
    criterionName: CRITERIA_DEFINITIONS.battery_and_charging.name,
    criterionNameId: CRITERIA_DEFINITIONS.battery_and_charging.nameId,
    weight: CRITERIA_DEFINITIONS.battery_and_charging.weight,
    score: 3.8,
    isRated: true,
    rubricVersion: RUBRICS_CONFIG.battery_and_charging.version,
    evidenceIdsUsed: [
      '45hfkSE5DvA-E075', '45hfkSE5DvA-E076', '45hfkSE5DvA-E104', '45hfkSE5DvA-E156',
      '45hfkSE5DvA-E158', '45hfkSE5DvA-E165', '45hfkSE5DvA-E166', '45hfkSE5DvA-E167',
      'iiFusNBRirA-E028', 'iiFusNBRirA-E030', 'lzeD_sBrCB0-E070', 'lzeD_sBrCB0-E071'
    ].filter(id => battEvidenceIds.includes(id)),
    primaryFindings: [
      'Kapasitas baterai 5000 mAh mampu bertahan hingga 25 jam 2 menit pemutaran video YouTube offline pada 60Hz.',
      'Dukungan fitur Pause USB Power Delivery (Bypass Charging) untuk menjaga baterai dan suhu saat gaming.',
      'Pengisian daya maksimal 25W memerlukan waktu 33 menit untuk 50% dan 1 jam 28 menit hingga 100%.'
    ],
    positiveDrivers: [
      { text: 'Daya tahan video playback tembus 25 jam pada mode 60Hz', evidenceIds: ['45hfkSE5DvA-E158'], delta: +0.4 },
      { text: 'Fitur Bypass Charging (Pause USB Power Delivery) tersedia', evidenceIds: ['45hfkSE5DvA-E104'], delta: +0.2 }
    ],
    negativeDeductions: [
      { text: 'Kecepatan charging terbatas di 25W dan membutuhkan 88 menit untuk penuh', evidenceIds: ['45hfkSE5DvA-E166', '45hfkSE5DvA-E167'], delta: -0.6 }
    ]
  };

  // 4. Evaluate Criterion 4: Software and Security Support (15%)
  const softEvidenceIds = findEvidenceIds(e =>
    e.topic === 'software'
  );

  const softwareScore: CriterionScoreResult = {
    criterionId: 'software_and_security',
    criterionName: CRITERIA_DEFINITIONS.software_and_security.name,
    criterionNameId: CRITERIA_DEFINITIONS.software_and_security.nameId,
    weight: CRITERIA_DEFINITIONS.software_and_security.weight,
    score: 4.8,
    isRated: true,
    rubricVersion: RUBRICS_CONFIG.software_and_security.version,
    evidenceIdsUsed: [
      '45hfkSE5DvA-E006', '45hfkSE5DvA-E087', '45hfkSE5DvA-E088', '45hfkSE5DvA-E089',
      '45hfkSE5DvA-E092', '45hfkSE5DvA-E093', '45hfkSE5DvA-E094', '45hfkSE5DvA-E098',
      '45hfkSE5DvA-E100', '45hfkSE5DvA-E106', 'iiFusNBRirA-E038', 'iiFusNBRirA-E040',
      'iiFusNBRirA-E042', 'lzeD_sBrCB0-E061', 'lzeD_sBrCB0-E062'
    ].filter(id => softEvidenceIds.includes(id)),
    primaryFindings: [
      'Jaminan pembaruan OS hingga 6 generasi Android dan 6 tahun security patch.',
      'One UI 7 langsung berbasis Android 15 out-of-the-box.',
      'Proteksi kelas flagship dengan dedicated hardware Samsung Knox Vault, Secure Folder, dan Auto-Blocker.',
      'Fitur AI Awesome Intelligence (Circle to Search, Object Eraser, AI Select, Now Bar).'
    ],
    positiveDrivers: [
      { text: 'Komitmen 6 tahun update OS Android & Security Patch sangat langka di kelasnya', evidenceIds: ['45hfkSE5DvA-E006', 'iiFusNBRirA-E040', 'lzeD_sBrCB0-E061'], delta: +0.6 },
      { text: 'Hardware dedicated chip Samsung Knox Vault terpasang', evidenceIds: ['45hfkSE5DvA-E087', 'iiFusNBRirA-E038'], delta: +0.4 }
    ],
    negativeDeductions: [
      { text: 'Sebagian fitur AI flagship (Instant Slow-Mo, Auto Trim, Bixby) dipangkas pada seri ini', evidenceIds: ['iiFusNBRirA-E042', 'iiFusNBRirA-E048'], delta: -0.2 }
    ]
  };

  // 5. Evaluate Criterion 5: Display and Design (10%)
  const dispEvidenceIds = findEvidenceIds(e =>
    e.topic === 'display' || e.topic === 'design'
  );

  const displayScore: CriterionScoreResult = {
    criterionId: 'display_and_design',
    criterionName: CRITERIA_DEFINITIONS.display_and_design.name,
    criterionNameId: CRITERIA_DEFINITIONS.display_and_design.nameId,
    weight: CRITERIA_DEFINITIONS.display_and_design.weight,
    score: 3.5,
    isRated: true,
    rubricVersion: RUBRICS_CONFIG.display_and_design.version,
    evidenceIdsUsed: [
      '45hfkSE5DvA-E003', '45hfkSE5DvA-E007', '45hfkSE5DvA-E026', '45hfkSE5DvA-E027',
      '45hfkSE5DvA-E028', '45hfkSE5DvA-E029', '45hfkSE5DvA-E032', '45hfkSE5DvA-E043',
      '45hfkSE5DvA-E046', '45hfkSE5DvA-E179', '45hfkSE5DvA-E184', 'iiFusNBRirA-E001',
      'iiFusNBRirA-E011', 'iiFusNBRirA-E012', 'lzeD_sBrCB0-E027', 'lzeD_sBrCB0-E029'
    ].filter(id => dispEvidenceIds.includes(id)),
    primaryFindings: [
      'Layar 6.7 inci Super AMOLED Full HD+ 120Hz dengan peak brightness mencapai 1025 nits.',
      'Bodi ramping 7.7mm dengan punggung kaca Gorilla Glass Victus+ yang memberi kesan premium.',
      'Kamera selfie masih menggunakan notch waterdrop / Infinity-U yang terlihat kuno dibandingkan punch-hole kompetitor.',
      'Refresh rate belum adaptif (harus dipilih manual antara 60Hz atau 120Hz).',
      'Bezel dagu bawah terasa masih agak tebal.'
    ],
    positiveDrivers: [
      { text: 'Panel Super AMOLED cerah (peak 1025 nits) dan bodi tipis 7.7mm dengan kaca Victus+', evidenceIds: ['45hfkSE5DvA-E027', '45hfkSE5DvA-E032', '45hfkSE5DvA-E007'], delta: +0.5 }
    ],
    negativeDeductions: [
      { text: 'Bentuk notch waterdrop / Infinity-U terlihat ketinggalan zaman dibanding punch-hole', evidenceIds: ['45hfkSE5DvA-E179', 'iiFusNBRirA-E011', 'lzeD_sBrCB0-E029'], delta: -0.5 },
      { text: 'Refresh rate layar belum adaptif (harus memilih manual 60Hz atau 120Hz)', evidenceIds: ['45hfkSE5DvA-E184'], delta: -0.3 },
      { text: 'Bezel dagu bawah masih agak tebal', evidenceIds: ['iiFusNBRirA-E012', 'lzeD_sBrCB0-E028'], delta: -0.2 }
    ]
  };

  // 6. Evaluate Criterion 6: Camera (10%)
  const camEvidenceIds = findEvidenceIds(e =>
    e.topic === 'camera'
  );

  const cameraScore: CriterionScoreResult = {
    criterionId: 'camera',
    criterionName: CRITERIA_DEFINITIONS.camera.name,
    criterionNameId: CRITERIA_DEFINITIONS.camera.nameId,
    weight: CRITERIA_DEFINITIONS.camera.weight,
    score: 3.5,
    isRated: true,
    rubricVersion: RUBRICS_CONFIG.camera.version,
    evidenceIdsUsed: [
      '45hfkSE5DvA-E051', '45hfkSE5DvA-E054', '45hfkSE5DvA-E056', '45hfkSE5DvA-E060',
      '45hfkSE5DvA-E141', '45hfkSE5DvA-E143', '45hfkSE5DvA-E145', '45hfkSE5DvA-E150',
      '45hfkSE5DvA-E153', '45hfkSE5DvA-E155', 'iiFusNBRirA-E050', 'iiFusNBRirA-E054',
      'iiFusNBRirA-E058', 'iiFusNBRirA-E078', 'iiFusNBRirA-E087'
    ].filter(id => camEvidenceIds.includes(id)),
    primaryFindings: [
      'Kamera utama 50MP dengan OIS menghasilkan foto tajam dan rekaman video 4K 30fps berkualitas baik di kelasnya.',
      'Perekaman video 1080p 30fps sangat stabil berkat kombinasi OIS dan EIS.',
      'Mendukung perpindahan kamera mulus (kamera utama, ultrawide, selfie) saat perekaman aktif.',
      'EIS tidak aktif di resolusi di atas 1080p 30fps (4K dan 1080p 60fps hanya mengandalkan OIS).',
      'Kamera selfie 13MP tidak mendukung perekaman 60fps dan cenderung soft/noisy di malam hari.',
      'Kamera makro 2MP dinilai minim kegunaan.'
    ],
    positiveDrivers: [
      { text: 'Kamera utama 50MP OIS tajam dan video 1080p 30fps sangat stabil', evidenceIds: ['45hfkSE5DvA-E051', '45hfkSE5DvA-E143', 'iiFusNBRirA-E058'], delta: +0.4 },
      { text: 'Bisa pindah-pindah kamera saat merekam video aktif', evidenceIds: ['45hfkSE5DvA-E150'], delta: +0.2 }
    ],
    negativeDeductions: [
      { text: 'EIS belum aktif di resolusi 4K dan 1080p 60fps sehingga video agak goyang', evidenceIds: ['45hfkSE5DvA-E145', 'iiFusNBRirA-E087'], delta: -0.2 },
      { text: 'Kamera selfie tidak ada opsi 60fps dan menurun di low light', evidenceIds: ['45hfkSE5DvA-E155', '45hfkSE5DvA-E152'], delta: -0.2 }
    ]
  };

  // 7. Evaluate Criterion 7: Durability and Protection (15%)
  const duraEvidenceIds = findEvidenceIds(e =>
    e.topic === 'durability'
  );

  const durabilityScore: CriterionScoreResult = {
    criterionId: 'durability_and_protection',
    criterionName: CRITERIA_DEFINITIONS.durability_and_protection.name,
    criterionNameId: CRITERIA_DEFINITIONS.durability_and_protection.nameId,
    weight: CRITERIA_DEFINITIONS.durability_and_protection.weight,
    score: 4.7,
    isRated: true,
    rubricVersion: RUBRICS_CONFIG.durability_and_protection.version,
    evidenceIdsUsed: [
      '45hfkSE5DvA-E001', '45hfkSE5DvA-E002', '45hfkSE5DvA-E003', '45hfkSE5DvA-E201',
      '45hfkSE5DvA-E206', 'iiFusNBRirA-E004', 'iiFusNBRirA-E005', 'lzeD_sBrCB0-E010',
      'lzeD_sBrCB0-E024'
    ].filter(id => duraEvidenceIds.includes(id)),
    primaryFindings: [
      'Sertifikasi resmi IP67 tahan debu dan rendaman air hingga kedalaman 1 meter selama 30 menit.',
      'Proteksi kaca ganda Gorilla Glass Victus+ pada layar depan dan punggung belakang.',
      'Sangat jarang ditemukan kombinasi IP67 dan Victus+ ganda di rentang harga mid-range Rp 3-4 jutaan.'
    ],
    positiveDrivers: [
      { text: 'Sertifikasi ketahanan air dan debu IP67 resmi', evidenceIds: ['45hfkSE5DvA-E001', 'iiFusNBRirA-E005', 'lzeD_sBrCB0-E010'], delta: +0.4 },
      { text: 'Proteksi Gorilla Glass Victus+ di bagian layar depan dan punggung belakang', evidenceIds: ['45hfkSE5DvA-E002', '45hfkSE5DvA-E003', 'iiFusNBRirA-E004'], delta: +0.3 }
    ],
    negativeDeductions: []
  };

  const criteriaScores: Record<CriterionId, CriterionScoreResult> = {
    price_and_value: priceScore,
    performance_and_gaming: perfScore,
    battery_and_charging: batteryScore,
    software_and_security: softwareScore,
    display_and_design: displayScore,
    camera: cameraScore,
    durability_and_protection: durabilityScore
  };

  // 2. Confidence & Coverage Calculation
  const confResult = calculateConfidence(criteriaScores, eligibleEvidence, conflicts);

  // 3. Overall Weighted Score Calculation
  // Formula: S = sum(weight_i * score_i) / sum(weight_i for rated criteria)
  let weightedSum = 0;
  let ratedWeightSum = 0;

  for (const cid of Object.keys(criteriaScores) as CriterionId[]) {
    const item = criteriaScores[cid];
    if (item.isRated && item.score !== null) {
      weightedSum += item.weight * item.score;
      ratedWeightSum += item.weight;
    }
  }

  const overallScoreExact = ratedWeightSum > 0 ? weightedSum / ratedWeightSum : null;
  const overallScore = overallScoreExact !== null ? Math.round(overallScoreExact * 10) / 10 : null;

  // 4. Determine Overall Decision & Publication Gate
  let decisionStatus: DecisionStatus = 'PUBLISHED';
  let decisionLabel: DecisionLabel = 'Data Tidak Mencukupi';

  // PRD Gate Rule:
  // Publish an overall decision only when:
  // - Coverage is at least 60%
  // - The price/value criterion has been rated
  // - There is no unresolved critical conflict that invalidates the conclusion
  const isPriceRated = criteriaScores.price_and_value?.isRated === true;
  const hasCriticalConflict = conflicts.some(c => c.isCritical && !c.resolved);

  if (confResult.coveragePercent < 60 || !isPriceRated || hasCriticalConflict) {
    decisionStatus = hasCriticalConflict ? 'UNRESOLVED_CRITICAL_CONFLICT' : 'INSUFFICIENT_EVIDENCE';
    decisionLabel = 'Data Tidak Mencukupi';
  } else if (overallScore !== null) {
    if (overallScore >= 4.0) {
      decisionLabel = 'Sangat direkomendasikan';
    } else if (overallScore >= 3.0) {
      decisionLabel = 'Direkomendasikan dengan pertimbangan';
    } else if (overallScore >= 2.0) {
      decisionLabel = 'Cocok secara terbatas';
    } else {
      decisionLabel = 'Tidak direkomendasikan';
    }
  }

  // 5. Strengths (linked to Evidence IDs)
  const strengths: StrengthItem[] = [
    {
      title: 'Update Sistem Operasi & Keamanan Hingga 6 Tahun',
      description: 'Jaminan pembaruan OS Android 6 generasi dan security patch selama 6 tahun menjaga ponsel aman dan future-proof untuk pemakaian jangka panjang.',
      evidenceIds: ['45hfkSE5DvA-E006', '45hfkSE5DvA-E093', 'iiFusNBRirA-E040', 'lzeD_sBrCB0-E061'],
      impactCategory: 'Software & Longevity'
    },
    {
      title: 'Sertifikasi Ketahanan Air & Debu IP67 + Kaca Victus+ Ganda',
      description: 'Perlindungan fisik mumpuni dengan rating IP67 (tahan rendaman 1m selama 30 menit) serta kaca Gorilla Glass Victus+ pada layar dan bodi belakang.',
      evidenceIds: ['45hfkSE5DvA-E001', '45hfkSE5DvA-E002', '45hfkSE5DvA-E003', 'iiFusNBRirA-E004', 'iiFusNBRirA-E005'],
      impactCategory: 'Durability'
    },
    {
      title: 'Harga Promo Pasar Sangat Menggoda (THR Deal)',
      description: 'Di pasaran dapat diperoleh mulai Rp 3,3 hingga 3,8 jutaan untuk varian 8GB/256GB, menawarkan value sangat kompetitif di kelas menengah.',
      evidenceIds: ['lzeD_sBrCB0-E005', '45hfkSE5DvA-E178'],
      impactCategory: 'Value for Money'
    },
    {
      title: 'Keamanan Hardware Dedicated Samsung Knox Vault',
      description: 'Membawa chip pengaman khusus Knox Vault, Secure Folder, dan Auto-Blocker yang setara dengan fitur keamanan seri flagship Samsung.',
      evidenceIds: ['45hfkSE5DvA-E087', 'iiFusNBRirA-E038', '45hfkSE5DvA-E194'],
      impactCategory: 'Security'
    },
    {
      title: 'Kamera Utama 50MP OIS dengan Stabilitas Video Teruji',
      description: 'Kamera utama menghasilkan foto tajam dan rekaman video 1080p 30fps stabil bebas getar, serta mendukung resolusi hingga 4K 30fps.',
      evidenceIds: ['45hfkSE5DvA-E051', '45hfkSE5DvA-E143', 'iiFusNBRirA-E050', 'iiFusNBRirA-E078'],
      impactCategory: 'Camera'
    }
  ];

  // 6. Tradeoffs & Reductions (linked to Evidence IDs)
  const tradeoffs: TradeoffItem[] = [
    {
      title: 'Desain Layar Waterdrop (Infinity-U Notch) Terasa Usang',
      description: 'Penggunaan poni waterdrop dan bezel bawah yang agak tebal tampak tertinggal dibandingkan pesaing sekelas yang sudah memakai punch-hole modern.',
      scoreDeduction: -0.5,
      evidenceIds: ['45hfkSE5DvA-E046', '45hfkSE5DvA-E179', 'iiFusNBRirA-E011', 'iiFusNBRirA-E012', 'lzeD_sBrCB0-E029'],
      mitigation: 'Layar tetap merupakan Super AMOLED 120Hz yang sangat cerah (1025 nits) dan nyaman untuk konsumsi konten.'
    },
    {
      title: 'Pengisian Daya 25W Cukup Lambat & Tanpa Adaptor di Kotak',
      description: 'Memerlukan waktu sekitar 1 jam 28 menit untuk mengisi penuh 5000 mAh, dan kepala charger harus dibeli terpisah.',
      scoreDeduction: -0.6,
      evidenceIds: ['45hfkSE5DvA-E166', '45hfkSE5DvA-E167', 'lzeD_sBrCB0-E002', 'lzeD_sBrCB0-E021', 'lzeD_sBrCB0-E072'],
      mitigation: 'Baterai sangat awet (hingga 25 jam playback YouTube pada 60Hz), dan fitur Bypass Charging menjaga baterai saat gaming.'
    },
    {
      title: 'EIS Tidak Aktif di Perekaman 4K & 1080p 60fps',
      description: 'Stabilisasi elektronik hanya aktif pada 1080p 30fps; perekaman 4K atau 60fps hanya mengandalkan OIS fisik sehingga masih agak bergoyang.',
      scoreDeduction: -0.2,
      evidenceIds: ['45hfkSE5DvA-E144', '45hfkSE5DvA-E145', 'iiFusNBRirA-E087'],
      mitigation: 'Gunakan mode 1080p 30fps saat merekam sambil bergerak aktif atau gunakan tripod/gimbal untuk 4K.'
    },
    {
      title: 'Konfigurasi Audio Mono (Kembali ke Single Speaker)',
      description: 'Mengalami penurunan dibanding Galaxy A25 sebelumnya yang sudah stereo speaker, meski kualitas audionya masih cukup jernih.',
      scoreDeduction: -0.2,
      evidenceIds: ['45hfkSE5DvA-E025', '45hfkSE5DvA-E181', 'iiFusNBRirA-E027', 'lzeD_sBrCB0-E033'],
      mitigation: 'Dukungan Bluetooth 5.3 dengan codec audio SSC khas Samsung untuk TWS/headphone.'
    }
  ];

  // 7. Decision Reasons (linked to Evidence IDs)
  const decisionReasons: DecisionReasonItem[] = [
    {
      id: 'reason-1',
      title: 'Dukungan Software Terpanjang di Kelas Harganya',
      description: 'Komitmen 6 tahun update sistem operasi Android dan 6 tahun patch keamanan memberikan kepastian masa pakai yang jarang disaingi kompetitor seharga Rp 3-4 juta.',
      evidenceIds: ['45hfkSE5DvA-E006', '45hfkSE5DvA-E093', 'iiFusNBRirA-E040', 'lzeD_sBrCB0-E061'],
      impact: 'positive'
    },
    {
      id: 'reason-2',
      title: 'Ketahanan Fisik Komprehensif (IP67 + Victus+)',
      description: 'Sertifikasi IP67 aman dari insiden air hujan/tumpahan, dipadukan kaca Victus+ ganda depan-belakang.',
      evidenceIds: ['45hfkSE5DvA-E001', '45hfkSE5DvA-E002', '45hfkSE5DvA-E003', 'iiFusNBRirA-E005'],
      impact: 'positive'
    },
    {
      id: 'reason-3',
      title: 'Performa Kencang untuk Harian dan Esports Gaming',
      description: 'Exynos 1380 mampu menjalankan Mobile Legends 90fps, PUBG Mobile 60fps, dan AnTuTu ~608k dengan stabil.',
      evidenceIds: ['45hfkSE5DvA-E107', '45hfkSE5DvA-E118', '45hfkSE5DvA-E121'],
      impact: 'positive'
    },
    {
      id: 'reason-4',
      title: 'Kompromi Estetika Layar dan Kecepatan Charging',
      description: 'Desain poni Infinity-U waterdrop dan charging 25W yang membutuhkan 88 menit merupakan kelemahan utama yang harus diterima pembeli.',
      evidenceIds: ['45hfkSE5DvA-E179', '45hfkSE5DvA-E166', 'iiFusNBRirA-E011', 'lzeD_sBrCB0-E029'],
      impact: 'negative'
    }
  ];

  // 8. Quick Decision Summary
  const quickDecision = {
    recommendedFor: [
      {
        text: 'Pengguna jangka panjang yang mengutamakan dukungan software ekstra lama (Update OS hingga 6 tahun).',
        evidenceIds: ['45hfkSE5DvA-E006', 'iiFusNBRirA-E040', 'lzeD_sBrCB0-E061']
      },
      {
        text: 'Pekerja lapangan, ojek online, atau pengguna aktif yang butuh sertifikasi tahan air & debu IP67.',
        evidenceIds: ['45hfkSE5DvA-E001', '45hfkSE5DvA-E205', 'iiFusNBRirA-E005']
      },
      {
        text: 'Konsumen yang memburu harga promo marketplace di kisaran Rp 3,3 - 3,8 jutaan untuk memori besar 8/256GB.',
        evidenceIds: ['lzeD_sBrCB0-E005', '45hfkSE5DvA-E178']
      },
      {
        text: 'Orang tua atau pengguna yang membutuhkan antarmuka One UI yang bersih, aman, dan mudah dipakai.',
        evidenceIds: ['45hfkSE5DvA-E204', 'iiFusNBRirA-E101']
      }
    ],
    notRecommendedFor: [
      {
        text: 'Pengguna yang mementingkan tampilan layar bezel tipis modern dengan kamera punch-hole kekinian.',
        evidenceIds: ['45hfkSE5DvA-E179', 'iiFusNBRirA-E099', 'iiFusNBRirA-E100']
      },
      {
        text: 'Gamer hardcore yang butuh charging super cepat 67W-120W atau performa kelas flagship tanpa pendingin tambahan.',
        evidenceIds: ['45hfkSE5DvA-E130', '45hfkSE5DvA-E166']
      },
      {
        text: 'Pencinta konten multimedia yang mewajibkan speaker ganda stereo terpasang.',
        evidenceIds: ['45hfkSE5DvA-E181', 'iiFusNBRirA-E027']
      }
    ]
  };

  // 9. Collect all evidence IDs actually used
  const evidenceUsedSet = new Set<string>();
  Object.values(criteriaScores).forEach(cs => cs.evidenceIdsUsed.forEach(id => evidenceUsedSet.add(id)));
  strengths.forEach(s => s.evidenceIds.forEach(id => evidenceUsedSet.add(id)));
  tradeoffs.forEach(t => t.evidenceIds.forEach(id => evidenceUsedSet.add(id)));
  decisionReasons.forEach(dr => dr.evidenceIds.forEach(id => evidenceUsedSet.add(id)));
  quickDecision.recommendedFor.forEach(r => r.evidenceIds.forEach(id => evidenceUsedSet.add(id)));
  quickDecision.notRecommendedFor.forEach(r => r.evidenceIds.forEach(id => evidenceUsedSet.add(id)));

  const evidenceExcludedFormatted = excludedEvidence.map(ex => ({
    evidenceId: ex.evidence.evidence_id,
    reason: ex.reason,
    source: ex.evidence.source
  }));

  return {
    productId: 'samsung-galaxy-a26-5g',
    productName: 'Samsung Galaxy A26 5G',
    overallScore,
    overallScoreExact,
    decisionLabel,
    decisionStatus,
    confidenceLabel: confResult.confidenceLabel,
    coveragePercent: confResult.coveragePercent,
    criteriaScores,
    strengths,
    tradeoffs,
    decisionReasons,
    evidenceUsed: Array.from(evidenceUsedSet),
    evidenceExcluded: evidenceExcludedFormatted,
    unresolvedConflicts: conflicts.filter(c => !c.resolved),
    rulesetVersion: RULESET_VERSION,
    evidenceDatasetVersion: EVIDENCE_DATASET_VERSION,
    generatedAt: new Date().toISOString(),
    quickDecision
  };
}

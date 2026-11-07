/**
 * ============================================================================
 * SIMULADORES INTERACTIVOS — MÓDULO 03: DISEÑO A FLEXIÓN DE VIGAS
 * ============================================================================
 * Simulador 3.1: Diseñador y Analizador Seccional de Vigas Rectangulares
 *                Simplemente y Doblemente Reforzadas (NSR-10 C.10.2, C.10.3,
 *                C.10.5, C.9.3.2 y C.7.6.1).
 * Simulador 3.2: Analizador y Diseñador de Vigas de Sección en T
 *                (NSR-10 C.8.12.2: Caso 1 a <= hf vs. Caso 2 a > hf).
 * ============================================================================
 */

const BAR_CATALOG = {
  3:  { label: 'No. 3 (3/8")',   db: 9.5,  areaCm2: 0.71, mass: 0.559 },
  4:  { label: 'No. 4 (1/2")',   db: 12.7, areaCm2: 1.29, mass: 0.994 },
  5:  { label: 'No. 5 (5/8")',   db: 15.9, areaCm2: 1.99, mass: 1.552 },
  6:  { label: 'No. 6 (3/4")',   db: 19.1, areaCm2: 2.84, mass: 2.235 },
  7:  { label: 'No. 7 (7/8")',   db: 22.2, areaCm2: 3.87, mass: 3.042 },
  8:  { label: 'No. 8 (1")',     db: 25.4, areaCm2: 5.10, mass: 3.973 },
  9:  { label: 'No. 9 (1-1/8")', db: 28.7, areaCm2: 6.45, mass: 5.060 },
  10: { label: 'No. 10 (1-1/4")',db: 32.3, areaCm2: 8.19, mass: 6.404 },
  11: { label: 'No. 11 (1-3/8")',db: 35.8, areaCm2: 10.07, mass: 7.907 }
};

function calcBeta1(fc) {
  if (fc <= 28) return 0.85;
  if (fc >= 56) return 0.65;
  return Math.max(0.65, 0.85 - (0.05 * (fc - 28.0)) / 7.0);
}

function calcPhiFlexion(et, ey) {
  if (et >= 0.005) return 0.90;
  if (et <= ey) return 0.65;
  return 0.65 + 0.25 * ((et - ey) / (0.005 - ey));
}

function getThemePalette() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    isDark,
    bgCanvas: isDark ? '#0B1120' : '#F8FAFC',
    panelBg: isDark ? '#111C33' : '#FFFFFF',
    gridLine: isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(148, 163, 184, 0.22)',
    concreteFill: isDark ? '#1E293B' : '#E2E8F0',
    concreteStroke: isDark ? '#94A3B8' : '#334155',
    stirrupStroke: isDark ? '#38BDF8' : '#0284C7',
    rebarTension: isDark ? '#FBBF24' : '#D97706',
    rebarComp: isDark ? '#34D399' : '#059669',
    whitneyFill: isDark ? 'rgba(244, 63, 94, 0.28)' : 'rgba(225, 29, 72, 0.18)',
    whitneyStroke: isDark ? '#FB7185' : '#E11D48',
    flangeFill: isDark ? 'rgba(56, 189, 248, 0.28)' : 'rgba(2, 132, 199, 0.18)',
    flangeStroke: isDark ? '#38BDF8' : '#0284C7',
    strainLine: isDark ? '#60A5FA' : '#1D4ED8',
    neutralAxis: isDark ? '#FBBF24' : '#D97706',
    textMain: isDark ? '#F1F5F9' : '#0F172A',
    textSub: isDark ? '#94A3B8' : '#475569'
  };
}

let sim31Mode = 'design'; // 'design' | 'review'

function setSim31Mode(mode) {
  sim31Mode = mode;
  const btnDesign = document.getElementById('sim31-btn-mode-design');
  const btnReview = document.getElementById('sim31-btn-mode-review');
  const panelDesign = document.getElementById('sim31-panel-design');
  const panelReview = document.getElementById('sim31-panel-review');
  const modeBadge = document.getElementById('sim31-mode-badge');
  const subtitle = document.getElementById('sim31-box-subtitle');
  const lblMu = document.getElementById('lbl-sim31-mu');

  if (mode === 'review') {
    if (btnDesign) btnDesign.classList.remove('active');
    if (btnReview) btnReview.classList.add('active');
    if (panelDesign) panelDesign.style.display = 'none';
    if (panelReview) panelReview.style.display = 'flex';
    if (modeBadge) {
      modeBadge.textContent = '🔍 Modo Revisión';
      modeBadge.style.background = '#059669';
    }
    if (subtitle) {
      subtitle.textContent = 'Fija el refuerzo superior e inferior y varía Mu para comprobar la capacidad resistente φMn, el ratio D/C y el tacómetro de ductilidad εt.';
    }
    if (lblMu) {
      lblMu.textContent = 'Momento Solicitante Mu (Demanda)';
    }
  } else {
    if (btnDesign) btnDesign.classList.add('active');
    if (btnReview) btnReview.classList.remove('active');
    if (panelDesign) panelDesign.style.display = 'flex';
    if (panelReview) panelReview.style.display = 'none';
    if (modeBadge) {
      modeBadge.textContent = '📐 Modo Diseño';
      modeBadge.style.background = '#2563EB';
    }
    if (subtitle) {
      subtitle.textContent = 'Incrementa Mu por encima de Mu1,máx para activar automáticamente la superposición de Viga Doblemente Reforzada (A\'s y As) y verificar si ε\'s ≥ εy.';
    }
    if (lblMu) {
      lblMu.textContent = 'Momento Mayorado Mu (Diseño)';
    }
  }
  updateSim31();
}
window.setSim31Mode = setSim31Mode;

/**
 * ============================================================================
 * SIMULADOR 3.1: DISEÑADOR Y ANALIZADOR SECCIONAL DE VIGAS RECTANGULARES
 *                SIMPLEMENTE Y DOBLEMENTE REFORZADAS
 * ============================================================================
 */
function updateSim31() {
  const muInput = document.getElementById('sim31-mu');
  if (!muInput) return;

  const Mu = parseFloat(muInput.value);                 // kN·m
  const bw = parseFloat(document.getElementById('sim31-bw').value); // cm
  const h  = parseFloat(document.getElementById('sim31-h').value);  // cm
  const rec = parseFloat(document.getElementById('sim31-rec').value); // cm (h - d)
  const dp  = parseFloat(document.getElementById('sim31-dp').value);  // cm (d')
  const fc  = parseFloat(document.getElementById('sim31-fc').value);  // MPa
  const fy  = parseFloat(document.getElementById('sim31-fy').value);  // MPa

  // Actualizar etiquetas de controles
  document.getElementById('val-sim31-mu').textContent = `${Mu.toFixed(0)} kN·m`;
  document.getElementById('val-sim31-bw').textContent = `${bw.toFixed(0)} cm`;
  document.getElementById('val-sim31-h').textContent  = `${h.toFixed(0)} cm`;
  document.getElementById('val-sim31-rec').textContent = `${rec.toFixed(1)} cm`;
  document.getElementById('val-sim31-dp').textContent  = `${dp.toFixed(1)} cm`;

  const Es = 200000.0; // MPa
  const ecu = 0.003;
  const ey = fy / Es;
  const beta1 = calcBeta1(fc);
  const d_nominal = Math.max(h - rec, 12.0); // cm

  // Cuantías características NSR-10
  const rhoMin1 = (0.25 * Math.sqrt(fc)) / fy;
  const rhoMin2 = 1.4 / fy;
  const rhoMin = Math.max(rhoMin1, rhoMin2);
  const AsMin = rhoMin * bw * d_nominal; // cm2

  const rhoB = 0.85 * beta1 * (fc / fy) * (600.0 / (600.0 + fy));
  const rhoMax005 = rhoB * ((0.003 + ey) / 0.008); // Controlada por tracción (et = 0.005, phi = 0.90)
  const rhoMax004 = rhoB * ((0.003 + ey) / 0.007); // Límite absoluto flexión (et = 0.004, phi = 0.817)

  // Capacidad máxima como sección simplemente reforzada controlada por tracción (et = 0.005, phi = 0.90)
  const As1_max = rhoMax005 * bw * d_nominal; // cm2
  const a1_max  = (As1_max * fy) / (0.85 * fc * bw); // cm
  const c1_max  = a1_max / beta1; // cm
  const Mn1_max = (As1_max * 100.0 * fy * (d_nominal * 10.0 - (a1_max * 10.0) / 2.0)) / 1e6; // kN·m
  const Mu1_max = 0.90 * Mn1_max; // kN·m

  const rLibreMm = 40.0; // Recubrimiento libre C.7.7.1
  const dbEstriboMm = 9.5; // No. 3
  const bwMm = bw * 10.0;
  const dp_mm = dp * 10.0;
  const b_mm = bwMm;

  let isDoubly = false;
  let regimeTitle = '';
  let regimeClass = 'status-ok';
  let barInfo = null;
  let barCompInfo = null;
  let nBarsTension = 0;
  let As_prov = 0; // cm2
  let nBarsComp = 0;
  let AsComp_prov = 0; // cm2
  let Rn_MPa = 0;
  let As_req = 0;
  let As1_req = 0;
  let As2_req = 0;
  let AsComp_req = 0;
  let rhoReq = 0;
  let d = d_nominal;
  let dt = d_nominal;

  if (sim31Mode === 'design') {
    // =========================================================================
    // MODO DISEÑO (CÁLCULO AUTOMÁTICO DE ACERO PARA SUPLIR Mu)
    // =========================================================================
    const barNo = parseInt(document.getElementById('sim31-bar').value, 10);
    const barCompNo = parseInt(document.getElementById('sim31-bar-comp').value, 10);
    barInfo = BAR_CATALOG[barNo] || BAR_CATALOG[8];
    barCompInfo = BAR_CATALOG[barCompNo] || BAR_CATALOG[5];

    const phiDesign = 0.90;
    const bw_m = bw / 100.0;
    const d_m  = d_nominal / 100.0;
    Rn_MPa = (Mu / 1000.0) / (phiDesign * bw_m * d_m * d_m); // MPa

    const radicand = 1.0 - (2.0 * Rn_MPa) / (0.85 * fc);

    if (Mu <= Mu1_max && radicand > 0) {
      // SECCIÓN SIMPLEMENTE REFORZADA
      isDoubly = false;
      const rhoCalc = ((0.85 * fc) / fy) * (1.0 - Math.sqrt(radicand));
      if (rhoCalc < rhoMin) {
        rhoReq = rhoMin;
        regimeTitle = 'Viga Simplemente Reforzada — Gobernada por Cuantía Mínima (C.10.5.1)';
        regimeClass = 'status-ok';
      } else {
        rhoReq = rhoCalc;
        regimeTitle = 'Viga Simplemente Reforzada — Controlada por Tracción (εt ≥ 0.005, φ = 0.90)';
        regimeClass = 'status-ok';
      }
      As1_req = rhoReq * bw * d_nominal;
      As2_req = 0.0;
      As_req = As1_req;
      AsComp_req = 0.0;
    } else {
      // SECCIÓN DOBLEMENTE REFORZADA: Superposición
      isDoubly = true;
      As1_req = As1_max;
      const Mu2 = Math.max(0, Mu - Mu1_max);
      As2_req = (Mu2 * 1e6) / (phiDesign * fy * ((d_nominal - dp) * 10.0) * 100.0);
      As_req = As1_req + As2_req;
      rhoReq = As_req / (bw * d_nominal);

      const epsCompDesign = ecu * (1.0 - dp / c1_max);
      if (epsCompDesign >= ey) {
        AsComp_req = As2_req;
        regimeTitle = 'Viga Doblemente Reforzada — Acero a Compresión FLUYE (ε\'s ≥ εy, f\'s = fy)';
        regimeClass = 'status-warn';
      } else {
        const fsCompDesign = Math.max(50.0, Es * epsCompDesign);
        AsComp_req = As2_req * (fy / fsCompDesign);
        regimeTitle = 'Viga Doblemente Reforzada — Acero a Compresión NO Fluye (ε\'s < εy, f\'s < fy)';
        regimeClass = 'status-warn';
      }
    }

    nBarsTension = Math.max(2, Math.ceil(As_req / barInfo.areaCm2));
    As_prov = nBarsTension * barInfo.areaCm2;

    nBarsComp = isDoubly
      ? Math.max(2, Math.ceil(AsComp_req / barCompInfo.areaCm2))
      : 2;
    AsComp_prov = isDoubly ? (nBarsComp * barCompInfo.areaCm2) : 0.0;

  } else {
    // =========================================================================
    // MODO REVISIÓN (ANÁLISIS CON ARMADURA FIJA DEFINIDA POR EL USUARIO)
    // =========================================================================
    const revNbarsEl = document.getElementById('sim31-rev-nbars');
    const revBarEl = document.getElementById('sim31-rev-bar');
    const revHasCompEl = document.getElementById('sim31-rev-has-comp');
    const revNbarsCompEl = document.getElementById('sim31-rev-nbars-comp');
    const revBarCompEl = document.getElementById('sim31-rev-bar-comp');

    nBarsTension = revNbarsEl ? parseInt(revNbarsEl.value, 10) : 5;
    const barNo = revBarEl ? parseInt(revBarEl.value, 10) : 8;
    barInfo = BAR_CATALOG[barNo] || BAR_CATALOG[8];
    As_prov = nBarsTension * barInfo.areaCm2;

    const hasComp = revHasCompEl ? revHasCompEl.checked : false;
    const nBarsCompUser = revNbarsCompEl ? parseInt(revNbarsCompEl.value, 10) : 2;
    const barCompNo = revBarCompEl ? parseInt(revBarCompEl.value, 10) : 5;
    barCompInfo = BAR_CATALOG[barCompNo] || BAR_CATALOG[5];

    isDoubly = hasComp;
    nBarsComp = hasComp ? nBarsCompUser : 2;
    AsComp_prov = hasComp ? (nBarsCompUser * barCompInfo.areaCm2) : 0.0;

    // Actualizar etiquetas de valores en el panel de revisión
    const lblNbars = document.getElementById('val-sim31-rev-nbars');
    if (lblNbars) lblNbars.textContent = nBarsTension;
    const badgeAs = document.getElementById('val-sim31-rev-as');
    if (badgeAs) badgeAs.textContent = `${nBarsTension} ${barInfo.label} = ${As_prov.toFixed(2)} cm²`;

    const compDetails = document.getElementById('sim31-rev-comp-details');
    const compNote = document.getElementById('sim31-rev-comp-inactive-note');
    if (compDetails) compDetails.style.display = hasComp ? 'grid' : 'none';
    if (compNote) compNote.style.display = hasComp ? 'none' : 'block';

    const lblNbarsComp = document.getElementById('val-sim31-rev-nbars-comp');
    if (lblNbarsComp) lblNbarsComp.textContent = nBarsCompUser;
    const badgeAsComp = document.getElementById('val-sim31-rev-ascomp');
    if (badgeAsComp) {
      badgeAsComp.textContent = hasComp
        ? `${nBarsCompUser} ${barCompInfo.label} = ${AsComp_prov.toFixed(2)} cm²`
        : 'Sin armadura resistente';
    }

    As_req = As_prov;
    AsComp_req = AsComp_prov;
  }

  // Organización de barras a tracción en capas (C.7.6.1)
  const sMinMm = Math.max(barInfo.db, 25.4);
  const maxBarsPerLayer = Math.max(2, Math.floor((bwMm - 2 * rLibreMm - 2 * dbEstriboMm + sMinMm) / (barInfo.db + sMinMm)));
  const nLayers = Math.ceil(nBarsTension / maxBarsPerLayer);
  const barsLayer1 = Math.min(nBarsTension, maxBarsPerLayer);
  const barsLayer2 = Math.max(0, nBarsTension - barsLayer1);
  const bMin1FilaCm = (2 * rLibreMm + 2 * dbEstriboMm + nBarsTension * barInfo.db + (nBarsTension - 1) * sMinMm) / 10.0;

  // Distancias al centroide d y fibra extrema dt si hay múltiples capas
  const d1_mm = (h - rec) * 10.0;
  const sepCapasMm = Math.max(25.4, barInfo.db);
  const d2_mm = d1_mm - sepCapasMm;
  const d_mm = nLayers > 1
    ? (barsLayer1 * d1_mm + barsLayer2 * d2_mm) / nBarsTension
    : d1_mm;
  const dt_mm = d1_mm;
  d = d_mm / 10.0;
  dt = dt_mm / 10.0;

  const rhoReal = As_prov / (bw * d);

  // =========================================================================
  // RESOLUCIÓN EXACTA POR EQUILIBRIO Y COMPATIBILIDAD DE DEFORMACIONES
  // =========================================================================
  const As_mm2 = As_prov * 100.0;
  const AsComp_mm2 = AsComp_prov * 100.0;

  let c_rev = 0; // mm
  let a_rev = 0; // mm
  let epsComp_rev = 0;
  let fsComp_rev = 0;
  let fsTen_rev = fy;

  if (!isDoubly || AsComp_mm2 <= 0) {
    // Viga Simplemente Reforzada
    a_rev = (As_mm2 * fy) / (0.85 * fc * b_mm);
    c_rev = a_rev / beta1;
    let et_tent = ecu * ((dt_mm - c_rev) / c_rev);

    if (et_tent < ey) {
      // Sección sobre-reforzada: El acero a tracción no alcanza la fluencia
      const A_q = 0.85 * fc * b_mm * beta1;
      const B_q = ecu * Es * As_mm2;
      const C_q = -ecu * Es * As_mm2 * d_mm;
      c_rev = (-B_q + Math.sqrt(B_q * B_q - 4.0 * A_q * C_q)) / (2.0 * A_q);
      a_rev = beta1 * c_rev;
      const epsTen_rev = ecu * ((d_mm - c_rev) / c_rev);
      fsTen_rev = Math.min(fy, Math.max(0, epsTen_rev * Es));
    } else {
      fsTen_rev = fy;
    }
    epsComp_rev = c_rev > dp_mm ? ecu * ((c_rev - dp_mm) / c_rev) : 0;
    fsComp_rev = 0;
  } else {
    // Viga Doblemente Reforzada
    const A_quad = 0.85 * fc * b_mm * beta1;
    const B_quad = AsComp_mm2 * (ecu * Es - 0.85 * fc) - As_mm2 * fy;
    const C_quad = -AsComp_mm2 * ecu * Es * dp_mm;
    c_rev = (-B_quad + Math.sqrt(B_quad * B_quad - 4.0 * A_quad * C_quad)) / (2.0 * A_quad);
    epsComp_rev = ecu * ((c_rev - dp_mm) / c_rev);

    if (epsComp_rev >= ey) {
      fsComp_rev = fy;
      a_rev = (As_mm2 * fy - AsComp_mm2 * (fy - 0.85 * fc)) / (0.85 * fc * b_mm);
      c_rev = a_rev / beta1;
      epsComp_rev = ecu * ((c_rev - dp_mm) / c_rev);
    } else {
      a_rev = beta1 * c_rev;
      fsComp_rev = Math.max(0, epsComp_rev * Es);
    }

    let et_tent = ecu * ((dt_mm - c_rev) / c_rev);
    if (et_tent < ey) {
      const epsTen_rev = ecu * ((d_mm - c_rev) / c_rev);
      fsTen_rev = Math.min(fy, Math.max(0, epsTen_rev * Es));
    } else {
      fsTen_rev = fy;
    }
  }

  const et_rev = ecu * ((dt_mm - c_rev) / c_rev);
  const phi_rev = calcPhiFlexion(et_rev, ey);

  // Fuerzas internas y Momento Nominal Mn (kN·m)
  const Cc_kN = (0.85 * fc * b_mm * a_rev) / 1000.0;
  const Cs_kN = isDoubly ? (AsComp_mm2 * (fsComp_rev - 0.85 * fc)) / 1000.0 : 0.0;
  const T_kN  = (As_mm2 * fsTen_rev) / 1000.0;

  const Mn_kNm = isDoubly
    ? (Cc_kN * (d_mm - a_rev / 2.0) + Cs_kN * (d_mm - dp_mm)) / 1000.0
    : (T_kN * (d_mm - a_rev / 2.0)) / 1000.0;
  const phiMn_kNm = phi_rev * Mn_kNm;
  const dcRatio = Mu / phiMn_kNm;

  // Actualizar banner de estado
  const statusBanner = document.getElementById('sim31-status-banner');
  if (sim31Mode === 'review') {
    if (dcRatio <= 1.0) {
      if (et_rev >= 0.005) {
        regimeClass = 'status-ok';
        regimeTitle = `✓ SECCIÓN SEGURA (D/C = ${dcRatio.toFixed(2)}) — DÚCTIL / TRACCIÓN CONTROLADA (ϕ = 0.90)`;
      } else if (et_rev >= 0.004) {
        regimeClass = 'status-warn';
        regimeTitle = `⚠️ SECCIÓN EN TRANSICIÓN (D/C = ${dcRatio.toFixed(2)}) — FACTOR φ = ${phi_rev.toFixed(3)}`;
      } else {
        regimeClass = 'status-danger';
        regimeTitle = `🚫 ¡SECCIÓN FRÁGIL! (εt = ${et_rev.toFixed(4)} < 0.004) — PROHIBIDA EN FLEXIÓN (NSR-10 C.10.3.5)`;
      }
    } else {
      regimeClass = 'status-danger';
      regimeTitle = `❌ FALLA POR CAPACIDAD: Mu (${Mu.toFixed(0)} kN·m) > φMn (${phiMn_kNm.toFixed(1)} kN·m) — SOBRECARGA ${((dcRatio - 1) * 100).toFixed(0)}% (D/C = ${dcRatio.toFixed(2)})`;
    }
  }

  if (statusBanner) {
    statusBanner.className = `status-pill ${regimeClass}`;
    statusBanner.textContent = regimeTitle;
  }

  // Actualizar títulos y valores de tarjetas de resultados
  const lblRn = document.getElementById('lbl-sim31-rn');
  const lblMu1max = document.getElementById('lbl-sim31-mu1max');
  const lblRhomin = document.getElementById('lbl-sim31-rhomin');
  const lblRhomax = document.getElementById('lbl-sim31-rhomax');
  const lblAsreq = document.getElementById('lbl-sim31-asreq');
  const lblAscomp = document.getElementById('lbl-sim31-ascomp');
  const lblBars = document.getElementById('lbl-sim31-bars');
  const lblBmin = document.getElementById('lbl-sim31-bmin');
  const lblStrains = document.getElementById('lbl-sim31-strains');
  const lblPhimn = document.getElementById('lbl-sim31-phimn');

  if (sim31Mode === 'review') {
    if (lblRn) lblRn.textContent = 'Demanda vs Capacidad (D/C)';
    document.getElementById('out-sim31-rn').textContent = `D/C = ${dcRatio.toFixed(2)} (${(dcRatio * 100).toFixed(0)}% solicitada)`;

    if (lblMu1max) lblMu1max.textContent = 'Momento Nominal Mn y Reducción φ';
    document.getElementById('out-sim31-mu1max').textContent = `Mn = ${Mn_kNm.toFixed(1)} kN·m (φ = ${phi_rev.toFixed(3)})`;

    if (lblRhomin) lblRhomin.textContent = 'Cuantía Real a Tracción vs ρ_mín';
    document.getElementById('out-sim31-rhomin').textContent = `${(rhoReal * 100).toFixed(3)} % ${rhoReal >= rhoMin ? '✓ ≥ ρ_mín' : '⚠️ < ρ_mín (C.10.5.1)'}`;

    if (lblRhomax) lblRhomax.textContent = 'Cuantía vs Límites de Ductilidad';
    document.getElementById('out-sim31-rhomax').textContent = `${(rhoReal * 100).toFixed(3)}% | ${(rhoMax005 * 100).toFixed(3)}% (0.005) | ${(rhoMax004 * 100).toFixed(3)}% (0.004)`;

    if (lblAsreq) lblAsreq.textContent = 'Acero a Tracción Provisto As';
    document.getElementById('out-sim31-asreq').textContent = `${As_prov.toFixed(2)} cm² (${nBarsTension} ${barInfo.label})`;

    if (lblAscomp) lblAscomp.textContent = 'Acero a Compresión Provisto A\'s';
    document.getElementById('out-sim31-ascomp').textContent = isDoubly
      ? `${AsComp_prov.toFixed(2)} cm² (${nBarsComp} ${barCompInfo.label}, f's=${fsComp_rev.toFixed(0)} MPa)`
      : 'Sin armadura a compresión resistente';

    if (lblBars) lblBars.textContent = 'Disposición de Barras en Tracción';
    document.getElementById('out-sim31-bars').textContent = `${nBarsTension} ${barInfo.label} (${nLayers === 1 ? '1 capa' : `2 capas: ${barsLayer1}+${barsLayer2}`})`;

    if (lblBmin) lblBmin.textContent = 'Chequeo Ancho Mínimo b_mín (C.7.6.1)';
    document.getElementById('out-sim31-bmin').textContent = `b_mín(1 fila) = ${bMin1FilaCm.toFixed(1)} cm ${bw >= bMin1FilaCm ? '✓ Cabe en 1 fila' : `→ Requiere ${nLayers} capas`}`;

    if (lblStrains) lblStrains.textContent = 'Compatibilidad (c, a, εt, φ)';
    document.getElementById('out-sim31-strains').textContent = `c = ${(c_rev / 10).toFixed(2)} cm | a = ${(a_rev / 10).toFixed(2)} cm | εt = ${et_rev.toFixed(5)} | φ = ${phi_rev.toFixed(3)}`;

    if (lblPhimn) lblPhimn.textContent = 'Verificación de Resistencia (φMn ≥ Mu)';
    document.getElementById('out-sim31-phimn').textContent = `φMn = ${phiMn_kNm.toFixed(1)} kN·m ${phiMn_kNm >= Mu ? '≥' : '<'} Mu = ${Mu.toFixed(0)} kN·m (D/C = ${dcRatio.toFixed(2)})`;
  } else {
    // Restaurar títulos de diseño
    if (lblRn) lblRn.textContent = 'Parámetro Rn = Mu / (φ·b·d²)';
    document.getElementById('out-sim31-rn').textContent = `${Rn_MPa.toFixed(2)} MPa`;

    if (lblMu1max) lblMu1max.textContent = 'Límite Simple Mu1,máx (εt = 0.005)';
    document.getElementById('out-sim31-mu1max').textContent = `${Mu1_max.toFixed(1)} kN·m`;

    if (lblRhomin) lblRhomin.textContent = 'Cuantía Mínima ρ_mín (C.10.5.1)';
    document.getElementById('out-sim31-rhomin').textContent = `${(rhoMin * 100).toFixed(3)} % (${AsMin.toFixed(2)} cm²)`;

    if (lblRhomax) lblRhomax.textContent = 'Cuantías Máximas (ρ_trac | ρ_max)';
    document.getElementById('out-sim31-rhomax').textContent = `${(rhoMax005 * 100).toFixed(3)} % (εt=0.005) | ${(rhoMax004 * 100).toFixed(3)} % (εt=0.004)`;

    if (lblAsreq) lblAsreq.textContent = 'Acero en Tracción Requerido As,req';
    document.getElementById('out-sim31-asreq').textContent = isDoubly
      ? `${As_req.toFixed(2)} cm² (As1=${As1_req.toFixed(2)} + As2=${As2_req.toFixed(2)})`
      : `${As_req.toFixed(2)} cm² (ρ=${(rhoReq * 100).toFixed(3)} %)`;

    if (lblAscomp) lblAscomp.textContent = 'Acero a Compresión Requerido A\'s';
    document.getElementById('out-sim31-ascomp').textContent = isDoubly
      ? `${AsComp_req.toFixed(2)} cm² → ${nBarsComp} ${barCompInfo.label} (${AsComp_prov.toFixed(2)} cm², f's=${fsComp_rev.toFixed(0)} MPa)`
      : `No requerido por cálculo (2 ${barCompInfo.label} porta-estribos)`;

    if (lblBars) lblBars.textContent = 'Despiece Comercial en Tracción';
    document.getElementById('out-sim31-bars').textContent = `${nBarsTension} ${barInfo.label} → As,sum = ${As_prov.toFixed(2)} cm² (${nLayers === 1 ? '1 capa' : `2 capas: ${barsLayer1}+${barsLayer2}`})`;

    if (lblBmin) lblBmin.textContent = 'Chequeo Ancho Mínimo b_mín (C.7.6.1)';
    document.getElementById('out-sim31-bmin').textContent = `b_mín(1 fila) = ${bMin1FilaCm.toFixed(1)} cm ${bw >= bMin1FilaCm ? '✓ Cabe en 1 fila' : `→ Se arma en ${nLayers} capas (C.7.6.2)`}`;

    if (lblStrains) lblStrains.textContent = 'Compatibilidad (c, a, εt, φ)';
    document.getElementById('out-sim31-strains').textContent = `c = ${(c_rev / 10).toFixed(2)} cm | a = ${(a_rev / 10).toFixed(2)} cm | εt = ${et_rev.toFixed(5)} | φ = ${phi_rev.toFixed(3)}`;

    if (lblPhimn) lblPhimn.textContent = 'Verificación de Resistencia (φMn ≥ Mu)';
    document.getElementById('out-sim31-phimn').textContent = `φMn = ${phiMn_kNm.toFixed(1)} kN·m ≥ Mu = ${Mu.toFixed(0)} kN·m (D/C = ${dcRatio.toFixed(2)})`;
  }

  // Actualizar Tacómetro Dinámico de Ductilidad y Estado Límite (NSR-10 C.9.3.2 / C.10.3.5)
  const tachoNeedle = document.getElementById('sim31-tacho-needle');
  const tachoValEt = document.getElementById('sim31-tacho-val-et');
  const tachoValPhi = document.getElementById('sim31-tacho-val-phi');
  const tachoValState = document.getElementById('sim31-tacho-val-state');
  const tachoBadge = document.getElementById('sim31-tacho-badge');

  if (tachoNeedle) {
    const tachoPct = Math.min(98, Math.max(2, (et_rev / 0.010) * 100));
    tachoNeedle.style.left = `${tachoPct.toFixed(1)}%`;

    if (tachoValEt) tachoValEt.textContent = et_rev.toFixed(4);
    if (tachoValPhi) tachoValPhi.textContent = `ϕ = ${phi_rev.toFixed(3)}`;

    if (et_rev >= 0.005) {
      if (tachoValState) {
        tachoValState.textContent = 'Dúctil / Controlada por Tracción';
        tachoValState.style.color = '#059669';
      }
      if (tachoBadge) {
        tachoBadge.className = 'status-pill status-ok';
        tachoBadge.textContent = 'Dúctil — Tracción Controlada (ϕ = 0.90)';
      }
    } else if (et_rev >= 0.004) {
      if (tachoValState) {
        tachoValState.textContent = 'Transición (Factor ϕ castigado)';
        tachoValState.style.color = '#D97706';
      }
      if (tachoBadge) {
        tachoBadge.className = 'status-pill status-warn';
        tachoBadge.textContent = `Transición (0.004 ≤ εt < 0.005, ϕ = ${phi_rev.toFixed(3)})`;
      }
    } else {
      if (tachoValState) {
        tachoValState.textContent = '¡PROHIBIDA EN FLEXIÓN! (εt < 0.004)';
        tachoValState.style.color = '#DC2626';
      }
      if (tachoBadge) {
        tachoBadge.className = 'status-pill status-danger';
        tachoBadge.textContent = '¡PROHIBIDA! εt < 0.004 (NSR-10 C.10.3.5)';
      }
    }
  }

  drawSim31Canvas({
    bw, h, d, dp, dt,
    c: c_rev / 10.0, a: a_rev / 10.0,
    et: et_rev, epsComp: epsComp_rev, ey,
    nBarsTension, barsLayer1, barsLayer2, barInfo,
    isDoubly, nBarsComp, barCompInfo,
    Cc_kN, Cs_kN, T_kN, phiMn_kNm, Mu, fc, fy, fsComp_rev
  });
}

function drawSim31Canvas(state) {
  const canvas = document.getElementById('canvas-sim31');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const parentW = canvas.parentElement ? canvas.parentElement.clientWidth : 720;
  const cssW = Math.max(500, rect.width > 200 ? rect.width : (parentW > 40 ? parentW - 32 : 720));
  const cssH = 410;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.height = `${cssH}px`;
  ctx.save();
  ctx.scale(dpr, dpr);

  const pal = getThemePalette();
  ctx.fillStyle = pal.bgCanvas;
  ctx.fillRect(0, 0, cssW, cssH);

  // Tres zonas dinámicamente distribuidas según el ancho del canvas:
  // 1) Sección Transversal (centro en col1X)
  // 2) Diagrama de Deformaciones de Bernoulli (eje en col2X)
  // 3) Bloque de Whitney y Fuerzas Internas (eje en col3X)
  const col1X = Math.round(cssW * 0.18);
  const col2X = Math.round(cssW * 0.50);
  const col3X = Math.round(cssW * 0.79);

  const topY = 60;
  const botY = cssH - 48;
  const drawH = botY - topY;
  const scaleY = drawH / state.h; // px por cm en vertical
  const maxSecW = Math.min(140, cssW * 0.22);
  const scaleX = Math.min(scaleY, maxSecW / state.bw);
  const secW = state.bw * scaleX;
  const secX = col1X - secW / 2;

  // Títulos de columnas
  ctx.fillStyle = pal.textMain;
  ctx.font = '700 12px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('1. SECCIÓN TRANSVERSAL', col1X, 26);
  ctx.fillText('2. COMPATIBILIDAD (ε)', col2X, 26);
  ctx.fillText('3. BLOQUE WHITNEY Y PAR INTERNO', col3X, 26);

  ctx.fillStyle = pal.textSub;
  ctx.font = '500 11px JetBrains Mono, monospace';
  ctx.fillText(`b=${state.bw} cm × h=${state.h} cm`, col1X, 43);
  ctx.fillText(`εcu=0.003 | εt=${state.et.toFixed(4)}`, col2X, 43);
  ctx.fillText(`φMn = ${state.phiMn_kNm.toFixed(1)} kN·m`, col3X, 43);

  // --- 1. DIBUJO DE LA SECCIÓN TRANSVERSAL ---
  ctx.fillStyle = pal.concreteFill;
  ctx.strokeStyle = pal.concreteStroke;
  ctx.lineWidth = 2;
  ctx.fillRect(secX, topY, secW, drawH);
  ctx.strokeRect(secX, topY, secW, drawH);

  // Sombreado de la zona en compresión (a) en la sección
  const aPx = Math.min(drawH, state.a * scaleY);
  const cPx = Math.min(drawH, state.c * scaleY);
  ctx.fillStyle = pal.whitneyFill;
  ctx.fillRect(secX + 1, topY + 1, secW - 2, Math.max(0, aPx - 1));

  // Estribo No. 3
  const padStirrup = Math.max(8, 4.0 * scaleX);
  ctx.strokeStyle = pal.stirrupStroke;
  ctx.lineWidth = 1.8;
  ctx.strokeRect(secX + padStirrup, topY + padStirrup, secW - 2 * padStirrup, drawH - 2 * padStirrup);

  // Barras superiores (compresión o porta-estribos)
  const yComp = topY + state.dp * scaleY;
  const rCompPx = Math.max(3.5, (state.barCompInfo.db / 20.0) * scaleX * 1.15);
  ctx.fillStyle = state.isDoubly ? pal.rebarComp : pal.textSub;
  for (let i = 0; i < state.nBarsComp; i++) {
    const t = state.nBarsComp === 1 ? 0.5 : i / (state.nBarsComp - 1);
    const bx = (secX + padStirrup + 6) + t * (secW - 2 * padStirrup - 12);
    ctx.beginPath();
    ctx.arc(bx, yComp, rCompPx, 0, Math.PI * 2);
    ctx.fill();
  }

  // Barras inferiores en tracción (1 o 2 capas)
  const rTenPx = Math.max(4.2, (state.barInfo.db / 20.0) * scaleX * 1.15);
  const yLayer1 = topY + state.dt * scaleY;
  const yLayer2 = yLayer1 - Math.max(12, 4.5 * scaleY);
  ctx.fillStyle = pal.rebarTension;

  for (let i = 0; i < state.barsLayer1; i++) {
    const t = state.barsLayer1 === 1 ? 0.5 : i / (state.barsLayer1 - 1);
    const bx = (secX + padStirrup + 6) + t * (secW - 2 * padStirrup - 12);
    ctx.beginPath();
    ctx.arc(bx, yLayer1, rTenPx, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < state.barsLayer2; i++) {
    const t = state.barsLayer2 === 1 ? 0.5 : i / (state.barsLayer2 - 1);
    const bx = (secX + padStirrup + 6) + t * (secW - 2 * padStirrup - 12);
    ctx.beginPath();
    ctx.arc(bx, yLayer2, rTenPx, 0, Math.PI * 2);
    ctx.fill();
  }

  // Línea punteada del Eje Neutro (E.N.) a través de los 3 diagramas
  const yEN = topY + cPx;
  ctx.save();
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = pal.neutralAxis;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(secX - 12, yEN);
  ctx.lineTo(cssW - 24, yEN);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = pal.neutralAxis;
  ctx.font = '700 10.5px JetBrains Mono, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`E.N. (c=${state.c.toFixed(1)} cm)`, secX + 4, Math.max(topY + 14, yEN - 5));

  // --- 2. DIAGRAMA DE DEFORMACIONES UNITARIAS DE BERNOULLI ---
  const axisStrainX = 375;
  ctx.strokeStyle = pal.concreteStroke;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(axisStrainX, topY);
  ctx.lineTo(axisStrainX, botY);
  ctx.stroke();

  const ecuPx = 56; // ancho para 0.003
  const etClamped = Math.min(state.et, 0.014);
  const etPx = Math.min(115, (etClamped / 0.003) * ecuPx);

  // Triángulo superior (compresión) e inferior (tracción)
  ctx.fillStyle = 'rgba(59, 130, 246, 0.14)';
  ctx.beginPath();
  ctx.moveTo(axisStrainX, topY);
  ctx.lineTo(axisStrainX + ecuPx, topY);
  ctx.lineTo(axisStrainX, yEN);
  ctx.lineTo(axisStrainX - etPx, yLayer1);
  ctx.lineTo(axisStrainX, yLayer1);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = pal.strainLine;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(axisStrainX, topY);
  ctx.lineTo(axisStrainX + ecuPx, topY);
  ctx.lineTo(axisStrainX - etPx, yLayer1);
  ctx.lineTo(axisStrainX, yLayer1);
  ctx.stroke();

  // Vector ε's si hay acero a compresión
  if (state.isDoubly && yComp < yEN) {
    const epsCompPx = (state.epsComp / 0.003) * ecuPx;
    ctx.strokeStyle = pal.rebarComp;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(axisStrainX, yComp);
    ctx.lineTo(axisStrainX + epsCompPx, yComp);
    ctx.stroke();
    ctx.fillStyle = pal.rebarComp;
    ctx.font = '600 10px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`ε's=${state.epsComp.toFixed(4)}`, axisStrainX + epsCompPx + 4, yComp + 4);
  }

  ctx.fillStyle = pal.textMain;
  ctx.font = '600 10.5px JetBrains Mono, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('εcu=0.003', axisStrainX + ecuPx + 4, topY + 10);
  ctx.textAlign = 'right';
  ctx.fillText(`εt=${state.et.toFixed(4)}`, axisStrainX - etPx - 4, yLayer1 + 3);

  // --- 3. BLOQUE RECTANGULAR DE WHITNEY Y PAR DE FUERZAS ---
  const axisStressX = col3X - 45;
  const blockW = Math.min(65, cssW * 0.09);
  ctx.strokeStyle = pal.concreteStroke;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(axisStressX, topY);
  ctx.lineTo(axisStressX, botY);
  ctx.stroke();

  // Bloque 0.85 f'c de profundidad a
  ctx.fillStyle = pal.whitneyFill;
  ctx.strokeStyle = pal.whitneyStroke;
  ctx.lineWidth = 2;
  ctx.fillRect(axisStressX, topY, blockW, aPx);
  ctx.strokeRect(axisStressX, topY, blockW, aPx);

  ctx.fillStyle = pal.whitneyStroke;
  ctx.font = '700 10.5px JetBrains Mono, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`0.85f'c (a=${state.a.toFixed(1)}cm)`, axisStressX + blockW + 6, topY + Math.max(12, aPx / 2));
  ctx.fillText(`Cc = ${state.Cc_kN.toFixed(0)} kN`, axisStressX + blockW + 6, topY + Math.max(26, aPx / 2 + 14));

  // Fuerza Cs del acero a compresión si es doblemente reforzada
  if (state.isDoubly) {
    ctx.strokeStyle = pal.rebarComp;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(axisStressX + blockW + 4, yComp);
    ctx.lineTo(axisStressX + 4, yComp);
    ctx.stroke();
    ctx.fillStyle = pal.rebarComp;
    ctx.fillText(`Cs = ${state.Cs_kN.toFixed(0)} kN`, axisStressX + blockW + 6, yComp + 4);
  }

  // Fuerza de tracción T = As * fy
  const yCentroidT = topY + state.d * scaleY;
  ctx.strokeStyle = pal.rebarTension;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(axisStressX, yCentroidT);
  ctx.lineTo(axisStressX + blockW + 18, yCentroidT);
  ctx.stroke();

  ctx.fillStyle = pal.rebarTension;
  ctx.font = '700 10.5px JetBrains Mono, monospace';
  ctx.fillText(`T = ${state.T_kN.toFixed(0)} kN`, axisStressX + blockW + 22, yCentroidT + 4);
  ctx.fillStyle = pal.textSub;
  ctx.font = '500 10px JetBrains Mono, monospace';
  ctx.fillText(`Brazo z = ${(state.d - state.a / 2).toFixed(1)} cm`, axisStressX + 6, (topY + aPx / 2 + yCentroidT) / 2);

  // Pie informativo inferior
  ctx.fillStyle = pal.textSub;
  ctx.font = '500 11px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    `Equilibrio Horizontal: C_total = ${(state.Cc_kN + state.Cs_kN).toFixed(0)} kN = T = ${state.T_kN.toFixed(0)} kN  |  Resistencia de Diseño: φMn = ${state.phiMn_kNm.toFixed(1)} kN·m ≥ Mu = ${state.Mu.toFixed(0)} kN·m`,
    cssW / 2,
    cssH - 14
  );

  ctx.restore();
}

/**
 * ============================================================================
 * SIMULADOR 3.2: ANALIZADOR Y DISEÑADOR INTERACTIVO DE VIGAS T y L (NSR-10 C.8.12)
 * ============================================================================
 */
function updateSim32() {
  const muInput = document.getElementById('sim32-mu');
  if (!muInput) return;

  const Mu   = parseFloat(muInput.value); // kN·m
  const type = 'T'; // Secciones exclusivas en T (NSR-10 C.8.12.2)
  const L    = parseFloat(document.getElementById('sim32-l').value); // m
  const sw   = parseFloat(document.getElementById('sim32-sw').value); // cm (separación libre entre almas)
  const hf   = parseFloat(document.getElementById('sim32-hf').value); // cm
  const bw   = parseFloat(document.getElementById('sim32-bw').value); // cm
  const h    = parseFloat(document.getElementById('sim32-h').value);  // cm
  const fc   = parseFloat(document.getElementById('sim32-fc').value); // MPa
  const fy   = parseFloat(document.getElementById('sim32-fy').value); // MPa

  document.getElementById('val-sim32-mu').textContent = `${Mu.toFixed(0)} kN·m`;
  document.getElementById('val-sim32-l').textContent  = `${L.toFixed(1)} m`;
  document.getElementById('val-sim32-sw').textContent = `${sw.toFixed(0)} cm`;
  document.getElementById('val-sim32-hf').textContent = `${hf.toFixed(0)} cm`;
  document.getElementById('val-sim32-bw').textContent = `${bw.toFixed(0)} cm`;
  document.getElementById('val-sim32-h').textContent  = `${h.toFixed(0)} cm`;

  const d = Math.max(h - 6.5, hf + 5.0); // cm
  const beta1 = calcBeta1(fc);
  const L_cm = L * 100.0;

  // Cálculo del ancho efectivo del patín b_ef según NSR-10 C.8.12.2 (Viga T Monolítica)
  const b1 = L_cm / 4.0;
  const b2 = bw + 16.0 * hf;
  const b3 = bw + sw; // distancia centro a centro entre almas
  const bef = Math.min(b1, b2, b3);
  const normRef = 'NSR-10 C.8.12.2 (Viga T simétrica monolítica)';

  // Momento límite resistido cuando el bloque de compresión llena exactamente la loseta (a = hf)
  const Cf_full_kN = (0.85 * fc * (bef * 10.0) * (hf * 10.0)) / 1000.0; // kN
  const phi = 0.90;
  const Muf_limit_kNm = phi * Cf_full_kN * ((d - hf / 2.0) / 100.0); // kN·m

  // Acero mínimo en el alma según C.10.5.1
  const rhoMin = Math.max((0.25 * Math.sqrt(fc)) / fy, 1.4 / fy);
  const AsMin = rhoMin * bw * d; // cm2

  let isTrueTBeam = false;
  let a_cm = 0;
  let c_cm = 0;
  let Asf_cm2 = 0;
  let Asw_cm2 = 0;
  let As_req_cm2 = 0;
  let Muf_kNm = 0;
  let Muw_kNm = 0;
  let et = 0.010;
  let statusText = '';
  let statusClass = 'status-ok';

  if (Mu <= Muf_limit_kNm) {
    // CASO 1: Eje del bloque de Whitney dentro del patín (a <= hf) -> Se diseña como viga rectangular de ancho b = bef
    isTrueTBeam = false;
    const Rn_MPa = (Mu / 1000.0) / (phi * (bef / 100.0) * Math.pow(d / 100.0, 2));
    const rad = Math.max(0, 1.0 - (2.0 * Rn_MPa) / (0.85 * fc));
    const rhoBef = ((0.85 * fc) / fy) * (1.0 - Math.sqrt(rad));
    As_req_cm2 = Math.max(AsMin, rhoBef * bef * d);
    a_cm = (As_req_cm2 * fy) / (0.85 * fc * bef);
    c_cm = a_cm / beta1;
    et = 0.003 * ((d - c_cm) / c_cm);
    Asf_cm2 = 0;
    Asw_cm2 = As_req_cm2;
    Muf_kNm = 0;
    Muw_kNm = Mu;
    statusText = `CASO 1 (a = ${a_cm.toFixed(2)} cm ≤ hf = ${hf.toFixed(0)} cm): Bloque en el Patín — Funciona como Viga Rectangular de ancho bef = ${bef.toFixed(1)} cm`;
    statusClass = 'status-ok';
  } else {
    // CASO 2: Viga T Verdadera (a > hf) -> Descomposición en Par de las Alas (Asf) + Par del Alma (Asw)
    isTrueTBeam = true;
    Asf_cm2 = (0.85 * fc * (bef - bw) * hf) / fy; // cm2
    Muf_kNm = (phi * Asf_cm2 * 100.0 * fy * ((d - hf / 2.0) * 10.0)) / 1e6; // kN·m
    Muw_kNm = Math.max(0, Mu - Muf_kNm); // kN·m

    const Rnw_MPa = (Muw_kNm / 1000.0) / (phi * (bw / 100.0) * Math.pow(d / 100.0, 2));
    const radW = 1.0 - (2.0 * Rnw_MPa) / (0.85 * fc);
    if (radW <= 0.02) {
      Asw_cm2 = 0.025 * bw * d;
      a_cm = (Asw_cm2 * fy) / (0.85 * fc * bw);
      c_cm = a_cm / beta1;
      et = 0.003 * ((d - c_cm) / c_cm);
      As_req_cm2 = Asf_cm2 + Asw_cm2;
      statusText = `ALERTA: El alma bw=${bw} cm × h=${h} cm está sobreesforzada por Muw = ${Muw_kNm.toFixed(1)} kN·m. Aumente h o bw.`;
      statusClass = 'status-fail';
    } else {
      const rhow = ((0.85 * fc) / fy) * (1.0 - Math.sqrt(radW));
      Asw_cm2 = rhow * bw * d;
      As_req_cm2 = Math.max(AsMin, Asf_cm2 + Asw_cm2);
      a_cm = (Asw_cm2 * fy) / (0.85 * fc * bw);
      c_cm = a_cm / beta1;
      et = 0.003 * ((d - c_cm) / c_cm);
      statusText = `CASO 2 (a = ${a_cm.toFixed(2)} cm > hf = ${hf.toFixed(0)} cm): Viga T Verdadera — Descomposición Par de Alas (Asf) + Par del Alma (Asw)`;
      statusClass = et >= 0.005 ? 'status-warn' : 'status-fail';
    }
  }

  const banner = document.getElementById('sim32-status-banner');
  banner.className = `status-pill ${statusClass}`;
  banner.textContent = statusText;

  document.getElementById('out-sim32-bef').textContent = `${bef.toFixed(1)} cm  [mín(${b1.toFixed(1)}, ${b2.toFixed(1)}, ${b3.toFixed(1)}) — ${normRef}]`;
  document.getElementById('out-sim32-mlim').textContent = `φMn(a=hf) = ${Muf_limit_kNm.toFixed(1)} kN·m`;
  document.getElementById('out-sim32-depth').textContent = `a = ${a_cm.toFixed(2)} cm | hf = ${hf.toFixed(1)} cm | c = ${c_cm.toFixed(2)} cm | d = ${d.toFixed(1)} cm`;
  document.getElementById('out-sim32-asf').textContent = isTrueTBeam
    ? `Asf = ${Asf_cm2.toFixed(2)} cm² (Muf = ${Muf_kNm.toFixed(1)} kN·m)`
    : `0.00 cm² (No se requiere descomponer patín)`;
  document.getElementById('out-sim32-asw').textContent = isTrueTBeam
    ? `Asw = ${Asw_cm2.toFixed(2)} cm² (Muw = ${Muw_kNm.toFixed(1)} kN·m)`
    : `As = ${Asw_cm2.toFixed(2)} cm² (Ancho constante bef)`;
  document.getElementById('out-sim32-astot').textContent = `As,total = ${As_req_cm2.toFixed(2)} cm² (As,mín = ${AsMin.toFixed(2)} cm²) | εt = ${et.toFixed(5)}`;

  drawSim32Canvas({
    type, bef, bw, h, hf, d, a_cm, c_cm, isTrueTBeam,
    Asf_cm2, Asw_cm2, As_req_cm2, Muf_kNm, Muw_kNm, Mu, Muf_limit_kNm, et
  });
}

function drawSim32Canvas(st) {
  const canvas = document.getElementById('canvas-sim32');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const parentW = canvas.parentElement ? canvas.parentElement.clientWidth : 720;
  const cssW = Math.max(500, rect.width > 200 ? rect.width : (parentW > 40 ? parentW - 32 : 720));
  const cssH = 430;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.height = `${cssH}px`;
  ctx.save();
  ctx.scale(dpr, dpr);

  const pal = getThemePalette();
  ctx.fillStyle = pal.bgCanvas;
  ctx.fillRect(0, 0, cssW, cssH);

  const topY = 62;
  const botY = cssH - 52;
  const drawH = botY - topY;
  const scaleY = drawH / st.h;
  const maxFlangeDrawW = Math.min(280, cssW * 0.40);
  const scaleX = Math.min(scaleY * 0.95, maxFlangeDrawW / st.bef);

  const befPx = st.bef * scaleX;
  const bwPx  = Math.max(38, st.bw * scaleX);
  const hfPx  = Math.max(16, st.hf * scaleY);
  const aPx   = Math.min(drawH, st.a_cm * scaleY);

  const centerSecX = Math.round(cssW * 0.25);
  const flangeLeftX = centerSecX - befPx / 2;
  const webLeftX    = centerSecX - bwPx / 2;

  // Panel derecho para cajas analíticas
  const boxX = Math.round(cssW * 0.49);
  const boxW = Math.max(210, cssW - boxX - 16);

  // Títulos superiores
  ctx.fillStyle = pal.textMain;
  ctx.font = '700 12px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('1. GEOMETRÍA SECCIÓN EN T Y ZONA COMPRIMIDA', centerSecX, 26);
  ctx.fillText('2. DESCOMPOSICIÓN EN PAR DE LAS ALAS + PAR DEL ALMA', boxX + boxW / 2, 26);

  ctx.fillStyle = pal.textSub;
  ctx.font = '500 11px JetBrains Mono, monospace';
  ctx.fillText(`bef = ${st.bef.toFixed(1)} cm | bw = ${st.bw.toFixed(0)} cm | hf = ${st.hf.toFixed(0)} cm`, centerSecX, 44);
  ctx.fillText(st.isTrueTBeam ? `Caso 2: a (${st.a_cm.toFixed(1)} cm) > hf (${st.hf.toFixed(0)} cm)` : `Caso 1: a (${st.a_cm.toFixed(1)} cm) ≤ hf (${st.hf.toFixed(0)} cm)`, boxX + boxW / 2, 44);

  // Dibujar contorno simétrico de la Viga T Monolítica
  ctx.fillStyle = pal.concreteFill;
  ctx.strokeStyle = pal.concreteStroke;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(flangeLeftX, topY);
  ctx.lineTo(flangeLeftX + befPx, topY);
  ctx.lineTo(flangeLeftX + befPx, topY + hfPx);
  ctx.lineTo(webLeftX + bwPx, topY + hfPx);
  ctx.lineTo(webLeftX + bwPx, botY);
  ctx.lineTo(webLeftX, botY);
  ctx.lineTo(webLeftX, topY + hfPx);
  ctx.lineTo(flangeLeftX, topY + hfPx);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Sombreado de la zona en compresión
  if (!st.isTrueTBeam) {
    // Caso 1: Bloque de compresión íntegro dentro de la loseta (ancho bef, altura a)
    ctx.fillStyle = pal.flangeFill;
    ctx.strokeStyle = pal.flangeStroke;
    ctx.fillRect(flangeLeftX + 1, topY + 1, befPx - 2, Math.max(2, aPx));
    ctx.strokeRect(flangeLeftX + 1, topY + 1, befPx - 2, Math.max(2, aPx));
  } else {
    // Caso 2: Alas salientes comprimidas simétricamente hasta hf (azul)
    ctx.fillStyle = pal.flangeFill;
    ctx.strokeStyle = pal.flangeStroke;
    const wingW = (befPx - bwPx) / 2;
    ctx.fillRect(flangeLeftX + 1, topY + 1, wingW - 1, hfPx - 1);
    ctx.strokeRect(flangeLeftX + 1, topY + 1, wingW - 1, hfPx - 1);
    ctx.fillRect(webLeftX + bwPx, topY + 1, wingW - 1, hfPx - 1);
    ctx.strokeRect(webLeftX + bwPx, topY + 1, wingW - 1, hfPx - 1);

    // Alma central comprimida hasta profundidad a (rojo/rosa)
    ctx.fillStyle = pal.whitneyFill;
    ctx.strokeStyle = pal.whitneyStroke;
    ctx.fillRect(webLeftX + 1, topY + 1, bwPx - 2, Math.max(2, aPx));
    ctx.strokeRect(webLeftX + 1, topY + 1, bwPx - 2, Math.max(2, aPx));
  }

  // Barras de acero en tracción en el alma inferior
  const ySteel = topY + Math.min(drawH - 14, st.d * scaleY);
  ctx.fillStyle = pal.rebarTension;
  for (let i = 0; i < 4; i++) {
    const bx = (webLeftX + 10) + (i / 3) * (bwPx - 20);
    ctx.beginPath();
    ctx.arc(bx, ySteel, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cota de profundidad 'a' y 'hf'
  ctx.fillStyle = pal.whitneyStroke;
  ctx.font = '700 11px JetBrains Mono, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`a = ${st.a_cm.toFixed(2)} cm`, webLeftX + bwPx + 8, topY + Math.min(drawH - 20, aPx + 4));

  // Caja 1: Par de las Alas (Patín)
  ctx.fillStyle = pal.panelBg;
  ctx.strokeStyle = pal.flangeStroke;
  ctx.lineWidth = 1.6;
  ctx.fillRect(boxX, topY + 4, boxW, 126);
  ctx.strokeRect(boxX, topY + 4, boxW, 126);

  ctx.fillStyle = pal.flangeStroke;
  ctx.font = '700 11.5px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PAR 1: CONTRIBUCIÓN DE LAS ALAS SALIENTES (bef - bw)', boxX + 14, topY + 28);

  ctx.fillStyle = pal.textMain;
  ctx.font = '500 11px JetBrains Mono, monospace';
  if (st.isTrueTBeam) {
    ctx.fillText(`• Área de acero para equilibrar alas: Asf = ${st.Asf_cm2.toFixed(2)} cm²`, boxX + 14, topY + 54);
    ctx.fillText(`• Brazo de palanca del patín: zf = d - hf/2 = ${(st.d - st.hf / 2).toFixed(1)} cm`, boxX + 14, topY + 78);
    ctx.fillText(`• Momento resistente de las alas: Muf = ${st.Muf_kNm.toFixed(1)} kN·m`, boxX + 14, topY + 102);
  } else {
    ctx.fillText(`• Como a ≤ hf, el bloque de compresión no sale de la loseta.`, boxX + 14, topY + 54);
    ctx.fillText(`• Se diseña directamente como viga rectangular de ancho b = bef.`, boxX + 14, topY + 78);
    ctx.fillText(`• Momento límite con patín lleno: φMn(a=hf) = ${st.Muf_limit_kNm.toFixed(1)} kN·m`, boxX + 14, topY + 102);
  }

  // Caja 2: Par del Alma (Web)
  const box2Y = topY + 146;
  ctx.fillStyle = pal.panelBg;
  ctx.strokeStyle = pal.whitneyStroke;
  ctx.lineWidth = 1.6;
  ctx.fillRect(boxX, box2Y, boxW, 142);
  ctx.strokeRect(boxX, box2Y, boxW, 142);

  ctx.fillStyle = pal.whitneyStroke;
  ctx.font = '700 11.5px Inter, sans-serif';
  ctx.fillText('PAR 2: CONTRIBUCIÓN DEL ALMA CENTRAL Y ACERO TOTAL', boxX + 14, box2Y + 24);

  ctx.fillStyle = pal.textMain;
  ctx.font = '500 11px JetBrains Mono, monospace';
  ctx.fillText(`• Momento asignado al bloque principal: Muw = ${st.Muw_kNm.toFixed(1)} kN·m`, boxX + 14, box2Y + 48);
  ctx.fillText(`• Acero equilibrante del bloque: Asw = ${st.Asw_cm2.toFixed(2)} cm² (a = ${st.a_cm.toFixed(2)} cm)`, boxX + 14, box2Y + 72);
  ctx.fillStyle = pal.rebarTension;
  ctx.font = '700 11.5px JetBrains Mono, monospace';
  ctx.fillText(`★ ACERO TOTAL REQUERIDO: As = Asf + Asw = ${st.As_req_cm2.toFixed(2)} cm²`, boxX + 14, box2Y + 98);
  ctx.fillStyle = pal.textSub;
  ctx.font = '500 10.5px JetBrains Mono, monospace';
  ctx.fillText(`Deformación neta: εt = ${st.et.toFixed(5)} (${st.et >= 0.005 ? 'Controlada por Tracción φ=0.90' : 'Zona de Transición'})`, boxX + 14, box2Y + 122);

  ctx.restore();
}



/* ==========================================================================
   INICIALIZACIÓN Y VINCULACIÓN REACTIVA DE EVENTOS PARA EL MÓDULO 03
   ========================================================================== */
window.toggleExampleStep = function (stepEl) {
  stepEl.classList.toggle('step-collapsed');
};

window.toggleAllSteps = function (containerId, reveal) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('.calc-step-card').forEach((card) => {
    if (reveal) {
      card.classList.remove('step-collapsed');
    } else {
      card.classList.add('step-collapsed');
    }
  });
};

window.toggleSolutionMaster = function (btn) {
  const content = btn.nextElementSibling;
  if (!content) return;
  const isHidden = content.style.display === 'none' || getComputedStyle(content).display === 'none';
  if (isHidden) {
    content.style.display = 'block';
    btn.classList.add('active');
    const icon = btn.querySelector('.solution-toggle-icon');
    if (icon) icon.textContent = '▲';
  } else {
    content.style.display = 'none';
    btn.classList.remove('active');
    const icon = btn.querySelector('.solution-toggle-icon');
    if (icon) icon.textContent = '▼';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // 1. Vincular eventos para Simulador 3.1
  const sim31Inputs = [
    'sim31-mu', 'sim31-bw', 'sim31-h', 'sim31-rec', 'sim31-dp',
    'sim31-fc', 'sim31-fy', 'sim31-bar', 'sim31-bar-comp',
    'sim31-rev-nbars', 'sim31-rev-bar', 'sim31-rev-has-comp',
    'sim31-rev-nbars-comp', 'sim31-rev-bar-comp'
  ];
  sim31Inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateSim31);
      el.addEventListener('change', updateSim31);
    }
  });

  // 2. Vincular eventos para Simulador 3.2
  const sim32Inputs = [
    'sim32-mu', 'sim32-l', 'sim32-sw', 'sim32-hf',
    'sim32-bw', 'sim32-h', 'sim32-fc', 'sim32-fy'
  ];
  sim32Inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateSim32);
      el.addEventListener('change', updateSim32);
    }
  });

  // 3. Renderizado inicial de ambos simuladores
  updateSim31();
  updateSim32();

  // 4. Redibujar al redimensionar la ventana o alternar modo claro/oscuro
  window.addEventListener('resize', () => {
    updateSim31();
    updateSim32();
  });
  window.addEventListener('themeChanged', () => {
    updateSim31();
    updateSim32();
  });
});


/**
 * ============================================================================
 * CONTROL DE NAVEGACIÓN Y DESPLIEGUE DE EJERCICIOS COLAPSABLES (SECCIÓN 7.0)
 * ============================================================================
 */
window.toggleExampleMacro = function(exampleId, forceState) {
  const body = document.getElementById(exampleId);
  const btn = document.getElementById(`macro-btn-${exampleId}`);
  const arrow = document.getElementById(`macro-arrow-${exampleId}`);
  const card = document.getElementById(`macro-${exampleId}`);
  if (!body) return;

  const isCurrentlyOpen = body.style.display !== 'none';
  const shouldOpen = forceState !== undefined ? forceState : !isCurrentlyOpen;

  if (shouldOpen) {
    body.style.display = 'block';
    if (arrow) arrow.textContent = '▲';
    if (btn) btn.innerHTML = '<span>Ocultar Ejercicio</span> <span class="macro-arrow">▲</span>';
    if (card) card.style.borderColor = 'var(--brand-primary)';
  } else {
    body.style.display = 'none';
    if (arrow) arrow.textContent = '▼';
    if (btn) btn.innerHTML = '<span>Ver Ejercicio Completo</span> <span class="macro-arrow">▼</span>';
    if (card) card.style.borderColor = 'var(--border-color)';
  }
};

window.toggleAllExamples = function(reveal) {
  for (let i = 1; i <= 7; i++) {
    const id = `sec-ejemplo-0${i}`;
    window.toggleExampleMacro(id, reveal);
  }
};

window.openAndJumpToExample = function(exampleId) {
  window.toggleExampleMacro(exampleId, true);
  const card = document.getElementById(`macro-${exampleId}`);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

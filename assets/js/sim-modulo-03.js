/**
 * ============================================================================
 * SIMULADORES INTERACTIVOS — MÓDULO 03: DISEÑO A FLEXIÓN DE VIGAS
 * ============================================================================
 * Simulador 3.1: Diseñador y Analizador Seccional de Vigas Rectangulares
 *                Simplemente y Doblemente Reforzadas (NSR-10 C.10.2, C.10.3,
 *                C.10.5, C.9.3.2 y C.7.6.1).
 * Simulador 3.2: Analizador y Diseñador de Vigas de Sección en T y en L
 *                (NSR-10 C.8.12: Caso 1 a <= hf vs. Caso 2 a > hf).
 * ============================================================================
 */

const BAR_CATALOG = {
  4:  { label: 'No. 4 (1/2")',   db: 12.7, areaCm2: 1.29, mass: 0.994 },
  5:  { label: 'No. 5 (5/8")',   db: 15.9, areaCm2: 1.99, mass: 1.552 },
  6:  { label: 'No. 6 (3/4")',   db: 19.1, areaCm2: 2.84, mass: 2.235 },
  7:  { label: 'No. 7 (7/8")',   db: 22.2, areaCm2: 3.87, mass: 3.042 },
  8:  { label: 'No. 8 (1")',     db: 25.4, areaCm2: 5.10, mass: 3.973 },
  9:  { label: 'No. 9 (1-1/8")', db: 28.7, areaCm2: 6.45, mass: 5.060 },
  10: { label: 'No. 10 (1-1/4")',db: 32.3, areaCm2: 8.19, mass: 6.404 }
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
  const barNo = parseInt(document.getElementById('sim31-bar').value, 10);
  const barCompNo = parseInt(document.getElementById('sim31-bar-comp').value, 10);

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
  const d = Math.max(h - rec, 12.0); // cm
  const dt = d; // inicialmente igual a d (si se arma en 2 capas, ajustamos dt para la fila extrema)

  // Cuantías características NSR-10
  const rhoMin1 = (0.25 * Math.sqrt(fc)) / fy;
  const rhoMin2 = 1.4 / fy;
  const rhoMin = Math.max(rhoMin1, rhoMin2);
  const AsMin = rhoMin * bw * d; // cm2

  const rhoB = 0.85 * beta1 * (fc / fy) * (600.0 / (600.0 + fy));
  const rhoMax005 = rhoB * ((0.003 + ey) / 0.008); // Controlada por tracción (et = 0.005, phi = 0.90)
  const rhoMax004 = rhoB * ((0.003 + ey) / 0.007); // Límite absoluto flexión (et = 0.004, phi = 0.817)

  // Capacidad máxima como sección simplemente reforzada controlada por tracción (et = 0.005, phi = 0.90)
  const As1_max = rhoMax005 * bw * d; // cm2
  const a1_max  = (As1_max * fy) / (0.85 * fc * bw); // cm
  const c1_max  = a1_max / beta1; // cm
  const Mn1_max = (As1_max * 100.0 * fy * (d * 10.0 - (a1_max * 10.0) / 2.0)) / 1e6; // kN·m
  const Mu1_max = 0.90 * Mn1_max; // kN·m

  // Parámetro de resistencia requerida Rn (asumiendo inicialmente phi = 0.90)
  const phiDesign = 0.90;
  const bw_m = bw / 100.0;
  const d_m  = d / 100.0;
  const Rn_MPa = (Mu / 1000.0) / (phiDesign * bw_m * d_m * d_m); // MPa

  let isDoubly = false;
  let regimeTitle = '';
  let regimeClass = 'status-ok';
  let rhoReq = 0;
  let As1_req = 0;
  let As2_req = 0;
  let As_req = 0;
  let AsComp_req = 0;
  let compSteelYieldsDesign = true;
  let fsCompDesign = fy;
  let epsCompDesign = 0;

  const radicand = 1.0 - (2.0 * Rn_MPa) / (0.85 * fc);

  if (Mu <= Mu1_max && radicand > 0) {
    // SECCIÓN SIMPLEMENTE REFORZADA (Mu <= Mu1_max)
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
    As1_req = rhoReq * bw * d;
    As2_req = 0.0;
    As_req = As1_req;
    AsComp_req = 0.0;
  } else {
    // SECCIÓN DOBLEMENTE REFORZADA (Mu > Mu1_max): Superposición Parte 1 + Parte 2
    isDoubly = true;
    As1_req = As1_max; // Parte 1 en el límite controlado por tracción (et = 0.005)
    const Mu2 = Math.max(0, Mu - Mu1_max); // Exceso de momento kN·m
    // Brazo del par acero-acero (d - d') en metros:
    const arm_m = Math.max((d - dp) / 100.0, 0.05);
    // As2 requerido en cm2: Mu2 (kN·m) * 1e6 (N·mm) / (phi * fy (MPa) * (d-d') (mm)) / 100
    As2_req = (Mu2 * 1e6) / (phiDesign * fy * ((d - dp) * 10.0) * 100.0);
    As_req = As1_req + As2_req;
    rhoReq = As_req / (bw * d);

    // Verificación de fluencia del acero a compresión en el estado límite c1_max = 0.375 d
    epsCompDesign = ecu * (1.0 - dp / c1_max);
    if (epsCompDesign >= ey) {
      compSteelYieldsDesign = true;
      fsCompDesign = fy;
      AsComp_req = As2_req;
      regimeTitle = 'Viga Doblemente Reforzada — Acero a Compresión FLUYE (ε\'s ≥ εy, f\'s = fy)';
      regimeClass = 'status-warn';
    } else {
      compSteelYieldsDesign = false;
      fsCompDesign = Math.max(50.0, Es * epsCompDesign);
      AsComp_req = As2_req * (fy / fsCompDesign);
      regimeTitle = 'Viga Doblemente Reforzada — Acero a Compresión NO Fluye (ε\'s < εy, f\'s < fy)';
      regimeClass = 'status-warn';
    }
  }

  // Selección comercial de barras a tracción y verificación de espaciamiento C.7.6.1
  const barInfo = BAR_CATALOG[barNo];
  const barCompInfo = BAR_CATALOG[barCompNo];
  const nBarsTension = Math.max(2, Math.ceil(As_req / barInfo.areaCm2));
  const As_prov = nBarsTension * barInfo.areaCm2;

  // Ancho libre para alojar barras en una sola capa (C.7.6.1: s_libre >= max(db, 25 mm, 1.33*19 mm = 25.3 mm))
  const rLibreMm = 40.0; // C.7.7.1 vigas
  const dbEstriboMm = 9.5; // No. 3
  const sMinMm = Math.max(barInfo.db, 25.4);
  const bwMm = bw * 10.0;
  const maxBarsPerLayer = Math.max(2, Math.floor((bwMm - 2 * rLibreMm - 2 * dbEstriboMm + sMinMm) / (barInfo.db + sMinMm)));
  const nLayers = Math.ceil(nBarsTension / maxBarsPerLayer);
  const barsLayer1 = Math.min(nBarsTension, maxBarsPerLayer);
  const barsLayer2 = Math.max(0, nBarsTension - barsLayer1);

  // Ancho mínimo requerido para alojar todas las barras en 1 sola fila
  const bMin1FilaCm = (2 * rLibreMm + 2 * dbEstriboMm + nBarsTension * barInfo.db + (nBarsTension - 1) * sMinMm) / 10.0;

  // Barras comerciales en compresión (mínimo 2 barras constructivas porta-estribos si es simple, o las requeridas por cálculo si es doble)
  const nBarsComp = isDoubly
    ? Math.max(2, Math.ceil(AsComp_req / barCompInfo.areaCm2))
    : 2;
  const AsComp_prov = isDoubly ? (nBarsComp * barCompInfo.areaCm2) : 0.0;

  // REVISIÓN EXACTA POR COMPATIBILIDAD DE DEFORMACIONES CON EL ACERO SUMINISTRADO
  const As_mm2 = As_prov * 100.0;
  const AsComp_mm2 = AsComp_prov * 100.0;
  const b_mm = bw * 10.0;
  const d_mm = d * 10.0;
  const dp_mm = dp * 10.0;
  // Si hay 2 capas en tracción, dt está más abajo que el centroide d
  const dt_mm = nLayers > 1 ? (d_mm + (barsLayer2 / nBarsTension) * (25.0 + barInfo.db)) : d_mm;

  let c_rev = 0; // mm
  let a_rev = 0; // mm
  let epsComp_rev = 0;
  let fsComp_rev = 0;

  if (!isDoubly || AsComp_mm2 <= 0) {
    a_rev = (As_mm2 * fy) / (0.85 * fc * b_mm);
    c_rev = a_rev / beta1;
    epsComp_rev = c_rev > dp_mm ? ecu * ((c_rev - dp_mm) / c_rev) : 0;
    fsComp_rev = 0;
  } else {
    // 1. Asumir inicialmente que el acero a compresión NO fluye (ecuación cuadrática exacta)
    const A_quad = 0.85 * fc * b_mm * beta1;
    const B_quad = AsComp_mm2 * (ecu * Es - 0.85 * fc) - As_mm2 * fy;
    const C_quad = -AsComp_mm2 * ecu * Es * dp_mm;
    c_rev = (-B_quad + Math.sqrt(B_quad * B_quad - 4.0 * A_quad * C_quad)) / (2.0 * A_quad);
    epsComp_rev = ecu * ((c_rev - dp_mm) / c_rev);

    if (epsComp_rev >= ey) {
      // El acero a compresión SÍ fluye (f's = fy)
      fsComp_rev = fy;
      a_rev = (As_mm2 * fy - AsComp_mm2 * (fy - 0.85 * fc)) / (0.85 * fc * b_mm);
      c_rev = a_rev / beta1;
      epsComp_rev = ecu * ((c_rev - dp_mm) / c_rev);
    } else {
      a_rev = beta1 * c_rev;
      fsComp_rev = Math.max(0, epsComp_rev * Es);
    }
  }

  const et_rev = ecu * ((dt_mm - c_rev) / c_rev);
  const phi_rev = calcPhiFlexion(et_rev, ey);

  // Fuerzas internas y Momento Nominal Mn (kN·m)
  const Cc_kN = (0.85 * fc * b_mm * a_rev) / 1000.0;
  const Cs_kN = isDoubly ? (AsComp_mm2 * (fsComp_rev - 0.85 * fc)) / 1000.0 : 0.0;
  const T_kN  = (As_mm2 * fy) / 1000.0;

  const Mn_kNm = isDoubly
    ? (Cc_kN * (d_mm - a_rev / 2.0) + Cs_kN * (d_mm - dp_mm)) / 1000.0
    : (T_kN * (d_mm - a_rev / 2.0)) / 1000.0;
  const phiMn_kNm = phi_rev * Mn_kNm;

  // Actualizar tarjetas de resultados
  const statusBanner = document.getElementById('sim31-status-banner');
  statusBanner.className = `status-pill ${regimeClass}`;
  statusBanner.textContent = regimeTitle;

  document.getElementById('out-sim31-rn').textContent = `${Rn_MPa.toFixed(2)} MPa`;
  document.getElementById('out-sim31-mu1max').textContent = `${Mu1_max.toFixed(1)} kN·m`;
  document.getElementById('out-sim31-rhomin').textContent = `${(rhoMin * 100).toFixed(3)} % (${AsMin.toFixed(2)} cm²)`;
  document.getElementById('out-sim31-rhomax').textContent = `${(rhoMax005 * 100).toFixed(3)} % (εt=0.005) | ${(rhoMax004 * 100).toFixed(3)} % (εt=0.004)`;
  document.getElementById('out-sim31-asreq').textContent = isDoubly
    ? `${As_req.toFixed(2)} cm² (As1=${As1_req.toFixed(2)} + As2=${As2_req.toFixed(2)})`
    : `${As_req.toFixed(2)} cm² (ρ=${(rhoReq * 100).toFixed(3)} %)`;
  document.getElementById('out-sim31-ascomp').textContent = isDoubly
    ? `${AsComp_req.toFixed(2)} cm² → ${nBarsComp} ${barCompInfo.label} (${AsComp_prov.toFixed(2)} cm², f's=${fsComp_rev.toFixed(0)} MPa)`
    : `No requerido por cálculo (2 ${barCompInfo.label} porta-estribos)`;
  document.getElementById('out-sim31-bars').textContent = `${nBarsTension} ${barInfo.label} → As,sum = ${As_prov.toFixed(2)} cm² (${nLayers === 1 ? '1 capa' : `2 capas: ${barsLayer1}+${barsLayer2}`})`;
  document.getElementById('out-sim31-bmin').textContent = `b_mín(1 fila) = ${bMin1FilaCm.toFixed(1)} cm ${bw >= bMin1FilaCm ? '✓ Cabe en 1 fila' : `→ Se arma en ${nLayers} capas (C.7.6.2)`}`;
  document.getElementById('out-sim31-strains').textContent = `c = ${(c_rev / 10).toFixed(2)} cm | a = ${(a_rev / 10).toFixed(2)} cm | εt = ${et_rev.toFixed(5)} | φ = ${phi_rev.toFixed(3)}`;
  document.getElementById('out-sim31-phimn').textContent = `φMn = ${phiMn_kNm.toFixed(1)} kN·m ≥ Mu = ${Mu.toFixed(0)} kN·m (D/C = ${(Mu / phiMn_kNm).toFixed(2)})`;

  drawSim31Canvas({
    bw, h, d, dp, dt: dt_mm / 10.0,
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
  const cssW = canvas.clientWidth || 760;
  const cssH = 400;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  ctx.save();
  ctx.scale(dpr, dpr);

  const pal = getThemePalette();
  ctx.fillStyle = pal.bgCanvas;
  ctx.fillRect(0, 0, cssW, cssH);

  // Tres zonas en el canvas:
  // 1) Sección Transversal (x: 20..250)
  // 2) Diagrama de Deformaciones de Bernoulli (x: 270..510)
  // 3) Bloque de Whitney y Fuerzas Internas (x: 530..cssW-20)
  const topY = 58;
  const botY = cssH - 48;
  const drawH = botY - topY;
  const scaleY = drawH / state.h; // px por cm en vertical
  const scaleX = Math.min(scaleY, 150 / state.bw);
  const secW = state.bw * scaleX;
  const secX = 135 - secW / 2;

  // Títulos de columnas
  ctx.fillStyle = pal.textMain;
  ctx.font = '700 12px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('1. SECCIÓN TRANSVERSAL', 135, 26);
  ctx.fillText('2. COMPATIBILIDAD (ε)', 390, 26);
  ctx.fillText('3. BLOQUE WHITNEY Y PAR INTERNO', 630, 26);

  ctx.fillStyle = pal.textSub;
  ctx.font = '500 11px JetBrains Mono, monospace';
  ctx.fillText(`b=${state.bw} cm × h=${state.h} cm`, 135, 43);
  ctx.fillText(`εcu=0.003 | εt=${state.et.toFixed(4)}`, 390, 43);
  ctx.fillText(`φMn = ${state.phiMn_kNm.toFixed(1)} kN·m`, 630, 43);

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
  const axisStressX = 565;
  const blockW = 68;
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
  const type = document.getElementById('sim32-type').value; // 'T' o 'L'
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

  // Cálculo del ancho efectivo del patín b_ef según NSR-10 C.8.12.2 (Viga T) o C.8.12.3 (Viga L)
  let b1 = 0, b2 = 0, b3 = 0, bef = 0;
  let normRef = '';
  if (type === 'T') {
    b1 = L_cm / 4.0;
    b2 = bw + 16.0 * hf;
    b3 = bw + sw; // distancia centro a centro entre almas
    bef = Math.min(b1, b2, b3);
    normRef = 'NSR-10 C.8.12.2 (Viga T simétrica)';
  } else {
    b1 = bw + L_cm / 12.0;
    b2 = bw + 6.0 * hf;
    b3 = bw + sw / 2.0;
    bef = Math.min(b1, b2, b3);
    normRef = 'NSR-10 C.8.12.3 (Viga L con ala en un solo lado)';
  }

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
  const cssW = canvas.clientWidth || 760;
  const cssH = 380;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  ctx.save();
  ctx.scale(dpr, dpr);

  const pal = getThemePalette();
  ctx.fillStyle = pal.bgCanvas;
  ctx.fillRect(0, 0, cssW, cssH);

  const topY = 58;
  const botY = cssH - 46;
  const drawH = botY - topY;
  const scaleY = drawH / st.h;
  const maxFlangeDrawW = 290;
  const scaleX = Math.min(scaleY * 0.95, maxFlangeDrawW / st.bef);

  const befPx = st.bef * scaleX;
  const bwPx  = Math.max(36, st.bw * scaleX);
  const hfPx  = st.hf * scaleY;
  const aPx   = Math.min(drawH, st.a_cm * scaleY);

  const centerSecX = 210;
  const flangeLeftX = st.type === 'T' ? (centerSecX - befPx / 2) : (centerSecX - bwPx / 2);
  const webLeftX    = centerSecX - bwPx / 2;

  // Títulos superiores
  ctx.fillStyle = pal.textMain;
  ctx.font = '700 12px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`1. GEOMETRÍA SECCIÓN EN ${st.type} Y ZONA COMPRIMIDA`, centerSecX, 26);
  ctx.fillText('2. DESCOMPOSICIÓN EN PAR DE LAS ALAS + PAR DEL ALMA', 555, 26);

  ctx.fillStyle = pal.textSub;
  ctx.font = '500 11px JetBrains Mono, monospace';
  ctx.fillText(`bef = ${st.bef.toFixed(1)} cm | bw = ${st.bw.toFixed(0)} cm | hf = ${st.hf.toFixed(0)} cm`, centerSecX, 43);
  ctx.fillText(st.isTrueTBeam ? `Caso 2: a (${st.a_cm.toFixed(1)} cm) > hf (${st.hf.toFixed(0)} cm)` : `Caso 1: a (${st.a_cm.toFixed(1)} cm) ≤ hf (${st.hf.toFixed(0)} cm)`, 555, 43);

  // Dibujar contorno de la Viga T o L
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
    // Bloque de compresión íntegro dentro de la loseta (ancho bef, altura a)
    ctx.fillStyle = pal.flangeFill;
    ctx.strokeStyle = pal.flangeStroke;
    ctx.fillRect(flangeLeftX + 1, topY + 1, befPx - 2, Math.max(2, aPx));
    ctx.strokeRect(flangeLeftX + 1, topY + 1, befPx - 2, Math.max(2, aPx));
  } else {
    // Alas salientes comprimidas hasta hf (azul)
    ctx.fillStyle = pal.flangeFill;
    ctx.strokeStyle = pal.flangeStroke;
    if (st.type === 'T') {
      const wingW = (befPx - bwPx) / 2;
      ctx.fillRect(flangeLeftX + 1, topY + 1, wingW - 1, hfPx - 1);
      ctx.strokeRect(flangeLeftX + 1, topY + 1, wingW - 1, hfPx - 1);
      ctx.fillRect(webLeftX + bwPx, topY + 1, wingW - 1, hfPx - 1);
      ctx.strokeRect(webLeftX + bwPx, topY + 1, wingW - 1, hfPx - 1);
    } else {
      const wingW = befPx - bwPx;
      ctx.fillRect(webLeftX + bwPx, topY + 1, wingW - 1, hfPx - 1);
      ctx.strokeRect(webLeftX + bwPx, topY + 1, wingW - 1, hfPx - 1);
    }
    // Alma comprimida hasta profundidad a (rojo/rosa)
    ctx.fillStyle = pal.whitneyFill;
    ctx.strokeStyle = pal.whitneyStroke;
    ctx.fillRect(webLeftX + 1, topY + 1, bwPx - 2, Math.max(2, aPx));
    ctx.strokeRect(webLeftX + 1, topY + 1, bwPx - 2, Math.max(2, aPx));
  }

  // Barras de acero en tracción en el alma inferior
  const ySteel = topY + st.d * scaleY;
  ctx.fillStyle = pal.rebarTension;
  for (let i = 0; i < 4; i++) {
    const bx = (webLeftX + 10) + (i / 3) * (bwPx - 20);
    ctx.beginPath();
    ctx.arc(bx, ySteel, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cota de profundidad 'a' y 'hf'
  ctx.fillStyle = pal.whitneyStroke;
  ctx.font = '700 10.5px JetBrains Mono, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`a = ${st.a_cm.toFixed(2)} cm`, webLeftX + bwPx + 8, topY + Math.min(drawH - 20, aPx + 4));

  // Panel derecho: Tarjetas gráficas de los Pares Internos
  const boxX = 415;
  const boxW = cssW - boxX - 24;

  // Caja 1: Par de las Alas (Patín)
  ctx.fillStyle = pal.panelBg;
  ctx.strokeStyle = pal.flangeStroke;
  ctx.lineWidth = 1.6;
  ctx.fillRect(boxX, topY + 6, boxW, 118);
  ctx.strokeRect(boxX, topY + 6, boxW, 118);

  ctx.fillStyle = pal.flangeStroke;
  ctx.font = '700 11.5px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PAR 1: CONTRIBUCIÓN DE LAS ALAS SALIENTES (b_ef - b_w)', boxX + 14, topY + 28);

  ctx.fillStyle = pal.textMain;
  ctx.font = '500 11px JetBrains Mono, monospace';
  if (st.isTrueTBeam) {
    ctx.fillText(`• Área de acero para equilibrar alas: Asf = ${st.Asf_cm2.toFixed(2)} cm²`, boxX + 14, topY + 52);
    ctx.fillText(`• Brazo de palanca del patín: z_f = d - hf/2 = ${(st.d - st.hf / 2).toFixed(1)} cm`, boxX + 14, topY + 74);
    ctx.fillText(`• Momento resistente de las alas: Muf = ${st.Muf_kNm.toFixed(1)} kN·m`, boxX + 14, topY + 96);
  } else {
    ctx.fillText(`• Como a ≤ hf, el bloque de compresión no sale de la loseta.`, boxX + 14, topY + 52);
    ctx.fillText(`• Se diseña directamente como viga rectangular de ancho b = bef.`, boxX + 14, topY + 74);
    ctx.fillText(`• Momento límite con el patín lleno: φMn(a=hf) = ${st.Muf_limit_kNm.toFixed(1)} kN·m`, boxX + 14, topY + 96);
  }

  // Caja 2: Par del Alma (Web)
  const box2Y = topY + 142;
  ctx.fillStyle = pal.panelBg;
  ctx.strokeStyle = pal.whitneyStroke;
  ctx.lineWidth = 1.6;
  ctx.fillRect(boxX, box2Y, boxW, 130);
  ctx.strokeRect(boxX, box2Y, boxW, 130);

  ctx.fillStyle = pal.whitneyStroke;
  ctx.font = '700 11.5px Inter, sans-serif';
  ctx.fillText('PAR 2: CONTRIBUCIÓN DEL ALMA CENTRAL Y ACERO TOTAL', boxX + 14, box2Y + 24);

  ctx.fillStyle = pal.textMain;
  ctx.font = '500 11px JetBrains Mono, monospace';
  ctx.fillText(`• Momento asignado al bloque principal: Muw = ${st.Muw_kNm.toFixed(1)} kN·m`, boxX + 14, box2Y + 48);
  ctx.fillText(`• Acero equilibrante del bloque: Asw = ${st.Asw_cm2.toFixed(2)} cm² (a = ${st.a_cm.toFixed(2)} cm)`, boxX + 14, box2Y + 70);
  ctx.fillStyle = pal.rebarTension;
  ctx.font = '700 11.5px JetBrains Mono, monospace';
  ctx.fillText(`★ ACERO TOTAL REQUERIDO: As = Asf + Asw = ${st.As_req_cm2.toFixed(2)} cm²`, boxX + 14, box2Y + 96);
  ctx.fillStyle = pal.textSub;
  ctx.font = '500 10.5px JetBrains Mono, monospace';
  ctx.fillText(`Deformación neta de tracción: εt = ${st.et.toFixed(5)} (${st.et >= 0.005 ? 'Controlada por Tracción φ=0.90' : 'Zona de Transición'})`, boxX + 14, box2Y + 116);

  ctx.restore();
}

document.addEventListener('DOMContentLoaded', () => {
  // Conectar eventos del Simulador 3.1
  ['sim31-mu', 'sim31-bw', 'sim31-h', 'sim31-rec', 'sim31-dp', 'sim31-fc', 'sim31-fy', 'sim31-bar', 'sim31-bar-comp'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateSim31);
      el.addEventListener('change', updateSim31);
    }
  });

  // Conectar eventos del Simulador 3.2
  ['sim32-mu', 'sim32-type', 'sim32-l', 'sim32-sw', 'sim32-hf', 'sim32-bw', 'sim32-h', 'sim32-fc', 'sim32-fy'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateSim32);
      el.addEventListener('change', updateSim32);
    }
  });

  updateSim31();
  updateSim32();

  window.addEventListener('resize', () => {
    updateSim31();
    updateSim32();
  });

  const themeBtn = document.getElementById('btn-theme');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      setTimeout(() => {
        updateSim31();
        updateSim32();
      }, 60);
    });
  }
});

/**
 * ============================================================================
 * SIMULADORES INTERACTIVOS — MÓDULO 05: DISEÑO DE COLUMNAS (NSR-10 CAP. C.10)
 * ============================================================================
 * Autor: Prof. Daniel Abudinen, I.C., M.Sc.
 * Simulador 5.1: Generador Analítico del Diagrama de Interacción (Pn-Mn y
 *                phiPn-phiMn), Los 8 Puntos Notables, Tacómetro Dinámico
 *                y Verificador Biaxial de Bresler / PCA.
 * Simulador 5.2: Analizador de Esbeltez, Factor de Longitud Efectiva k
 *                (Jackson & Moreland) y Magnificación de Momentos (C.10.10:
 *                δns y δs por Índice de Estabilidad Q).
 * ============================================================================
 */

function calcBeta1Mod05(fc) {
  if (fc <= 28.0) return 0.85;
  if (fc >= 56.0) return 0.65;
  return Math.max(0.65, 0.85 - (0.05 * (fc - 28.0)) / 7.0);
}

function calcPhiColMod05(et, ey, phiComp) {
  if (et <= ey) return phiComp;
  if (et >= 0.005) return 0.90;
  return phiComp + (0.90 - phiComp) * ((et - ey) / (0.005 - ey));
}

function clampStressSteel(strain, Es, fy) {
  const fs = Es * strain;
  if (fs > fy) return fy;
  if (fs < -fy) return -fy;
  return fs;
}

function getThemePaletteMod05() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    isDark,
    bgCanvas: isDark ? '#0B1120' : '#F8FAFC',
    panelBg: isDark ? '#111C33' : '#FFFFFF',
    gridLine: isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(148, 163, 184, 0.22)',
    concreteFill: isDark ? '#1E293B' : '#E2E8F0',
    concreteStroke: isDark ? '#94A3B8' : '#334155',
    nomCurve: isDark ? '#38BDF8' : '#0284C7',
    desCurve: isDark ? '#34D399' : '#059669',
    desFill: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.11)',
    warnStroke: isDark ? '#FBBF24' : '#D97706',
    dangerStroke: isDark ? '#FB7185' : '#E11D48',
    rebarColor: isDark ? '#FBBF24' : '#D97706',
    stirrupColor: isDark ? '#38BDF8' : '#0284C7',
    textMain: isDark ? '#F1F5F9' : '#0F172A',
    textSub: isDark ? '#94A3B8' : '#475569'
  };
}

/**
 * Evaluador seccional para un valor dado del eje neutro c (mm)
 * Retorna { c, a, et, epsPrime, fs, fPrimeS, Pn (kN), Mn (kN·m), phi, phiPn, phiMn }
 */
function evalRectColumnAtC(cMm, params) {
  const { bMm, hMm, dMm, dpMm, xcpMm, AsMm2, AsPrimeMm2, AsMidMm2, fc, fy, Es, beta1, phiComp } = params;
  const ecu = 0.003;
  const ey = fy / Es;

  const aMm = Math.min(hMm, Math.max(0.0, beta1 * cMm));
  const Cc = 0.85 * fc * bMm * aMm; // N

  // Deformaciones unitarias (positiva en tracción para et; positiva en compresión para epsPrime)
  const et = cMm > 1e-4 ? ((dMm - cMm) / cMm) * ecu : 0.05;
  const epsPrime = cMm > 1e-4 ? ((cMm - dpMm) / cMm) * ecu : -0.05;
  const epsMid = cMm > 1e-4 ? ((cMm - hMm / 2.0) / cMm) * ecu : -0.05; // + en compresión

  const fs = clampStressSteel(et, Es, fy);            // + tracción (MPa)
  const fPrimeS = clampStressSteel(epsPrime, Es, fy); // + compresión (MPa)
  const fMidS = clampStressSteel(epsMid, Es, fy);     // + compresión (MPa)

  // Descuento de orificios ocupados por las barras dentro del bloque comprimido aMm
  const u1 = aMm >= dpMm ? 0.85 * fc * AsPrimeMm2 : 0.0;
  const uMid = aMm >= hMm / 2.0 ? 0.85 * fc * AsMidMm2 : 0.0;
  const u2 = aMm >= dMm ? 0.85 * fc * AsMm2 : 0.0;

  const FcompSteel = AsPrimeMm2 * fPrimeS - u1; // N (+ compresión)
  const FmidSteel  = AsMidMm2 * fMidS - uMid;   // N (+ compresión)
  const FtensSteel = AsMm2 * fs + u2;           // N (+ tracción)

  const Pn_N = Cc + FcompSteel + FmidSteel - FtensSteel;
  const Mn_Nmm =
    Cc * (xcpMm - aMm / 2.0) +
    FcompSteel * (xcpMm - dpMm) +
    FmidSteel * (xcpMm - hMm / 2.0) +
    FtensSteel * (dMm - xcpMm);

  const phi = calcPhiColMod05(et, ey, phiComp);
  const Pn = Pn_N / 1000.0;
  const Mn = Mn_Nmm / 1e6;

  return {
    c: cMm,
    a: aMm,
    et,
    epsPrime,
    fs,
    fPrimeS,
    Pn,
    Mn,
    phi,
    phiPn: phi * Pn,
    phiMn: phi * Mn
  };
}

/**
 * ============================================================================
 * SIMULADOR 5.1: DIAGRAMA DE INTERACCIÓN (8 PUNTOS NOTABLES) + BRESLER BIAXIAL
 * ============================================================================
 */
function updateSim51() {
  const bInput = document.getElementById('sim51-b');
  if (!bInput) return;

  const bCm       = parseFloat(bInput.value);                                   // cm
  const hCm       = parseFloat(document.getElementById('sim51-h').value);       // cm
  const dpCm      = parseFloat(document.getElementById('sim51-dp').value);      // cm (recubrimiento al centroide)
  const fc        = parseFloat(document.getElementById('sim51-fc').value);      // MPa
  const fy        = parseFloat(document.getElementById('sim51-fy').value);      // MPa
  const AsPrimeCm2= parseFloat(document.getElementById('sim51-ascomp').value);  // cm2 (cara comprimida A's)
  const AsCm2     = parseFloat(document.getElementById('sim51-astens').value);  // cm2 (cara traccionada As)
  const AsMidCm2  = parseFloat(document.getElementById('sim51-asmid').value);   // cm2 (barras intermedias)
  const tieType   = document.getElementById('sim51-type').value;                // 'tied' o 'spiral'
  const capRule   = document.getElementById('sim51-cap').value;                 // '0.80' (NSR-10 C.10.3.6) o '0.75' (Guía clásica)
  const Pu        = parseFloat(document.getElementById('sim51-pu').value);      // kN
  const Mux       = parseFloat(document.getElementById('sim51-mux').value);     // kN·m (alrededor del eje fuerte h)
  const Muy       = parseFloat(document.getElementById('sim51-muy').value);     // kN·m (alrededor del eje débil b)

  // Actualizar etiquetas
  document.getElementById('val-sim51-b').textContent      = `${bCm.toFixed(0)} cm`;
  document.getElementById('val-sim51-h').textContent      = `${hCm.toFixed(0)} cm`;
  document.getElementById('val-sim51-dp').textContent     = `${dpCm.toFixed(2)} cm`;
  document.getElementById('val-sim51-ascomp').textContent = `${AsPrimeCm2.toFixed(2)} cm²`;
  document.getElementById('val-sim51-astens').textContent = `${AsCm2.toFixed(2)} cm²`;
  document.getElementById('val-sim51-asmid').textContent  = `${AsMidCm2.toFixed(2)} cm²`;
  document.getElementById('val-sim51-pu').textContent     = `${Pu.toFixed(0)} kN`;
  document.getElementById('val-sim51-mux').textContent    = `${Mux.toFixed(0)} kN·m`;
  document.getElementById('val-sim51-muy').textContent    = `${Muy.toFixed(0)} kN·m`;

  const bMm  = bCm * 10.0;
  const hMm  = hCm * 10.0;
  const dpMm = dpCm * 10.0;
  const dMm  = hMm - dpMm;
  const AgMm2 = bMm * hMm;

  const AsPrimeMm2 = AsPrimeCm2 * 100.0;
  const AsMm2      = AsCm2 * 100.0;
  const AsMidMm2   = AsMidCm2 * 100.0;
  const AstMm2     = AsPrimeMm2 + AsMm2 + AsMidMm2;
  const rhoG       = AstMm2 / AgMm2;

  const Es = 200000.0;
  const ey = fy / Es;
  const beta1 = calcBeta1Mod05(fc);
  const phiComp = tieType === 'spiral' ? 0.75 : 0.65;
  const alphaCap = tieType === 'spiral'
    ? (capRule === '0.75' ? 0.80 : 0.85)
    : (capRule === '0.75' ? 0.75 : 0.80);

  // Centroide plástico xcp medido desde la fibra extrema en compresión (mm)
  const P0_N = 0.85 * fc * (AgMm2 - AstMm2) + fy * AstMm2;
  const numXcp =
    0.85 * fc * bMm * hMm * (hMm / 2.0) +
    AsPrimeMm2 * (fy - 0.85 * fc) * dpMm +
    AsMidMm2 * (fy - 0.85 * fc) * (hMm / 2.0) +
    AsMm2 * (fy - 0.85 * fc) * dMm;
  const xcpMm = numXcp / P0_N;

  const params = {
    bMm, hMm, dMm, dpMm, xcpMm,
    AsMm2, AsPrimeMm2, AsMidMm2,
    fc, fy, Es, beta1, phiComp
  };

  // =========================================================================
  // CÁLCULO DE LOS 8 PUNTOS NOTABLES DEL DIAGRAMA DE INTERACCIÓN
  // =========================================================================
  // Punto 1: Compresión axial pura (e = 0, Mn = 0)
  const P0 = P0_N / 1000.0;
  const phiP0 = phiComp * P0;
  const pt1 = { id: 1, name: 'Compresión Pura (e=0)', c: Infinity, Pn: P0, Mn: 0.0, phi: phiComp, phiPn: phiP0, phiMn: 0.0 };

  // Punto 2: Carga axial máxima permitida con Mn = 0
  const PnMax = alphaCap * P0;
  const phiPnMax = phiComp * PnMax;
  const pt2 = { id: 2, name: `Meseta Pn,máx (${alphaCap.toFixed(2)} P0, Mn=0)`, c: Infinity, Pn: PnMax, Mn: 0.0, phi: phiComp, phiPn: phiPnMax, phiMn: 0.0 };

  // Punto 3: Momento correspondiente a Pn,máx (búsqueda por bisección de c tal que Pn(c) = PnMax)
  let cLow = dMm * 0.5, cHigh = hMm * 3.0;
  for (let it = 0; it < 40; it++) {
    const cMid = 0.5 * (cLow + cHigh);
    const ev = evalRectColumnAtC(cMid, params);
    if (ev.Pn > PnMax) cHigh = cMid;
    else cLow = cMid;
  }
  const ev3 = evalRectColumnAtC(0.5 * (cLow + cHigh), params);
  const pt3 = { id: 3, name: 'Excentricidad Mínima (Pn,máx)', ...ev3 };

  // Punto 4: Condición Balanceada (et = ey)
  const cbMm = (0.003 / (0.003 + ey)) * dMm;
  const ev4 = evalRectColumnAtC(cbMm, params);
  const pt4 = { id: 4, name: 'Falla Balanceada (εt = εy)', ...ev4 };

  // Punto 5: Límite de deformación en flexión (et = 0.004)
  const c004Mm = (0.003 / (0.003 + 0.004)) * dMm;
  const ev5 = evalRectColumnAtC(c004Mm, params);
  const pt5 = { id: 5, name: 'Transición Límite (εt = 0.004)', ...ev5 };

  // Punto 6: Inicio de sección controlada por tracción (et = 0.005)
  const c005Mm = (0.003 / (0.003 + 0.005)) * dMm;
  const ev6 = evalRectColumnAtC(c005Mm, params);
  const pt6 = { id: 6, name: 'Control Tracción (εt = 0.005)', ...ev6 };

  // Punto 7: Flexión Pura (Pn = 0) por bisección
  let cFLow = 1.0, cFHigh = dMm;
  for (let it = 0; it < 45; it++) {
    const cMid = 0.5 * (cFLow + cFHigh);
    const ev = evalRectColumnAtC(cMid, params);
    if (ev.Pn > 0.0) cFHigh = cMid;
    else cFLow = cMid;
  }
  const ev7 = evalRectColumnAtC(0.5 * (cFLow + cFHigh), params);
  const pt7 = { id: 7, name: 'Flexión Pura (Pn = 0)', ...ev7 };

  // Punto 8: Tracción Axial Pura (Mn = 0)
  const Pnt = -(AstMm2 * fy) / 1000.0;
  const pt8 = { id: 8, name: 'Tracción Pura (Mn = 0)', c: 0.0, Pn: Pnt, Mn: 0.0, phi: 0.90, phiPn: 0.90 * Pnt, phiMn: 0.0 };

  const keyPoints = [pt1, pt2, pt3, pt4, pt5, pt6, pt7, pt8];

  // Generar curva continua de 82 puntos desde c grande hasta tracción pura
  const curvePts = [pt1];
  for (let i = 0; i <= 80; i++) {
    const t = i / 80.0;
    const cVal = hMm * 1.45 * Math.pow(1.0 - t, 1.8) + 4.0;
    curvePts.push(evalRectColumnAtC(cVal, params));
  }
  curvePts.push(pt8);

  // Capacidad de momento de diseño phiMnx0 al nivel de Pu actuante
  let phiMnxAtPu = 0.0;
  let evAtPu = ev3;
  if (Pu <= phiPnMax && Pu >= pt8.phiPn) {
    let cA = 2.0, cB = hMm * 2.5;
    for (let it = 0; it < 40; it++) {
      const cM = 0.5 * (cA + cB);
      const ev = evalRectColumnAtC(cM, params);
      if (ev.phiPn > Pu) cB = cM;
      else cA = cM;
    }
    evAtPu = evalRectColumnAtC(0.5 * (cA + cB), params);
    phiMnxAtPu = Math.max(0.1, evAtPu.phiMn);
  }

  // Capacidad aproximada alrededor del eje débil y (intercambiando b y h)
  const paramsY = {
    ...params,
    bMm: hMm,
    hMm: bMm,
    dMm: bMm - dpMm,
    xcpMm: bMm / 2.0
  };
  let phiMnyAtPu = 0.0;
  if (Pu <= phiPnMax && Pu >= pt8.phiPn) {
    let cA = 2.0, cB = bMm * 2.5;
    for (let it = 0; it < 40; it++) {
      const cM = 0.5 * (cA + cB);
      const ev = evalRectColumnAtC(cM, paramsY);
      if (ev.phiPn > Pu) cB = cM;
      else cA = cM;
    }
    phiMnyAtPu = Math.max(0.1, evalRectColumnAtC(0.5 * (cA + cB), paramsY).phiMn);
  }

  // Índice de utilización biaxial por Contorno de Bresler (alpha = 1.50) y PCA (alpha = 1.61)
  const ratioX = phiMnxAtPu > 0.1 ? Mux / phiMnxAtPu : (Mux > 0 ? 9.99 : 0.0);
  const ratioY = phiMnyAtPu > 0.1 ? Muy / phiMnyAtPu : (Muy > 0 ? 9.99 : 0.0);
  const breslerIndex15 = Math.pow(Math.max(0, ratioX), 1.5) + Math.pow(Math.max(0, ratioY), 1.5);
  const pcaIndex161    = Math.pow(Math.max(0, ratioX), 1.61) + Math.pow(Math.max(0, ratioY), 1.61);

  // Actualizar métricas y tabla de los 8 puntos notables en el DOM
  document.getElementById('res51-rhog').textContent   = `${(rhoG * 100).toFixed(2)}% (Ast = ${(AstMm2 / 100).toFixed(2)} cm²)`;
  document.getElementById('res51-xcp').textContent    = `${(xcpMm / 10.0).toFixed(2)} cm (h/2 = ${(hCm / 2.0).toFixed(2)} cm)`;
  document.getElementById('res51-pmax').textContent   = `φPn,máx = ${phiPnMax.toFixed(1)} kN (Pn,máx = ${PnMax.toFixed(1)} kN)`;
  document.getElementById('res51-bal').textContent    = `φPnb = ${pt4.phiPn.toFixed(1)} kN | φMnb = ${pt4.phiMn.toFixed(1)} kN·m (eb = ${((pt4.Mn / pt4.Pn) * 100).toFixed(1)} cm)`;
  document.getElementById('res51-m0').textContent     = `φMn0 = ${pt7.phiMn.toFixed(1)} kN·m (Mn0 = ${pt7.Mn.toFixed(1)} kN·m)`;
  document.getElementById('res51-mnt').textContent    = `φPnt = ${pt8.phiPn.toFixed(1)} kN`;
  document.getElementById('res51-capu').textContent   = Pu <= phiPnMax
    ? `φMnx0 = ${phiMnxAtPu.toFixed(1)} kN·m | φMny0 = ${phiMnyAtPu.toFixed(1)} kN·m`
    : 'Pu excede la meseta φPn,máx';
  document.getElementById('res51-bresler').textContent = `Bresler (α=1.5): ${breslerIndex15.toFixed(2)} | PCA (α=1.61): ${pcaIndex161.toFixed(2)}`;

  // Rellenar tabla de los 8 puntos notables si existe en el DOM
  const tbody8 = document.getElementById('tbody-sim51-pts');
  if (tbody8) {
    tbody8.innerHTML = keyPoints.map((p) => `
      <tr>
        <td><strong>Pto. ${p.id}</strong> — ${p.name}</td>
        <td>${isFinite(p.c) ? p.c.toFixed(1) : '∞'}</td>
        <td>${p.Pn.toFixed(1)}</td>
        <td>${p.Mn.toFixed(2)}</td>
        <td>${p.phi.toFixed(3)}</td>
        <td><strong>${p.phiPn.toFixed(1)}</strong></td>
        <td><strong>${p.phiMn.toFixed(2)}</strong></td>
      </tr>
    `).join('');
  }

  // Actualizar Tacómetro Dinámico de Flexocompresión (#sim51-tachometer-card)
  const tachoNeedle = document.getElementById('sim51-tacho-needle');
  const tachoBadge  = document.getElementById('sim51-tacho-badge');
  const tachoRatio  = document.getElementById('sim51-tacho-val-ratio');
  const tachoDc     = document.getElementById('sim51-tacho-val-dc');
  const tachoStrain = document.getElementById('sim51-tacho-val-strain');

  if (tachoNeedle && tachoBadge && tachoRatio && tachoDc && tachoStrain) {
    const axialUtil = phiPnMax > 0.1 ? Pu / phiPnMax : 0.0;
    const momentUtil = (Mux === 0 && Muy === 0) ? 0.0 : Math.pow(Math.max(0, breslerIndex15), 1.0 / 1.5);
    const dcGlobal = Math.max(axialUtil, momentUtil);

    let needlePct = 10.0;
    if (rhoG < 0.01 || rhoG > 0.04 || Pu > phiPnMax || breslerIndex15 > 1.0) {
      tachoBadge.style.cssText = 'background:#FEE2E2; color:#991B1B; border:1px solid #FCA5A5;';
      if (rhoG < 0.01 || rhoG > 0.04) {
        tachoBadge.textContent = `🔴 ZONA 4 • CUANTÍA FUERA DE NORMA (ρg = ${(rhoG * 100).toFixed(2)}%)`;
      } else {
        tachoBadge.textContent = '🔴 ZONA 4 • FUERA DE ENVOLVENTE (FALLA SECCIONAL)';
      }
      needlePct = 85.0 + Math.min(13.0, Math.max(2.0, (dcGlobal - 1.0) * 30.0));
    } else if (axialUtil > 0.85 || breslerIndex15 > 0.85) {
      tachoBadge.style.cssText = 'background:#FFEDD5; color:#9A3412; border:1px solid #FDBA74;';
      tachoBadge.textContent = '🟠 ZONA 3B • ALTA SOLICITACIÓN (CERCANA A LA ENVOLVENTE)';
      const sub = Math.max(axialUtil, breslerIndex15);
      needlePct = 65.0 + Math.min(19.0, Math.max(0.0, ((sub - 0.85) / 0.15) * 20.0));
    } else if (evAtPu.et <= ey) {
      tachoBadge.style.cssText = 'background:#FEF3C7; color:#B45309; border:1px solid #FDE68A;';
      tachoBadge.textContent = `🟡 ZONA 3A • CONTROL POR COMPRESIÓN (φ = ${phiComp.toFixed(2)})`;
      const spanP = Math.max(1.0, phiPnMax - pt4.phiPn);
      const frac = Math.min(1.0, Math.max(0.0, (Pu - pt4.phiPn) / spanP));
      needlePct = 38.0 + frac * 27.0;
    } else if (evAtPu.et < 0.005) {
      tachoBadge.style.cssText = 'background:#DBEAFE; color:#1E40AF; border:1px solid #93C5FD;';
      tachoBadge.textContent = `🔵 ZONA 2 • REGIÓN DE TRANSICIÓN (φ = ${evAtPu.phi.toFixed(3)})`;
      const frac = Math.min(1.0, Math.max(0.0, (0.005 - evAtPu.et) / Math.max(0.0005, 0.005 - ey)));
      needlePct = 18.0 + frac * 20.0;
    } else {
      tachoBadge.style.cssText = 'background:#DCFCE7; color:#166534; border:1px solid #86EFAC;';
      tachoBadge.textContent = '🟢 ZONA 1 • CONTROL POR TRACCIÓN DÚCTIL (φ = 0.90)';
      const frac = Math.min(1.0, Math.max(0.0, breslerIndex15 / 0.85));
      needlePct = 2.0 + frac * 16.0;
    }

    tachoNeedle.style.left = `${Math.max(2.0, Math.min(98.0, needlePct)).toFixed(1)}%`;

    const tz1 = document.getElementById('tacho51-val-z1');
    const tz2 = document.getElementById('tacho51-val-z2');
    const tz3a = document.getElementById('tacho51-val-z3a');
    const tz3b = document.getElementById('tacho51-val-z3b');
    const tz4 = document.getElementById('tacho51-val-z4');

    if (tz1) tz1.textContent = `Pu ≤ ${pt6.phiPn.toFixed(0)} kN`;
    if (tz2) tz2.textContent = `Pu ≤ ${pt4.phiPn.toFixed(0)} kN`;
    if (tz3a) tz3a.textContent = `Pu ≤ ${(0.85 * phiPnMax).toFixed(0)} kN`;
    if (tz3b) tz3b.textContent = `Pu ≤ ${phiPnMax.toFixed(0)} kN`;
    if (tz4) tz4.textContent = `> ${phiPnMax.toFixed(0)} kN o D/C > 1`;

    tachoRatio.textContent = `Pu / φPn,máx = ${axialUtil.toFixed(2)} (${Pu.toFixed(0)} / ${phiPnMax.toFixed(1)} kN)`;
    tachoDc.textContent = `Bresler (α=1.5) = ${breslerIndex15.toFixed(3)} | PCA = ${pcaIndex161.toFixed(3)}`;
    tachoStrain.textContent = `εt = ${evAtPu.et.toFixed(4)} | φ = ${evAtPu.phi.toFixed(3)}`;
  }

  const status51 = document.getElementById('res51-status');
  if (rhoG < 0.01 || rhoG > 0.04) {
    status51.className = 'status-badge status-danger';
    status51.innerHTML = `❌ CUANTÍA FUERA DE RANGO (NSR-10 C.10.9.1): ρg = ${(rhoG * 100).toFixed(2)}% debe estar entre 1.00% y 4.00%.`;
  } else if (Pu > phiPnMax) {
    status51.className = 'status-badge status-danger';
    status51.innerHTML = `❌ FALLA POR CARGA AXIAL EXCESIVA: Pu = ${Pu.toFixed(0)} kN > φPn,máx = ${phiPnMax.toFixed(1)} kN.`;
  } else if (breslerIndex15 > 1.0) {
    status51.className = 'status-badge status-danger';
    status51.innerHTML = `❌ SECCIÓN INSUFICIENTE EN FLEXOCOMPRESIÓN: Índice de Bresler = ${breslerIndex15.toFixed(2)} > 1.00 (Punto fuera del diagrama de diseño).`;
  } else {
    status51.className = 'status-badge status-ok';
    status51.innerHTML = `✅ SECCIÓN CUMPLE (NSR-10 C.10): ρg = ${(rhoG * 100).toFixed(2)}%, Pu ≤ φPn,máx y Contorno de Bresler = ${breslerIndex15.toFixed(2)} ≤ 1.00.`;
  }

  drawSim51Canvas({
    bCm, hCm, dpCm, xcpMm, PnMax, phiPnMax,
    curvePts, keyPoints, Pu, Mux, Muy,
    phiMnxAtPu, breslerIndex15, tieType
  });
}

function drawSim51Canvas(state) {
  const canvas = document.getElementById('canvas-sim51');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const pal = getThemePaletteMod05();
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = pal.bgCanvas;
  ctx.fillRect(0, 0, W, H);

  // Cuadrícula
  ctx.strokeStyle = pal.gridLine;
  ctx.lineWidth = 1;
  for (let x = 30; x < W; x += 30) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 30; y < H; y += 30) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Izquierda (x: 75..615): Diagrama de Interacción Pn-Mn y phiPn-phiMn
  // Derecha (x: 655..900): Sección transversal de la columna
  const plotLeft = 75;
  const plotRight = 615;
  const plotTop = 38;
  const plotBot = 400;
  const plotW = plotRight - plotLeft;
  const plotH = plotBot - plotTop;

  const pMaxVal = Math.max(state.keyPoints[0].Pn * 1.08, state.Pu * 1.15, 1000.0);
  const pMinVal = Math.min(state.keyPoints[7].Pn * 1.12, -500.0);
  const mMaxVal = Math.max(state.keyPoints[3].Mn * 1.18, state.Mux * 1.25, 100.0);

  const mToX = (m) => plotLeft + (Math.max(0.0, m) / mMaxVal) * plotW;
  const pToY = (p) => plotTop + ((pMaxVal - p) / (pMaxVal - pMinVal)) * plotH;
  const yZero = pToY(0.0);

  // Título
  ctx.fillStyle = pal.textMain;
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('DIAGRAMA DE INTERACCIÓN NOMINAL (Pn-Mn) Y DE DISEÑO (φPn-φMn)', plotLeft - 10, 22);

  // Polígono relleno de la región segura de diseño (phiPn - phiMn truncado en phiPn,máx)
  ctx.fillStyle = pal.desFill;
  ctx.beginPath();
  ctx.moveTo(mToX(0), pToY(state.phiPnMax));
  ctx.lineTo(mToX(state.keyPoints[2].phiMn), pToY(state.phiPnMax));
  state.curvePts.forEach((pt) => {
    if (pt.phiPn <= state.phiPnMax && pt.Mn >= 0) {
      ctx.lineTo(mToX(pt.phiMn), pToY(pt.phiPn));
    }
  });
  ctx.lineTo(mToX(0), pToY(state.keyPoints[7].phiPn));
  ctx.closePath();
  ctx.fill();

  // Ejes coordenados M = 0 y P = 0
  ctx.strokeStyle = pal.concreteStroke;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(plotLeft, plotTop);
  ctx.lineTo(plotLeft, plotBot);
  ctx.moveTo(plotLeft, yZero);
  ctx.lineTo(plotRight, yZero);
  ctx.stroke();

  // Recta radial de Falla Balanceada (Punto 4)
  const pt4 = state.keyPoints[3];
  ctx.strokeStyle = pal.warnStroke;
  ctx.setLineDash([5, 4]);
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(plotLeft, yZero);
  ctx.lineTo(mToX(pt4.Mn), pToY(pt4.Pn));
  ctx.stroke();

  // Meseta horizontal nominal Pn,máx (Puntos 2 a 3)
  ctx.strokeStyle = pal.nomCurve;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(mToX(0), pToY(state.PnMax));
  ctx.lineTo(mToX(state.keyPoints[2].Mn), pToY(state.PnMax));
  ctx.stroke();
  ctx.setLineDash([]);

  // Curva Nominal Pn - Mn (azul)
  ctx.strokeStyle = pal.nomCurve;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  state.curvePts.forEach((pt, idx) => {
    const x = mToX(Math.max(0, pt.Mn));
    const y = pToY(pt.Pn);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Curva de Diseño phiPn - phiMn con meseta phiPn,máx (verde esmeralda)
  ctx.strokeStyle = pal.desCurve;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(mToX(0), pToY(state.phiPnMax));
  ctx.lineTo(mToX(state.keyPoints[2].phiMn), pToY(state.phiPnMax));
  state.curvePts.forEach((pt) => {
    if (pt.phiPn <= state.phiPnMax && pt.phiMn >= 0) {
      ctx.lineTo(mToX(pt.phiMn), pToY(pt.phiPn));
    }
  });
  ctx.lineTo(mToX(0), pToY(state.keyPoints[7].phiPn));
  ctx.stroke();

  // Dibujar los 8 Puntos Notables sobre la curva de diseño
  ctx.font = 'bold 10px JetBrains Mono, monospace';
  state.keyPoints.forEach((pt) => {
    const xd = mToX(Math.max(0, pt.phiMn));
    const yd = pToY(pt.phiPn);
    ctx.fillStyle = pal.desCurve;
    ctx.beginPath();
    ctx.arc(xd, yd, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.textMain;
    ctx.textAlign = 'left';
    ctx.fillText(`(${pt.id})`, xd + 6, yd + 3);
  });

  // Punto de Solicitación Actuante (Mux, Pu)
  const xAct = mToX(state.Mux);
  const yAct = pToY(state.Pu);
  const isSafe = state.Pu <= state.phiPnMax && state.breslerIndex15 <= 1.0;

  ctx.fillStyle = isSafe ? '#10B981' : '#EF4444';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(xAct, yAct, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isSafe ? pal.desCurve : pal.dangerStroke;
  ctx.font = 'bold 11px JetBrains Mono, monospace';
  ctx.textAlign = xAct > plotRight - 140 ? 'right' : 'left';
  ctx.fillText(`(Mux=${state.Mux.toFixed(0)}, Pu=${state.Pu.toFixed(0)})`, xAct > plotRight - 140 ? xAct - 10 : xAct + 9, yAct - 6);

  // Etiquetas de ejes
  ctx.fillStyle = pal.textSub;
  ctx.textAlign = 'right';
  ctx.fillText(`${state.keyPoints[0].Pn.toFixed(0)}`, plotLeft - 6, pToY(state.keyPoints[0].Pn) + 4);
  ctx.fillText(`${state.phiPnMax.toFixed(0)}`, plotLeft - 6, pToY(state.phiPnMax) + 4);
  ctx.fillText('0 kN', plotLeft - 6, yZero + 4);
  ctx.fillText(`${state.keyPoints[7].Pn.toFixed(0)}`, plotLeft - 6, pToY(state.keyPoints[7].Pn) + 4);
  ctx.textAlign = 'center';
  ctx.fillText(`M [kN·m] (Máx: ${pt4.Mn.toFixed(0)} kN·m)`, (plotLeft + plotRight) / 2, plotBot + 20);

  // =========================================================================
  // PANEL DERECHO: SECCIÓN TRANSVERSAL DE LA COLUMNA
  // =========================================================================
  const secCX = 775;
  const secCY = 215;
  const scale = Math.min(190 / state.hCm, 190 / state.bCm);
  const drawW = Math.max(85, state.hCm * scale); // dirección h (horizontal en el plano de flexión)
  const drawH = Math.max(85, state.bCm * scale); // dirección b
  const secLeft = secCX - drawW / 2;
  const secTop  = secCY - drawH / 2;

  ctx.fillStyle = pal.textMain;
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SECCIÓN TRANSVERSAL (h × b)', secCX, 22);

  ctx.fillStyle = pal.concreteFill;
  ctx.strokeStyle = pal.concreteStroke;
  ctx.lineWidth = 2;
  ctx.fillRect(secLeft, secTop, drawW, drawH);
  ctx.strokeRect(secLeft, secTop, drawW, drawH);

  // Estribo o espiral
  const pad = 14;
  ctx.strokeStyle = pal.stirrupColor;
  ctx.lineWidth = 2.4;
  if (state.tieType === 'spiral') {
    ctx.beginPath();
    ctx.arc(secCX, secCY, Math.min(drawW, drawH) / 2 - pad, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.strokeRect(secLeft + pad, secTop + pad, drawW - 2 * pad, drawH - 2 * pad);
  }

  // Barras en cara comprimida (derecha, A's) y cara traccionada (izquierda, As)
  const xTensionBar = secLeft + pad + 5;
  const xCompBar    = secLeft + drawW - pad - 5;
  for (let i = 0; i < 3; i++) {
    const by = secTop + pad + 6 + (i * (drawH - 2 * pad - 12)) / 2;
    ctx.fillStyle = pal.rebarColor;
    ctx.beginPath(); ctx.arc(xTensionBar, by, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(xCompBar, by, 5, 0, Math.PI * 2); ctx.fill();
  }

  // Centroide plástico CP
  const xCpPx = secLeft + drawW - (state.xcpMm / (state.hCm * 10.0)) * drawW;
  ctx.strokeStyle = pal.dangerStroke;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(xCpPx - 6, secCY); ctx.lineTo(xCpPx + 6, secCY);
  ctx.moveTo(xCpPx, secCY - 6); ctx.lineTo(xCpPx, secCY + 6);
  ctx.stroke();

  ctx.fillStyle = pal.textMain;
  ctx.font = 'bold 11px JetBrains Mono, monospace';
  ctx.fillText(`h = ${state.hCm.toFixed(0)} cm | b = ${state.bCm.toFixed(0)} cm`, secCX, secTop + drawH + 22);
  ctx.fillStyle = pal.nomCurve;
  ctx.fillText('── Curva Nominal (Pn - Mn)', secCX, secTop + drawH + 44);
  ctx.fillStyle = pal.desCurve;
  ctx.fillText('── Curva Diseño (φPn - φMn)', secCX, secTop + drawH + 62);
}

function loadSim51Preset(presetKey) {
  if (presetKey === 'ej71_axial') {
    // Ejemplo 7.1 (Parte B): Columna cuadrada 40 x 40 cm con 8 phi 3/4" (Ast = 22.80 cm2)
    document.getElementById('sim51-b').value = 40;
    document.getElementById('sim51-h').value = 40;
    document.getElementById('sim51-dp').value = 6.00;
    document.getElementById('sim51-fc').value = '28';
    document.getElementById('sim51-fy').value = '420';
    document.getElementById('sim51-ascomp').value = 8.55;
    document.getElementById('sim51-astens').value = 8.55;
    document.getElementById('sim51-asmid').value = 5.70;
    document.getElementById('sim51-type').value = 'tied';
    document.getElementById('sim51-cap').value = '0.80';
    document.getElementById('sim51-pu').value = 2200;
    document.getElementById('sim51-mux').value = 0;
    document.getElementById('sim51-muy').value = 0;
  } else if (presetKey === 'ej52_simetrica') {
    // Ejemplo 7.2 (Caso Simétrico): Columna 40 x 45 cm con 6 No. 8 (3 No. 8 por cara)
    document.getElementById('sim51-b').value = 40;
    document.getElementById('sim51-h').value = 45;
    document.getElementById('sim51-dp').value = 6.22;
    document.getElementById('sim51-fc').value = '28';
    document.getElementById('sim51-fy').value = '420';
    document.getElementById('sim51-ascomp').value = 15.30;
    document.getElementById('sim51-astens').value = 15.30;
    document.getElementById('sim51-asmid').value = 0.0;
    document.getElementById('sim51-type').value = 'tied';
    document.getElementById('sim51-cap').value = '0.75';
    document.getElementById('sim51-pu').value = 1200;
    document.getElementById('sim51-mux').value = 220;
    document.getElementById('sim51-muy').value = 0;
  } else if (presetKey === 'ej52_asimetrica') {
    // Ejemplo 7.2 (Extensión Asimétrica): 3 No. 8 en tracción (15.30 cm2) y 2 No. 6 en compresión (5.70 cm2)
    document.getElementById('sim51-b').value = 40;
    document.getElementById('sim51-h').value = 45;
    document.getElementById('sim51-dp').value = 6.05;
    document.getElementById('sim51-fc').value = '28';
    document.getElementById('sim51-fy').value = '420';
    document.getElementById('sim51-ascomp').value = 5.70;
    document.getElementById('sim51-astens').value = 15.30;
    document.getElementById('sim51-asmid').value = 0.0;
    document.getElementById('sim51-type').value = 'tied';
    document.getElementById('sim51-cap').value = '0.75';
    document.getElementById('sim51-pu').value = 900;
    document.getElementById('sim51-mux').value = 210;
    document.getElementById('sim51-muy').value = 0;
  } else if (presetKey === 'ej53_biaxial') {
    // Ejemplo 7.3 (Parte B): Columna cuadrada 60 x 60 cm sometida a flexocompresión biaxial
    document.getElementById('sim51-b').value = 60;
    document.getElementById('sim51-h').value = 60;
    document.getElementById('sim51-dp').value = 6.50;
    document.getElementById('sim51-fc').value = '35';
    document.getElementById('sim51-fy').value = '420';
    document.getElementById('sim51-ascomp').value = 20.20;
    document.getElementById('sim51-astens').value = 20.20;
    document.getElementById('sim51-asmid').value = 10.10;
    document.getElementById('sim51-type').value = 'tied';
    document.getElementById('sim51-cap').value = '0.80';
    document.getElementById('sim51-pu').value = 5300;
    document.getElementById('sim51-mux').value = 405;
    document.getElementById('sim51-muy').value = 170;
  } else if (presetKey === 'ej77_parme') {
    // Ejemplo 7.7 (Rediseño con 8 No. 9): Columna esquinera 50 x 50 cm, Pu = 1850 kN, Mux = 195, Muy = 145
    document.getElementById('sim51-b').value = 50;
    document.getElementById('sim51-h').value = 50;
    document.getElementById('sim51-dp').value = 6.00;
    document.getElementById('sim51-fc').value = '28';
    document.getElementById('sim51-fy').value = '420';
    document.getElementById('sim51-ascomp').value = 19.35;
    document.getElementById('sim51-astens').value = 19.35;
    document.getElementById('sim51-asmid').value = 12.90;
    document.getElementById('sim51-type').value = 'tied';
    document.getElementById('sim51-cap').value = '0.80';
    document.getElementById('sim51-pu').value = 1850;
    document.getElementById('sim51-mux').value = 195;
    document.getElementById('sim51-muy').value = 145;
  }
  updateSim51();
}

/**
 * ============================================================================
 * SIMULADOR 5.2: COLUMNAS ESBELTAS, FACTOR k Y MAGNIFICACIÓN DE MOMENTOS
 * ============================================================================
 */
function setSim52SwayMethod(method) {
  const methodInput = document.getElementById('sim52-sway-method');
  if (methodInput) methodInput.value = method;
  const btnQ = document.getElementById('sim52-btn-sway-q');
  const btnE = document.getElementById('sim52-btn-sway-euler');
  if (btnQ) btnQ.classList.toggle('active', method === 'q');
  if (btnE) btnE.classList.toggle('active', method === 'euler');
  const qBox = document.getElementById('sim52-sway-q-box');
  if (qBox) qBox.style.display = method === 'q' ? 'block' : 'none';
  updateSim52();
}

function updateSim52() {
  const luInput = document.getElementById('sim52-lu');
  if (!luInput) return;

  const frameType = document.getElementById('sim52-frame').value;               // 'braced' o 'unbraced'
  const lu        = parseFloat(luInput.value);                                  // m (longitud libre)
  const bCm       = parseFloat(document.getElementById('sim52-b').value);       // cm
  const hCm       = parseFloat(document.getElementById('sim52-h').value);       // cm (dimensión en el plano de pandeo)
  const psiA      = parseFloat(document.getElementById('sim52-psia').value);    // Rigidez relativa nudo superior
  const psiB      = parseFloat(document.getElementById('sim52-psib').value);    // Rigidez relativa nudo inferior
  const Pu        = parseFloat(document.getElementById('sim52-pu').value);      // kN
  const M1        = parseFloat(document.getElementById('sim52-m1').value);      // kN·m (con signo: + curvatura simple, - doble)
  const M2        = parseFloat(document.getElementById('sim52-m2').value);      // kN·m (> 0, mayor momento de extremo o M2ns)
  const bdns      = parseFloat(document.getElementById('sim52-bdns').value);    // beta_dns
  const fc        = parseFloat(document.getElementById('sim52-fc').value);      // MPa

  const swayControls = document.getElementById('sim52-sway-controls');
  if (swayControls) {
    swayControls.style.display = frameType === 'unbraced' ? 'block' : 'none';
  }
  const swayMethodEl = document.getElementById('sim52-sway-method');
  const swayMethod = swayMethodEl ? swayMethodEl.value : 'q';
  const qValEl = document.getElementById('sim52-q');
  const m2sEl  = document.getElementById('sim52-m2s');
  const qIndex = qValEl ? parseFloat(qValEl.value) : 0.069;
  const M2s    = m2sEl ? parseFloat(m2sEl.value) : 110.0;

  // Actualizar etiquetas
  document.getElementById('val-sim52-lu').textContent   = `${lu.toFixed(2)} m`;
  document.getElementById('val-sim52-b').textContent    = `${bCm.toFixed(0)} cm`;
  document.getElementById('val-sim52-h').textContent    = `${hCm.toFixed(0)} cm`;
  document.getElementById('val-sim52-psia').textContent = psiA.toFixed(2);
  document.getElementById('val-sim52-psib').textContent = psiB.toFixed(2);
  document.getElementById('val-sim52-pu').textContent   = `${Pu.toFixed(0)} kN`;
  document.getElementById('val-sim52-m1').textContent   = `${M1 >= 0 ? '+' : ''}${M1.toFixed(1)} kN·m`;
  document.getElementById('val-sim52-m2').textContent   = `${M2.toFixed(1)} kN·m`;
  document.getElementById('val-sim52-bdns').textContent = bdns.toFixed(2);
  const valQ = document.getElementById('val-sim52-q');
  if (valQ) valQ.textContent = qIndex.toFixed(3);
  const valM2s = document.getElementById('val-sim52-m2s');
  if (valM2s) valM2s.textContent = `${M2s.toFixed(1)} kN·m`;

  // 1. Radio de giro r = 0.30 h (NSR-10 C.10.10.1.2)
  const rM = 0.30 * (hCm / 100.0);
  const psiMin = Math.min(psiA, psiB);
  const psiMean = 0.5 * (psiA + psiB);

  // 2. Factor de longitud efectiva k según ecuaciones analíticas de Jackson & Moreland / ACI
  let k = 1.0;
  if (frameType === 'braced') {
    const k1 = 0.70 + 0.05 * (psiA + psiB);
    const k2 = 0.85 + 0.05 * psiMin;
    k = Math.min(k1, k2, 1.0);
    k = Math.max(0.50, k);
  } else {
    if (psiMean < 2.0) {
      k = ((20.0 - psiMean) / 20.0) * Math.sqrt(1.0 + psiMean);
    } else {
      k = 0.90 * Math.sqrt(1.0 + psiMean);
    }
    k = Math.max(1.0, k);
  }

  // 3. Relación de esbeltez k*lu/r y límite para ignorar esbeltez (C.10.10.1)
  const slenderness = (k * lu) / rM;
  const ratioM1M2 = M2 > 0.01 ? Math.max(-1.0, Math.min(1.0, M1 / M2)) : 0.0;
  const limitSlender = frameType === 'braced'
    ? Math.min(40.0, 34.0 - 12.0 * ratioM1M2)
    : 22.0;
  const isSlender = slenderness > limitSlender;

  // 4. Rigidez a flexión EI (NSR-10 Ec. C.10-15: EI = 0.4 Ec Ig / (1 + bdns)) y Carga crítica de Euler Pc
  const EcMPa = 4700.0 * Math.sqrt(fc); // MPa (NSR-10 C.8.5.1 módulo normal)
  const bM = bCm / 100.0;
  const hM = hCm / 100.0;
  const IgM4 = (bM * Math.pow(hM, 3)) / 12.0;
  const EI_kNm2 = (0.40 * (EcMPa * 1000.0) * IgM4) / (1.0 + bdns); // kN·m2
  const Pc_kN = (Math.PI * Math.PI * EI_kNm2) / Math.pow(k * lu, 2);

  // 5. Coeficiente Cm (Ec. C.10-16), Momento mínimo M2,mín (Ec. C.10-17) y Magnificador delta
  const M2Min = Pu * (0.015 + 0.03 * hM); // kN·m
  let M2DesignBase = Math.max(M2, M2Min);
  let Cm = 1.0;
  let delta = 1.0;
  let Mc = M2DesignBase;
  let isUnstable = false;
  let deltaLabel = 'δns';

  if (frameType === 'braced') {
    Cm = Math.max(0.40, 0.60 + 0.40 * ratioM1M2);
    const denom = 1.0 - Pu / (0.75 * Pc_kN);
    if (denom > 0.02) {
      delta = Math.max(1.0, Cm / denom);
    } else {
      delta = 9.99;
      isUnstable = true;
    }
    Mc = delta * M2DesignBase;
  } else if (swayMethod === 'q') {
    deltaLabel = 'δs';
    Cm = 1.0;
    if (qIndex >= 0.95) {
      delta = 9.99;
      isUnstable = true;
    } else {
      delta = Math.max(1.0, 1.0 / (1.0 - qIndex));
    }
    const M1erOrden = M2 + M2s;
    M2DesignBase = Math.max(M1erOrden, M2Min);
    Mc = Math.max(M2 + delta * M2s, M2Min);
  } else {
    deltaLabel = 'δs';
    Cm = 1.0;
    const denom = 1.0 - Pu / (0.75 * Pc_kN);
    if (denom > 0.02) {
      delta = Math.max(1.0, 1.0 / denom);
    } else {
      delta = 9.99;
      isUnstable = true;
    }
    Mc = delta * M2DesignBase;
  }

  const ratioAmplif = M2DesignBase > 0.01 ? Mc / M2DesignBase : 1.0;

  // Poblar resultados en el DOM
  document.getElementById('res52-k').textContent     = `k = ${k.toFixed(3)} (Ψm = ${psiMean.toFixed(2)})`;
  document.getElementById('res52-klur').textContent  = `${slenderness.toFixed(1)} (Límite C.10.10.1 = ${limitSlender.toFixed(1)})`;
  document.getElementById('res52-ei').textContent    = `${EI_kNm2.toFixed(0)} kN·m² (Ig = ${IgM4.toFixed(5)} m⁴)`;
  document.getElementById('res52-pc').textContent    = `${Pc_kN.toFixed(0)} kN (0.75 Pc = ${(0.75 * Pc_kN).toFixed(0)} kN)`;
  document.getElementById('res52-cm').textContent    = frameType === 'unbraced' && swayMethod === 'q'
    ? `Índice Q = ${qIndex.toFixed(3)} ${qIndex > 0.05 ? '(> 0.05 Traslacional)' : '(≤ 0.05 Arriostrado)'}`
    : `Cm = ${Cm.toFixed(3)} (${M1 >= 0 ? 'Curvatura Simple' : 'Curvatura Doble'})`;
  document.getElementById('res52-m2min').textContent = `${M2Min.toFixed(1)} kN·m`;
  document.getElementById('res52-delta').textContent = `${deltaLabel} = ${delta.toFixed(3)}`;
  document.getElementById('res52-mc').textContent    = `Mc = ${Mc.toFixed(1)} kN·m (Mc/M2 = ${ratioAmplif.toFixed(3)})`;

  const status52 = document.getElementById('res52-status');
  if (isUnstable || (frameType === 'braced' && Pu >= 0.75 * Pc_kN) || (frameType === 'unbraced' && swayMethod === 'q' && qIndex > 0.25)) {
    status52.className = 'status-badge status-danger';
    status52.innerHTML = frameType === 'unbraced' && swayMethod === 'q'
      ? `❌ INESTABILIDAD GLOBAL DEL ENTREPISO (NSR-10 C.10.10.5.2): Q = ${qIndex.toFixed(3)} > 0.25. Rigidice inmediatamente el sistema lateral.`
      : `❌ INESTABILIDAD POR PANDEO: Pu (${Pu.toFixed(0)} kN) ≥ 0.75 Pc (${(0.75 * Pc_kN).toFixed(0)} kN). Aumente inmediatamente las dimensiones de la columna.`;
  } else if (ratioAmplif > 1.40) {
    status52.className = 'status-badge status-danger';
    status52.innerHTML = `❌ EXCEDE LÍMITE DE SEGUNDO ORDEN (NSR-10 C.10.10.2.1): Mc / M2 = ${ratioAmplif.toFixed(2)} > 1.40. Debe rigidizar la columna.`;
  } else if (frameType === 'unbraced' && swayMethod === 'q' && qIndex > 0.05) {
    status52.className = 'status-badge status-warn';
    status52.innerHTML = `⚠️ PÓRTICO TRASLACIONAL (Q = ${qIndex.toFixed(3)} > 0.05): δs = ${delta.toFixed(3)} → Mc = M2ns + δs·M2s = ${Mc.toFixed(1)} kN·m (Mc/M2 = ${ratioAmplif.toFixed(3)} ≤ 1.40).`;
  } else if (!isSlender) {
    status52.className = 'status-badge status-ok';
    status52.innerHTML = `✅ COLUMNA CORTA (k·lu/r = ${slenderness.toFixed(1)} ≤ ${limitSlender.toFixed(1)}): Se permite ignorar efectos de esbeltez. Diseñar con Mc = ${M2DesignBase.toFixed(1)} kN·m.`;
  } else {
    status52.className = 'status-badge status-warn';
    status52.innerHTML = `⚠️ COLUMNA ESBELTA (k·lu/r = ${slenderness.toFixed(1)} > ${limitSlender.toFixed(1)}): Magnificador ${deltaLabel} = ${delta.toFixed(3)} → Momento amplificado Mc = ${Mc.toFixed(1)} kN·m (≤ 1.40 M2).`;
  }

  drawSim52Canvas({
    frameType, lu, k, slenderness, limitSlender,
    M1, M2: M2DesignBase, Mc, delta, isSlender, deltaLabel
  });
}

function drawSim52Canvas(state) {
  const canvas = document.getElementById('canvas-sim52');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const pal = getThemePaletteMod05();
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = pal.bgCanvas;
  ctx.fillRect(0, 0, W, H);

  // Cuadrícula
  ctx.strokeStyle = pal.gridLine;
  ctx.lineWidth = 1;
  for (let x = 30; x < W; x += 30) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 30; y < H; y += 30) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  ctx.fillStyle = pal.textMain;
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    `DEFORMADA DE LA COLUMNA Y AMPLIFICACIÓN DE MOMENTOS DE SEGUNDO ORDEN (k = ${state.k.toFixed(2)}, ${state.deltaLabel} = ${state.delta.toFixed(3)})`,
    W / 2,
    24
  );

  const topY = 65;
  const botY = 335;
  const colH = botY - topY;

  // Panel Izquierdo: Columna y deformada P-delta / P-Delta
  const colX = 220;
  ctx.strokeStyle = pal.concreteStroke;
  ctx.setLineDash([5, 4]);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(colX, topY);
  ctx.lineTo(colX, botY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Curva elástica deformada
  ctx.strokeStyle = pal.nomCurve;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const t = i / 40.0;
    const y = topY + t * colH;
    let dx = 0;
    if (state.frameType === 'braced') {
      const signM1 = state.M1 >= 0 ? 1.0 : -0.85;
      dx = 38.0 * Math.sin(Math.PI * t) * (0.65 + 0.35 * signM1 * Math.cos(Math.PI * t * 0.5));
    } else {
      dx = 52.0 * (1.0 - Math.cos((Math.PI * (1.0 - t)) / 2.0));
    }
    if (i === 0) ctx.moveTo(colX + dx, y);
    else ctx.lineTo(colX + dx, y);
  }
  ctx.stroke();

  // Nudos superior e inferior
  ctx.fillStyle = pal.concreteFill;
  ctx.strokeStyle = pal.concreteStroke;
  ctx.lineWidth = 2;
  ctx.fillRect(colX - 35, topY - 12, 70, 12);
  ctx.strokeRect(colX - 35, topY - 12, 70, 12);
  ctx.fillRect(colX - 35, botY, 70, 12);
  ctx.strokeRect(colX - 35, botY, 70, 12);

  ctx.fillStyle = pal.textMain;
  ctx.font = 'bold 11px JetBrains Mono, monospace';
  ctx.fillText(`lu = ${state.lu.toFixed(2)} m | k·lu = ${(state.k * state.lu).toFixed(2)} m`, colX, botY + 32);

  // Panel Derecho: Diagrama de Momentos de 1er Orden (M1, M2) vs Amplificado (Mc)
  const diagX = 520;
  const maxM = Math.max(state.Mc * 1.15, state.M2 * 1.3, 50.0);
  const scaleM = 145.0 / maxM;

  // Eje vertical de referencia del diagrama de momentos
  ctx.strokeStyle = pal.concreteStroke;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(diagX, topY);
  ctx.lineTo(diagX, botY);
  ctx.stroke();

  const xM2 = diagX + state.M2 * scaleM;
  const xM1 = diagX + state.M1 * scaleM;
  const xMc = diagX + state.Mc * scaleM;

  // Polígono de momento de primer orden
  ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
  ctx.beginPath();
  ctx.moveTo(diagX, topY);
  ctx.lineTo(xM2, topY);
  ctx.lineTo(xM1, botY);
  ctx.lineTo(diagX, botY);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = pal.nomCurve;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(diagX, topY);
  ctx.lineTo(xM2, topY);
  ctx.lineTo(xM1, botY);
  ctx.lineTo(diagX, botY);
  ctx.stroke();

  // Envolvente amplificada de segundo orden Mc
  ctx.strokeStyle = pal.dangerStroke;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  if (state.frameType === 'unbraced') {
    ctx.moveTo(xMc, topY);
    ctx.lineTo(xM1, botY);
  } else {
    ctx.moveTo(xM2, topY);
    ctx.quadraticCurveTo(xMc + 18, (topY + botY) / 2, xM1, botY);
  }
  ctx.stroke();

  ctx.fillStyle = pal.nomCurve;
  ctx.textAlign = 'left';
  ctx.fillText(`1er Orden M2 = ${state.M2.toFixed(1)} kN·m`, xM2 + 8, topY + 12);
  ctx.fillText(`M1 = ${state.M1.toFixed(1)} kN·m`, xM1 + 8, botY - 6);

  ctx.fillStyle = pal.dangerStroke;
  ctx.fillText(
    `2do Orden Mc = ${state.Mc.toFixed(1)} kN·m`,
    Math.max(xM2, xMc) + 10,
    state.frameType === 'unbraced' ? topY + 30 : (topY + botY) / 2
  );
}

function loadSim52Preset(presetKey) {
  if (presetKey === 'ej74_braced') {
    document.getElementById('sim52-frame').value = 'braced';
    document.getElementById('sim52-fc').value = '28';
    document.getElementById('sim52-lu').value = 3.35;
    document.getElementById('sim52-b').value = 40;
    document.getElementById('sim52-h').value = 50;
    document.getElementById('sim52-psia').value = 1.92;
    document.getElementById('sim52-psib').value = 1.03;
    document.getElementById('sim52-pu').value = 1320;
    document.getElementById('sim52-m1').value = -65;
    document.getElementById('sim52-m2').value = 110;
    document.getElementById('sim52-bdns').value = 0.45;
  } else if (presetKey === 'ej76_sway') {
    document.getElementById('sim52-frame').value = 'unbraced';
    document.getElementById('sim52-fc').value = '28';
    document.getElementById('sim52-lu').value = 3.60;
    document.getElementById('sim52-b').value = 45;
    document.getElementById('sim52-h').value = 45;
    document.getElementById('sim52-psia').value = 1.50;
    document.getElementById('sim52-psib').value = 1.50;
    document.getElementById('sim52-pu').value = 1650;
    document.getElementById('sim52-m1').value = 35;
    document.getElementById('sim52-m2').value = 55;
    document.getElementById('sim52-bdns').value = 0.30;
    const qInput = document.getElementById('sim52-q');
    const m2sInput = document.getElementById('sim52-m2s');
    if (qInput) qInput.value = 0.069;
    if (m2sInput) m2sInput.value = 110;
    setSim52SwayMethod('q');
    return;
  } else if (presetKey === 'esbelta_critica') {
    document.getElementById('sim52-frame').value = 'braced';
    document.getElementById('sim52-fc').value = '21';
    document.getElementById('sim52-lu').value = 5.60;
    document.getElementById('sim52-b').value = 35;
    document.getElementById('sim52-h').value = 35;
    document.getElementById('sim52-psia').value = 2.60;
    document.getElementById('sim52-psib').value = 2.40;
    document.getElementById('sim52-pu').value = 950;
    document.getElementById('sim52-m1').value = 70;
    document.getElementById('sim52-m2').value = 100;
    document.getElementById('sim52-bdns').value = 0.70;
  }
  updateSim52();
}

window.redrawAllSimulators = function () {
  updateSim51();
  updateSim52();
};

document.addEventListener('DOMContentLoaded', () => {
  updateSim51();
  updateSim52();
});

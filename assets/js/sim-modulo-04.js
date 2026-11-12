/**
 * ============================================================================
 * SIMULADORES INTERACTIVOS — MÓDULO 04: DISEÑO A CORTANTE Y TENSIÓN DIAGONAL
 * ============================================================================
 * Autor: Prof. Daniel Abudinen, I.C., M.Sc.
 * Simulador 4.1: Diseñador y Zonificador del Diagrama de Cortante y Estribos
 *                en Vigas (NSR-10 C.11.1, C.11.2, C.11.4).
 * Simulador 4.2: Laboratorio de Método Detallado (Ec. C.11-5), Analogía de
 *                Ritter-Mörsch y Cortante Sísmico por Capacidad Ve (DMO/DES).
 * ============================================================================
 */

const STIRRUP_CATALOG = {
  2: { label: 'No. 2 (1/4" - 6.4 mm)', db: 6.4,  areaCm2: 0.32 },
  3: { label: 'No. 3 (3/8" - 9.5 mm)', db: 9.5,  areaCm2: 0.71 },
  4: { label: 'No. 4 (1/2" - 12.7 mm)', db: 12.7, areaCm2: 1.29 }
};

function getThemePaletteMod04() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    isDark,
    bgCanvas: isDark ? '#0B1120' : '#F8FAFC',
    panelBg: isDark ? '#111C33' : '#FFFFFF',
    gridLine: isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(148, 163, 184, 0.22)',
    concreteFill: isDark ? '#1E293B' : '#E2E8F0',
    concreteStroke: isDark ? '#94A3B8' : '#334155',
    vcFill: isDark ? 'rgba(16, 185, 129, 0.22)' : 'rgba(16, 185, 129, 0.16)',
    vcStroke: isDark ? '#34D399' : '#059669',
    vsFill: isDark ? 'rgba(244, 63, 94, 0.28)' : 'rgba(225, 29, 72, 0.18)',
    vsStroke: isDark ? '#FB7185' : '#E11D48',
    zone2Fill: isDark ? 'rgba(245, 158, 11, 0.22)' : 'rgba(245, 158, 11, 0.16)',
    zone2Stroke: isDark ? '#FBBF24' : '#D97706',
    stirrupColor: isDark ? '#38BDF8' : '#0284C7',
    rebarColor: isDark ? '#FBBF24' : '#D97706',
    crackColor: isDark ? '#F87171' : '#DC2626',
    strutColor: isDark ? '#60A5FA' : '#1D4ED8',
    textMain: isDark ? '#F1F5F9' : '#0F172A',
    textSub: isDark ? '#94A3B8' : '#475569'
  };
}

/**
 * ============================================================================
 * SIMULADOR 4.1: DISEÑADOR Y ZONIFICADOR DEL DIAGRAMA DE CORTANTE Y ESTRIBOS
 * ============================================================================
 */
window.sim41Mode = 'design'; // 'design' o 'review'

function setSim41Mode(mode) {
  window.sim41Mode = mode === 'review' ? 'review' : 'design';

  const btnDesign  = document.getElementById('sim41-btn-mode-design');
  const btnReview  = document.getElementById('sim41-btn-mode-review');
  const modeBadge  = document.getElementById('sim41-mode-badge');
  const revControls = document.getElementById('sim41-review-controls');

  const lblPhivs   = document.getElementById('lbl-res41-phivs');
  const lblSreq    = document.getElementById('lbl-res41-sreq');
  const lblSadopt  = document.getElementById('lbl-res41-sadopt');

  if (window.sim41Mode === 'review') {
    if (btnDesign) btnDesign.classList.remove('active');
    if (btnReview) btnReview.classList.add('active');
    if (modeBadge) {
      modeBadge.textContent = '🔍 Modo Revisión';
      modeBadge.style.background = '#059669';
    }
    if (revControls) revControls.style.display = 'block';
    if (lblPhivs)  lblPhivs.innerHTML  = 'Aporte Estribos $\\phi V_s$ (Prov.)';
    if (lblSreq)   lblSreq.innerHTML   = 'Capacidad Total $\\phi V_n$';
    if (lblSadopt) lblSadopt.innerHTML = 'Índice D/C ($V_u / \\phi V_n$)';
  } else {
    if (btnDesign) btnDesign.classList.add('active');
    if (btnReview) btnReview.classList.remove('active');
    if (modeBadge) {
      modeBadge.textContent = '📐 Modo Diseño';
      modeBadge.style.background = '#2563EB';
    }
    if (revControls) revControls.style.display = 'none';
    if (lblPhivs)  lblPhivs.innerHTML  = 'Demanda Estribos $\\phi V_s$';
    if (lblSreq)   lblSreq.innerHTML   = '$s_{\\text{req}}$ por Resistencia';
    if (lblSadopt) lblSadopt.innerHTML = 'Despiece Adoptado';
  }

  if (window.renderMathInElement) {
    const metricsGrid = document.querySelector('#sec-lab-mod04 .sim-metrics-grid');
    if (metricsGrid) {
      window.renderMathInElement(metricsGrid, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ]
      });
    }
  }

  updateSim41();
}

function updateSim41() {
  const lInput = document.getElementById('sim41-L');
  if (!lInput) return;

  const isReview = window.sim41Mode === 'review';
  const L      = parseFloat(lInput.value);                                      // m (luz entre ejes)
  const cApoyo = parseFloat(document.getElementById('sim41-c').value);          // m (ancho apoyo)
  const wu     = parseFloat(document.getElementById('sim41-wu').value);         // kN/m (carga mayorada)
  const Nu     = parseFloat(document.getElementById('sim41-nu').value);         // kN (+ compresión, - tracción)
  const bw     = parseFloat(document.getElementById('sim41-bw').value);         // cm
  const h      = parseFloat(document.getElementById('sim41-h').value);          // cm
  const rec    = parseFloat(document.getElementById('sim41-rec').value);        // cm (h - d)
  const fc     = parseFloat(document.getElementById('sim41-fc').value);         // MPa
  const fyt    = parseFloat(document.getElementById('sim41-fyt').value);        // MPa
  const lambda = parseFloat(document.getElementById('sim41-lambda').value);     // 1.0, 0.85, 0.75
  const barNo  = parseInt(document.getElementById('sim41-bar').value, 10);      // 2, 3, 4
  const legs   = parseInt(document.getElementById('sim41-legs').value, 10);     // 2, 3, 4
  const critAtD = document.getElementById('sim41-crit').value === 'd';          // true: a 'd' de cara; false: en cara
  const sColInput = document.getElementById('sim41-scol');
  const sColCm = sColInput ? parseFloat(sColInput.value) : 12.0;

  // Actualizar etiquetas de controles
  document.getElementById('val-sim41-L').textContent   = `${L.toFixed(2)} m`;
  document.getElementById('val-sim41-c').textContent   = `${cApoyo.toFixed(2)} m`;
  document.getElementById('val-sim41-wu').textContent  = `${wu.toFixed(1)} kN/m`;
  document.getElementById('val-sim41-nu').textContent  = `${Nu >= 0 ? '+' : ''}${Nu.toFixed(0)} kN`;
  document.getElementById('val-sim41-bw').textContent  = `${bw.toFixed(0)} cm`;
  document.getElementById('val-sim41-h').textContent   = `${h.toFixed(0)} cm`;
  document.getElementById('val-sim41-rec').textContent = `${rec.toFixed(1)} cm`;
  const valScolEl = document.getElementById('val-sim41-scol');
  if (valScolEl) valScolEl.textContent = `${sColCm.toFixed(1)} cm`;

  const phi = 0.75; // NSR-10 C.9.3.2.3
  const dCm = Math.max(h - rec, 10.0);
  const dM  = dCm / 100.0;
  const bwMm = bw * 10.0;
  const hMm  = h * 10.0;
  const dMm  = dCm * 10.0;
  const AgMm2 = bwMm * hMm;

  const ln = Math.max(L - cApoyo, 0.5); // Luz libre (m)
  const Ltotal = ln / 2.0;              // Distancia desde cara de apoyo hasta Vu = 0 (m)

  // Cortantes últimos (kN)
  const VuEje  = (wu * L) / 2.0;
  const VuCara = wu * Ltotal;
  const xCritFromFace = critAtD ? Math.min(dM, Ltotal) : 0.0;
  const VuCrit = Math.max(0.0, VuCara - wu * xCritFromFace);

  // Resistencia del concreto Vc según NSR-10 C.11.2.1
  let factorAxial = 1.0;
  const sigmaAxialMPa = (Nu * 1000.0) / AgMm2; // MPa
  if (Nu > 0.01) {
    // Compresión axial C.11.2.1.2 (Ec. C.11-4)
    factorAxial = 1.0 + sigmaAxialMPa / 14.0;
  } else if (Nu < -0.01) {
    // Tracción axial C.11.2.2.3 (Ec. C.11-8)
    factorAxial = Math.max(0.0, 1.0 + 0.29 * sigmaAxialMPa);
  }
  const Vc = (0.17 * factorAxial * lambda * Math.sqrt(fc) * bwMm * dMm) / 1000.0; // kN
  const phiVc = phi * Vc;
  const halfPhiVc = 0.5 * phiVc;

  // Límites de Vs por aplastamiento del alma (NSR-10 C.11.4.5.3 y C.11.4.7.9)
  const VsLim1 = (0.33 * Math.sqrt(fc) * bwMm * dMm) / 1000.0; // kN (0.33 sqrt(fc) bw d)
  const VsMax  = (0.66 * Math.sqrt(fc) * bwMm * dMm) / 1000.0; // kN (0.66 sqrt(fc) bw d)
  const phiVnMax = phiVc + phi * VsMax;

  // Demanda en el acero transversal en la sección crítica
  const phiVsReq = Math.max(0.0, VuCrit - phiVc);
  const VsReq = phiVsReq / phi;

  // Propiedades del estribo seleccionado
  const stirrup = STIRRUP_CATALOG[barNo];
  const AvCm2 = legs * stirrup.areaCm2;
  const AvMm2 = AvCm2 * 100.0;

  // Espaciamientos máximos normativos (cm)
  // 1) Por cuantía mínima Av,min (NSR-10 C.11.4.6.3 Ec. C.11-13)
  const sMaxAvMin1Mm = (AvMm2 * fyt) / (0.062 * Math.sqrt(fc) * bwMm);
  const sMaxAvMin2Mm = (AvMm2 * fyt) / (0.35 * bwMm);
  const sMaxAvMinCm  = Math.min(sMaxAvMin1Mm, sMaxAvMin2Mm) / 10.0;

  // En modo Revisión, evaluamos Vs provisto con sColCm
  const VsColRaw = (AvMm2 * fyt * dMm) / (sColCm * 10.0) / 1000.0; // kN
  const VsColCapped = Math.min(VsColRaw, VsMax);
  const phiVsCol = phi * VsColCapped;
  const phiVnCol = phiVc + phiVsCol;
  const dcRatio  = phiVnCol > 0 ? (VuCrit / phiVnCol) : 99.9;

  // 2) Por geometría según nivel de Vs (NSR-10 C.11.4.5.1 y C.11.4.5.3)
  const vsForGeomCheck = isReview ? Math.max(VsReq, VsColCapped) : VsReq;
  const isHighShear = vsForGeomCheck > VsLim1;
  const sMaxGeomCm  = isHighShear
    ? Math.min(dCm / 4.0, 30.0)
    : Math.min(dCm / 2.0, 60.0);

  const sMaxNormCm = Math.min(sMaxAvMinCm, sMaxGeomCm);

  // Espaciamiento requerido por resistencia en la sección crítica (cm)
  let sStrengthCm = 999.0;
  if (phiVsReq > 0.001) {
    sStrengthCm = (phi * AvMm2 * fyt * dMm) / (phiVsReq * 1000.0) / 10.0;
  }

  // Espaciamiento de diseño en zona crítica y en zona mínima (redondeado hacia abajo a cada 1 cm o 0.5 cm)
  const sCritDesignCm = isReview
    ? sColCm
    : Math.max(5.0, Math.floor(Math.min(sStrengthCm, sMaxNormCm) * 2.0) / 2.0);
  const sMinZoneCm    = isReview
    ? sColCm
    : Math.max(5.0, Math.floor(sMaxNormCm * 2.0) / 2.0);

  // Capacidad real con sCritDesignCm
  const VsProv = Math.min(VsMax, (AvMm2 * fyt * dMm) / (sCritDesignCm * 10.0) / 1000.0); // kN
  const phiVnProv = phi * (Vc + VsProv);

  // Zonificación longitudinal desde la cara del apoyo (m)
  // S = distancia desde la cara del apoyo hasta donde Vu(x) = phi*Vc
  let S_zone3 = 0.0;
  if (VuCara > phiVc && wu > 0) {
    S_zone3 = Math.min(Ltotal, (VuCara - phiVc) / wu);
  }
  // X_zone2 = distancia desde la cara del apoyo hasta donde Vu(x) = 0.5*phi*Vc
  let X_zone2 = 0.0;
  if (VuCara > halfPhiVc && wu > 0) {
    X_zone2 = Math.min(Ltotal, (VuCara - halfPhiVc) / wu);
  }
  const lenZone2 = Math.max(0.0, X_zone2 - S_zone3);
  const lenZone1 = Math.max(0.0, Ltotal - X_zone2);

  // Conteo de estribos desde la cara del apoyo hasta L/2
  const firstStirrupM = 0.05; // Primer estribo a 5 cm de la cara del apoyo
  let nStirrupsZone3 = 0;
  let posM = firstStirrupM;
  const sCritM = sCritDesignCm / 100.0;
  const sMinM  = sMinZoneCm / 100.0;

  const stirrupPositionsM = [];
  if (isReview || VuCrit > halfPhiVc) {
    stirrupPositionsM.push(posM);
    const limitZoneM = isReview ? Ltotal : S_zone3;
    while (posM + sCritM <= limitZoneM + 0.001 && stirrupPositionsM.length < 120) {
      posM += sCritM;
      stirrupPositionsM.push(posM);
      nStirrupsZone3++;
    }
    if (!isReview) {
      while (posM + sMinM <= X_zone2 + 0.001 && stirrupPositionsM.length < 150) {
        posM += sMinM;
        stirrupPositionsM.push(posM);
      }
    }
  }

  // Poblar tarjetas de resultados en el DOM
  document.getElementById('res41-vu-eje').textContent  = `${VuEje.toFixed(2)} kN`;
  document.getElementById('res41-vu-cara').textContent = `${VuCara.toFixed(2)} kN`;
  document.getElementById('res41-vu-crit').textContent = `${VuCrit.toFixed(2)} kN`;
  document.getElementById('res41-phivc').textContent   = `${phiVc.toFixed(2)} kN (Vc = ${Vc.toFixed(1)} kN)`;
  document.getElementById('res41-av').textContent      = `${AvCm2.toFixed(2)} cm² (${legs} ramas ${stirrup.label.split(' ')[0]} ${stirrup.label.split(' ')[1]})`;
  document.getElementById('res41-smax').textContent    = `${sMaxNormCm.toFixed(1)} cm (Geom: ${sMaxGeomCm.toFixed(1)} | Av,mín: ${sMaxAvMinCm.toFixed(1)})`;
  document.getElementById('res41-zonas').textContent   = `S (Zona 3) = ${S_zone3.toFixed(2)} m | L2 (Zona 2) = ${lenZone2.toFixed(2)} m | L1 (Zona 1) = ${lenZone1.toFixed(2)} m (Ltotal = ${Ltotal.toFixed(2)} m)`;

  const statusEl = document.getElementById('res41-status');

  if (isReview) {
    document.getElementById('res41-phivs').textContent  = `${phiVsCol.toFixed(2)} kN (Vs = ${VsColCapped.toFixed(1)} kN @ s=${sColCm.toFixed(1)} cm)`;
    document.getElementById('res41-sreq').textContent   = `φVn = ${phiVnCol.toFixed(2)} kN`;
    document.getElementById('res41-sadopt').textContent = `D/C = ${dcRatio.toFixed(2)} (${dcRatio <= 1.0 && sColCm <= sMaxNormCm + 0.05 ? 'CUMPLE ✓' : 'NO CUMPLE ✗'})`;

    const spacingOk  = (VuCrit <= halfPhiVc) || (sColCm <= sMaxNormCm + 0.05);
    const strengthOk = phiVnCol >= VuCrit - 0.05;
    const webOk      = VsReq <= VsMax;

    if (!webOk) {
      statusEl.className = 'status-badge status-danger';
      statusEl.innerHTML = `❌ REVISIÓN NO CUMPLE (APLASTAMIENTO DEL ALMA): La demanda Vs,req = ${VsReq.toFixed(1)} kN supera Vs,máx = ${VsMax.toFixed(1)} kN (0.66√f'c bw d). Debe ampliarse la sección.`;
    } else if (!strengthOk) {
      statusEl.className = 'status-badge status-danger';
      statusEl.innerHTML = `❌ REVISIÓN NO CUMPLE POR RESISTENCIA (D/C = ${dcRatio.toFixed(2)} > 1.00): Con estribos @ ${sColCm.toFixed(1)} cm, φVn = ${phiVnCol.toFixed(1)} kN < Vu,crit = ${VuCrit.toFixed(1)} kN (se requiere s ≤ ${Math.min(sStrengthCm, sMaxNormCm).toFixed(1)} cm).`;
    } else if (!spacingOk) {
      statusEl.className = 'status-badge status-warn';
      statusEl.innerHTML = `⚠️ REVISIÓN NO CUMPLE ESPACIAMIENTO MÁXIMO: Aunque φVn = ${phiVnCol.toFixed(1)} kN ≥ Vu = ${VuCrit.toFixed(1)} kN (D/C = ${dcRatio.toFixed(2)}), la separación existente s_col = ${sColCm.toFixed(1)} cm excede s_máx = ${sMaxNormCm.toFixed(1)} cm.`;
    } else {
      statusEl.className = 'status-badge status-ok';
      statusEl.innerHTML = `✅ REVISIÓN SATISFACTORIA (D/C = ${dcRatio.toFixed(2)} ≤ 1.00): Con estribos @ s_col = ${sColCm.toFixed(1)} cm ≤ s_máx (${sMaxNormCm.toFixed(1)} cm), la capacidad φVn = ${phiVnCol.toFixed(1)} kN supera la demanda Vu,crit = ${VuCrit.toFixed(1)} kN.`;
    }
  } else {
    document.getElementById('res41-phivs').textContent  = `${phiVsReq.toFixed(2)} kN (Vs = ${VsReq.toFixed(1)} kN)`;
    document.getElementById('res41-sreq').textContent   = phiVsReq > 0.001 ? `${sStrengthCm.toFixed(1)} cm` : 'No req. por cálculo (rige Av,mín)';
    document.getElementById('res41-sadopt').textContent = VuCrit <= halfPhiVc
      ? 'Zona 1: No requiere por resistencia'
      : `1 E @ 5 cm + E @ ${sCritDesignCm.toFixed(1)} cm (Zona 3) y @ ${sMinZoneCm.toFixed(1)} cm (Zona 2)`;

    if (VsReq > VsMax) {
      statusEl.className = 'status-badge status-danger';
      statusEl.innerHTML = `❌ SECCIÓN INSUFICIENTE (ZONA 4): Vs = ${VsReq.toFixed(1)} kN > Vs,máx = ${VsMax.toFixed(1)} kN (0.66√f'c bw d). Aumente bw, d o f'c.`;
    } else if (VuCrit <= halfPhiVc) {
      statusEl.className = 'status-badge status-ok';
      statusEl.innerHTML = `✅ ZONA 1 (Vu ≤ 0.5 φVc = ${halfPhiVc.toFixed(1)} kN): El concreto resiste holgadamente. Se colocan estribos constructivos @ d/2 = ${(dCm / 2).toFixed(0)} cm.`;
    } else if (VuCrit <= phiVc) {
      statusEl.className = 'status-badge status-ok';
      statusEl.innerHTML = `✅ ZONA 2 (0.5 φVc < Vu ≤ φVc): Requiere armadura mínima Av,mín @ s_máx = ${sMinZoneCm.toFixed(1)} cm hasta x = ${X_zone2.toFixed(2)} m de la cara.`;
    } else if (isHighShear) {
      statusEl.className = 'status-badge status-warn';
      statusEl.innerHTML = `⚠️ ZONA 3 DE CORTANTE ALTO (0.33√f'c bw d < Vs ≤ 0.66√f'c bw d): s_máx se reduce a mín(d/4, 30 cm) = ${sMaxGeomCm.toFixed(1)} cm. Estribos @ ${sCritDesignCm.toFixed(1)} cm (φVn = ${phiVnProv.toFixed(1)} kN).`;
    } else {
      statusEl.className = 'status-badge status-ok';
      statusEl.innerHTML = `✅ ZONA 3 DE DISEÑO ESTÁNDAR (Vs ≤ 0.33√f'c bw d = ${VsLim1.toFixed(1)} kN): Estribos @ ${sCritDesignCm.toFixed(1)} cm en S = ${S_zone3.toFixed(2)} m (φVn = ${phiVnProv.toFixed(1)} kN ≥ Vu = ${VuCrit.toFixed(1)} kN).`;
    }
  }

  // Actualizar Tacómetro Dinámico de Zonas de Cortante (#sim41-tachometer-card)
  const tachoNeedle = document.getElementById('sim41-tacho-needle');
  const tachoBadge  = document.getElementById('sim41-tacho-badge');
  const tachoRatio  = document.getElementById('sim41-tacho-val-ratio');
  const tachoVs     = document.getElementById('sim41-tacho-val-vs');
  const tachoZone   = document.getElementById('sim41-tacho-val-zone');

  if (tachoNeedle && tachoBadge && tachoRatio && tachoVs && tachoZone) {
    const phiVnLim1 = phiVc + phi * VsLim1;
    let needlePct = 5.0;

    if (VuCrit <= halfPhiVc && halfPhiVc > 0) {
      needlePct = (VuCrit / halfPhiVc) * 18.0;
      tachoBadge.className = 'sim-tacho-zone-badge zone-tension';
      tachoBadge.textContent = 'ZONA 1 • Vu ≤ 0.5φVc (ESTRIBOS CONSTRUCTIVOS)';
    } else if (VuCrit <= phiVc && phiVc > halfPhiVc) {
      needlePct = 18.0 + ((VuCrit - halfPhiVc) / (phiVc - halfPhiVc)) * 20.0;
      tachoBadge.className = 'sim-tacho-zone-badge zone-tension';
      tachoBadge.textContent = 'ZONA 2 • 0.5φVc < Vu ≤ φVc (RIGE Av,mín)';
    } else if (VuCrit <= phiVnLim1 && phiVnLim1 > phiVc) {
      needlePct = 38.0 + ((VuCrit - phiVc) / (phiVnLim1 - phiVc)) * 27.0;
      tachoBadge.className = 'sim-tacho-zone-badge zone-tension';
      tachoBadge.textContent = 'ZONA 3A • DISEÑO ESTÁNDAR (s ≤ d/2)';
    } else if (VuCrit <= phiVnMax && phiVnMax > phiVnLim1) {
      needlePct = 65.0 + ((VuCrit - phiVnLim1) / (phiVnMax - phiVnLim1)) * 20.0;
      tachoBadge.className = 'sim-tacho-zone-badge zone-trans';
      tachoBadge.textContent = 'ZONA 3B • CORTANTE ALTO (s ≤ d/4)';
    } else {
      const overRatio = phiVnMax > 0 ? (VuCrit - phiVnMax) / (0.35 * phiVnMax) : 1.0;
      needlePct = Math.min(98.0, 85.0 + Math.max(0.0, overRatio) * 13.0);
      tachoBadge.className = 'sim-tacho-zone-badge zone-comp';
      tachoBadge.textContent = 'ZONA 4 • SECCIÓN INSUFICIENTE (Vs > Vs,máx)';
    }

    tachoNeedle.style.left = `${Math.max(2.0, Math.min(98.0, needlePct)).toFixed(1)}%`;
    const ratioDemMax = phiVnMax > 0 ? (VuCrit / phiVnMax) : 0.0;
    if (isReview) {
      tachoRatio.textContent = `Índice D/C = Vu,crit / φVn = ${dcRatio.toFixed(2)} (${VuCrit.toFixed(1)} / ${phiVnCol.toFixed(1)} kN)`;
      tachoVs.textContent    = `Vs,prov = ${VsColCapped.toFixed(1)} kN vs. Vs,req = ${VsReq.toFixed(1)} kN (Vs,máx = ${VsMax.toFixed(1)} kN)`;
      tachoZone.textContent  = `s_col = ${sColCm.toFixed(1)} cm ${sColCm <= sMaxNormCm + 0.05 ? '≤' : '>'} s_máx = ${sMaxNormCm.toFixed(1)} cm`;
    } else {
      tachoRatio.textContent = `Vu,crit / φVn,máx = ${ratioDemMax.toFixed(2)} (${VuCrit.toFixed(1)} / ${phiVnMax.toFixed(1)} kN)`;
      tachoVs.textContent    = `Vs = ${VsReq.toFixed(1)} kN ${VsReq <= VsMax ? '≤' : '>'} Vs,máx (${VsMax.toFixed(1)} kN)`;
      tachoZone.textContent  = `s_máx = ${sMaxNormCm.toFixed(1)} cm (Geom: ${sMaxGeomCm.toFixed(1)} cm | Adoptado: ${sCritDesignCm.toFixed(1)} cm)`;
    }
  }

  drawSim41Canvas({
    isReview, sColCm, phiVnCol, dcRatio,
    L, cApoyo, wu, bw, h, dCm, dM, Ltotal,
    VuEje, VuCara, VuCrit, xCritFromFace,
    phiVc, halfPhiVc, phiVsReq, phiVnMax,
    S_zone3, X_zone2, sCritDesignCm, sMinZoneCm,
    stirrupPositionsM, legs, stirrup, critAtD
  });
}

function drawSim41Canvas(state) {
  const canvas = document.getElementById('canvas-sim41');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const pal = getThemePaletteMod04();

  const baseW = 920;
  const baseH = 430;
  const parentW = canvas.parentElement ? canvas.parentElement.clientWidth : baseW;
  const displayW = Math.max(280, Math.min(baseW, parentW - 24));
  const scale = displayW / baseW;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.round(displayW * dpr);
  canvas.height = Math.round(baseH * scale * dpr);
  canvas.style.width = displayW + "px";
  canvas.style.height = Math.round(baseH * scale) + "px";

  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);

  const W = baseW;
  const H = baseH;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = pal.bgCanvas;
  ctx.fillRect(0, 0, W, H);

  // Cuadrícula sutil
  ctx.strokeStyle = pal.gridLine;
  ctx.lineWidth = 1;
  for (let x = 30; x < W; x += 30) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 30; y < H; y += 30) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Dividir lienzo:
  // Izquierda (x: 55..620): Arriba Diagrama de Cortante (y: 40..245), Abajo Viga + Estribos (y: 295..415)
  // Derecha (x: 650..900): Sección transversal de la viga con ramas y ganchos 135°
  const plotLeft = 75;
  const plotRight = 610;
  const plotW = plotRight - plotLeft;

  const diagTop = 42;
  const diagBot = 240;
  const diagH = diagBot - diagTop;

  // Escala horizontal: desde el eje del apoyo (-cApoyo/2) hasta L/2 (centro de luz)
  const halfC = state.cApoyo / 2.0;
  const totalHorizM = halfC + state.Ltotal;
  const xFacePx = plotLeft + (halfC / totalHorizM) * plotW;
  const mToPx = (mFromFace) => xFacePx + (mFromFace / totalHorizM) * plotW;

  // Escala vertical de fuerza cortante
  const vMaxPlot = Math.max(state.VuEje * 1.15, state.phiVc * 1.35, 50.0);
  const vToY = (v) => diagBot - Math.min(1.08, Math.max(0.0, v / vMaxPlot)) * diagH;

  // Título superior izquierdo
  ctx.fillStyle = pal.textMain;
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('DIAGRAMA DE CORTANTE MAYORADO Vu(x) Y ZONIFICACIÓN (MITAD SIMÉTRICA DE LA VIGA)', plotLeft - 15, 24);

  // Sombreado de capacidad del concreto phi*Vc (desde cara del apoyo x=0 hasta Ltotal)
  const yPhiVc = vToY(state.phiVc);
  const yHalfPhiVc = vToY(state.halfPhiVc);
  const yVuCara = vToY(state.VuCara);
  const yVuCrit = vToY(state.VuCrit);
  const xCritPx = mToPx(state.xCritFromFace);
  const xZone3Px = mToPx(state.S_zone3);
  const xZone2Px = mToPx(state.X_zone2);

  // Polígono verde: resistencia aportada por el concreto (mínimo entre Vu(x) y phi*Vc)
  ctx.fillStyle = pal.vcFill;
  ctx.beginPath();
  ctx.moveTo(xFacePx, diagBot);
  if (state.VuCara > state.phiVc) {
    ctx.lineTo(xFacePx, yPhiVc);
    ctx.lineTo(xZone3Px, yPhiVc);
  } else {
    ctx.lineTo(xFacePx, yVuCara);
  }
  ctx.lineTo(plotRight, diagBot);
  ctx.closePath();
  ctx.fill();

  // Polígono rojo: demanda que deben tomar los estribos (Vu - phi*Vc) en Zona 3
  if (state.VuCara > state.phiVc) {
    ctx.fillStyle = pal.vsFill;
    ctx.beginPath();
    ctx.moveTo(xFacePx, yPhiVc);
    ctx.lineTo(xFacePx, yVuCara);
    ctx.lineTo(xZone3Px, yPhiVc);
    ctx.closePath();
    ctx.fill();

    // Achurado diagonal dentro del triángulo (Vu - phi*Vc)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(xFacePx, yPhiVc);
    ctx.lineTo(xFacePx, yVuCara);
    ctx.lineTo(xZone3Px, yPhiVc);
    ctx.closePath();
    ctx.clip();
    ctx.strokeStyle = pal.vsStroke;
    ctx.lineWidth = 1;
    for (let hx = xFacePx - 150; hx < xZone3Px + 50; hx += 10) {
      ctx.beginPath();
      ctx.moveTo(hx, yVuCara - 10);
      ctx.lineTo(hx + 120, yPhiVc + 10);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Ejes del diagrama de cortante
  ctx.strokeStyle = pal.concreteStroke;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(plotLeft, diagTop);
  ctx.lineTo(plotLeft, diagBot);
  ctx.lineTo(plotRight, diagBot);
  ctx.stroke();

  // Línea vertical de cara del apoyo (x = 0)
  ctx.strokeStyle = pal.textSub;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(xFacePx, diagTop);
  ctx.lineTo(xFacePx, diagBot + 55);
  ctx.stroke();

  // Línea horizontal de phi*Vc y 0.5*phi*Vc
  ctx.strokeStyle = pal.vcStroke;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(xFacePx, yPhiVc);
  ctx.lineTo(plotRight, yPhiVc);
  ctx.stroke();

  ctx.strokeStyle = pal.zone2Stroke;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(xFacePx, yHalfPhiVc);
  ctx.lineTo(plotRight, yHalfPhiVc);
  ctx.stroke();
  ctx.setLineDash([]);

  // Etiquetas de phi*Vc y 0.5*phi*Vc
  ctx.font = 'bold 11px JetBrains Mono, monospace';
  ctx.fillStyle = pal.vcStroke;
  ctx.textAlign = 'right';
  ctx.fillText(`φVc = ${state.phiVc.toFixed(1)} kN`, plotRight - 6, yPhiVc - 5);

  ctx.fillStyle = pal.zone2Stroke;
  ctx.fillText(`0.5φVc = ${state.halfPhiVc.toFixed(1)} kN`, plotRight - 6, yHalfPhiVc - 5);

  // Recta principal de cortante Vu(x) desde el eje hasta L/2
  const yVuEje = vToY(state.VuEje);
  ctx.strokeStyle = pal.textMain;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(plotLeft, yVuEje);
  ctx.lineTo(xFacePx, yVuCara);
  ctx.lineTo(plotRight, diagBot);
  ctx.stroke();

  // Punto y ordenada de la sección crítica (a distancia d de la cara)
  ctx.strokeStyle = pal.vsStroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(xCritPx, diagBot);
  ctx.lineTo(xCritPx, yVuCrit);
  ctx.stroke();

  ctx.fillStyle = pal.vsStroke;
  ctx.beginPath();
  ctx.arc(xCritPx, yVuCrit, 4.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = 'bold 11px JetBrains Mono, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(
    state.critAtD ? `Vu(d) = ${state.VuCrit.toFixed(1)} kN` : `Vu(cara) = ${state.VuCrit.toFixed(1)} kN`,
    xCritPx + 6,
    Math.max(diagTop + 14, yVuCrit - 6)
  );

  // Etiqueta Vu en el eje
  ctx.fillStyle = pal.textSub;
  ctx.textAlign = 'right';
  ctx.fillText(`${state.VuEje.toFixed(0)} kN`, plotLeft - 6, yVuEje + 4);
  ctx.fillText('0 kN', plotLeft - 6, diagBot + 4);

  // Cotas de Zonas debajo del diagrama (y = 255..282)
  const yZoneBar = 258;
  // Zona 3: 0 a S_zone3
  if (state.S_zone3 > 0.01) {
    ctx.fillStyle = pal.vsFill;
    ctx.fillRect(xFacePx, yZoneBar, xZone3Px - xFacePx, 18);
    ctx.strokeStyle = pal.vsStroke;
    ctx.strokeRect(xFacePx, yZoneBar, xZone3Px - xFacePx, 18);
    ctx.fillStyle = pal.vsStroke;
    ctx.font = 'bold 10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    if (xZone3Px - xFacePx > 65) {
      ctx.fillText(`ZONA 3 (S=${state.S_zone3.toFixed(2)}m)`, (xFacePx + xZone3Px) / 2, yZoneBar + 13);
    }
  }
  // Zona 2: S_zone3 a X_zone2
  if (state.X_zone2 - state.S_zone3 > 0.01) {
    ctx.fillStyle = pal.zone2Fill;
    ctx.fillRect(xZone3Px, yZoneBar, xZone2Px - xZone3Px, 18);
    ctx.strokeStyle = pal.zone2Stroke;
    ctx.strokeRect(xZone3Px, yZoneBar, xZone2Px - xZone3Px, 18);
    ctx.fillStyle = pal.zone2Stroke;
    ctx.font = 'bold 10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    if (xZone2Px - xZone3Px > 60) {
      ctx.fillText(`ZONA 2 (${(state.X_zone2 - state.S_zone3).toFixed(2)}m)`, (xZone3Px + xZone2Px) / 2, yZoneBar + 13);
    }
  }
  // Zona 1: X_zone2 a Ltotal
  if (state.Ltotal - state.X_zone2 > 0.01) {
    ctx.fillStyle = pal.vcFill;
    ctx.fillRect(xZone2Px, yZoneBar, plotRight - xZone2Px, 18);
    ctx.strokeStyle = pal.vcStroke;
    ctx.strokeRect(xZone2Px, yZoneBar, plotRight - xZone2Px, 18);
    ctx.fillStyle = pal.vcStroke;
    ctx.font = 'bold 10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    if (plotRight - xZone2Px > 60) {
      ctx.fillText(`ZONA 1 (${(state.Ltotal - state.X_zone2).toFixed(2)}m)`, (xZone2Px + plotRight) / 2, yZoneBar + 13);
    }
  }

  // =========================================================================
  // MITAD INFERIOR IZQUIERDA: VIGA LONGITUDINAL, FISURA A 45° Y ESTRIBOS
  // =========================================================================
  const beamTop = 305;
  const beamH = 86;
  const beamBot = beamTop + beamH;

  // Columna de apoyo izquierda
  const colW = Math.max(18, (xFacePx - plotLeft) * 2.0);
  const colLeft = plotLeft - (colW - (xFacePx - plotLeft));
  ctx.fillStyle = pal.concreteFill;
  ctx.strokeStyle = pal.concreteStroke;
  ctx.lineWidth = 1.8;
  ctx.fillRect(colLeft, beamTop - 16, xFacePx - colLeft, beamH + 52);
  ctx.strokeRect(colLeft, beamTop - 16, xFacePx - colLeft, beamH + 52);

  // Cuerpo de la viga hasta el eje de simetría L/2
  ctx.fillRect(xFacePx, beamTop, plotRight - xFacePx, beamH);
  ctx.strokeRect(xFacePx, beamTop, plotRight - xFacePx, beamH);

  // Línea de simetría en x = L/2 (plotRight)
  ctx.strokeStyle = pal.neutralAxis || '#F59E0B';
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(plotRight, beamTop - 12);
  ctx.lineTo(plotRight, beamBot + 16);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = pal.textSub;
  ctx.font = 'bold 10px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Eje CL (L/2)', plotRight, beamBot + 28);

  // Armadura longitudinal superior e inferior
  ctx.strokeStyle = pal.rebarColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(colLeft + 6, beamTop + 10);
  ctx.lineTo(plotRight, beamTop + 10);
  ctx.moveTo(colLeft + 6, beamBot - 10);
  ctx.lineTo(plotRight, beamBot - 10);
  ctx.stroke();

  // Fisura potencial de tensión diagonal a 45° desde la cara inferior del apoyo hasta d
  if (state.critAtD) {
    ctx.strokeStyle = pal.crackColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(xFacePx, beamBot - 6);
    ctx.lineTo(xCritPx, beamTop + 8);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Dibujar estribos a escala a lo largo de la viga
  ctx.strokeStyle = pal.stirrupColor;
  ctx.lineWidth = 2;
  state.stirrupPositionsM.forEach((posM) => {
    const sx = mToPx(posM);
    if (sx <= plotRight) {
      ctx.beginPath();
      ctx.moveTo(sx, beamTop + 8);
      ctx.lineTo(sx, beamBot - 8);
      ctx.stroke();
    }
  });

  // Etiqueta del despiece debajo de la viga
  ctx.fillStyle = pal.textMain;
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.textAlign = 'left';
  const despieceText = state.isReview
    ? `Modo Revisión: Estribos @ s_col = ${state.sColCm.toFixed(1)} cm | φVn = ${state.phiVnCol.toFixed(1)} kN (D/C = ${state.dcRatio.toFixed(2)})`
    : (state.VuCrit <= state.halfPhiVc
      ? `Despiece constructivo: E @ ${(state.dCm / 2).toFixed(0)} cm`
      : `Despiece: 1 E @ 5 cm + Zona 3 @ ${state.sCritDesignCm.toFixed(1)} cm + Zona 2 @ ${state.sMinZoneCm.toFixed(1)} cm`);
  ctx.fillText(despieceText, xFacePx + 4, beamBot + 22);

  // =========================================================================
  // PANEL DERECHO: SECCIÓN TRANSVERSAL CON RAMAS Y GANCHOS SÍSMICOS 135°
  // =========================================================================
  const secCenterX = 775;
  const secCenterY = 225;
  const scaleSec = Math.min(180 / state.bw, 260 / state.h);
  const secW = Math.max(70, state.bw * scaleSec);
  const secH = Math.max(100, state.h * scaleSec);
  const secLeft = secCenterX - secW / 2;
  const secTop  = secCenterY - secH / 2;

  ctx.fillStyle = pal.textMain;
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SECCIÓN TRANSVERSAL Y RAMAS (Av)', secCenterX, 24);

  // Contorno de concreto
  ctx.fillStyle = pal.concreteFill;
  ctx.strokeStyle = pal.concreteStroke;
  ctx.lineWidth = 2;
  ctx.fillRect(secLeft, secTop, secW, secH);
  ctx.strokeRect(secLeft, secTop, secW, secH);

  // Estribo perimetral
  const pad = 14;
  const stLeft = secLeft + pad;
  const stTop  = secTop + pad;
  const stW    = secW - 2 * pad;
  const stH    = secH - 2 * pad;

  ctx.strokeStyle = pal.stirrupColor;
  ctx.lineWidth = 2.6;
  ctx.strokeRect(stLeft, stTop, stW, stH);

  // Ganchos sísmicos a 135° en la esquina superior derecha
  ctx.beginPath();
  ctx.moveTo(stLeft + stW, stTop + 4);
  ctx.lineTo(stLeft + stW - 14, stTop + 18);
  ctx.moveTo(stLeft + stW - 4, stTop);
  ctx.lineTo(stLeft + stW - 18, stTop + 14);
  ctx.stroke();

  // Ramas internas adicionales si legs === 3 o legs === 4
  if (state.legs === 3) {
    const midX = stLeft + stW / 2;
    ctx.beginPath();
    ctx.moveTo(midX, stTop);
    ctx.lineTo(midX, stTop + stH);
    ctx.stroke();
  } else if (state.legs === 4) {
    const x1 = stLeft + stW / 3;
    const x2 = stLeft + (2 * stW) / 3;
    ctx.strokeRect(x1, stTop, x2 - x1, stH);
  }

  // Barras longitudinales en las esquinas/ramas
  const nBarsDraw = Math.max(2, state.legs);
  for (let i = 0; i < nBarsDraw; i++) {
    const bx = nBarsDraw === 1 ? stLeft + stW / 2 : stLeft + 5 + (i * (stW - 10)) / (nBarsDraw - 1);
    // Superiores
    ctx.fillStyle = pal.rebarColor;
    ctx.beginPath();
    ctx.arc(bx, stTop + 5, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // Inferiores
    ctx.beginPath();
    ctx.arc(bx, stTop + stH - 5, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cotas de la sección
  ctx.fillStyle = pal.textMain;
  ctx.font = 'bold 11px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`bw = ${state.bw.toFixed(0)} cm`, secCenterX, secTop + secH + 20);
  ctx.fillText(`h = ${state.h.toFixed(0)} cm | d = ${state.dCm.toFixed(1)} cm`, secCenterX, secTop + secH + 38);
  ctx.fillStyle = pal.stirrupColor;
  ctx.fillText(`${state.legs} ramas ${state.stirrup.label.split(' ')[0]} ${state.stirrup.label.split(' ')[1]}`, secCenterX, secTop + secH + 56);
  ctx.fillText(`Av = ${(state.legs * state.stirrup.areaCm2).toFixed(2)} cm² | Ganchos 135°`, secCenterX, secTop + secH + 74);
}

function loadSim41Preset(presetKey) {
  const sColEl = document.getElementById('sim41-scol');
  if (presetKey === 'ej41_clasico') {
    // Ejemplo 4.1: Viga de 0.30 x 0.50 m, d = 0.41 m, L = 6.13 m (Ltotal = 2.94 m, apoyo = 0.25 m), wu = 52.85 kN/m -> Vu(d) = 133.72 kN, fc = 21.1 MPa, fyt = 240 MPa
    document.getElementById('sim41-L').value = 6.13;
    document.getElementById('sim41-c').value = 0.25;
    document.getElementById('sim41-wu').value = 52.85;
    document.getElementById('sim41-nu').value = 0;
    document.getElementById('sim41-bw').value = 30;
    document.getElementById('sim41-h').value = 50;
    document.getElementById('sim41-rec').value = 9.0;
    document.getElementById('sim41-fc').value = '21.1';
    document.getElementById('sim41-fyt').value = '240';
    document.getElementById('sim41-lambda').value = '1.0';
    document.getElementById('sim41-bar').value = '3';
    document.getElementById('sim41-legs').value = '2';
    document.getElementById('sim41-crit').value = 'd';
    if (sColEl) sColEl.value = 12.0;
  } else if (presetKey === 'ej42_vigueta') {
    // Ejemplo 4.2A: Vigueta 0.12 x 0.40 m, d = 35.5 cm, L = 6.50 m, c = 0.40 m, wu = 10.6 kN/m, fc = 28 MPa, fyt = 420 MPa, Estribo No. 2
    document.getElementById('sim41-L').value = 6.50;
    document.getElementById('sim41-c').value = 0.40;
    document.getElementById('sim41-wu').value = 10.6;
    document.getElementById('sim41-nu').value = 0;
    document.getElementById('sim41-bw').value = 12;
    document.getElementById('sim41-h').value = 40;
    document.getElementById('sim41-rec').value = 4.5;
    document.getElementById('sim41-fc').value = '28';
    document.getElementById('sim41-fyt').value = '420';
    document.getElementById('sim41-lambda').value = '1.0';
    document.getElementById('sim41-bar').value = '2';
    document.getElementById('sim41-legs').value = '2';
    document.getElementById('sim41-crit').value = 'd';
    if (sColEl) sColEl.value = 17.5;
  } else if (presetKey === 'ej42_vigaB') {
    // Ejemplo 4.2B: Viga Principal B 0.40 x 0.40 m, d = 34 cm, L = 5.78 m, c = 0.35 m, wu = 94.7 kN/m, fc = 28 MPa, fyt = 420 MPa, Estribo No. 3
    document.getElementById('sim41-L').value = 5.78;
    document.getElementById('sim41-c').value = 0.35;
    document.getElementById('sim41-wu').value = 94.7;
    document.getElementById('sim41-nu').value = 0;
    document.getElementById('sim41-bw').value = 40;
    document.getElementById('sim41-h').value = 40;
    document.getElementById('sim41-rec').value = 6.0;
    document.getElementById('sim41-fc').value = '28';
    document.getElementById('sim41-fyt').value = '420';
    document.getElementById('sim41-lambda').value = '1.0';
    document.getElementById('sim41-bar').value = '3';
    document.getElementById('sim41-legs').value = '2';
    document.getElementById('sim41-crit').value = 'd';
    if (sColEl) sColEl.value = 11.5;
  } else if (presetKey === 'alta_demanda') {
    // Viga con cortante muy elevado (0.33 sqrt(fc) bw d < Vs <= 0.66 sqrt(fc) bw d) y 4 ramas
    document.getElementById('sim41-L').value = 7.20;
    document.getElementById('sim41-c').value = 0.50;
    document.getElementById('sim41-wu').value = 185.0;
    document.getElementById('sim41-nu').value = 0;
    document.getElementById('sim41-bw').value = 40;
    document.getElementById('sim41-h').value = 65;
    document.getElementById('sim41-rec').value = 6.5;
    document.getElementById('sim41-fc').value = '28';
    document.getElementById('sim41-fyt').value = '420';
    document.getElementById('sim41-lambda').value = '1.0';
    document.getElementById('sim41-bar').value = '3';
    document.getElementById('sim41-legs').value = '4';
    document.getElementById('sim41-crit').value = 'd';
    if (sColEl) sColEl.value = 11.0;
  }
  updateSim41();
}

/**
 * ============================================================================
 * SIMULADOR 4.2: MÉTODO DETALLADO (EC. C.11-5) Y CORTANTE POR CAPACIDAD SÍSMICA
 *                Ve EN VIGAS DMO / DES (NSR-10 C.21.3.4 Y C.21.5.4)
 * ============================================================================
 */
function updateSim42() {
  const lnInput = document.getElementById('sim42-ln');
  if (!lnInput) return;

  const ln      = parseFloat(lnInput.value);                                    // m (luz libre)
  const bw      = parseFloat(document.getElementById('sim42-bw').value);        // cm
  const h       = parseFloat(document.getElementById('sim42-h').value);         // cm
  const d       = parseFloat(document.getElementById('sim42-d').value);         // cm
  const fc      = parseFloat(document.getElementById('sim42-fc').value);        // MPa
  const fy      = parseFloat(document.getElementById('sim42-fy').value);        // MPa
  const AsTop   = parseFloat(document.getElementById('sim42-astop').value);     // cm2 (As- en nudo)
  const AsBot   = parseFloat(document.getElementById('sim42-asbot').value);     // cm2 (As+ en nudo)
  const wg      = parseFloat(document.getElementById('sim42-wg').value);        // kN/m (1.2D + 1.0L)
  const Nu      = parseFloat(document.getElementById('sim42-nu').value);        // kN (+ compresión)
  const sysType = document.getElementById('sim42-sys').value;                   // 'DES' o 'DMO'
  const dbLong  = parseFloat(document.getElementById('sim42-dblong').value);    // mm (barra long más delgada)

  // Actualizar etiquetas
  document.getElementById('val-sim42-ln').textContent    = `${ln.toFixed(2)} m`;
  document.getElementById('val-sim42-bw').textContent    = `${bw.toFixed(0)} cm`;
  document.getElementById('val-sim42-h').textContent     = `${h.toFixed(0)} cm`;
  document.getElementById('val-sim42-d').textContent     = `${d.toFixed(1)} cm`;
  document.getElementById('val-sim42-astop').textContent = `${AsTop.toFixed(2)} cm²`;
  document.getElementById('val-sim42-asbot').textContent = `${AsBot.toFixed(2)} cm²`;
  document.getElementById('val-sim42-wg').textContent    = `${wg.toFixed(1)} kN/m`;
  document.getElementById('val-sim42-nu').textContent    = `${Nu >= 0 ? '+' : ''}${Nu.toFixed(0)} kN`;

  const bwMm = bw * 10.0;
  const hMm  = h * 10.0;
  const dMm  = d * 10.0;
  const AgMm2 = bwMm * hMm;
  const phi = 0.75;

  // 1. Cálculo de momentos probables (DES: alpha = 1.25, phi = 1.0) o nominales (DMO: alpha = 1.0, phi = 1.0)
  const alphaOver = sysType === 'DES' ? 1.25 : 1.00;
  const fsProb = alphaOver * fy; // MPa

  const aTopMm = (AsTop * 100.0 * fsProb) / (0.85 * fc * bwMm);
  const Mpr1   = (AsTop * 100.0 * fsProb * (dMm - aTopMm / 2.0)) / 1e6; // kN·m

  const aBotMm = (AsBot * 100.0 * fsProb) / (0.85 * fc * bwMm);
  const Mpr2   = (AsBot * 100.0 * fsProb * (dMm - aBotMm / 2.0)) / 1e6; // kN·m

  // 2. Cortante hiperestático por formación de rótulas plásticas (Vsway) y gravitacional (Vg)
  const Vsway = (Mpr1 + Mpr2) / ln;        // kN
  const Vg    = (wg * ln) / 2.0;           // kN
  const VeMax = Vsway + Vg;                // kN
  const VeMin = Vsway - Vg;                // kN (si < 0 se produce inversión de cortante)

  // 3. Comparación de Vc: Simplificado (Ec. C.11-3/4) vs. Detallado (Ec. C.11-5/6) en el apoyo
  const rhoW = (AsTop * 100.0) / (bwMm * dMm);
  const MuSupport = Math.max(10.0, Mpr1);
  // Modificador de momento Mm si hay carga axial de compresión (Ec. C.11-6)
  const Mm = Nu > 0
    ? MuSupport - (Nu * ((4.0 * hMm - dMm) / 8.0)) / 1000.0
    : MuSupport;

  const sigmaAxial = (Nu * 1000.0) / AgMm2; // MPa
  const VcSimp = Nu >= 0
    ? (0.17 * (1.0 + sigmaAxial / 14.0) * Math.sqrt(fc) * bwMm * dMm) / 1000.0
    : Math.max(0.0, (0.17 * (1.0 + 0.29 * sigmaAxial) * Math.sqrt(fc) * bwMm * dMm) / 1000.0);

  const upperVcDet = (0.29 * Math.sqrt(fc) * bwMm * dMm * Math.sqrt(Math.max(0.0, 1.0 + 0.29 * sigmaAxial))) / 1000.0;
  let VcDet = upperVcDet;
  if (Mm > 0) {
    let ratioVdM = (VeMax * (d / 100.0)) / Mm;
    if (Nu <= 0) ratioVdM = Math.min(1.0, ratioVdM); // C.11.2.2.1 limita Vu*d/Mu <= 1.0 cuando no hay Nu
    VcDet = Math.min(upperVcDet, ((0.16 * Math.sqrt(fc) + 17.0 * rhoW * ratioVdM) * bwMm * dMm) / 1000.0);
  }

  // 4. Regla especial NSR-10 C.21.5.4.2 para DES: ¿Debe tomarse Vc = 0 en la zona de plastificación?
  const isSwayDominant = Vsway >= 0.5 * VeMax;
  const isLowAxial     = (Nu * 1000.0) < (AgMm2 * fc) / 20.0;
  const mustTakeVcZero = (sysType === 'DES') && isSwayDominant && isLowAxial;
  const VcDesignSeismic = mustTakeVcZero ? 0.0 : VcSimp;
  const phiVcDesign = phi * VcDesignSeismic;

  // 5. Diseño de estribos cerrados de confinamiento (hoops) en la zona plástica 2h (No. 3, 2 o 3 ramas)
  const dbStirrupMm = 9.5; // No. 3
  const sConf1 = (d / 4.0) * 10.0;       // d/4 (mm)
  const sConf2 = 8.0 * dbLong;           // 8 db_min (mm)
  const sConf3 = 24.0 * dbStirrupMm;     // 24 db_estribo (mm)
  const sConf4 = 300.0;                  // 300 mm
  const sConfMaxMm = Math.min(sConf1, sConf2, sConf3, sConf4);
  const sConfMaxCm = sConfMaxMm / 10.0;

  // Separación requerida por cortante sísmico VeMax con estribos No. 3 de 2 ramas (Av = 1.42 cm2)
  const AvHoopMm2 = 2.0 * 71.0; // 142 mm2
  const phiVsSeismic = Math.max(0.0, VeMax - phiVcDesign);
  const sStrengthSeismicCm = phiVsSeismic > 0.01
    ? (phi * AvHoopMm2 * fy * dMm) / (phiVsSeismic * 1000.0) / 10.0
    : 999.0;
  const sFinalPlasticCm = Math.max(5.0, Math.floor(Math.min(sConfMaxCm, sStrengthSeismicCm) * 2.0) / 2.0);
  const lenPlasticZoneM = (2.0 * h) / 100.0;

  // Poblar resultados en el DOM
  document.getElementById('res42-mpr').textContent     = `Mpr1(-) = ${Mpr1.toFixed(1)} kN·m | Mpr2(+) = ${Mpr2.toFixed(1)} kN·m (${alphaOver.toFixed(2)} fy)`;
  document.getElementById('res42-vsway').textContent   = `${Vsway.toFixed(1)} kN (${((Vsway / VeMax) * 100).toFixed(0)}% de Ve)`;
  document.getElementById('res42-vg').textContent      = `${Vg.toFixed(1)} kN`;
  document.getElementById('res42-ve').textContent      = `Ve,máx = ${VeMax.toFixed(1)} kN | Ve,mín = ${VeMin.toFixed(1)} kN`;
  document.getElementById('res42-vc-comp').textContent = `Simplificada: ${VcSimp.toFixed(1)} kN | Detallada: ${VcDet.toFixed(1)} kN (+${(((VcDet - VcSimp) / Math.max(1, VcSimp)) * 100).toFixed(1)}%)`;
  document.getElementById('res42-vc-sism').textContent = mustTakeVcZero
    ? `Vc = 0.0 kN (C.21.5.4.2: DES con Vsway ≥ 0.5 Ve y Nu < Ag f'c/20)`
    : `φVc = ${phiVcDesign.toFixed(1)} kN (Se permite considerar el aporte del concreto)`;
  document.getElementById('res42-sconf').textContent   = `${sConfMaxCm.toFixed(1)} cm [mín(d/4=${(sConf1/10).toFixed(1)}, 8db=${(sConf2/10).toFixed(1)}, 24de=${(sConf3/10).toFixed(1)}, 30 cm)]`;
  document.getElementById('res42-sadopt').textContent  = `Zona 2h = ${lenPlasticZoneM.toFixed(2)} m: Estribos cerrados No. 3 (2R) @ ${sFinalPlasticCm.toFixed(1)} cm (1er estribo a 5 cm)`;

  const status42 = document.getElementById('res42-status');
  if (mustTakeVcZero) {
    status42.className = 'status-badge status-warn';
    status42.innerHTML = `⚡ PÓRTICO DES CON Vc = 0 (NSR-10 C.21.5.4.2): Como el cortante sísmico Vsway (${Vsway.toFixed(1)} kN) ≥ 50% de Ve (${VeMax.toFixed(1)} kN) y la fuerza axial es baja, los estribos deben resistir el 100% de Ve en la longitud 2h = ${lenPlasticZoneM.toFixed(2)} m.`;
  } else {
    status42.className = 'status-badge status-ok';
    status42.innerHTML = `✅ DISEÑO POR CAPACIDAD (${sysType}): Ve = ${VeMax.toFixed(1)} kN, φVc = ${phiVcDesign.toFixed(1)} kN. Zona de confinamiento 2h = ${lenPlasticZoneM.toFixed(2)} m con estribos cerrados No. 3 @ ${sFinalPlasticCm.toFixed(1)} cm.`;
  }

  drawSim42Canvas({
    ln, h, d, sysType, Mpr1, Mpr2, Vsway, Vg, VeMax, VeMin,
    VcSimp, VcDet, mustTakeVcZero, lenPlasticZoneM, sFinalPlasticCm
  });
}

function drawSim42Canvas(state) {
  const canvas = document.getElementById('canvas-sim42');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const pal = getThemePaletteMod04();

  const baseW = 920;
  const baseH = 390;
  const parentW = canvas.parentElement ? canvas.parentElement.clientWidth : baseW;
  const displayW = Math.max(280, Math.min(baseW, parentW - 24));
  const scale = displayW / baseW;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.round(displayW * dpr);
  canvas.height = Math.round(baseH * scale * dpr);
  canvas.style.width = displayW + "px";
  canvas.style.height = Math.round(baseH * scale) + "px";

  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);

  const W = baseW;
  const H = baseH;

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

  const leftX = 95;
  const rightX = 825;
  const spanW = rightX - leftX;

  // Título
  ctx.fillStyle = pal.textMain;
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    `MECANISMO DE RÓTULAS PLÁSTICAS Y CORTANTE POR CAPACIDAD Ve (${state.sysType} — NSR-10 C.21)`,
    W / 2,
    24
  );

  // 1) Viga entre columnas y zonas de confinamiento 2h en ambos extremos (y: 55..155)
  const beamTop = 75;
  const beamH = 66;
  const beamBot = beamTop + beamH;

  // Columnas izquierda y derecha
  ctx.fillStyle = pal.concreteFill;
  ctx.strokeStyle = pal.concreteStroke;
  ctx.lineWidth = 2;
  ctx.fillRect(leftX - 42, beamTop - 25, 42, beamH + 50);
  ctx.strokeRect(leftX - 42, beamTop - 25, 42, beamH + 50);
  ctx.fillRect(rightX, beamTop - 25, 42, beamH + 50);
  ctx.strokeRect(rightX, beamTop - 25, 42, beamH + 50);

  // Viga central
  ctx.fillRect(leftX, beamTop, spanW, beamH);
  ctx.strokeRect(leftX, beamTop, spanW, beamH);

  // Sombrear las zonas de confinamiento 2h en ambos extremos
  const zone2hPx = Math.min(spanW * 0.36, (state.lenPlasticZoneM / state.ln) * spanW);
  ctx.fillStyle = pal.vsFill;
  ctx.fillRect(leftX, beamTop, zone2hPx, beamH);
  ctx.fillRect(rightX - zone2hPx, beamTop, zone2hPx, beamH);

  // Dibujar estribos densos en zonas 2h y estribos normales en zona central
  ctx.strokeStyle = pal.stirrupColor;
  ctx.lineWidth = 1.8;
  for (let x = leftX + 6; x <= leftX + zone2hPx; x += 8) {
    ctx.beginPath(); ctx.moveTo(x, beamTop + 6); ctx.lineTo(x, beamBot - 6); ctx.stroke();
  }
  for (let x = rightX - 6; x >= rightX - zone2hPx; x -= 8) {
    ctx.beginPath(); ctx.moveTo(x, beamTop + 6); ctx.lineTo(x, beamBot - 6); ctx.stroke();
  }
  for (let x = leftX + zone2hPx + 18; x < rightX - zone2hPx - 10; x += 22) {
    ctx.beginPath(); ctx.moveTo(x, beamTop + 6); ctx.lineTo(x, beamBot - 6); ctx.stroke();
  }

  // Símbolos de rótulas plásticas Mpr1 y Mpr2 en los extremos
  ctx.fillStyle = pal.vsStroke;
  ctx.beginPath();
  ctx.arc(leftX + 12, beamTop + beamH / 2, 7, 0, Math.PI * 2);
  ctx.arc(rightX - 12, beamTop + beamH / 2, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = 'bold 11px JetBrains Mono, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`Mpr1(-) = ${state.Mpr1.toFixed(1)} kN·m`, leftX + 4, beamTop - 10);
  ctx.textAlign = 'right';
  ctx.fillText(`Mpr2(+) = ${state.Mpr2.toFixed(1)} kN·m`, rightX - 4, beamTop - 10);

  // Cotas de 2h y ln
  ctx.fillStyle = pal.vsStroke;
  ctx.textAlign = 'center';
  ctx.fillText(`Zona 2h = ${state.lenPlasticZoneM.toFixed(2)} m (@ ${state.sFinalPlasticCm.toFixed(1)} cm)`, leftX + zone2hPx / 2, beamBot + 18);
  ctx.fillText(`Zona 2h = ${state.lenPlasticZoneM.toFixed(2)} m (@ ${state.sFinalPlasticCm.toFixed(1)} cm)`, rightX - zone2hPx / 2, beamBot + 18);
  ctx.fillStyle = pal.textMain;
  ctx.fillText(`Luz libre ln = ${state.ln.toFixed(2)} m`, (leftX + rightX) / 2, beamBot + 18);

  // 2) Superposición del Diagrama de Cortante por Capacidad: Vsway + Vg = Ve (y: 205..385)
  const diagZeroY = 300;
  const maxV = Math.max(state.VeMax * 1.15, 60.0);
  const scaleV = 85.0 / maxV;
  const vToY = (v) => diagZeroY - v * scaleV;

  // Eje cero
  ctx.strokeStyle = pal.concreteStroke;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(leftX, diagZeroY);
  ctx.lineTo(rightX, diagZeroY);
  ctx.stroke();

  // Banda constante de cortante hiperestático sísmico Vsway = (Mpr1 + Mpr2)/ln
  const yVsway = vToY(state.Vsway);
  ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
  ctx.fillRect(leftX, yVsway, spanW, diagZeroY - yVsway);
  ctx.strokeStyle = pal.stirrupColor;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(leftX, yVsway);
  ctx.lineTo(rightX, yVsway);
  ctx.stroke();
  ctx.setLineDash([]);

  // Línea envolvente de Cortante Total por Capacidad Ve(x) = Vsway + Vg(x)
  const yVeLeft  = vToY(state.VeMax);
  const yVeRight = vToY(state.VeMin);

  ctx.strokeStyle = pal.vsStroke;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(leftX, yVeLeft);
  ctx.lineTo(rightX, yVeRight);
  ctx.stroke();

  // Etiquetas de ordenadas
  ctx.font = 'bold 11px JetBrains Mono, monospace';
  ctx.fillStyle = pal.vsStroke;
  ctx.textAlign = 'left';
  ctx.fillText(`Ve,máx = Vsway + Vg = ${state.VeMax.toFixed(1)} kN`, leftX + 8, yVeLeft - 6);

  ctx.fillStyle = pal.stirrupColor;
  ctx.fillText(`Vsway = (Mpr1 + Mpr2)/ln = ${state.Vsway.toFixed(1)} kN`, leftX + 8, yVsway + 15);

  ctx.fillStyle = pal.textMain;
  ctx.textAlign = 'right';
  ctx.fillText(`Ve,mín = Vsway - Vg = ${state.VeMin.toFixed(1)} kN`, rightX - 8, yVeRight - 8);
}

window.redrawAllSimulators = function () {
  updateSim41();
  updateSim42();
};

document.addEventListener('DOMContentLoaded', () => {
  updateSim41();
  updateSim42();
  window.addEventListener('resize', () => {
    if (typeof window.redrawAllSimulators === 'function') {
      window.redrawAllSimulators();
    }
  });
  const themeBtn = document.getElementById('btn-theme');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      setTimeout(() => {
        window.redrawAllSimulators();
      }, 30);
    });
  }
});

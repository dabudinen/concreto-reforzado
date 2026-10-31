/**
 * ============================================================================
 * SIMULADORES INTERACTIVOS — MÓDULO 07: CIMENTACIONES SUPERFICIALES (NSR-10)
 * ============================================================================
 * Autor: Prof. Daniel Abudinen, I.C., M.Sc.
 * Simulador 7.1: Diseñador Completo de Zapatas Aisladas (Concéntricas y
 *                Excéntricas): presiones de contacto, punzonamiento a d/2,
 *                cortante unidireccional a d, flexión biaxial y aplastamiento.
 * Simulador 7.2: Diseñador de Zapata Medianera con Viga de Enlace (Strap Footing):
 *                equilibrio estático, reacción amplificada R1, diagramas V(x) y
 *                M(x) y dimensionamiento a flexión/cortante de la viga cantiléver.
 * ============================================================================
 */

const BAR_DATA_MOD07 = {
  '4': { diam: 12.7, area: 129 },
  '5': { diam: 15.9, area: 199 },
  '6': { diam: 19.1, area: 284 },
  '7': { diam: 22.2, area: 387 },
  '8': { diam: 25.4, area: 510 }
};

function getThemePaletteMod07() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    isDark,
    bgCanvas: isDark ? '#0B1120' : '#F8FAFC',
    gridLine: isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(148, 163, 184, 0.22)',
    concreteFill: isDark ? '#1E293B' : '#E2E8F0',
    concreteStroke: isDark ? '#94A3B8' : '#334155',
    colFill: isDark ? '#334155' : '#CBD5E1',
    colStroke: isDark ? '#F8FAFC' : '#0F172A',
    soilFill: isDark ? 'rgba(217, 119, 6, 0.15)' : 'rgba(217, 119, 6, 0.10)',
    soilStroke: isDark ? '#F59E0B' : '#D97706',
    punchStroke: isDark ? '#FB7185' : '#E11D48',
    shearBeamStroke: isDark ? '#38BDF8' : '#0284C7',
    rebarColor: isDark ? '#FBBF24' : '#D97706',
    beamFill: isDark ? '#0F172A' : '#E0E7FF',
    beamStroke: isDark ? '#818CF8' : '#4F46E5',
    textMain: isDark ? '#F1F5F9' : '#0F172A',
    textSub: isDark ? '#94A3B8' : '#475569',
    okColor: isDark ? '#34D399' : '#059669',
    dangerColor: isDark ? '#FB7185' : '#E11D48'
  };
}

function drawGridMod07(ctx, W, H, pal) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = pal.bgCanvas;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = pal.gridLine;
  ctx.lineWidth = 1;
  for (let x = 30; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 30; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
}

/**
 * ============================================================================
 * SIMULADOR 7.1: ZAPATAS AISLADAS (CONCÉNTRICAS Y EXCÉNTRICAS)
 * ============================================================================
 */
function updateSim71() {
  const pdInput = document.getElementById('sim71-pd');
  if (!pdInput) return;

  const PD      = parseFloat(pdInput.value);                                // kN
  const PL      = parseFloat(document.getElementById('sim71-pl').value);    // kN
  const Mux     = parseFloat(document.getElementById('sim71-mux').value);   // kN·m (alrededor del eje X)
  const Muy     = parseFloat(document.getElementById('sim71-muy').value);   // kN·m (alrededor del eje Y)
  const qadm    = parseFloat(document.getElementById('sim71-qadm').value);  // kPa (kN/m²)
  const Df      = parseFloat(document.getElementById('sim71-df').value);    // m
  const gammaS  = parseFloat(document.getElementById('sim71-gammas').value);// kN/m³
  const B       = parseFloat(document.getElementById('sim71-b').value);     // m (ancho en Y)
  const L       = parseFloat(document.getElementById('sim71-l').value);     // m (largo en X)
  const hCm     = parseFloat(document.getElementById('sim71-h').value);     // cm
  const cxCm    = parseFloat(document.getElementById('sim71-cx').value);    // cm (lado col en X)
  const cyCm    = parseFloat(document.getElementById('sim71-cy').value);    // cm (lado col en Y)
  const fc      = parseFloat(document.getElementById('sim71-fc').value);    // MPa
  const barKey  = document.getElementById('sim71-bar').value;               // '4', '5', '6', '7', '8'
  const fy      = 420.0;                                                    // MPa

  // Actualizar etiquetas de control
  document.getElementById('val-sim71-pd').textContent   = `${PD.toFixed(0)} kN`;
  document.getElementById('val-sim71-pl').textContent   = `${PL.toFixed(0)} kN`;
  document.getElementById('val-sim71-mux').textContent  = `${Mux.toFixed(0)} kN·m`;
  document.getElementById('val-sim71-muy').textContent  = `${Muy.toFixed(0)} kN·m`;
  document.getElementById('val-sim71-qadm').textContent = `${qadm.toFixed(0)} kPa`;
  document.getElementById('val-sim71-b').textContent    = `${B.toFixed(2)} m`;
  document.getElementById('val-sim71-l').textContent    = `${L.toFixed(2)} m`;
  document.getElementById('val-sim71-h').textContent    = `${hCm.toFixed(0)} cm`;

  const hMm = hCm * 10.0;
  const cxMm = cxCm * 10.0;
  const cyMm = cyCm * 10.0;
  const recMm = 75.0; // Recubrimiento libre 7.5 cm (NSR-10 C.7.7.1 concreto contra el suelo)
  const dbMm = BAR_DATA_MOD07[barKey].diam;
  const abMm2 = BAR_DATA_MOD07[barKey].area;
  const dMm = hMm - recMm - dbMm; // Peralte efectivo promedio
  const dM = dMm / 1000.0;

  // 1. Presión neta admisible y dimensionamiento en servicio
  const Pserv = PD + PL;
  const qe = qadm - Df * gammaS; // kPa
  const Areq = qe > 0 ? Pserv / qe : 999.0;
  const Aprov = B * L;

  // 2. Cargas mayoradas y presiones del suelo
  const Pu = 1.2 * PD + 1.6 * PL;
  const ex = Pu > 0 ? Muy / Pu : 0; // Excentricidad en dirección L (eje X)
  const ey = Pu > 0 ? Mux / Pu : 0; // Excentricidad en dirección B (eje Y)
  const kernX = L / 6.0;
  const kernY = B / 6.0;
  const inKern = ex <= kernX && ey <= kernY;

  // Presiones mayoradas en las esquinas de la zapata (kN/m²)
  const qAvg = Pu / Aprov;
  const dqX = (6.0 * Muy) / (B * Math.pow(L, 2));
  const dqY = (6.0 * Mux) / (L * Math.pow(B, 2));
  const quMax = qAvg + dqX + dqY;
  const quMin = Math.max(0.0, qAvg - dqX - dqY);

  // 3. Verificación de Punzonamiento (Cortante Bidireccional a d/2)
  const b0Mm = 2.0 * (cxMm + dMm) + 2.0 * (cyMm + dMm);
  const b0M = b0Mm / 1000.0;
  const punchArea = ((cxMm + dMm) / 1000.0) * ((cyMm + dMm) / 1000.0);
  const Vu1 = qAvg * Math.max(0.0, Aprov - punchArea); // kN

  const betaC = Math.max(cxMm, cyMm) / Math.min(cxMm, cyMm);
  const alphaS = 40.0; // Columna interior
  const vc1 = 0.17 * (1.0 + 2.0 / betaC) * Math.sqrt(fc);
  const vc2 = 0.083 * ((alphaS * dMm) / b0Mm + 2.0) * Math.sqrt(fc);
  const vc3 = 0.33 * Math.sqrt(fc);
  const vc = Math.min(vc1, vc2, vc3); // MPa
  const phiVc1 = (0.75 * vc * b0Mm * dMm) / 1000.0; // kN

  // 4. Verificación de Cortante como Viga (Unidireccional a distancia d)
  // En dirección L (vuelo largo X)
  const lvX = (L - cxMm / 1000.0) / 2.0;
  const Vu2x = qAvg * B * Math.max(0.0, lvX - dM);
  const phiVc2x = (0.75 * 0.17 * Math.sqrt(fc) * (B * 1000.0) * dMm) / 1000.0;

  // En dirección B (vuelo en Y)
  const lvY = (B - cyMm / 1000.0) / 2.0;
  const Vu2y = qAvg * L * Math.max(0.0, lvY - dM);
  const phiVc2y = (0.75 * 0.17 * Math.sqrt(fc) * (L * 1000.0) * dMm) / 1000.0;

  // 5. Diseño a Flexión en la cara de la columna
  const MuFlexX = qAvg * B * Math.pow(lvX, 2) / 2.0; // Flexión en dirección L
  const MuFlexY = qAvg * L * Math.pow(lvY, 2) / 2.0; // Flexión en dirección B

  const phiFlex = 0.90;
  const calcAsFlex = (MuKNm, widthM) => {
    if (MuKNm <= 0) return 0;
    const Rn = (MuKNm * 1e6) / (phiFlex * (widthM * 1000.0) * Math.pow(dMm, 2));
    const disc = 1.0 - (2.0 * Rn) / (0.85 * fc);
    if (disc <= 0) return NaN;
    const rho = ((0.85 * fc) / fy) * (1.0 - Math.sqrt(disc));
    return rho * (widthM * 1000.0) * dMm;
  };

  const AsReqX = calcAsFlex(MuFlexX, B);
  const AsReqY = calcAsFlex(MuFlexY, L);
  const AsMinX = 0.0018 * (B * 1000.0) * hMm;
  const AsMinY = 0.0018 * (L * 1000.0) * hMm;

  const AsGovX = Math.max(AsReqX || 0, AsMinX);
  const AsGovY = Math.max(AsReqY || 0, AsMinY);

  const numBarsX = Math.max(3, Math.ceil(AsGovX / abMm2));
  const numBarsY = Math.max(3, Math.ceil(AsGovY / abMm2));
  const sBarsX = ((B * 1000.0 - 2.0 * recMm - dbMm) / (numBarsX - 1));
  const sBarsY = ((L * 1000.0 - 2.0 * recMm - dbMm) / (numBarsY - 1));

  // 6. Aplastamiento en la base (NSR-10 C.15.8 y C.10.14)
  const A1 = (cxMm * cyMm);
  const A2 = Math.min((B * 1000.0) * (L * 1000.0), Math.pow(Math.min(cxMm + 4.0 * hMm, B * 1000.0), 2));
  const factorAplast = Math.min(2.0, Math.sqrt(A2 / A1));
  const phiPnAplast = (0.65 * 0.85 * fc * A1 * factorAplast) / 1000.0; // kN
  const aplastOk = phiPnAplast >= Pu;

  // Actualizar métricas en el DOM
  document.getElementById('res71-area').textContent =
    `A_prov = ${Aprov.toFixed(2)} m² (A_req = ${Areq.toFixed(2)} m²) | qe = ${qe.toFixed(0)} kPa`;
  document.getElementById('res71-press').textContent =
    `qu,máx = ${quMax.toFixed(1)} kPa | qu,mín = ${quMin.toFixed(1)} kPa ${inKern ? '(En núcleo central)' : '⚠️ (Excéntrica)'}`;
  document.getElementById('res71-punch').textContent =
    `Vu = ${Vu1.toFixed(1)} kN | φVc = ${phiVc1.toFixed(1)} kN (d = ${dMm.toFixed(1)} mm, b0 = ${b0Mm.toFixed(0)} mm)`;
  document.getElementById('res71-shearx').textContent =
    `VuX = ${Vu2x.toFixed(1)} kN | φVcX = ${phiVc2x.toFixed(1)} kN (voladizo = ${lvX.toFixed(2)} m)`;
  document.getElementById('res71-sheary').textContent =
    `VuY = ${Vu2y.toFixed(1)} kN | φVcY = ${phiVc2y.toFixed(1)} kN (voladizo = ${lvY.toFixed(2)} m)`;
  document.getElementById('res71-mux').textContent =
    `MuX = ${MuFlexX.toFixed(1)} kN·m → ${numBarsX} No.${barKey} @ ${(sBarsX / 10.0).toFixed(0)} cm`;
  document.getElementById('res71-muy').textContent =
    `MuY = ${MuFlexY.toFixed(1)} kN·m → ${numBarsY} No.${barKey} @ ${(sBarsY / 10.0).toFixed(0)} cm`;
  document.getElementById('res71-aplast').textContent =
    `φPn = ${phiPnAplast.toFixed(0)} kN ${aplastOk ? '≥' : '<'} Pu = ${Pu.toFixed(0)} kN (factor √(A2/A1) = ${factorAplast.toFixed(2)})`;

  // Estado global
  const statusEl = document.getElementById('res71-status');
  if (Aprov < Areq) {
    statusEl.className = 'status-badge status-danger';
    statusEl.innerHTML = `❌ ÁREA INSUFICIENTE: A_prov = ${Aprov.toFixed(2)} m² < A_req = ${Areq.toFixed(2)} m². Se supera la capacidad admisible del suelo.`;
  } else if (Vu1 > phiVc1) {
    statusEl.className = 'status-badge status-danger';
    statusEl.innerHTML = `❌ FALLA POR PUNZONAMIENTO: Vu = ${Vu1.toFixed(0)} kN > φVc = ${phiVc1.toFixed(0)} kN. Aumente el espesor h de la zapata.`;
  } else if (Vu2x > phiVc2x || Vu2y > phiVc2y) {
    statusEl.className = 'status-badge status-danger';
    statusEl.innerHTML = `❌ CORTANTE COMO VIGA EXCEDIDO: Vu > φVc en los voladizos. Aumente el espesor h de la zapata.`;
  } else if (!aplastOk) {
    statusEl.className = 'status-badge status-warn';
    statusEl.innerHTML = `⚠️ APLASTAMIENTO EXCEDIDO: φPn = ${phiPnAplast.toFixed(0)} kN < Pu. Se requiere suministrar espigos (dowels) para transmitir el exceso de carga (NSR-10 C.15.8.1.2).`;
  } else if (!inKern) {
    statusEl.className = 'status-badge status-warn';
    statusEl.innerHTML = `⚠️ EXCENTRICIDAD FUERA DEL NÚCLEO CENTRAL: Existe despegue parcial o distribución fuertemente triangular del suelo.`;
  } else {
    statusEl.className = 'status-badge status-ok';
    statusEl.innerHTML = `✅ ZAPATA CUMPLE (NSR-10): Presiones admisibles, cortante por punzonamiento, cortante como viga y flexión en ambas direcciones verificados.`;
  }

  drawSim71Canvas({
    B, L, hMm, cxMm, cyMm, dMm, lvX, lvY,
    numBarsX, numBarsY, barKey, quMax, quMin,
    b0Mm, Vu1, phiVc1, Vu2x, phiVc2x, inKern
  });
}

function drawSim71Canvas(st) {
  const canvas = document.getElementById('canvas-sim71');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const pal = getThemePaletteMod07();
  const W = canvas.width, H = canvas.height;
  drawGridMod07(ctx, W, H, pal);

  // ---------------- Panel Izquierdo: Vista en Planta ----------------
  ctx.fillStyle = pal.textMain;
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PLANTA DE LA ZAPATA Y SECCIONES CRÍTICAS (d/2 y d)', 24, 26);

  const maxFootDim = Math.max(st.L, st.B);
  const sc = 260 / maxFootDim;
  const drawW = st.L * sc; // Dirección X (L)
  const drawH = st.B * sc; // Dirección Y (B)
  const fX0 = 40 + (280 - drawW) / 2;
  const fY0 = 60 + (280 - drawH) / 2;

  // Losa de la zapata
  ctx.fillStyle = pal.concreteFill;
  ctx.strokeStyle = pal.concreteStroke;
  ctx.lineWidth = 2.0;
  ctx.fillRect(fX0, fY0, drawW, drawH);
  ctx.strokeRect(fX0, fY0, drawW, drawH);

  // Columna central
  const colW = (st.cxMm / 1000.0) * sc;
  const colH = (st.cyMm / 1000.0) * sc;
  const colX = fX0 + drawW / 2.0 - colW / 2.0;
  const colY = fY0 + drawH / 2.0 - colH / 2.0;

  ctx.fillStyle = pal.colFill;
  ctx.strokeStyle = pal.colStroke;
  ctx.lineWidth = 1.6;
  ctx.fillRect(colX, colY, colW, colH);
  ctx.strokeRect(colX, colY, colW, colH);

  // Perímetro crítico de punzonamiento a d/2
  const punchW = ((st.cxMm + st.dMm) / 1000.0) * sc;
  const punchH = ((st.cyMm + st.dMm) / 1000.0) * sc;
  const punchX = fX0 + drawW / 2.0 - punchW / 2.0;
  const punchY = fY0 + drawH / 2.0 - punchH / 2.0;

  ctx.strokeStyle = pal.punchStroke;
  ctx.lineWidth = 2.0;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(punchX, punchY, punchW, punchH);
  ctx.setLineDash([]);

  // Secciones críticas de cortante como viga a distancia d
  const shearLineX1 = colX - (st.dMm / 1000.0) * sc;
  const shearLineX2 = colX + colW + (st.dMm / 1000.0) * sc;
  ctx.strokeStyle = pal.shearBeamStroke;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([6, 3]);
  if (shearLineX1 > fX0) {
    ctx.beginPath(); ctx.moveTo(shearLineX1, fY0); ctx.lineTo(shearLineX1, fY0 + drawH); ctx.stroke();
  }
  if (shearLineX2 < fX0 + drawW) {
    ctx.beginPath(); ctx.moveTo(shearLineX2, fY0); ctx.lineTo(shearLineX2, fY0 + drawH); ctx.stroke();
  }
  ctx.setLineDash([]);

  // Barras de refuerzo (parrilla inferior)
  ctx.strokeStyle = pal.rebarColor;
  ctx.lineWidth = 1.2;
  // Barras longitudinales en X
  for (let i = 1; i <= st.numBarsX; i++) {
    const yB = fY0 + (i * drawH) / (st.numBarsX + 1);
    ctx.beginPath(); ctx.moveTo(fX0 + 10, yB); ctx.lineTo(fX0 + drawW - 10, yB); ctx.stroke();
  }
  // Barras transversales en Y
  for (let i = 1; i <= st.numBarsY; i++) {
    const xB = fX0 + (i * drawW) / (st.numBarsY + 1);
    ctx.beginPath(); ctx.moveTo(xB, fY0 + 10); ctx.lineTo(xB, fY0 + drawH - 10); ctx.stroke();
  }

  // Cotas y leyendas
  ctx.fillStyle = pal.textSub;
  ctx.font = '11px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`L = ${st.L.toFixed(2)} m`, fX0 + drawW / 2.0, fY0 + drawH + 24);
  ctx.save();
  ctx.translate(fX0 - 18, fY0 + drawH / 2.0);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`B = ${st.B.toFixed(2)} m`, 0, 0);
  ctx.restore();

  // ---------------- Panel Derecho: Perfil y Presión de Contacto ----------------
  const pX0 = 470, pX1 = 860;
  const pW = pX1 - pX0;
  ctx.fillStyle = pal.textMain;
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PERFIL ESTRUCTURAL Y DISTRIBUCIÓN DE PRESIONES DEL SUELO', pX0 - 10, 26);

  const baseFootY = 170;
  const footHPx = Math.max(30, (st.hMm / 1000.0) * sc * 1.5);
  const footTopY = baseFootY - footHPx;

  // Corte de la zapata
  ctx.fillStyle = pal.concreteFill;
  ctx.strokeStyle = pal.concreteStroke;
  ctx.lineWidth = 2.0;
  ctx.fillRect(pX0, footTopY, pW, footHPx);
  ctx.strokeRect(pX0, footTopY, pW, footHPx);

  // Columna saliendo hacia arriba
  const colPW = Math.max(25, (st.cxMm / 1000.0) * sc * 1.5);
  const colPX = pX0 + pW / 2.0 - colPW / 2.0;
  ctx.fillStyle = pal.colFill;
  ctx.strokeStyle = pal.colStroke;
  ctx.fillRect(colPX, footTopY - 70, colPW, 70);
  ctx.strokeRect(colPX, footTopY - 70, colPW, 70);

  // Diagrama de presiones del suelo hacia arriba
  const soilBaseY = baseFootY + 10;
  const qScale = 85.0 / Math.max(100.0, st.quMax);
  const hPressLeft = st.quMin * qScale;
  const hPressRight = st.quMax * qScale;

  ctx.fillStyle = pal.soilFill;
  ctx.beginPath();
  ctx.moveTo(pX0, soilBaseY);
  ctx.lineTo(pX1, soilBaseY);
  ctx.lineTo(pX1, soilBaseY + hPressRight);
  ctx.lineTo(pX0, soilBaseY + hPressLeft);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = pal.soilStroke;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(pX0, soilBaseY + hPressLeft);
  ctx.lineTo(pX1, soilBaseY + hPressRight);
  ctx.stroke();

  // Flechas de presión del suelo hacia arriba
  ctx.lineWidth = 1.2;
  for (let x = pX0 + 15; x <= pX1 - 15; x += 30) {
    const t = (x - pX0) / pW;
    const hp = soilBaseY + (hPressLeft * (1.0 - t) + hPressRight * t);
    ctx.beginPath();
    ctx.moveTo(x, hp);
    ctx.lineTo(x, soilBaseY);
    ctx.stroke();
    // Punta de flecha hacia arriba
    ctx.beginPath();
    ctx.moveTo(x - 3, soilBaseY + 6);
    ctx.lineTo(x, soilBaseY);
    ctx.lineTo(x + 3, soilBaseY + 6);
    ctx.stroke();
  }

  // Textos y etiquetas en perfil
  ctx.fillStyle = pal.soilStroke;
  ctx.font = 'bold 11px JetBrains Mono, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`qu = ${st.quMin.toFixed(1)} kPa`, pX0, soilBaseY + hPressLeft + 20);
  ctx.textAlign = 'right';
  ctx.fillText(`qu = ${st.quMax.toFixed(1)} kPa`, pX1, soilBaseY + hPressRight + 20);

  ctx.fillStyle = pal.punchStroke;
  ctx.textAlign = 'left';
  ctx.fillText(`--- Sección Crítica Punzonamiento (a d/2)`, pX0, H - 28);
  ctx.fillStyle = pal.shearBeamStroke;
  ctx.fillText(`--- Sección Crítica Cortante como Viga (a d)`, pX0 + 260, H - 28);
}

function loadSim71Preset(key) {
  const set = (id, v) => { document.getElementById(id).value = v; };
  if (key === 'ej71_cuadrada') {
    // Ejemplo de clase: 100 ton D, 70 ton L, col 45x45 cm, qadm = 25 ton/m2 = 245 kPa, Df = 1.5 m, B=L=2.80 m, h=60 cm
    set('sim71-pd', 980); set('sim71-pl', 686); set('sim71-mux', 0); set('sim71-muy', 0);
    set('sim71-qadm', 245); set('sim71-df', 1.50); set('sim71-gammas', 17.0);
    set('sim71-b', 2.80); set('sim71-l', 2.80); set('sim71-h', 60);
    set('sim71-cx', 45); set('sim71-cy', 45); set('sim71-fc', '28'); set('sim71-bar', '8');
  } else if (key === 'ej72_excentrica') {
    // Zapata rectangular con momento flector moderado
    set('sim71-pd', 1100); set('sim71-pl', 700); set('sim71-mux', 220); set('sim71-muy', 0);
    set('sim71-qadm', 220); set('sim71-df', 1.60); set('sim71-gammas', 18.0);
    set('sim71-b', 2.60); set('sim71-l', 3.20); set('sim71-h', 65);
    set('sim71-cx', 40); set('sim71-cy', 50); set('sim71-fc', '28'); set('sim71-bar', '6');
  }
  updateSim71();
}

/**
 * ============================================================================
 * SIMULADOR 7.2: ZAPATA MEDIANERA CON VIGA DE ENLACE (STRAP FOOTING)
 * ============================================================================
 */
function updateSim72() {
  const sInput = document.getElementById('sim72-s');
  if (!sInput) return;

  const S    = parseFloat(sInput.value);                                  // m (luz entre ejes de columnas)
  const P1   = parseFloat(document.getElementById('sim72-p1').value);     // kN (carga columna 1 exterior lindero)
  const P2   = parseFloat(document.getElementById('sim72-p2').value);     // kN (carga columna 2 interior)
  const c1Cm = parseFloat(document.getElementById('sim72-c1').value);     // cm (lado col 1)
  const c2Cm = parseFloat(document.getElementById('sim72-c2').value);     // cm (lado col 2)
  const qe   = parseFloat(document.getElementById('sim72-qe').value);     // kPa (presión neta admisible)
  const L1   = parseFloat(document.getElementById('sim72-l1').value);     // m (largo zapata exterior perpendicular al lindero)
  const B1   = parseFloat(document.getElementById('sim72-b1').value);     // m (ancho zapata exterior paralelo al lindero)
  const B2   = parseFloat(document.getElementById('sim72-b2').value);     // m (lado zapata interior cuadrada)
  const bvCm = parseFloat(document.getElementById('sim72-bv').value);     // cm (base viga de enlace)
  const hvCm = parseFloat(document.getElementById('sim72-hv').value);     // cm (altura viga de enlace)
  const fc   = parseFloat(document.getElementById('sim72-fc').value);     // MPa
  const fy   = 420.0;

  // Actualizar valores de control
  document.getElementById('val-sim72-s').textContent  = `${S.toFixed(2)} m`;
  document.getElementById('val-sim72-p1').textContent = `${P1.toFixed(0)} kN`;
  document.getElementById('val-sim72-p2').textContent = `${P2.toFixed(0)} kN`;
  document.getElementById('val-sim72-l1').textContent = `${L1.toFixed(2)} m`;
  document.getElementById('val-sim72-b1').textContent = `${B1.toFixed(2)} m`;
  document.getElementById('val-sim72-b2').textContent = `${B2.toFixed(2)} m`;
  document.getElementById('val-sim72-bv').textContent = `${bvCm.toFixed(0)} cm`;
  document.getElementById('val-sim72-hv').textContent = `${hvCm.toFixed(0)} cm`;

  const c1M = c1Cm / 100.0;
  const c2M = c2Cm / 100.0;
  const bvM = bvCm / 100.0;
  const hvM = hvCm / 100.0;
  const dvMm = hvCm * 10.0 - 60.0; // d efectivo viga

  // 1. Excentricidad del lindero
  const e = L1 / 2.0 - c1M / 2.0; // Distancia entre el eje de la col 1 y el centroide de la zapata 1

  // 2. Equilibrio estático del sistema respecto a la Columna 2
  // R1 * (S - e) = P1 * S -> R1 = P1 * S / (S - e)
  const arm = Math.max(0.5, S - e);
  const R1 = (P1 * S) / arm;
  const R2 = P1 + P2 - R1;

  // 3. Presiones de contacto bajo las zapatas en servicio
  const q1 = R1 / (B1 * L1);
  const q2 = R2 / Math.pow(B2, 2);

  // 4. Solicitaciones mayoradas en la viga de enlace (suponiendo factor de mayoración promedio 1.35)
  const fact = 1.35;
  const Pu1 = P1 * fact;
  const Ru1 = R1 * fact;

  // Momento flector máximo en la viga de enlace (en la cara interior de la columna 1)
  // M_viga = Ru1 * e (momento negativo que produce tracción en la cara superior)
  const MuViga = Ru1 * e; // kN·m
  const VuViga = Ru1 - Pu1; // kN (cortante en la viga de enlace)

  // 5. Diseño a flexión de la viga de enlace (acero superior)
  const RnViga = (MuViga * 1e6) / (0.90 * (bvM * 1000.0) * Math.pow(dvMm, 2));
  const discViga = 1.0 - (2.0 * RnViga) / (0.85 * fc);
  let AsViga = 0;
  if (discViga > 0) {
    const rhoV = ((0.85 * fc) / fy) * (1.0 - Math.sqrt(discViga));
    AsViga = rhoV * (bvM * 1000.0) * dvMm;
  }
  const AsMinViga = Math.max(0.25 * Math.sqrt(fc) / fy, 1.4 / fy) * (bvM * 1000.0) * dvMm;
  const AsGovViga = Math.max(AsViga, AsMinViga);

  // Capacidad de cortante de la viga de enlace
  const phiVcViga = (0.75 * 0.17 * Math.sqrt(fc) * (bvM * 1000.0) * dvMm) / 1000.0; // kN

  // Actualizar resultados en el DOM
  document.getElementById('res72-e').textContent =
    `e = ${e.toFixed(3)} m (L1/2 = ${(L1 / 2).toFixed(2)} m, c1/2 = ${(c1M / 2).toFixed(2)} m)`;
  document.getElementById('res72-r1').textContent =
    `R1 = ${R1.toFixed(1)} kN (amplif. = ${(R1 / P1).toFixed(2)} × P1 = ${P1.toFixed(0)} kN)`;
  document.getElementById('res72-r2').textContent =
    `R2 = ${R2.toFixed(1)} kN (descarga = ${(P2 - R2).toFixed(1)} kN respecto a P2)`;
  document.getElementById('res72-q1').textContent =
    `q1 = ${q1.toFixed(1)} kPa ${q1 <= qe ? '≤' : '>'} qe = ${qe.toFixed(0)} kPa`;
  document.getElementById('res72-q2').textContent =
    `q2 = ${q2.toFixed(1)} kPa ${q2 <= qe ? '≤' : '>'} qe = ${qe.toFixed(0)} kPa`;
  document.getElementById('res72-muv').textContent =
    `Mu,viga = ${MuViga.toFixed(1)} kN·m (Tracción superior)`;
  document.getElementById('res72-vuv').textContent =
    `Vu,viga = ${VuViga.toFixed(1)} kN | φVc = ${phiVcViga.toFixed(1)} kN`;
  document.getElementById('res72-asv').textContent = discViga > 0
    ? `As,sup = ${AsGovViga.toFixed(0)} mm² (${(AsGovViga / 510.0).toFixed(1)} No.8) | As,mín = ${AsMinViga.toFixed(0)} mm²`
    : 'Sección de viga insuficiente (aumente hv)';

  // Estado global
  const statusEl = document.getElementById('res72-status');
  if (e <= 0) {
    statusEl.className = 'status-badge status-warn';
    statusEl.innerHTML = `⚠️ SIN EXCENTRICIDAD: L1 es menor o igual al ancho de la columna c1. No hay condición de lindero.`;
  } else if (q1 > qe) {
    statusEl.className = 'status-badge status-danger';
    statusEl.innerHTML = `❌ PRESIÓN EXCEDIDA EN ZAPATA EXTERIOR: q1 = ${q1.toFixed(1)} kPa > qe = ${qe.toFixed(0)} kPa. Aumente B1 o L1.`;
  } else if (q2 > qe) {
    statusEl.className = 'status-badge status-danger';
    statusEl.innerHTML = `❌ PRESIÓN EXCEDIDA EN ZAPATA INTERIOR: q2 = ${q2.toFixed(1)} kPa > qe = ${qe.toFixed(0)} kPa. Aumente B2.`;
  } else if (discViga <= 0) {
    statusEl.className = 'status-badge status-danger';
    statusEl.innerHTML = `❌ VIGA DE ENLACE INSUFICIENTE A FLEXIÓN: Aumente la altura hv de la viga para soportar el momento de volcamiento.`;
  } else {
    statusEl.className = 'status-badge status-ok';
    statusEl.innerHTML = `✅ VIGA DE ENLACE Y ZAPATAS VERIFICADAS: Volcamiento equilibrado, presiones admisibles cumplidas y viga dimensionada correctamente.`;
  }

  drawSim72Canvas({
    S, P1, P2, R1, R2, e, L1, B1, B2,
    c1M, c2M, bvM, hvM, MuViga, VuViga
  });
}

function drawSim72Canvas(st) {
  const canvas = document.getElementById('canvas-sim72');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const pal = getThemePaletteMod07();
  const W = canvas.width, H = canvas.height;
  drawGridMod07(ctx, W, H, pal);

  ctx.fillStyle = pal.textMain;
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('MODELO ESTRUCTURAL DE LA ZAPATA MEDIANERA Y VIGA DE ENLACE', 24, 26);

  // Escala horizontal
  const totalLength = st.S + st.B2 / 2.0 + 0.5;
  const sc = 760.0 / totalLength;
  const xLindero = 55;
  const col1X = xLindero + (st.c1M / 2.0) * sc;
  const col2X = col1X + st.S * sc;

  const groundY = 190;
  const beamTopY = groundY - 45;
  const beamBotY = beamTopY + (st.hvM * 20.0);

  // Línea roja discontinua de lindero
  ctx.strokeStyle = pal.dangerColor;
  ctx.lineWidth = 2.0;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(xLindero, 45);
  ctx.lineTo(xLindero, H - 40);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = pal.dangerColor;
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('LINDERO (LÍMITE DE PROPIEDAD)', xLindero + 6, 60);

  // Zapata Exterior 1 (inicia justo en el lindero)
  const z1W = st.L1 * sc;
  const z1H = 35;
  const z1X0 = xLindero;
  ctx.fillStyle = pal.concreteFill;
  ctx.strokeStyle = pal.concreteStroke;
  ctx.lineWidth = 1.8;
  ctx.fillRect(z1X0, groundY, z1W, z1H);
  ctx.strokeRect(z1X0, groundY, z1W, z1H);

  // Zapata Interior 2 (centrada en Columna 2)
  const z2W = st.B2 * sc;
  const z2H = 40;
  const z2X0 = col2X - z2W / 2.0;
  ctx.fillRect(z2X0, groundY, z2W, z2H);
  ctx.strokeRect(z2X0, groundY, z2W, z2H);

  // Viga de Enlace conectando ambas zapatas
  ctx.fillStyle = pal.beamFill;
  ctx.strokeStyle = pal.beamStroke;
  ctx.lineWidth = 2.2;
  const beamLeft = xLindero;
  const beamRight = col2X + (st.c2M / 2.0) * sc;
  ctx.fillRect(beamLeft, beamTopY, beamRight - beamLeft, beamBotY - beamTopY);
  ctx.strokeRect(beamLeft, beamTopY, beamRight - beamLeft, beamBotY - beamTopY);

  // Columna 1 (Exterior) y Columna 2 (Interior)
  const col1W = st.c1M * sc;
  const col2W = st.c2M * sc;
  ctx.fillStyle = pal.colFill;
  ctx.strokeStyle = pal.colStroke;
  ctx.fillRect(xLindero, beamTopY - 60, col1W, 60);
  ctx.strokeRect(xLindero, beamTopY - 60, col1W, 60);
  ctx.fillRect(col2X - col2W / 2.0, beamTopY - 60, col2W, 60);
  ctx.strokeRect(col2X - col2W / 2.0, beamTopY - 60, col2W, 60);

  // Flechas de carga de las columnas (P1 y P2) hacia abajo
  ctx.strokeStyle = pal.dangerColor;
  ctx.fillStyle = pal.dangerColor;
  ctx.lineWidth = 2.2;

  const drawArrowDown = (x, yTop, len, label) => {
    ctx.beginPath();
    ctx.moveTo(x, yTop - len);
    ctx.lineTo(x, yTop);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 5, yTop - 10);
    ctx.lineTo(x, yTop);
    ctx.lineTo(x + 5, yTop - 10);
    ctx.fill();
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, yTop - len - 6);
  };

  drawArrowDown(col1X, beamTopY - 60, 35, `P1=${st.P1.toFixed(0)} kN`);
  drawArrowDown(col2X, beamTopY - 60, 35, `P2=${st.P2.toFixed(0)} kN`);

  // Flechas de reacción del suelo (R1 y R2) hacia arriba
  const drawArrowUp = (x, yBot, len, label) => {
    ctx.strokeStyle = pal.okColor;
    ctx.fillStyle = pal.okColor;
    ctx.beginPath();
    ctx.moveTo(x, yBot + len);
    ctx.lineTo(x, yBot);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 5, yBot + 10);
    ctx.lineTo(x, yBot);
    ctx.lineTo(x + 5, yBot + 10);
    ctx.fill();
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, yBot + len + 16);
  };

  const cZ1X = z1X0 + z1W / 2.0;
  drawArrowUp(cZ1X, groundY + z1H, 30, `R1=${st.R1.toFixed(0)} kN`);
  drawArrowUp(col2X, groundY + z2H, 30, `R2=${st.R2.toFixed(0)} kN`);

  // Diagrama cualitativo de Momento Flector en la viga de enlace
  const diagBaseY = H - 55;
  ctx.strokeStyle = pal.concreteStroke;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(col1X, diagBaseY);
  ctx.lineTo(col2X, diagBaseY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Curva de momento negativo (hacia arriba)
  ctx.strokeStyle = pal.beamStroke;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(col1X, diagBaseY);
  ctx.lineTo(col1X + 25, diagBaseY - 35);
  ctx.lineTo(col2X, diagBaseY);
  ctx.stroke();

  ctx.fillStyle = pal.beamStroke;
  ctx.font = 'bold 11px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`Mu,viga = -${st.MuViga.toFixed(1)} kN·m (Tracción superior)`, (col1X + col2X) / 2.0, diagBaseY - 22);

  ctx.fillStyle = pal.textSub;
  ctx.font = '11px Inter, sans-serif';
  ctx.fillText(`Luz entre ejes S = ${st.S.toFixed(2)} m | Excentricidad e = ${st.e.toFixed(3)} m`, (col1X + col2X) / 2.0, groundY - 55);
}

document.addEventListener('DOMContentLoaded', () => {
  updateSim71();
  updateSim72();
  const themeBtn = document.getElementById('btn-theme');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      setTimeout(() => {
        updateSim71();
        updateSim72();
      }, 30);
    });
  }
});

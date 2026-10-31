/* ==========================================================================
   SIMULADORES INTERACTIVOS — MÓDULO 1: INTRODUCCIÓN Y FILOSOFÍAS DE DISEÑO
   1. Confiabilidad Probabilística (Q vs S, Margen M = S - Q, Índice Beta y Poisson)
   2. Comparador Físico-Matemático ASD (C-G) vs. LRFD Bloque de Whitney (C.10) + Curva Phi (C.9.3.2)
   3. Matriz Interactiva SEAOC Vision 2000 y Costos (Taghavi & Miranda, 2003)
   ========================================================================== */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    initProbSimulator();
    initPoissonCalculator();
    initWhitneyComparator();
    initVisionMatrix();

    window.addEventListener('resize', () => {
      window.redrawAllSimulators();
    });
  });

  window.redrawAllSimulators = function () {
    drawProbSimulator();
    drawWhitneyComparator();
  };

  /* --------------------------------------------------------------------------
     FUNCIÓN DE DISTRIBUCIÓN NORMAL ESTÁNDAR (Aproximación de Abramowitz & Stegun)
     -------------------------------------------------------------------------- */
  function normalPDF(x, mean, std) {
    if (std <= 0) return 0;
    const z = (x - mean) / std;
    return (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
  }

  function normalCDF(x) {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp((-x * x) / 2);
    const prob =
      d *
      t *
      (0.3193815 +
        t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - prob : prob;
  }

  /* ==========================================================================
     SIMULADOR 1: NATURALEZA PROBABILÍSTICA Q vs S E ÍNDICE DE CONFIABILIDAD BETA
     ========================================================================== */
  function initProbSimulator() {
    const ids = ['sim1-muQ', 'sim1-covQ', 'sim1-muS', 'sim1-covS', 'sim1-gamma', 'sim1-phi'];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', drawProbSimulator);
    });
    drawProbSimulator();
  }

  function drawProbSimulator() {
    const canvas = document.getElementById('canvas-prob');
    if (!canvas) return;

    const muQ = parseFloat(document.getElementById('sim1-muQ').value);
    const covQ = parseFloat(document.getElementById('sim1-covQ').value) / 100;
    const muS = parseFloat(document.getElementById('sim1-muS').value);
    const covS = parseFloat(document.getElementById('sim1-covS').value) / 100;
    const gamma = parseFloat(document.getElementById('sim1-gamma').value);
    const phi = parseFloat(document.getElementById('sim1-phi').value);

    // Actualizar etiquetas
    document.getElementById('val-muQ').textContent = `${muQ.toFixed(0)} kN·m`;
    document.getElementById('val-covQ').textContent = `${(covQ * 100).toFixed(0)}%`;
    document.getElementById('val-muS').textContent = `${muS.toFixed(0)} kN·m`;
    document.getElementById('val-covS').textContent = `${(covS * 100).toFixed(0)}%`;
    document.getElementById('val-gamma').textContent = gamma.toFixed(2);
    document.getElementById('val-phi').textContent = phi.toFixed(2);

    const sigmaQ = muQ * covQ;
    const sigmaS = muS * covS;

    // Margen de seguridad M = S - Q
    const muM = muS - muQ;
    const sigmaM = Math.sqrt(sigmaS * sigmaS + sigmaQ * sigmaQ);
    const beta = sigmaM > 0 ? muM / sigmaM : 0;
    const pf = normalCDF(-beta);

    // Valores de diseño
    const Qd = gamma * muQ;
    const Sd = phi * muS;
    const cumpleLRFD = Sd >= Qd;

    // Actualizar KPIs
    document.getElementById('kpi-beta').textContent = beta.toFixed(2);
    const pfPercent = pf * 100;
    document.getElementById('kpi-pf').textContent =
      pfPercent < 0.001
        ? `${pf.toExponential(2)}`
        : `${pfPercent.toFixed(3)}% (1 en ${Math.round(1 / Math.max(pf, 1e-9)).toLocaleString()})`;
    document.getElementById('kpi-qd').textContent = `${Qd.toFixed(1)} kN·m`;
    document.getElementById('kpi-sd').textContent = `${Sd.toFixed(1)} kN·m`;

    const statusEl = document.getElementById('kpi-lrfd-status');
    if (statusEl) {
      statusEl.textContent = cumpleLRFD
        ? `CUMPLE (ϕSn ≥ γQn)`
        : `NO CUMPLE (ϕSn < γQn)`;
      statusEl.style.color = cumpleLRFD ? '#16A34A' : '#E11D48';
    }

    // Configuración de Canvas HiDPI sin alterar el ancho CSS del contenedor
    const dpr = window.devicePixelRatio || 1;
    const height = 310;
    canvas.style.height = `${height}px`;
    const width = Math.max(320, Math.floor(canvas.clientWidth || 640));
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#E2E8F0' : '#0F172A';
    const mutedColor = isDark ? '#94A3B8' : '#64748B';
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)';

    ctx.clearRect(0, 0, width, height);

    const padLeft = 46;
    const padRight = 24;
    const padTop = 38;
    const padBottom = 42;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    // Eje X fijo en [0, 750] para que la escala jamás se desplace ni se salga de pantalla
    const xMin = 0;
    const xMax = 750;
    const yMax = Math.max(normalPDF(muQ, muQ, sigmaQ), normalPDF(muS, muS, sigmaS)) * 1.18;

    const toX = (val) => padLeft + ((val - xMin) / (xMax - xMin)) * plotW;
    const toY = (val) => padTop + plotH - (val / yMax) * plotH;

    // Marco y cuadrícula
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let xv = 0; xv <= xMax; xv += 150) {
      const px = toX(xv);
      ctx.beginPath();
      ctx.moveTo(px, padTop);
      ctx.lineTo(px, padTop + plotH);
      ctx.stroke();

      ctx.fillStyle = mutedColor;
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${xv}`, px, padTop + plotH + 16);
    }

    // Línea base horizontal del eje X
    ctx.strokeStyle = mutedColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop + plotH);
    ctx.lineTo(padLeft + plotW, padTop + plotH);
    ctx.stroke();

    ctx.fillStyle = mutedColor;
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Magnitud de Solicitud (Q) y Resistencia (S) [kN·m]', padLeft + plotW / 2, height - 8);

    // Recortar curvas estrictamente dentro del área de trazado
    ctx.save();
    ctx.beginPath();
    ctx.rect(padLeft, padTop, plotW, plotH);
    ctx.clip();

    // Sombrear región de interferencia min(fQ, fS)
    ctx.beginPath();
    ctx.moveTo(toX(xMin), toY(0));
    for (let xv = xMin; xv <= xMax; xv += 3) {
      const yOverlap = Math.min(normalPDF(xv, muQ, sigmaQ), normalPDF(xv, muS, sigmaS));
      ctx.lineTo(toX(xv), toY(yOverlap));
    }
    ctx.lineTo(toX(xMax), toY(0));
    ctx.closePath();
    ctx.fillStyle = 'rgba(225, 29, 72, 0.34)';
    ctx.fill();

    // Curva de Cargas f_Q(q)
    ctx.beginPath();
    ctx.moveTo(toX(xMin), toY(0));
    for (let xv = xMin; xv <= xMax; xv += 3) {
      ctx.lineTo(toX(xv), toY(normalPDF(xv, muQ, sigmaQ)));
    }
    ctx.lineTo(toX(xMax), toY(0));
    ctx.closePath();
    ctx.fillStyle = 'rgba(234, 88, 12, 0.16)';
    ctx.fill();

    ctx.beginPath();
    for (let xv = xMin; xv <= xMax; xv += 3) {
      const py = toY(normalPDF(xv, muQ, sigmaQ));
      if (xv === xMin) ctx.moveTo(toX(xv), py);
      else ctx.lineTo(toX(xv), py);
    }
    ctx.strokeStyle = '#EA580C';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Curva de Resistencia f_S(s)
    ctx.beginPath();
    ctx.moveTo(toX(xMin), toY(0));
    for (let xv = xMin; xv <= xMax; xv += 3) {
      ctx.lineTo(toX(xv), toY(normalPDF(xv, muS, sigmaS)));
    }
    ctx.lineTo(toX(xMax), toY(0));
    ctx.closePath();
    ctx.fillStyle = 'rgba(37, 99, 235, 0.16)';
    ctx.fill();

    ctx.beginPath();
    for (let xv = xMin; xv <= xMax; xv += 3) {
      const py = toY(normalPDF(xv, muS, sigmaS));
      if (xv === xMin) ctx.moveTo(toX(xv), py);
      else ctx.lineTo(toX(xv), py);
    }
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.restore();

    // Líneas verticales de Q_d = gamma * muQ y S_d = phi * muS
    const drawVerticalMarker = (val, label, color, dashed = true, yOffset = 0) => {
      const clampedVal = Math.max(xMin, Math.min(xMax, val));
      const px = toX(clampedVal);
      const labelX = Math.max(padLeft + 26, Math.min(padLeft + plotW - 26, px));
      ctx.save();
      ctx.beginPath();
      if (dashed) ctx.setLineDash([5, 4]);
      ctx.moveTo(px, padTop + 4);
      ctx.lineTo(px, padTop + plotH);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.9;
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = 'bold 10.5px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, labelX, padTop - 4 - yOffset);
      ctx.restore();
    };

    drawVerticalMarker(muQ, `Q̄=${muQ}`, '#EA580C', true, 0);
    drawVerticalMarker(Qd, `Qd=${Qd.toFixed(0)}`, '#C2410C', false, 12);
    drawVerticalMarker(Sd, `Sd=${Sd.toFixed(0)}`, '#15803D', false, 0);
    drawVerticalMarker(muS, `S̄=${muS}`, '#2563EB', true, 12);

    // Leyenda superior derecha
    ctx.fillStyle = textColor;
    ctx.font = 'bold 11.5px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`μ_M = S̄ - Q̄ = ${muM.toFixed(0)} kN·m | β = ${beta.toFixed(2)}`, width - padRight, 16);
  }

  /* ==========================================================================
     MINI-CALCULADORA INTERACTIVA DE PERÍODO DE RETORNO SÍSMICO (POISSON NSR-10)
     ========================================================================== */
  function initPoissonCalculator() {
    const tSlider = document.getElementById('poisson-t');
    const peSlider = document.getElementById('poisson-pe');
    if (!tSlider || !peSlider) return;

    const updatePoisson = () => {
      const t = parseFloat(tSlider.value);
      const pe = parseFloat(peSlider.value) / 100;
      document.getElementById('val-poisson-t').textContent = `${t} años`;
      document.getElementById('val-poisson-pe').textContent = `${(pe * 100).toFixed(0)}%`;

      const tr = -t / Math.log(1 - pe);
      const freqAnual = 1 / tr;
      document.getElementById('kpi-poisson-tr').textContent = `${Math.round(tr)} años`;
      document.getElementById('kpi-poisson-nu').textContent = `${(freqAnual * 100).toFixed(2)}% / año`;
    };

    tSlider.addEventListener('input', updatePoisson);
    peSlider.addEventListener('input', updatePoisson);

    window.setPoissonPreset = function (t, pe) {
      tSlider.value = t;
      peSlider.value = pe;
      updatePoisson();
    };

    updatePoisson();
  }

  /* ==========================================================================
     SIMULADOR 2: COMPARADOR TEÓRICO ASD (ELÁSTICO) VS. LRFD (BLOQUE DE WHITNEY)
                  Y CURVA NORMATIVA DE PHI vs EPSILON_T (NSR-10 C.9.3.2)
     ========================================================================== */
  function initWhitneyComparator() {
    const ids = ['sim2-fc', 'sim2-fy', 'sim2-rho'];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', drawWhitneyComparator);
    });
    drawWhitneyComparator();
  }

  function drawWhitneyComparator() {
    const canvasW = document.getElementById('canvas-whitney');
    const canvasP = document.getElementById('canvas-phi');
    if (!canvasW || !canvasP) return;

    const fc = parseFloat(document.getElementById('sim2-fc').value);
    const fy = parseFloat(document.getElementById('sim2-fy').value);
    const rho = parseFloat(document.getElementById('sim2-rho').value) / 100; // de % a decimal

    document.getElementById('val-sim2-fc').textContent = `${fc.toFixed(0)} MPa`;
    document.getElementById('val-sim2-fy').textContent = `${fy.toFixed(0)} MPa`;
    document.getElementById('val-sim2-rho').textContent = `${(rho * 100).toFixed(2)}%`;

    // 1. Parámetros Elásticos (ASD - Apéndice C-G NSR-10)
    const Es = 200000; // MPa (C.8.5.2)
    const Ec = 4700 * Math.sqrt(fc); // MPa (C.8.5.1)
    const n = Es / Ec;
    const k_asd = Math.sqrt(2 * rho * n + Math.pow(rho * n, 2)) - rho * n;
    const j_asd = 1 - k_asd / 3;
    const fc_adm = 0.45 * fc;
    const fs_adm = 0.50 * fy;
    const R_c_asd = 0.5 * fc_adm * k_asd * j_asd;
    const R_s_asd = rho * fs_adm * j_asd;
    const R_asd = Math.min(R_c_asd, R_s_asd);

    // 2. Parámetros de Resistencia Última (LRFD - Cap. C.10 NSR-10)
    let beta1 = 0.85;
    if (fc > 28) {
      beta1 = Math.max(0.65, 0.85 - (0.05 * (fc - 28)) / 7);
    }

    const ecu = 0.003;
    const ety = fy / Es;
    let a_over_d = (rho * fy) / (0.85 * fc);
    let c_over_d = a_over_d / beta1;
    let et = ecu * ((1 - c_over_d) / c_over_d);

    if (et < ety) {
      const A_quad = 0.85 * fc * beta1;
      const B_quad = rho * Es * ecu;
      const C_quad = -rho * Es * ecu;
      c_over_d = (-B_quad + Math.sqrt(B_quad * B_quad - 4 * A_quad * C_quad)) / (2 * A_quad);
      a_over_d = beta1 * c_over_d;
      et = ecu * ((1 - c_over_d) / c_over_d);
    }

    const fs_ult = Math.min(fy, Es * et);
    const Rn_lrfd = rho * fs_ult * (1 - 0.5 * a_over_d);

    // Factor de reducción de resistencia phi según NSR-10 C.9.3.2
    let phi = 0.65;
    let zonaTexto = 'Controlada por Compresión (C.10.3.3)';
    let zonaColor = '#E11D48';
    if (et >= 0.005) {
      phi = 0.90;
      zonaTexto = 'Controlada por Tracción (C.10.3.4)';
      zonaColor = '#16A34A';
    } else if (et > ety) {
      phi = 0.65 + (et - ety) * (0.25 / (0.005 - ety));
      zonaTexto = et >= 0.004 ? 'Transición (Permitida en flexión C.10.3.5)' : 'Transición (εt < 0.004 No permitida en viga C.10.3.5)';
      zonaColor = '#EA580C';
    }

    const phiRn = phi * Rn_lrfd;

    // Actualizar KPIs en interfaz
    document.getElementById('kpi-beta1').textContent = beta1.toFixed(3);
    document.getElementById('kpi-kd-cd').textContent = `k=${k_asd.toFixed(3)}d | c=${c_over_d.toFixed(3)}d`;
    document.getElementById('kpi-et').textContent = `εt = ${et.toFixed(4)}`;
    document.getElementById('kpi-phi-val').textContent = `ϕ = ${phi.toFixed(2)}`;
    document.getElementById('kpi-zone').textContent = zonaTexto;
    document.getElementById('kpi-zone').style.color = zonaColor;
    document.getElementById('kpi-rasd-rlrfd').textContent = `${R_asd.toFixed(2)} vs ${phiRn.toFixed(2)} MPa`;

    // DIBUJAR CANVAS 1: SECCIÓN, DEFORMACIONES Y BLOQUES DE ESFUERZO (ASD vs WHITNEY)
    const dpr = window.devicePixelRatio || 1;
    const heightW = 300;
    canvasW.style.height = `${heightW}px`;
    const widthW = Math.max(320, Math.floor(canvasW.clientWidth || 640));
    canvasW.width = Math.floor(widthW * dpr);
    canvasW.height = Math.floor(heightW * dpr);

    const ctx = canvasW.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#F1F5F9' : '#0F172A';
    const subColor = isDark ? '#94A3B8' : '#475569';

    ctx.clearRect(0, 0, widthW, heightW);

    const topY = 44;
    const beamH = 210;
    const d_px = 182;
    const steelY = topY + d_px;
    const botY = topY + beamH;

    const y_kd = topY + Math.min(0.95, k_asd) * d_px;
    const y_c = topY + Math.min(0.95, c_over_d) * d_px;
    const y_a = topY + Math.min(0.95, a_over_d) * d_px;

    // Posiciones proporcionales al ancho disponible widthW
    const secX = Math.round(widthW * 0.04);
    const secW = Math.round(Math.min(105, widthW * 0.16));

    // --- COLUMNA 1: SECCIÓN TRANSVERSAL ---
    ctx.fillStyle = textColor;
    ctx.font = 'bold 11.5px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('1. Sección (b × h)', secX + secW / 2, 22);

    ctx.fillStyle = isDark ? '#1E293B' : '#F1F5F9';
    ctx.strokeStyle = isDark ? '#64748B' : '#334155';
    ctx.lineWidth = 2;
    ctx.fillRect(secX, topY, secW, beamH);
    ctx.strokeRect(secX, topY, secW, beamH);

    // Sombrear bloque comprimido de Whitney (a = beta1 * c)
    ctx.fillStyle = 'rgba(37, 99, 235, 0.28)';
    ctx.fillRect(secX, topY, secW, y_a - topY);

    // Línea eje neutro elástico kd (naranja punteada)
    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = '#EA580C';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(secX - 6, y_kd);
    ctx.lineTo(secX + secW + 6, y_kd);
    ctx.stroke();
    ctx.restore();

    // Línea eje neutro último c (azul continua)
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(secX - 6, y_c);
    ctx.lineTo(secX + secW + 6, y_c);
    ctx.stroke();

    // Barras de acero en y = steelY
    [0.22, 0.5, 0.78].forEach((frac) => {
      ctx.beginPath();
      ctx.arc(secX + secW * frac, steelY, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#0F172A';
      ctx.fill();
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    ctx.fillStyle = subColor;
    ctx.font = '10.5px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`As = ${(rho * 100).toFixed(2)}% bd`, secX + secW / 2, botY + 18);

    // --- COLUMNA 2: DIAGRAMA DE DEFORMACIONES UNITARIAS (C.10.2.2) ---
    const strainAxisX = Math.round(widthW * 0.43);
    const maxDefPx = Math.min(72, widthW * 0.11);
    const topStrainX = strainAxisX + maxDefPx * 0.55;
    const etRatio = Math.min(1.0, et / 0.008);
    const botStrainX = strainAxisX - maxDefPx * (0.35 + 0.65 * etRatio);

    ctx.fillStyle = textColor;
    ctx.font = 'bold 11.5px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('2. Deformaciones (C.10.2.2)', strainAxisX, 22);

    ctx.strokeStyle = subColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(strainAxisX, topY);
    ctx.lineTo(strainAxisX, steelY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(strainAxisX, topY);
    ctx.lineTo(topStrainX, topY);
    ctx.lineTo(strainAxisX, y_c);
    ctx.lineTo(botStrainX, steelY);
    ctx.lineTo(strainAxisX, steelY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(14, 165, 233, 0.16)';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(strainAxisX, topY);
    ctx.lineTo(topStrainX, topY);
    ctx.lineTo(botStrainX, steelY);
    ctx.lineTo(strainAxisX, steelY);
    ctx.strokeStyle = '#0EA5E9';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.fillStyle = '#0EA5E9';
    ctx.font = 'bold 10.5px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('εcu=0.003', topStrainX + 4, topY + 10);
    ctx.textAlign = 'center';
    ctx.fillText(`εt = ${et.toFixed(4)}`, strainAxisX, botY + 18);

    // --- COLUMNA 3: BLOQUE ELÁSTICO ASD VS. PARÁBOLA Y BLOQUE DE WHITNEY (0.85 f'c) ---
    const stressAxisX = Math.round(widthW * 0.66);
    const maxBlockW = Math.max(70, Math.min(130, widthW - stressAxisX - 24));
    const wWhitney = maxBlockW * 0.85;
    const wASD = maxBlockW * 0.45;

    ctx.fillStyle = textColor;
    ctx.font = 'bold 11.5px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("3. ASD (0.45f'c) vs Whitney (0.85f'c)", stressAxisX + maxBlockW / 2, 22);

    ctx.strokeStyle = subColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(stressAxisX, topY);
    ctx.lineTo(stressAxisX, steelY);
    ctx.stroke();

    // A) Parábola real inelástica de Hognestad
    ctx.beginPath();
    ctx.moveTo(stressAxisX, y_c);
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const frac = i / steps;
      const eps = frac * ecu;
      const eps0 = 0.002;
      let sigmaRatio = 0;
      if (eps <= eps0) {
        sigmaRatio = 2 * (eps / eps0) - Math.pow(eps / eps0, 2);
      } else {
        sigmaRatio = 1 - 0.15 * ((eps - eps0) / (ecu - eps0));
      }
      const px = stressAxisX + sigmaRatio * maxBlockW;
      const py = y_c - frac * (y_c - topY);
      ctx.lineTo(px, py);
    }
    ctx.lineTo(stressAxisX, topY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(124, 58, 237, 0.14)';
    ctx.fill();
    ctx.strokeStyle = '#7C3AED';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // B) Bloque Rectangular Equivalente de Whitney
    ctx.fillStyle = 'rgba(37, 99, 235, 0.26)';
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 2.2;
    ctx.fillRect(stressAxisX, topY, wWhitney, y_a - topY);
    ctx.strokeRect(stressAxisX, topY, wWhitney, y_a - topY);

    // C) Bloque Triangular Elástico ASD
    ctx.beginPath();
    ctx.moveTo(stressAxisX, topY);
    ctx.lineTo(stressAxisX + wASD, topY);
    ctx.lineTo(stressAxisX, y_kd);
    ctx.closePath();
    ctx.fillStyle = 'rgba(234, 88, 12, 0.35)';
    ctx.fill();
    ctx.strokeStyle = '#EA580C';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Fuerza de tracción T = As * fy
    ctx.strokeStyle = '#16A34A';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(stressAxisX, steelY);
    ctx.lineTo(stressAxisX + wWhitney * 0.9, steelY);
    ctx.stroke();

    ctx.fillStyle = '#2563EB';
    ctx.font = 'bold 10.5px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`0.85f'c (a=${a_over_d.toFixed(2)}d)`, stressAxisX + 6, Math.max(topY + 14, y_a - 6));

    ctx.fillStyle = '#EA580C';
    ctx.fillText(`ASD 0.45f'c`, stressAxisX + 6, Math.min(steelY - 22, y_kd + 14));

    ctx.fillStyle = '#16A34A';
    ctx.fillText(`T = As·fs`, stressAxisX + 6, steelY - 6);

    // ========================================================================
    // DIBUJAR CANVAS 2: CURVA NORMATIVA PHI vs EPSILON_T (NSR-10 C.9.3.2)
    // ========================================================================
    const heightP = 195;
    canvasP.style.height = `${heightP}px`;
    const widthP = Math.max(320, Math.floor(canvasP.clientWidth || 640));
    canvasP.width = Math.floor(widthP * dpr);
    canvasP.height = Math.floor(heightP * dpr);

    const ctxP = canvasP.getContext('2d');
    ctxP.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxP.clearRect(0, 0, widthP, heightP);

    const pL = 52;
    const pR = 24;
    const pT = 26;
    const pB = 38;
    const wP = widthP - pL - pR;
    const hP = heightP - pT - pB;

    // Eje X fijo en [0, 0.008]
    const eMaxPlot = 0.008;
    const toXP = (eVal) => pL + (Math.max(0, Math.min(eVal, eMaxPlot)) / eMaxPlot) * wP;
    const toYP = (phiVal) => pT + hP - ((phiVal - 0.55) / (1.0 - 0.55)) * hP;

    const xEty = toXP(ety);
    const x004 = toXP(0.004);
    const x005 = toXP(0.005);

    ctxP.fillStyle = 'rgba(225, 29, 72, 0.1)';
    ctxP.fillRect(pL, pT, xEty - pL, hP);

    ctxP.fillStyle = 'rgba(234, 88, 12, 0.1)';
    ctxP.fillRect(xEty, pT, x005 - xEty, hP);

    ctxP.fillStyle = 'rgba(22, 163, 74, 0.1)';
    ctxP.fillRect(x005, pT, pL + wP - x005, hP);

    ctxP.strokeStyle = subColor;
    ctxP.lineWidth = 1.2;
    ctxP.strokeRect(pL, pT, wP, hP);

    // Línea Espiral (0.75 -> 0.90) punteada
    ctxP.save();
    ctxP.setLineDash([5, 4]);
    ctxP.strokeStyle = '#0EA5E9';
    ctxP.lineWidth = 2;
    ctxP.beginPath();
    ctxP.moveTo(pL, toYP(0.75));
    ctxP.lineTo(xEty, toYP(0.75));
    ctxP.lineTo(x005, toYP(0.90));
    ctxP.lineTo(pL + wP, toYP(0.90));
    ctxP.stroke();
    ctxP.restore();

    // Línea Estribos (0.65 -> 0.90) continua
    ctxP.strokeStyle = '#2563EB';
    ctxP.lineWidth = 2.6;
    ctxP.beginPath();
    ctxP.moveTo(pL, toYP(0.65));
    ctxP.lineTo(xEty, toYP(0.65));
    ctxP.lineTo(x005, toYP(0.90));
    ctxP.lineTo(pL + wP, toYP(0.90));
    ctxP.stroke();

    // Límite C.10.3.5 (et = 0.004)
    ctxP.save();
    ctxP.setLineDash([3, 3]);
    ctxP.strokeStyle = '#EA580C';
    ctxP.beginPath();
    ctxP.moveTo(x004, pT);
    ctxP.lineTo(x004, pT + hP);
    ctxP.stroke();
    ctxP.restore();

    ctxP.fillStyle = textColor;
    ctxP.font = '10.5px JetBrains Mono, monospace';
    ctxP.textAlign = 'right';
    ctxP.fillText('0.90', pL - 6, toYP(0.90) + 4);
    ctxP.fillText('0.75', pL - 6, toYP(0.75) + 4);
    ctxP.fillText('0.65', pL - 6, toYP(0.65) + 4);

    ctxP.textAlign = 'center';
    ctxP.fillText('0.000', pL, pT + hP + 15);
    ctxP.fillText(`εty=${ety.toFixed(4)}`, xEty, pT + hP + 15);
    ctxP.fillText('0.004', x004, pT + hP + 28);
    ctxP.fillText('0.005', x005, pT + hP + 15);
    ctxP.fillText('≥0.008', pL + wP, pT + hP + 15);

    const curX = toXP(et);
    const curY = toYP(phi);
    ctxP.beginPath();
    ctxP.arc(curX, curY, 6.5, 0, Math.PI * 2);
    ctxP.fillStyle = zonaColor;
    ctxP.fill();
    ctxP.strokeStyle = '#FFFFFF';
    ctxP.lineWidth = 2;
    ctxP.stroke();

    ctxP.fillStyle = textColor;
    ctxP.font = 'bold 11px Inter, sans-serif';
    const alignRight = curX > pL + wP * 0.62;
    ctxP.textAlign = alignRight ? 'right' : 'left';
    ctxP.fillText(
      `Estado Actual: (εt=${et.toFixed(4)}, ϕ=${phi.toFixed(2)})`,
      curX + (alignRight ? -10 : 10),
      curY - 10
    );
  }

  /* ==========================================================================
     SIMULADOR 3: MATRIZ SEAOC VISION 2000 INTERACTIVA
     ========================================================================== */
  function initVisionMatrix() {
    const details = {
      OB: {
        title: 'Objetivo Básico (OB) — Edificaciones Convencionales (Grupo I)',
        desc: 'Viviendas, edificios de oficinas y comercio general. Bajo un sismo Frecuente (TR = 43 años) la estructura debe permanecer Totalmente Operacional; bajo un sismo Raro de Diseño (TR = 475 años, único punto evaluado explícitamente en códigos prescriptivos tradicionales como la NSR-10) se exige el nivel de Seguridad de Vida (daño controlado sin colapso).',
        drift: 'Deriva máxima típica asociada al objetivo en sismo raro: Δ ≤ 1.0% hpi.',
        cost: 'En un sismo raro (475 años), aunque la estructura salve las vidas humanas, el costo de reparación de elementos no estructurales y contenidos puede superar el 60%–80% del valor total del edificio (Taghavi & Miranda, 2003).'
      },
      OEP: {
        title: 'Objetivo Esencial / Peligroso (OEP) — Edificaciones Indispensables (Grupos III y IV)',
        desc: 'Hospitales, centros de salud con cirugía, estaciones de bomberos, cuarteles de atención de emergencias y escuelas. Requieren permanecer en nivel Operacional ante el sismo Raro (475 años) y en Seguridad de Vida incluso ante el sismo Muy Raro (970 años).',
        drift: 'Requiere mayor rigidez lateral y coeficiente de importancia I = 1.25 a 1.50, o sistemas de aislamiento basal / disipación de energía.',
        cost: 'Prioriza la continuidad operativa inmediata tras la catástrofe, protegiendo equipos médicos y líneas vitales.'
      },
      OSC: {
        title: 'Objetivo de Seguridad Crítica (OSC) — Instalaciones de Alto Riesgo',
        desc: 'Plantas nucleares, refinerías petroquímicas, depósitos de materiales altamente tóxicos o explosivos cuya falla podría desencadenar una catástrofe ambiental o regional.',
        drift: 'Exige comportamiento prácticamente elástico (Totalmente Operacional en sismo de 475 años y Operacional en sismo de 970 años).',
        cost: 'La inversión inicial estructural es máxima porque el costo social y ambiental de cualquier fuga o paro es inaceptable.'
      }
    };

    window.selectVisionObjective = function (key) {
      const info = details[key];
      if (!info) return;
      document.getElementById('vision-detail-title').textContent = info.title;
      document.getElementById('vision-detail-desc').textContent = info.desc;
      document.getElementById('vision-detail-drift').textContent = info.drift;
      document.getElementById('vision-detail-cost').textContent = info.cost;

      document.querySelectorAll('[data-vision-obj]').forEach((el) => {
        el.style.outline =
          el.getAttribute('data-vision-obj') === key ? '3px solid #0F172A' : 'none';
      });
    };
  }
})();

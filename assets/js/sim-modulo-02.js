/**
 * DIPLOMADO EN DISEÑO DE ESTRUCTURAS DE CONCRETO REFORZADO
 * Archivo: assets/js/sim-modulo-02.js
 * Propósito: Simuladores interactivos de Predimensionamiento por Elemento Estructural:
 *            1) Vigas, Viguetas (Nervios), Riostras y Losas (NSR-10 C.9.5 y C.8.13 detallado por numeral)
 *            2) Columnas y Zapatas Aisladas por Áreas Aferentes, Servicio y Punzonamiento (C.10, C.11.11, C.15, C.21)
 */

(function () {
  'use strict';

  /* ==========================================================================
     UTILIDADES DE CANVAS HiDPI (SIN DESBORDAMIENTO DE GRID)
     ========================================================================== */
  function setupHiDPICanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const parent = canvas.parentElement;
    const rectWidth = parent ? parent.clientWidth - 28 : canvas.clientWidth;
    const width = Math.max(300, rectWidth || 640);
    const height = parseInt(canvas.getAttribute('height') || '370', 10);

    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, width, height };
  }

  function getThemeColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      isDark,
      bg: isDark ? '#0B1120' : '#F8FAFC',
      cardBg: isDark ? '#1E293B' : '#FFFFFF',
      grid: isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(148, 163, 184, 0.25)',
      axis: isDark ? '#94A3B8' : '#475569',
      text: isDark ? '#F1F5F9' : '#0F172A',
      muted: isDark ? '#94A3B8' : '#64748B',
      concrete: isDark ? '#334155' : '#CBD5E1',
      concreteStroke: isDark ? '#94A3B8' : '#475569',
      voidFill: isDark ? '#0F172A' : '#F1F5F9',
      primary: isDark ? '#38BDF8' : '#2563EB',
      secondary: isDark ? '#FBBF24' : '#D97706',
      success: isDark ? '#34D399' : '#059669',
      danger: isDark ? '#F87171' : '#DC2626',
      purple: isDark ? '#A78BFA' : '#7C3AED'
    };
  }

  function roundUpToStep(valMeters, stepMeters) {
    return Math.ceil((valMeters - 1e-9) / stepMeters) * stepMeters;
  }

  function drawDimensionLine(ctx, x1, y1, x2, y2, label, color, offset = 0) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 1) return;
    const nx = -dy / len;
    const ny = dx / len;

    const sx1 = x1 + nx * offset;
    const sy1 = y1 + ny * offset;
    const sx2 = x2 + nx * offset;
    const sy2 = y2 + ny * offset;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.3;

    if (Math.abs(offset) > 2) {
      ctx.save();
      ctx.setLineDash([2, 2]);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(sx1, sy1);
      ctx.moveTo(x2, y2);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.beginPath();
    ctx.moveTo(sx1, sy1);
    ctx.lineTo(sx2, sy2);
    ctx.stroke();

    const tick = 4;
    ctx.beginPath();
    ctx.moveTo(sx1 - nx * tick, sy1 - ny * tick);
    ctx.lineTo(sx1 + nx * tick, sy1 + ny * tick);
    ctx.moveTo(sx2 - nx * tick, sy2 - ny * tick);
    ctx.lineTo(sx2 + nx * tick, sy2 + ny * tick);
    ctx.stroke();

    const mx = (sx1 + sx2) / 2;
    const my = (sy1 + sy2) / 2;
    ctx.font = '700 11px "JetBrains Mono", monospace';
    const textWidth = ctx.measureText(label).width;
    ctx.fillStyle = getThemeColors().bg;
    ctx.fillRect(mx - textWidth / 2 - 4, my - 8, textWidth + 8, 16);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, mx, my);
    ctx.restore();
  }

  /* ==========================================================================
     SIMULADOR 1: VIGAS, VIGUETAS (NERVIOS), RIOSTRAS Y LOSAS (C.9.5 y C.8.13)
     ========================================================================== */
  function initSlabBeamSimulator() {
    const canvas = document.getElementById('canvas-slab-beam');
    if (!canvas) return;

    const elLx = document.getElementById('sim1-lx');
    const elLy = document.getElementById('sim1-ly');
    const elLv = document.getElementById('sim1-lv');
    const elSupport = document.getElementById('sim1-support');
    const elCriteria = document.getElementById('sim1-criteria');
    const elSlabType = document.getElementById('sim1-slab-type');
    const elFy = document.getElementById('sim1-fy');
    const elBwRib = document.getElementById('sim1-bw-rib');
    const elARib = document.getElementById('sim1-a-rib');
    const elTRib = document.getElementById('sim1-t-rib');

    const DIVISORS = {
      c95a: {
        solid: { simple: 20, oneCont: 24, bothCont: 28, cant: 10 },
        ribbed: { simple: 16, oneCont: 18.5, bothCont: 21, cant: 8 }
      },
      cr95: {
        solid: { simple: 14, oneCont: 16, bothCont: 19, cant: 7 },
        ribbed: { simple: 11, oneCont: 12, bothCont: 14, cant: 5 }
      }
    };

    function render() {
      const { ctx, width, height } = setupHiDPICanvas(canvas);
      const colors = getThemeColors();

      const Lx = parseFloat(elLx.value);
      const Ly = parseFloat(elLy.value);
      const Lv = parseFloat(elLv.value);
      const supportKey = elSupport.value;
      const criteriaKey = elCriteria.value;
      const slabType = elSlabType.value;
      const fy = parseFloat(elFy.value);
      const bwRibCm = parseFloat(elBwRib.value);
      const aRibCm = parseFloat(elARib.value);
      const tUserCm = elTRib ? parseFloat(elTRib.value) : 5.0;

      document.getElementById('val-sim1-lx').textContent = `${Lx.toFixed(2)} m`;
      document.getElementById('val-sim1-ly').textContent = `${Ly.toFixed(2)} m`;
      document.getElementById('val-sim1-lv').textContent = `${Lv.toFixed(2)} m`;
      document.getElementById('val-sim1-fy').textContent = `${fy.toFixed(0)} MPa`;
      document.getElementById('val-sim1-bw-rib').textContent = `${bwRibCm.toFixed(0)} cm`;
      document.getElementById('val-sim1-a-rib').textContent = `${aRibCm.toFixed(0)} cm`;
      if (elTRib) {
        document.getElementById('val-sim1-t-rib').textContent = `${tUserCm.toFixed(1)} cm`;
      }

      const factorFy = 0.4 + fy / 700.0;

      // 1. Luces del panel
      const lLong = Math.max(Lx, Ly);
      const lShort = Math.min(Lx, Ly);
      const betaRatio = lLong / lShort;

      // 2. Altura mínima de vigueta / losa (salva la luz corta lShort)
      const divSlabSpan = DIVISORS[criteriaKey][slabType][supportKey];
      const divSlabCant = DIVISORS[criteriaKey][slabType].cant;
      const hSlabSpanRaw = (lShort / divSlabSpan) * factorFy;
      const hSlabCantRaw = Lv > 0.05 ? (Lv / divSlabCant) * factorFy : 0;
      const hSlabReq = Math.max(hSlabSpanRaw, hSlabCantRaw);
      const hSlabConstructive = roundUpToStep(hSlabReq, 0.05); // múltiplo de 5 cm

      // 3. Altura mínima de Vigas Principales (luz larga lLong + voladizo Lv) y Secundarias (luz corta lShort)
      const divBeamSpan = DIVISORS[criteriaKey].ribbed[supportKey];
      const divBeamCant = DIVISORS[criteriaKey].ribbed.cant;
      const hBeamMainSpanRaw = (lLong / divBeamSpan) * factorFy;
      const hBeamMainCantRaw = Lv > 0.05 ? (Lv / divBeamCant) * factorFy : 0;
      const hBeamMainReq = Math.max(hBeamMainSpanRaw, hBeamMainCantRaw);
      const hBeamMainConst = Math.max(hSlabConstructive, roundUpToStep(hBeamMainReq, 0.05));
      const bBeamMainConst = Math.max(0.25, roundUpToStep(0.6 * hBeamMainConst, 0.05));

      const hBeamSecRaw = (lShort / divBeamSpan) * factorFy;
      const hBeamSecConst = Math.max(hSlabConstructive, roundUpToStep(hBeamSecRaw, 0.05));

      // 4. Verificaciones geométricas detalladas de Viguetas, Riostras y Loseta (NSR-10 C.8.13)
      const bwMeters = bwRibCm / 100.0;
      const aMeters = aRibCm / 100.0;
      const sMeters = bwMeters + aMeters; // S = A + bw
      const tMeters = tUserCm / 100.0;
      const tMinAbs = 0.045; // 45 mm (C.8.13.6)
      const tMinBySpan = aMeters / 20.0; // A / 20 (C.8.13.6)
      const tMinReq = Math.max(tMinAbs, tMinBySpan);
      const hwMeters = Math.max(0.02, hSlabConstructive - tMeters);
      const hwMaxAllowed = 5.0 * bwMeters; // C.8.13.2: hw <= 5 * bw
      const sMaxByHt = 2.5 * hSlabConstructive; // C.8.13.3: S <= 2.5 * ht
      const sMaxAbs = 1.20; // C.8.13.3: S <= 1.20 m
      const sMaxAllowed = Math.min(sMaxByHt, sMaxAbs);

      // Riostras de repartición (NSR-10 C.8.13.3.1):
      // Distancia libre máxima entre riostras = min(10 * ht, 4.00 m).
      // Si la luz de la vigueta lShort <= min(10 * ht, 4.00 m), NO requiere riostra intermedia (0 riostras).
      const riostraMaxDist = Math.min(10.0 * hSlabConstructive, 4.00);
      const numRiostras = lShort > riostraMaxDist + 1e-6 ? Math.ceil(lShort / riostraMaxDist) - 1 : 0;
      const distBetweenRiostras = lShort / (numRiostras + 1);

      // Chequeos booleanos individuales por numeral
      const checkC813_2_bw = bwMeters >= 0.10 - 1e-6;
      const checkC813_2_hw = hwMeters <= hwMaxAllowed + 1e-6;
      const checkC813_3_ht = sMeters <= sMaxByHt + 1e-6;
      const checkC813_3_abs = sMeters <= sMaxAbs + 1e-6;
      const checkC813_3 = checkC813_3_ht && checkC813_3_abs;
      const checkC813_6_abs = tMeters >= tMinAbs - 1e-6;
      const checkC813_6_span = tMeters >= tMinBySpan - 1e-6;
      const checkC813_6 = checkC813_6_abs && checkC813_6_span;

      const allRibChecksOk =
        slabType === 'solid' || (checkC813_2_bw && checkC813_2_hw && checkC813_3 && checkC813_6);

      // Actualizar métricas superiores
      document.getElementById('res-sim1-hbeam').textContent =
        `Viga Ppal (L=${lLong.toFixed(1)}m): ${(bBeamMainConst * 100).toFixed(0)}×${(hBeamMainConst * 100).toFixed(0)} cm | Viga Sec (L=${lShort.toFixed(1)}m): h=${(hBeamSecConst * 100).toFixed(0)} cm`;
      document.getElementById('res-sim1-hslab').textContent =
        `L_vigueta = ${lShort.toFixed(2)} m → h_min = ${(hSlabReq * 100).toFixed(1)} cm → Adoptado ht = ${(hSlabConstructive * 100).toFixed(0)} cm`;

      if (slabType === 'solid') {
        document.getElementById('res-sim1-riostra').textContent = `No aplica (Losa maciza de espesor e = ${(hSlabConstructive * 100).toFixed(0)} cm)`;
      } else if (numRiostras === 0) {
        document.getElementById('res-sim1-riostra').textContent =
          `0 riostras requeridas: L_vigueta (${lShort.toFixed(2)} m) ≤ mín(10·ht, 4.0 m) = ${riostraMaxDist.toFixed(2)} m`;
      } else {
        document.getElementById('res-sim1-riostra').textContent =
          `Requiere ${numRiostras} riostra(s) c/${distBetweenRiostras.toFixed(2)} m (pues L_vigueta = ${lShort.toFixed(2)} m > ${riostraMaxDist.toFixed(2)} m)`;
      }

      // Panel detallado numeral por numeral de C.8.13
      const detailBox = document.getElementById('res-sim1-c813-detail');
      if (detailBox) {
        if (slabType === 'solid') {
          detailBox.innerHTML = `
            <div style="color: ${colors.success}; font-weight: 700;">
              ✓ Losa Maciza seleccionada (Espesor adoptado e = ${(hSlabConstructive * 100).toFixed(0)} cm según ${criteriaKey === 'cr95' ? 'Tabla CR.9.5' : 'Tabla C.9.5(a)'}, factor fy = ${factorFy.toFixed(2)}). Los numerales C.8.13 aplican únicamente a losas nervadas/aligeradas.
            </div>`;
        } else {
          const items = [
            {
              ok: checkC813_2_bw,
              num: 'C.8.13.2 (Ancho de nervio bw)',
              msg: checkC813_2_bw
                ? `Cumple: bw = ${bwRibCm.toFixed(0)} cm ≥ 10 cm (100 mm).`
                : `NO CUMPLE C.8.13.2: El ancho del nervio bw = ${bwRibCm.toFixed(0)} cm es menor que el mínimo reglamentario de 10 cm (100 mm).`
            },
            {
              ok: checkC813_2_hw,
              num: 'C.8.13.2 (Esbeltez del alma hw ≤ 5·bw)',
              msg: checkC813_2_hw
                ? `Cumple: hw = ${(hwMeters * 100).toFixed(1)} cm ≤ 5·bw = ${(hwMaxAllowed * 100).toFixed(0)} cm.`
                : `NO CUMPLE C.8.13.2: La altura libre del nervio hw = ${(hwMeters * 100).toFixed(1)} cm supera 5·bw = ${(hwMaxAllowed * 100).toFixed(0)} cm (debe aumentar bw o diseñar la vigueta como viga con estribos cerrados).`
            },
            {
              ok: checkC813_3,
              num: 'C.8.13.3 (Separación centro a centro S = A + bw)',
              msg: checkC813_3
                ? `Cumple: S = ${(sMeters * 100).toFixed(0)} cm ≤ mín(2.5·ht = ${(sMaxByHt * 100).toFixed(0)} cm, 120 cm) = ${(sMaxAllowed * 100).toFixed(0)} cm.`
                : !checkC813_3_ht && !checkC813_3_abs
                  ? `NO CUMPLE C.8.13.3: S = ${(sMeters * 100).toFixed(0)} cm excede tanto 2.5·ht (${(sMaxByHt * 100).toFixed(0)} cm) como el tope máximo de 120 cm.`
                  : !checkC813_3_ht
                    ? `NO CUMPLE C.8.13.3: S = ${(sMeters * 100).toFixed(0)} cm excede 2.5·ht = ${(sMaxByHt * 100).toFixed(0)} cm.`
                    : `NO CUMPLE C.8.13.3: S = ${(sMeters * 100).toFixed(0)} cm excede el tope absoluto de 120 cm (1.20 m).`
            },
            {
              ok: checkC813_6,
              num: 'C.8.13.6 (Espesor de loseta superior t)',
              msg: checkC813_6
                ? `Cumple: t = ${tUserCm.toFixed(1)} cm ≥ máx(4.5 cm, A/20 = ${(tMinBySpan * 100).toFixed(2)} cm) = ${(tMinReq * 100).toFixed(2)} cm.`
                : !checkC813_6_abs
                  ? `NO CUMPLE C.8.13.6: El espesor de loseta t = ${tUserCm.toFixed(1)} cm es menor que el mínimo absoluto de 4.5 cm (45 mm).`
                  : `NO CUMPLE C.8.13.6: El espesor de loseta t = ${tUserCm.toFixed(1)} cm es menor que 1/20 de la distancia libre entre nervios (A/20 = ${(tMinBySpan * 100).toFixed(2)} cm).`
            },
            {
              ok: true,
              num: 'C.8.13.3.1 (Riostras de repartición)',
              msg:
                numRiostras === 0
                  ? `Cumple sin riostra intermedia: Luz de vigueta (${lShort.toFixed(2)} m) ≤ mín(10·ht = ${(10 * hSlabConstructive).toFixed(2)} m, 4.00 m) = ${riostraMaxDist.toFixed(2)} m.`
                  : `Exige ${numRiostras} riostra(s) transversal(es) (separadas a ${distBetweenRiostras.toFixed(2)} m ≤ ${riostraMaxDist.toFixed(2)} m) porque la luz de la vigueta (${lShort.toFixed(2)} m) supera ${riostraMaxDist.toFixed(2)} m.`
            }
          ];

          detailBox.innerHTML = items
            .map(
              (item) => `
              <div style="display: flex; align-items: flex-start; gap: 0.5rem; padding: 0.35rem 0; border-bottom: 1px dashed var(--border-color); font-size: 0.83rem;">
                <span style="font-weight: 800; color: ${item.ok ? colors.success : colors.danger}; min-width: 18px;">${item.ok ? '✓' : '✗'}</span>
                <div>
                  <strong style="color: ${item.ok ? 'var(--text-main)' : colors.danger};">${item.num}:</strong>
                  <span style="color: var(--text-secondary);"> ${item.msg}</span>
                </div>
              </div>`
            )
            .join('');
        }
      }

      // =====================================================================
      // DIBUJO EN CANVAS: IZQUIERDA (PLANTA ESTRUCTURAL) | DERECHA (SECCIÓN)
      // =====================================================================
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, width, height);

      const midX = Math.floor(width * 0.46);
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(midX, 14);
      ctx.lineTo(midX, height - 14);
      ctx.stroke();

      // --- PANEL IZQUIERDO: PLANTA DEL PANEL, VIGUETAS Y RIOSTRAS ---
      ctx.fillStyle = colors.text;
      ctx.font = '700 12px "Inter", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('1. Planta: Vigas, Viguetas y Riostras (C.8.13.3.1)', 16, 22);

      const planPad = 46;
      const availW = midX - planPad * 2 - 20;
      const availH = height - 105;

      const totalPlanX = Lx + Lv;
      const scalePlan = Math.min(availW / Math.max(totalPlanX, 1), availH / Math.max(Ly, 1));
      const drawLx = Lx * scalePlan;
      const drawLv = Lv * scalePlan;
      const drawLy = Ly * scalePlan;

      const startX = Math.round(planPad + (availW - (drawLx + drawLv)) / 2);
      const startY = Math.round(52 + (availH - drawLy) / 2);

      ctx.fillStyle = colors.cardBg;
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 2.2;
      ctx.fillRect(startX, startY, drawLx + drawLv, drawLy);
      ctx.strokeRect(startX, startY, drawLx + drawLv, drawLy);

      if (Lv > 0.05) {
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = colors.secondary;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(startX + drawLx, startY - 8);
        ctx.lineTo(startX + drawLx, startY + drawLy + 8);
        ctx.stroke();
        ctx.restore();
      }

      // Dibujar viguetas paralelas a la luz corta lShort y riostras solo cuando numRiostras > 0
      const ribsHorizontal = Lx <= Ly;
      ctx.save();
      ctx.strokeStyle = colors.isDark ? 'rgba(56, 189, 248, 0.45)' : 'rgba(37, 99, 235, 0.35)';
      ctx.lineWidth = 1.2;
      const numLines = 7;
      if (ribsHorizontal) {
        for (let i = 1; i < numLines; i++) {
          const yLine = startY + (drawLy * i) / numLines;
          ctx.beginPath();
          ctx.moveTo(startX, yLine);
          ctx.lineTo(startX + drawLx + drawLv, yLine);
          ctx.stroke();
        }
        if (slabType === 'ribbed' && numRiostras > 0) {
          ctx.strokeStyle = colors.secondary;
          ctx.lineWidth = 2.0;
          for (let r = 1; r <= numRiostras; r++) {
            const xR = startX + (drawLx * r) / (numRiostras + 1);
            ctx.beginPath();
            ctx.moveTo(xR, startY);
            ctx.lineTo(xR, startY + drawLy);
            ctx.stroke();
          }
        }
      } else {
        for (let i = 1; i < numLines; i++) {
          const xLine = startX + ((drawLx + drawLv) * i) / numLines;
          ctx.beginPath();
          ctx.moveTo(xLine, startY);
          ctx.lineTo(xLine, startY + drawLy);
          ctx.stroke();
        }
        if (slabType === 'ribbed' && numRiostras > 0) {
          ctx.strokeStyle = colors.secondary;
          ctx.lineWidth = 2.0;
          for (let r = 1; r <= numRiostras; r++) {
            const yR = startY + (drawLy * r) / (numRiostras + 1);
            ctx.beginPath();
            ctx.moveTo(startX, yR);
            ctx.lineTo(startX + drawLx + drawLv, yR);
            ctx.stroke();
          }
        }
      }
      ctx.restore();

      const colSize = 8;
      ctx.fillStyle = colors.text;
      [
        [startX, startY],
        [startX + drawLx, startY],
        [startX, startY + drawLy],
        [startX + drawLx, startY + drawLy]
      ].forEach(([cx, cy]) => {
        ctx.fillRect(cx - colSize / 2, cy - colSize / 2, colSize, colSize);
      });

      drawDimensionLine(ctx, startX, startY + drawLy, startX + drawLx, startY + drawLy, `Lx=${Lx.toFixed(1)}m`, colors.primary, 20);
      if (Lv > 0.05) {
        drawDimensionLine(ctx, startX + drawLx, startY + drawLy, startX + drawLx + drawLv, startY + drawLy, `Lv=${Lv.toFixed(1)}m`, colors.secondary, 20);
      }
      drawDimensionLine(ctx, startX, startY, startX, startY + drawLy, `Ly=${Ly.toFixed(1)}m`, colors.purple, -24);

      ctx.fillStyle = colors.muted;
      ctx.font = '600 11px "Inter", sans-serif';
      ctx.textAlign = 'left';
      const dirText = ribsHorizontal
        ? `Viguetas paralelas a Lx = ${Lx.toFixed(2)} m (Luz corta)`
        : `Viguetas paralelas a Ly = ${Ly.toFixed(2)} m (Luz corta)`;
      ctx.fillText(dirText, 16, height - 30);
      if (slabType === 'ribbed') {
        ctx.fillStyle = numRiostras === 0 ? colors.success : colors.secondary;
        ctx.fillText(
          numRiostras === 0
            ? `C.8.13.3.1: Sin riostra (L=${lShort.toFixed(2)}m ≤ ${riostraMaxDist.toFixed(2)}m)`
            : `C.8.13.3.1: ${numRiostras} riostra(s) c/${distBetweenRiostras.toFixed(2)}m (máx ${riostraMaxDist.toFixed(2)}m)`,
          16,
          height - 14
        );
      }

      // --- PANEL DERECHO: SECCIÓN TRANSVERSAL ---
      const rightX = midX + 18;
      const rightW = width - rightX - 16;

      ctx.fillStyle = colors.text;
      ctx.font = '700 12px "Inter", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(
        slabType === 'ribbed'
          ? '2. Sección Transversal de Viguetas y Loseta (C.8.13)'
          : '2. Sección Transversal de Losa Maciza y Viga (C.9.5)',
        rightX,
        22
      );

      const secTopY = 78;
      const secAvailH = height - 155;

      if (slabType === 'ribbed') {
        const totalWidthM = 2 * sMeters + bwMeters;
        const scaleX = (rightW - 40) / totalWidthM;
        const scaleY = Math.min(secAvailH / Math.max(hSlabConstructive, 0.25), scaleX * 1.35);

        const drawHt = Math.max(55, hSlabConstructive * scaleY);
        const drawT = Math.max(14, (tMeters / hSlabConstructive) * drawHt);
        const drawHw = Math.max(20, drawHt - drawT);
        const drawBw = bwMeters * scaleX;
        const drawA = aMeters * scaleX;
        const drawTotalW = 3 * drawBw + 2 * drawA;
        const secStartX = rightX + (rightW - drawTotalW) / 2;

        ctx.fillStyle = colors.voidFill;
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1.2;
        for (let k = 0; k < 2; k++) {
          const vx = secStartX + drawBw + k * (drawBw + drawA);
          const vy = secTopY + drawT;
          ctx.fillRect(vx, vy, drawA, drawHw);
          ctx.strokeRect(vx, vy, drawA, drawHw);

          ctx.beginPath();
          ctx.moveTo(vx, vy);
          ctx.lineTo(vx + drawA, vy + drawHw);
          ctx.moveTo(vx + drawA, vy);
          ctx.lineTo(vx, vy + drawHw);
          ctx.stroke();
        }

        ctx.fillStyle = colors.concrete;
        ctx.strokeStyle = allRibChecksOk ? colors.concreteStroke : colors.danger;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(secStartX, secTopY);
        ctx.lineTo(secStartX + drawTotalW, secTopY);
        ctx.lineTo(secStartX + drawTotalW, secTopY + drawHt);
        ctx.lineTo(secStartX + 2 * drawBw + 2 * drawA, secTopY + drawHt);
        ctx.lineTo(secStartX + 2 * drawBw + 2 * drawA, secTopY + drawT);
        ctx.lineTo(secStartX + 2 * drawBw + drawA, secTopY + drawT);
        ctx.lineTo(secStartX + 2 * drawBw + drawA, secTopY + drawHt);
        ctx.lineTo(secStartX + drawBw + drawA, secTopY + drawHt);
        ctx.lineTo(secStartX + drawBw + drawA, secTopY + drawT);
        ctx.lineTo(secStartX + drawBw, secTopY + drawT);
        ctx.lineTo(secStartX + drawBw, secTopY + drawHt);
        ctx.lineTo(secStartX, secTopY + drawHt);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = colors.secondary;
        for (let r = 0; r < 3; r++) {
          const rx = secStartX + r * (drawBw + drawA) + drawBw / 2;
          ctx.beginPath();
          ctx.arc(rx, secTopY + drawHt - 8, 3.8, 0, Math.PI * 2);
          ctx.fill();
        }

        drawDimensionLine(
          ctx,
          secStartX,
          secTopY,
          secStartX,
          secTopY + drawHt,
          `ht=${(hSlabConstructive * 100).toFixed(0)}cm`,
          colors.primary,
          -26
        );
        drawDimensionLine(
          ctx,
          secStartX + drawTotalW,
          secTopY,
          secStartX + drawTotalW,
          secTopY + drawT,
          `t=${tUserCm.toFixed(1)}cm`,
          checkC813_6 ? colors.success : colors.danger,
          24
        );
        drawDimensionLine(
          ctx,
          secStartX + drawTotalW,
          secTopY + drawT,
          secStartX + drawTotalW,
          secTopY + drawHt,
          `hw=${(hwMeters * 100).toFixed(1)}cm`,
          checkC813_2_hw ? colors.purple : colors.danger,
          24
        );
        drawDimensionLine(
          ctx,
          secStartX,
          secTopY + drawHt,
          secStartX + drawBw,
          secTopY + drawHt,
          `bw=${bwRibCm}cm`,
          checkC813_2_bw ? colors.primary : colors.danger,
          22
        );
        drawDimensionLine(
          ctx,
          secStartX + drawBw,
          secTopY + drawHt,
          secStartX + drawBw + drawA,
          secTopY + drawHt,
          `A=${aRibCm}cm`,
          colors.secondary,
          22
        );
        drawDimensionLine(
          ctx,
          secStartX + drawBw / 2,
          secTopY,
          secStartX + drawBw / 2 + drawBw + drawA,
          secTopY,
          `S = ${(sMeters * 100).toFixed(0)} cm (máx ${(sMaxAllowed * 100).toFixed(0)} cm)`,
          checkC813_3 ? colors.primary : colors.danger,
          -18
        );
      } else {
        const drawW = rightW - 70;
        const secStartX = rightX + 35;
        const drawSlabH = Math.max(26, Math.min(55, hSlabConstructive * 220));
        const drawBeamH = Math.max(drawSlabH + 28, Math.min(135, hBeamMainConst * 220));
        const drawBeamB = Math.max(46, Math.min(95, bBeamMainConst * 220));
        const beamX = secStartX + (drawW - drawBeamB) / 2;

        ctx.fillStyle = colors.concrete;
        ctx.strokeStyle = colors.concreteStroke;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(secStartX, secTopY);
        ctx.lineTo(secStartX + drawW, secTopY);
        ctx.lineTo(secStartX + drawW, secTopY + drawSlabH);
        ctx.lineTo(beamX + drawBeamB, secTopY + drawSlabH);
        ctx.lineTo(beamX + drawBeamB, secTopY + drawBeamH);
        ctx.lineTo(beamX, secTopY + drawBeamH);
        ctx.lineTo(beamX, secTopY + drawSlabH);
        ctx.lineTo(secStartX, secTopY + drawSlabH);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        drawDimensionLine(
          ctx,
          secStartX,
          secTopY,
          secStartX,
          secTopY + drawSlabH,
          `e_losa=${(hSlabConstructive * 100).toFixed(0)}cm`,
          colors.primary,
          -26
        );
        drawDimensionLine(
          ctx,
          beamX + drawBeamB,
          secTopY,
          beamX + drawBeamB,
          secTopY + drawBeamH,
          `h_viga=${(hBeamMainConst * 100).toFixed(0)}cm`,
          colors.secondary,
          30
        );
        drawDimensionLine(
          ctx,
          beamX,
          secTopY + drawBeamH,
          beamX + drawBeamB,
          secTopY + drawBeamH,
          `bw=${(bBeamMainConst * 100).toFixed(0)}cm`,
          colors.purple,
          22
        );
      }

      ctx.fillStyle = colors.muted;
      ctx.font = '600 11px "Inter", sans-serif';
      ctx.textAlign = 'left';
      const critLabel =
        criteriaKey === 'cr95'
          ? 'Criterio activo: Tabla CR.9.5 (Soporta muros/particiones frágiles)'
          : 'Criterio activo: Tabla C.9.5(a) (Sin elementos frágiles susceptibles)';
      ctx.fillText(critLabel, rightX, height - 14);
    }

    [elLx, elLy, elLv, elSupport, elCriteria, elSlabType, elFy, elBwRib, elARib, elTRib].forEach((el) => {
      if (el) el.addEventListener('input', render);
      if (el) el.addEventListener('change', render);
    });

    window.addEventListener('resize', render);
    window.addEventListener('themeChanged', render);
    render();
  }

  /* ==========================================================================
     SIMULADOR 2: COLUMNAS Y ZAPATAS AISLADAS (C.10, C.11.11, C.15 y C.21)
     ========================================================================== */
  function initColumnTributarySimulator() {
    const canvas = document.getElementById('canvas-col-tributary');
    if (!canvas) return;

    const elColType = document.getElementById('sim2-col-type');
    const elLx1 = document.getElementById('sim2-lx1');
    const elLx2 = document.getElementById('sim2-lx2');
    const elLy1 = document.getElementById('sim2-ly1');
    const elLy2 = document.getElementById('sim2-ly2');
    const elFloors = document.getElementById('sim2-floors');
    const elDead = document.getElementById('sim2-dead');
    const elLive = document.getElementById('sim2-live');
    const elFc = document.getElementById('sim2-fc');
    const elRho = document.getElementById('sim2-rho');
    const elDissipation = document.getElementById('sim2-dissipation');
    const elQadm = document.getElementById('sim2-qadm');

    function render() {
      const { ctx, width, height } = setupHiDPICanvas(canvas);
      const colors = getThemeColors();

      const colType = elColType.value;
      const Lx1 = parseFloat(elLx1.value);
      const Lx2 = parseFloat(elLx2.value);
      const Ly1 = parseFloat(elLy1.value);
      const Ly2 = parseFloat(elLy2.value);
      const N = parseInt(elFloors.value, 10);
      const D = parseFloat(elDead.value); // kN/m2
      const L = parseFloat(elLive.value); // kN/m2
      const fc = parseFloat(elFc.value); // MPa
      const rho = parseFloat(elRho.value) / 100.0;
      const diss = elDissipation.value; // 'DES' | 'DMO' | 'DMI'
      const qadm = elQadm ? parseFloat(elQadm.value) : 180.0; // kPa = kN/m2
      const fy = 420.0;

      document.getElementById('val-sim2-lx1').textContent = `${Lx1.toFixed(1)} m`;
      document.getElementById('val-sim2-lx2').textContent = `${Lx2.toFixed(1)} m`;
      document.getElementById('val-sim2-ly1').textContent = `${Ly1.toFixed(1)} m`;
      document.getElementById('val-sim2-ly2').textContent = `${Ly2.toFixed(1)} m`;
      document.getElementById('val-sim2-floors').textContent = `${N} pisos`;
      document.getElementById('val-sim2-dead').textContent = `${D.toFixed(1)} kN/m²`;
      document.getElementById('val-sim2-live').textContent = `${L.toFixed(1)} kN/m²`;
      document.getElementById('val-sim2-fc').textContent = `${fc.toFixed(0)} MPa`;
      document.getElementById('val-sim2-rho').textContent = `${(rho * 100).toFixed(2)}%`;
      if (elQadm) {
        document.getElementById('val-sim2-qadm').textContent = `${qadm.toFixed(0)} kPa`;
      }

      // 1. Área Aferente según ubicación
      let tribW = 0;
      let tribH = 0;
      let alphaSeismic = 1.25;
      let colLabel = '';

      if (colType === 'interior') {
        tribW = Lx1 / 2 + Lx2 / 2;
        tribH = Ly1 / 2 + Ly2 / 2;
        alphaSeismic = 1.25;
        colLabel = 'Columna Interior (C-2B)';
      } else if (colType === 'edgeX') {
        tribW = Lx1 / 2 + Lx2 / 2;
        tribH = Ly2 / 2;
        alphaSeismic = 1.35;
        colLabel = 'Columna Borde Inf. (C-2A)';
      } else if (colType === 'edgeY') {
        tribW = Lx1 / 2;
        tribH = Ly1 / 2 + Ly2 / 2;
        alphaSeismic = 1.35;
        colLabel = 'Columna Borde Izq. (C-1B)';
      } else {
        tribW = Lx1 / 2;
        tribH = Ly2 / 2;
        alphaSeismic = 1.50;
        colLabel = 'Columna Esquinera (C-1A)';
      }

      const Aaf = tribW * tribH;

      // 2. Bajada de cargas en Servicio (D + L) y Mayorada (1.2D + 1.6L)
      const ws = D + L; // kN/m2 (Servicio)
      const wu = 1.2 * D + 1.6 * L; // kN/m2 (Última)
      const PsGrav = N * ws * Aaf; // kN (Servicio acumulada)
      const PuGrav = N * wu * Aaf; // kN (Última gravitacional)
      const PuDesign = alphaSeismic * PuGrav; // kN (con factor sísmico para columna)

      // 3. Predimensionamiento de la Columna (NSR-10 C.10.3.6.2 y C.21)
      const phiCol = 0.65;
      // Factor 0.75 por excentricidad accidental en columnas con estribos (NSR-10 Ec. C.10-2)
      const fEffMPa = 0.75 * phiCol * (0.85 * fc * (1.0 - rho) + fy * rho);
      const AgReqStrengthCm2 = ((PuDesign * 1000.0) / fEffMPa) / 100.0;

      // Método alternativo práctico: Esfuerzo axial medio admisible (n * f'c)
      let nCoeff = 0.28;
      if (colType === 'interior') {
        nCoeff = diss === 'DES' ? 0.28 : 0.30;
      } else if (colType === 'edgeX' || colType === 'edgeY') {
        nCoeff = diss === 'DES' ? 0.22 : 0.25;
      } else {
        nCoeff = diss === 'DES' ? 0.16 : 0.20;
      }
      const AgAltCm2 = (PuGrav * 10.0) / (nCoeff * fc);

      let bMinSeismicCm = 20;
      let AgMinSeismicCm2 = 600; // DMI: Ag >= 60 000 mm2 (600 cm2), rec. CR10.8 lado min 200 mm
      if (diss === 'DMO') {
        bMinSeismicCm = 25;
        AgMinSeismicCm2 = 625; // DMO: Ag >= 62 500 mm2 (625 cm2), C.21.3.5.1
      } else if (diss === 'DES') {
        bMinSeismicCm = 30;
        AgMinSeismicCm2 = 900; // DES: Ag >= 90 000 mm2 (900 cm2), C.21.6.1
      }

      const AgGovCm2 = Math.max(AgReqStrengthCm2, AgMinSeismicCm2);
      const sideAdoptedCm = Math.max(bMinSeismicCm, Math.ceil((Math.sqrt(AgGovCm2) - 1e-6) / 5.0) * 5);
      const cMeters = sideAdoptedCm / 100.0;
      const AgAdoptedCm2 = sideAdoptedCm * sideAdoptedCm;

      // 4. Predimensionamiento de la Zapata Aislada Concéntrica (NSR-10 C.15 y C.11.11)
      // Área en planta por estado límite de servicio: Azap = Ps / qadm_neta
      const AzapReqM2 = PsGrav / qadm;
      const BzapRawM = Math.sqrt(AzapReqM2);
      const BzapAdoptedM = Math.max(1.0, roundUpToStep(BzapRawM, 0.10)); // Múltiplos de 10 cm, mín 1.00 m
      const AzapAdoptedM2 = BzapAdoptedM * BzapAdoptedM;

      // Reacción última neta del suelo qu = Pu / B^2 (kPa)
      const quKPa = PuGrav / AzapAdoptedM2;

      // Iteración para hallar el peralte efectivo d (m) que cumpla punzonamiento (C.11.11.2.1) y cortante 1D (C.11.11.1.1)
      // más d >= 0.15 m (C.15.7)
      const phiShear = 0.75;
      let dZapM = 0.15; // mínimo normativo C.15.7 (150 mm)
      for (let testD = 0.15; testD <= 1.50; testD += 0.01) {
        const b0 = 4.0 * (cMeters + testD); // Perímetro crítico punzonamiento a d/2
        const Vu2_kN = Math.max(0, quKPa * (AzapAdoptedM2 - Math.pow(cMeters + testD, 2)));
        const phiVc2_kN = phiShear * 0.33 * Math.sqrt(fc) * b0 * testD * 1000.0; // kN

        const Vu1_kN = Math.max(0, quKPa * BzapAdoptedM * ((BzapAdoptedM - cMeters) / 2.0 - testD));
        const phiVc1_kN = phiShear * 0.17 * Math.sqrt(fc) * BzapAdoptedM * testD * 1000.0; // kN

        if (phiVc2_kN >= Vu2_kN && phiVc1_kN >= Vu1_kN) {
          dZapM = testD;
          break;
        }
      }
      // Espesor total hz = d + recubrimiento (75 mm C.7.7.1) + 15 mm barra, redondeado a múltiplos de 5 cm
      const hzRawM = dZapM + 0.09;
      const hzAdoptedM = Math.max(0.25, roundUpToStep(hzRawM, 0.05));
      const dRealM = hzAdoptedM - 0.09;

      // Actualizar métricas DOM
      document.getElementById('res-sim2-aaf').textContent =
        `A_af = ${tribW.toFixed(2)}×${tribH.toFixed(2)} = ${Aaf.toFixed(2)} m² | P_s = ${PsGrav.toFixed(0)} kN | P_u = ${PuGrav.toFixed(0)} kN`;
      document.getElementById('res-sim2-wu').textContent =
        `w_s = ${ws.toFixed(2)} kN/m² | w_u = 1.2D+1.6L = ${wu.toFixed(2)} kN/m²`;
      document.getElementById('res-sim2-sec').textContent =
        `Ag,req: Mét. 1 = ${AgReqStrengthCm2.toFixed(0)} cm² | Mét. 2 (n=${nCoeff}) = ${AgAltCm2.toFixed(0)} cm² → Columna (${diss}): ${sideAdoptedCm}×${sideAdoptedCm} cm (${AgAdoptedCm2} cm²)`;
      document.getElementById('res-sim2-zap').textContent =
        `A_zap,req = ${AzapReqM2.toFixed(2)} m² → Zapata: ${BzapAdoptedM.toFixed(2)}×${BzapAdoptedM.toFixed(2)} m, hz = ${(hzAdoptedM * 100).toFixed(0)} cm (d = ${(dRealM * 100).toFixed(0)} cm, q_u = ${quKPa.toFixed(1)} kPa)`;

      // =====================================================================
      // DIBUJO EN CANVAS: IZQUIERDA (MALLA Y A_AF) | DERECHA (COLUMNA + ZAPATA)
      // =====================================================================
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, width, height);

      const midX = Math.floor(width * 0.53);
      ctx.strokeStyle = colors.grid;
      ctx.beginPath();
      ctx.moveTo(midX, 14);
      ctx.lineTo(midX, height - 14);
      ctx.stroke();

      // --- PANEL IZQUIERDO: PLANTA ESTRUCTURAL Y ÁREA AFERENTE ---
      ctx.fillStyle = colors.text;
      ctx.font = '700 12px "Inter", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`1. Área Aferente: ${colLabel}`, 16, 22);

      const pad = 46;
      const availW = midX - pad * 2 - 10;
      const availH = height - 105;
      const totalX = Lx1 + Lx2;
      const totalY = Ly1 + Ly2;
      const scale = Math.min(availW / totalX, availH / totalY);

      const w1 = Lx1 * scale;
      const w2 = Lx2 * scale;
      const h1 = Ly1 * scale;
      const h2 = Ly2 * scale;

      const x0 = Math.round(pad + (availW - (w1 + w2)) / 2);
      const y0 = Math.round(50 + (availH - (h1 + h2)) / 2);
      const xCols = [x0, x0 + w1, x0 + w1 + w2];
      const yRows = [y0, y0 + h1, y0 + h1 + h2];

      ctx.fillStyle = colors.cardBg;
      ctx.strokeStyle = colors.concreteStroke;
      ctx.lineWidth = 1.5;
      ctx.fillRect(x0, y0, w1 + w2, h1 + h2);
      ctx.strokeRect(x0, y0, w1 + w2, h1 + h2);

      ctx.save();
      ctx.strokeStyle = colors.grid;
      ctx.setLineDash([4, 4]);
      xCols.forEach((xc, idx) => {
        ctx.beginPath();
        ctx.moveTo(xc, y0 - 16);
        ctx.lineTo(xc, yRows[2] + 10);
        ctx.stroke();
        ctx.fillStyle = colors.muted;
        ctx.font = '700 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`Eje ${idx + 1}`, xc, y0 - 20);
      });
      const rowNames = ['C', 'B', 'A'];
      yRows.forEach((yr, idx) => {
        ctx.beginPath();
        ctx.moveTo(x0 - 16, yr);
        ctx.lineTo(xCols[2] + 10, yr);
        ctx.stroke();
        ctx.fillStyle = colors.muted;
        ctx.font = '700 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(rowNames[idx], x0 - 20, yr + 3);
      });
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = colors.isDark ? 'rgba(251, 191, 36, 0.35)' : 'rgba(217, 119, 6, 0.35)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x0 + w1 / 2, y0);
      ctx.lineTo(x0 + w1 / 2, yRows[2]);
      ctx.moveTo(xCols[1] + w2 / 2, y0);
      ctx.lineTo(xCols[1] + w2 / 2, yRows[2]);
      ctx.moveTo(x0, y0 + h1 / 2);
      ctx.lineTo(xCols[2], y0 + h1 / 2);
      ctx.moveTo(x0, yRows[1] + h2 / 2);
      ctx.lineTo(xCols[2], yRows[1] + h2 / 2);
      ctx.stroke();
      ctx.restore();

      let tx = 0, ty = 0, tw = 0, th = 0, activeColX = 0, activeColY = 0;
      if (colType === 'interior') {
        tx = x0 + w1 / 2;
        ty = y0 + h1 / 2;
        tw = w1 / 2 + w2 / 2;
        th = h1 / 2 + h2 / 2;
        activeColX = xCols[1];
        activeColY = yRows[1];
      } else if (colType === 'edgeX') {
        tx = x0 + w1 / 2;
        ty = yRows[1] + h2 / 2;
        tw = w1 / 2 + w2 / 2;
        th = h2 / 2;
        activeColX = xCols[1];
        activeColY = yRows[2];
      } else if (colType === 'edgeY') {
        tx = x0;
        ty = y0 + h1 / 2;
        tw = w1 / 2;
        th = h1 / 2 + h2 / 2;
        activeColX = xCols[0];
        activeColY = yRows[1];
      } else {
        tx = x0;
        ty = yRows[1] + h2 / 2;
        tw = w1 / 2;
        th = h2 / 2;
        activeColX = xCols[0];
        activeColY = yRows[2];
      }

      ctx.fillStyle = colors.isDark ? 'rgba(56, 189, 248, 0.24)' : 'rgba(37, 99, 235, 0.18)';
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 2.2;
      ctx.fillRect(tx, ty, tw, th);
      ctx.strokeRect(tx, ty, tw, th);

      ctx.fillStyle = colors.primary;
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${Aaf.toFixed(1)} m²`, tx + tw / 2, ty + th / 2 - 4);

      xCols.forEach((xc) => {
        yRows.forEach((yr) => {
          const isActive = Math.abs(xc - activeColX) < 1 && Math.abs(yr - activeColY) < 1;
          const sz = isActive ? 12 : 8;
          ctx.fillStyle = isActive ? colors.danger : colors.text;
          ctx.fillRect(xc - sz / 2, yr - sz / 2, sz, sz);
        });
      });

      drawDimensionLine(ctx, xCols[0], yRows[2], xCols[1], yRows[2], `Lx1=${Lx1.toFixed(1)}m`, colors.primary, 20);
      drawDimensionLine(ctx, xCols[1], yRows[2], xCols[2], yRows[2], `Lx2=${Lx2.toFixed(1)}m`, colors.primary, 20);
      drawDimensionLine(ctx, xCols[2], yRows[0], xCols[2], yRows[1], `Ly1=${Ly1.toFixed(1)}m`, colors.purple, 26);
      drawDimensionLine(ctx, xCols[2], yRows[1], xCols[2], yRows[2], `Ly2=${Ly2.toFixed(1)}m`, colors.purple, 26);

      // --- PANEL DERECHO: COLUMNA + ZAPATA AISLADA (PLANTA Y PERFIL) ---
      const rightX = midX + 18;
      const rightW = width - rightX - 16;

      ctx.fillStyle = colors.text;
      ctx.font = '700 12px "Inter", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`2. Columna (${diss}) y Zapata Aislada (B×B×hz)`, rightX, 22);

      // Dibujar Planta de Zapata + Pedestal/Columna + Perímetro crítico b0 (a d/2)
      const planZapSize = Math.min(rightW * 0.56, 138);
      const zapCenterX = Math.round(rightX + rightW / 2);
      const zapPlanTopY = 44;
      const zapX = Math.round(zapCenterX - planZapSize / 2);

      // Contorno de la zapata B x B
      ctx.fillStyle = colors.cardBg;
      ctx.strokeStyle = colors.concreteStroke;
      ctx.lineWidth = 2;
      ctx.fillRect(zapX, zapPlanTopY, planZapSize, planZapSize);
      ctx.strokeRect(zapX, zapPlanTopY, planZapSize, planZapSize);

      // Perímetro crítico de punzonamiento b0 a d/2
      const ratioColToZap = Math.min(0.45, Math.max(0.18, cMeters / BzapAdoptedM));
      const ratioCritToZap = Math.min(0.82, Math.max(ratioColToZap + 0.16, (cMeters + dRealM) / BzapAdoptedM));
      const critSize = planZapSize * ratioCritToZap;
      const colPlanSize = planZapSize * ratioColToZap;

      ctx.save();
      ctx.strokeStyle = colors.danger;
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.6;
      ctx.strokeRect(
        zapCenterX - critSize / 2,
        zapPlanTopY + (planZapSize - critSize) / 2,
        critSize,
        critSize
      );
      ctx.restore();

      // Columna en el centro de la zapata
      ctx.fillStyle = colors.concrete;
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 2;
      ctx.fillRect(
        zapCenterX - colPlanSize / 2,
        zapPlanTopY + (planZapSize - colPlanSize) / 2,
        colPlanSize,
        colPlanSize
      );
      ctx.strokeRect(
        zapCenterX - colPlanSize / 2,
        zapPlanTopY + (planZapSize - colPlanSize) / 2,
        colPlanSize,
        colPlanSize
      );

      drawDimensionLine(
        ctx,
        zapX,
        zapPlanTopY,
        zapX + planZapSize,
        zapPlanTopY,
        `B = ${BzapAdoptedM.toFixed(2)} m`,
        colors.primary,
        -14
      );

      // Etiqueta perímetro punzonamiento
      ctx.fillStyle = colors.danger;
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`b0 (d/2)`, zapCenterX + critSize / 2 + 5, zapPlanTopY + planZapSize / 2);

      // --- PERFIL / ALZADO DE LA ZAPATA Y COLUMNA (PARTE INFERIOR DERECHA) ---
      const elevBaseY = height - 42;
      const elevZapH = Math.max(28, Math.min(48, hzAdoptedM * 65));
      const elevZapTopY = elevBaseY - elevZapH;
      const elevColTopY = elevZapTopY - 38;

      ctx.fillStyle = colors.concrete;
      ctx.strokeStyle = colors.concreteStroke;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(zapX, elevBaseY);
      ctx.lineTo(zapX + planZapSize, elevBaseY);
      ctx.lineTo(zapX + planZapSize, elevZapTopY);
      ctx.lineTo(zapCenterX + colPlanSize / 2, elevZapTopY);
      ctx.lineTo(zapCenterX + colPlanSize / 2, elevColTopY);
      ctx.lineTo(zapCenterX - colPlanSize / 2, elevColTopY);
      ctx.lineTo(zapCenterX - colPlanSize / 2, elevZapTopY);
      ctx.lineTo(zapX, elevZapTopY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Parrilla inferior de acero de la zapata
      ctx.strokeStyle = colors.secondary;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(zapX + 8, elevBaseY - 7);
      ctx.lineTo(zapX + planZapSize - 8, elevBaseY - 7);
      ctx.stroke();

      // Flechas de reacción del suelo qu
      ctx.strokeStyle = colors.success;
      ctx.lineWidth = 1.2;
      for (let i = 0; i <= 5; i++) {
        const ax = zapX + (planZapSize * i) / 5;
        ctx.beginPath();
        ctx.moveTo(ax, elevBaseY + 14);
        ctx.lineTo(ax, elevBaseY + 2);
        ctx.stroke();
      }
      ctx.fillStyle = colors.success;
      ctx.font = '700 10.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`q_u = ${quKPa.toFixed(1)} kPa (q_adm = ${qadm.toFixed(0)} kPa)`, zapCenterX, elevBaseY + 26);

      drawDimensionLine(
        ctx,
        zapX + planZapSize,
        elevZapTopY,
        zapX + planZapSize,
        elevBaseY,
        `hz=${(hzAdoptedM * 100).toFixed(0)}cm`,
        colors.purple,
        28
      );
      drawDimensionLine(
        ctx,
        zapCenterX - colPlanSize / 2,
        elevColTopY,
        zapCenterX + colPlanSize / 2,
        elevColTopY,
        `c=${sideAdoptedCm}cm`,
        colors.primary,
        -12
      );
    }

    [elColType, elLx1, elLx2, elLy1, elLy2, elFloors, elDead, elLive, elFc, elRho, elDissipation, elQadm].forEach(
      (el) => {
        if (el) el.addEventListener('input', render);
        if (el) el.addEventListener('change', render);
      }
    );

    window.addEventListener('resize', render);
    window.addEventListener('themeChanged', render);
    render();
  }

  /* ==========================================================================
     MODO PIZARRA DOCENTE PARA EJEMPLOS NUMÉRICOS (OCULTAR / REVELAR PASOS)
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

  document.addEventListener('DOMContentLoaded', () => {
    initSlabBeamSimulator();
    initColumnTributarySimulator();
  });
})();

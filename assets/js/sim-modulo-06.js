/**
 * ============================================================================
 * SIMULADORES INTERACTIVOS — MÓDULO 06: LOSAS DE ENTREPISO (NSR-10 C.8, C.9, C.13)
 * ============================================================================
 * Autor: Prof. Daniel Abudinen, I.C., M.Sc.
 * Simulador 6.1: Diseñador de Losas en Una Dirección (Macizas y Aligeradas):
 *                espesor mínimo (Tabla C.9.5(a)), coeficientes de momento y
 *                cortante (C.8.3.3), acero a flexión, acero mínimo/retracción
 *                y verificación a cortante sin estribos (1.10 φVc en nervios).
 * Simulador 6.2: Placa Plana en Dos Direcciones por el Método de Diseño
 *                Directo (C.13.6): M0, distribución longitudinal, franjas de
 *                columna/central y punzonamiento simplificado (C.11.11.2).
 * ============================================================================
 */

const BAR_AREAS_MOD06 = { '3': 71, '4': 129, '5': 199, '6': 284 };
const BAR_DIAM_MOD06  = { '3': 9.5, '4': 12.7, '5': 15.9, '6': 19.1 };

function getThemePaletteMod06() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    isDark,
    bgCanvas: isDark ? '#0B1120' : '#F8FAFC',
    gridLine: isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(148, 163, 184, 0.22)',
    concreteFill: isDark ? '#1E293B' : '#E2E8F0',
    concreteStroke: isDark ? '#94A3B8' : '#334155',
    voidFill: isDark ? '#0F172A' : '#FFFFFF',
    posColor: isDark ? '#38BDF8' : '#0284C7',
    posFill: isDark ? 'rgba(56, 189, 248, 0.18)' : 'rgba(2, 132, 199, 0.13)',
    negColor: isDark ? '#FB7185' : '#E11D48',
    negFill: isDark ? 'rgba(251, 113, 133, 0.18)' : 'rgba(225, 29, 72, 0.12)',
    okColor: isDark ? '#34D399' : '#059669',
    warnColor: isDark ? '#FBBF24' : '#D97706',
    rebarColor: isDark ? '#FBBF24' : '#D97706',
    stripCS: isDark ? 'rgba(251, 191, 36, 0.16)' : 'rgba(217, 119, 6, 0.12)',
    stripMS: isDark ? 'rgba(52, 211, 153, 0.12)' : 'rgba(5, 150, 105, 0.09)',
    textMain: isDark ? '#F1F5F9' : '#0F172A',
    textSub: isDark ? '#94A3B8' : '#475569'
  };
}

function drawGridMod06(ctx, W, H, pal) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = pal.bgCanvas;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = pal.gridLine;
  ctx.lineWidth = 1;
  for (let x = 30; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 30; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
}

/**
 * Diseño a flexión de sección rectangular (unidades: kN·m, mm, MPa).
 * Retorna { ok, Rn, rho, As, a, c, et }
 */
function flexDesignMod06(MuKNm, bMm, dMm, fc, fy) {
  const phi = 0.90;
  if (MuKNm <= 0) return { ok: true, Rn: 0, rho: 0, As: 0, a: 0, c: 0, et: 1 };
  const Rn = (MuKNm * 1e6) / (phi * bMm * dMm * dMm);
  const disc = 1.0 - (2.0 * Rn) / (0.85 * fc);
  if (disc <= 0) return { ok: false, Rn, rho: NaN, As: NaN, a: NaN, c: NaN, et: 0 };
  const rho = ((0.85 * fc) / fy) * (1.0 - Math.sqrt(disc));
  const As = rho * bMm * dMm;
  const beta1 = fc <= 28 ? 0.85 : Math.max(0.65, 0.85 - (0.05 * (fc - 28)) / 7);
  const a = (As * fy) / (0.85 * fc * bMm);
  const c = a / beta1;
  const et = (0.003 * (dMm - c)) / c;
  return { ok: true, Rn, rho, As, a, c, et };
}

/**
 * ============================================================================
 * SIMULADOR 6.1: LOSAS EN UNA DIRECCIÓN (MACIZAS Y ALIGERADAS)
 * ============================================================================
 */
const SUPPORT_CASES_MOD06 = {
  simple:  { label: 'Simplemente apoyada', kPos: 8,  kNeg: 0,  kV: 0.50, tblMaciza: 20, tblNerv: 16 },
  oneend:  { label: 'Tramo extremo (un extremo continuo, 2 vanos)', kPos: 11, kNeg: 9,  kV: 0.575, tblMaciza: 24, tblNerv: 18.5 },
  both:    { label: 'Tramo interior (ambos extremos continuos)', kPos: 16, kNeg: 11, kV: 0.50, tblMaciza: 28, tblNerv: 21 },
  cant:    { label: 'Voladizo', kPos: 0,  kNeg: 2,  kV: 1.00, tblMaciza: 10, tblNerv: 8 }
};

function updateSim61() {
  const typeEl = document.getElementById('sim61-type');
  if (!typeEl) return;

  const slabType = typeEl.value;                                               // 'maciza' | 'aligerada'
  const support  = document.getElementById('sim61-support').value;             // simple | oneend | both | cant
  const ln       = parseFloat(document.getElementById('sim61-ln').value);      // m (luz libre)
  const hCm      = parseFloat(document.getElementById('sim61-h').value);       // cm
  const bwCm     = parseFloat(document.getElementById('sim61-bw').value);      // cm (ancho nervio)
  const sCm      = parseFloat(document.getElementById('sim61-s').value);       // cm (separación c/c nervios)
  const Dsup     = parseFloat(document.getElementById('sim61-dead').value);    // kN/m² (carga muerta sobreimpuesta)
  const Lv       = parseFloat(document.getElementById('sim61-live').value);    // kN/m² (carga viva)
  const fc       = parseFloat(document.getElementById('sim61-fc').value);      // MPa
  const barKey   = document.getElementById('sim61-bar').value;                 // '3' | '4' | '5' | '6'
  const fy = 420.0;

  document.getElementById('val-sim61-ln').textContent   = `${ln.toFixed(2)} m`;
  document.getElementById('val-sim61-h').textContent    = `${hCm.toFixed(0)} cm`;
  document.getElementById('val-sim61-bw').textContent   = `${bwCm.toFixed(0)} cm`;
  document.getElementById('val-sim61-s').textContent    = `${sCm.toFixed(0)} cm`;
  document.getElementById('val-sim61-dead').textContent = `${Dsup.toFixed(2)} kN/m²`;
  document.getElementById('val-sim61-live').textContent = `${Lv.toFixed(2)} kN/m²`;

  const isNerv = slabType === 'aligerada';
  const cs = SUPPORT_CASES_MOD06[support];
  const hMm = hCm * 10.0;
  const bwMm = bwCm * 10.0;
  const sMm = sCm * 10.0;
  const tfMm = 50.0; // loseta superior

  // 1. Espesor mínimo (Tabla C.9.5(a)) — fy = 420 MPa, concreto de peso normal
  const hMinM = ln / (isNerv ? cs.tblNerv : cs.tblMaciza);

  // 2. Peso propio por m² y carga mayorada por franja de diseño
  let selfW;
  if (isNerv) {
    selfW = (tfMm / 1000) * 24.0 + ((bwMm / 1000) * ((hMm - tfMm) / 1000) * 24.0) / (sMm / 1000) + 0.30;
  } else {
    selfW = (hMm / 1000) * 24.0;
  }
  const D = selfW + Dsup;
  const qu = 1.2 * D + 1.6 * Lv;                          // kN/m²
  const tribW = isNerv ? sMm / 1000 : 1.0;                // m (ancho aferente de la franja)
  const wu = qu * tribW;                                  // kN/m por franja/nervio

  // 3. Momentos y cortante por coeficientes (C.8.3.3)
  const Mpos = cs.kPos > 0 ? (wu * ln * ln) / cs.kPos : 0;
  const Mneg = cs.kNeg > 0 ? (wu * ln * ln) / cs.kNeg : 0;
  const Vcoef = cs.kV * wu * ln;

  // 4. Peralte efectivo y diseño a flexión
  const db = BAR_DIAM_MOD06[barKey];
  const Ab = BAR_AREAS_MOD06[barKey];
  const cover = isNerv ? 25.0 : 20.0;
  const dMm = hMm - cover - db / 2.0;

  const bNeg = isNerv ? bwMm : 1000.0;
  const bPos = isNerv ? sMm : 1000.0;    // aleta comprimida (loseta) en momento positivo
  const fNeg = flexDesignMod06(Mneg, bNeg, dMm, fc, fy);
  const fPos = flexDesignMod06(Mpos, bPos, dMm, fc, fy);

  // 5. Acero mínimo
  let AsMin;
  if (isNerv) {
    AsMin = Math.max((0.25 * Math.sqrt(fc)) / fy, 1.4 / fy) * bwMm * dMm;
  } else {
    AsMin = 0.0018 * 1000.0 * hMm;
  }
  const AsNegDes = Mneg > 0 ? Math.max(fNeg.As, AsMin) : 0;
  const AsPosDes = Mpos > 0 ? Math.max(fPos.As, AsMin) : 0;
  const AsGov = Math.max(AsNegDes, AsPosDes);

  // 6. Cortante (sin estribos) a distancia d
  const Vud = Math.max(0, Vcoef - wu * (dMm / 1000));
  const phiVc = (isNerv ? 1.10 : 1.0) * 0.75 * 0.17 * Math.sqrt(fc) * (isNerv ? bwMm : 1000.0) * dMm / 1000.0;

  // 7. Armado propuesto
  let armado;
  let sBars = 0;
  const sMax = Math.min(3.0 * hMm, 450.0);
  if (isNerv) {
    const nNeg = AsNegDes > 0 ? Math.max(1, Math.ceil(AsNegDes / Ab)) : 0;
    const nPos = AsPosDes > 0 ? Math.max(1, Math.ceil(AsPosDes / Ab)) : 0;
    armado = `Nervio: ${nPos > 0 ? nPos + ' No.' + barKey + ' inf.' : '—'} | ${nNeg > 0 ? nNeg + ' No.' + barKey + ' sup.' : '—'}`;
  } else {
    sBars = Math.min(sMax, Math.floor(((Ab * 1000.0) / AsGov) / 10) * 10);
    armado = `No.${barKey} @ ${(sBars / 10).toFixed(0)} cm (smáx = ${(sMax / 10).toFixed(0)} cm)`;
  }
  const AsTemp = isNerv ? 0.0018 * 1000.0 * tfMm : 0.0018 * 1000.0 * hMm;
  const sTempMax = isNerv ? Math.min(5 * tfMm, 450) : Math.min(5 * hMm, 450);

  // Resultados en el DOM
  document.getElementById('res61-hmin').textContent = `h_mín = ${(hMinM * 100).toFixed(1)} cm (ℓ/${isNerv ? cs.tblNerv : cs.tblMaciza}) | h = ${hCm.toFixed(0)} cm`;
  document.getElementById('res61-wu').textContent = `qu = ${qu.toFixed(2)} kN/m² → wu = ${wu.toFixed(2)} kN/m ${isNerv ? '(por nervio)' : '(franja 1 m)'}`;
  document.getElementById('res61-mneg').textContent = Mneg > 0 ? `Mu⁻ = ${Mneg.toFixed(2)} kN·m (wu·ln²/${cs.kNeg})` : 'Mu⁻ = 0 (apoyo simple)';
  document.getElementById('res61-mpos').textContent = Mpos > 0 ? `Mu⁺ = ${Mpos.toFixed(2)} kN·m (wu·ln²/${cs.kPos})` : 'Mu⁺ = 0 (voladizo)';
  document.getElementById('res61-as').textContent =
    `As⁻ = ${Mneg > 0 ? (fNeg.ok ? fNeg.As.toFixed(0) : '∞') : '0'} mm² | As⁺ = ${Mpos > 0 ? (fPos.ok ? fPos.As.toFixed(0) : '∞') : '0'} mm²${isNerv ? '' : ' por metro'}`;
  document.getElementById('res61-asmin').textContent = `As,mín = ${AsMin.toFixed(0)} mm² | Retracción ${isNerv ? 'loseta' : ''} = ${AsTemp.toFixed(0)} mm²/m (s ≤ ${(sTempMax / 10).toFixed(0)} cm)`;
  document.getElementById('res61-spacing').textContent = armado;
  document.getElementById('res61-shear').textContent = `Vu(d) = ${Vud.toFixed(2)} kN | ${isNerv ? '1.10' : ''}φVc = ${phiVc.toFixed(2)} kN`;

  // Estado global
  const status = document.getElementById('res61-status');
  const etMin = Math.min(Mneg > 0 ? fNeg.et : 1, Mpos > 0 ? fPos.et : 1);
  const geomNervOk = !isNerv || (bwMm >= 100 && (hMm - tfMm) <= 5.0 * bwMm && sMm <= Math.min(2.5 * hMm, 1200));
  if (!fNeg.ok || !fPos.ok) {
    status.className = 'status-badge status-danger';
    status.innerHTML = '❌ SECCIÓN INSUFICIENTE: El momento excede la capacidad de la sección (Rn demasiado alto). Aumente el espesor h.';
  } else if (etMin < 0.005) {
    status.className = 'status-badge status-danger';
    status.innerHTML = `❌ SECCIÓN NO CONTROLADA POR TRACCIÓN: εt = ${etMin.toFixed(4)} < 0.005. Aumente h o, en nervios, el ancho bw.`;
  } else if (Vud > phiVc) {
    status.className = 'status-badge status-danger';
    status.innerHTML = `❌ CORTANTE EXCEDIDO: Vu = ${Vud.toFixed(1)} kN > φVc = ${phiVc.toFixed(1)} kN. ${isNerv ? 'Ensanche el nervio cerca del apoyo o aumente h.' : 'Aumente el espesor de la losa.'}`;
  } else if (!geomNervOk) {
    status.className = 'status-badge status-warn';
    status.innerHTML = '⚠️ GEOMETRÍA DE NERVIOS FUERA DE C.8.13: verifique bw ≥ 10 cm, altura libre ≤ 5 bw y separación c/c ≤ min(2.5h, 1.20 m).';
  } else if (hMm / 1000 < hMinM) {
    status.className = 'status-badge status-warn';
    status.innerHTML = `⚠️ RESISTE, PERO h = ${hCm.toFixed(0)} cm < h_mín = ${(hMinM * 100).toFixed(1)} cm (Tabla C.9.5(a)). Deben calcularse explícitamente las deflexiones.`;
  } else {
    status.className = 'status-badge status-ok';
    status.innerHTML = `✅ LOSA CUMPLE: h ≥ h_mín, εt ≥ 0.005, Vu ≤ φVc sin estribos. Armado: ${armado}.`;
  }

  drawSim61Canvas({
    isNerv, support, ln, hMm, bwMm, sMm, tfMm, dMm, db,
    Mpos, Mneg, wu, sBars, barKey, label: cs.label
  });
}

function drawSim61Canvas(st) {
  const canvas = document.getElementById('canvas-sim61');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const pal = getThemePaletteMod06();
  const W = canvas.width, H = canvas.height;
  drawGridMod06(ctx, W, H, pal);

  // ---------------- Panel izquierdo: sección transversal ----------------
  ctx.fillStyle = pal.textMain;
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(st.isNerv ? 'SECCIÓN TRANSVERSAL — LOSA ALIGERADA (NERVADA)' : 'SECCIÓN TRANSVERSAL — LOSA MACIZA (FRANJA 1.00 m)', 24, 26);

  const secX0 = 30, secW = 360, secY0 = 70;
  const widthMm = st.isNerv ? Math.max(2 * st.sMm, 1200) : 1000;
  const sc = secW / widthMm;
  const hPx = Math.max(24, Math.min(170, st.hMm * sc * 1.0));
  const hScale = hPx / st.hMm;

  if (!st.isNerv) {
    ctx.fillStyle = pal.concreteFill;
    ctx.strokeStyle = pal.concreteStroke;
    ctx.lineWidth = 2;
    ctx.fillRect(secX0, secY0, secW, hPx);
    ctx.strokeRect(secX0, secY0, secW, hPx);
    // barras inferiores con la separación calculada
    const yBar = secY0 + hPx - (20 + st.db / 2) * hScale;
    const sPx = Math.max(8, (st.sBars || 300) * sc);
    ctx.fillStyle = pal.rebarColor;
    for (let x = secX0 + sPx / 2; x < secX0 + secW; x += sPx) {
      ctx.beginPath(); ctx.arc(x, yBar, Math.max(3, st.db * sc * 0.9), 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = pal.textSub;
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText(`b = 1000 mm | h = ${st.hMm.toFixed(0)} mm | d = ${st.dMm.toFixed(1)} mm`, secX0, secY0 + hPx + 22);
    ctx.fillText(`Barras No.${st.barKey} @ ${(st.sBars / 10).toFixed(0)} cm`, secX0, secY0 + hPx + 40);
  } else {
    // loseta + nervios
    const tfPx = st.tfMm * hScale;
    ctx.fillStyle = pal.concreteFill;
    ctx.strokeStyle = pal.concreteStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(secX0, secY0, secW, tfPx);
    ctx.fill(); ctx.stroke();
    const sPx = st.sMm * sc;
    const bwPx = Math.max(6, st.bwMm * sc);
    let n = 0;
    for (let xc = secX0 + sPx / 2; xc < secX0 + secW; xc += sPx) {
      ctx.fillStyle = pal.concreteFill;
      ctx.fillRect(xc - bwPx / 2, secY0 + tfPx - 1, bwPx, hPx - tfPx + 1);
      ctx.strokeRect(xc - bwPx / 2, secY0 + tfPx, bwPx, hPx - tfPx);
      // aligeramiento (casetón) entre nervios
      ctx.fillStyle = pal.rebarColor;
      ctx.beginPath(); ctx.arc(xc, secY0 + hPx - 25 * hScale, Math.max(3, st.db * sc), 0, Math.PI * 2); ctx.fill();
      n++;
    }
    ctx.fillStyle = pal.textSub;
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText(`bw = ${st.bwMm.toFixed(0)} mm | s = ${st.sMm.toFixed(0)} mm c/c | loseta = ${st.tfMm} mm`, secX0, secY0 + hPx + 22);
    ctx.fillText(`h = ${st.hMm.toFixed(0)} mm | d = ${st.dMm.toFixed(1)} mm`, secX0, secY0 + hPx + 40);
  }

  // ---------------- Panel derecho: diagrama de momentos ----------------
  const bx0 = 470, bx1 = 875, beamY = 130;
  ctx.fillStyle = pal.textMain;
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`DIAGRAMA DE MOMENTOS POR COEFICIENTES (C.8.3.3)`, bx0 - 10, 26);
  ctx.font = '11px Inter, sans-serif';
  ctx.fillStyle = pal.textSub;
  ctx.fillText(`${st.label} — ln = ${st.ln.toFixed(2)} m, wu = ${st.wu.toFixed(2)} kN/m`, bx0 - 10, 44);

  // viga
  ctx.strokeStyle = pal.concreteStroke;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(bx0, beamY); ctx.lineTo(bx1, beamY); ctx.stroke();

  // apoyos
  const drawPin = (x) => {
    ctx.fillStyle = pal.concreteStroke;
    ctx.beginPath(); ctx.moveTo(x, beamY + 2); ctx.lineTo(x - 9, beamY + 16); ctx.lineTo(x + 9, beamY + 16); ctx.closePath(); ctx.fill();
  };
  const drawFixed = (x) => {
    ctx.fillStyle = pal.concreteStroke;
    ctx.fillRect(x - 4, beamY - 20, 8, 40);
  };
  if (st.support === 'simple') { drawPin(bx0); drawPin(bx1); }
  else if (st.support === 'oneend') { drawPin(bx0); drawFixed(bx1); }
  else if (st.support === 'both') { drawFixed(bx0); drawFixed(bx1); }
  else { drawFixed(bx0); }

  // carga distribuida
  ctx.strokeStyle = pal.warnColor;
  ctx.lineWidth = 1.4;
  for (let x = bx0; x <= bx1; x += 25) {
    ctx.beginPath(); ctx.moveTo(x, beamY - 34); ctx.lineTo(x, beamY - 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 3, beamY - 11); ctx.lineTo(x, beamY - 6); ctx.lineTo(x + 3, beamY - 11); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(bx0, beamY - 34); ctx.lineTo(bx1, beamY - 34); ctx.stroke();

  // curva de momentos: parábola que cumple M(0), M(L) y máximo positivo de los coeficientes
  const baseY = 260;
  const L = bx1 - bx0;
  const maxM = Math.max(st.Mpos, st.Mneg, 1);
  const scaleM = 95 / maxM;
  let Ml = 0, Mr = 0;
  if (st.support === 'oneend') { Ml = 0; Mr = -st.Mneg; }
  if (st.support === 'both') { Ml = -st.Mneg; Mr = -st.Mneg; }
  if (st.support === 'cant') { Ml = -st.Mneg; Mr = 0; }

  ctx.strokeStyle = pal.concreteStroke;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(bx0, baseY); ctx.lineTo(bx1, baseY); ctx.stroke();
  ctx.setLineDash([]);

  const pts = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    let M;
    if (st.support === 'cant') {
      M = -st.Mneg * Math.pow(1 - t, 2);
    } else {
      // M(t) = Ml(1-t) + Mr t + 4 Mp0 t(1-t), con Mp0 ajustado para que máx positivo ≈ Mpos
      const Mp0 = st.Mpos + Math.abs(Ml + Mr) / 2;
      M = Ml * (1 - t) + Mr * t + 4 * Mp0 * t * (1 - t);
    }
    pts.push({ x: bx0 + t * L, y: baseY + M * scaleM, M });
  }
  // relleno positivo / negativo
  pts.forEach((p, i) => {
    if (i === 0) return;
    const p0 = pts[i - 1];
    ctx.fillStyle = (p.M + p0.M) / 2 >= 0 ? pal.posFill : pal.negFill;
    ctx.beginPath();
    ctx.moveTo(p0.x, baseY); ctx.lineTo(p0.x, p0.y); ctx.lineTo(p.x, p.y); ctx.lineTo(p.x, baseY);
    ctx.closePath(); ctx.fill();
  });
  ctx.strokeStyle = pal.posColor;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();

  ctx.font = 'bold 11px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  if (st.Mpos > 0) {
    ctx.fillStyle = pal.posColor;
    const pk = pts.reduce((a, b) => (b.M > a.M ? b : a));
    ctx.fillText(`Mu⁺ = ${st.Mpos.toFixed(2)} kN·m`, pk.x, pk.y + 18);
  }
  if (st.Mneg > 0) {
    ctx.fillStyle = pal.negColor;
    if (Ml < 0) ctx.fillText(`Mu⁻ = ${st.Mneg.toFixed(2)}`, bx0 + 45, baseY + Ml * scaleM - 8);
    if (Mr < 0) ctx.fillText(`Mu⁻ = ${st.Mneg.toFixed(2)}`, bx1 - 45, baseY + Mr * scaleM - 8);
  }
  ctx.fillStyle = pal.textSub;
  ctx.font = '10px Inter, sans-serif';
  ctx.fillText('(Momento positivo dibujado hacia abajo — lado traccionado)', (bx0 + bx1) / 2, H - 14);
}

function loadSim61Preset(key) {
  const set = (id, v) => { document.getElementById(id).value = v; };
  if (key === 'ej61_maciza') {
    set('sim61-type', 'maciza'); set('sim61-support', 'simple'); set('sim61-ln', 3.69); set('sim61-h', 19);
    set('sim61-bw', 12); set('sim61-s', 80); set('sim61-dead', 1.54); set('sim61-live', 1.80);
    set('sim61-fc', '21'); set('sim61-bar', '4');
  } else if (key === 'ej63_aligerada') {
    set('sim61-type', 'aligerada'); set('sim61-support', 'oneend'); set('sim61-ln', 4.60); set('sim61-h', 40);
    set('sim61-bw', 12); set('sim61-s', 80); set('sim61-dead', 4.35); set('sim61-live', 1.80);
    set('sim61-fc', '28'); set('sim61-bar', '5');
  }
  updateSim61();
}

/**
 * ============================================================================
 * SIMULADOR 6.2: PLACA PLANA — MÉTODO DE DISEÑO DIRECTO (C.13.6)
 * ============================================================================
 */
function updateSim62() {
  const l1El = document.getElementById('sim62-l1');
  if (!l1El) return;

  const l1   = parseFloat(l1El.value);                                         // m (dirección de análisis)
  const l2   = parseFloat(document.getElementById('sim62-l2').value);         // m (transversal)
  const cCm  = parseFloat(document.getElementById('sim62-c').value);          // cm (columna cuadrada)
  const hCm  = parseFloat(document.getElementById('sim62-h').value);          // cm
  const Dsup = parseFloat(document.getElementById('sim62-dead').value);       // kN/m²
  const Lv   = parseFloat(document.getElementById('sim62-live').value);       // kN/m²
  const fc   = parseFloat(document.getElementById('sim62-fc').value);         // MPa
  const pos  = document.getElementById('sim62-pos').value;                    // interior | ext_nobeam | ext_beam
  const fy = 420.0;

  document.getElementById('val-sim62-l1').textContent   = `${l1.toFixed(2)} m`;
  document.getElementById('val-sim62-l2').textContent   = `${l2.toFixed(2)} m`;
  document.getElementById('val-sim62-c').textContent    = `${cCm.toFixed(0)} cm`;
  document.getElementById('val-sim62-h').textContent    = `${hCm.toFixed(0)} cm`;
  document.getElementById('val-sim62-dead').textContent = `${Dsup.toFixed(2)} kN/m²`;
  document.getElementById('val-sim62-live').textContent = `${Lv.toFixed(2)} kN/m²`;

  const c = cCm / 100.0;
  const hMm = hCm * 10.0;
  const ln = Math.max(0.65 * l1, l1 - c);              // C.13.6.2.5
  const lnLong = Math.max(l1, l2) - c;

  // Espesor mínimo — Tabla C.9.5(c), fy = 420 MPa, sin ábacos
  const denom = pos === 'ext_nobeam' ? 30 : 33;
  const hMin = Math.max(0.125, lnLong / denom);

  const D = (hMm / 1000) * 24.0 + Dsup;
  const qu = 1.2 * D + 1.6 * Lv;
  const M0 = (qu * l2 * ln * ln) / 8.0;

  // Distribución longitudinal (C.13.6.3.2 y C.13.6.3.3 — losa sin vigas entre apoyos interiores)
  let fNegInt, fPos, fNegExt, csNegExt;
  if (pos === 'interior') { fNegInt = 0.65; fPos = 0.35; fNegExt = 0.65; csNegExt = 0.75; }
  else if (pos === 'ext_nobeam') { fNegInt = 0.70; fPos = 0.52; fNegExt = 0.26; csNegExt = 1.00; }
  else { fNegInt = 0.70; fPos = 0.50; fNegExt = 0.30; csNegExt = 0.75; }

  const MnegInt = fNegInt * M0, Mpos = fPos * M0, MnegExt = fNegExt * M0;
  // Franja de columna (αf = 0): 75 % negativo interior, 60 % positivo
  const csNegInt = 0.75, csPos = 0.60;
  const csW = Math.min(l1, l2) / 2.0;          // ancho total franja de columna (m)
  const msW = l2 - csW;                        // ancho franja central (m)

  const CS = { negInt: csNegInt * MnegInt, pos: csPos * Mpos, negExt: csNegExt * MnegExt };
  const MS = { negInt: (1 - csNegInt) * MnegInt, pos: (1 - csPos) * Mpos, negExt: (1 - csNegExt) * MnegExt };

  // Diseño de la franja de columna (momento negativo interior, crítico) con barras No. 4
  const dFlex = hMm - 20.0 - 6.35;
  const fCS = flexDesignMod06(CS.negInt, csW * 1000.0, dFlex, fc, fy);
  const AsMinPerM = 0.0018 * 1000.0 * hMm;
  const AsCSperM = fCS.ok ? Math.max(fCS.As / csW, AsMinPerM) : NaN;
  const sMax = Math.min(2 * hMm, 450);
  const sCS = fCS.ok ? Math.min(sMax, Math.floor(((129 * 1000) / AsCSperM) / 10) * 10) : 0;

  // Punzonamiento simplificado (sin transferencia de momento desbalanceado γv·Mu)
  const dP = hMm - 20.0 - 12.7;        // peralte promedio de las dos capas (mm)
  const cMm = cCm * 10.0;
  let b0, alphaS, Atrib, Acrit;
  if (pos === 'interior') {
    b0 = 4 * (cMm + dP); alphaS = 40;
    Atrib = l1 * l2; Acrit = Math.pow((cMm + dP) / 1000, 2);
  } else {
    b0 = 2 * (cMm + dP / 2) + (cMm + dP); alphaS = 30;
    Atrib = (l1 / 2 + c / 2) * l2; Acrit = ((cMm + dP / 2) / 1000) * ((cMm + dP) / 1000);
  }
  const Vu = qu * (Atrib - Acrit);
  const vc = Math.min(0.33, 0.17 * (1 + 2 / 1.0), 0.083 * ((alphaS * dP) / b0 + 2)) * Math.sqrt(fc);
  const phiVc = (0.75 * vc * b0 * dP) / 1000.0;

  document.getElementById('res62-hmin').textContent = `h_mín = ${(hMin * 100).toFixed(1)} cm (ln/${denom} ≥ 12.5 cm) | h = ${hCm.toFixed(0)} cm`;
  document.getElementById('res62-qu').textContent = `qu = 1.2(${D.toFixed(2)}) + 1.6(${Lv.toFixed(2)}) = ${qu.toFixed(2)} kN/m²`;
  document.getElementById('res62-m0').textContent = `M0 = qu·l2·ln²/8 = ${M0.toFixed(1)} kN·m (ln = ${ln.toFixed(2)} m)`;
  document.getElementById('res62-dist').textContent =
    `M⁻ext = ${MnegExt.toFixed(1)} | M⁺ = ${Mpos.toFixed(1)} | M⁻int = ${MnegInt.toFixed(1)} kN·m (${fNegExt.toFixed(2)} / ${fPos.toFixed(2)} / ${fNegInt.toFixed(2)})`;
  document.getElementById('res62-cs').textContent =
    `CS (${csW.toFixed(2)} m): ${CS.negExt.toFixed(1)} / ${CS.pos.toFixed(1)} / ${CS.negInt.toFixed(1)} kN·m`;
  document.getElementById('res62-ms').textContent =
    `MS (${msW.toFixed(2)} m): ${MS.negExt.toFixed(1)} / ${MS.pos.toFixed(1)} / ${MS.negInt.toFixed(1)} kN·m`;
  document.getElementById('res62-as').textContent = fCS.ok
    ? `As⁻ CS = ${AsCSperM.toFixed(0)} mm²/m → No.4 @ ${(sCS / 10).toFixed(0)} cm (As,mín = ${AsMinPerM.toFixed(0)} mm²/m)`
    : 'Sección insuficiente en la franja de columna';
  document.getElementById('res62-punch').textContent = `Vu = ${Vu.toFixed(1)} kN | φVc = ${phiVc.toFixed(1)} kN (b0 = ${b0.toFixed(0)} mm, d = ${dP.toFixed(1)} mm)`;

  const status = document.getElementById('res62-status');
  const ratioL = Math.max(l1, l2) / Math.min(l1, l2);
  if (ratioL > 2.0) {
    status.className = 'status-badge status-danger';
    status.innerHTML = `❌ NO APLICA EL MÉTODO DIRECTO (C.13.6.1.2): l_larga/l_corta = ${ratioL.toFixed(2)} > 2.0 → la losa trabaja en una dirección.`;
  } else if (Vu > phiVc) {
    status.className = 'status-badge status-danger';
    status.innerHTML = `❌ FALLA POR PUNZONAMIENTO: Vu = ${Vu.toFixed(1)} kN > φVc = ${phiVc.toFixed(1)} kN. Aumente h, use ábaco (drop panel), capitel o refuerzo de cortante.`;
  } else if (!fCS.ok || fCS.et < 0.005) {
    status.className = 'status-badge status-danger';
    status.innerHTML = '❌ FRANJA DE COLUMNA INSUFICIENTE A FLEXIÓN (εt < 0.005). Aumente el espesor h.';
  } else if (hMm / 1000 < hMin) {
    status.className = 'status-badge status-warn';
    status.innerHTML = `⚠️ RESISTE, PERO h = ${hCm.toFixed(0)} cm < h_mín = ${(hMin * 100).toFixed(1)} cm (Tabla C.9.5(c)). Calcule deflexiones.`;
  } else {
    status.className = 'status-badge status-ok';
    status.innerHTML = `✅ PANEL CUMPLE (simplificado): h ≥ h_mín, Vu/φVc = ${(Vu / phiVc).toFixed(2)} y franja de columna con No.4 @ ${(sCS / 10).toFixed(0)} cm.`;
  }

  drawSim62Canvas({ l1, l2, c, pos, csW, MnegExt, Mpos, MnegInt, CS, MS, dP, cMm });
}

function drawSim62Canvas(st) {
  const canvas = document.getElementById('canvas-sim62');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const pal = getThemePaletteMod06();
  const W = canvas.width, H = canvas.height;
  drawGridMod06(ctx, W, H, pal);

  // ---------------- Planta del panel ----------------
  ctx.fillStyle = pal.textMain;
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PLANTA DEL PANEL — FRANJAS DE COLUMNA (CS) Y CENTRAL (MS)', 20, 26);

  const maxDim = Math.max(st.l1, st.l2);
  const sc = 300 / maxDim;
  const pw = st.l1 * sc, ph = st.l2 * sc;
  const px0 = 60, py0 = 60 + (300 - ph) / 2;

  // franjas: medias franjas de columna en los bordes l2 (a lo largo de l1)
  const halfCS = (st.csW / 2) * sc;
  ctx.fillStyle = pal.stripMS;
  ctx.fillRect(px0, py0, pw, ph);
  ctx.fillStyle = pal.stripCS;
  ctx.fillRect(px0, py0, pw, halfCS);
  ctx.fillRect(px0, py0 + ph - halfCS, pw, halfCS);

  ctx.strokeStyle = pal.concreteStroke;
  ctx.lineWidth = 1.6;
  ctx.strokeRect(px0, py0, pw, ph);
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(px0, py0 + halfCS); ctx.lineTo(px0 + pw, py0 + halfCS);
  ctx.moveTo(px0, py0 + ph - halfCS); ctx.lineTo(px0 + pw, py0 + ph - halfCS);
  ctx.stroke();
  ctx.setLineDash([]);

  // columnas
  const cPx = Math.max(8, st.c * sc);
  ctx.fillStyle = pal.concreteStroke;
  [[px0, py0], [px0 + pw, py0], [px0, py0 + ph], [px0 + pw, py0 + ph]].forEach(([x, y]) => {
    ctx.fillRect(x - cPx / 2, y - cPx / 2, cPx, cPx);
  });
  // perímetro crítico de punzonamiento en la columna inferior derecha (interior)
  const pcPx = ((st.cMm + st.dP) / 1000) * sc;
  ctx.strokeStyle = pal.negColor;
  ctx.setLineDash([3, 3]);
  ctx.strokeRect(px0 + pw - pcPx / 2, py0 + ph - pcPx / 2, pcPx, pcPx);
  ctx.setLineDash([]);

  ctx.fillStyle = pal.textSub;
  ctx.font = '11px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`l1 = ${st.l1.toFixed(2)} m (dirección de análisis)`, px0 + pw / 2, py0 + ph + 30);
  ctx.save();
  ctx.translate(px0 - 30, py0 + ph / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`l2 = ${st.l2.toFixed(2)} m`, 0, 0);
  ctx.restore();
  ctx.fillStyle = pal.warnColor;
  ctx.fillText('½ CS', px0 + pw / 2, py0 + halfCS / 2 + 4);
  ctx.fillText('½ CS', px0 + pw / 2, py0 + ph - halfCS / 2 + 4);
  ctx.fillStyle = pal.okColor;
  ctx.fillText('FRANJA CENTRAL (MS)', px0 + pw / 2, py0 + ph / 2 + 4);
  if (st.pos !== 'interior') {
    ctx.fillStyle = pal.negColor;
    ctx.save();
    ctx.translate(px0 - 12, py0 + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(st.pos === 'ext_beam' ? 'BORDE (con viga)' : 'BORDE LIBRE', 0, 0);
    ctx.restore();
  }

  // ---------------- Distribución de momentos ----------------
  const gx0 = 470, gx1 = 880, gy0 = 205;
  ctx.fillStyle = pal.textMain;
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('DISTRIBUCIÓN DE M0 (C.13.6.3) Y REPARTO CS / MS (C.13.6.4)', gx0 - 20, 26);

  const maxM = Math.max(st.MnegExt, st.Mpos, st.MnegInt, 1);
  const scM = 120 / maxM;
  ctx.strokeStyle = pal.concreteStroke;
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(gx0, gy0); ctx.lineTo(gx1, gy0); ctx.stroke();

  const groups = [
    { label: 'M⁻ ext.', tot: st.MnegExt, cs: st.CS.negExt, ms: st.MS.negExt, neg: true },
    { label: 'M⁺ tramo', tot: st.Mpos, cs: st.CS.pos, ms: st.MS.pos, neg: false },
    { label: 'M⁻ int.', tot: st.MnegInt, cs: st.CS.negInt, ms: st.MS.negInt, neg: true }
  ];
  const gw = (gx1 - gx0) / 3;
  groups.forEach((g, i) => {
    const xc = gx0 + gw * (i + 0.5);
    const bw = 34;
    const dir = g.neg ? -1 : 1; // negativos hacia arriba
    // barra CS
    ctx.fillStyle = pal.warnColor;
    ctx.fillRect(xc - bw - 3, gy0, bw, dir * g.cs * scM);
    // barra MS
    ctx.fillStyle = pal.okColor;
    ctx.fillRect(xc + 3, gy0, bw, dir * g.ms * scM);

    ctx.fillStyle = pal.textMain;
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    const yTxt = g.neg ? gy0 - g.cs * scM - 10 : gy0 + g.cs * scM + 18;
    ctx.fillText(`${g.tot.toFixed(1)}`, xc, g.neg ? Math.min(yTxt, gy0 - 14) - 12 : Math.max(yTxt, gy0 + 22) + 12);
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = pal.warnColor;
    ctx.fillText(g.cs.toFixed(1), xc - bw / 2 - 3, g.neg ? gy0 - g.cs * scM - 4 : gy0 + g.cs * scM + 12);
    ctx.fillStyle = pal.okColor;
    ctx.fillText(g.ms.toFixed(1), xc + bw / 2 + 3, g.neg ? gy0 - g.ms * scM - 4 : gy0 + g.ms * scM + 12);
    ctx.fillStyle = pal.textSub;
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText(g.label, xc, g.neg ? gy0 + 18 : gy0 - 8);
  });

  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = pal.warnColor;
  ctx.fillRect(gx0, H - 34, 12, 12);
  ctx.fillStyle = pal.textMain;
  ctx.fillText('Franja de columna (CS)', gx0 + 18, H - 24);
  ctx.fillStyle = pal.okColor;
  ctx.fillRect(gx0 + 190, H - 34, 12, 12);
  ctx.fillStyle = pal.textMain;
  ctx.fillText('Franja central (MS)  [kN·m]', gx0 + 208, H - 24);
}

function loadSim62Preset(key) {
  const set = (id, v) => { document.getElementById(id).value = v; };
  if (key === 'ej64_interior') {
    set('sim62-l1', 6.0); set('sim62-l2', 5.0); set('sim62-c', 40); set('sim62-h', 18);
    set('sim62-dead', 1.50); set('sim62-live', 1.80); set('sim62-fc', '28'); set('sim62-pos', 'interior');
  } else if (key === 'ej64_borde') {
    set('sim62-l1', 6.0); set('sim62-l2', 5.0); set('sim62-c', 40); set('sim62-h', 20);
    set('sim62-dead', 1.50); set('sim62-live', 1.80); set('sim62-fc', '28'); set('sim62-pos', 'ext_nobeam');
  }
  updateSim62();
}

document.addEventListener('DOMContentLoaded', () => {
  updateSim61();
  updateSim62();
  const themeBtn = document.getElementById('btn-theme');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      setTimeout(() => { updateSim61(); updateSim62(); }, 30);
    });
  }
});

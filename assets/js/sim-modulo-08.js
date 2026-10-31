/**
 * ============================================================================
 * SIMULADORES INTERACTIVOS — MÓDULO 08: DESPIECE DE ARMADURAS, LONGITUD DE
 * DESARROLLO Y ANCLAJE (NSR-10 CAPÍTULO C.12 Y C.21)
 * ============================================================================
 * Autor: Prof. Daniel Abudinen, I.C., M.Sc.
 * 
 * Simulador 8.1: Calculadora Integral de Longitud de Desarrollo y Ganchos (NSR-10 C.12)
 *   - Longitud de desarrollo a tracción (Ec. General C.12-1 con cb, Ktr vs Simplificada C.12.2.2)
 *   - Ganchos estándar a 90° y 180° (C.12.5): ldh, diámetro de doblado D, extensión recta
 *   - Longitud de desarrollo a compresión ldc (C.12.3)
 *   - Traslapos a tracción (Clase A: 1.0 ld, Clase B: 1.3 ld) y a compresión (0.071 fy db)
 *   - Visualizador Canvas interactivo de la barra, anclaje y corte transversal de confinamiento
 * 
 * Simulador 8.2: Envolvente de Momentos Desplazados y Diagrama de Corte de Barras
 *   - Momento flector actuante Mu(x) vs Envolvente desplazada en distancia 'd'
 *   - Escalonamiento de capacidad resistente phi*Mn por grupos de barras
 *   - Detección interactiva de puntos teóricos de corte (T1, T2)
 *   - Puntos prácticos de corte prolongados en max(d, 12*db)
 *   - Verificación de anclaje ld desde el momento máximo y porcentaje de armadura en apoyos
 *   - Detalle longitudinal a escala del despiece de armaduras
 * ============================================================================
 */

// Propiedades geométricas y mecánicas de barras estándar en Colombia
const BAR_DATA_MOD08 = {
  '3': { diam: 9.5, area: 71, label: '#3 (3/8")' },
  '4': { diam: 12.7, area: 129, label: '#4 (1/2")' },
  '5': { diam: 15.9, area: 199, label: '#5 (5/8")' },
  '6': { diam: 19.1, area: 284, label: '#6 (3/4")' },
  '7': { diam: 22.2, area: 387, label: '#7 (7/8")' },
  '8': { diam: 25.4, area: 510, label: '#8 (1")' },
  '9': { diam: 28.7, area: 645, label: '#9 (1-1/8")' },
  '10': { diam: 32.3, area: 819, label: '#10 (1-1/4")' }
};

function getThemePaletteMod08() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    isDark,
    bgCanvas: isDark ? '#0B1120' : '#F8FAFC',
    gridLine: isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(148, 163, 184, 0.22)',
    concreteFill: isDark ? '#1E293B' : '#E2E8F0',
    concreteStroke: isDark ? '#64748B' : '#475569',
    rebarCore: isDark ? '#F59E0B' : '#D97706',
    rebarCut: isDark ? '#38BDF8' : '#0284C7',
    rebarCont: isDark ? '#34D399' : '#059669',
    stirrupColor: isDark ? '#A855F7' : '#7C3AED',
    hookColor: isDark ? '#FB7185' : '#E11D48',
    stressColor: isDark ? '#F43F5E' : '#BE123C',
    momentCurve: isDark ? '#38BDF8' : '#0284C7',
    momentShift: isDark ? '#F59E0B' : '#D97706',
    capacityStep: isDark ? '#34D399' : '#059669',
    pointMarker: isDark ? '#F43F5E' : '#E11D48',
    textMain: isDark ? '#F1F5F9' : '#0F172A',
    textSub: isDark ? '#94A3B8' : '#475569',
    crackLine: isDark ? 'rgba(244, 63, 94, 0.75)' : 'rgba(225, 29, 72, 0.75)'
  };
}

function drawGridMod08(ctx, W, H, pal) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = pal.bgCanvas;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = pal.gridLine;
  ctx.lineWidth = 1;
  const step = 25;
  for (let x = step; x < W; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = step; y < H; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
}

/**
 * ============================================================================
 * SIMULADOR 8.1: CALCULADORA INTEGRAL DE LONGITUD DE DESARROLLO Y GANCHOS
 * ============================================================================
 */
function updateSim81() {
  const barKey = document.getElementById('sim81-bar')?.value || '6';
  const bar = BAR_DATA_MOD08[barKey] || BAR_DATA_MOD08['6'];
  const db = bar.diam; // mm

  const fc = parseFloat(document.getElementById('sim81-fc')?.value || '21'); // MPa
  const fy = parseFloat(document.getElementById('sim81-fy')?.value || '420'); // MPa
  const pos = document.getElementById('sim81-pos')?.value || 'bottom'; // bottom / top
  const coating = document.getElementById('sim81-coating')?.value || 'black'; // black / epoxy_low / epoxy_other
  const light = parseFloat(document.getElementById('sim81-light')?.value || '1.0'); // 1.0 / 0.75
  const cover = parseFloat(document.getElementById('sim81-cover')?.value || '40'); // mm (recubrimiento libre)
  const spacing = parseFloat(document.getElementById('sim81-spacing')?.value || '50'); // mm (separación libre entre barras)
  const stirrupOpt = document.getElementById('sim81-stirrups')?.value || 'standard';
  const excessRatio = parseFloat(document.getElementById('sim81-excess')?.value || '1.0'); // As_req / As_prov <= 1.0
  const hookType = document.getElementById('sim81-hook-type')?.value || '90'; // 90 / 180
  const hookCover = document.getElementById('sim81-hook-cover')?.value || 'normal'; // normal / large (>=65mm)
  const hookTies = document.getElementById('sim81-hook-ties')?.value || 'no'; // yes (s<=3db) / no

  // Actualizar displays numéricos de los sliders
  const coverValEl = document.getElementById('sim81-cover-val');
  if (coverValEl) coverValEl.textContent = cover.toFixed(0) + ' mm';
  const spacingValEl = document.getElementById('sim81-spacing-val');
  if (spacingValEl) spacingValEl.textContent = spacing.toFixed(0) + ' mm';
  const excessValEl = document.getElementById('sim81-excess-val');
  if (excessValEl) excessValEl.textContent = (excessRatio * 100).toFixed(0) + '%';

  // 1. Factores Modificadores NSR-10 C.12.2.4
  // psi_t: factor de ubicación del refuerzo (superior = 1.3, otros = 1.0)
  const psi_t = (pos === 'top') ? 1.3 : 1.0;

  // psi_e: factor de recubrimiento epóxico
  let psi_e = 1.0;
  if (coating === 'epoxy_low') {
    psi_e = 1.5; // recubrimiento < 3db o separación < 6db
  } else if (coating === 'epoxy_other') {
    psi_e = 1.2;
  }
  // Límite normativo: psi_t * psi_e no necesita ser mayor a 1.7
  const psi_t_e = Math.min(psi_t * psi_e, 1.7);

  // psi_s: factor de tamaño de barra (<= #6 es 0.8, >= #7 es 1.0)
  const psi_s = (parseInt(barKey, 10) <= 6) ? 0.8 : 1.0;

  // lambda: factor de concreto con agregados livianos
  const lambda = light;

  // 2. Cálculo de cb (menor distancia entre centro de barra a superficie o mitad de espaciamiento c.a.c)
  // c_c: recubrimiento libre a estribo. Asumimos estribo #3 (9.5mm)
  const d_est = (stirrupOpt === 'none') ? 0 : 9.5;
  const c_superficie = cover + d_est + db / 2;
  const c_separacion = (spacing + db) / 2;
  const cb = Math.min(c_superficie, c_separacion);

  // 3. Índice de refuerzo transversal Ktr = (40 * Atr) / (s * n)
  // n = número de barras a desarrollar (asumimos 3 barras en la capa)
  let Ktr = 0;
  if (stirrupOpt === 'standard') {
    // Estribos #3 @ 200 mm, 2 ramales -> Atr = 2 * 71 = 142 mm²
    Ktr = (40 * 142) / (200 * 3); // ~ 9.47 mm
  } else if (stirrupOpt === 'seismic') {
    // Estribos #3 @ 100 mm, 2 ramales -> Atr = 142 mm²
    Ktr = (40 * 142) / (100 * 3); // ~ 18.93 mm
  } else if (stirrupOpt === 'heavy') {
    // Estribos #4 @ 100 mm, 2 ramales -> Atr = 2 * 129 = 258 mm²
    Ktr = (40 * 258) / (100 * 3); // ~ 34.4 mm
  }

  // Término de confinamiento (cb + Ktr) / db <= 2.5
  const confTermRaw = (cb + Ktr) / db;
  const confTerm = Math.min(confTermRaw, 2.5);

  // 4. Longitud de desarrollo general a tracción (Ec. C.12-1)
  const sqrt_fc = Math.min(Math.sqrt(fc), 8.3); // NSR-10 limita sqrt(fc) <= 8.3 MPa (aprox fc <= 69 MPa)
  let ld_gen = ((fy / (1.1 * lambda * sqrt_fc)) * (psi_t_e * psi_s / confTerm)) * db;
  ld_gen = Math.max(ld_gen, 300); // Mínimo normativo C.12.2.1: 300 mm

  // Longitud de desarrollo modificada por exceso de refuerzo
  const ld_gen_excess = Math.max(ld_gen * excessRatio, 300);

  // 5. Longitud de desarrollo simplificada (Tabla C.12.2.2)
  // Chequeo de condiciones normales de recubrimiento y espaciamiento
  let ld_simp_coeff = 1.0;
  if (parseInt(barKey, 10) <= 6) {
    // Barras <= #6
    ld_simp_coeff = (confTerm >= 1.5) ? (1.0 / 2.1) : (1.0 / 1.4);
  } else {
    // Barras >= #7
    ld_simp_coeff = (confTerm >= 1.5) ? (1.0 / 1.7) : (1.0 / 1.1);
  }
  let ld_simp = (fy * psi_t_e / (lambda * sqrt_fc)) * ld_simp_coeff * db;
  ld_simp = Math.max(ld_simp, 300);

  // 6. Ganchos estándar en tracción (NSR-10 C.12.5)
  // Longitud de desarrollo básica con gancho: ldh = (0.24 * psi_e * fy) / (lambda * sqrt_fc) * db
  // psi_e para ganchos = 1.2 si es epóxico, 1.0 otros
  const psi_e_hook = (coating !== 'black') ? 1.2 : 1.0;
  let ldh_basic = (0.24 * psi_e_hook * fy / (lambda * sqrt_fc)) * db;
  ldh_basic = Math.max(ldh_basic, 8 * db, 150); // Mínimo C.12.5.1: max(8*db, 150 mm)

  // Factores modificadores para ganchos (C.12.5.3)
  let f_hook_mod = 1.0;
  if (hookCover === 'large') {
    // Recubrimiento lateral >= 65 mm y para gancho a 90° recubrimiento tras extensión >= 50 mm -> factor 0.7
    f_hook_mod *= 0.7;
  }
  if (hookTies === 'yes') {
    // Confinado por estribos perpendiculares con s <= 3*db -> factor 0.8
    f_hook_mod *= 0.8;
  }
  // Exceso de refuerzo (si aplica)
  f_hook_mod *= excessRatio;

  const ldh = Math.max(ldh_basic * f_hook_mod, 8 * db, 150);

  // Geometría del gancho
  // Diámetro interior de doblado: 6*db para #3-#8, 8*db para #9-#10
  const D_bend = (parseInt(barKey, 10) <= 8) ? (6 * db) : (8 * db);
  const r_bend = D_bend / 2;
  // Extensión recta: 12*db para 90°; max(4*db, 65mm) para 180°
  const ext_straight = (hookType === '90') ? (12 * db) : Math.max(4 * db, 65);

  // 7. Longitud de desarrollo a compresión ldc (C.12.3)
  const ldc_1 = 0.24 * (fy / sqrt_fc) * db;
  const ldc_2 = 0.043 * fy * db;
  let ldc = Math.max(ldc_1, ldc_2, 200); // Mínimo 200 mm
  // Reducción por confinamiento helicoidal / estribos cerrados s <= 100 mm -> factor 0.75
  if (stirrupOpt === 'seismic' || stirrupOpt === 'heavy') {
    ldc *= 0.75;
  }
  ldc = Math.max(ldc * excessRatio, 200);

  // 8. Empalmes por traslapo (C.12.14 a C.12.16)
  // Clase A: 1.0 * ld (mín 300 mm)
  // Clase B: 1.3 * ld (mín 300 mm)
  const lap_A = Math.max(1.0 * ld_gen, 300);
  const lap_B = Math.max(1.3 * ld_gen, 300);
  // Empalme a compresión: fy <= 420 -> 0.071 * fy * db (mín 300 mm)
  let lap_comp = (fy <= 420) ? (0.071 * fy * db) : ((0.13 * fy - 24) * db);
  if (fc < 21) lap_comp *= 1.333; // Incremento de 1/3 si fc < 21 MPa
  lap_comp = Math.max(lap_comp, 300);

  // Renderizar resultados en el DOM
  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setTxt('res81-cb', `${cb.toFixed(1)} mm`);
  setTxt('res81-ktr', `${Ktr.toFixed(1)} mm`);
  setTxt('res81-confterm', `${confTerm.toFixed(2)} ${confTermRaw > 2.5 ? '(Lím. máx 2.5)' : ''}`);
  setTxt('res81-ld-gen', `${Math.round(ld_gen)} mm (${(ld_gen / 10).toFixed(1)} cm)`);
  setTxt('res81-ld-excess', `${Math.round(ld_gen_excess)} mm (${(ld_gen_excess / 10).toFixed(1)} cm)`);
  setTxt('res81-ld-simp', `${Math.round(ld_simp)} mm (${(ld_simp / 10).toFixed(1)} cm)`);
  setTxt('res81-ldh', `${Math.round(ldh)} mm (${(ldh / 10).toFixed(1)} cm)`);
  setTxt('res81-dbend', `${Math.round(D_bend)} mm`);
  setTxt('res81-ext', `${Math.round(ext_straight)} mm`);
  setTxt('res81-ldc', `${Math.round(ldc)} mm (${(ldc / 10).toFixed(1)} cm)`);
  setTxt('res81-lap-a', `${Math.round(lap_A)} mm (${(lap_A / 10).toFixed(1)} cm)`);
  setTxt('res81-lap-b', `${Math.round(lap_B)} mm (${(lap_B / 10).toFixed(1)} cm)`);
  setTxt('res81-lap-c', `${Math.round(lap_comp)} mm (${(lap_comp / 10).toFixed(1)} cm)`);

  // Dibujar Canvas
  drawSim81Canvas({
    barKey,
    db,
    fc,
    fy,
    pos,
    cb,
    Ktr,
    confTerm,
    ld_gen,
    ldh,
    D_bend,
    ext_straight,
    hookType,
    cover,
    spacing,
    stirrupOpt
  });
}

function drawSim81Canvas(data) {
  const canvas = document.getElementById('sim81-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const pal = getThemePaletteMod08();

  drawGridMod08(ctx, W, H, pal);

  // Dividir el Canvas en 2 secciones:
  // Izquierda: Vista longitudinal del anclaje y gancho (60% del ancho)
  // Derecha: Vista transversal de la sección de viga con planos de fisuración (40% del ancho)
  const splitX = W * 0.60;

  // Línea divisoria suave
  ctx.strokeStyle = pal.gridLine;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(splitX, 10);
  ctx.lineTo(splitX, H - 10);
  ctx.stroke();
  ctx.setLineDash([]);

  // ==========================================================================
  // PANEL IZQUIERDO: DETALLE LONGITUDINAL DE ANCLAJE Y GANCHO ESTÁNDAR
  // ==========================================================================
  ctx.save();
  ctx.fillStyle = pal.textMain;
  ctx.font = 'bold 12px Inter, sans-serif';
  ctx.fillText('A. ANCLAJE LONGITUDINAL Y GANCHO ESTÁNDAR (NSR-10 C.12.5)', 20, 24);

  // Geometría del bloque de concreto (viga/columna nudo)
  const beamLeft = 30;
  const beamTop = 50;
  const beamW = splitX - 50;
  const beamH = H - 80;

  // Dibujar concreto
  ctx.fillStyle = pal.concreteFill;
  ctx.strokeStyle = pal.concreteStroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(beamLeft, beamTop, beamW, beamH, 6);
  ctx.fill();
  ctx.stroke();

  // Cara del apoyo (sección crítica de desarrollo)
  const colFaceX = beamLeft + 70;
  ctx.strokeStyle = pal.textSub;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(colFaceX, beamTop - 10);
  ctx.lineTo(colFaceX, beamTop + beamH + 10);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = pal.textSub;
  ctx.font = '10px Inter, sans-serif';
  ctx.fillText('Sección crítica (cara nudo)', colFaceX - 35, beamTop - 14);

  // Barra de refuerzo longitudinal
  const rebarY = (data.pos === 'top') ? (beamTop + 40) : (beamTop + beamH - 45);
  const rebarStartX = beamLeft + 15;
  const rebarEndX = beamLeft + beamW - 40;
  const barPxThick = Math.max(4, Math.min(10, data.db * 0.35));

  // Trazar barra recta
  ctx.strokeStyle = pal.rebarCore;
  ctx.lineWidth = barPxThick;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(rebarStartX, rebarY);
  ctx.lineTo(rebarEndX, rebarY);
  ctx.stroke();

  // Corrugaciones en la barra recta
  ctx.strokeStyle = pal.concreteStroke;
  ctx.lineWidth = 1.5;
  for (let x = rebarStartX + 10; x < rebarEndX - 10; x += 12) {
    ctx.beginPath();
    ctx.moveTo(x - 3, rebarY - barPxThick / 2 - 2);
    ctx.lineTo(x + 3, rebarY + barPxThick / 2 + 2);
    ctx.stroke();
  }

  // Trazar Gancho Estándar en el extremo derecho
  const bendRadius = Math.max(14, Math.min(28, data.D_bend * 0.15));
  const hookDir = (data.pos === 'top') ? 1 : -1; // 90° hacia abajo si es superior, hacia arriba si es inferior
  ctx.strokeStyle = pal.hookColor;
  ctx.lineWidth = barPxThick;
  ctx.beginPath();

  if (data.hookType === '90') {
    // Gancho a 90°
    const bendCenterX = rebarEndX;
    const bendCenterY = rebarY + hookDir * bendRadius;
    const startAngle = (data.pos === 'top') ? -Math.PI / 2 : Math.PI / 2;
    const endAngle = 0;
    ctx.arc(bendCenterX, bendCenterY, bendRadius, startAngle, endAngle, (data.pos === 'top') ? false : true);

    const extLen = Math.max(30, Math.min(65, data.ext_straight * 0.15));
    const extEndY = bendCenterY + hookDir * extLen;
    ctx.lineTo(bendCenterX + bendRadius, extEndY);
    ctx.stroke();

    // Cota extensión 12*db
    ctx.fillStyle = pal.hookColor;
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`Extensión: 12·db (${Math.round(data.ext_straight)} mm)`, bendCenterX + bendRadius + 6, bendCenterY + hookDir * (extLen / 2));
  } else {
    // Gancho a 180°
    const bendCenterY = rebarY + hookDir * bendRadius;
    ctx.arc(rebarEndX, bendCenterY, bendRadius, (data.pos === 'top') ? -Math.PI / 2 : Math.PI / 2, (data.pos === 'top') ? Math.PI / 2 : -Math.PI / 2, false);
    const extLen = Math.max(25, Math.min(50, data.ext_straight * 0.15));
    ctx.lineTo(rebarEndX - extLen, rebarY + hookDir * 2 * bendRadius);
    ctx.stroke();

    ctx.fillStyle = pal.hookColor;
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`Extensión: ≥ 4·db (${Math.round(data.ext_straight)} mm)`, rebarEndX - extLen - 10, rebarY + hookDir * 2 * bendRadius + (data.pos === 'top' ? 12 : -5));
  }

  // Estribos de confinamiento a lo largo de la barra
  if (data.stirrupOpt !== 'none') {
    ctx.strokeStyle = pal.stirrupColor;
    ctx.lineWidth = 2;
    const s_step = (data.stirrupOpt === 'seismic' || data.stirrupOpt === 'heavy') ? 22 : 40;
    for (let sx = colFaceX + 20; sx < rebarEndX + 15; sx += s_step) {
      ctx.beginPath();
      ctx.roundRect(sx, beamTop + 15, 14, beamH - 30, 3);
      ctx.stroke();
    }
  }

  // Cotas inferiores: ldh (longitud de gancho) y ld (longitud de desarrollo recta)
  const dimY1 = beamTop + beamH + 20;
  ctx.strokeStyle = pal.hookColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(colFaceX, dimY1);
  ctx.lineTo(rebarEndX + bendRadius, dimY1);
  ctx.stroke();

  // Flechas cota ldh
  ctx.beginPath();
  ctx.moveTo(colFaceX, dimY1 - 4); ctx.lineTo(colFaceX, dimY1 + 4);
  ctx.moveTo(rebarEndX + bendRadius, dimY1 - 4); ctx.lineTo(rebarEndX + bendRadius, dimY1 + 4);
  ctx.stroke();

  ctx.fillStyle = pal.hookColor;
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`ldh = ${Math.round(data.ldh)} mm (Gancho)`, (colFaceX + rebarEndX + bendRadius) / 2, dimY1 - 6);

  // Vectores de esfuerzo cortante rasante (adherencia acero-concreto)
  ctx.strokeStyle = pal.stressColor;
  ctx.fillStyle = pal.stressColor;
  ctx.lineWidth = 1;
  for (let ax = colFaceX + 15; ax < rebarEndX - 20; ax += 25) {
    const arrowY = rebarY - (data.pos === 'top' ? -12 : 12);
    ctx.beginPath();
    ctx.moveTo(ax, arrowY);
    ctx.lineTo(ax - 12, arrowY);
    ctx.stroke();
    // Punta flecha
    ctx.beginPath();
    ctx.moveTo(ax - 12, arrowY);
    ctx.lineTo(ax - 8, arrowY - 3);
    ctx.lineTo(ax - 8, arrowY + 3);
    ctx.fill();
  }
  ctx.font = '9px Inter, sans-serif';
  ctx.fillText('Esfuerzo rasante τb', (colFaceX + rebarEndX) / 2 - 20, rebarY - (data.pos === 'top' ? -24 : 22));

  ctx.restore();

  // ==========================================================================
  // PANEL DERECHO: SECCIÓN TRANSVERSAL Y PLANOS DE HENDIMIENTO (SPLITTING)
  // ==========================================================================
  ctx.save();
  ctx.fillStyle = pal.textMain;
  ctx.font = 'bold 12px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('B. FISURACIÓN POR HENDIMIENTO (SPLITTING)', splitX + 20, 24);

  const secX = splitX + 35;
  const secY = 60;
  const secW = W - splitX - 60;
  const secH = H - 100;

  // Viga de concreto sección rectangular
  ctx.fillStyle = pal.concreteFill;
  ctx.strokeStyle = pal.concreteStroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(secX, secY, secW, secH, 8);
  ctx.fill();
  ctx.stroke();

  // Estribo rectangular cerrado
  const estMargin = 16;
  const estX = secX + estMargin;
  const estY = secY + estMargin;
  const estW = secW - 2 * estMargin;
  const estH = secH - 2 * estMargin;

  ctx.strokeStyle = pal.stirrupColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(estX, estY, estW, estH, 6);
  ctx.stroke();

  // Gancho sísmico a 135° en esquina superior
  ctx.beginPath();
  ctx.moveTo(estX + 20, estY);
  ctx.lineTo(estX, estY);
  ctx.lineTo(estX, estY + 20);
  ctx.lineTo(estX + 18, estY + 18);
  ctx.stroke();

  // Barras longitudinales (3 barras inferiores y 2 barras de montaje superiores)
  const barR = Math.max(6, Math.min(12, data.db * 0.45));
  const botY = estY + estH - barR - 4;
  const topY = estY + barR + 4;
  const barPositions = [
    { x: estX + barR + 6, y: botY, label: 'Ext' },
    { x: estX + estW / 2, y: botY, label: 'Cent' },
    { x: estX + estW - barR - 6, y: botY, label: 'Ext' },
    { x: estX + barR + 6, y: topY, label: 'Sup' },
    { x: estX + estW - barR - 6, y: topY, label: 'Sup' }
  ];

  barPositions.forEach((b, idx) => {
    ctx.fillStyle = pal.rebarCore;
    ctx.strokeStyle = pal.rebarCut;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(b.x, b.y, barR, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  });

  // Planos de hendimiento (splitting cracks) por presiones radiales de las corrugaciones
  ctx.strokeStyle = pal.crackLine;
  ctx.lineWidth = 2;
  ctx.setLineDash([3, 2]);

  // Fisura horizontal entre barras inferiores
  ctx.beginPath();
  ctx.moveTo(secX, botY);
  ctx.lineTo(secX + secW, botY);
  ctx.stroke();

  // Fisuras verticales hacia el recubrimiento inferior
  barPositions.slice(0, 3).forEach(b => {
    ctx.beginPath();
    ctx.moveTo(b.x, botY + barR);
    ctx.lineTo(b.x, secY + secH);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // Cota de cb y recubrimiento
  ctx.fillStyle = pal.crackLine;
  ctx.font = 'bold 9px Inter, sans-serif';
  ctx.fillText('Fisura horizontal por hendimiento', secX + 15, botY - barR - 4);
  ctx.fillText('Fisuras verticales de fondo', secX + 25, secY + secH - 6);

  // Parámetro cb ilustrado
  ctx.strokeStyle = pal.textMain;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  const cBar = barPositions[0];
  ctx.moveTo(secX, cBar.y);
  ctx.lineTo(cBar.x, cBar.y);
  ctx.stroke();

  ctx.fillStyle = pal.textMain;
  ctx.font = '10px Inter, sans-serif';
  ctx.fillText(`cb = ${data.cb.toFixed(1)} mm`, secX + 6, cBar.y - 6);

  ctx.restore();
}

/**
 * ============================================================================
 * SIMULADOR 8.2: ENVOLVENTE DE MOMENTOS DESPLAZADOS Y PUNTOS DE CORTE
 * ============================================================================
 */
function updateSim82() {
  const span = parseFloat(document.getElementById('sim82-span')?.value || '6.0'); // m
  const wu = parseFloat(document.getElementById('sim82-wu')?.value || '45.0'); // kN/m
  const mu1 = parseFloat(document.getElementById('sim82-mu-left')?.value || '80.0'); // kN·m
  const mu2 = parseFloat(document.getElementById('sim82-mu-right')?.value || '80.0'); // kN·m
  const h_cm = parseFloat(document.getElementById('sim82-h')?.value || '50.0'); // cm
  const d_cm = parseFloat(document.getElementById('sim82-d')?.value || '44.0'); // cm
  const barKey = document.getElementById('sim82-bar-size')?.value || '6';
  const bar = BAR_DATA_MOD08[barKey] || BAR_DATA_MOD08['6'];
  const db = bar.diam; // mm

  const nTotal = parseInt(document.getElementById('sim82-nbars-pos')?.value || '4', 10); // Ej. 4 barras
  const nCut = parseInt(document.getElementById('sim82-nbars-cut')?.value || '2', 10); // Ej. cortar 2 barras
  const nCont = nTotal - nCut; // Barras continuas que llegan a los apoyos

  // Actualizar labels de sliders
  const spanValEl = document.getElementById('sim82-span-val');
  if (spanValEl) spanValEl.textContent = span.toFixed(1) + ' m';
  const wuValEl = document.getElementById('sim82-wu-val');
  if (wuValEl) wuValEl.textContent = wu.toFixed(1) + ' kN/m';
  const mu1ValEl = document.getElementById('sim82-mu1-val');
  if (mu1ValEl) mu1ValEl.textContent = mu1.toFixed(0) + ' kN·m';
  const mu2ValEl = document.getElementById('sim82-mu2-val');
  if (mu2ValEl) mu2ValEl.textContent = mu2.toFixed(0) + ' kN·m';
  const hValEl = document.getElementById('sim82-h-val');
  if (hValEl) hValEl.textContent = h_cm.toFixed(0) + ' cm';
  const dValEl = document.getElementById('sim82-d-val');
  if (dValEl) dValEl.textContent = d_cm.toFixed(0) + ' cm';

  // 1. Análisis estático de la viga bajo carga uniforme y momentos de extremo
  // Reacciones verticales:
  // sum M_A = 0 -> R2 * L - wu * L^2 / 2 - mu1 + mu2 = 0
  const R2 = (wu * Math.pow(span, 2) / 2 + mu1 - mu2) / span;
  const R1 = wu * span - R2;

  // Posición de cortante nulo (momento positivo máximo): V(x) = R1 - wu * x = 0 -> x_max = R1 / wu
  const x_max = Math.max(0.1, Math.min(span - 0.1, R1 / wu));
  // M(x) = R1 * x - wu * x^2 / 2 - mu1
  const Mu_max = R1 * x_max - (wu * Math.pow(x_max, 2) / 2) - mu1;

  // 2. Capacidad a flexión por barra
  // Asumimos viga b = 30 cm, d = d_cm, fc = 28 MPa, fy = 420 MPa
  const b_mm = 300;
  const d_mm = d_cm * 10;
  const fc = 28;
  const fy = 420;
  const As_1bar = bar.area; // mm²

  function calcPhiMn(nBars) {
    if (nBars <= 0) return 0;
    const As = nBars * As_1bar;
    const a = (As * fy) / (0.85 * fc * b_mm);
    const Mn = As * fy * (d_mm - a / 2) * 1e-6; // kN·m
    const phi = 0.90;
    return phi * Mn;
  }

  const phiMn_total = calcPhiMn(nTotal);
  const phiMn_cont = calcPhiMn(nCont);

  // 3. Puntos teóricos de corte (donde Mu(x) = phiMn_cont)
  // R1 * x - (wu/2) * x^2 - mu1 = phiMn_cont
  // (wu/2) * x^2 - R1 * x + (mu1 + phiMn_cont) = 0
  const A_eq = wu / 2;
  const B_eq = -R1;
  const C_eq = mu1 + phiMn_cont;
  const discr = Math.pow(B_eq, 2) - 4 * A_eq * C_eq;

  let x_t1 = 0;
  let x_t2 = span;
  let cutFeasible = false;

  if (discr > 0 && Mu_max > phiMn_cont) {
    x_t1 = (-B_eq - Math.sqrt(discr)) / (2 * A_eq);
    x_t2 = (-B_eq + Math.sqrt(discr)) / (2 * A_eq);
    cutFeasible = true;
  } else {
    // Si no corta la capacidad de las continuas, las barras deben ir completas
    x_t1 = x_max * 0.4;
    x_t2 = x_max + (span - x_max) * 0.6;
    cutFeasible = false;
  }

  // 4. Extensión práctica normativa: mayor entre d y 12*db (NSR-10 C.12.10.3)
  const ext_norm_mm = Math.max(d_mm, 12 * db);
  const ext_norm_m = ext_norm_mm / 1000;

  let x_p1 = Math.max(0, x_t1 - ext_norm_m);
  let x_p2 = Math.min(span, x_t2 + ext_norm_m);
  const L_cut_bar = x_p2 - x_p1;

  // 5. Verificación de longitud de desarrollo desde el punto de momento máximo
  // ld estimada simplificada para barra positiva inferior en fc=28
  const ld_est_m = Math.max(0.30, ((fy / (2.1 * 1.0 * Math.sqrt(fc))) * db) / 1000);
  const ld_ok_left = (x_max - x_p1) >= ld_est_m;
  const ld_ok_right = (x_p2 - x_max) >= ld_est_m;

  // 6. Porcentaje de armadura positiva que llega al apoyo
  const pctCont = (nCont / nTotal) * 100;
  const pctOk = pctCont >= 33.3; // Mínimo 1/3 para apoyos simples (C.12.11.1)

  // Actualizar DOM
  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setTxt('res82-mumax', `${Mu_max.toFixed(1)} kN·m (a x = ${x_max.toFixed(2)} m)`);
  setTxt('res82-phimn-total', `${phiMn_total.toFixed(1)} kN·m (${nTotal} barras)`);
  setTxt('res82-phimn-cont', `${phiMn_cont.toFixed(1)} kN·m (${nCont} barras continuas)`);
  setTxt('res82-xt1-xt2', cutFeasible ? `xT1 = ${x_t1.toFixed(2)} m | xT2 = ${x_t2.toFixed(2)} m` : 'No aplica corte (Mu ≤ φMn,cont)');
  setTxt('res82-ext-req', `${(ext_norm_m * 100).toFixed(1)} cm (max{d, 12·db})`);
  setTxt('res82-xp1-xp2', `xP1 = ${x_p1.toFixed(2)} m | xP2 = ${x_p2.toFixed(2)} m`);
  setTxt('res82-lbar', `${L_cut_bar.toFixed(2)} m (${Math.round(L_cut_bar * 100)} cm)`);
  setTxt('res82-pct-cont', `${pctCont.toFixed(1)}% ${pctOk ? '✓ Cumple (≥ 33.3%)' : '✗ Insuficiente (< 33.3%)'}`);

  // Dibujar Canvas
  drawSim82Canvas({
    span,
    wu,
    mu1,
    mu2,
    R1,
    R2,
    x_max,
    Mu_max,
    phiMn_total,
    phiMn_cont,
    x_t1,
    x_t2,
    x_p1,
    x_p2,
    ext_norm_m,
    cutFeasible,
    L_cut_bar,
    nTotal,
    nCut,
    nCont,
    barKey,
    d_m: d_mm / 1000
  });
}

function drawSim82Canvas(data) {
  const canvas = document.getElementById('sim82-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const pal = getThemePaletteMod08();

  drawGridMod08(ctx, W, H, pal);

  // Dividir el Canvas verticalmente:
  // Superior (60% de H): Gráfico de Momentos Mu(x), Desplazado Mu(x±d) y Capacidad φMn
  // Inferior (40% de H): Despiece Longitudinal Físico de las barras con apoyos
  const graphH = H * 0.58;
  const beamAreaY = graphH + 15;
  const beamAreaH = H - beamAreaY - 10;

  const padX = 55;
  const plotW = W - 2 * padX;

  // ==========================================================================
  // 1. GRÁFICO SUPERIOR: ENVOLVENTE Y MOMENTOS DESPLAZADOS
  // ==========================================================================
  ctx.save();
  ctx.fillStyle = pal.textMain;
  ctx.font = 'bold 12px Inter, sans-serif';
  ctx.fillText('DIAGRAMA DE MOMENTO ACTUANTE Mu(x), DESPLAZADO (+d) Y CAPACIDAD φMn(x)', 15, 20);

  // Escalas
  const scaleX = plotW / data.span;
  // Buscamos el rango máximo de momentos para escalar Y
  const maxM = Math.max(data.Mu_max * 1.25, data.phiMn_total * 1.15, Math.abs(data.mu1) * 1.2, Math.abs(data.mu2) * 1.2, 50);
  const minM = Math.min(-data.mu1, -data.mu2, 0) * 1.2;
  const rangeM = maxM - minM;
  const scaleY = (graphH - 50) / rangeM;
  const zeroY = 35 + maxM * scaleY;

  // Eje X (Momento Cero)
  ctx.strokeStyle = pal.textSub;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(padX, zeroY);
  ctx.lineTo(padX + plotW, zeroY);
  ctx.stroke();

  // Función para evaluar momento real Mu(x)
  function evalMu(x) {
    return data.R1 * x - (data.wu * Math.pow(x, 2) / 2) - data.mu1;
  }

  // Trazar Curva Parabólica Mu(x)
  ctx.strokeStyle = pal.momentCurve;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i <= 100; i++) {
    const x = (i / 100) * data.span;
    const M = evalMu(x);
    const px = padX + x * scaleX;
    const py = zeroY - M * scaleY;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Trazar Envolvente Desplazada en distancia d (hacia ambos lados)
  ctx.strokeStyle = pal.momentShift;
  ctx.lineWidth = 1.8;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  for (let i = 0; i <= 100; i++) {
    const x = (i / 100) * data.span;
    // La envolvente desplazada toma el peor momento en x ± d
    const x_left = Math.max(0, x - data.d_m);
    const x_right = Math.min(data.span, x + data.d_m);
    const M_shift = Math.max(evalMu(x), evalMu(x_left), evalMu(x_right));
    const px = padX + x * scaleX;
    const py = zeroY - M_shift * scaleY;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Trazar Escalones de Capacidad Resistente φMn
  // Línea de capacidad con todas las barras (φMn_total)
  const py_cap_total = zeroY - data.phiMn_total * scaleY;
  const py_cap_cont = zeroY - data.phiMn_cont * scaleY;

  ctx.strokeStyle = pal.capacityStep;
  ctx.lineWidth = 2.5;
  // Tramo central con todas las barras
  ctx.beginPath();
  const px_p1 = padX + data.x_p1 * scaleX;
  const px_p2 = padX + data.x_p2 * scaleX;
  ctx.moveTo(px_p1, py_cap_total);
  ctx.lineTo(px_p2, py_cap_total);
  ctx.stroke();

  // Tramo continuo (apoyos a corte práctico)
  ctx.beginPath();
  ctx.moveTo(padX, py_cap_cont);
  ctx.lineTo(px_p1, py_cap_cont);
  ctx.lineTo(px_p1, py_cap_total);
  ctx.moveTo(px_p2, py_cap_total);
  ctx.lineTo(px_p2, py_cap_cont);
  ctx.lineTo(padX + plotW, py_cap_cont);
  ctx.stroke();

  // Marcadores de Puntos Teóricos T1 y T2
  if (data.cutFeasible) {
    const px_t1 = padX + data.x_t1 * scaleX;
    const px_t2 = padX + data.x_t2 * scaleX;
    const py_t = zeroY - data.phiMn_cont * scaleY;

    ctx.fillStyle = pal.pointMarker;
    ctx.beginPath();
    ctx.arc(px_t1, py_t, 4, 0, 2 * Math.PI);
    ctx.arc(px_t2, py_t, 4, 0, 2 * Math.PI);
    ctx.fill();

    // Líneas verticales punteadas hacia abajo
    ctx.strokeStyle = pal.pointMarker;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(px_t1, py_t); ctx.lineTo(px_t1, graphH);
    ctx.moveTo(px_t2, py_t); ctx.lineTo(px_t2, graphH);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = pal.pointMarker;
    ctx.font = 'bold 9px Inter, sans-serif';
    ctx.fillText('T1', px_t1 - 14, py_t - 6);
    ctx.fillText('T2', px_t2 + 5, py_t - 6);
  }

  // Leyendas del gráfico
  ctx.font = '10px Inter, sans-serif';
  ctx.fillStyle = pal.momentCurve;
  ctx.fillText('— Mu(x) Actuante', padX + 15, 36);
  ctx.fillStyle = pal.momentShift;
  ctx.fillText('-- Mu desplazado (+d)', padX + 130, 36);
  ctx.fillStyle = pal.capacityStep;
  ctx.fillText('— φMn Capacidad', padX + 265, 36);

  ctx.restore();

  // ==========================================================================
  // 2. DETALLE INFERIOR: ESQUEMA LONGITUDINAL DE CORTE Y ANCLAJE DE BARRAS
  // ==========================================================================
  ctx.save();
  ctx.fillStyle = pal.textMain;
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.fillText('DESPIECE LONGITUDINAL Y PUNTOS PRÁCTICOS DE CORTE (NSR-10 C.12.10)', 15, beamAreaY + 12);

  const beamDrawY = beamAreaY + 28;
  const beamDrawH = beamAreaH - 40;

  // Dibujar columnas en los extremos
  const colW = 28;
  ctx.fillStyle = pal.concreteStroke;
  ctx.fillRect(padX - colW, beamDrawY - 10, colW, beamDrawH + 20);
  ctx.fillRect(padX + plotW, beamDrawY - 10, colW, beamDrawH + 20);

  // Cuerpo de la viga
  ctx.fillStyle = pal.concreteFill;
  ctx.strokeStyle = pal.concreteStroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(padX, beamDrawY, plotW, beamDrawH);
  ctx.fill();
  ctx.stroke();

  // Barras inferiores continuas (llegan a los apoyos con gancho a 90°)
  const rebarContY = beamDrawY + beamDrawH - 12;
  ctx.strokeStyle = pal.rebarCont;
  ctx.lineWidth = 4;
  ctx.beginPath();
  // Gancho izquierdo
  ctx.moveTo(padX - colW + 8, rebarContY - 16);
  ctx.lineTo(padX - colW + 8, rebarContY);
  // Barra continua horizontal
  ctx.lineTo(padX + plotW + colW - 8, rebarContY);
  // Gancho derecho
  ctx.lineTo(padX + plotW + colW - 8, rebarContY - 16);
  ctx.stroke();

  ctx.fillStyle = pal.rebarCont;
  ctx.font = 'bold 9px Inter, sans-serif';
  ctx.fillText(`${data.nCont}#${data.barKey} Continuas a los apoyos`, padX + 15, rebarContY - 6);

  // Barras inferiores cortadas en el centro
  const rebarCutY = rebarContY - 10;
  const px_cut1 = padX + data.x_p1 * scaleX;
  const px_cut2 = padX + data.x_p2 * scaleX;

  ctx.strokeStyle = pal.rebarCut;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(px_cut1, rebarCutY);
  ctx.lineTo(px_cut2, rebarCutY);
  ctx.stroke();

  // Marcas de corte práctico P1 y P2
  ctx.strokeStyle = pal.pointMarker;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px_cut1, rebarCutY - 5); ctx.lineTo(px_cut1, rebarCutY + 5);
  ctx.moveTo(px_cut2, rebarCutY - 5); ctx.lineTo(px_cut2, rebarCutY + 5);
  ctx.stroke();

  ctx.fillStyle = pal.rebarCut;
  ctx.font = 'bold 9px Inter, sans-serif';
  ctx.fillText(`${data.nCut}#${data.barKey} Cortadas (L = ${data.L_cut_bar.toFixed(2)} m)`, (px_cut1 + px_cut2) / 2 - 40, rebarCutY - 6);

  // Cota de corte inferior
  const dimCutY = beamDrawY + beamDrawH + 18;
  ctx.strokeStyle = pal.pointMarker;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(px_cut1, dimCutY);
  ctx.lineTo(px_cut2, dimCutY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(px_cut1, dimCutY - 3); ctx.lineTo(px_cut1, dimCutY + 3);
  ctx.moveTo(px_cut2, dimCutY - 3); ctx.lineTo(px_cut2, dimCutY + 3);
  ctx.stroke();

  ctx.fillStyle = pal.pointMarker;
  ctx.font = 'bold 9px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`P1: x = ${data.x_p1.toFixed(2)}m`, px_cut1, dimCutY + 12);
  ctx.fillText(`P2: x = ${data.x_p2.toFixed(2)}m`, px_cut2, dimCutY + 12);

  ctx.restore();
}

/**
 * ============================================================================
 * INICIALIZACIÓN GLOBAL DE EVENTOS Y OBSERVERS
 * ============================================================================
 */
document.addEventListener('DOMContentLoaded', () => {
  // Listeners Simulador 8.1
  const sim81Ids = [
    'sim81-bar', 'sim81-fc', 'sim81-fy', 'sim81-pos', 'sim81-coating',
    'sim81-light', 'sim81-cover', 'sim81-spacing', 'sim81-stirrups',
    'sim81-excess', 'sim81-hook-type', 'sim81-hook-cover', 'sim81-hook-ties'
  ];
  sim81Ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateSim81);
      el.addEventListener('change', updateSim81);
    }
  });

  // Listeners Simulador 8.2
  const sim82Ids = [
    'sim82-span', 'sim82-wu', 'sim82-mu-left', 'sim82-mu-right',
    'sim82-h', 'sim82-d', 'sim82-bar-size', 'sim82-nbars-pos', 'sim82-nbars-cut'
  ];
  sim82Ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateSim82);
      el.addEventListener('change', updateSim82);
    }
  });

  // Theme observer para re-renderizado
  const observer = new MutationObserver(() => {
    updateSim81();
    updateSim82();
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // Render inicial
  setTimeout(() => {
    updateSim81();
    updateSim82();
  }, 100);
});

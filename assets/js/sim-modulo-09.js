/**
 * ============================================================================
 * SIMULADORES INTERACTIVOS — MÓDULO 09: DETALLAMIENTO SISMORRESISTENTE (NSR-10 C.21)
 * ============================================================================
 * Autor: Prof. Daniel Abudinen, I.C., M.Sc.
 * 
 * Simulador 9.1: Verificador Integral de Pórtico Sísmico:
 *   - Verificación de Columna Fuerte - Viga Débil (sum Mnc / sum Mnb >= 1.20)
 *   - Cortante de Diseño por Capacidad en Vigas (Momentos Probables Mpr = 1.25 Mn)
 *   - Evaluación de condición Vc = 0 en zonas de rótula plástica (2h)
 *   - Espaciamientos de confinamiento sísmico (DMO vs DES)
 *   - Visualizador Canvas interactivo del pórtico, rótulas plásticas y estribos
 * 
 * Simulador 9.2: Diseñador de Nudos Viga-Columna (NSR-10 C.21.7):
 *   - Clasificación de confinamiento del nudo (gamma = 1.7, 1.2, 1.0)
 *   - Fuerza horizontal demandada en el nudo: Vjh = T1 + C2 - Vcol
 *   - Área efectiva del nudo Aj = bj * hc
 *   - Resistencia nominal Vn = gamma * sqrt(fc) * Aj y factor phi = 0.85
 *   - Refuerzo transversal de confinamiento en el nudo Ash
 *   - Visualizador Canvas con biela diagonal de compresión y estribos pasantes
 * ============================================================================
 */

const BAR_DATA_MOD09 = {
  '3': { diam: 9.5, area: 71, label: '#3 (3/8")' },
  '4': { diam: 12.7, area: 129, label: '#4 (1/2")' },
  '5': { diam: 15.9, area: 199, label: '#5 (5/8")' },
  '6': { diam: 19.1, area: 284, label: '#6 (3/4")' },
  '7': { diam: 22.2, area: 387, label: '#7 (7/8")' },
  '8': { diam: 25.4, area: 510, label: '#8 (1")' },
  '9': { diam: 28.7, area: 645, label: '#9 (1-1/8")' },
  '10': { diam: 32.3, area: 819, label: '#10 (1-1/4")' }
};

function getThemePaletteMod09() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    isDark,
    bgCanvas: isDark ? '#0B1120' : '#F8FAFC',
    gridLine: isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(148, 163, 184, 0.22)',
    concreteFill: isDark ? '#1E293B' : '#E2E8F0',
    concreteStroke: isDark ? '#64748B' : '#475569',
    colFill: isDark ? '#1E293B' : '#CBD5E1',
    colStroke: isDark ? '#94A3B8' : '#334155',
    beamFill: isDark ? '#0F172A' : '#F1F5F9',
    beamStroke: isDark ? '#38BDF8' : '#0284C7',
    rebarCore: isDark ? '#F59E0B' : '#D97706',
    rebarTop: isDark ? '#38BDF8' : '#0284C7',
    rebarBot: isDark ? '#34D399' : '#059669',
    stirrupColor: isDark ? '#A855F7' : '#7C3AED',
    hingeFill: isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.20)',
    hingeStroke: isDark ? '#EF4444' : '#DC2626',
    strutFill: isDark ? 'rgba(245, 158, 11, 0.22)' : 'rgba(217, 119, 6, 0.18)',
    strutStroke: isDark ? '#F59E0B' : '#D97706',
    forceTension: isDark ? '#38BDF8' : '#0284C7',
    forceCompression: isDark ? '#EF4444' : '#DC2626',
    forceShear: isDark ? '#34D399' : '#059669',
    textMain: isDark ? '#F1F5F9' : '#0F172A',
    textSub: isDark ? '#94A3B8' : '#475569',
    okBadge: isDark ? '#34D399' : '#059669',
    dangerBadge: isDark ? '#FB7185' : '#E11D48'
  };
}

function drawGridMod09(ctx, W, H, pal) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = pal.bgCanvas;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = pal.gridLine;
  ctx.lineWidth = 1;
  const step = 25;
  for (let x = step; x < W; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = step; y < H; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
}

/**
 * ============================================================================
 * SIMULADOR 9.1: VERIFICADOR INTEGRAL DE PÓRTICO SÍSMICO (COLUMNA FUERTE & CORTE)
 * ============================================================================
 */
function updateSim91() {
  const level = document.getElementById('sim91-level')?.value || 'DES'; // DMO / DES
  const fc = parseFloat(document.getElementById('sim91-fc')?.value || '28'); // MPa
  const fy = parseFloat(document.getElementById('sim91-fy')?.value || '420'); // MPa

  // Dimensiones vigas
  const bw = parseFloat(document.getElementById('sim91-bw')?.value || '350'); // mm
  const h_beam = parseFloat(document.getElementById('sim91-hbeam')?.value || '550'); // mm
  const d_beam = h_beam - 60; // mm aprox
  const Ln = parseFloat(document.getElementById('sim91-ln')?.value || '6.0'); // m (luz libre de viga)
  const wu = parseFloat(document.getElementById('sim91-wu')?.value || '35.0'); // kN/m (carga gravitacional)

  // Armaduras longitudinales viga
  const nTop = parseInt(document.getElementById('sim91-ntop')?.value || '4', 10);
  const barTopKey = document.getElementById('sim91-bartop')?.value || '7';
  const barTop = BAR_DATA_MOD09[barTopKey] || BAR_DATA_MOD09['7'];
  const As_top = nTop * barTop.area; // mm²

  const nBot = parseInt(document.getElementById('sim91-nbot')?.value || '3', 10);
  const barBotKey = document.getElementById('sim91-barbot')?.value || '7';
  const barBot = BAR_DATA_MOD09[barBotKey] || BAR_DATA_MOD09['7'];
  const As_bot = nBot * barBot.area; // mm²

  // Dimensiones columnas y armadura
  const bc = parseFloat(document.getElementById('sim91-bc')?.value || '450'); // mm
  const hc = parseFloat(document.getElementById('sim91-hc')?.value || '450'); // mm
  const H_col = parseFloat(document.getElementById('sim91-hcol')?.value || '3.2'); // m (altura libre de entrepiso)
  const Pu_col = parseFloat(document.getElementById('sim91-pucol')?.value || '800'); // kN (axial en columna)
  const nColBars = parseInt(document.getElementById('sim91-ncolbars')?.value || '8', 10);
  const barColKey = document.getElementById('sim91-barcol')?.value || '8';
  const barCol = BAR_DATA_MOD09[barColKey] || BAR_DATA_MOD09['8'];
  const Ast_col = nColBars * barCol.area; // mm²

  // Actualizar display de sliders
  const LnVal = document.getElementById('sim91-ln-val');
  if (LnVal) LnVal.textContent = Ln.toFixed(1) + ' m';
  const wuVal = document.getElementById('sim91-wu-val');
  if (wuVal) wuVal.textContent = wu.toFixed(1) + ' kN/m';
  const HcolVal = document.getElementById('sim91-hcol-val');
  if (HcolVal) HcolVal.textContent = H_col.toFixed(1) + ' m';
  const PuVal = document.getElementById('sim91-pucol-val');
  if (PuVal) PuVal.textContent = Pu_col.toFixed(0) + ' kN';

  // 1. Capacidad a flexión de vigas (Mn negativo y Mn positivo)
  // Momento negativo (acero superior traccionado):
  const a_neg = (As_top * fy) / (0.85 * fc * bw);
  const Mn_neg = As_top * fy * (d_beam - a_neg / 2) * 1e-6; // kN·m
  // Momento positivo (acero inferior traccionado):
  const a_pos = (As_bot * fy) / (0.85 * fc * bw);
  const Mn_pos = As_bot * fy * (d_beam - a_pos / 2) * 1e-6; // kN·m

  // Momentos probables para diseño por capacidad (Mpr = 1.25 * Mn aprox o con 1.25*fy)
  const a_pr_neg = (As_top * 1.25 * fy) / (0.85 * fc * bw);
  const Mpr_neg = As_top * (1.25 * fy) * (d_beam - a_pr_neg / 2) * 1e-6; // kN·m

  const a_pr_pos = (As_bot * 1.25 * fy) / (0.85 * fc * bw);
  const Mpr_pos = As_bot * (1.25 * fy) * (d_beam - a_pr_pos / 2) * 1e-6; // kN·m

  // Suma de momentos resistentes de vigas que convergen en el nudo: sum Mnb
  // En sismo hacia la derecha: nudo tiene viga izquierda con M_pos y viga derecha con M_neg
  const sum_Mnb = Mn_neg + Mn_pos;

  // 2. Capacidad a flexión de columnas (Mn_col) estimada con carga axial Pu
  // Para estimar Mn de columna con refuerzo simétrico y axial Pu:
  // d_c aprox = hc - 50 mm
  const d_col = hc - 50;
  const Ag_col = bc * hc;
  const rho_col = Ast_col / Ag_col;
  // Fórmula aproximada de capacidad de columna con flexión y axial moderado:
  // Mn_c aprox = 0.40 * Ast * fy * (hc - 2*cover) + 0.15 * Pu * hc
  const arm_c = (hc - 2 * 50) * 1e-3; // m
  const Mn_c_approx = (0.50 * Ast_col * fy * arm_c * 1e-3) + (0.12 * Pu_col * hc * 1e-3);
  const sum_Mnc = 2 * Mn_c_approx; // Columna superior e inferior

  // Relación Columna Fuerte - Viga Débil
  const ratio_cfvd = sum_Mnc / Math.max(sum_Mnb, 1);
  const cfvd_ok = (level === 'DES') ? (ratio_cfvd >= 1.20) : (ratio_cfvd >= 1.0);

  // 3. Cortante de diseño por capacidad en la viga (Ve)
  // Ve = (Mpr1 + Mpr2) / Ln +/- wu * Ln / 2
  const V_sway = (Mpr_neg + Mpr_pos) / Ln; // Cortante inducido por rótulas plásticas
  const V_grav = (wu * Ln) / 2; // Cortante isostático gravitacional
  const Ve = V_sway + V_grav;

  // 4. Verificación de Vc = 0 en zona de confinamiento (DES: C.21.5.4.2)
  // Se desprecia Vc si el cortante sísmico es >= 50% del total y Pu < Ag*fc/20
  let Vc_beam = 0;
  const sway_ratio = V_sway / Math.max(Ve, 1);
  const is_Vc_zero = (level === 'DES') && (sway_ratio >= 0.50) && (Pu_col * 1e3 < (Ag_col * fc) / 20);
  if (!is_Vc_zero) {
    // Vc tradicional = 0.17 * sqrt(fc) * bw * d
    Vc_beam = (0.17 * Math.sqrt(fc) * bw * d_beam) * 1e-3; // kN
  }
  const phi_shear = 0.75;
  const Vs_req = Math.max(0, (Ve / phi_shear) - Vc_beam);

  // 5. Espaciamientos de confinamiento sísmico en vigas
  // Zona confinada = 2h desde la cara del apoyo
  const L_conf_viga = (2 * h_beam) / 1000; // m
  const d_db_min = Math.min(barTop.diam, barBot.diam);
  let s_max_conf = 0;
  if (level === 'DES') {
    // DES: s <= min(d/4, 6*db_min, 150 mm)
    s_max_conf = Math.min(d_beam / 4, 6 * d_db_min, 150);
  } else {
    // DMO: s <= min(d/4, 8*db_min, 24*d_estribo, 300 mm)
    s_max_conf = Math.min(d_beam / 4, 8 * d_db_min, 24 * 9.5, 300);
  }
  s_max_conf = Math.floor(s_max_conf / 10) * 10; // Redondear hacia abajo a múltiplo de 10mm

  // Espaciamiento en columnas en zona lo:
  // lo = max(hc, H_col/6, 450 mm en DMO, 500 mm en DES)
  const lo_col = (level === 'DES') 
    ? Math.max(hc, (H_col * 1000) / 6, 500)
    : Math.max(hc, (H_col * 1000) / 6, 450);
  
  let s_max_col = 0;
  if (level === 'DES') {
    s_max_col = Math.min(Math.min(bc, hc) / 4, 6 * barCol.diam, 100);
  } else {
    s_max_col = Math.min(Math.min(bc, hc) / 2, 8 * barCol.diam, 150);
  }
  s_max_col = Math.floor(s_max_col / 10) * 10;

  // Actualizar DOM
  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setTxt('res91-mn-beam', `M⁻ = ${Mn_neg.toFixed(1)} kN·m | M⁺ = ${Mn_pos.toFixed(1)} kN·m`);
  setTxt('res91-mpr-beam', `Mpr⁻ = ${Mpr_neg.toFixed(1)} kN·m | Mpr⁺ = ${Mpr_pos.toFixed(1)} kN·m`);
  setTxt('res91-sum-mnb', `${sum_Mnb.toFixed(1)} kN·m`);
  setTxt('res91-sum-mnc', `${sum_Mnc.toFixed(1)} kN·m (2 columnas)`);
  setTxt('res91-ratio-cfvd', `${ratio_cfvd.toFixed(2)} ${cfvd_ok ? '✓ CUMPLE (≥ 1.20)' : '✗ INSUFICIENTE (< 1.20)'}`);
  setTxt('res91-ve', `${Ve.toFixed(1)} kN (Sway: ${V_sway.toFixed(1)} + Grav: ${V_grav.toFixed(1)})`);
  setTxt('res91-vc-status', is_Vc_zero ? '0.0 kN (Vc = 0 por rótula sísmica DES)' : `${Vc_beam.toFixed(1)} kN (Vc activo)`);
  setTxt('res91-vs-req', `${Vs_req.toFixed(1)} kN`);
  setTxt('res91-s-beam', `s ≤ ${s_max_conf} mm (en L = ${(L_conf_viga * 100).toFixed(0)} cm)`);
  setTxt('res91-s-col', `s ≤ ${s_max_col} mm (en lo = ${(lo_col / 10).toFixed(0)} cm)`);

  // Dibujar Canvas 9.1
  drawSim91Canvas({
    level,
    bw,
    h_beam,
    bc,
    hc,
    Ln,
    H_col,
    Mn_neg,
    Mn_pos,
    Mpr_neg,
    Mpr_pos,
    sum_Mnb,
    sum_Mnc,
    ratio_cfvd,
    cfvd_ok,
    Ve,
    V_sway,
    V_grav,
    is_Vc_zero,
    s_max_conf,
    s_max_col,
    L_conf_viga,
    lo_col: lo_col / 1000
  });
}

function drawSim91Canvas(data) {
  const canvas = document.getElementById('sim91-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const pal = getThemePaletteMod09();

  drawGridMod09(ctx, W, H, pal);

  ctx.save();
  ctx.fillStyle = pal.textMain;
  ctx.font = 'bold 12px Inter, sans-serif';
  ctx.fillText(`MECANISMO DE CAPACIDAD SÍSMICA — PÓRTICO ${data.level} (NSR-10 C.21)`, 15, 20);

  // Dimensiones del dibujo en Canvas
  const cx = W / 2;
  const cy = H / 2 + 5;
  const colW_px = 55;
  const beamH_px = 44;
  const beamSpan_px = W * 0.44;
  const colHeight_px = H * 0.38;

  // 1. Columnas Superior e Inferior
  ctx.fillStyle = pal.colFill;
  ctx.strokeStyle = pal.colStroke;
  ctx.lineWidth = 2;

  // Columna Inferior
  ctx.fillRect(cx - colW_px / 2, cy + beamH_px / 2, colW_px, colHeight_px);
  ctx.strokeRect(cx - colW_px / 2, cy + beamH_px / 2, colW_px, colHeight_px);

  // Columna Superior
  ctx.fillRect(cx - colW_px / 2, cy - beamH_px / 2 - colHeight_px, colW_px, colHeight_px);
  ctx.strokeRect(cx - colW_px / 2, cy - beamH_px / 2 - colHeight_px, colW_px, colHeight_px);

  // 2. Vigas Izquierda y Derecha
  ctx.fillStyle = pal.beamFill;
  ctx.strokeStyle = pal.beamStroke;
  ctx.lineWidth = 2;

  // Viga Izquierda
  ctx.fillRect(cx - colW_px / 2 - beamSpan_px, cy - beamH_px / 2, beamSpan_px, beamH_px);
  ctx.strokeRect(cx - colW_px / 2 - beamSpan_px, cy - beamH_px / 2, beamSpan_px, beamH_px);

  // Viga Derecha
  ctx.fillRect(cx + colW_px / 2, cy - beamH_px / 2, beamSpan_px, beamH_px);
  ctx.strokeRect(cx + colW_px / 2, cy - beamH_px / 2, beamSpan_px, beamH_px);

  // Núcleo del Nudo Viga-Columna
  ctx.fillStyle = data.cfvd_ok ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.20)';
  ctx.strokeStyle = data.cfvd_ok ? pal.okBadge : pal.dangerBadge;
  ctx.lineWidth = 2;
  ctx.fillRect(cx - colW_px / 2, cy - beamH_px / 2, colW_px, beamH_px);
  ctx.strokeRect(cx - colW_px / 2, cy - beamH_px / 2, colW_px, beamH_px);

  // 3. Zonas de Confinamiento y Rótulas Plásticas en Vigas (2h)
  const lconf_px = Math.min(80, beamSpan_px * 0.45);

  // Rótula izquierda (momento positivo / negativo)
  ctx.fillStyle = pal.hingeFill;
  ctx.strokeStyle = pal.hingeStroke;
  ctx.lineWidth = 1.8;
  ctx.fillRect(cx - colW_px / 2 - lconf_px, cy - beamH_px / 2, lconf_px, beamH_px);
  ctx.strokeRect(cx - colW_px / 2 - lconf_px, cy - beamH_px / 2, lconf_px, beamH_px);

  // Rótula derecha
  ctx.fillRect(cx + colW_px / 2, cy - beamH_px / 2, lconf_px, beamH_px);
  ctx.strokeRect(cx + colW_px / 2, cy - beamH_px / 2, lconf_px, beamH_px);

  // Cota 2h
  ctx.fillStyle = pal.hingeStroke;
  ctx.font = 'bold 9px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('2h (Rótula)', cx - colW_px / 2 - lconf_px / 2, cy - beamH_px / 2 - 8);
  ctx.fillText('2h (Rótula)', cx + colW_px / 2 + lconf_px / 2, cy - beamH_px / 2 - 8);

  // 4. Estribos de Confinamiento en Vigas y Columnas
  ctx.strokeStyle = pal.stirrupColor;
  ctx.lineWidth = 1.5;
  // Estribos en viga derecha (zona confinada s fino vs exterior s normal)
  for (let x = cx + colW_px / 2 + 8; x < cx + colW_px / 2 + lconf_px; x += 11) {
    ctx.beginPath();
    ctx.moveTo(x, cy - beamH_px / 2 + 4);
    ctx.lineTo(x, cy + beamH_px / 2 - 4);
    ctx.stroke();
  }
  for (let x = cx + colW_px / 2 + lconf_px + 12; x < cx + colW_px / 2 + beamSpan_px - 15; x += 22) {
    ctx.beginPath();
    ctx.moveTo(x, cy - beamH_px / 2 + 4);
    ctx.lineTo(x, cy + beamH_px / 2 - 4);
    ctx.stroke();
  }

  // Estribos en columna (zona lo confinada)
  const lcol_conf_px = Math.min(65, colHeight_px * 0.45);
  // Columna superior
  for (let y = cy - beamH_px / 2 - 6; y > cy - beamH_px / 2 - lcol_conf_px; y -= 10) {
    ctx.beginPath();
    ctx.moveTo(cx - colW_px / 2 + 5, y);
    ctx.lineTo(cx + colW_px / 2 - 5, y);
    ctx.stroke();
  }
  // Columna inferior
  for (let y = cy + beamH_px / 2 + 6; y < cy + beamH_px / 2 + lcol_conf_px; y += 10) {
    ctx.beginPath();
    ctx.moveTo(cx - colW_px / 2 + 5, y);
    ctx.lineTo(cx + colW_px / 2 - 5, y);
    ctx.stroke();
  }

  // 5. Flechas Curvas de Momentos Probables (Mecanismo Sismo hacia la Derecha)
  // Momento en viga izquierda (horario hacia el nudo)
  ctx.strokeStyle = pal.hingeStroke;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx - colW_px / 2 - 25, cy, 14, 0.4 * Math.PI, 1.4 * Math.PI, false);
  ctx.stroke();

  // Momento en viga derecha (antihorario hacia el nudo)
  ctx.beginPath();
  ctx.arc(cx + colW_px / 2 + 25, cy, 14, -0.4 * Math.PI, 0.6 * Math.PI, false);
  ctx.stroke();

  // Momentos en columnas (resistiendo el nudo)
  ctx.strokeStyle = pal.okBadge;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy - beamH_px / 2 - 25, 14, 0.1 * Math.PI, 1.1 * Math.PI, false);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy + beamH_px / 2 + 25, 14, -0.9 * Math.PI, 0.1 * Math.PI, false);
  ctx.stroke();

  // 6. Badge de Resultado Columna Fuerte - Viga Débil
  const badgeY = H - 28;
  ctx.fillStyle = data.cfvd_ok ? pal.okBadge : pal.dangerBadge;
  ctx.beginPath();
  ctx.roundRect(cx - 150, badgeY - 14, 300, 26, 6);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    `ΣMnc / ΣMnb = ${data.ratio_cfvd.toFixed(2)} — ${data.cfvd_ok ? 'COLUMNA FUERTE CUMPLE (≥ 1.20)' : 'FALLA: PISO BLANDO POTENCIAL'}`,
    cx,
    badgeY + 3
  );

  ctx.restore();
}

/**
 * ============================================================================
 * SIMULADOR 9.2: DISEÑADOR DE NUDOS VIGA-COLUMNA (NSR-10 C.21.7)
 * ============================================================================
 */
function updateSim92() {
  const nodeType = document.getElementById('sim92-nodetype')?.value || 'int4'; // int4, int2, ext, corner
  const fc = parseFloat(document.getElementById('sim92-fc')?.value || '28'); // MPa
  const fy = parseFloat(document.getElementById('sim92-fy')?.value || '420'); // MPa
  const bc = parseFloat(document.getElementById('sim92-bc')?.value || '450'); // mm (ancho columna)
  const hc = parseFloat(document.getElementById('sim92-hc')?.value || '450'); // mm (peralte columna)
  const bb = parseFloat(document.getElementById('sim92-bb')?.value || '350'); // mm (ancho viga)
  const hb = parseFloat(document.getElementById('sim92-hb')?.value || '550'); // mm (peralte viga)

  // Armaduras longitudinales en viga que llegan al nudo
  const nTop = parseInt(document.getElementById('sim92-ntop')?.value || '4', 10);
  const barTopKey = document.getElementById('sim92-bartop')?.value || '7';
  const barTop = BAR_DATA_MOD09[barTopKey] || BAR_DATA_MOD09['7'];
  const As_top = nTop * barTop.area; // mm²

  const nBot = parseInt(document.getElementById('sim92-nbot')?.value || '3', 10);
  const barBotKey = document.getElementById('sim92-barbot')?.value || '7';
  const barBot = BAR_DATA_MOD09[barBotKey] || BAR_DATA_MOD09['7'];
  const As_bot = nBot * barBot.area; // mm²

  const Vcol = parseFloat(document.getElementById('sim92-vcol')?.value || '120'); // kN (cortante en columna)

  // 1. Factor de confinamiento gamma (NSR-10 C.21.7.4.1)
  let gamma = 1.0;
  let nodeDesc = '';
  if (nodeType === 'int4') {
    gamma = 1.7; // Confinado en 4 caras por vigas con b >= 0.75 bc
    nodeDesc = 'Nudo Interior confinado en 4 caras (γ = 1.7)';
  } else if (nodeType === 'int2') {
    gamma = 1.2; // Confinado en 3 caras o en 2 caras opuestas
    nodeDesc = 'Nudo Interior confinado en 2 caras opuestas (γ = 1.2)';
  } else if (nodeType === 'ext') {
    gamma = 1.0; // Nudo Exterior
    nodeDesc = 'Nudo Exterior (γ = 1.0)';
  } else {
    gamma = 1.0; // Nudo de Esquina u otros
    nodeDesc = 'Nudo de Esquina (γ = 1.0)';
  }

  // 2. Ancho efectivo del nudo bj (NSR-10 C.21.7.4.2)
  // bj no debe exceder el menor de:
  // a) bb + hc
  // b) bb + 2x (siendo x la distancia entre cara de viga y cara de columna)
  // ni exceder bc
  const x_dist = (bc - bb) / 2;
  const bj_opt1 = bb + hc;
  const bj_opt2 = bb + 2 * x_dist; // = bc
  const bj = Math.min(bc, bj_opt1, bj_opt2);
  const Aj = (bj * hc) * 1e-2; // cm²

  // 3. Demandas de cortante horizontal en el nudo (Vjh)
  // Bajo sismo lateral extremo, la barra superior fluye a 1.25*fy (Mpr):
  // T1 = 1.25 * As_top * fy
  const T1 = 1.25 * As_top * fy * 1e-3; // kN
  // Si es nudo interior, en la cara opuesta el acero inferior está a compresión o tracción inversa:
  let C2 = 0;
  if (nodeType === 'int4' || nodeType === 'int2') {
    C2 = 1.25 * As_bot * fy * 1e-3; // kN
  } else {
    // Nudo exterior: solo actúa la tracción del refuerzo superior anclado con gancho
    C2 = 0;
  }
  const Vjh = T1 + C2 - Vcol; // kN

  // 4. Resistencia al cortante nominal y de diseño en el nudo
  // Vn = gamma * sqrt(fc) * Aj
  const phi_j = 0.85; // NSR-10 C.9.3.4 nudos
  const sqrt_fc = Math.min(Math.sqrt(fc), 8.3);
  const Vn = (gamma * sqrt_fc * (bj * hc)) * 1e-3; // kN
  const phi_Vn = phi_j * Vn; // kN

  const dc_ratio = Vjh / Math.max(phi_Vn, 1);
  const node_ok = Vjh <= phi_Vn;

  // 5. Refuerzo transversal de confinamiento en el nudo Ash (NSR-10 C.21.7.2)
  // Se requiere al menos la armadura de confinamiento de la columna:
  // Ash >= 0.3 * (s * bc * fc / fyt) * (Ag / Ach - 1)
  // Ach con recubrimiento 40mm a estribos
  const s_nudo = 100; // mm
  const b_core = bc - 2 * 40;
  const h_core = hc - 2 * 40;
  const Ach = b_core * h_core;
  const Ag = bc * hc;
  const Ash_req1 = 0.3 * ((s_nudo * b_core * fc) / fy) * (Ag / Ach - 1);
  const Ash_req2 = 0.09 * ((s_nudo * b_core * fc) / fy);
  const Ash_req = Math.max(Ash_req1, Ash_req2);

  // Actualizar DOM
  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setTxt('res92-gamma', `γ = ${gamma.toFixed(1)} (${nodeDesc})`);
  setTxt('res92-bj-aj', `bj = ${bj.toFixed(0)} mm | Aj = ${Aj.toFixed(0)} cm²`);
  setTxt('res92-t1', `${T1.toFixed(1)} kN (1.25·As·fy)`);
  setTxt('res92-c2', `${C2.toFixed(1)} kN`);
  setTxt('res92-vjh', `${Vjh.toFixed(1)} kN (T1 + C2 - Vcol)`);
  setTxt('res92-phivn', `${phi_Vn.toFixed(1)} kN (Vn = ${Vn.toFixed(1)} kN, φ = 0.85)`);
  setTxt('res92-dc', `${dc_ratio.toFixed(2)} ${node_ok ? '✓ CUMPLE (Vjh ≤ φVn)' : '✗ FALLA POR CORTANTE EN NUDO'}`);
  setTxt('res92-ash', `${Ash_req.toFixed(0)} mm² (cada ${s_nudo} mm de altura de nudo)`);

  // Dibujar Canvas 9.2
  drawSim92Canvas({
    nodeType,
    gamma,
    bc,
    hc,
    bb,
    hb,
    T1,
    C2,
    Vcol,
    Vjh,
    phi_Vn,
    dc_ratio,
    node_ok,
    bj,
    Ash_req
  });
}

function drawSim92Canvas(data) {
  const canvas = document.getElementById('sim92-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const pal = getThemePaletteMod09();

  drawGridMod09(ctx, W, H, pal);

  // Dividir Canvas:
  // Izquierda: Alzado del nudo con biela de compresión y fuerzas actuantes
  // Derecha: Sección en planta del nudo con ancho efectivo bj
  const splitX = W * 0.58;

  ctx.strokeStyle = pal.gridLine;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(splitX, 10);
  ctx.lineTo(splitX, H - 10);
  ctx.stroke();
  ctx.setLineDash([]);

  // ==========================================================================
  // PANEL IZQUIERDO: ALZADO DEL NUDO Y BIELA DIAGONAL
  // ==========================================================================
  ctx.save();
  ctx.fillStyle = pal.textMain;
  ctx.font = 'bold 12px Inter, sans-serif';
  ctx.fillText('A. EQUILIBRIO DE FUERZAS Y BIELA DIAGONAL EN EL NUDO', 15, 20);

  const cx1 = splitX * 0.48;
  const cy1 = H / 2 + 10;
  const colW = 60;
  const beamH = 50;
  const beamLen = 95;
  const colLen = 90;

  // Columna cuerpo
  ctx.fillStyle = pal.colFill;
  ctx.strokeStyle = pal.colStroke;
  ctx.lineWidth = 2;
  ctx.fillRect(cx1 - colW / 2, cy1 - beamH / 2 - colLen, colW, colLen * 2 + beamH);
  ctx.strokeRect(cx1 - colW / 2, cy1 - beamH / 2 - colLen, colW, colLen * 2 + beamH);

  // Vigas
  ctx.fillStyle = pal.beamFill;
  ctx.strokeStyle = pal.beamStroke;
  if (data.nodeType === 'int4' || data.nodeType === 'int2') {
    // Viga izquierda y derecha
    ctx.fillRect(cx1 - colW / 2 - beamLen, cy1 - beamH / 2, beamLen, beamH);
    ctx.strokeRect(cx1 - colW / 2 - beamLen, cy1 - beamH / 2, beamLen, beamH);
    ctx.fillRect(cx1 + colW / 2, cy1 - beamH / 2, beamLen, beamH);
    ctx.strokeRect(cx1 + colW / 2, cy1 - beamH / 2, beamLen, beamH);
  } else {
    // Nudo exterior: solo viga izquierda
    ctx.fillRect(cx1 - colW / 2 - beamLen, cy1 - beamH / 2, beamLen, beamH);
    ctx.strokeRect(cx1 - colW / 2 - beamLen, cy1 - beamH / 2, beamLen, beamH);
  }

  // Núcleo del Nudo
  ctx.fillStyle = data.node_ok ? 'rgba(52, 211, 153, 0.18)' : 'rgba(239, 68, 68, 0.22)';
  ctx.strokeStyle = data.node_ok ? pal.okBadge : pal.dangerBadge;
  ctx.lineWidth = 2.5;
  ctx.fillRect(cx1 - colW / 2, cy1 - beamH / 2, colW, beamH);
  ctx.strokeRect(cx1 - colW / 2, cy1 - beamH / 2, colW, beamH);

  // Biela Diagonal de Compresión en el Nudo (Strut)
  ctx.fillStyle = pal.strutFill;
  ctx.strokeStyle = pal.strutStroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const strutW = 16;
  ctx.moveTo(cx1 - colW / 2, cy1 - beamH / 2 + strutW);
  ctx.lineTo(cx1 - colW / 2 + strutW, cy1 - beamH / 2);
  ctx.lineTo(cx1 + colW / 2, cy1 + beamH / 2 - strutW);
  ctx.lineTo(cx1 + colW / 2 - strutW, cy1 + beamH / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Flechas de Fuerzas
  // T1: Tracción superior viga izquierda
  ctx.strokeStyle = pal.forceTension;
  ctx.fillStyle = pal.forceTension;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx1 - colW / 2, cy1 - beamH / 2 + 10);
  ctx.lineTo(cx1 - colW / 2 - 45, cy1 - beamH / 2 + 10);
  ctx.stroke();
  ctx.fillText(`T1 = ${Math.round(data.T1)} kN`, cx1 - colW / 2 - 50, cy1 - beamH / 2 + 6);

  // Vcol: Cortante en columna superior
  ctx.strokeStyle = pal.forceShear;
  ctx.fillStyle = pal.forceShear;
  ctx.beginPath();
  ctx.moveTo(cx1, cy1 - beamH / 2 - 40);
  ctx.lineTo(cx1 + 35, cy1 - beamH / 2 - 40);
  ctx.stroke();
  ctx.fillText(`Vcol = ${Math.round(data.Vcol)} kN`, cx1 + 5, cy1 - beamH / 2 - 46);

  // Vjh: Cortante de Nudo (flecha central)
  ctx.strokeStyle = data.node_ok ? pal.okBadge : pal.dangerBadge;
  ctx.fillStyle = data.node_ok ? pal.okBadge : pal.dangerBadge;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx1 - 18, cy1);
  ctx.lineTo(cx1 + 18, cy1);
  ctx.stroke();
  ctx.fillText(`Vjh = ${Math.round(data.Vjh)} kN`, cx1 - 25, cy1 - 8);

  ctx.restore();

  // ==========================================================================
  // PANEL DERECHO: PLANTA DEL NUDO Y ANCHO EFECTIVO bj
  // ==========================================================================
  ctx.save();
  ctx.fillStyle = pal.textMain;
  ctx.font = 'bold 12px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('B. ÁREA EFECTIVA DEL NUDO EN PLANTA (Aj)', splitX + 15, 20);

  const cx2 = splitX + (W - splitX) / 2;
  const cy2 = H / 2 + 5;
  const colSize_px = 88;
  const beamW_px = 64;

  // Sección de Columna cuadrada en planta
  ctx.fillStyle = pal.colFill;
  ctx.strokeStyle = pal.colStroke;
  ctx.lineWidth = 2;
  ctx.fillRect(cx2 - colSize_px / 2, cy2 - colSize_px / 2, colSize_px, colSize_px);
  ctx.strokeRect(cx2 - colSize_px / 2, cy2 - colSize_px / 2, colSize_px, colSize_px);

  // Viga principal atravesando en vertical
  ctx.fillStyle = pal.beamFill;
  ctx.strokeStyle = pal.beamStroke;
  ctx.lineWidth = 1.8;
  ctx.fillRect(cx2 - beamW_px / 2, cy2 - colSize_px / 2 - 35, beamW_px, colSize_px + 70);
  ctx.strokeRect(cx2 - beamW_px / 2, cy2 - colSize_px / 2 - 35, beamW_px, colSize_px + 70);

  // Ancho efectivo bj sombreado
  ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
  ctx.strokeStyle = pal.beamStroke;
  ctx.lineWidth = 2;
  ctx.setLineDash([3, 3]);
  const bj_px = Math.min(colSize_px, beamW_px + 16);
  ctx.fillRect(cx2 - bj_px / 2, cy2 - colSize_px / 2, bj_px, colSize_px);
  ctx.strokeRect(cx2 - bj_px / 2, cy2 - colSize_px / 2, bj_px, colSize_px);
  ctx.setLineDash([]);

  // Cotas
  ctx.fillStyle = pal.textMain;
  ctx.font = 'bold 10px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`bc = ${data.bc} mm`, cx2, cy2 + colSize_px / 2 + 18);
  ctx.fillText(`bj = ${Math.round(data.bj)} mm`, cx2, cy2 - colSize_px / 2 - 8);

  ctx.restore();
}

/**
 * ============================================================================
 * INICIALIZACIÓN GLOBAL DE EVENTOS Y OBSERVERS
 * ============================================================================
 */
document.addEventListener('DOMContentLoaded', () => {
  // Listeners Simulador 9.1
  const sim91Ids = [
    'sim91-level', 'sim91-fc', 'sim91-fy', 'sim91-bw', 'sim91-hbeam',
    'sim91-ln', 'sim91-wu', 'sim91-ntop', 'sim91-bartop', 'sim91-nbot',
    'sim91-barbot', 'sim91-bc', 'sim91-hc', 'sim91-hcol', 'sim91-pucol',
    'sim91-ncolbars', 'sim91-barcol'
  ];
  sim91Ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateSim91);
      el.addEventListener('change', updateSim91);
    }
  });

  // Listeners Simulador 9.2
  const sim92Ids = [
    'sim92-nodetype', 'sim92-fc', 'sim92-fy', 'sim92-bc', 'sim92-hc',
    'sim92-bb', 'sim92-hb', 'sim92-ntop', 'sim92-bartop', 'sim92-nbot',
    'sim92-barbot', 'sim92-vcol'
  ];
  sim92Ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateSim92);
      el.addEventListener('change', updateSim92);
    }
  });

  // Theme observer
  const observer = new MutationObserver(() => {
    updateSim91();
    updateSim92();
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // Render inicial
  setTimeout(() => {
    updateSim91();
    updateSim92();
  }, 100);
});

/* ==========================================================================
   CORE JS — DISEÑO ESTRUCTURAL DE CONCRETO REFORZADO (NSR-10)
   Control de Modo Dual (Estudio / Clase Magistral), Menú Responsive (Drawer / Off-canvas),
   Puntero Láser, Tema Claro/Oscuro, Lightbox de Imágenes, Scroll-Spy 60fps,
   Transiciones Suaves (Acordeones, Soluciones), Gestos Táctiles y Renderizado KaTeX
   ========================================================================== */

(function () {
  'use strict';

  let isPresentationMode = false;
  let isLaserMode = false;
  let currentSlideIndex = 0;
  let slides = [];
  let isScrollTicking = false;
  let currentActiveSectionId = null;

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initCollapsibleSidebar();
    initSlidesList();
    initScrollSpy();
    initLightbox();
    initLaserPointer();
    initKeyboardShortcuts();
    initTouchGestures();
    initMathRendering();
    initTableResponsiveness();
    initScrollReveal();
    initModuleFilter();
  });

  /* --------------------------------------------------------------------------
     1. TEMA CLARO / OSCURO
     -------------------------------------------------------------------------- */
  function initTheme() {
    const saved = localStorage.getItem('concrete_theme') || localStorage.getItem('diplomado_theme') || 'light';
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    updateThemeButton();
  }

  window.toggleTheme = function () {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('concrete_theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('concrete_theme', 'dark');
    }
    updateThemeButton();
    if (typeof window.redrawAllSimulators === 'function') {
      window.redrawAllSimulators();
    }
  };

  function updateThemeButton() {
    const btn = document.getElementById('btn-theme');
    if (!btn) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.innerHTML = isDark
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> <span class="btn-label">Modo Claro</span>'
      : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> <span class="btn-label">Modo Oscuro</span>';
  }

  /* --------------------------------------------------------------------------
     1.1. MENÚ LATERAL RESPONSIVE Y COLAPSABLE (DRAWER OFF-CANVAS EN MÓVIL)
     -------------------------------------------------------------------------- */
  function initCollapsibleSidebar() {
    const saved = localStorage.getItem('concrete_sidebar_collapsed') ?? localStorage.getItem('diplomado_sidebar_collapsed');
    if (saved === 'true' && window.innerWidth > 1120) {
      document.body.classList.add('sidebar-collapsed');
    }

    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    // 1. Asegurar existencia de backdrop para móvil
    let backdrop = document.querySelector('.sidebar-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'sidebar-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      backdrop.addEventListener('click', () => {
        document.body.classList.remove('sidebar-mobile-open');
      });
      document.body.appendChild(backdrop);
    }

    // 2. Asegurar existencia de botón hamburguesa en la barra superior (.topbar-brand)
    const brand = document.querySelector('.topbar-brand');
    if (brand && !document.getElementById('btn-sidebar-toggle')) {
      const toggleBtn = document.createElement('button');
      toggleBtn.id = 'btn-sidebar-toggle';
      toggleBtn.className = 'btn-sidebar-toggle';
      toggleBtn.setAttribute('aria-label', 'Alternar menú de navegación');
      toggleBtn.setAttribute('title', 'Menú de contenidos (Ctrl+B)');
      toggleBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      `;
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.toggleSidebar();
      });
      brand.insertBefore(toggleBtn, brand.firstChild);
    }

    // 3. Asegurar existencia del botón flotante para escritorio cuando está colapsado
    if (!document.getElementById('btn-sidebar-float')) {
      const floatBtn = document.createElement('button');
      floatBtn.id = 'btn-sidebar-float';
      floatBtn.className = 'btn-sidebar-float';
      floatBtn.title = 'Mostrar Menú de Contenidos (Ctrl+B)';
      floatBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
        <span>Menú</span>
      `;
      floatBtn.addEventListener('click', window.toggleSidebar);
      document.body.appendChild(floatBtn);
    }

    // 4. Encabezado interno del sidebar con botón de cierre
    if (!sidebar.querySelector('.sidebar-top-header')) {
      const topHeader = document.createElement('div');
      topHeader.className = 'sidebar-top-header';
      topHeader.innerHTML = `
        <span class="sidebar-collapse-badge">Navegación</span>
        <button class="btn-sidebar-collapse" onclick="toggleSidebar()" title="Cerrar / Ocultar menú lateral (Ctrl+B)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          <span>Ocultar</span>
        </button>
      `;
      sidebar.insertBefore(topHeader, sidebar.firstChild);
    }

    // 5. Enlaces del TOC cierran automáticamente el drawer en pantallas táctiles / móviles
    sidebar.querySelectorAll('.toc-link').forEach((link) => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 1120) {
          document.body.classList.remove('sidebar-mobile-open');
        }
      });
    });

    // 6. Cierre con clic fuera del menú en pantallas móviles
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 1120 && document.body.classList.contains('sidebar-mobile-open')) {
        if (!sidebar.contains(e.target) && !e.target.closest('#btn-sidebar-toggle')) {
          document.body.classList.remove('sidebar-mobile-open');
        }
      }
    });

    // 7. Redimensionamiento de ventana: limpiar clases si pasa de móvil a desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1120) {
        document.body.classList.remove('sidebar-mobile-open');
      }
    });
  }

  window.toggleSidebar = function (forceState) {
    const isMobile = window.innerWidth <= 1120;
    if (isMobile) {
      const shouldOpen = forceState !== undefined ? forceState : !document.body.classList.contains('sidebar-mobile-open');
      document.body.classList.toggle('sidebar-mobile-open', shouldOpen);
    } else {
      const isCollapsed = document.body.classList.toggle('sidebar-collapsed');
      localStorage.setItem('concrete_sidebar_collapsed', isCollapsed ? 'true' : 'false');
    }
    if (typeof window.redrawAllSimulators === 'function') {
      setTimeout(window.redrawAllSimulators, 150);
    }
  };

  /* --------------------------------------------------------------------------
     2. MODO DUAL: ESTUDIO AUTÓNOMO VS. CLASE MAGISTRAL (16:9)
     -------------------------------------------------------------------------- */
  function initSlidesList() {
    const candidates = Array.from(
      document.querySelectorAll('.lesson-section, .content-section, .hero-banner')
    );
    const seen = new Set();
    slides = candidates.filter((el) => {
      if (seen.has(el)) return false;
      seen.add(el);
      return true;
    });

    if (slides.length === 0) {
      slides = Array.from(document.querySelectorAll('.chapter-divider, section'));
    }
  }

  window.togglePresentationMode = function () {
    initSlidesList();
    if (slides.length === 0) return;

    isPresentationMode = !isPresentationMode;
    document.body.classList.toggle('presentation-mode', isPresentationMode);

    const btn = document.getElementById('btn-presentation');
    if (btn) {
      btn.classList.toggle('active-mode', isPresentationMode);
      btn.innerHTML = isPresentationMode
        ? '<span>📖</span> Salir a Modo Estudio (P)'
        : '<span>🖥️</span> Modo Clase Magistral (P)';
    }

    if (isPresentationMode) {
      let bestIdx = 0;
      let minDistance = Infinity;
      const viewportMid = window.innerHeight * 0.45;

      slides.forEach((el, idx) => {
        const rect = el.getBoundingClientRect();
        if (rect.top <= viewportMid && rect.bottom >= viewportMid) {
          bestIdx = idx;
          minDistance = 0;
        } else {
          const dist = Math.abs(rect.top - 80);
          if (dist < minDistance) {
            minDistance = dist;
            bestIdx = idx;
          }
        }
      });
      showSlide(bestIdx);
    } else {
      slides.forEach((el) => el.classList.remove('slide-active'));
      if (slides[currentSlideIndex]) {
        slides[currentSlideIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    if (typeof window.redrawAllSimulators === 'function') {
      setTimeout(window.redrawAllSimulators, 80);
    }
  };

  window.jumpToSimulators = function () {
    initSlidesList();
    let targetIdx = -1;
    for (let i = 0; i < slides.length; i++) {
      if (slides[i].querySelector('.sim-grid, .sim-body, .simulator-card, .simulator-box, canvas, [id*="sim"]')) {
        targetIdx = i;
        break;
      }
    }
    if (isPresentationMode && targetIdx !== -1) {
      showSlide(targetIdx);
    } else {
      const el = document.querySelector('.sim-grid, .sim-body, .simulator-card, .simulator-box, canvas, [id*="sim"]');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  window.jumpToExercises = function () {
    initSlidesList();
    let targetIdx = -1;
    for (let i = 0; i < slides.length; i++) {
      if (slides[i].querySelector('.example-card, .example-solution-box, .calc-step-card, [id*="ej-"]')) {
        targetIdx = i;
        break;
      }
    }
    if (isPresentationMode && targetIdx !== -1) {
      showSlide(targetIdx);
    } else {
      const el = document.querySelector('.example-card, .example-solution-box, .calc-step-card, [id*="ej-"]');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  window.showSlide = function (index) {
    if (slides.length === 0) return;
    currentSlideIndex = Math.max(0, Math.min(index, slides.length - 1));
    slides.forEach((el, idx) => {
      el.classList.toggle('slide-active', idx === currentSlideIndex);
    });
    const counter = document.getElementById('hud-slide-counter');
    if (counter) {
      counter.textContent = `Lámina ${currentSlideIndex + 1} / ${slides.length}`;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const activeId = slides[currentSlideIndex].id;
    if (activeId) {
      document.querySelectorAll('.toc-link').forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${activeId}`);
      });
    }

    if (typeof window.redrawAllSimulators === 'function') {
      setTimeout(window.redrawAllSimulators, 60);
    }
  };

  window.nextSlide = function () {
    if (isPresentationMode) {
      showSlide(currentSlideIndex + 1);
    }
  };

  window.prevSlide = function () {
    if (isPresentationMode) {
      showSlide(currentSlideIndex - 1);
    }
  };

  /* --------------------------------------------------------------------------
     2.1. GESTOS TÁCTILES (SWIPE EN MÓVIL/TABLET PARA MODO PRESENTACIÓN)
     -------------------------------------------------------------------------- */
  function initTouchGestures() {
    let touchStartX = 0;
    let touchStartY = 0;

    document.addEventListener('touchstart', (e) => {
      if (!isPresentationMode || !e.changedTouches || e.changedTouches.length === 0) return;
      touchStartX = e.changedTouches[0].clientX;
      touchStartY = e.changedTouches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      if (!isPresentationMode || !e.changedTouches || e.changedTouches.length === 0) return;
      const deltaX = e.changedTouches[0].clientX - touchStartX;
      const deltaY = e.changedTouches[0].clientY - touchStartY;

      // Deslizamiento horizontal claro (>45px y predominantemente horizontal)
      if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        if (deltaX < 0) {
          window.nextSlide();
        } else {
          window.prevSlide();
        }
      }
    }, { passive: true });
  }

  /* --------------------------------------------------------------------------
     3. PUNTERO LÁSER VIRTUAL PARA EL DOCENTE
     -------------------------------------------------------------------------- */
  function initLaserPointer() {
    const dot = document.createElement('div');
    dot.className = 'laser-dot';
    dot.id = 'laser-dot';
    document.body.appendChild(dot);

    document.addEventListener('mousemove', (e) => {
      if (!isLaserMode) return;
      dot.style.left = `${e.clientX}px`;
      dot.style.top = `${e.clientY}px`;
    });
  }

  window.toggleLaser = function () {
    isLaserMode = !isLaserMode;
    document.body.classList.toggle('laser-mode', isLaserMode);
    const btn = document.getElementById('btn-laser');
    if (btn) {
      btn.classList.toggle('laser-active', isLaserMode);
    }
  };

  /* --------------------------------------------------------------------------
     4. ATAJOS DE TECLADO
     -------------------------------------------------------------------------- */
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        window.toggleSidebar();
      } else if (e.altKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        window.toggleSidebar();
      } else if (e.key === 'p' || e.key === 'P') {
        if (document.getElementById('btn-presentation')) {
          e.preventDefault();
          window.togglePresentationMode();
        }
      } else if (e.key === 'l' || e.key === 'L') {
        if (document.getElementById('btn-laser')) {
          e.preventDefault();
          window.toggleLaser();
        }
      } else if (e.key === 'v' || e.key === 'V') {
        if (document.getElementById('modal-variables')) {
          e.preventDefault();
          window.toggleVariablesModal();
        }
      } else if (isPresentationMode && (e.key === 'ArrowRight' || e.key === 'PageDown')) {
        e.preventDefault();
        window.nextSlide();
      } else if (isPresentationMode && (e.key === 'ArrowLeft' || e.key === 'PageUp')) {
        e.preventDefault();
        window.prevSlide();
      } else if (e.key === 'Escape') {
        const dm = document.getElementById('modal-diagrama-transferencia');
        if (dm && dm.classList.contains('open')) {
          e.preventDefault();
          window.closeLoadPathModal();
          return;
        }
        const df = document.getElementById('modal-diagrama-flexion');
        if (df && df.classList.contains('open')) {
          e.preventDefault();
          window.closeFlexureModal();
          return;
        }
        const ds = document.getElementById('modal-diagrama-cortante');
        if (ds && ds.classList.contains('open')) {
          e.preventDefault();
          window.closeShearModal();
          return;
        }
        const vm = document.getElementById('modal-variables');
        if (vm && vm.classList.contains('open')) {
          e.preventDefault();
          window.toggleVariablesModal();
          return;
        }
        const lb = document.getElementById('lightbox-overlay');
        if (lb && lb.classList.contains('open')) {
          lb.classList.remove('open');
        } else if (document.body.classList.contains('sidebar-mobile-open')) {
          document.body.classList.remove('sidebar-mobile-open');
        } else if (isPresentationMode) {
          window.togglePresentationMode();
        }
      }
    });
  }

  /* --------------------------------------------------------------------------
     5. SCROLL-SPY 60FPS (REQUEST ANIMATION FRAME) Y BARRA DE PROGRESO
     -------------------------------------------------------------------------- */
  function initScrollSpy() {
    const progressBar = document.getElementById('reading-progress');
    const tocLinks = Array.from(document.querySelectorAll('.toc-link, .sidebar-menu a'));
    const sections = tocLinks
      .map((link) => {
        const href = link.getAttribute('href');
        return href && href.startsWith('#') ? document.querySelector(href) : null;
      })
      .filter(Boolean);

    tocLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (!href || !href.startsWith('#')) return;
        const targetId = href.substring(1);

        if (isPresentationMode) {
          e.preventDefault();
          const idx = slides.findIndex((s) => s.id === targetId);
          if (idx !== -1) showSlide(idx);
          return;
        }

        let targetEl = document.getElementById(targetId);
        if (targetEl) {
          e.preventDefault();
          if (targetEl.classList.contains('example-macro-body') && typeof window.toggleExampleMacro === 'function') {
            window.toggleExampleMacro(targetId, true);
            targetEl = document.getElementById(`macro-${targetId}`) || targetEl;
          }

          const topbar = document.querySelector('.topbar');
          const topbarHeight = topbar ? topbar.offsetHeight : 64;
          const targetY = targetEl.getBoundingClientRect().top + window.scrollY - topbarHeight - 16;
          window.scrollTo({ top: targetY, behavior: 'smooth' });

          if (history.pushState) {
            history.pushState(null, null, href);
          }
          currentActiveSectionId = targetId;
          tocLinks.forEach((l) => l.classList.toggle('active', l === link));
        }
      });
    });

    // Throttled scroll listener con requestAnimationFrame a 60fps
    window.addEventListener('scroll', () => {
      if (!isScrollTicking) {
        window.requestAnimationFrame(() => {
          updateScrollMetrics(progressBar, sections, tocLinks);
          isScrollTicking = false;
        });
        isScrollTicking = true;
      }
    }, { passive: true });
  }

  function updateScrollMetrics(progressBar, sections, tocLinks) {
    if (progressBar) {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min(100, (window.scrollY / docHeight) * 100) : 0;
      progressBar.style.width = `${pct}%`;
    }

    if (isPresentationMode || sections.length === 0) return;
    const scrollPos = window.scrollY + 140;
    let currentSection = sections[0];

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      const absoluteTop = sec.getBoundingClientRect().top + window.scrollY;
      if (absoluteTop <= scrollPos) {
        currentSection = sec;
      } else {
        break;
      }
    }

    if (currentSection && currentSection.id !== currentActiveSectionId) {
      currentActiveSectionId = currentSection.id;
      let activeLink = null;
      tocLinks.forEach((link) => {
        const isMatch = link.getAttribute('href') === `#${currentSection.id}`;
        link.classList.toggle('active', isMatch);
        if (isMatch) activeLink = link;
      });

      // Auto-desplazar de forma segura ÚNICAMENTE el contenedor interno del sidebar,
      // y SÓLO si la barra lateral está visible y abierta en pantalla.
      // IMPORTANTE: Nunca usar scrollIntoView o scrollIntoViewIfNeeded aquí porque en navegadores
      // basados en Chromium (Chrome, Edge), llamar ese método en un elemento que está oculto u
      // off-screen (sidebar-collapsed) fuerza al motor a intentar desplazar la ventana principal
      // para traer el enlace oculto a la vista, bloqueando y trabando el scroll del usuario.
      // En Zen (basado en Firefox Gecko), scrollIntoViewIfNeeded no existe nativamente, por eso no fallaba.
      const isCollapsed = document.body.classList.contains('sidebar-collapsed');
      const isMobile = window.innerWidth <= 1120;
      const isMobileOpen = document.body.classList.contains('sidebar-mobile-open');
      const isSidebarVisible = !isCollapsed && (!isMobile || isMobileOpen);

      if (isSidebarVisible && activeLink) {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && sidebar.contains(activeLink)) {
          const sidebarRect = sidebar.getBoundingClientRect();
          const linkRect = activeLink.getBoundingClientRect();

          // Solo desplazar el contenedor lateral si el enlace activo queda fuera del área visible del sidebar
          if (linkRect.top < sidebarRect.top + 24 || linkRect.bottom > sidebarRect.bottom - 24) {
            const targetTop = activeLink.offsetTop - (sidebar.clientHeight / 2) + (activeLink.clientHeight / 2);
            sidebar.scrollTo({
              top: Math.max(0, targetTop),
              behavior: 'smooth'
            });
          }
        }
      }
    }
  }

  /* --------------------------------------------------------------------------
     6. LIGHTBOX DE IMÁGENES PARA ZOOM EN CLASE
     -------------------------------------------------------------------------- */
  function initLightbox() {
    let overlay = document.getElementById('lightbox-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'lightbox-overlay';
      overlay.id = 'lightbox-overlay';
      overlay.innerHTML = `
        <div class="lightbox-content">
          <img id="lightbox-img" src="" alt="Vista ampliada" />
          <div id="lightbox-caption" class="lightbox-caption"></div>
        </div>
      `;
      overlay.addEventListener('click', () => overlay.classList.remove('open'));
      document.body.appendChild(overlay);
    }

    document.querySelectorAll('.figure-img-wrap, .book-cover-wrap').forEach((wrap) => {
      wrap.addEventListener('click', () => {
        const img = wrap.querySelector('img');
        if (!img) return;
        const card = wrap.closest('.figure-card, .book-card');
        const cap = card
          ? card.querySelector('.figure-caption, .book-title')?.innerText || img.alt
          : img.alt;
        document.getElementById('lightbox-img').src = img.src;
        document.getElementById('lightbox-caption').textContent = cap;
        overlay.classList.add('open');
      });
    });
  }

  /* --------------------------------------------------------------------------
     7. RENDERIZADO DE ECUACIONES MATEMÁTICAS CON KATEX
     -------------------------------------------------------------------------- */
  function initMathRendering() {
    const tryRender = () => {
      if (typeof window.renderMathInElement === 'function') {
        window.renderMathInElement(document.body, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '\\[', right: '\\]', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false }
          ],
          throwOnError: false
        });
      } else {
        setTimeout(tryRender, 150);
      }
    };
    tryRender();
  }

  /* --------------------------------------------------------------------------
     7.1. ENVOLTORIO RESPONSIVO AUTOMÁTICO PARA TABLAS
     -------------------------------------------------------------------------- */
  function initTableResponsiveness() {
    document.querySelectorAll('table:not(.var-table)').forEach((tbl) => {
      if (!tbl.parentElement.classList.contains('table-responsive')) {
        const wrap = document.createElement('div');
        wrap.className = 'table-responsive';
        tbl.parentNode.insertBefore(wrap, tbl);
        wrap.appendChild(tbl);
      }
    });
  }

  /* --------------------------------------------------------------------------
     7.2. ANIMACIÓN DE APARICIÓN SUAVE (SCROLL-REVEAL)
     -------------------------------------------------------------------------- */
  function initScrollReveal() {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          obs.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -40px 0px', threshold: 0.08 });

    document.querySelectorAll('.module-card, .book-card, .tech-card, .calc-step-card, .example-macro-card').forEach((el) => {
      el.classList.add('reveal-on-scroll');
      observer.observe(el);
    });
  }

  /* --------------------------------------------------------------------------
     8. BUSCADOR / FILTRO EN EL PORTAL PRINCIPAL (index.html)
     -------------------------------------------------------------------------- */
  function initModuleFilter() {
    const input = document.getElementById('module-search');
    if (!input) return;
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase().trim();
      document.querySelectorAll('.module-card').forEach((card) => {
        const text = card.innerText.toLowerCase();
        card.style.display = text.includes(q) ? 'flex' : 'none';
      });
    });
  }

  /* --------------------------------------------------------------------------
     9. ACORDEONES FLUIDOS: PASOS DE EJEMPLOS Y SOLUCIONES (SMOOTH TRANSITIONS)
     -------------------------------------------------------------------------- */
  window.toggleExampleStep = function (arg1, arg2) {
    if (typeof arg1 === 'string' && (typeof arg2 === 'number' || typeof arg2 === 'string')) {
      const content = document.getElementById(`${arg1}-step-${arg2}`);
      const arrow = document.getElementById(`${arg1}-arrow-${arg2}`);
      if (content) {
        const isCollapsed = content.classList.contains('step-collapsed') || content.style.display === 'none';
        if (isCollapsed) {
          content.classList.remove('step-collapsed');
          content.style.display = 'block';
          content.style.opacity = '1';
          content.style.maxHeight = (content.scrollHeight + 40) + 'px';
          if (arrow) {
            arrow.textContent = '▼';
            arrow.style.transform = 'rotate(0deg)';
          }
        } else {
          content.classList.add('step-collapsed');
          content.style.maxHeight = '0px';
          content.style.opacity = '0';
          setTimeout(() => {
            if (content.classList.contains('step-collapsed')) {
              content.style.display = 'none';
            }
          }, 300);
          if (arrow) {
            arrow.textContent = '▶';
            arrow.style.transform = 'rotate(-90deg)';
          }
        }
      }
    } else if (arg1 && arg1.nodeType) {
      arg1.classList.toggle('step-collapsed');
    }
  };

  window.toggleAllExampleSteps = function (containerId, reveal) {
    for (let s = 1; s <= 12; s++) {
      const content = document.getElementById(`${containerId}-step-${s}`);
      const arrow = document.getElementById(`${containerId}-arrow-${s}`);
      if (content) {
        if (reveal) {
          content.classList.remove('step-collapsed');
          content.style.display = 'block';
          content.style.opacity = '1';
          content.style.maxHeight = (content.scrollHeight + 40) + 'px';
          if (arrow) arrow.textContent = '▼';
        } else {
          content.classList.add('step-collapsed');
          content.style.maxHeight = '0px';
          content.style.opacity = '0';
          setTimeout(() => {
            if (content.classList.contains('step-collapsed')) {
              content.style.display = 'none';
            }
          }, 300);
          if (arrow) arrow.textContent = '▶';
        }
      }
    }

    const container = document.getElementById(containerId);
    if (container) {
      container.querySelectorAll('.calc-step-card, .example-step').forEach((card) => {
        const sc = card.querySelector('.step-content, .calc-step-body');
        if (reveal) {
          card.classList.remove('step-collapsed');
          if (sc) {
            sc.style.display = 'block';
            sc.style.opacity = '1';
            sc.style.maxHeight = (sc.scrollHeight + 40) + 'px';
          }
        } else {
          card.classList.add('step-collapsed');
          if (sc) {
            sc.style.maxHeight = '0px';
            sc.style.opacity = '0';
            setTimeout(() => {
              if (card.classList.contains('step-collapsed')) {
                sc.style.display = 'none';
              }
            }, 300);
          }
        }
      });
    }
  };

  /* --------------------------------------------------------------------------
     10. CAJA MAESTRA DE SOLUCIÓN DE EJERCICIOS (MOSTRAR / OCULTAR SOLUCIÓN)
     -------------------------------------------------------------------------- */
  window.toggleSolutionBox = function (btn) {
    if (!btn) return;
    const box = btn.closest('.example-solution-box') || btn.parentElement;
    if (!box) return;
    const body = box.querySelector('.solution-body');
    if (!body) return;
    const isHidden = body.style.display === 'none' || window.getComputedStyle(body).display === 'none';

    if (isHidden) {
      body.style.display = 'block';
      body.style.opacity = '1';
      body.style.maxHeight = 'none';
      btn.classList.add('expanded');
      const textSpan = btn.querySelector('.btn-text');
      if (textSpan) textSpan.textContent = 'Ocultar Solución Completa';
      const arrow = btn.querySelector('.arrow-icon');
      if (arrow) arrow.textContent = '▲';
    } else {
      body.style.display = 'none';
      btn.classList.remove('expanded');
      const textSpan = btn.querySelector('.btn-text');
      if (textSpan) textSpan.textContent = 'Mostrar Solución Detallada (Paso a Paso)';
      const arrow = btn.querySelector('.arrow-icon');
      if (arrow) arrow.textContent = '▼';
    }
  };

  /* --------------------------------------------------------------------------
     11. VENTANA EMERGENTE DE NOMENCLATURA Y VARIABLES
     -------------------------------------------------------------------------- */
  window.toggleVariablesModal = function () {
    const modal = document.getElementById('modal-variables');
    if (!modal) return;

    const isOpen = modal.classList.contains('open');
    if (!isOpen) {
      modal.style.display = 'flex';
      void modal.offsetWidth;
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';

      if (typeof window.renderMathInElement === 'function') {
        window.renderMathInElement(modal, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '\\[', right: '\\]', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false }
          ],
          throwOnError: false
        });
      }

      const input = document.getElementById('vars-search-input');
      if (input) {
        input.value = '';
        if (typeof window.filterVariablesModal === 'function') {
          window.filterVariablesModal();
        }
        setTimeout(() => input.focus(), 80);
      }
    } else {
      modal.classList.remove('open');
      document.body.style.overflow = '';
      setTimeout(() => {
        if (!modal.classList.contains('open')) {
          modal.style.display = 'none';
        }
      }, 200);
    }
  };

  window.filterVariablesModal = function () {
    const input = document.getElementById('vars-search-input');
    const query = input ? input.value.toLowerCase().trim() : '';
    const rows = document.querySelectorAll('.var-item-row');
    let visibleCount = 0;

    rows.forEach((row) => {
      const searchData = (row.getAttribute('data-search') || row.textContent).toLowerCase();
      const match = !query || searchData.includes(query);
      row.style.display = match ? '' : 'none';
      if (match) visibleCount++;
    });

    document.querySelectorAll('.var-category-block').forEach((cat) => {
      const visibleChildren = cat.querySelectorAll('.var-item-row:not([style*="display: none"])');
      cat.style.display = visibleChildren.length > 0 ? '' : 'none';
    });

    const countEl = document.getElementById('vars-search-count');
    if (countEl) {
      countEl.textContent = query ? `${visibleCount} coincidencias` : '';
    }
  };

  window.filterVariablesCategory = function (category, btn) {
    document.querySelectorAll('.var-filter-btn').forEach((b) => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const searchInput = document.getElementById('vars-search-input');
    if (searchInput) searchInput.value = '';

    const categories = document.querySelectorAll('.var-category-block');
    let visibleCount = 0;

    categories.forEach((cat) => {
      const catId = cat.getAttribute('data-category');
      if (category === 'all' || catId === category) {
        cat.style.display = '';
        const rows = cat.querySelectorAll('.var-item-row');
        rows.forEach((r) => {
          r.style.display = '';
          visibleCount++;
        });
      } else {
        cat.style.display = 'none';
      }
    });

    const countEl = document.getElementById('vars-search-count');
    if (countEl) {
      countEl.textContent = category !== 'all' ? `${visibleCount} variables` : '';
    }
  };

  /* --------------------------------------------------------------------------
     12. CONTROL GLOBAL DE MACRO-CARDS DE EJERCICIOS Y BARRA QUICK JUMP
     -------------------------------------------------------------------------- */
  window.toggleExampleMacro = function (exampleId, forceState) {
    const body = document.getElementById(exampleId);
    const btn = document.getElementById(`macro-btn-${exampleId}`);
    const card = document.getElementById(`macro-${exampleId}`);
    if (!body) return;

    const isCurrentlyOpen = body.style.display !== 'none' && window.getComputedStyle(body).display !== 'none';
    const shouldOpen = forceState !== undefined ? forceState : !isCurrentlyOpen;

    if (shouldOpen) {
      body.style.display = 'block';
      body.style.opacity = '1';
      body.style.maxHeight = 'none';
      if (btn) btn.innerHTML = '<span>Ocultar Ejercicio</span> <span class="macro-arrow">▲</span>';
      if (card) card.style.borderColor = 'var(--primary)';
    } else {
      body.style.maxHeight = '0px';
      body.style.opacity = '0';
      setTimeout(() => {
        body.style.display = 'none';
      }, 320);
      if (btn) btn.innerHTML = '<span>Ver Ejercicio Completo</span> <span class="macro-arrow">▼</span>';
      if (card) card.style.borderColor = 'var(--border-color)';
    }
  };

  window.toggleAllExamples = function (reveal) {
    document.querySelectorAll('.example-macro-body').forEach((body) => {
      if (body.id) {
        window.toggleExampleMacro(body.id, reveal);
      }
    });
  };

  window.openAndJumpToExample = function (exampleId) {
    window.toggleExampleMacro(exampleId, true);
    const card = document.getElementById(`macro-${exampleId}`) || document.getElementById(exampleId);
    if (card) {
      const topbar = document.querySelector('.topbar');
      const topbarHeight = topbar ? topbar.offsetHeight : 64;
      const targetY = card.getBoundingClientRect().top + window.scrollY - topbarHeight - 16;
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  };

  /* --------------------------------------------------------------------------
     13. MODAL DE PANTALLA COMPLETA: DIAGRAMA DE RUTA DE TRANSFERENCIA DE CARGAS
     -------------------------------------------------------------------------- */
  window.openLoadPathModal = function () {
    const modal = document.getElementById('modal-diagrama-transferencia');
    if (!modal) return;
    modal.style.display = 'flex';
    void modal.offsetWidth;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    if (typeof window.renderMathInElement === 'function') {
      window.renderMathInElement(modal, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false }
        ],
        throwOnError: false
      });
    }
  };

  window.closeLoadPathModal = function () {
    const modal = document.getElementById('modal-diagrama-transferencia');
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => {
      if (!modal.classList.contains('open')) {
        modal.style.display = 'none';
      }
    }, 220);
  };

  window.handleDiagramModalClick = function (e) {
    if (e.target.classList.contains('diagram-modal-overlay') || e.target.classList.contains('diagram-modal-backdrop')) {
      const dm = document.getElementById('modal-diagrama-transferencia');
      if (dm && dm.classList.contains('open')) window.closeLoadPathModal();
      const df = document.getElementById('modal-diagrama-flexion');
      if (df && df.classList.contains('open')) window.closeFlexureModal();
      const ds = document.getElementById('modal-diagrama-cortante');
      if (ds && ds.classList.contains('open')) window.closeShearModal();
    }
  };

  /* --------------------------------------------------------------------------
     MODAL DE PIZARRA DOCENTE: ESQUEMA SECCIONAL A FLEXIÓN (MÓDULO 03)
     -------------------------------------------------------------------------- */
  window.openFlexureModal = function () {
    const modal = document.getElementById('modal-diagrama-flexion');
    if (!modal) return;
    modal.style.display = 'flex';
    void modal.offsetWidth;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    if (typeof window.renderMathInElement === 'function') {
      window.renderMathInElement(modal, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false }
        ],
        throwOnError: false
      });
    }
  };

  window.closeFlexureModal = function () {
    const modal = document.getElementById('modal-diagrama-flexion');
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => {
      if (!modal.classList.contains('open')) {
        modal.style.display = 'none';
      }
    }, 220);
  };

  /* --------------------------------------------------------------------------
     MODAL DE PIZARRA DOCENTE: CERCHA DE RITTER-MÖRSCH Y CORTANTE (MÓDULO 04)
     -------------------------------------------------------------------------- */
  window.openShearModal = function () {
    const modal = document.getElementById('modal-diagrama-cortante');
    if (!modal) return;
    modal.style.display = 'flex';
    void modal.offsetWidth;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    if (typeof window.renderMathInElement === 'function') {
      window.renderMathInElement(modal, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false }
        ],
        throwOnError: false
      });
    }
  };

  window.closeShearModal = function () {
    const modal = document.getElementById('modal-diagrama-cortante');
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => {
      if (!modal.classList.contains('open')) {
        modal.style.display = 'none';
      }
    }, 220);
  };


  /* --------------------------------------------------------------------------
     CONTROL DE DENSIDAD DE TABLAS TÉCNICAS (MODO COMPACTO / MODO AMPLIADO)
     -------------------------------------------------------------------------- */
  window.setRebarTableMode = function (mode) {
    const wrapper = document.getElementById('rebar-table-wrapper');
    const btnCompact = document.getElementById('btn-density-compact');
    const btnExpanded = document.getElementById('btn-density-expanded');
    if (!wrapper) return;

    if (mode === 'expanded') {
      wrapper.classList.remove('mode-compact');
      wrapper.classList.add('mode-expanded');
      if (btnExpanded) btnExpanded.classList.add('active');
      if (btnCompact) btnCompact.classList.remove('active');
    } else {
      wrapper.classList.remove('mode-expanded');
      wrapper.classList.add('mode-compact');
      if (btnCompact) btnCompact.classList.add('active');
      if (btnExpanded) btnExpanded.classList.remove('active');
    }
  };

  window.toggleRebarTableDensity = function () {
    const wrapper = document.getElementById('rebar-table-wrapper');
    if (!wrapper) return;
    if (wrapper.classList.contains('mode-expanded')) {
      window.setRebarTableMode('compact');
    } else {
      window.setRebarTableMode('expanded');
    }
  };

})();

/* ==========================================================================
   CORE JS — DIPLOMADO EN DISEÑO ESTRUCTURAL DE CONCRETO REFORZADO (NSR-10)
   Control de Modo Dual (Estudio / Clase Magistral), Puntero Láser, Tema,
   Lightbox de Imágenes, Scroll-Spy y Renderizado KaTeX
   ========================================================================== */

(function () {
  'use strict';

  let isPresentationMode = false;
  let isLaserMode = false;
  let currentSlideIndex = 0;
  let slides = [];

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initSlidesList();
    initScrollSpy();
    initLightbox();
    initLaserPointer();
    initKeyboardShortcuts();
    initMathRendering();
    initModuleFilter();
  });

  /* --------------------------------------------------------------------------
     1. TEMA CLARO / OSCURO
     -------------------------------------------------------------------------- */
  function initTheme() {
    const saved = localStorage.getItem('diplomado_theme') || 'light';
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    updateThemeButton();
  }

  window.toggleTheme = function () {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('diplomado_theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('diplomado_theme', 'dark');
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
      ? '<span>☀️</span> Modo Claro'
      : '<span>🌙</span> Modo Oscuro';
  }

  /* --------------------------------------------------------------------------
     2. MODO DUAL: ESTUDIO AUTÓNOMO VS. CLASE MAGISTRAL (16:9)
     -------------------------------------------------------------------------- */
  function initSlidesList() {
    slides = Array.from(
      document.querySelectorAll('.hero-banner, .chapter-divider, .lesson-section')
    );
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
      // Detectar cuál sección estaba visible en pantalla antes de activar
      const scrollY = window.scrollY + 180;
      let bestIdx = 0;
      slides.forEach((el, idx) => {
        if (el.offsetTop <= scrollY) bestIdx = idx;
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

    // Actualizar TOC activo si tiene ID
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
     4. ATAJOS DE TECLADO (P = Presentación, L = Láser, Flechas = Navegar)
     -------------------------------------------------------------------------- */
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === 'p' || e.key === 'P') {
        if (document.getElementById('btn-presentation')) {
          e.preventDefault();
          window.togglePresentationMode();
        }
      } else if (e.key === 'l' || e.key === 'L') {
        if (document.getElementById('btn-laser')) {
          e.preventDefault();
          window.toggleLaser();
        }
      } else if (isPresentationMode && (e.key === 'ArrowRight' || e.key === 'PageDown')) {
        e.preventDefault();
        window.nextSlide();
      } else if (isPresentationMode && (e.key === 'ArrowLeft' || e.key === 'PageUp')) {
        e.preventDefault();
        window.prevSlide();
      } else if (e.key === 'Escape') {
        const lb = document.getElementById('lightbox-overlay');
        if (lb && lb.classList.contains('open')) {
          lb.classList.remove('open');
        } else if (isPresentationMode) {
          window.togglePresentationMode();
        }
      }
    });
  }

  /* --------------------------------------------------------------------------
     5. SCROLL-SPY Y BARRA DE PROGRESO DE LECTURA
     -------------------------------------------------------------------------- */
  function initScrollSpy() {
    const progressBar = document.getElementById('reading-progress');
    const tocLinks = Array.from(document.querySelectorAll('.toc-link'));
    const sections = tocLinks
      .map((link) => {
        const href = link.getAttribute('href');
        return href && href.startsWith('#') ? document.querySelector(href) : null;
      })
      .filter(Boolean);

    // Al hacer clic en un link del TOC estando en Modo Presentación, saltar a esa lámina
    tocLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        if (isPresentationMode) {
          e.preventDefault();
          const targetId = link.getAttribute('href').replace('#', '');
          const idx = slides.findIndex((s) => s.id === targetId);
          if (idx !== -1) showSlide(idx);
        }
      });
    });

    window.addEventListener('scroll', () => {
      if (progressBar) {
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const pct = docHeight > 0 ? Math.min(100, (window.scrollY / docHeight) * 100) : 0;
        progressBar.style.width = `${pct}%`;
      }

      if (isPresentationMode || sections.length === 0) return;
      const scrollPos = window.scrollY + 140;
      let currentSection = sections[0];
      for (const sec of sections) {
        if (sec.offsetTop <= scrollPos) {
          currentSection = sec;
        }
      }
      if (currentSection) {
        tocLinks.forEach((link) => {
          link.classList.toggle(
            'active',
            link.getAttribute('href') === `#${currentSection.id}`
          );
        });
      }
    });
  }

  /* --------------------------------------------------------------------------
     6. LIGHTBOX DE IMÁGENES PARA ZOOM EN CLASE
     -------------------------------------------------------------------------- */
  function initLightbox() {
    const overlay = document.createElement('div');
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
     9. MODO PIZARRA DOCENTE PARA EJEMPLOS NUMÉRICOS (UNIVERSAL EN TODOS LOS MÓDULOS)
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
          if (arrow) arrow.textContent = '▼';
        } else {
          content.classList.add('step-collapsed');
          content.style.display = 'none';
          if (arrow) arrow.textContent = '▶';
        }
      }
    } else if (arg1 && arg1.nodeType) {
      arg1.classList.toggle('step-collapsed');
    }
  };

  window.toggleAllExampleSteps = function (containerId, reveal) {
    // 1. Manejo por prefijo de IDs (ej. ex81, ej-7-1)
    for (let s = 1; s <= 10; s++) {
      const content = document.getElementById(`${containerId}-step-${s}`);
      const arrow = document.getElementById(`${containerId}-arrow-${s}`);
      if (content) {
        if (reveal) {
          content.classList.remove('step-collapsed');
          content.style.display = 'block';
          if (arrow) arrow.textContent = '▼';
        } else {
          content.classList.add('step-collapsed');
          content.style.display = 'none';
          if (arrow) arrow.textContent = '▶';
        }
      }
    }
    // 2. Manejo por contenedor DOM
    const container = document.getElementById(containerId);
    if (container) {
      container.querySelectorAll('.calc-step-card, .example-step').forEach((card) => {
        if (reveal) {
          card.classList.remove('step-collapsed');
          const sc = card.querySelector('.step-content');
          if (sc) sc.style.display = 'block';
        } else {
          card.classList.add('step-collapsed');
          const sc = card.querySelector('.step-content');
          if (sc) sc.style.display = 'none';
        }
      });
    }
  };
})();

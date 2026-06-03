/* ===================================================================
   saleemyousaf.co.uk shared nav
   -------------------------------------------------------------------
   ONE FILE controls nav across the whole site.
   To change nav: edit the NAV_CONFIG below.
   To use on a page: include <div id="site-nav"></div> in body
   and <script src="/nav.js" defer></script> before </body>.
   =================================================================== */

(function () {
  'use strict';

  /* ============================================
     NAV CONFIG — edit here to change site-wide
     ============================================ */
  const NAV_CONFIG = {
    logoHref: 'https://saleemyousaf.co.uk/',
    logoLeft: 'Saleem',
    logoRight: 'Yousaf',
    items: [
      { label: 'About',       href: 'https://saleemyousaf.co.uk/about/' },
      { label: 'Experience',  href: 'https://saleemyousaf.co.uk/experience/' },
      { label: 'Projects',    href: 'https://saleemyousaf.co.uk/projects/' },
      { label: 'Articles',    href: 'https://saleemyousaf.co.uk/articles/', dropdown: [
        { label: 'All Articles',                href: 'https://saleemyousaf.co.uk/articles/' },
        { label: 'Assume Breach',               href: 'https://saleemyousaf.co.uk/assume-breach/' },
        { label: '\u00a0\u00a0\u2937 BAS Framework',     href: 'https://saleemyousaf.co.uk/assume-breach/bas-framework/' },
        { label: '\u00a0\u00a0\u2937 BAS Infographic',   href: 'https://saleemyousaf.co.uk/assume-breach/bas-infographic/' },
        { label: 'AI Security & Governance',    href: 'https://saleemyousaf.co.uk/ai-security-governance/' }
      ]}
    ],
    external: [
      { label: 'BreachForge',    href: 'https://breachforge.co.uk',          cls: 'bf' },
      { label: 'Cyber Spartans', href: 'https://cyberspartans.co.uk',        cls: 'cs' }
    ],
    cta: { label: 'Connect', href: 'https://saleemyousaf.co.uk/connect/' }
  };

  /* ============================================
     Render
     ============================================ */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function activeClass(href) {
    const here = window.location.href.replace(/\/$/, '').toLowerCase();
    const target = href.replace(/\/$/, '').toLowerCase();
    return here === target ? ' class="active"' : '';
  }

  function renderItem(item) {
    if (item.dropdown) {
      const subItems = item.dropdown.map(s =>
        `<a href="${escapeHtml(s.href)}"${activeClass(s.href)}>${escapeHtml(s.label)}</a>`
      ).join('');
      return `
        <li class="nav-dropdown">
          <button class="nav-dropdown-toggle" aria-haspopup="true" aria-expanded="false">
            ${escapeHtml(item.label)}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          <div class="nav-dropdown-menu"><div class="nav-dropdown-menu-inner">${subItems}</div></div>
        </li>`;
    }
    return `<li><a href="${escapeHtml(item.href)}"${activeClass(item.href)}>${escapeHtml(item.label)}</a></li>`;
  }

  function renderExternal(ext) {
    return `<li><a href="${escapeHtml(ext.href)}" target="_blank" rel="noopener" class="nav-ext ${escapeHtml(ext.cls)}">${escapeHtml(ext.label)}<span class="nav-ext-arrow" aria-hidden="true">↗</span></a></li>`;
  }

  function render() {
    const internalItems = NAV_CONFIG.items.map(renderItem).join('');
    const externalItems = NAV_CONFIG.external.map(renderExternal).join('');
    const cta = `<li><a href="${escapeHtml(NAV_CONFIG.cta.href)}" class="nav-cta">${escapeHtml(NAV_CONFIG.cta.label)}</a></li>`;

    return `
      <nav class="site-nav-injected" aria-label="Primary">
        <div class="nav-inner">
          <a href="${escapeHtml(NAV_CONFIG.logoHref)}" class="nav-logo">${escapeHtml(NAV_CONFIG.logoLeft)} <span>${escapeHtml(NAV_CONFIG.logoRight)}</span></a>
          <ul class="nav-links">
            ${internalItems}
            <li><span class="nav-divider" aria-hidden="true"></span></li>
            ${externalItems}
            ${cta}
          </ul>
        </div>
      </nav>
    `;
  }

  /* ============================================
     Inject styles (scoped to the nav)
     ============================================ */
  const NAV_CSS = `
    .site-nav-injected { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: rgba(9,12,16,0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,0.07); font-family: 'Inter', -apple-system, sans-serif; }
    .site-nav-injected .nav-inner { max-width: 1100px; margin: 0 auto; padding: 0 32px; height: 60px; display: flex; align-items: center; justify-content: space-between; }
    .site-nav-injected .nav-logo { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; color: #e6eaf0; text-decoration: none; letter-spacing: 0.02em; }
    .site-nav-injected .nav-logo span { color: #2dd4bf; }
    .site-nav-injected .nav-links { display: flex; gap: 28px; list-style: none; align-items: center; margin: 0; padding: 0; }
    .site-nav-injected .nav-links a { font-size: 13px; color: #7a8694; text-decoration: none; letter-spacing: 0.03em; transition: color 0.2s; }
    .site-nav-injected .nav-links a:hover { color: #e6eaf0; }
    .site-nav-injected .nav-links a.active { color: #2dd4bf; }

    .site-nav-injected .nav-divider { display: inline-block; width: 1px; height: 16px; background: rgba(255,255,255,0.07); margin: 0 4px; }

    .site-nav-injected .nav-dropdown { position: relative; }
    .site-nav-injected .nav-dropdown-toggle { font-size: 13px; color: #7a8694; background: none; border: none; cursor: pointer; letter-spacing: 0.03em; display: flex; align-items: center; gap: 5px; font-family: inherit; padding: 0; transition: color 0.2s; }
    .site-nav-injected .nav-dropdown-toggle:hover, .site-nav-injected .nav-dropdown:hover .nav-dropdown-toggle { color: #e6eaf0; }
    .site-nav-injected .nav-dropdown-toggle svg { transition: transform 0.2s; }
    .site-nav-injected .nav-dropdown:hover .nav-dropdown-toggle svg { transform: rotate(180deg); }
    .site-nav-injected .nav-dropdown-menu { position: absolute; top: 100%; left: 50%; transform: translateX(-50%); padding-top: 12px; opacity: 0; pointer-events: none; transition: opacity 0.15s; z-index: 200; }
    .site-nav-injected .nav-dropdown:hover .nav-dropdown-menu { opacity: 1; pointer-events: all; }
    .site-nav-injected .nav-dropdown-menu-inner { background: #0f1318; border: 1px solid rgba(255,255,255,0.07); border-radius: 8px; padding: 8px; min-width: 220px; }
    .site-nav-injected .nav-dropdown-menu a { display: block; padding: 9px 14px; font-size: 13px; color: #7a8694; text-decoration: none; border-radius: 5px; transition: background 0.15s, color 0.15s; white-space: nowrap; }
    .site-nav-injected .nav-dropdown-menu a:hover { background: #161b22; color: #e6eaf0; }

    .site-nav-injected .nav-ext { display: inline-flex !important; align-items: center; gap: 4px; font-size: 12px !important; padding: 4px 10px !important; border-radius: 3px; transition: background 0.2s, color 0.2s !important; }
    .site-nav-injected .nav-ext.bf { color: #e63946 !important; }
    .site-nav-injected .nav-ext.bf:hover { background: rgba(230,57,70,0.12); }
    .site-nav-injected .nav-ext.cs { color: #00d9ff !important; }
    .site-nav-injected .nav-ext.cs:hover { background: rgba(0,217,255,0.12); }
    .site-nav-injected .nav-ext-arrow { font-size: 10px; opacity: 0.7; }

    .site-nav-injected .nav-cta { font-size: 13px !important; font-weight: 500; color: #2dd4bf !important; border: 1px solid rgba(45,212,191,0.3); padding: 6px 16px !important; border-radius: 4px; }
    .site-nav-injected .nav-cta:hover { background: rgba(45,212,191,0.12); border-color: #2dd4bf; }

    @media (max-width: 720px) {
      .site-nav-injected .nav-links { display: none; }
    }
  `;

  /* ============================================
     Boot
     ============================================ */
  function boot() {
    // Inject styles once
    if (!document.getElementById('site-nav-styles')) {
      const style = document.createElement('style');
      style.id = 'site-nav-styles';
      style.textContent = NAV_CSS;
      document.head.appendChild(style);
    }

    // Inject the nav into the placeholder
    const target = document.getElementById('site-nav');
    if (target) {
      target.outerHTML = render();
    } else {
      // Fallback: prepend to body so pages that forgot the placeholder still get a nav
      const wrapper = document.createElement('div');
      wrapper.innerHTML = render();
      document.body.insertBefore(wrapper.firstElementChild, document.body.firstChild);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

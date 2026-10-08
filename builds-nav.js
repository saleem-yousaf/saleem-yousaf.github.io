/*
  builds-nav.js  -  shared pivot menu for the interactive builds.

  WHY this exists: each fun site is its own repo with its own header, and those
  headers only link within themselves, so a visitor had no way to hop between
  builds without the back button. This injects one small, self-contained menu
  (fixed top-right) that lists every build, the Labs hub, and the main site.

  SINGLE SOURCE OF TRUTH: to add a new build, add one line to BUILDS below and
  redeploy this one file. Every site that includes it updates automatically.

  WHY the self-heal (MutationObserver on document): the Westeros build is a
  self-extracting bundler that replaces the ENTIRE document via replaceWith after
  it unpacks, which deleted the menu we had injected. The other sites do not do
  this. Rather than special-case Westeros, inject() is idempotent and an observer
  on the document node (which is never replaced, unlike document.documentElement)
  re-injects the menu whenever it goes missing. Robust for any host that rebuilds
  its DOM after load.

  HOW TO INCLUDE on a build's page (before </body>):
    <script src="/builds-nav.js" defer></script>
  Same-origin (served from the apex), so the root-absolute path resolves from any
  /<slug>/ page. All CSS is scoped under #bn-root; nothing leaks.
*/
(function () {
  if (window.__buildsNav) return;            // guard against double-include
  window.__buildsNav = true;

  var BUILDS = [
    { slug: 'the-odyssey-the-cursed-voyage', name: 'The Odyssey' },
    { slug: 'inception-dream-control',       name: 'Inception' },
    { slug: 'the-martian-sol-by-sol',        name: 'The Martian' },
    { slug: 'scene-atlas',                   name: 'Scene Atlas' },
    { slug: 'millers-planet',                name: "Miller's Planet" },
    { slug: 'westeros-underground-map',      name: 'Westeros Map' }
  ];
  var HOME = 'https://saleemyousaf.co.uk';
  var LABS = HOME + '/labs/';

  var here = (location.pathname.split('/').filter(Boolean)[0] || '').toLowerCase();

  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

  var css = ''
   + '#bn-root{position:fixed;top:12px;right:12px;z-index:2147483000;'
   +   'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;}'
   + '#bn-toggle{display:inline-flex;align-items:center;gap:7px;cursor:pointer;'
   +   'font-size:12.5px;font-weight:600;letter-spacing:.02em;color:#dfe9ec;'
   +   'background:rgba(9,13,18,.82);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);'
   +   'border:1px solid rgba(45,212,191,.42);border-radius:999px;padding:8px 14px;line-height:1;'
   +   'box-shadow:0 6px 24px rgba(0,0,0,.35);transition:border-color .15s,color .15s;}'
   + '#bn-toggle:hover{color:#fff;border-color:rgba(94,234,212,.75);}'
   + '#bn-toggle .bn-star{color:#5eead4;font-size:13px;}'
   + '#bn-toggle .bn-caret{transition:transform .18s;opacity:.7;font-size:10px;}'
   + '#bn-root.bn-open #bn-toggle .bn-caret{transform:rotate(180deg);}'
   + '#bn-panel{position:absolute;top:calc(100% + 8px);right:0;min-width:214px;'
   +   'background:rgba(10,14,20,.96);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);'
   +   'border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:7px;'
   +   'box-shadow:0 18px 50px rgba(0,0,0,.5);opacity:0;visibility:hidden;transform:translateY(-6px);'
   +   'transition:opacity .16s,transform .16s,visibility .16s;}'
   + '#bn-root.bn-open #bn-panel{opacity:1;visibility:visible;transform:translateY(0);}'
   + '.bn-head{font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:#6b7a84;'
   +   'padding:8px 12px 5px;font-family:ui-monospace,"DM Mono",monospace;}'
   + '.bn-item{display:flex;align-items:center;gap:9px;text-decoration:none;'
   +   'font-size:13px;color:#d6dee2;padding:8px 12px;border-radius:8px;white-space:nowrap;}'
   + '.bn-item:hover{background:rgba(255,255,255,.06);color:#fff;}'
   + '.bn-item .bn-dot{width:6px;height:6px;border-radius:50%;background:#2dd4bf;flex:0 0 auto;opacity:.0;}'
   + '.bn-item.bn-current{color:#5eead4;cursor:default;}'
   + '.bn-item.bn-current:hover{background:none;}'
   + '.bn-item.bn-current .bn-dot{opacity:1;}'
   + '.bn-item.bn-hub{color:#fff;font-weight:600;}'
   + '.bn-item.bn-hub .bn-ic,.bn-item.bn-home .bn-ic{color:#5eead4;}'
   + '.bn-sep{height:1px;background:rgba(255,255,255,.08);margin:6px 8px;}'
   + '.bn-ic{font-size:12px;opacity:.85;flex:0 0 auto;}'
   + '@media (max-width:560px){#bn-toggle span.bn-label{display:none;}'
   +   '#bn-toggle{padding:9px 11px;}#bn-panel{min-width:188px;}}'
   + '@media (prefers-reduced-motion:reduce){#bn-panel,#bn-toggle .bn-caret{transition:none;}}';

  var rows = '<a class="bn-item bn-hub" href="' + LABS + '"><span class="bn-ic">\u25C8</span>All builds (Labs)</a>'
           + '<div class="bn-sep"></div>';
  BUILDS.forEach(function (b) {
    if (b.slug === here) {
      rows += '<span class="bn-item bn-current" aria-current="page"><span class="bn-dot"></span>'
            + esc(b.name) + '</span>';
    } else {
      rows += '<a class="bn-item" href="/' + b.slug + '/"><span class="bn-dot"></span>'
            + esc(b.name) + '</a>';
    }
  });
  rows += '<div class="bn-sep"></div>'
        + '<a class="bn-item bn-home" href="' + HOME + '"><span class="bn-ic">\u2197</span>Saleem Yousaf</a>';

  function setOpen(root, o) {
    root.classList.toggle('bn-open', o);
    var btn = root.querySelector('#bn-toggle');
    if (btn) btn.setAttribute('aria-expanded', o ? 'true' : 'false');
  }

  // Document-level listeners attached ONCE. They live on `document`, which is
  // never replaced (only its child <html> is), so they survive a DOM rebuild and
  // need no re-binding when the menu is re-injected.
  var wiredDoc = false;
  function wireDocument() {
    if (wiredDoc) return; wiredDoc = true;
    document.addEventListener('click', function (e) {
      var r = document.getElementById('bn-root');
      if (r && !r.contains(e.target)) setOpen(r, false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') {
        var r = document.getElementById('bn-root'); if (r) setOpen(r, false);
      }
    });
  }

  // Idempotent: builds the style + menu only if they are not already present.
  function inject() {
    if (!document.body) return;                       // nothing to attach to yet
    if (!document.getElementById('bn-style')) {
      var style = document.createElement('style');
      style.id = 'bn-style'; style.textContent = css;
      (document.head || document.documentElement).appendChild(style);
    }
    if (document.getElementById('bn-root')) return;   // menu already there
    var root = document.createElement('div'); root.id = 'bn-root';
    root.innerHTML =
      '<button id="bn-toggle" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Switch between interactive builds">'
      + '<span class="bn-star">\u2726</span><span class="bn-label">Builds</span><span class="bn-caret">\u25BE</span></button>'
      + '<div id="bn-panel" role="menu"><div class="bn-head">// interactive builds</div>' + rows + '</div>';
    document.body.appendChild(root);
    root.querySelector('#bn-toggle').addEventListener('click', function (e) {
      e.stopPropagation(); setOpen(root, !root.classList.contains('bn-open'));
    });
  }

  function start() {
    wireDocument();
    inject();
    // Self-heal: re-inject if a host rebuilds the DOM and removes the menu.
    // Observe the document node (survives document.documentElement.replaceWith).
    try {
      var mo = new MutationObserver(function () { inject(); });
      mo.observe(document, { childList: true, subtree: true });
    } catch (e) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

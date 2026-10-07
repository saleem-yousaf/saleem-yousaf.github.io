/*
  builds-nav.js  -  shared pivot menu for the interactive builds.

  WHY this exists: each fun site is its own repo with its own header, and those
  headers only link within themselves, so a visitor had no way to hop between
  builds without the back button. This injects one small, self-contained menu
  (fixed top-right) that lists every build, the Labs hub, and the main site.

  SINGLE SOURCE OF TRUTH: to add a new build, add one line to BUILDS below and
  redeploy this one file. Every site that includes it updates automatically.

  HOW TO INCLUDE on a build's page (before </body>):
    <script src="/builds-nav.js" defer></script>
  It is same-origin (served from the apex), so the root-absolute path resolves
  from any /<slug>/ page. All CSS is scoped under #bn-root; nothing leaks.
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

  // which build are we on (first path segment), so we can mark it as current
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
    var cur = (b.slug === here);
    if (cur) {
      rows += '<span class="bn-item bn-current" aria-current="page"><span class="bn-dot"></span>'
            + esc(b.name) + '</span>';
    } else {
      rows += '<a class="bn-item" href="/' + b.slug + '/"><span class="bn-dot"></span>'
            + esc(b.name) + '</a>';
    }
  });
  rows += '<div class="bn-sep"></div>'
        + '<a class="bn-item bn-home" href="' + HOME + '"><span class="bn-ic">\u2197</span>Saleem Yousaf</a>';

  function build() {
    var style = document.createElement('style'); style.textContent = css;
    document.head.appendChild(style);

    var root = document.createElement('div'); root.id = 'bn-root';
    root.innerHTML =
      '<button id="bn-toggle" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Switch between interactive builds">'
      + '<span class="bn-star">\u2726</span><span class="bn-label">Builds</span><span class="bn-caret">\u25BE</span></button>'
      + '<div id="bn-panel" role="menu"><div class="bn-head">// interactive builds</div>' + rows + '</div>';
    document.body.appendChild(root);

    var btn = root.querySelector('#bn-toggle');
    function setOpen(o){ root.classList.toggle('bn-open', o); btn.setAttribute('aria-expanded', o ? 'true' : 'false'); }
    btn.addEventListener('click', function (e) { e.stopPropagation(); setOpen(!root.classList.contains('bn-open')); });
    document.addEventListener('click', function (e) { if (!root.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' || e.key === 'Esc') setOpen(false); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();

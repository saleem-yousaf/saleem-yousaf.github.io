/* =====================================================================
   saleemyousaf.co.uk shared navigation + responsive layer  (nav.js)
   Single source of truth for the top menu AND the site-wide mobile
   behaviour. Include once per page:
       <script src="/nav.js" defer></script>
   It injects the exact nav styling, a proper mobile menu (hamburger),
   and a responsive safety net that collapses the gallery and sidebar
   grids on phones, and removes any old inline <nav>. To change the menu
   or the mobile rules later, edit ONLY this file.
   Palette is lifted verbatim from the site (accent #4a9eff, surf
   #0e1117, border #1e2533, dim #6e7d92, text #c8d0dc, heading #e6edf3,
   muted #2a3344), so the desktop look is unchanged.
   The BAS app and the TI dashboard are intentionally NOT in scope here.
   ===================================================================== */
(function () {
  "use strict";

  var NAV_BP = 820;  // below this the menu becomes a hamburger
  var GRID = ".approach-inner,.article-featured,.articles-grid,.certs-grid,.clients-grid,.cloud-grid,.cta-row,.cta-inner,.exp-skills,.expertise-grid,.expertise-layout,.footer-inner,.gov-grid,.grid-2,.grid-3,.hero-card,.hero-content,.hero-grid,.hero-inner,.leadership-grid,.maturity-grid,.mindset-grid,.mitre-grid,.persona-grid,.philosophy-grid,.platforms-grid,.project-featured,.projects-grid,.rag-pipeline,.related-grid,.risk-grid,.sabsa-grid,.scenario-grid,.stats-grid,.story-grid,.takeaways-grid,.topics-grid,.validation-grid,.writing-grid,.criteria-grid";

  var CSS = [
    ".site-nav{position:sticky;top:0;z-index:100;background:rgba(10,12,16,0.92);",
    "-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-bottom:1px solid #1e2533;",
    "padding:0 40px;display:flex;align-items:center;justify-content:space-between;height:56px;",
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif}",
    ".site-nav *{box-sizing:border-box}",
    ".site-nav-logo{font-size:15px;font-weight:600;color:#e6edf3;letter-spacing:.01em;text-decoration:none}",
    ".site-nav-logo:hover{color:#e6edf3;text-decoration:none}",
    ".site-nav-links{display:flex;align-items:center;gap:6px;list-style:none;margin:0;padding:0}",
    ".site-nav-links li{position:relative}",
    ".site-nav-links a{color:#6e7d92;font-size:13px;padding:5px 10px;border-radius:4px;transition:color .15s;text-decoration:none}",
    ".site-nav-links a:hover{color:#c8d0dc;text-decoration:none}",
    ".site-nav-links a.active{color:#e6edf3}",
    ".nav-dropdown{position:relative}",
    ".nav-dropdown-toggle{color:#6e7d92;font-size:13px;padding:5px 10px;cursor:pointer;border-radius:4px;",
    "background:none;border:none;font-family:inherit;line-height:inherit}",
    ".nav-dropdown-toggle:hover,.nav-dropdown:hover .nav-dropdown-toggle,.nav-dropdown.open .nav-dropdown-toggle{color:#4a9eff}",
    ".nav-dropdown-menu{position:absolute;top:100%;left:0;padding-top:12px;opacity:0;pointer-events:none;transition:opacity .15s;z-index:200}",
    ".nav-dropdown:hover .nav-dropdown-menu,.nav-dropdown.open .nav-dropdown-menu{opacity:1;pointer-events:all}",
    ".nav-dropdown-menu-inner{background:#0e1117;border:1px solid #1e2533;border-radius:6px;padding:6px;min-width:220px;",
    "box-shadow:0 8px 24px rgba(0,0,0,0.4);display:flex;flex-direction:column;gap:2px}",
    ".nav-dropdown-menu a{padding:7px 12px;border-radius:4px;font-size:13px;color:#6e7d92;display:block}",
    ".nav-dropdown-menu a:hover{background:#2a3344;color:#c8d0dc;text-decoration:none}",
    /* hamburger button, hidden on desktop */
    ".site-nav-burger{display:none;flex-direction:column;justify-content:center;gap:4px;",
    "width:40px;height:40px;margin:-8px -8px -8px 0;padding:9px;background:none;border:0;cursor:pointer}",
    ".site-nav-burger span{display:block;width:22px;height:2px;background:#c8d0dc;border-radius:2px;transition:transform .2s,opacity .2s}",
    ".site-nav.open .site-nav-burger span:nth-child(1){transform:translateY(6px) rotate(45deg)}",
    ".site-nav.open .site-nav-burger span:nth-child(2){opacity:0}",
    ".site-nav.open .site-nav-burger span:nth-child(3){transform:translateY(-6px) rotate(-45deg)}",
    /* global overflow guards (safe on desktop) */
    "img,video{max-width:100%;height:auto}",
    /* mobile menu */
    "@media(max-width:820px){",
      ".site-nav{padding:0 20px;height:auto;min-height:56px;flex-wrap:wrap}",
      ".site-nav-burger{display:flex}",
      ".site-nav-links{display:none;flex-direction:column;align-items:stretch;width:100%;order:3;gap:2px;padding:6px 0 12px}",
      ".site-nav.open .site-nav-links{display:flex}",
      ".site-nav-links li{width:100%}",
      ".site-nav-links a{padding:11px 8px;font-size:15px;border-radius:6px}",
      ".site-nav-links a:hover{background:#2a3344}",
      ".nav-dropdown-toggle{width:100%;text-align:left;padding:11px 8px;font-size:15px}",
      ".nav-dropdown-menu{position:static;opacity:1;pointer-events:auto;padding-top:0;display:none;transition:none}",
      ".nav-dropdown.open .nav-dropdown-menu{display:block}",
      ".nav-dropdown-menu-inner{background:none;border:0;box-shadow:none;min-width:0;padding:0 0 4px 12px}",
      ".nav-dropdown-menu a{font-size:14px;padding:9px 10px}",
    "}",
    /* phone layout: collapse gallery and sidebar grids, tighten padding, wrap long words */
    "@media(max-width:600px){",
      GRID + "{grid-template-columns:1fr!important}",
      ".wrap{padding-left:18px!important;padding-right:18px!important}",
      "body{overflow-wrap:break-word;word-wrap:break-word}",
      "pre{max-width:100%;overflow-x:auto}",
      "table{display:block;max-width:100%;overflow-x:auto}",
    "}"
  ].join("");

  // Menu definition. Edit here only.
  var HTML =
    '<nav class="site-nav">' +
      '<a href="/" class="site-nav-logo">Saleem Yousaf</a>' +
      '<ul class="site-nav-links">' +
        '<li><a href="/about/">About</a></li>' +
        '<li><a href="/experience/">Experience</a></li>' +
        '<li><a href="/projects/">Projects</a></li>' +
        '<li class="nav-dropdown"><button type="button" class="nav-dropdown-toggle">Articles \u25be</button>' +
          '<div class="nav-dropdown-menu"><div class="nav-dropdown-menu-inner">' +
            '<a href="/articles/">All Articles</a>' +
            '<a href="/assume-breach/">Assume Breach</a>' +
            '<a href="/ai-security-governance/">AI Security &amp; Governance</a>' +
          '</div></div></li>' +
        '<li class="nav-dropdown"><button type="button" class="nav-dropdown-toggle">BreachForge \u25be</button>' +
          '<div class="nav-dropdown-menu"><div class="nav-dropdown-menu-inner">' +
            '<a href="/breachforge/">Overview</a>' +
            '<a href="/breachforge/simulation/desktop/">BAS Platform</a>' +
            '<a href="/breachforge/intel/">Threat Intelligence</a>' +
          '</div></div></li>' +
        '<li><a href="/connect/">Connect</a></li>' +
      '</ul>' +
      '<button type="button" class="site-nav-burger" aria-label="Menu" aria-expanded="false">' +
        '<span></span><span></span><span></span></button>';

  function markActive(nav) {
    var path = location.pathname.replace(/\/+$/, "") + "/";
    Array.prototype.forEach.call(nav.querySelectorAll("a[href^='/']"), function (a) {
      var href = a.getAttribute("href");
      if (href === "/") return;
      if (path.indexOf(href) === 0) a.classList.add("active");
    });
  }

  function wire(nav) {
    var burger = nav.querySelector(".site-nav-burger");
    if (burger) burger.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = nav.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    Array.prototype.forEach.call(nav.querySelectorAll(".nav-dropdown-toggle"), function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var li = btn.parentElement;
        var wasOpen = li.classList.contains("open");
        Array.prototype.forEach.call(nav.querySelectorAll(".nav-dropdown.open"), function (o) { o.classList.remove("open"); });
        if (!wasOpen) li.classList.add("open");
      });
    });
    document.addEventListener("click", function () {
      Array.prototype.forEach.call(nav.querySelectorAll(".nav-dropdown.open"), function (o) { o.classList.remove("open"); });
      if (nav.classList.contains("open")) {
        nav.classList.remove("open");
        if (burger) burger.setAttribute("aria-expanded", "false");
      }
    });
  }

  function build() {
    if (!document.getElementById("sy-nav-style")) {
      var st = document.createElement("style");
      st.id = "sy-nav-style";
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    // remove any existing inline nav so there is only one menu
    Array.prototype.forEach.call(document.querySelectorAll("nav"), function (n) {
      if (!n.hasAttribute("data-sy-nav")) n.remove();
    });
    var holder = document.createElement("div");
    holder.innerHTML = HTML;
    var nav = holder.firstElementChild;
    nav.setAttribute("data-sy-nav", "1");
    document.body.insertBefore(nav, document.body.firstChild);
    wire(nav);
    markActive(nav);
  }

  if (document.readyState !== "loading") build();
  else document.addEventListener("DOMContentLoaded", build);
})();

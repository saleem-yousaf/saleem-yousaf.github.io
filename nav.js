/* =====================================================================
   saleemyousaf.co.uk shared navigation  (nav.js)
   Single source of truth for the top menu. Include once per page:
       <script src="/nav.js" defer></script>
   It injects your exact nav styling and removes any old inline <nav>, so
   the menu is identical on every page and you never hand-edit it again.
   To change the menu later (including the Cyberspartans stub), edit ONLY
   this file. Styling is lifted verbatim from your site palette
   (accent #4a9eff, surf #0e1117, border #1e2533, dim #6e7d92,
   text #c8d0dc, heading #e6edf3, muted #2a3344), so it does not change
   the way the site looks.
   ===================================================================== */
(function () {
  "use strict";

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
    /* narrow screens: your current nav has no mobile menu, this only lets it
       wrap instead of clipping, and does not affect the desktop look */
    "@media(max-width:900px){.site-nav{padding:0 20px;height:auto;min-height:56px;flex-wrap:wrap}",
    ".site-nav-links{flex-wrap:wrap}}"
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
    '</nav>';

  function markActive(nav) {
    var path = location.pathname.replace(/\/+$/, "") + "/";
    Array.prototype.forEach.call(nav.querySelectorAll("a[href^='/']"), function (a) {
      var href = a.getAttribute("href");
      if (href === "/") return;
      if (path.indexOf(href) === 0) a.classList.add("active");
    });
  }

  function wire(nav) {
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

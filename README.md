# saleemyousaf.co.uk

Personal site of Saleem Yousaf, Cloud and Cyber Security Architect.
Hosted on GitHub Pages, custom domain saleemyousaf.co.uk.

## Layout

- `/` homepage
- `/about/`, `/experience/`, `/projects/`, `/connect/` core pages
- `/articles/` writing index, with individual articles in subfolders
- `/assume-breach/`, `/ai-security-governance/` pillar articles
- `/breachforge/` redirect stubs pointing at breachforge.co.uk (kept so old shared links don't 404)
- `/privacy-policy/` GDPR notice
- `404.html` custom not-found page
- `nav.js` shared navigation rendered into `<div id="site-nav"></div>` on every page

## To update the nav site-wide

Edit `nav.js`, find the `NAV_CONFIG` object at the top, change there. Every page picks it up on next load.

## Related sites

- BreachForge platform: https://breachforge.co.uk
- Cyber Spartans consultancy: https://cyberspartans.co.uk

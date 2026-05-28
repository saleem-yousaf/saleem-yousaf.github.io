# BreachForge — GitHub Pages Upload Instructions

## What's in this folder

```
breachforge/
├── index.html        ← The BreachForge page (matches your site design exactly)
└── README.md         ← This file
```

## How to upload to your GitHub repo

### Option A — GitHub web UI (no git required, 2 minutes)

1. Go to: https://github.com/saleem-yousaf/saleem-yousaf.github.io
2. Click **Add file → Upload files**
3. Drag the entire `breachforge/` folder into the upload area
4. Scroll down, add commit message: `Add BreachForge BAS platform page`
5. Click **Commit changes**
6. Live at: https://saleem-yousaf.github.io/breachforge/

### Option B — git CLI

```bash
# Clone your repo (if not already local)
git clone https://github.com/saleem-yousaf/saleem-yousaf.github.io.git
cd saleem-yousaf.github.io

# Copy the breachforge folder in
cp -r /path/to/breachforge ./breachforge

# Commit and push
git add breachforge/
git commit -m "Add BreachForge BAS platform page"
git push origin main
```

## After upload — update your site nav

In your root `index.html`, find the Articles dropdown nav section:

```html
[All Articles](https://saleem-yousaf.github.io/articles/)
[Assume Breach](https://saleem-yousaf.github.io/assume-breach/)
[AI Security & Governance](https://saleem-yousaf.github.io/ai-security-governance/)
```

Add BreachForge as a nav item:

```html
<a href="https://saleem-yousaf.github.io/breachforge/">BreachForge BAS</a>
```

## Live URL after upload

https://saleem-yousaf.github.io/breachforge/

## What the page contains

- Full explanation of what BAS is and why it matters
- The 4am Call — step-by-step ransomware kill chain storyboard with MITRE TTPs
- Terminal simulation output mock
- 6 persona cards (CISO, SOC, Architect, PM, Developer, GRC)
- 6 scenario descriptions with TTP chips
- 3 USP blocks + comparison table vs Picus / pen testing / purple team
- 4-step deployment guide
- CTA linking to https://breach-forge.netlify.app
- Exact same nav, footer, fonts, colours, and structure as your existing site

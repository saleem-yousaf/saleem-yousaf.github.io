# Saleem Yousaf — Cloud & Cyber Security Architect

**Live site:** https://saleemyousaf.co.uk

Cloud and Cyber Security Architect specialising in AWS, Azure, Zero Trust, AI Governance, OT Security, and enterprise security architecture. This repository powers the full personal site including the BreachForge BAS platform, a live Threat Intelligence portal, 19 security articles, and an Assume Breach framework reference.

## Site Structure

### Main Pages
| Page | URL |
|---|---|
| Home | https://saleemyousaf.co.uk/ |
| About | https://saleemyousaf.co.uk/about/ |
| Experience | https://saleemyousaf.co.uk/experience/ |
| Projects | https://saleemyousaf.co.uk/projects/ |
| Articles | https://saleemyousaf.co.uk/articles/ |
| Assume Breach | https://saleemyousaf.co.uk/assume-breach/ |
| AI Security & Governance | https://saleemyousaf.co.uk/ai-security-governance/ |
| Connect | https://saleemyousaf.co.uk/connect/ |

---

## BreachForge BAS Platform

Community-driven Breach Attack Simulation and Threat Intelligence platform. 10 attack scenarios mapped to MITRE ATT&CK, 154 atomic techniques, live TI feed aggregation updated every 6 hours via GitHub Actions.

| Page | URL |
|---|---|
| BreachForge Landing | https://saleemyousaf.co.uk/breachforge/ |
| BAS Simulation | https://saleemyousaf.co.uk/breachforge/simulation/ |
| Threat Intelligence Portal | https://saleemyousaf.co.uk/breachforge/intel/ |

### BAS Scenarios
| # | Scenario | Threat Actor |
|---|---|---|
| S1 | Ransomware Kill Chain | FIN7 |
| S2 | Cloud Control-Plane Pivot | APT29 |
| S3 | Active Directory Compromise | Lazarus Group |
| S4 | WAF Bypass | Scattered Spider |
| S5 | Lateral Movement | Volt Typhoon |
| S6 | Insider Threat — Data Theft | Internal |
| S7 | Supply Chain Compromise | APT29 |
| S8 | Azure/Entra Identity Attack | Storm-0558 |
| S9 | Container/Kubernetes Escape | TeamTNT |
| S10 | API Abuse | Scattered Spider |

### TI Feed Sources
CISA KEV, Cisco Talos, Microsoft TI, Palo Alto Unit42, DFIR Report, Abuse.ch URLHaus. Updated every 6 hours via `.github/workflows/ti-feed-collector.yml`.

---

## Assume Breach Framework

| Page | URL |
|---|---|
| Assume Breach Overview | https://saleemyousaf.co.uk/assume-breach/ |
| BAS Framework | https://saleemyousaf.co.uk/assume-breach/bas-framework/ |
| BAS Infographic | https://saleemyousaf.co.uk/assume-breach/bas-infographic/ |

---

## Articles (19)

| Article | URL |
|---|---|
| Enterprise Zero Trust Secure Landing Zone | https://saleemyousaf.co.uk/articles/zero-trust-landing-zone/ |
| Broken RAG vs Governed RAG Pipelines | https://saleemyousaf.co.uk/articles/broken-rag-vs-governed-rag/ |
| Enterprise OT Security & Network Segmentation | https://saleemyousaf.co.uk/articles/enterprise-ot-security/ |
| OT Cybersecurity in Manufacturing | https://saleemyousaf.co.uk/articles/ot-cybersecurity-manufacturing/ |
| MITRE ATT&CK vs MITRE ATLAS | https://saleemyousaf.co.uk/articles/mitre-attck-vs-atlas/ |
| AI Security Assessment Blueprint (SABSA) | https://saleemyousaf.co.uk/articles/ai-security-blueprint-sabsa/ |
| Secure Cloud Landing Zone: Private APIs & ECS | https://saleemyousaf.co.uk/articles/secure-landing-zone-private-apis/ |
| GRC in the Age of AI | https://saleemyousaf.co.uk/articles/grc-age-of-ai/ |
| Assume Breach & Continuous Security Validation | https://saleemyousaf.co.uk/articles/assume-breach-continuous-validation/ |
| Zero Trust in Practice: Where Does Zscaler Fit? | https://saleemyousaf.co.uk/articles/zero-trust-zscaler/ |
| Public vs Private LLMs | https://saleemyousaf.co.uk/articles/public-vs-private-llms/ |
| Security Operations Centres Are Evolving | https://saleemyousaf.co.uk/articles/socs-evolving/ |
| From Threat Modelling to Threat Detection (STRIDE) | https://saleemyousaf.co.uk/articles/stride-cloud-detection/ |
| Secure by Design for Consultancy-Led AWS | https://saleemyousaf.co.uk/articles/secure-by-design-aws/ |
| Cloud Landing Zone Accelerators | https://saleemyousaf.co.uk/articles/cloud-landing-zone-accelerators/ |
| Cloud Service Mapping: AWS vs Azure vs GCP | https://saleemyousaf.co.uk/articles/cloud-service-mapping/ |
| Common Security Mistakes in Cloud Architecture | https://saleemyousaf.co.uk/articles/common-cloud-security-mistakes/ |
| API Security & STRIDE Threat Modelling | https://saleemyousaf.co.uk/articles/api-security-stride/ |
| Designing Secure AWS Landing Zones for Enterprise | https://saleemyousaf.co.uk/articles/designing-aws-landing-zones/ |

---

## Repository Structure

```
.
├── .github/
│   ├── scripts/
│   │   └── collect_feeds.py        # TI feed collector
│   └── workflows/
│       └── ti-feed-collector.yml   # Runs every 6 hours
├── about/
├── ai-security-governance/
├── articles/                       # 19 article pages
├── assume-breach/
│   ├── bas-framework/
│   └── bas-infographic/
├── breachforge/
│   ├── intel/                      # Live TI portal
│   │   └── data/                   # JSON feeds updated by GitHub Actions
│   ├── simulation/
│   │   ├── desktop/                # Full BAS platform
│   │   └── mobile/                 # Mobile-optimised simulation
│   └── storyboard/
├── connect/
├── experience/
├── projects/
├── CNAME                           # saleemyousaf.co.uk
├── index.html
├── robots.txt
└── sitemap.xml
```

---

## Tech Stack

- Static HTML/CSS/JS — no build step, no framework
- GitHub Pages — hosting
- GitHub Actions — automated TI feed collection
- Lucidchart — architecture diagrams (editable links in article captions)
- MITRE ATT&CK — technique mapping for all BAS scenarios

---

## Connect

- Website: https://saleemyousaf.co.uk
- LinkedIn: https://www.linkedin.com/in/saleemyousaf
- GitHub: https://github.com/saleem-yousaf
- Medium: https://saleemyousaf.medium.com
- Hashnode: https://hashnode.com/@saleemyousaf
- Dev.to: https://dev.to/saleem_yousaf
- Cyber Spartans: https://www.cyberspartans.co.uk

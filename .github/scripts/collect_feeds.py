#!/usr/bin/env python3
"""
BreachForge TI Feed Collector
Pulls OSINT feeds, extracts MITRE ATT&CK techniques, updates JSON data files.
Runs via GitHub Actions every 6 hours.
"""

import json
import re
import hashlib
import requests
import feedparser
from datetime import datetime, timezone
from dateutil import parser as dateparser
from pathlib import Path

# ── Configuration ─────────────────────────────────────────────────────────────
OUTPUT_DIR = Path("breachforge/intel/data")
MAX_THREATS = 20       # Keep most recent N threats
MAX_TECHNIQUES = 20    # Top N techniques in heatmap

# ── ATT&CK technique pattern ──────────────────────────────────────────────────
ATTCK_PATTERN = re.compile(r'\bT\d{4}(?:\.\d{3})?\b')

# ── Severity keywords ─────────────────────────────────────────────────────────
CRITICAL_KEYWORDS = ['critical', 'zero-day', '0-day', 'actively exploited', 'nation-state', 'kev']
HIGH_KEYWORDS = ['ransomware', 'data breach', 'supply chain', 'apt', 'espionage', 'backdoor']

# ── Sector keywords ───────────────────────────────────────────────────────────
SECTOR_MAP = {
    'government': 'Government', 'federal': 'Government', 'whitehouse': 'Government',
    'financial': 'Financial Services', 'bank': 'Financial Services', 'fintech': 'Financial Services',
    'healthcare': 'Healthcare', 'hospital': 'Healthcare', 'medical': 'Healthcare',
    'energy': 'Energy', 'utility': 'Energy', 'power grid': 'Energy',
    'manufacturing': 'Manufacturing', 'industrial': 'Manufacturing', 'ot': 'Manufacturing',
    'technology': 'Technology', 'software': 'Technology', 'cloud': 'Technology',
    'defence': 'Defence', 'defense': 'Defence', 'military': 'Defence', 'nato': 'Defence',
    'education': 'Education', 'university': 'Education',
    'retail': 'Retail', 'ecommerce': 'Retail',
    'telecom': 'Telecommunications', 'isp': 'Telecommunications',
}

# ── Known actor keywords ──────────────────────────────────────────────────────
ACTOR_MAP = {
    'apt29': 'APT29', 'cozy bear': 'APT29', 'nobelium': 'APT29',
    'apt28': 'APT28', 'fancy bear': 'APT28',
    'lazarus': 'Lazarus Group',
    'fin7': 'FIN7', 'carbanak': 'FIN7',
    'scattered spider': 'Scattered Spider', 'unc3944': 'Scattered Spider',
    'volt typhoon': 'Volt Typhoon', 'bronze silhouette': 'Volt Typhoon',
    'teamtnt': 'TeamTNT',
    'storm-0558': 'Storm-0558',
    'lockbit': 'LockBit',
    'cl0p': 'Cl0p', 'clop': 'Cl0p',
    'blackcat': 'BlackCat/ALPHV', 'alphv': 'BlackCat/ALPHV',
}


def extract_techniques(text):
    """Extract MITRE ATT&CK technique IDs from text."""
    found = ATTCK_PATTERN.findall(text or '')
    return list(dict.fromkeys(found))  # deduplicate preserving order


def extract_sectors(text):
    """Extract sector mentions from text."""
    text_lower = (text or '').lower()
    found = []
    for keyword, sector in SECTOR_MAP.items():
        if keyword in text_lower and sector not in found:
            found.append(sector)
    return found[:4] if found else ['Technology']


def extract_actors(text):
    """Extract known threat actor names from text."""
    text_lower = (text or '').lower()
    found = []
    for keyword, actor in ACTOR_MAP.items():
        if keyword in text_lower and actor not in found:
            found.append(actor)
    return found[:3]


def classify_severity(text):
    """Classify severity based on keywords."""
    text_lower = (text or '').lower()
    if any(k in text_lower for k in CRITICAL_KEYWORDS):
        return 'Critical'
    if any(k in text_lower for k in HIGH_KEYWORDS):
        return 'High'
    return 'Medium'


def make_id(title, source):
    """Generate stable ID for a threat item."""
    h = hashlib.md5(f"{title}{source}".encode()).hexdigest()[:8]
    return f"TI-{h.upper()}"


def fetch_cisa_kev():
    """Fetch CISA Known Exploited Vulnerabilities."""
    threats = []
    try:
        resp = requests.get(
            "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
            timeout=15
        )
        data = resp.json()
        vulns = sorted(data.get('vulnerabilities', []),
                       key=lambda x: x.get('dateAdded', ''),
                       reverse=True)[:5]

        for v in vulns:
            title = f"CISA KEV: {v.get('vendorProject', '')} {v.get('product', '')} — {v.get('vulnerabilityName', '')}"
            summary = v.get('shortDescription', '') + f" {v.get('requiredAction', '')}"
            threats.append({
                "id": make_id(title, "CISA KEV"),
                "title": title.strip(),
                "source": "CISA KEV",
                "source_url": "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
                "published": v.get('dateAdded', datetime.now(timezone.utc).isoformat()) + "T00:00:00Z",
                "severity": "Critical",
                "techniques": extract_techniques(summary),
                "actors": extract_actors(summary),
                "sectors": extract_sectors(summary),
                "summary": summary[:400].strip()
            })
    except Exception as e:
        print(f"CISA KEV error: {e}")
    return threats


def fetch_rss(name, url, source_url):
    """Generic RSS feed fetcher."""
    threats = []
    try:
        feed = feedparser.parse(url)
        for entry in feed.entries[:4]:
            title = entry.get('title', '')
            summary = entry.get('summary', entry.get('description', ''))
            # Strip HTML tags
            summary = re.sub(r'<[^>]+>', ' ', summary)
            summary = re.sub(r'\s+', ' ', summary).strip()

            published = datetime.now(timezone.utc).isoformat()
            if hasattr(entry, 'published'):
                try:
                    published = dateparser.parse(entry.published).isoformat()
                except Exception:
                    pass

            full_text = f"{title} {summary}"
            techniques = extract_techniques(full_text)
            actors = extract_actors(full_text)
            sectors = extract_sectors(full_text)
            severity = classify_severity(full_text)

            threats.append({
                "id": make_id(title, name),
                "title": title[:200].strip(),
                "source": name,
                "source_url": source_url,
                "published": published,
                "severity": severity,
                "techniques": techniques[:8],
                "actors": actors,
                "sectors": sectors,
                "summary": summary[:400].strip()
            })
    except Exception as e:
        print(f"{name} RSS error: {e}")
    return threats


def fetch_abuse_ch():
    """Fetch recent malware URLs from Abuse.ch URLHaus."""
    threats = []
    try:
        resp = requests.post(
            "https://urlhaus-api.abuse.ch/v1/urls/recent/limit/10/",
            timeout=15
        )
        data = resp.json()
        urls = data.get('urls', [])[:3]
        if urls:
            tags = list(set(u.get('tags', ['malware'])[0] for u in urls if u.get('tags')))[:3]
            threats.append({
                "id": make_id("Abuse.ch URLHaus Recent", "Abuse.ch"),
                "title": f"Abuse.ch URLHaus: Active malware distribution — {', '.join(tags) if tags else 'multiple families'}",
                "source": "Abuse.ch",
                "source_url": "https://abuse.ch",
                "published": datetime.now(timezone.utc).isoformat(),
                "severity": "High",
                "techniques": ["T1071.001", "T1041", "T1059"],
                "actors": [],
                "sectors": ["Technology", "Financial Services"],
                "summary": f"Abuse.ch URLHaus reporting {len(data.get('urls', []))} active malware distribution URLs. Recent tags include {', '.join(tags) if tags else 'various malware families'}."
            })
    except Exception as e:
        print(f"Abuse.ch error: {e}")
    return threats


def update_techniques(threats):
    """Build technique frequency data from collected threats."""
    counts = {}
    for t in threats:
        for tp in t.get('techniques', []):
            counts[tp] = counts.get(tp, 0) + 1

    # Load existing to track trends
    techniques_file = OUTPUT_DIR / "techniques.json"
    existing = {}
    if techniques_file.exists():
        try:
            old = json.loads(techniques_file.read_text())
            existing = {t['id']: t['count'] for t in old.get('techniques', [])}
        except Exception:
            pass

    # ATT&CK technique names (subset of most common)
    NAMES = {
        "T1190": ("Exploit Public-Facing Application", "Initial Access"),
        "T1078": ("Valid Accounts", "Defense Evasion"),
        "T1566.001": ("Spearphishing Attachment", "Initial Access"),
        "T1003.001": ("LSASS Memory Dump", "Credential Access"),
        "T1486": ("Data Encrypted for Impact", "Impact"),
        "T1528": ("Steal Application Access Token", "Credential Access"),
        "T1133": ("External Remote Services", "Initial Access"),
        "T1611": ("Escape to Host", "Privilege Escalation"),
        "T1562.001": ("Disable Security Tools", "Defense Evasion"),
        "T1041": ("Exfil Over C2 Channel", "Exfiltration"),
        "T1490": ("Inhibit System Recovery", "Impact"),
        "T1195.001": ("Compromise Software Supply Chain", "Initial Access"),
        "T1610": ("Deploy Container", "Execution"),
        "T1552.007": ("Container API Credentials", "Credential Access"),
        "T1070.001": ("Clear Windows Event Logs", "Defense Evasion"),
        "T1059.001": ("PowerShell Execution", "Execution"),
        "T1537": ("Transfer Data to Cloud Account", "Exfiltration"),
        "T1550.001": ("Application Access Token", "Lateral Movement"),
        "T1496": ("Resource Hijacking", "Impact"),
        "T1530": ("Data from Cloud Storage", "Collection"),
        "T1071.001": ("Web Protocols C2", "Command and Control"),
        "T1059": ("Command and Scripting Interpreter", "Execution"),
    }

    techniques = []
    for tid, count in sorted(counts.items(), key=lambda x: x[1], reverse=True)[:MAX_TECHNIQUES]:
        old_count = existing.get(tid, count)
        trend = "up" if count > old_count else "down" if count < old_count else "stable"
        name, tactic = NAMES.get(tid, (tid, "Unknown"))
        techniques.append({
            "id": tid,
            "name": name,
            "tactic": tactic,
            "count": count,
            "trend": trend
        })

    return {
        "generated": datetime.now(timezone.utc).isoformat(),
        "window_days": 30,
        "techniques": techniques
    }


def update_recommendations(threats, techniques_data):
    """Generate BAS recommendations based on trending techniques."""

    # Map techniques to scenarios
    SCENARIO_TECHNIQUES = {
        "S1": {"name": "Ransomware Kill Chain",           "techniques": {"T1486","T1490","T1003.001","T1133","T1566.001"}},
        "S2": {"name": "Cloud Control-Plane Pivot",       "techniques": {"T1078","T1528","T1530","T1537","T1098.001"}},
        "S3": {"name": "Active Directory Compromise",     "techniques": {"T1558.003","T1003.001","T1003.006","T1550.002"}},
        "S4": {"name": "WAF Bypass & Web Exploit",        "techniques": {"T1190","T1059.007","T1505.003"}},
        "S5": {"name": "Lateral Movement Chain",          "techniques": {"T1021.002","T1047","T1570","T1557.001"}},
        "S6": {"name": "Insider Threat - Data Theft",     "techniques": {"T1048","T1041","T1560.001","T1078"}},
        "S7": {"name": "Supply Chain Compromise",         "techniques": {"T1195.002","T1195.001","T1059.001","T1553.002"}},
        "S8": {"name": "Azure / Entra Identity Attack",   "techniques": {"T1528","T1550.001","T1078.004","T1098.003"}},
        "S9": {"name": "Container & K8s Escape",          "techniques": {"T1610","T1611","T1552.007","T1496"}},
        "S10":{"name": "API Abuse & Business Logic",      "techniques": {"T1190","T1059.007","T1110.003","T1041"}},
    }

    trending = {t['id'] for t in techniques_data.get('techniques', []) if t.get('trend') == 'up'}
    active_techniques = {t['id'] for threat in threats for t in [threat] for t in threat.get('techniques', [])}

    scores = []
    for sid, sc in SCENARIO_TECHNIQUES.items():
        matched = sc['techniques'] & (trending | active_techniques)
        if matched:
            urgency = "Critical" if len(matched) >= 3 else "High"
            # Find threat refs
            refs = []
            for threat in threats:
                if any(tp in sc['techniques'] for tp in threat.get('techniques', [])):
                    refs.append(threat['id'])
            scores.append({
                "priority": 0,
                "scenario_id": sid,
                "scenario_name": sc['name'],
                "reason": f"{', '.join(list(matched)[:3])} trending in recent threat intelligence. {len(matched)} matching techniques observed.",
                "techniques_matched": list(matched)[:5],
                "threat_refs": refs[:2],
                "urgency": urgency,
                "simulation_url": f"../simulation/desktop/#{sid}"
            })

    scores.sort(key=lambda x: (0 if x['urgency']=='Critical' else 1, -len(x['techniques_matched'])))
    for i, s in enumerate(scores[:5]):
        s['priority'] = i + 1

    return {
        "generated": datetime.now(timezone.utc).isoformat(),
        "recommendations": scores[:5]
    }


def update_feeds(feed_results):
    """Update feed health status."""
    feeds = [
        {"name": "CISA KEV",                   "url": "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"},
        {"name": "Cisco Talos RSS",             "url": "https://feeds.feedburner.com/feedburner/Talos"},
        {"name": "Microsoft Threat Intel RSS",  "url": "https://www.microsoft.com/security/blog/feed/"},
        {"name": "Palo Alto Unit42 RSS",        "url": "https://unit42.paloaltonetworks.com/feed/"},
        {"name": "DFIR Report RSS",             "url": "https://thedfirreport.com/feed/"},
        {"name": "Abuse.ch URLHaus",            "url": "https://urlhaus-api.abuse.ch/v1/urls/recent/"},
        {"name": "AlienVault OTX",              "url": "https://otx.alienvault.com"},
        {"name": "MITRE ATT&CK STIX",          "url": "https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json"},
    ]

    now = datetime.now(timezone.utc).isoformat()
    result = []
    for f in feeds:
        name = f['name']
        items = feed_results.get(name, {})
        result.append({
            "name": name,
            "url": f['url'],
            "status": "healthy" if items.get('count', 0) >= 0 else "error",
            "last_updated": now,
            "items_today": items.get('count', 0)
        })

    return {
        "generated": now,
        "feeds": result
    }


# ── Known scenario technique coverage (for gap detection) ──────────────────────
KNOWN_SCENARIO_TECHNIQUES = {
    "S1":  {"T1486","T1490","T1003.001","T1133","T1566.001","T1059.001","T1021.001","T1021.002","T1550.002"},
    "S2":  {"T1078","T1528","T1530","T1537","T1098.001"},
    "S3":  {"T1558.003","T1003.001","T1003.006","T1550.002"},
    "S4":  {"T1190","T1059.007","T1505.003"},
    "S5":  {"T1021.002","T1047","T1570","T1557.001"},
    "S6":  {"T1048","T1041","T1560.001","T1078"},
    "S7":  {"T1195.002","T1195.001","T1059.001","T1553.002"},
    "S8":  {"T1528","T1550.001","T1078.004","T1098.003"},
    "S9":  {"T1610","T1611","T1552.007","T1496"},
    "S10": {"T1190","T1059.007","T1110.003","T1041"},
}

ALL_KNOWN_TECHNIQUES = set()
for s in KNOWN_SCENARIO_TECHNIQUES.values():
    ALL_KNOWN_TECHNIQUES.update(s)

URGENCY_SCORE = {"Critical": 3, "High": 2, "Medium": 1}


def detect_emerging_threats(threats, techniques_data):
    """
    Identify genuinely emerging activity that either:
    a) Contains techniques not covered by any existing scenario (gap threats)
    b) Shows a new threat actor not previously modelled
    c) Shows a known actor using new techniques
    Returns structured emerging threat entries for the new BAS module.
    """
    KNOWN_ACTORS = {"FIN7","APT29","Lazarus Group","Scattered Spider","Volt Typhoon",
                    "Storm-0558","TeamTNT","LockBit"}

    # Score = total techniques seen across all feeds
    technique_counts = {t["id"]: t["count"] for t in techniques_data.get("techniques", [])}
    trending_up = {t["id"] for t in techniques_data.get("techniques", []) if t.get("trend") == "up"}

    emerging = []
    seen_titles = set()

    for threat in threats:
        ttps = set(threat.get("techniques", []))
        actors = set(threat.get("actors", []))
        title = threat.get("title", "")

        if title in seen_titles:
            continue

        # Check for unmodelled techniques
        uncovered = ttps - ALL_KNOWN_TECHNIQUES
        new_actors = actors - KNOWN_ACTORS
        trending_uncovered = uncovered & trending_up

        # Determine if this qualifies as emerging
        reasons = []
        priority_score = 0

        if trending_uncovered:
            reasons.append(f"Techniques not covered by existing scenarios and trending: {', '.join(sorted(trending_uncovered)[:3])}")
            priority_score += 3 * len(trending_uncovered)

        if uncovered - trending_uncovered:
            reasons.append(f"Techniques not covered by any existing BAS scenario: {', '.join(sorted(uncovered - trending_uncovered)[:3])}")
            priority_score += 1 * len(uncovered - trending_uncovered)

        if new_actors:
            reasons.append(f"Threat actor not currently modelled in BreachForge: {', '.join(new_actors)}")
            priority_score += 4 * len(new_actors)

        if not reasons:
            continue

        # Find closest existing scenario for context
        best_match = None
        best_overlap = 0
        for sid, stechs in KNOWN_SCENARIO_TECHNIQUES.items():
            overlap = len(ttps & stechs)
            if overlap > best_overlap:
                best_overlap = overlap
                best_match = sid

        seen_titles.add(title)
        sev = threat.get("severity", "Medium")

        emerging.append({
            "id": threat["id"],
            "title": title,
            "source": threat.get("source", ""),
            "source_url": threat.get("source_url", ""),
            "published": threat.get("published", ""),
            "severity": sev,
            "actors": list(actors),
            "sectors": threat.get("sectors", []),
            "summary": threat.get("summary", ""),
            "techniques": list(ttps),
            "uncovered_techniques": sorted(uncovered),
            "new_actors": sorted(new_actors),
            "reasons": reasons,
            "closest_scenario": best_match,
            "closest_overlap": best_overlap,
            "priority_score": priority_score + URGENCY_SCORE.get(sev, 1),
            "status": "new",
            "review_required": True
        })

    # Sort by priority score descending, cap at 10
    emerging.sort(key=lambda x: x["priority_score"], reverse=True)
    return emerging[:10]



def main():
    print(f"[{datetime.now().isoformat()}] BreachForge TI Feed Collector starting...")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    all_threats = []
    feed_results = {}

    # CISA KEV
    print("Fetching CISA KEV...")
    kev = fetch_cisa_kev()
    all_threats.extend(kev)
    feed_results["CISA KEV"] = {"count": len(kev)}

    # RSS Feeds
    rss_feeds = [
        ("Cisco Talos RSS",            "https://feeds.feedburner.com/feedburner/Talos",      "https://blog.talosintelligence.com"),
        ("Microsoft Threat Intel RSS", "https://www.microsoft.com/security/blog/feed/",      "https://www.microsoft.com/security/blog"),
        ("Palo Alto Unit42 RSS",       "https://unit42.paloaltonetworks.com/feed/",           "https://unit42.paloaltonetworks.com"),
        ("DFIR Report RSS",            "https://thedfirreport.com/feed/",                    "https://thedfirreport.com"),
    ]

    for name, url, source_url in rss_feeds:
        print(f"Fetching {name}...")
        items = fetch_rss(name, url, source_url)
        all_threats.extend(items)
        feed_results[name] = {"count": len(items)}

    # Abuse.ch
    print("Fetching Abuse.ch...")
    abuse = fetch_abuse_ch()
    all_threats.extend(abuse)
    feed_results["Abuse.ch URLHaus"] = {"count": len(abuse)}

    # Mark other feeds
    feed_results["AlienVault OTX"] = {"count": 0}
    feed_results["MITRE ATT&CK STIX"] = {"count": 0}

    # Sort by date descending, deduplicate by ID
    seen_ids = set()
    unique_threats = []
    for t in sorted(all_threats, key=lambda x: x.get('published',''), reverse=True):
        if t['id'] not in seen_ids:
            seen_ids.add(t['id'])
            unique_threats.append(t)

    unique_threats = unique_threats[:MAX_THREATS]
    print(f"Collected {len(unique_threats)} unique threats")

    # Update technique frequencies
    techniques_data = update_techniques(unique_threats)

    # Update BAS recommendations
    recs_data = update_recommendations(unique_threats, techniques_data)

    # Update feed health
    feeds_data = update_feeds(feed_results)

    # Build threats JSON
    threats_data = {
        "generated": datetime.now(timezone.utc).isoformat(),
        "source": "BreachForge TI Feed Collector v1.0",
        "threats": unique_threats
    }

    # Write all JSON files
    # Detect emerging threats (unmodelled techniques / new actors)
    emerging_list = detect_emerging_threats(unique_threats, techniques_data)
    emerging_data = {
        "generated": datetime.now(timezone.utc).isoformat(),
        "total": len(emerging_list),
        "emerging": emerging_list
    }
    print(f"Emerging threats detected: {len(emerging_list)}")

    files = {
        "threats.json":          threats_data,
        "techniques.json":       techniques_data,
        "recommendations.json":  recs_data,
        "feeds.json":            feeds_data,
        "emerging_threats.json": emerging_data,
    }

    for filename, data in files.items():
        path = OUTPUT_DIR / filename
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
        print(f"Written: {path} ({path.stat().st_size} bytes)")

    print(f"[{datetime.now().isoformat()}] Feed collection complete.")


if __name__ == "__main__":
    main()

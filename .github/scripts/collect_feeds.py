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
MAX_THREATS = 20
MAX_TECHNIQUES = 20

ATTCK_PATTERN = re.compile(r'\bT\d{4}(?:\.\d{3})?\b')

CRITICAL_KEYWORDS = ['critical', 'zero-day', '0-day', 'actively exploited', 'nation-state', 'kev']
HIGH_KEYWORDS = ['ransomware', 'data breach', 'supply chain', 'apt', 'espionage', 'backdoor']

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
    found = ATTCK_PATTERN.findall(text or '')
    return list(dict.fromkeys(found))


def extract_sectors(text):
    text_lower = (text or '').lower()
    found = []
    for keyword, sector in SECTOR_MAP.items():
        if keyword in text_lower and sector not in found:
            found.append(sector)
    return found[:4] if found else ['Technology']


def extract_actors(text):
    text_lower = (text or '').lower()
    found = []
    for keyword, actor in ACTOR_MAP.items():
        if keyword in text_lower and actor not in found:
            found.append(actor)
    return found[:3]


def classify_severity(text):
    text_lower = (text or '').lower()
    if any(k in text_lower for k in CRITICAL_KEYWORDS):
        return 'Critical'
    if any(k in text_lower for k in HIGH_KEYWORDS):
        return 'High'
    return 'Medium'


def make_id(title, source):
    h = hashlib.md5(f"{title}{source}".encode()).hexdigest()[:8]
    return f"TI-{h.upper()}"


def fetch_cisa_kev():
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
            title = f"CISA KEV: {v.get('vendorProject', '')} {v.get('product', '')} - {v.get('vulnerabilityName', '')}"
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
    threats = []
    try:
        feed = feedparser.parse(url)
        for entry in feed.entries[:4]:
            title = entry.get('title', '')
            summary = entry.get('summary', entry.get('description', ''))
            summary = re.sub(r'<[^>]+>', ' ', summary)
            summary = re.sub(r'\s+', ' ', summary).strip()
            published = datetime.now(timezone.utc).isoformat()
            if hasattr(entry, 'published'):
                try:
                    published = dateparser.parse(entry.published).isoformat()
                except Exception:
                    pass
            full_text = f"{title} {summary}"
            threats.append({
                "id": make_id(title, name),
                "title": title[:200].strip(),
                "source": name,
                "source_url": source_url,
                "published": published,
                "severity": classify_severity(full_text),
                "techniques": extract_techniques(full_text)[:8],
                "actors": extract_actors(full_text),
                "sectors": extract_sectors(full_text),
                "summary": summary[:400].strip()
            })
    except Exception as e:
        print(f"{name} RSS error: {e}")
    return threats


def fetch_abuse_ch():
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
                "title": f"Abuse.ch URLHaus: Active malware distribution - {', '.join(tags) if tags else 'multiple families'}",
                "source": "Abuse.ch",
                "source_url": "https://abuse.ch",
                "published": datetime.now(timezone.utc).isoformat(),
                "severity": "High",
                "techniques": ["T1071.001", "T1041", "T1059"],
                "actors": [],
                "sectors": ["Technology", "Financial Services"],
                "summary": f"Abuse.ch URLHaus reporting {len(data.get('urls', []))} active malware distribution URLs."
            })
    except Exception as e:
        print(f"Abuse.ch error: {e}")
    return threats


def update_techniques(threats):
    counts = {}
    for t in threats:
        for tp in t.get('techniques', []):
            counts[tp] = counts.get(tp, 0) + 1

    techniques_file = OUTPUT_DIR / "techniques.json"
    existing = {}
    if techniques_file.exists():
        try:
            old = json.loads(techniques_file.read_text())
            existing = {t['id']: t['count'] for t in old.get('techniques', [])}
        except Exception:
            pass

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
        techniques.append({"id": tid, "name": name, "tactic": tactic, "count": count, "trend": trend})

    return {"generated": datetime.now(timezone.utc).isoformat(), "window_days": 30, "techniques": techniques}


def update_recommendations(threats, techniques_data):
    SCENARIO_TECHNIQUES = {
        "S1":  {"name": "Ransomware Kill Chain",         "techniques": {"T1486","T1490","T1003.001","T1133","T1566.001"}},
        "S2":  {"name": "Cloud Control-Plane Pivot",     "techniques": {"T1078","T1528","T1530","T1537","T1098.001"}},
        "S3":  {"name": "Active Directory Compromise",   "techniques": {"T1558.003","T1003.001","T1003.006","T1550.002"}},
        "S4":  {"name": "WAF Bypass & Web Exploit",      "techniques": {"T1190","T1059.007","T1505.003"}},
        "S5":  {"name": "Lateral Movement Chain",        "techniques": {"T1021.002","T1047","T1570","T1557.001"}},
        "S6":  {"name": "Insider Threat - Data Theft",   "techniques": {"T1048","T1041","T1560.001","T1078"}},
        "S7":  {"name": "Supply Chain Compromise",       "techniques": {"T1195.002","T1195.001","T1059.001","T1553.002"}},
        "S8":  {"name": "Azure / Entra Identity Attack", "techniques": {"T1528","T1550.001","T1078.004","T1098.003"}},
        "S9":  {"name": "Container & K8s Escape",        "techniques": {"T1610","T1611","T1552.007","T1496"}},
        "S10": {"n

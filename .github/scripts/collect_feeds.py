#!/usr/bin/env python3
import json, re, hashlib, requests, feedparser
from datetime import datetime, timezone
from dateutil import parser as dateparser
from pathlib import Path

OUTPUT_DIR = Path("breachforge/intel/data")
MAX_THREATS = 20
MAX_TECHNIQUES = 20
ATTCK_PATTERN = re.compile(r'\bT\d{4}(?:\.\d{3})?\b')
CRITICAL_KEYWORDS = ['critical', 'zero-day', '0-day', 'actively exploited', 'nation-state', 'kev']
HIGH_KEYWORDS = ['ransomware', 'data breach', 'supply chain', 'apt', 'espionage', 'backdoor']

SECTOR_MAP = {
    'government':'Government','federal':'Government','financial':'Financial Services',
    'bank':'Financial Services','healthcare':'Healthcare','hospital':'Healthcare',
    'energy':'Energy','utility':'Energy','manufacturing':'Manufacturing',
    'industrial':'Manufacturing','technology':'Technology','software':'Technology',
    'cloud':'Technology','defence':'Defence','defense':'Defence','military':'Defence',
    'nato':'Defence','education':'Education','retail':'Retail','telecom':'Telecommunications',
}

ACTOR_MAP = {
    'apt29':'APT29','cozy bear':'APT29','nobelium':'APT29',
    'apt28':'APT28','fancy bear':'APT28','lazarus':'Lazarus Group',
    'fin7':'FIN7','carbanak':'FIN7','scattered spider':'Scattered Spider',
    'unc3944':'Scattered Spider','volt typhoon':'Volt Typhoon',
    'bronze silhouette':'Volt Typhoon','teamtnt':'TeamTNT',
    'storm-0558':'Storm-0558','lockbit':'LockBit',
    'cl0p':'Cl0p','clop':'Cl0p','blackcat':'BlackCat/ALPHV','alphv':'BlackCat/ALPHV',
}

NAMES = {
    "T1190":("Exploit Public-Facing Application","Initial Access"),
    "T1078":("Valid Accounts","Defense Evasion"),
    "T1566.001":("Spearphishing Attachment","Initial Access"),
    "T1003.001":("LSASS Memory Dump","Credential Access"),
    "T1486":("Data Encrypted for Impact","Impact"),
    "T1528":("Steal Application Access Token","Credential Access"),
    "T1133":("External Remote Services","Initial Access"),
    "T1611":("Escape to Host","Privilege Escalation"),
    "T1562.001":("Disable Security Tools","Defense Evasion"),
    "T1041":("Exfil Over C2 Channel","Exfiltration"),
    "T1490":("Inhibit System Recovery","Impact"),
    "T1195.001":("Compromise Software Supply Chain","Initial Access"),
    "T1610":("Deploy Container","Execution"),
    "T1552.007":("Container API Credentials","Credential Access"),
    "T1070.001":("Clear Windows Event Logs","Defense Evasion"),
    "T1059.001":("PowerShell Execution","Execution"),
    "T1537":("Transfer Data to Cloud Account","Exfiltration"),
    "T1550.001":("Application Access Token","Lateral Movement"),
    "T1496":("Resource Hijacking","Impact"),
    "T1530":("Data from Cloud Storage","Collection"),
    "T1071.001":("Web Protocols C2","Command and Control"),
    "T1059":("Command and Scripting Interpreter","Execution"),
}

SCENARIO_TECHNIQUES = {
    "S1":{"name":"Ransomware Kill Chain","techniques":{"T1486","T1490","T1003.001","T1133","T1566.001"}},
    "S2":{"name":"Cloud Control-Plane Pivot","techniques":{"T1078","T1528","T1530","T1537","T1098.001"}},
    "S3":{"name":"Active Directory Compromise","techniques":{"T1558.003","T1003.001","T1003.006","T1550.002"}},
    "S4":{"name":"WAF Bypass & Web Exploit","techniques":{"T1190","T1059.007","T1505.003"}},
    "S5":{"name":"Lateral Movement Chain","techniques":{"T1021.002","T1047","T1570","T1557.001"}},
    "S6":{"name":"Insider Threat - Data Theft","techniques":{"T1048","T1041","T1560.001","T1078"}},
    "S7":{"name":"Supply Chain Compromise","techniques":{"T1195.002","T1195.001","T1059.001","T1553.002"}},
    "S8":{"name":"Azure / Entra Identity Attack","techniques":{"T1528","T1550.001","T1078.004","T1098.003"}},
    "S9":{"name":"Container & K8s Escape","techniques":{"T1610","T1611","T1552.007","T1496"}},
    "S10":{"name":"API Abuse & Business Logic","techniques":{"T1190","T1059.007","T1110.003","T1041"}},
}

def xt(text):
    return list(dict.fromkeys(ATTCK_PATTERN.findall(text or '')))

def xs(text):
    tl = (text or '').lower()
    found = []
    for k,v in SECTOR_MAP.items():
        if k in tl and v not in found: found.append(v)
    return found[:4] if found else ['Technology']

def xa(text):
    tl = (text or '').lower()
    found = []
    for k,v in ACTOR_MAP.items():
        if k in tl and v not in found: found.append(v)
    return found[:3]

def sev(text):
    tl = (text or '').lower()
    if any(k in tl for k in CRITICAL_KEYWORDS): return 'Critical'
    if any(k in tl for k in HIGH_KEYWORDS): return 'High'
    return 'Medium'

def mid(title, source):
    return f"TI-{hashlib.md5(f'{title}{source}'.encode()).hexdigest()[:8].upper()}"

def now():
    return datetime.now(timezone.utc).isoformat()

def fetch_cisa_kev():
    threats = []
    try:
        data = requests.get("https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",timeout=15).json()
        for v in sorted(data.get('vulnerabilities',[]),key=lambda x:x.get('dateAdded',''),reverse=True)[:5]:
            title = f"CISA KEV: {v.get('vendorProject','')} {v.get('product','')} - {v.get('vulnerabilityName','')}"
            summary = v.get('shortDescription','') + ' ' + v.get('requiredAction','')
            threats.append({"id":mid(title,"CISA KEV"),"title":title.strip(),"source":"CISA KEV",
                "source_url":"https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
                "published":v.get('dateAdded',now())+"T00:00:00Z","severity":"Critical",
                "techniques":xt(summary),"actors":xa(summary),"sectors":xs(summary),"summary":summary[:400].strip()})
    except Exception as e: print(f"CISA KEV error: {e}")
    return threats

def fetch_rss(name, url, source_url):
    threats = []
    try:
        feed = feedparser.parse(url)
        for entry in feed.entries[:4]:
            title = entry.get('title','')
            summary = re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',entry.get('summary',entry.get('description','')))).strip()
            pub = now()
            if hasattr(entry,'published'):
                try: pub = dateparser.parse(entry.published).isoformat()
                except: pass
            ft = f"{title} {summary}"
            threats.append({"id":mid(title,name),"title":title[:200].strip(),"source":name,
                "source_url":source_url,"published":pub,"severity":sev(ft),
                "techniques":xt(ft)[:8],"actors":xa(ft),"sectors":xs(ft),"summary":summary[:400].strip()})
    except Exception as e: print(f"{name} error: {e}")
    return threats

def fetch_abuse_ch():
    threats = []
    try:
        data = requests.post("https://urlhaus-api.abuse.ch/v1/urls/recent/limit/10/",timeout=15).json()
        urls = data.get('urls',[])[:3]
        if urls:
            tags = list(set(u.get('tags',['malware'])[0] for u in urls if u.get('tags')))[:3]
            threats.append({"id":mid("Abuse.ch URLHaus Recent","Abuse.ch"),
                "title":f"Abuse.ch URLHaus: Active malware - {', '.join(tags) if tags else 'multiple families'}",
                "source":"Abuse.ch","source_url":"https://abuse.ch","published":now(),
                "severity":"High","techniques":["T1071.001","T1041","T1059"],"actors":[],
                "sectors":["Technology","Financial Services"],
                "summary":f"Abuse.ch URLHaus reporting {len(data.get('urls',[]))} active malware URLs."})
    except Exception as e: print(f"Abuse.ch error: {e}")
    return threats

def update_techniques(threats):
    counts = {}
    for t in threats:
        for tp in t.get('techniques',[]): counts[tp] = counts.get(tp,0)+1
    existing = {}
    tf = OUTPUT_DIR/"techniques.json"
    if tf.exists():
        try: existing = {t['id']:t['count'] for t in json.loads(tf.read_text()).get('techniques',[])}
        except: pass
    techniques = []
    for tid,count in sorted(counts.items(),key=lambda x:x[1],reverse=True)[:MAX_TECHNIQUES]:
        old = existing.get(tid,count)
        trend = "up" if count>old else "down" if count<old else "stable"
        name,tactic = NAMES.get(tid,(tid,"Unknown"))
        techniques.append({"id":tid,"name":name,"tactic":tactic,"count":count,"trend":trend})
    return {"generated":now(),"window_days":30,"techniques":techniques}

def update_recommendations(threats, tech_data):
    trending = {t['id'] for t in tech_data.get('techniques',[]) if t.get('trend')=='up'}
    active = {tp for t in threats for tp in t.get('techniques',[])}
    scores = []
    for sid,sc in SCENARIO_TECHNIQUES.items():
        matched = sc['techniques'] & (trending|active)
        if matched:
            refs = [t['id'] for t in threats if any(tp in sc['techniques'] for tp in t.get('techniques',[]))]
            scores.append({"priority":0,"scenario_id":sid,"scenario_name":sc['name'],
                "reason":f"{', '.join(list(matched)[:3])} trending. {len(matched)} matching techniques observed.",
                "techniques_matched":list(matched)[:5],"threat_refs":refs[:2],
                "urgency":"Critical" if len(matched)>=3 else "High",
                "simulation_url":"../simulation/desktop/"})
    scores.sort(key=lambda x:(0 if x['urgency']=='Critical' else 1,-len(x['techniques_matched'])))
    for i,s in enumerate(scores[:5]): s['priority']=i+1
    return {"generated":now(),"recommendations":scores[:5]}

def update_feeds(feed_results):
    feeds = [
        {"name":"CISA KEV","url":"https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"},
        {"name":"Cisco Talos RSS","url":"https://feeds.feedburner.com/feedburner/Talos"},
        {"name":"Microsoft Threat Intel RSS","url":"https://www.microsoft.com/security/blog/feed/"},
        {"name":"Palo Alto Unit42 RSS","url":"https://unit42.paloaltonetworks.com/feed/"},
        {"name":"DFIR Report RSS","url":"https://thedfirreport.com/feed/"},
        {"name":"Abuse.ch URLHaus","url":"https://urlhaus-api.abuse.ch/v1/urls/recent/"},
        {"name":"AlienVault OTX","url":"https://otx.alienvault.com"},
        {"name":"MITRE ATT&CK STIX","url":"https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json"},
    ]
    n = now()
    result = []
    for f in feeds:
        items = feed_results.get(f['name'],{})
        result.append({"name":f['name'],"url":f['url'],"status":"healthy",
            "last_updated":n,"items_today":items.get('count',0)})
    return {"generated":n,"feeds":result}

def main():
    print(f"[{now()}] BreachForge TI Feed Collector starting...")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    all_threats = []
    feed_results = {}

    print("Fetching CISA KEV...")
    kev = fetch_cisa_kev()
    all_threats.extend(kev)
    feed_results["CISA KEV"] = {"count":len(kev)}

    for name,url,src in [
        ("Cisco Talos RSS","https://feeds.feedburner.com/feedburner/Talos","https://blog.talosintelligence.com"),
        ("Microsoft Threat Intel RSS","https://www.microsoft.com/security/blog/feed/","https://www.microsoft.com/security/blog"),
        ("Palo Alto Unit42 RSS","https://unit42.paloaltonetworks.com/feed/","https://unit42.paloaltonetworks.com"),
        ("DFIR Report RSS","https://thedfirreport.com/feed/","https://thedfirreport.com"),
    ]:
        print(f"Fetching {name}...")
        items = fetch_rss(name,url,src)
        all_threats.extend(items)
        feed_results[name] = {"count":len(items)}

    print("Fetching Abuse.ch...")
    abuse = fetch_abuse_ch()
    all_threats.extend(abuse)
    feed_results["Abuse.ch URLHaus"] = {"count":len(abuse)}
    feed_results["AlienVault OTX"] = {"count":0}
    feed_results["MITRE ATT&CK STIX"] = {"count":0}

    seen = set()
    unique = []
    for t in sorted(all_threats,key=lambda x:x.get('published',''),reverse=True):
        if t['id'] not in seen:
            seen.add(t['id'])
            unique.append(t)
    unique = unique[:MAX_THREATS]
    print(f"Collected {len(unique)} unique threats")

    tech_data = update_techniques(unique)
    recs_data = update_recommendations(unique,tech_data)
    feeds_data = update_feeds(feed_results)
    threats_data = {"generated":now(),"source":"BreachForge TI Feed Collector v1.0","threats":unique}

    for filename,data in [
        ("threats.json",threats_data),
        ("techniques.json",tech_data),
        ("recommendations.json",recs_data),
        ("feeds.json",feeds_data),
    ]:
        path = OUTPUT_DIR/filename
        path.write_text(json.dumps(data,indent=2,ensure_ascii=False))
        print(f"Written: {path}")

    print(f"[{now()}] Complete.")

if __name__ == "__main__":
    main()

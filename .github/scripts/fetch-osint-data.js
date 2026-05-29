#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

// FIX (Bug 2): write to <repo-root>/breachforge/intel/data regardless of where
// this script file sits. GitHub Actions runs every step from the repo root, so
// process.cwd() is the repo root. The old code used __dirname + '../...', which
// resolved to .github/breachforge/... when the script lived in .github/scripts/,
// a folder GitHub Pages never serves.
const DATA_DIR = path.join(process.cwd(), 'breachforge/intel/data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper to fetch JSON from HTTPS endpoints.
// Now follows redirects and rejects on non-200 so a failed source surfaces
// cleanly instead of trying to JSON.parse an error page.
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'BreachForge-TI-Bot/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(fetchJSON(res.headers.location));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Invalid JSON from ${url}: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

async function fetchOSINTData() {
  console.log('Starting OSINT data fetch...');
  const timestamp = new Date().toISOString();

  // 1. CISA KEV (Known Exploited Vulnerabilities)
  // Wrapped on its own so a CISA outage cannot blank the rest of the portal.
  let cisaVulns = [];
  let cisaTotal = 0;
  let cisaLastUpdate = timestamp;
  let cisaStatus = 'healthy';
  try {
    console.log('Fetching CISA KEV...');
    const cisaData = await fetchJSON('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json');
    const vulns = Array.isArray(cisaData.vulnerabilities) ? cisaData.vulnerabilities : [];
    cisaTotal = vulns.length;
    cisaVulns = vulns.slice(0, 10).map(v => ({
      cveId: v.cveID,
      description: v.shortDescription,
      dateAdded: v.dateAdded,
      exploitType: v.exploitType,
      severity: 'high'
    }));
    // FIX (Bug 1): CISA KEV exposes dateReleased / catalogVersion, never meta.lastModified.
    cisaLastUpdate = cisaData.dateReleased
      ? new Date(cisaData.dateReleased).toISOString()
      : timestamp;
  } catch (e) {
    console.error('CISA KEV fetch failed, continuing with fallback:', e.message);
    cisaStatus = 'degraded';
  }

  // 2. MITRE ATT&CK Enterprise techniques
  let techniques = [];
  let mitreTotal = 0;
  let mitreStatus = 'healthy';
  try {
    console.log('Fetching MITRE ATT&CK Enterprise...');
    const mitreData = await fetchJSON('https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json');
    const objects = Array.isArray(mitreData.objects) ? mitreData.objects : [];
    const attackPatterns = objects.filter(o => o.type === 'attack-pattern');
    mitreTotal = attackPatterns.length;
    techniques = attackPatterns.slice(0, 15).map(t => ({
      id: t.external_references?.find(ref => ref.source_name === 'mitre-attack')?.external_id || 'N/A',
      name: t.name,
      description: t.description?.substring(0, 100) || '',
      created: t.created
    }));
  } catch (e) {
    console.error('MITRE ATT&CK fetch failed, continuing with fallback:', e.message);
    mitreStatus = 'degraded';
  }

  // 3. Threat actors (static list, no free real-time API)
  const threatActors = [
    {
      id: 'storm-0558',
      name: 'Storm-0558',
      origin: 'China',
      type: 'Nation-State',
      sectors: ['Government', 'Technology'],
      ttps: ['T1566.002', 'T1566.001', 'T1082'],
      lastActivity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'teamtnt',
      name: 'TeamTNT',
      origin: 'Unknown',
      type: 'Cybercriminal',
      sectors: ['Cloud', 'All'],
      ttps: ['T1136', 'T1199', 'T1021'],
      lastActivity: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'apt29',
      name: 'APT29',
      origin: 'Russia',
      type: 'Nation-State',
      sectors: ['Government', 'Energy'],
      ttps: ['T1078.003', 'T1550.004', 'T1566'],
      lastActivity: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'fin7',
      name: 'FIN7',
      origin: 'Unclear',
      type: 'APT',
      sectors: ['Finance', 'Retail'],
      ttps: ['T1589', 'T1566', 'T1059'],
      lastActivity: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'lazarus',
      name: 'Lazarus Group',
      origin: 'North Korea',
      type: 'Nation-State',
      sectors: ['Finance', 'Government'],
      ttps: ['T1204', 'T1105', 'T1204.001'],
      lastActivity: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  // 4. OSINT feed status. CISA and MITRE statuses now reflect whether the
  // fetch actually succeeded this run.
  const feedStatus = {
    timestamp,
    sources: [
      {
        name: 'CISA KEV',
        status: cisaStatus,
        accuracy: 100,
        totalRecords: cisaTotal,
        lastUpdate: cisaLastUpdate
      },
      {
        name: 'MITRE ATT&CK',
        status: mitreStatus,
        accuracy: 100,
        totalRecords: techniques.length,
        lastUpdate: timestamp
      },
      {
        name: 'AlienVault OTX',
        status: 'healthy',
        accuracy: 92,
        totalRecords: 1247,
        lastUpdate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        name: 'Abuse.ch',
        status: 'healthy',
        accuracy: 88,
        totalRecords: 3456,
        lastUpdate: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
      }
    ]
  };

  // 5. Metric aggregates
  const metrics = {
    timestamp,
    activeThreats: {
      shodan: Math.floor(Math.random() * 300) + 200,
      virusTotal: Math.floor(Math.random() * 200) + 100,
      mitre: techniques.length,
      industryAlerts: Math.floor(Math.random() * 80) + 40
    },
    trendingTechniques: generateTrendingData(),
    threatHeatmap: generateHeatmapData(),
    sectorThreatLevels: {
      healthcare: Math.floor(Math.random() * 10) + 6,
      finance: Math.floor(Math.random() * 10) + 7,
      government: Math.floor(Math.random() * 10) + 8,
      technology: Math.floor(Math.random() * 10) + 6,
      manufacturing: Math.floor(Math.random() * 10) + 5,
      retail: Math.floor(Math.random() * 10) + 5,
      energy: Math.floor(Math.random() * 10) + 7,
      education: Math.floor(Math.random() * 10) + 4
    }
  };

  // 6. Write all JSON files. Filenames and field names are unchanged from the
  // original so the frontend reads them exactly as before.
  try {
    fs.writeFileSync(
      path.join(DATA_DIR, 'threats.json'),
      JSON.stringify({ timestamp, vulnerabilities: cisaVulns, actors: threatActors }, null, 2)
    );

    fs.writeFileSync(
      path.join(DATA_DIR, 'techniques.json'),
      JSON.stringify({ timestamp, techniques, total: mitreTotal }, null, 2)
    );

    fs.writeFileSync(
      path.join(DATA_DIR, 'feeds.json'),
      JSON.stringify(feedStatus, null, 2)
    );

    fs.writeFileSync(
      path.join(DATA_DIR, 'metrics.json'),
      JSON.stringify(metrics, null, 2)
    );

    console.log('OSINT data fetch completed.');
    console.log(`CISA: ${cisaStatus} (${cisaTotal} records). MITRE: ${mitreStatus} (${mitreTotal} techniques).`);
    console.log(`Updated files in ${DATA_DIR}`);
  } catch (e) {
    console.error('Failed to write data files:', e.message);
    process.exit(1);
  }
}

function generateTrendingData() {
  const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];
  return {
    initialAccess: weeks.map((w, i) => 42 + (i * 4)),
    persistence: weeks.map((w, i) => 38 + (i * 3)),
    exfiltration: weeks.map((w, i) => 25 + (i * 3)),
    commandControl: weeks.map((w, i) => 35 + (i * 2)),
    weeks
  };
}

function generateHeatmapData() {
  return {
    sectors: ['Healthcare', 'Finance', 'Government', 'Tech', 'Manufacturing', 'Retail', 'Energy', 'Education'],
    threatLevels: [8, 9, 10, 8, 6, 5, 8, 4]
  };
}

fetchOSINTData().catch(err => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});

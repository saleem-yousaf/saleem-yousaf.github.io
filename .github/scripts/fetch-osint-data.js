#!/usr/bin/env node

// BreachForge TI Portal - OSINT data fetcher (honest v1)
// Sources:
//   CISA KEV       - real, no API key
//   MITRE ATT&CK   - real, no API key
//   AlienVault OTX - real, needs OTX_API_KEY (GitHub secret)
//   Abuse.ch       - real, needs ABUSE_CH_AUTH_KEY (GitHub secret), via ThreatFox
// No values are invented. A feed that cannot connect is reported as
// "degraded" or "not_connected", never as fake-healthy.

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(process.cwd(), 'breachforge/intel/data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const OTX_API_KEY = process.env.OTX_API_KEY || '';
const ABUSE_CH_AUTH_KEY = process.env.ABUSE_CH_AUTH_KEY || '';

const DAY = 24 * 60 * 60 * 1000;

// Generic HTTPS request returning parsed JSON. Supports GET and POST,
// custom headers, redirects, and surfaces non-2xx responses as errors.
function httpRequest(url, { method = 'GET', headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const payload = body == null ? null : (typeof body === 'string' ? body : JSON.stringify(body));
    const baseHeaders = { 'User-Agent': 'BreachForge-TI-Bot/1.0', ...headers };
    if (payload != null) baseHeaders['Content-Length'] = Buffer.byteLength(payload);

    const options = { method, hostname: u.hostname, path: u.pathname + u.search, headers: baseHeaders };
    const req = https.request(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(httpRequest(res.headers.location, { method, headers, body }));
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        let errBody = '';
        res.on('data', c => errBody += c);
        res.on('end', () => reject(new Error(`HTTP ${res.statusCode} for ${url}${errBody ? ': ' + errBody.slice(0, 200) : ''}`)));
        return;
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Invalid JSON from ${url}: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    if (payload != null) req.write(payload);
    req.end();
  });
}

// ---- AlienVault OTX (real, key required) ----
async function getOtx() {
  if (!OTX_API_KEY) {
    return { status: 'not_connected', records: null, note: 'OTX_API_KEY secret not set' };
  }
  try {
    const res = await httpRequest('https://otx.alienvault.com/api/v1/pulses/subscribed?limit=10&page=1', {
      headers: { 'X-OTX-API-KEY': OTX_API_KEY }
    });
    const count = typeof res.count === 'number'
      ? res.count
      : (Array.isArray(res.results) ? res.results.length : 0);
    return { status: 'healthy', records: count };
  } catch (e) {
    return { status: 'degraded', records: null, note: e.message };
  }
}

// ---- Abuse.ch ThreatFox (real, key required) ----
async function getThreatFox() {
  if (!ABUSE_CH_AUTH_KEY) {
    return { status: 'not_connected', records: null, note: 'ABUSE_CH_AUTH_KEY secret not set' };
  }
  try {
    const res = await httpRequest('https://threatfox-api.abuse.ch/api/v1/', {
      method: 'POST',
      headers: { 'Auth-Key': ABUSE_CH_AUTH_KEY, 'Content-Type': 'application/json' },
      body: { query: 'get_iocs', days: 1 }
    });
    const rows = Array.isArray(res.data) ? res.data : [];
    if (res.query_status && res.query_status !== 'ok') {
      return { status: 'degraded', records: rows.length, note: `query_status: ${res.query_status}` };
    }
    return { status: 'healthy', records: rows.length };
  } catch (e) {
    return { status: 'degraded', records: null, note: e.message };
  }
}

async function run() {
  const timestamp = new Date().toISOString();
  const now = Date.now();

  // ---- CISA KEV (real, no key) ----
  let cisaStatus = 'healthy';
  let cisaTotal = 0;
  let cisaReleased = null;
  let cisaVulns = [];
  let kev7 = 0;
  let kevByWeek = { weeks: [], counts: [] };
  try {
    console.log('Fetching CISA KEV...');
    const data = await httpRequest('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json');
    const vulns = Array.isArray(data.vulnerabilities) ? data.vulnerabilities : [];
    cisaTotal = vulns.length;
    cisaReleased = data.dateReleased ? new Date(data.dateReleased).toISOString() : timestamp;

    const sorted = [...vulns].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    cisaVulns = sorted.slice(0, 10).map(v => ({
      cveId: v.cveID,
      description: v.shortDescription || '',
      dateAdded: v.dateAdded,
      vendor: v.vendorProject || '',
      product: v.product || ''
    }));

    kev7 = vulns.filter(v => (now - new Date(v.dateAdded).getTime()) <= 7 * DAY).length;

    // Real 8-week histogram of KEV additions (bucket 0 = this week)
    const buckets = new Array(8).fill(0);
    for (const v of vulns) {
      const ageDays = (now - new Date(v.dateAdded).getTime()) / DAY;
      if (ageDays >= 0 && ageDays < 56) buckets[Math.floor(ageDays / 7)]++;
    }
    const weeks = [];
    const counts = [];
    for (let i = 7; i >= 0; i--) {
      counts.push(buckets[i]);
      const d = new Date(now - i * 7 * DAY);
      weeks.push(`${d.getMonth() + 1}/${d.getDate()}`);
    }
    kevByWeek = { weeks, counts };
  } catch (e) {
    console.error('CISA KEV failed:', e.message);
    cisaStatus = 'degraded';
  }

  // ---- MITRE ATT&CK Enterprise (real, no key) ----
  let mitreStatus = 'healthy';
  let techCount = 0;
  let groupCount = 0;
  let actors = [];
  try {
    console.log('Fetching MITRE ATT&CK Enterprise...');
    const data = await httpRequest('https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json');
    const objects = Array.isArray(data.objects) ? data.objects : [];
    const isActive = o => !o.revoked && !o.x_mitre_deprecated;

    const techniques = objects.filter(o => o.type === 'attack-pattern' && isActive(o));
    techCount = techniques.length;

    const groups = objects.filter(o => o.type === 'intrusion-set' && isActive(o));
    groupCount = groups.length;

    // Count techniques each group "uses" via STIX relationship objects (real)
    const techniqueIds = new Set(techniques.map(t => t.id));
    const usesByGroup = {};
    for (const o of objects) {
      if (o.type === 'relationship' && o.relationship_type === 'uses'
        && typeof o.source_ref === 'string' && o.source_ref.startsWith('intrusion-set--')
        && typeof o.target_ref === 'string' && techniqueIds.has(o.target_ref)) {
        usesByGroup[o.source_ref] = (usesByGroup[o.source_ref] || 0) + 1;
      }
    }

    actors = groups.map(g => {
      const rawAliases = Array.isArray(g.aliases) ? g.aliases
        : (Array.isArray(g.x_mitre_aliases) ? g.x_mitre_aliases : []);
      return {
        name: g.name,
        aliases: rawAliases.filter(a => a && a !== g.name),
        techniqueCount: usesByGroup[g.id] || 0,
        lastModified: g.modified ? new Date(g.modified).toISOString() : null
      };
    })
      .sort((a, b) => b.techniqueCount - a.techniqueCount)
      .slice(0, 10);
  } catch (e) {
    console.error('MITRE ATT&CK failed:', e.message);
    mitreStatus = 'degraded';
  }

  // ---- Keyed feeds ----
  console.log('Checking AlienVault OTX...');
  const otx = await getOtx();
  console.log('Checking Abuse.ch ThreatFox...');
  const tf = await getThreatFox();

  // ---- feeds.json ----
  const feeds = {
    timestamp,
    sources: [
      { name: 'CISA KEV', status: cisaStatus, records: cisaTotal, lastUpdate: cisaReleased || timestamp },
      { name: 'MITRE ATT&CK', status: mitreStatus, records: techCount, lastUpdate: timestamp },
      { name: 'AlienVault OTX', status: otx.status, records: otx.records, lastUpdate: otx.status === 'healthy' ? timestamp : null, note: otx.note },
      { name: 'Abuse.ch ThreatFox', status: tf.status, records: tf.records, lastUpdate: tf.status === 'healthy' ? timestamp : null, note: tf.note }
    ]
  };

  // ---- metrics.json (real tiles + real KEV histogram) ----
  const metrics = {
    timestamp,
    tiles: [
      { label: 'KEV Total', value: cisaTotal, source: 'CISA KEV' },
      { label: 'KEV (7 days)', value: kev7, source: 'CISA KEV' },
      { label: 'ATT&CK Techniques', value: techCount, source: 'MITRE' },
      { label: 'ATT&CK Groups', value: groupCount, source: 'MITRE' }
    ],
    kevByWeek
  };

  // ---- threats.json ----
  const threats = { timestamp, vulnerabilities: cisaVulns, actors };

  // ---- write ----
  try {
    writeJson('feeds.json', feeds);
    writeJson('metrics.json', metrics);
    writeJson('threats.json', threats);
  } catch (e) {
    console.error('Failed to write data files:', e.message);
    process.exit(1);
  }

  console.log('OSINT data fetch completed.');
  console.log(`CISA KEV: ${cisaStatus} (${cisaTotal} total, ${kev7} in 7d)`);
  console.log(`MITRE: ${mitreStatus} (${techCount} techniques, ${groupCount} groups)`);
  console.log(`OTX: ${otx.status}${otx.note ? ' - ' + otx.note : ''}`);
  console.log(`ThreatFox: ${tf.status}${tf.note ? ' - ' + tf.note : ''}`);
}

function writeJson(name, obj) {
  fs.writeFileSync(path.join(DATA_DIR, name), JSON.stringify(obj, null, 2));
  console.log(`Wrote ${name}`);
}

run().catch(e => {
  console.error('Unexpected error:', e.message);
  process.exit(1);
});

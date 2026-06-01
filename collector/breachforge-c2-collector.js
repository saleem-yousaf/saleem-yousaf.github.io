#!/usr/bin/env node
/*
 * BreachForge C2 collector
 * Pulls open-source command-and-control infrastructure from abuse.ch and writes
 * c2_infrastructure.json into the intel data directory the landing page reads.
 *
 * Sources:
 *   - Feodo Tracker  (botnet C2 IPs, no key)        https://feodotracker.abuse.ch/downloads/ipblocklist.json
 *   - ThreatFox      (recent IOCs, free auth key)   https://threatfox-api.abuse.ch/api/v1/
 *
 * Run every 2h. Examples:
 *   GitHub Action cron:  "0 *\/2 * * *"
 *   cron:                0 *\/2 * * *  node breachforge-c2-collector.js
 *   Cloudflare Worker:   scheduled trigger every 2h, write to R2/D1 instead of file
 *
 * Optional env:
 *   THREATFOX_KEY   abuse.ch Auth-Key to include ThreatFox results
 *   OUT_DIR         output directory (default ./breachforge/intel/data)
 *   MAX_ROWS        max rows to keep (default 40)
 *
 * Requires Node 18+ (global fetch). No external dependencies.
 */
const fs = require("fs");
const path = require("path");

const OUT_DIR = process.env.OUT_DIR || path.join("breachforge", "intel", "data");
const MAX_ROWS = parseInt(process.env.MAX_ROWS || "40", 10);
const KEY = process.env.THREATFOX_KEY || "";

function isoOrNull(s) {
  if (!s) return null;
  const d = new Date(s.replace(" ", "T") + (/[zZ]|[+]/.test(s) ? "" : "Z"));
  return isNaN(d.getTime()) ? null : d.toISOString();
}

async function feodo() {
  try {
    const r = await fetch("https://feodotracker.abuse.ch/downloads/ipblocklist.json");
    if (!r.ok) return [];
    const rows = await r.json();
    return (Array.isArray(rows) ? rows : []).map(x => ({
      family: x.malware || "unknown",
      ip: x.ip_address || "",
      country: x.country || "",
      first_seen: isoOrNull(x.first_seen) || isoOrNull(x.last_online),
      source: "Feodo Tracker"
    }));
  } catch (e) { return []; }
}

async function threatfox() {
  if (!KEY) return [];
  try {
    const r = await fetch("https://threatfox-api.abuse.ch/api/v1/", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Auth-Key": KEY },
      body: JSON.stringify({ query: "get_iocs", days: 1 })
    });
    if (!r.ok) return [];
    const j = await r.json();
    const data = (j && j.data) || [];
    return data
      .filter(x => x.ioc_type === "ip:port" || x.ioc_type === "domain")
      .map(x => ({
        family: x.malware_printable || x.threat_type || "unknown",
        ip: (x.ioc || "").split(":")[0],
        country: "",
        first_seen: isoOrNull(x.first_seen),
        source: "ThreatFox"
      }));
  } catch (e) { return []; }
}

(async () => {
  const all = [...await feodo(), ...await threatfox()]
    .filter(x => x.ip)
    .sort((a, b) => new Date(b.first_seen || 0) - new Date(a.first_seen || 0))
    .slice(0, MAX_ROWS);

  const out = { generated: new Date().toISOString(), total: all.length, iocs: all };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, "c2_infrastructure.json");
  fs.writeFileSync(file, JSON.stringify(out, null, 0));
  console.log(`wrote ${all.length} C2 indicators to ${file} at ${out.generated}`);
})();

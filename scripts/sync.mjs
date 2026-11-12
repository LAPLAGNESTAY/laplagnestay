import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { offers } from "../site/config.js";

const secrets = {
  "studio-plagnevillages": "ICAL_HAMEAUX",
  "studio-aspen": "ICAL_ASPEN_STUDIO",
  "appart-aspen": "ICAL_ASPEN_ENTIER",
  "coloc1-aspen": "ICAL_ASPEN_COLOC1",
  "coloc2-aspen": "ICAL_ASPEN_COLOC2"
};
const airbnbHosts = new Set(["www.airbnb.com", "www.airbnb.fr", "airbnb.com", "airbnb.fr"]);
const dateKey = (date) => date.toISOString().slice(0, 10);
const DAY = 86400000;

function parseDate(line, property) {
  const match = new RegExp("^" + property + "(?:;VALUE=DATE)?:(\\d{4})(\\d{2})(\\d{2})$", "i").exec(line);
  if (!match) throw new Error("Unsupported date");
  const value = match.slice(1).join("-");
  const date = new Date(value + "T00:00:00Z");
  if (!Number.isFinite(date.valueOf()) || dateKey(date) !== value) throw new Error("Invalid date");
  return value;
}

export function readCalendar(text) {
  const lines = text.replace(/^\uFEFF/, "").replace(/\r?\n[ \t]/g, "").trim().split(/\r?\n/);
  if (lines[0]?.toUpperCase() !== "BEGIN:VCALENDAR" || lines.at(-1)?.toUpperCase() !== "END:VCALENDAR" ||
      !lines.some(line => line.toUpperCase() === "VERSION:2.0")) throw new Error("Invalid calendar");
  const ranges = [];
  let event = null;
  for (const line of lines.slice(1, -1)) {
    const upper = line.toUpperCase();
    if (upper === "BEGIN:VEVENT" && !event) {
      event = {};
    } else if (upper === "END:VEVENT" && event) {
      if (!event.start || !event.end || event.end <= event.start) throw new Error("Invalid range");
      ranges.push([event.start, event.end]);
      event = null;
    } else if (/^(BEGIN|END):/.test(upper)) {
      throw new Error("Unsupported calendar component");
    } else if (event) {
      if (/^(RRULE|RDATE|EXDATE|EXRULE|RECURRENCE-ID)[;:]/.test(upper)) throw new Error("Unsupported recurrence");
      if (/^DTSTART[;:]/.test(upper)) {
        if (event.start) throw new Error("Duplicate date");
        event.start = parseDate(line, "DTSTART");
      }
      if (/^DTEND[;:]/.test(upper)) {
        if (event.end) throw new Error("Duplicate date");
        event.end = parseDate(line, "DTEND");
      }
    }
  }
  if (event) throw new Error("Incomplete event");
  return ranges;
}

function union(ranges, from, until) {
  const clipped = ranges.filter(([start, end]) => start < until && end > from)
    .map(([start, end]) => [start < from ? from : start, end > until ? until : end])
    .sort((a, b) => a[0].localeCompare(b[0]));
  const result = [];
  for (const [start, end] of clipped) {
    const last = result.at(-1);
    if (!last || last[1] < start) result.push([start, end]);
    else if (last[1] < end) last[1] = end;
  }
  return result;
}

export function snapshot(feeds, now = new Date()) {
  const paris = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });
  const parts = Object.fromEntries(paris.formatToParts(now).map(({ type, value }) => [type, value]));
  const from = [parts.year, parts.month, parts.day].join("-");
  const until = dateKey(new Date(Date.parse(from) + 365 * DAY));
  const aspen = offers.filter(offer => offer.residence === "aspen").flatMap(offer => feeds[offer.id]);
  return {
    updatedAt: now.toISOString(), from, until,
    offers: Object.fromEntries(offers.map(offer => [offer.id, union(offer.residence === "aspen" ? aspen : feeds[offer.id], from, until)]))
  };
}

async function readFeed(url) {
  const response = await fetch(url, { method: "GET", redirect: "error", signal: AbortSignal.timeout(20000) });
  if (!response.ok || !response.body) throw new Error();
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let body = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 2000000) {
      await reader.cancel();
      throw new Error();
    }
    body += decoder.decode(value, { stream: true });
  }
  return readCalendar(body + decoder.decode());
}

async function run() {
  const urls = new Map();
  const missing = Object.values(secrets).filter(name => !process.env[name]?.trim());
  if (missing.length) {
    console.log("Synchronisation en attente. Secrets manquants : " + missing.join(", "));
    return;
  }
  for (const [id, name] of Object.entries(secrets)) {
    try {
      const url = new URL(process.env[name].trim());
      if (url.protocol !== "https:" || !airbnbHosts.has(url.hostname) || url.port ||
          url.username || url.password || url.hash || !/^\/calendar\/ical\/[^/]+\.ics$/i.test(url.pathname)) throw new Error();
      urls.set(id, url);
    } catch {
      console.error("Format Airbnb invalide : " + name);
      process.exitCode = 1;
    }
  }
  if (process.exitCode) return;
  if (new Set([...urls.values()].map(url => url.pathname)).size !== urls.size) {
    console.error("Plusieurs flux pointent vers la même annonce.");
    process.exitCode = 1;
    return;
  }
  const results = await Promise.allSettled([...urls.values()].map(readFeed));
  const feeds = {};
  [...urls.keys()].forEach((id, i) => {
    const result = results[i];
    if (result.status === "fulfilled") feeds[id] = result.value;
    else {
      console.error("Échec de récupération ou format iCal non pris en charge : " + secrets[id]);
      process.exitCode = 1;
    }
  });
  if (process.exitCode) return;
  await writeFile(new URL("../data/availability.json", import.meta.url), JSON.stringify(snapshot(feeds)) + "\n");
  console.log("Instantané de disponibilité généré.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch(() => {
    console.error("Échec de synchronisation. Aucun détail privé affiché.");
    process.exitCode = 1;
  });
}

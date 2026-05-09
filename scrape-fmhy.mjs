import fs from "node:fs/promises";
import * as cheerio from "cheerio";

const SOURCE_URL = "https://fmhy.net/video";

function text(s = "") {
  return s.replace(/\s+/g, " ").trim();
}

function abs(href, base) {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

function host(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function favicon(url) {
  try {
    const h = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${h}&sz=256`;
  } catch {
    return "";
  }
}

function slug(s = "") {
  return s.toLowerCase().replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "");
}

function inferTags(category, title, note, hostname) {
  const blob = `${category} ${title} ${note} ${hostname}`.toLowerCase();
  const tags = new Set();

  if (/anime/.test(blob)) tags.add("anime");
  if (/tv|shows|series/.test(blob)) tags.add("tv");
  if (/movie|movies|films/.test(blob)) tags.add("movies");
  if (/sport/.test(blob)) tags.add("sports");
  if (/android tv|firestick|stremio|cloudstream|kodi/.test(blob)) tags.add("tv-app");
  if (/sub|subtitle/.test(blob)) tags.add("subtitles");
  if (/torrent/.test(blob)) tags.add("torrent");
  if (/stream|watch|embed/.test(blob)) tags.add("streaming");

  if (tags.size === 0) tags.add("general");
  return [...tags];
}

const res = await fetch(SOURCE_URL, {
  headers: { "user-agent": "Mozilla/5.0" }
});

if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

const html = await res.text();
const $ = cheerio.load(html);

const root =
  $("main").first().length ? $("main").first() :
  $("#VPContent").first().length ? $("#VPContent").first() :
  $("body");

const sections = [];
let current = null;

root.find("h1, h2, h3, h4, p, ul, ol, table").each((_, el) => {
  const tag = el.tagName?.toLowerCase();

  if (["h2", "h3", "h4"].includes(tag)) {
    const category = text($(el).text());
    if (category) {
      current = { category, slug: slug(category), items: [] };
      sections.push(current);
    }
    return;
  }

  if (!current) return;

  $(el).find("a[href]").each((__, a) => {
    const title = text($(a).text());
    const url = abs($(a).attr("href"), SOURCE_URL);
    if (!title || !url) return;
    if (url.includes("fmhy.net") || url.includes("github.com/fmhy/FMHY")) return;

    const parentText = text($(a).closest("li, p, td").text() || $(a).parent().text());
    const note = text(parentText.replace(title, "").replace(/\s*[-–—:]\s*/g, " "));
    const hostname = host(url);

    current.items.push({
      title,
      url,
      note,
      hostname,
      favicon: favicon(url),
      poster: "",
      category: current.category,
      tags: inferTags(current.category, title, note, hostname)
    });
  });
});

const cleaned = sections
  .map(section => {
    const seen = new Set();
    const items = section.items.filter(item => {
      const key = `${item.title}|${item.url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return { ...section, items };
  })
  .filter(section => section.items.length);

await fs.writeFile("data.json", JSON.stringify(cleaned, null, 2));
await fs.writeFile("favorites.json", JSON.stringify([], null, 2));

const total = cleaned.reduce((n, s) => n + s.items.length, 0);
console.log(`Saved ${cleaned.length} sections, ${total} items`);

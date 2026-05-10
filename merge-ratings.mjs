import fs from 'node:fs/promises';

const RAW_URL = 'https://raw.githubusercontent.com/wiki/fmhy/FMHY/Stream-Site-Grading.md';

function norm(s = '') {
  return s
    .toLowerCase()
    .replace(/[`*_~:()\[\]{}|]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function aliasSet(title = '') {
  const base = norm(title);
  const set = new Set([base]);
  set.add(base.replace(/\b(tv|site|official|watch|stream|streams)\b/g, '').replace(/\s+/g, ' ').trim());
  set.add(base.replace(/\b(official|app)\b/g, '').replace(/\s+/g, ' ').trim());
  return [...set].filter(Boolean);
}

function parseRatings(md) {
  const lines = md.split(/\r?\n/);
  const ratings = [];
  let section = '';
  let title = '';

  for (const line of lines) {
    const sec = line.match(/^#\s+(.+?)\s*$/);
    if (sec) {
      section = sec[1].trim();
      title = '';
      continue;
    }

    const site = line.match(/^##\s+(.+?)\s*$/);
    if (site) {
      title = site[1].trim();
      continue;
    }

    const score = line.match(/^###\s+Score:\s*(\d+)\s*\/\s*(\d+)\s*$/i);
    if (score && title) {
      const points = Number(score[1]);
      const max = Number(score[2]);
      const score100 = max > 0 ? Math.round((points / max) * 100) : 0;
      ratings.push({
        title,
        section,
        points,
        max,
        score100,
        label: `${score100}/100`,
        rawLabel: `${points}/${max}`,
        aliases: aliasSet(title)
      });
    }
  }

  return ratings;
}

function findMatch(item, ratings) {
  const titleAliases = aliasSet(item.title);
  for (const r of ratings) {
    for (const a of r.aliases) {
      if (titleAliases.includes(a)) return r;
    }
  }

  const host = norm(item.hostname || '');
  if (host) {
    const shortHost = host
      .replace(/\b(www|watch|play|app|tv|to|sx|sh|io|cc|ru|vc|bz|ms|is|in|me|pro|net|org|com)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    for (const r of ratings) {
      const rt = norm(r.title);
      if (rt && (host.includes(rt) || shortHost.includes(rt) || rt.includes(shortHost))) return r;
    }
  }

  return null;
}

const raw = await fs.readFile('data.json', 'utf8');
const data = JSON.parse(raw);

const res = await fetch(RAW_URL, { headers: { 'user-agent': 'Mozilla/5.0' } });
if (!res.ok) throw new Error(`Failed to fetch grading markdown: ${res.status}`);
const md = await res.text();
const ratings = parseRatings(md);

let matched = 0;
for (const section of data) {
  for (const item of section.items || []) {
    const match = findMatch(item, ratings);
    if (!match) {
      item.rating = null;
      continue;
    }
    item.rating = {
      points: match.points,
      max: match.max,
      score100: match.score100,
      label: match.label,
      rawLabel: match.rawLabel,
      gradeSection: match.section
    };
    matched += 1;
  }
}

await fs.writeFile('data.json', JSON.stringify(data, null, 2));
console.log(`Ratings merged: ${matched} matched of ${ratings.length} graded sites`);

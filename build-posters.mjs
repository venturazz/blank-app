import fs from "node:fs/promises";

const raw = await fs.readFile("data.json", "utf8");
const data = JSON.parse(raw);

function colorFrom(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return {
    a: `hsl(${h % 360} 65% 42%)`,
    b: `hsl(${(h + 45) % 360} 70% 26%)`
  };
}

function esc(str = "") {
  return String(str).replace(/[&<>"']/g, s => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[s]));
}

function wrapLines(text, max = 18) {
  const words = String(text || "").split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= max) current = next;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
}

function svgPoster(title, category, hostname) {
  const { a, b } = colorFrom(String(title) + String(hostname));
  const safeCat = esc(category || "Streaming");
  const safeHost = esc(hostname || "");
  const lines = wrapLines(title, 18);
  const titleSvg = lines.map((line, i) => {
    const y = 190 + i * 52;
    return `<text x="40" y="${y}" fill="white" font-family="Arial, sans-serif" font-size="38" font-weight="800">${esc(line)}</text>`;
  }).join("");

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${a}"/>
          <stop offset="100%" stop-color="${b}"/>
        </linearGradient>
      </defs>
      <rect width="400" height="600" fill="url(#g)"/>
      <rect x="24" y="24" width="352" height="552" rx="28" fill="rgba(0,0,0,.18)"/>
      <text x="40" y="92" fill="white" font-family="Arial, sans-serif" font-size="22" font-weight="700">${safeCat}</text>
      ${titleSvg}
      <text x="40" y="540" fill="rgba(255,255,255,.88)" font-family="Arial, sans-serif" font-size="20">${safeHost}</text>
    </svg>
  `)}`;
}

for (const section of data) {
  for (const item of section.items || []) {
    item.poster = svgPoster(item.title, item.category || section.category, item.hostname);
  }
}

await fs.writeFile("data.json", JSON.stringify(data, null, 2));
console.log("Poster placeholders added");

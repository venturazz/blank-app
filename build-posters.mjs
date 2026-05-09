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
  return str.replace(/[&<>"']/g, s => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[s]));
}

function svgPoster(title, category, hostname) {
  const { a, b } = colorFrom(title + hostname);
  const safeTitle = esc(title);
  const safeCat = esc(category);
  const safeHost = esc(hostname);

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="600">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${a}"/>
          <stop offset="100%" stop-color="${b}"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <rect x="24" y="24" width="352" height="552" rx="28" fill="rgba(0,0,0,.18)"/>
      <text x="40" y="92" fill="white" font-family="Arial, sans-serif" font-size="22" font-weight="700">${safeCat}</text>
      <foreignObject x="40" y="130" width="320" height="260">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,sans-serif;color:white;font-size:38px;font-weight:800;line-height:1.08;">
          ${safeTitle}
        </div>
      </foreignObject>
      <text x="40" y="540" fill="rgba(255,255,255,.88)" font-family="Arial, sans-serif" font-size="20">${safeHost}</text>
    </svg>
  `)}`;
}

for (const section of data) {
  for (const item of section.items) {
    item.poster = svgPoster(item.title, item.category, item.hostname);
  }
}

await fs.writeFile("data.json", JSON.stringify(data, null, 2));
console.log("Poster placeholders added");

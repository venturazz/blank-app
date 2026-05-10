const app = document.getElementById("app");
const searchInput = document.getElementById("search");

const MAX_ITEMS = 60;

let DATA = [];
let favorites = JSON.parse(localStorage.getItem("fmhy-favorites") || "[]");
let searchTimer;

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, s => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[s]));
}

function ratingScore(item) {
  return item.rating?.score100 ?? -1;
}

function sortItemsByRating(items) {
  return [...items].sort((a, b) =>
    ratingScore(b) - ratingScore(a) ||
    a.title.localeCompare(b.title)
  );
}

function isFav(url) {
  return favorites.includes(url);
}

function saveFavorites() {
  localStorage.setItem("fmhy-favorites", JSON.stringify(favorites));
}

function removeFavorite(url) {
  favorites = favorites.filter(x => x !== url);
  saveFavorites();
  render(DATA);
}

function activeItems(items) {
  return (items || []).filter(item => item.health?.state !== "disabled");
}

function flattenItems(data) {
  return data.flatMap(section => activeItems(section.items));
}

function getFavoriteItems(data) {
  const map = new Map(flattenItems(data).map(item => [item.url, item]));
  return sortItemsByRating(favorites.map(url => map.get(url)).filter(Boolean));
}

function cardMatch(item, q) {
  const blob = `${item.title} ${item.note || ""} ${item.hostname || ""} ${(item.tags || []).join(" ")}`.toLowerCase();
  return blob.includes(q);
}

function healthInfo(item) {
  const h = item.health || {};

  if (!item.health) {
    return { cls: "unknown", label: "Unchecked", title: "Not checked yet" };
  }

  if (h.ok) {
    return {
      cls: "ok",
      label: h.status ? `OK ${h.status}` : "OK",
      title: `Checked: ${h.checkedAt || "-"}`
    };
  }

  return {
    cls: "bad",
    label: h.status ? `Issue ${h.status}` : "Issue",
    title: h.error || "Link check failed"
  };
}

function createCard(item) {
  const health = healthInfo(item);
  const ratingBadge = item.rating
    ? `<span class="status-badge ok">★ ${escapeHtml(item.rating.label)}</span>`
    : `<span class="status-badge unknown">Unrated</span>`;

  const visualSrc = item.favicon || item.poster || "";
  const visualClass = item.favicon ? "poster poster-icon" : "poster";

  const a = document.createElement("a");
  a.className = `card health-${health.cls}`;
  a.href = item.url;
  a.tabIndex = 0;
  a.title = health.title;

  a.innerHTML = `
    <div class="poster-wrap">
      ${visualSrc
        ? `<img class="${visualClass}" src="${escapeHtml(visualSrc)}" alt="${escapeHtml(item.title)}" loading="lazy">`
        : `<div class="poster-fallback always-show"><div class="poster-fallback-title">${escapeHtml(item.title)}</div></div>`}
    </div>
    <div class="info">
      <div class="title">${escapeHtml(item.title)}</div>
      <div class="meta">${escapeHtml(item.note || item.hostname || item.url)}</div>
      <div class="status-row">
        ${ratingBadge}
        <span class="status-badge ${health.cls}">${escapeHtml(health.label)}</span>
        ${item.health?.checkedAt ? `<span class="checked-time">${new Date(item.health.checkedAt).toLocaleDateString()}</span>` : ``}
      </div>
      <div class="actions">
        <button class="mini danger remove-btn">Remove</button>
      </div>
    </div>
  `;

  const img = a.querySelector(".poster");
  if (img) {
    img.addEventListener("error", () => {
      const wrap = a.querySelector(".poster-wrap");
      wrap.innerHTML = `<div class="poster-fallback always-show"><div class="poster-fallback-title">${escapeHtml(item.title)}</div></div>`;
    });
  }

  a.addEventListener("click", e => {
    if (e.target.closest(".remove-btn")) return;
    e.preventDefault();
    window.location.href = item.url;
  });

  a.querySelector(".remove-btn").addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    removeFavorite(item.url);
  });

  return a;
}

function render(data) {
  const q = searchInput.value.trim().toLowerCase();
  app.innerHTML = "";

  const items = getFavoriteItems(data).filter(item => cardMatch(item, q)).slice(0, MAX_ITEMS);

  if (!items.length) {
    app.innerHTML = `<div class="empty">No favorite sites found.</div>`;
    return;
  }

  const sec = document.createElement("section");
  sec.className = "section";

  const h2 = document.createElement("h2");
  h2.textContent = `Favorites (${items.length})`;

  const row = document.createElement("div");
  row.className = "row";

  items.forEach(item => row.appendChild(createCard(item)));

  sec.appendChild(h2);
  sec.appendChild(row);
  app.appendChild(sec);

  const typingInSearch = document.activeElement === searchInput;
  if (!typingInSearch) {
    const firstCard = document.querySelector(".card");
    if (firstCard) firstCard.focus();
  }
}

function visibleCards() {
  return [...document.querySelectorAll(".card")];
}

function columns() {
  const row = document.querySelector(".row");
  if (!row) return 5;
  return getComputedStyle(row).gridTemplateColumns.split(" ").length || 5;
}

document.addEventListener("keydown", e => {
  const list = visibleCards();
  const current = document.activeElement;
  const index = list.indexOf(current);
  if (index < 0) return;

  let next = index;
  const col = columns();
  if (e.key === "ArrowRight") next = Math.min(index + 1, list.length - 1);
  if (e.key === "ArrowLeft") next = Math.max(index - 1, 0);
  if (e.key === "ArrowDown") next = Math.min(index + col, list.length - 1);
  if (e.key === "ArrowUp") next = Math.max(index - col, 0);
  if (next !== index) {
    e.preventDefault();
    list[next].focus();
  }
});

searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    render(DATA);
    searchInput.focus();
    const len = searchInput.value.length;
    searchInput.setSelectionRange(len, len);
  }, 220);
});

fetch("./data.json")
  .then(r => r.json())
  .then(data => {
    DATA = data;
    render(DATA);
  })
  .catch(err => {
    app.innerHTML = `<div class="empty">Failed to load data.json: ${err.message}</div>`;
  });

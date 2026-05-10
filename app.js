const app = document.getElementById("app");
const searchInput = document.getElementById("search");
const filtersEl = document.getElementById("filters");
const backBtn = document.getElementById("backBtn");
const clearPinsBtn = document.getElementById("clearPinsBtn");

let DATA = [];
let favorites = JSON.parse(localStorage.getItem("fmhy-favorites") || "[]");
let activeTag = "all";

function saveFavorites() {
  localStorage.setItem("fmhy-favorites", JSON.stringify(favorites));
}

function uniq(arr) {
  return [...new Set(arr)];
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

function prepareSections(data) {
  return data.map(section => ({
    ...section,
    items: sortItemsByRating(section.items || [])
  }));
}

function isDisabled(item) {
  return item.health?.state === "disabled";
}

function activeItems(items) {
  return items.filter(item => !isDisabled(item));
}

function allTags(data) {
  return uniq(
    data.flatMap(section =>
      activeItems(section.items).flatMap(item => item.tags || [])
    )
  ).sort();
}

function isFav(url) {
  return favorites.includes(url);
}

function toggleFav(url) {
  if (isFav(url)) {
    favorites = favorites.filter(x => x !== url);
  } else {
    favorites.unshift(url);
  }
  saveFavorites();
  render(DATA);
}

function clearFavorites() {
  favorites = [];
  saveFavorites();
  render(DATA);
}

function flattenItems(data) {
  return data.flatMap(section => activeItems(section.items));
}

function getPinnedItems(data) {
  const map = new Map(flattenItems(data).map(item => [item.url, item]));
  return favorites.map(url => map.get(url)).filter(Boolean);
}

function createChip(tag, label = tag) {
  const btn = document.createElement("button");
  btn.className = `chip ${activeTag === tag ? "active" : ""}`;
  btn.textContent = label;
  btn.addEventListener("click", () => {
    activeTag = tag;
    render(DATA);
  });
  return btn;
}

function cardMatch(item, q) {
  const blob = `${item.title} ${item.note || ""} ${item.hostname || ""} ${(item.tags || []).join(" ")}`.toLowerCase();
  const tagOk =
    activeTag === "all" ||
    (activeTag === "favorites" && isFav(item.url)) ||
    (item.tags || []).includes(activeTag);

  return tagOk && blob.includes(q);
}

function healthInfo(item) {
  const h = item.health || {};

  if (item.health?.state === "disabled") {
    return {
      cls: "bad",
      label: `Disabled (${item.health.consecutiveFails})`,
      title: item.health.failReason || "Disabled after repeated failures"
    };
  }

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

function createCard(item, options = {}) {
  const { pinned = false } = options;
  const health = healthInfo(item);

  const ratingBadge = item.rating
    ? `<span class="status-badge ok">★ ${item.rating.label}</span>`
    : `<span class="status-badge unknown">Unrated</span>`;

  const a = document.createElement("a");
  a.className = `card health-${health.cls}`;
  a.href = item.url;
  a.tabIndex = 0;
  a.title = health.title;

  a.innerHTML = `
    <img class="poster" src="${item.poster || item.favicon || ""}" alt="${item.title}" loading="lazy">
    <div class="info">
      <div class="title">${item.title}</div>
      <div class="meta">${item.note || item.hostname || item.url}</div>
      <div class="status-row">
        ${ratingBadge}
        <span class="status-badge ${health.cls}">${health.label}</span>
        ${item.health?.checkedAt ? `<span class="checked-time">${new Date(item.health.checkedAt).toLocaleDateString()}</span>` : ``}
      </div>
      <div class="actions">
        <button class="mini fav-btn">${isFav(item.url) ? "★ Pinned" : "☆ Pin"}</button>
        ${pinned ? `<button class="mini danger unpin-btn">Remove</button>` : ``}
      </div>
    </div>
  `;

  a.addEventListener("click", e => {
    if (e.target.closest(".fav-btn") || e.target.closest(".unpin-btn")) return;
    e.preventDefault();
    window.location.href = item.url;
  });

  a.querySelector(".fav-btn").addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    toggleFav(item.url);
  });

  const unpinBtn = a.querySelector(".unpin-btn");
  if (unpinBtn) {
    unpinBtn.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      favorites = favorites.filter(x => x !== item.url);
      saveFavorites();
      render(DATA);
    });
  }

  return a;
}

function renderFilters() {
  filtersEl.innerHTML = "";
  filtersEl.appendChild(createChip("all", "All"));
  filtersEl.appendChild(createChip("favorites", "Favorites"));
  for (const tag of allTags(DATA)) {
    filtersEl.appendChild(createChip(tag, tag));
  }
}

function renderPinnedSection(data, q) {
  const pinnedItems = getPinnedItems(data).filter(item => cardMatch(item, q));
  if (!pinnedItems.length) return null;

  const wrap = document.createElement("section");
  wrap.className = "section pinned-wrap";

  const head = document.createElement("div");
  head.className = "pinned-head";
  head.innerHTML = `
    <h2>Pinned</h2>
    <div class="pinned-note">${pinnedItems.length} shortcut${pinnedItems.length > 1 ? "s" : ""}</div>
  `;

  const row = document.createElement("div");
  row.className = "row pinned-row";

  pinnedItems.forEach(item => {
    row.appendChild(createCard(item, { pinned: true }));
  });

  wrap.appendChild(head);
  wrap.appendChild(row);
  return wrap;
}

function renderSections(data, q) {
  let visibleCount = 0;

  data.forEach(section => {
    const matched = activeItems(section.items).filter(item => cardMatch(item, q));

    const withoutPinnedDupes =
      (activeTag === "favorites"
        ? matched
        : matched.filter(item => !isFav(item.url)))
      .slice(0, 24);

    if (!withoutPinnedDupes.length) return;

    visibleCount += withoutPinnedDupes.length;

    const sec = document.createElement("section");
    sec.className = "section";

    const h2 = document.createElement("h2");
    h2.textContent = section.category;

    const row = document.createElement("div");
    row.className = "row";

    withoutPinnedDupes.forEach(item => {
      row.appendChild(createCard(item));
    });

    sec.appendChild(h2);
    sec.appendChild(row);
    app.appendChild(sec);
  });

  return visibleCount;
}

function render(data) {
  const q = searchInput.value.trim().toLowerCase();
  app.innerHTML = "";
  renderFilters();

  const pinnedSection = renderPinnedSection(data, q);
  if (pinnedSection && activeTag !== "favorites") {
    app.appendChild(pinnedSection);
  }

  let visibleCount = 0;

  if (activeTag === "favorites") {
    const favItems = getPinnedItems(data).filter(item => cardMatch(item, q));

    if (favItems.length) {
      const sec = document.createElement("section");
      sec.className = "section";

      const h2 = document.createElement("h2");
      h2.textContent = "Favorites";

      const row = document.createElement("div");
      row.className = "row";

      favItems.forEach(item => row.appendChild(createCard(item, { pinned: true })));

      sec.appendChild(h2);
      sec.appendChild(row);
      app.appendChild(sec);
      visibleCount = favItems.length;
    }
  } else {
    visibleCount += renderSections(data, q);
    if (pinnedSection) {
      visibleCount += getPinnedItems(data).filter(item => cardMatch(item, q)).length;
    }
  }

  if (!visibleCount) {
    app.innerHTML = `<div class="empty">No matching sites found.</div>`;
  }

  const firstCard = document.querySelector(".card");
  if (firstCard) firstCard.focus();
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

searchInput.addEventListener("input", () => render(DATA));

backBtn?.addEventListener("click", () => history.back());

clearPinsBtn?.addEventListener("click", () => {
  if (confirm("Clear all pinned favorites?")) {
    clearFavorites();
  }
});

fetch("./data.json")
  .then(r => r.json())
  .then(data => {
    DATA = prepareSections(data);
    render(DATA);
  })
  .catch(err => {
    app.innerHTML = `<div class="empty">Failed to load data.json: ${err.message}</div>`;
  });
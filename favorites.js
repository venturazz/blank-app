const app = document.getElementById("app");
const searchInput = document.getElementById("search");

let DATA = [];
let favorites = JSON.parse(localStorage.getItem("fmhy-favorites") || "[]");

function flattenItems(data) {
  return data.flatMap(section => section.items || []);
}

function getFavoriteItems(data) {
  const all = flattenItems(data);
  const map = new Map(all.map(item => [item.url, item]));
  return favorites.map(url => map.get(url)).filter(Boolean);
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

function toggleFav(url) {
  if (favorites.includes(url)) {
    favorites = favorites.filter(x => x !== url);
  } else {
    favorites.unshift(url);
  }
  localStorage.setItem("fmhy-favorites", JSON.stringify(favorites));
  render();
}

function createCard(item) {
  const health = healthInfo(item);

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
        <span class="status-badge ${health.cls}">${health.label}</span>
        ${item.health?.checkedAt ? `<span class="checked-time">${new Date(item.health.checkedAt).toLocaleDateString()}</span>` : ``}
      </div>
      <div class="actions">
        <button class="mini danger remove-btn">Remove</button>
      </div>
    </div>
  `;

  a.addEventListener("click", e => {
    if (e.target.closest(".remove-btn")) return;
    e.preventDefault();
    window.location.href = item.url;
  });

  a.querySelector(".remove-btn").addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    toggleFav(item.url);
  });

  return a;
}

function render() {
  const q = searchInput.value.trim().toLowerCase();
  const items = getFavoriteItems(DATA).filter(item => {
    const blob = `${item.title} ${item.note || ""} ${item.hostname || ""}`.toLowerCase();
    return blob.includes(q);
  });

  app.innerHTML = "";

  if (!items.length) {
    app.innerHTML = `<div class="empty">No favorite sites yet.</div>`;
    return;
  }

  const section = document.createElement("section");
  section.className = "section";

  const h2 = document.createElement("h2");
  h2.textContent = "My Favorites";

  const row = document.createElement("div");
  row.className = "row";

  items.forEach(item => row.appendChild(createCard(item)));

  section.appendChild(h2);
  section.appendChild(row);
  app.appendChild(section);

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

searchInput.addEventListener("input", render);

fetch("./data.json")
  .then(r => r.json())
  .then(data => {
    DATA = data;
    render();
  })
  .catch(err => {
    app.innerHTML = `<div class="empty">Failed to load data.json: ${err.message}</div>`;
  });

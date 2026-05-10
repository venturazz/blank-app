
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
  const sections = data.map(section => ({
    ...section,
    items: sortItemsByRating(section.items || [])
  }));

  const topRatedItems = sortItemsByRating(
    sections
      .flatMap(section => section.items || [])
      .filter(item => item.rating?.score100 != null)
  ).slice(0, 80);

  if (topRatedItems.length) {
    sections.unshift({
      category: 'Top Rated',
      slug: 'top-rated',
      items: topRatedItems
    });
  }

  return sections;
}

DATA = data;
render(DATA);

with:

DATA = prepareSections(data);
render(DATA);

const ratingBadge = item.rating
  ? `<span class="status-badge ok">★ ${item.rating.label}</span>`
  : `<span class="status-badge unknown">Unrated</span>`;

4) Insert the badge into the card HTML, for example inside the status row:

<div class="status-row">
  ${ratingBadge}
  ${item.health?.checkedAt ? `<span class="checked-time">${new Date(item.health.checkedAt).toLocaleDateString()}</span>` : ``}
</div>

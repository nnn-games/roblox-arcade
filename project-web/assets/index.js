const listEl = document.getElementById("gameList");
const searchInput = document.getElementById("searchInput");
const countLabel = document.getElementById("countLabel");

async function loadManifest() {
  const res = await fetch("./data/games.manifest.json");
  if (!res.ok) throw new Error("manifest 로딩 실패");
  return res.json();
}

function renderGames(games, keyword) {
  const q = keyword.trim().toLowerCase();
  const filtered = games.filter((g) => {
    return !q || g.title.toLowerCase().includes(q) || g.slug.toLowerCase().includes(q);
  });

  countLabel.textContent = `${filtered.length} / ${games.length}`;

  if (filtered.length === 0) {
    listEl.innerHTML = `<p class="muted">검색 결과가 없습니다.</p>`;
    return;
  }

  listEl.innerHTML = filtered
    .map((g) => {
      return `
      <article class="card">
        <img src="${g.image}" alt="${g.title}">
        <div class="card-body">
          <h3>${g.title}</h3>
          <p class="muted">${g.concept}</p>
          <a href="./play.html?game=${encodeURIComponent(g.slug)}">플레이</a>
        </div>
      </article>
      `;
    })
    .join("");
}

async function init() {
  try {
    const data = await loadManifest();
    const games = data.games || [];
    renderGames(games, "");
    searchInput.addEventListener("input", () => {
      renderGames(games, searchInput.value);
    });
  } catch (err) {
    listEl.innerHTML = `<p class="muted">오류: ${err.message}</p>`;
  }
}

init();

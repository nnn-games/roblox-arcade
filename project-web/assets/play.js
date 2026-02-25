function getGameSlug() {
  const params = new URLSearchParams(window.location.search);
  return params.get("game") || "";
}

async function getManifest() {
  const res = await fetch("./data/games.manifest.json");
  if (!res.ok) throw new Error("Failed to load manifest.");
  return res.json();
}

function setBaseUI(game) {
  document.getElementById("gameTitle").textContent = game.title;
  document.getElementById("gameDesc").textContent = game.concept;
}

function setStatusText(score, state, controls) {
  if (typeof score === "string") {
    document.getElementById("scoreLabel").textContent = score;
  }
  if (typeof state === "string") {
    document.getElementById("stateLabel").textContent = state;
  }
  if (typeof controls === "string") {
    document.getElementById("controlsLabel").innerHTML = `<strong>Controls:</strong> ${controls}`;
  }
}

function pickLaneX(canvasWidth, laneIndex) {
  const laneWidth = canvasWidth / 3;
  return laneWidth * laneIndex + laneWidth / 2;
}

function runFallbackPrototype(game) {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const state = {
    lane: 1,
    score: 0,
    speed: 180,
    running: true,
    obstacles: [],
    spawnTimer: 0,
    lastTs: 0
  };

  function reset() {
    state.lane = 1;
    state.score = 0;
    state.speed = 180;
    state.running = true;
    state.obstacles = [];
    state.spawnTimer = 0;
    setStatusText("Score: 0", "Playing", "Left/Right or A/D move lane, Space restart");
  }

  function spawnObstacle() {
    const lane = Math.floor(Math.random() * 3);
    state.obstacles.push({ lane, y: -40, size: 28 });
  }

  function update(dt) {
    if (!state.running) return;

    state.score += dt * 10;
    state.speed += dt * 2.2;
    state.spawnTimer -= dt;

    if (state.spawnTimer <= 0) {
      spawnObstacle();
      state.spawnTimer = Math.max(0.35, 0.95 - state.speed / 550);
    }

    for (const obs of state.obstacles) obs.y += state.speed * dt;
    state.obstacles = state.obstacles.filter((o) => o.y < canvas.height + 50);

    const playerY = canvas.height - 70;
    for (const obs of state.obstacles) {
      if (obs.lane !== state.lane) continue;
      if (Math.abs(obs.y - playerY) < 32) {
        state.running = false;
        setStatusText(`Score: ${Math.floor(state.score)}`, "Game Over - Space to restart");
      }
    }

    setStatusText(`Score: ${Math.floor(state.score)}`);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#061122";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let lane = 1; lane <= 2; lane += 1) {
      const x = (canvas.width / 3) * lane;
      ctx.strokeStyle = "#1b335f";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    const px = pickLaneX(canvas.width, state.lane);
    const py = canvas.height - 70;
    ctx.fillStyle = "#5de4c7";
    ctx.fillRect(px - 20, py - 20, 40, 40);

    ctx.fillStyle = "#ff5d73";
    for (const obs of state.obstacles) {
      const ox = pickLaneX(canvas.width, obs.lane);
      ctx.fillRect(ox - obs.size / 2, obs.y - obs.size / 2, obs.size, obs.size);
    }

    ctx.fillStyle = "#b6c8e7";
    ctx.font = "14px Segoe UI";
    ctx.fillText(`${game.title} (Prototype)`, 12, 24);
  }

  function tick(ts) {
    if (!state.lastTs) state.lastTs = ts;
    const dt = Math.min(0.033, (ts - state.lastTs) / 1000);
    state.lastTs = ts;
    update(dt);
    draw();
    requestAnimationFrame(tick);
  }

  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if ((key === "arrowleft" || key === "a") && state.running) state.lane = Math.max(0, state.lane - 1);
    if ((key === "arrowright" || key === "d") && state.running) state.lane = Math.min(2, state.lane + 1);
    if (e.code === "Space" && !state.running) reset();
  });

  reset();
  requestAnimationFrame(tick);
}

async function tryRunSpecificGame(slug, game) {
  try {
    const mod = await import(`./games/${slug}.js`);
    if (typeof mod.startGame === "function") {
      const canvas = document.getElementById("gameCanvas");
      const ctx = canvas.getContext("2d");
      mod.startGame({
        canvas,
        ctx,
        game,
        setStatusText
      });
      return true;
    }
  } catch (_err) {
    return false;
  }
  return false;
}

async function init() {
  const slug = getGameSlug();
  if (!slug) {
    document.getElementById("gameTitle").textContent = "Missing game slug.";
    return;
  }

  try {
    const data = await getManifest();
    const game = (data.games || []).find((g) => g.slug === slug);
    if (!game) {
      document.getElementById("gameTitle").textContent = `Game not found: ${slug}`;
      return;
    }

    setBaseUI(game);
    const launched = await tryRunSpecificGame(slug, game);
    if (!launched) runFallbackPrototype(game);
  } catch (err) {
    document.getElementById("gameTitle").textContent = `Error: ${err.message}`;
  }
}

init();

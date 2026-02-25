export function startGame({ canvas, ctx, game, setStatusText }) {
  const groundY = canvas.height - 90;

  const state = {
    y: groundY,
    vy: 0,
    height: 52,
    width: 36,
    sliding: false,
    slideTimer: 0,
    slashTimer: 0,
    hp: 3,
    running: true,
    over: false,
    speed: 260,
    distance: 0,
    kills: 0,
    noHitTime: 0,
    multiplier: 1,
    score: 0,
    obstacles: [],
    spawnTimer: 0,
    lastTs: 0
  };

  function reset() {
    state.y = groundY;
    state.vy = 0;
    state.height = 52;
    state.width = 36;
    state.sliding = false;
    state.slideTimer = 0;
    state.slashTimer = 0;
    state.hp = 3;
    state.running = true;
    state.over = false;
    state.speed = 260;
    state.distance = 0;
    state.kills = 0;
    state.noHitTime = 0;
    state.multiplier = 1;
    state.score = 0;
    state.obstacles = [];
    state.spawnTimer = 0;
    setStatusText(
      "Score: 0",
      "Playing",
      "Arrow Up jump, Arrow Down slide, Z slash, Space restart after game over"
    );
  }

  function spawnEntity() {
    const isEnemy = Math.random() < 0.55;
    const kind = isEnemy ? "enemy" : "obstacle";
    state.obstacles.push({
      kind,
      x: canvas.width + 40,
      y: groundY,
      w: kind === "enemy" ? 36 : 32,
      h: kind === "enemy" ? 44 : 66,
      passed: false
    });
  }

  function playerRect() {
    const yTop = state.y - state.height;
    return { x: 90, y: yTop, w: state.width, h: state.height };
  }

  function intersects(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function getSlashRect() {
    if (state.slashTimer <= 0 || !state.running) return null;
    const p = playerRect();
    return {
      x: p.x + p.w - 4,
      y: p.y + 6,
      w: 44,
      h: Math.max(20, p.h - 12)
    };
  }

  function takeDamage() {
    state.hp -= 1;
    state.multiplier = 1;
    state.noHitTime = 0;
    if (state.hp <= 0) {
      state.running = false;
      state.over = true;
      setStatusText(
        `Score: ${Math.floor(state.score)} | Dist: ${Math.floor(state.distance)}m | Kills: ${state.kills}`,
        "Game Over - Press Space to restart"
      );
    }
  }

  function updatePlayer(dt) {
    state.slashTimer = Math.max(0, state.slashTimer - dt);
    if (state.sliding) {
      state.slideTimer -= dt;
      if (state.slideTimer <= 0) {
        state.sliding = false;
        state.height = 52;
      }
    }

    state.vy += 1600 * dt;
    state.y += state.vy * dt;
    if (state.y > groundY) {
      state.y = groundY;
      state.vy = 0;
    }
  }

  function updateEntities(dt) {
    const player = playerRect();
    const slash = getSlashRect();

    for (const obj of state.obstacles) {
      obj.x -= state.speed * dt;

      if (!obj.passed && obj.x + obj.w < player.x) {
        obj.passed = true;
        if (obj.kind === "obstacle") {
          state.score += 14 * state.multiplier;
        }
      }

      if (slash && obj.kind === "enemy" && intersects(slash, obj)) {
        obj.x = -999;
        state.kills += 1;
        state.score += 50 * state.multiplier;
      }

      if (intersects(player, obj)) {
        obj.x = -999;
        takeDamage();
      }
    }

    state.obstacles = state.obstacles.filter((o) => o.x > -120);
  }

  function updateScoring(dt) {
    if (!state.running) return;

    state.speed = Math.min(450, state.speed + dt * 4.5);
    state.distance += (state.speed * dt) / 12;
    state.noHitTime += dt;
    state.multiplier = Math.min(6, 1 + Math.floor(state.noHitTime / 12));
    state.score += dt * 5 + (state.distance * 0.015);
  }

  function updateSpawning(dt) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnEntity();
      const pace = Math.max(0.45, 1.0 - state.speed / 800);
      state.spawnTimer = pace + Math.random() * 0.34;
    }
  }

  function update(dt) {
    if (!state.running) return;
    updatePlayer(dt);
    updateSpawning(dt);
    updateEntities(dt);
    updateScoring(dt);
    setStatusText(
      `Score: ${Math.floor(state.score)} | Dist: ${Math.floor(state.distance)}m | Kills: ${state.kills} | x${state.multiplier} | HP:${state.hp}`,
      "Playing"
    );
  }

  function drawBackground() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#060b16";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const stripe = (Date.now() / 10) % 42;
    for (let i = -1; i < 14; i += 1) {
      const x = i * 42 - stripe;
      ctx.fillStyle = "#111f39";
      ctx.fillRect(x, groundY + 10, 24, 8);
    }

    ctx.fillStyle = "#0f1830";
    ctx.fillRect(0, groundY + 18, canvas.width, canvas.height - groundY);
  }

  function drawPlayer() {
    const p = playerRect();
    ctx.fillStyle = "#5de4c7";
    ctx.fillRect(p.x, p.y, p.w, p.h);

    if (state.slashTimer > 0) {
      const s = getSlashRect();
      if (s) {
        ctx.fillStyle = "#ffe38f";
        ctx.fillRect(s.x, s.y, s.w, s.h);
      }
    }
  }

  function drawEntities() {
    for (const obj of state.obstacles) {
      if (obj.kind === "enemy") {
        ctx.fillStyle = "#ff5d73";
      } else {
        ctx.fillStyle = "#8a79ff";
      }
      ctx.fillRect(obj.x, obj.y - obj.h, obj.w, obj.h);
    }
  }

  function drawHud() {
    ctx.fillStyle = "#b6c8e7";
    ctx.font = "14px Segoe UI";
    ctx.fillText(game.title, 12, 24);
    if (state.over) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "18px Segoe UI";
      ctx.fillText("Game Over - Press Space", 118, 300);
    }
  }

  function frame(ts) {
    if (!state.lastTs) state.lastTs = ts;
    const dt = Math.min(0.033, (ts - state.lastTs) / 1000);
    state.lastTs = ts;

    update(dt);
    drawBackground();
    drawEntities();
    drawPlayer();
    drawHud();

    requestAnimationFrame(frame);
  }

  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();

    if (e.code === "Space" && state.over) {
      reset();
      return;
    }

    if (!state.running) return;

    if ((key === "arrowup" || key === "w") && state.y >= groundY - 1) {
      state.vy = -620;
    } else if (key === "arrowdown" || key === "s") {
      if (!state.sliding && state.y >= groundY - 1) {
        state.sliding = true;
        state.slideTimer = 0.55;
        state.height = 30;
      }
    } else if (key === "z") {
      state.slashTimer = 0.16;
    }
  });

  reset();
  requestAnimationFrame(frame);
}

export function startGame({ canvas, ctx, game, setStatusText }) {
  const arena = { x: canvas.width / 2, y: canvas.height / 2, r: 182 };

  const state = {
    player: { x: arena.x, y: arena.y, r: 12, hp: 4, dashCd: 0, dashT: 0, invuln: 0 },
    keys: { w: false, a: false, s: false, d: false },
    log: [],
    sampleT: 0,
    shadows: [],
    shadowSpawnT: 4.0,
    score: 0,
    survival: 0,
    hits: 0,
    nearMiss: 0,
    running: true,
    over: false,
    lastTs: 0
  };

  function reset() {
    state.player.x = arena.x;
    state.player.y = arena.y;
    state.player.hp = 4;
    state.player.dashCd = 0;
    state.player.dashT = 0;
    state.player.invuln = 0;
    state.keys.w = false;
    state.keys.a = false;
    state.keys.s = false;
    state.keys.d = false;
    state.log = [];
    state.sampleT = 0;
    state.shadows = [];
    state.shadowSpawnT = 4.0;
    state.score = 0;
    state.survival = 0;
    state.hits = 0;
    state.nearMiss = 0;
    state.running = true;
    state.over = false;
    setStatusText(
      "Score: 0",
      "Playing",
      "WASD move, Space dash, avoid replay shadows, Space restart after game over"
    );
  }

  function norm(x, y) {
    const l = Math.hypot(x, y) || 1;
    return { x: x / l, y: y / l };
  }

  function keepInside(p) {
    const dx = p.x - arena.x;
    const dy = p.y - arena.y;
    const d = Math.hypot(dx, dy);
    const lim = arena.r - p.r;
    if (d > lim) {
      const n = norm(dx, dy);
      p.x = arena.x + n.x * lim;
      p.y = arena.y + n.y * lim;
    }
  }

  function maybeSpawnShadow() {
    if (state.log.length < 30) return;
    if (state.shadows.length >= 6) return;
    const copied = state.log.map((s) => ({ x: s.x, y: s.y }));
    const first = copied[0];
    state.shadows.push({
      x: first.x,
      y: first.y,
      r: 11,
      idx: 0,
      lerp: 0,
      life: 8.0,
      nearFlag: false
    });
  }

  function updatePlayer(dt) {
    const moveX = (state.keys.d ? 1 : 0) - (state.keys.a ? 1 : 0);
    const moveY = (state.keys.s ? 1 : 0) - (state.keys.w ? 1 : 0);
    if (moveX !== 0 || moveY !== 0) {
      const d = norm(moveX, moveY);
      const spd = state.player.dashT > 0 ? 420 : 190;
      state.player.x += d.x * spd * dt;
      state.player.y += d.y * spd * dt;
    }
    keepInside(state.player);

    state.player.dashCd = Math.max(0, state.player.dashCd - dt);
    state.player.dashT = Math.max(0, state.player.dashT - dt);
    state.player.invuln = Math.max(0, state.player.invuln - dt);
  }

  function updateLog(dt) {
    state.sampleT += dt;
    if (state.sampleT >= 0.2) {
      state.sampleT = 0;
      state.log.push({ x: state.player.x, y: state.player.y });
      const maxSamples = 40; // 8 sec / 0.2 sec
      if (state.log.length > maxSamples) state.log.shift();
    }
  }

  function updateShadows(dt) {
    for (const s of state.shadows) {
      s.life -= dt;
      s.lerp += dt / 0.2;
      while (s.lerp >= 1 && s.idx < state.log.length - 2) {
        s.lerp -= 1;
        s.idx += 1;
      }
      const a = state.log[s.idx] || { x: s.x, y: s.y };
      const b = state.log[Math.min(state.log.length - 1, s.idx + 1)] || a;
      s.x = a.x + (b.x - a.x) * Math.min(1, s.lerp);
      s.y = a.y + (b.y - a.y) * Math.min(1, s.lerp);
    }
    state.shadows = state.shadows.filter((s) => s.life > 0);
  }

  function takeHit() {
    if (state.player.invuln > 0) return;
    state.player.hp -= 1;
    state.player.invuln = 0.8;
    state.hits += 1;
    if (state.player.hp <= 0) {
      state.running = false;
      state.over = true;
      setStatusText(
        `Score: ${Math.floor(state.score)} | Survival: ${Math.floor(state.survival)}s | Near:${state.nearMiss}`,
        "Game Over - Press Space to restart"
      );
    }
  }

  function handleCollisions() {
    for (const s of state.shadows) {
      const d = Math.hypot(s.x - state.player.x, s.y - state.player.y);
      if (d < s.r + state.player.r) {
        takeHit();
      } else if (d < s.r + state.player.r + 10 && !s.nearFlag) {
        s.nearFlag = true;
        state.nearMiss += 1;
        state.score += 12;
      }
    }
  }

  function dash() {
    if (!state.running || state.player.dashCd > 0) return;
    const moveX = (state.keys.d ? 1 : 0) - (state.keys.a ? 1 : 0);
    const moveY = (state.keys.s ? 1 : 0) - (state.keys.w ? 1 : 0);
    const d = moveX === 0 && moveY === 0 ? { x: 0, y: -1 } : norm(moveX, moveY);
    state.player.x += d.x * 56;
    state.player.y += d.y * 56;
    keepInside(state.player);
    state.player.dashCd = 1.2;
    state.player.dashT = 0.16;
    state.player.invuln = 0.2;
  }

  function update(dt) {
    if (!state.running) return;
    state.survival += dt;
    state.score += dt * 10;

    updatePlayer(dt);
    updateLog(dt);
    updateShadows(dt);

    state.shadowSpawnT -= dt;
    if (state.shadowSpawnT <= 0) {
      maybeSpawnShadow();
      state.shadowSpawnT = Math.max(2.1, 4.2 - Math.min(1.6, state.survival * 0.05));
    }

    handleCollisions();

    setStatusText(
      `Score: ${Math.floor(state.score)} | Time: ${Math.floor(state.survival)}s | HP:${state.player.hp} | Shadows:${state.shadows.length}`,
      "Playing"
    );
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#081020";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#2a466f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(arena.x, arena.y, arena.r, 0, Math.PI * 2);
    ctx.stroke();

    for (const s of state.shadows) {
      ctx.fillStyle = "rgba(175,125,255,0.72)";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    const p = state.player;
    const flash = p.invuln > 0 && Math.floor(p.invuln * 24) % 2 === 0;
    ctx.fillStyle = flash ? "#dfffff" : "#7bf3ff";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#b6c8e7";
    ctx.font = "14px Segoe UI";
    ctx.fillText(game.title, 12, 24);

    if (state.over) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "18px Segoe UI";
      ctx.fillText("Game Over - Press Space", 104, 320);
    }
  }

  function frame(ts) {
    if (!state.lastTs) state.lastTs = ts;
    const dt = Math.min(0.033, (ts - state.lastTs) / 1000);
    state.lastTs = ts;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (e.code === "Space" && state.over) {
      reset();
      return;
    }
    if (!state.running) return;
    if (key === "w" || key === "arrowup") state.keys.w = true;
    if (key === "a" || key === "arrowleft") state.keys.a = true;
    if (key === "s" || key === "arrowdown") state.keys.s = true;
    if (key === "d" || key === "arrowright") state.keys.d = true;
    if (e.code === "Space") dash();
  });
  window.addEventListener("keyup", (e) => {
    const key = e.key.toLowerCase();
    if (key === "w" || key === "arrowup") state.keys.w = false;
    if (key === "a" || key === "arrowleft") state.keys.a = false;
    if (key === "s" || key === "arrowdown") state.keys.s = false;
    if (key === "d" || key === "arrowright") state.keys.d = false;
  });

  reset();
  requestAnimationFrame(frame);
}

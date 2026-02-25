export function startGame({ canvas, ctx, game, setStatusText }) {
  const gravity = 1650;

  const state = {
    player: {
      x: canvas.width / 2,
      y: canvas.height - 180,
      w: 24,
      h: 34,
      vx: 0,
      vy: 0,
      onGround: false
    },
    platforms: [],
    lavaY: canvas.height + 80,
    lavaSpeed: 18,
    score: 0,
    maxHeight: 0,
    combo: 0,
    maxCombo: 0,
    falls: 0,
    nearLavaBonus: 0,
    charge: 0,
    charging: false,
    running: true,
    over: false,
    spawnTimer: 0,
    worldOffset: 0,
    keys: { left: false, right: false },
    lastTs: 0
  };

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function spawnPlatform(y) {
    state.platforms.push({
      id: Math.floor(Math.random() * 1e9),
      x: rand(28, canvas.width - 92),
      y,
      w: rand(56, 92),
      h: 12,
      breakT: 0
    });
  }

  function reset() {
    state.player.x = canvas.width / 2;
    state.player.y = canvas.height - 180;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.onGround = false;
    state.platforms = [];
    state.lavaY = canvas.height + 80;
    state.lavaSpeed = 18;
    state.score = 0;
    state.maxHeight = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.falls = 0;
    state.nearLavaBonus = 0;
    state.charge = 0;
    state.charging = false;
    state.running = true;
    state.over = false;
    state.spawnTimer = 0;
    state.worldOffset = 0;
    state.keys.left = false;
    state.keys.right = false;

    spawnPlatform(canvas.height - 100);
    spawnPlatform(canvas.height - 180);
    spawnPlatform(canvas.height - 260);
    spawnPlatform(canvas.height - 340);

    setStatusText(
      "Score: 0",
      "Playing",
      "Left/Right move, hold Space to charge jump, release Space to jump, Space restart on game over"
    );
  }

  function playerRect() {
    return {
      x: state.player.x - state.player.w / 2,
      y: state.player.y - state.player.h,
      w: state.player.w,
      h: state.player.h
    };
  }

  function landedOnPlatform(prevY) {
    const p = playerRect();
    for (const pl of state.platforms) {
      const top = pl.y;
      const prevBottom = prevY;
      const nowBottom = p.y + p.h;
      const withinX = p.x + p.w > pl.x && p.x < pl.x + pl.w;
      if (withinX && prevBottom <= top && nowBottom >= top) return pl;
    }
    return null;
  }

  function doJump() {
    if (!state.running || !state.player.onGround) return;
    const power = 360 + state.charge * 390;
    state.player.vy = -power;
    state.player.onGround = false;
    state.charge = 0;
    state.charging = false;
  }

  function updatePlayer(dt) {
    const p = state.player;
    const move = (state.keys.right ? 1 : 0) - (state.keys.left ? 1 : 0);
    p.vx = move * 190;

    const prevBottom = p.y;
    p.vy += gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.x = Math.max(16, Math.min(canvas.width - 16, p.x));

    p.onGround = false;
    const pl = landedOnPlatform(prevBottom);
    if (pl && p.vy >= 0) {
      p.y = pl.y;
      p.vy = 0;
      p.onGround = true;

      if (pl.breakT <= 0) {
        pl.breakT = 0.8;
        state.combo += 1;
        state.maxCombo = Math.max(state.maxCombo, state.combo);
        state.score += 14 + state.combo * 3;
      }
    }
  }

  function updateWorld(dt) {
    state.lavaSpeed += dt * 1.4;
    state.lavaY -= state.lavaSpeed * dt;

    const p = state.player;
    if (p.y < canvas.height * 0.42 && p.vy < 0) {
      const shift = (canvas.height * 0.42 - p.y) * 0.12;
      p.y += shift;
      for (const pl of state.platforms) pl.y += shift;
      state.lavaY += shift;
      state.worldOffset += shift;
    }

    state.maxHeight = Math.max(state.maxHeight, state.worldOffset);
    state.score += dt * 5 + state.maxHeight * 0.0008;

    if (p.y > canvas.height + 60) {
      state.falls += 1;
      state.combo = 0;
      p.x = canvas.width / 2;
      p.y = canvas.height - 180;
      p.vx = 0;
      p.vy = -120;
    }

    const lavaDist = state.lavaY - p.y;
    if (lavaDist < 80 && lavaDist > 0) {
      state.nearLavaBonus += dt * 12;
      state.score += dt * 10;
    }
    if (state.lavaY <= p.y) {
      state.running = false;
      state.over = true;
      setStatusText(
        `Score: ${Math.floor(state.score)} | Height: ${Math.floor(state.maxHeight)} | Max Combo: ${state.maxCombo}`,
        "Game Over - Lava touch (Space restart)"
      );
    }
  }

  function updatePlatforms(dt) {
    for (const pl of state.platforms) {
      if (pl.breakT > 0) pl.breakT -= dt;
    }
    state.platforms = state.platforms.filter((p) => p.breakT > -0.2 && p.y < canvas.height + 40);

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      const topY = Math.min(...state.platforms.map((p) => p.y), canvas.height - 100);
      spawnPlatform(topY - rand(58, 96));
      state.spawnTimer = 0.2;
    }
  }

  function update(dt) {
    if (!state.running) return;

    if (state.charging && state.player.onGround) {
      state.charge = Math.min(1, state.charge + dt * 1.8);
    }

    updatePlayer(dt);
    updatePlatforms(dt);
    updateWorld(dt);

    if (state.running) {
      setStatusText(
        `Score: ${Math.floor(state.score)} | Height: ${Math.floor(state.maxHeight)} | Combo: ${state.combo} | LavaGap: ${Math.floor(state.lavaY - state.player.y)}`,
        "Playing"
      );
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0b0e1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 20; i += 1) {
      const y = (i * 38 + (state.worldOffset % 38));
      ctx.strokeStyle = "#1a223f";
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    for (const pl of state.platforms) {
      const life = pl.breakT > 0 ? pl.breakT / 0.8 : 0;
      ctx.fillStyle = life > 0 ? `rgba(255,214,102,${Math.max(0.3, life)})` : "#5b6e9c";
      ctx.fillRect(pl.x, pl.y - pl.h, pl.w, pl.h);
    }

    const p = state.player;
    ctx.fillStyle = "#7df9d1";
    ctx.fillRect(p.x - p.w / 2, p.y - p.h, p.w, p.h);

    if (state.player.onGround && state.charging) {
      ctx.fillStyle = "#ffe08a";
      ctx.fillRect(p.x - 24, p.y - p.h - 12, 48 * state.charge, 6);
    }

    ctx.fillStyle = "#ff5d73";
    ctx.fillRect(0, state.lavaY, canvas.width, canvas.height - state.lavaY + 20);

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
    if (key === "arrowleft" || key === "a") state.keys.left = true;
    if (key === "arrowright" || key === "d") state.keys.right = true;
    if (e.code === "Space" && state.player.onGround) {
      state.charging = true;
    }
  });

  window.addEventListener("keyup", (e) => {
    const key = e.key.toLowerCase();
    if (key === "arrowleft" || key === "a") state.keys.left = false;
    if (key === "arrowright" || key === "d") state.keys.right = false;
    if (e.code === "Space" && state.running && state.player.onGround && state.charging) {
      doJump();
    }
    if (e.code === "Space") state.charging = false;
  });

  reset();
  requestAnimationFrame(frame);
}

export function startGame({ canvas, ctx, game, setStatusText }) {
  const center = { x: canvas.width / 2, y: canvas.height / 2 };
  const arenaR = 185;

  const state = {
    player: { x: center.x, y: center.y, r: 12, vx: 0, vy: 0, hp: 5, invuln: 0 },
    keys: { w: false, a: false, s: false, d: false },
    aim: { x: center.x + 40, y: center.y },
    enemies: [],
    particles: [],
    score: 0,
    survival: 0,
    chain: 0,
    maxChain: 0,
    chainTimer: 0,
    stunCd: 0,
    atkCd: 0,
    spawnTimer: 0,
    hitCount: 0,
    running: true,
    over: false,
    lastTs: 0
  };

  function reset() {
    state.player.x = center.x;
    state.player.y = center.y;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.hp = 5;
    state.player.invuln = 0;
    state.keys.w = false;
    state.keys.a = false;
    state.keys.s = false;
    state.keys.d = false;
    state.enemies = [];
    state.particles = [];
    state.score = 0;
    state.survival = 0;
    state.chain = 0;
    state.maxChain = 0;
    state.chainTimer = 0;
    state.stunCd = 0;
    state.atkCd = 0;
    state.spawnTimer = 0;
    state.hitCount = 0;
    state.running = true;
    state.over = false;
    setStatusText(
      "Score: 0",
      "Playing",
      "WASD move (ice inertia), Left click slash, Right click stun, Space restart"
    );
  }

  function norm(x, y) {
    const l = Math.hypot(x, y) || 1;
    return { x: x / l, y: y / l };
  }

  function keepInside(p) {
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    const dist = Math.hypot(dx, dy);
    const limit = arenaR - p.r;
    if (dist > limit) {
      const n = norm(dx, dy);
      p.x = center.x + n.x * limit;
      p.y = center.y + n.y * limit;
      p.vx *= 0.6;
      p.vy *= 0.6;
    }
  }

  function spawnEnemy() {
    const a = Math.random() * Math.PI * 2;
    const r = arenaR - 6;
    const x = center.x + Math.cos(a) * r;
    const y = center.y + Math.sin(a) * r;
    state.enemies.push({
      x,
      y,
      r: 10 + Math.random() * 3,
      hp: 1 + (Math.random() < 0.2 ? 1 : 0),
      speed: 60 + Math.random() * 55 + state.survival * 0.8,
      stun: 0
    });
  }

  function addKillScore() {
    state.chain += 1;
    state.maxChain = Math.max(state.maxChain, state.chain);
    state.chainTimer = 2.0;
    const mult = 1 + Math.min(4, state.chain * 0.12);
    state.score += Math.floor(35 * mult);
  }

  function breakChain() {
    if (state.chain > 0) state.chain = 0;
    state.chainTimer = 0;
  }

  function basicAttack() {
    if (!state.running || state.atkCd > 0) return;
    state.atkCd = 0.22;
    const p = state.player;
    const d = norm(state.aim.x - p.x, state.aim.y - p.y);
    let killed = 0;

    for (const e of state.enemies) {
      const ex = e.x - p.x;
      const ey = e.y - p.y;
      const dist = Math.hypot(ex, ey);
      if (dist > 58) continue;
      const nd = norm(ex, ey);
      const dot = nd.x * d.x + nd.y * d.y;
      if (dot < 0.35) continue;
      e.hp -= 1;
      if (e.hp <= 0) {
        e.x = -999;
        killed += 1;
        state.particles.push({ x: e.x, y: e.y, t: 0.22, c: "#a7ecff" });
      }
    }

    if (killed > 0) {
      for (let i = 0; i < killed; i += 1) addKillScore();
    } else {
      breakChain();
    }
  }

  function stunCast() {
    if (!state.running || state.stunCd > 0) return;
    state.stunCd = 3.4;
    const p = state.player;
    for (const e of state.enemies) {
      const dist = Math.hypot(e.x - p.x, e.y - p.y);
      if (dist <= 90) e.stun = 1.3;
    }
  }

  function takeHit() {
    if (state.player.invuln > 0) return;
    state.player.hp -= 1;
    state.player.invuln = 0.85;
    state.hitCount += 1;
    breakChain();
    if (state.player.hp <= 0) {
      state.running = false;
      state.over = true;
      setStatusText(
        `Score: ${Math.floor(state.score)} | Max Chain: ${state.maxChain} | Time: ${Math.floor(state.survival)}s`,
        "Game Over - Press Space to restart"
      );
    }
  }

  function updatePlayer(dt) {
    const moveX = (state.keys.d ? 1 : 0) - (state.keys.a ? 1 : 0);
    const moveY = (state.keys.s ? 1 : 0) - (state.keys.w ? 1 : 0);
    if (moveX !== 0 || moveY !== 0) {
      const d = norm(moveX, moveY);
      state.player.vx += d.x * 650 * dt;
      state.player.vy += d.y * 650 * dt;
    }

    state.player.vx *= 0.986;
    state.player.vy *= 0.986;
    state.player.x += state.player.vx * dt;
    state.player.y += state.player.vy * dt;

    keepInside(state.player);
  }

  function updateEnemies(dt) {
    const p = state.player;
    for (const e of state.enemies) {
      if (e.stun > 0) {
        e.stun = Math.max(0, e.stun - dt);
        continue;
      }
      const d = norm(p.x - e.x, p.y - e.y);
      e.x += d.x * e.speed * dt;
      e.y += d.y * e.speed * dt;

      const dist = Math.hypot(e.x - p.x, e.y - p.y);
      if (dist < e.r + p.r) takeHit();
    }
    state.enemies = state.enemies.filter((e) => e.x > -500 && e.hp > 0);
  }

  function update(dt) {
    if (!state.running) return;

    state.survival += dt;
    state.stunCd = Math.max(0, state.stunCd - dt);
    state.atkCd = Math.max(0, state.atkCd - dt);
    state.player.invuln = Math.max(0, state.player.invuln - dt);

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnEnemy();
      const pace = Math.max(0.18, 0.65 - Math.min(0.4, state.survival * 0.008));
      state.spawnTimer = pace;
    }

    updatePlayer(dt);
    updateEnemies(dt);

    if (state.chainTimer > 0) {
      state.chainTimer -= dt;
      if (state.chainTimer <= 0) breakChain();
    }

    state.score += dt * 6;
    setStatusText(
      `Score: ${Math.floor(state.score)} | Chain: ${state.chain} | Max: ${state.maxChain} | HP: ${state.player.hp}`,
      "Playing"
    );
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#061023";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#2b4674";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(center.x, center.y, arenaR, 0, Math.PI * 2);
    ctx.stroke();

    for (const e of state.enemies) {
      ctx.fillStyle = e.stun > 0 ? "#8dd3ff" : "#ff6b7a";
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
    }

    const p = state.player;
    const flash = p.invuln > 0 && Math.floor(p.invuln * 24) % 2 === 0;
    ctx.fillStyle = flash ? "#d8ffff" : "#7bf3ff";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();

    const d = norm(state.aim.x - p.x, state.aim.y - p.y);
    ctx.strokeStyle = "#b9f4ff";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + d.x * 24, p.y + d.y * 24);
    ctx.stroke();

    if (state.atkCd > 0.15) {
      ctx.strokeStyle = "#d8ffff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(p.x + d.x * 26, p.y + d.y * 26, 24, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = "#b6c8e7";
    ctx.font = "14px Segoe UI";
    ctx.fillText(game.title, 12, 24);

    if (state.over) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "18px Segoe UI";
      ctx.fillText("Game Over - Press Space", 110, 320);
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

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    state.aim.x = (e.clientX - rect.left) * sx;
    state.aim.y = (e.clientY - rect.top) * sy;
  });
  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 0) basicAttack();
    if (e.button === 2) stunCast();
  });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

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

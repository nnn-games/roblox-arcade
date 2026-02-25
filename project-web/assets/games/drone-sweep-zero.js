export function startGame({ canvas, ctx, game, setStatusText }) {
  const center = { x: canvas.width / 2, y: canvas.height / 2 };
  const arenaR = 180;

  const state = {
    player: { x: center.x, y: center.y, r: 12, hp: 5, dashCd: 0, dashTime: 0, invuln: 0 },
    keys: { w: false, a: false, s: false, d: false },
    aim: { x: center.x, y: center.y },
    mouseDown: false,
    shootCd: 0,
    bullets: [],
    drones: [],
    particles: [],
    wave: 1,
    waveRemaining: 8,
    score: 0,
    nearMisses: 0,
    running: true,
    over: false,
    spawnTimer: 0,
    lastTs: 0
  };

  function reset() {
    state.player.x = center.x;
    state.player.y = center.y;
    state.player.hp = 5;
    state.player.dashCd = 0;
    state.player.dashTime = 0;
    state.player.invuln = 0;
    state.keys.w = false;
    state.keys.a = false;
    state.keys.s = false;
    state.keys.d = false;
    state.mouseDown = false;
    state.shootCd = 0;
    state.bullets = [];
    state.drones = [];
    state.particles = [];
    state.wave = 1;
    state.waveRemaining = 8;
    state.score = 0;
    state.nearMisses = 0;
    state.running = true;
    state.over = false;
    state.spawnTimer = 0;
    setStatusText(
      "Score: 0",
      "Playing",
      "WASD move, Mouse aim/shoot, Space dash, Space restart on game over"
    );
  }

  function norm(x, y) {
    const len = Math.hypot(x, y) || 1;
    return { x: x / len, y: y / len };
  }

  function spawnDrone() {
    const angle = Math.random() * Math.PI * 2;
    const r = arenaR - 8;
    const x = center.x + Math.cos(angle) * r;
    const y = center.y + Math.sin(angle) * r;
    const hpScale = 1 + Math.floor((state.wave - 1) / 3);
    state.drones.push({
      x,
      y,
      r: 11,
      hp: hpScale,
      speed: 45 + state.wave * 5 + Math.random() * 25,
      nearAwarded: false
    });
  }

  function tryShoot() {
    if (!state.running || !state.mouseDown) return;
    if (state.shootCd > 0) return;
    state.shootCd = 0.12;
    const p = state.player;
    const d = norm(state.aim.x - p.x, state.aim.y - p.y);
    state.bullets.push({ x: p.x + d.x * 14, y: p.y + d.y * 14, vx: d.x * 520, vy: d.y * 520, life: 0.8 });
  }

  function triggerDash() {
    if (!state.running) return;
    if (state.player.dashCd > 0) return;
    const moveX = (state.keys.d ? 1 : 0) - (state.keys.a ? 1 : 0);
    const moveY = (state.keys.s ? 1 : 0) - (state.keys.w ? 1 : 0);
    const d = moveX === 0 && moveY === 0 ? norm(state.aim.x - state.player.x, state.aim.y - state.player.y) : norm(moveX, moveY);
    state.player.x += d.x * 56;
    state.player.y += d.y * 56;
    state.player.dashCd = 1.8;
    state.player.dashTime = 0.14;
    state.player.invuln = 0.2;
  }

  function keepInsideArena(p) {
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    const dist = Math.hypot(dx, dy);
    const limit = arenaR - p.r;
    if (dist > limit) {
      const n = norm(dx, dy);
      p.x = center.x + n.x * limit;
      p.y = center.y + n.y * limit;
    }
  }

  function nextWave() {
    state.wave += 1;
    state.waveRemaining = 7 + state.wave * 2;
    state.score += 120 + state.wave * 40;
  }

  function takeHit() {
    if (state.player.invuln > 0) return;
    state.player.hp -= 1;
    state.player.invuln = 0.9;
    if (state.player.hp <= 0) {
      state.running = false;
      state.over = true;
      setStatusText(
        `Score: ${Math.floor(state.score)} | Wave: ${state.wave} | Near Miss: ${state.nearMisses}`,
        "Game Over - Press Space to restart"
      );
    }
  }

  function update(dt) {
    if (!state.running) return;

    const p = state.player;
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.dashTime = Math.max(0, p.dashTime - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    state.shootCd = Math.max(0, state.shootCd - dt);

    const moveX = (state.keys.d ? 1 : 0) - (state.keys.a ? 1 : 0);
    const moveY = (state.keys.s ? 1 : 0) - (state.keys.w ? 1 : 0);
    if (moveX !== 0 || moveY !== 0) {
      const d = norm(moveX, moveY);
      const speed = p.dashTime > 0 ? 420 : 190;
      p.x += d.x * speed * dt;
      p.y += d.y * speed * dt;
    }
    keepInsideArena(p);

    tryShoot();

    state.spawnTimer -= dt;
    if (state.waveRemaining > 0 && state.spawnTimer <= 0) {
      spawnDrone();
      state.waveRemaining -= 1;
      state.spawnTimer = Math.max(0.2, 0.82 - state.wave * 0.05);
    }

    for (const b of state.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
    }
    state.bullets = state.bullets.filter((b) => {
      if (b.life <= 0) return false;
      const dx = b.x - center.x;
      const dy = b.y - center.y;
      return Math.hypot(dx, dy) <= arenaR + 30;
    });

    for (const d of state.drones) {
      const toP = norm(p.x - d.x, p.y - d.y);
      d.x += toP.x * d.speed * dt;
      d.y += toP.y * d.speed * dt;

      const dist = Math.hypot(d.x - p.x, d.y - p.y);
      if (dist < d.r + p.r + 1) takeHit();
      if (dist < d.r + p.r + 5 && !d.nearAwarded) {
        d.nearAwarded = true;
        state.nearMisses += 1;
        state.score += 14;
      }
    }

    for (const b of state.bullets) {
      for (const d of state.drones) {
        const dist = Math.hypot(d.x - b.x, d.y - b.y);
        if (dist <= d.r + 3) {
          d.hp -= 1;
          b.life = 0;
          if (d.hp <= 0) {
            d.x = -999;
            state.score += 36 + state.wave * 4;
            state.particles.push({ x: b.x, y: b.y, t: 0.25 });
          }
        }
      }
    }

    state.drones = state.drones.filter((d) => d.x > -100);
    for (const part of state.particles) part.t -= dt;
    state.particles = state.particles.filter((p0) => p0.t > 0);

    if (state.waveRemaining === 0 && state.drones.length === 0) {
      nextWave();
    }

    state.score += dt * (1.5 + state.wave * 0.3);
    setStatusText(
      `Score: ${Math.floor(state.score)} | Wave: ${state.wave} | HP: ${state.player.hp} | Near: ${state.nearMisses}`,
      "Playing"
    );
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#070c17";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#2a4368";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(center.x, center.y, arenaR, 0, Math.PI * 2);
    ctx.stroke();

    for (const d of state.drones) {
      ctx.fillStyle = "#ff5d73";
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#ffe38f";
    for (const b of state.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const p0 of state.particles) {
      ctx.fillStyle = `rgba(255, 160, 90, ${Math.max(0, p0.t / 0.25)})`;
      ctx.beginPath();
      ctx.arc(p0.x, p0.y, 10 * (1 - p0.t / 0.25), 0, Math.PI * 2);
      ctx.fill();
    }

    const p = state.player;
    const flash = p.invuln > 0 && Math.floor(p.invuln * 30) % 2 === 0;
    ctx.fillStyle = flash ? "#b5fff0" : "#5de4c7";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();

    const aim = norm(state.aim.x - p.x, state.aim.y - p.y);
    ctx.strokeStyle = "#9fd3ff";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + aim.x * 20, p.y + aim.y * 20);
    ctx.stroke();

    ctx.fillStyle = "#b6c8e7";
    ctx.font = "14px Segoe UI";
    ctx.fillText(game.title, 12, 24);

    if (state.over) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "18px Segoe UI";
      ctx.fillText("Game Over - Press Space", 108, 320);
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
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    state.aim.x = (e.clientX - rect.left) * scaleX;
    state.aim.y = (e.clientY - rect.top) * scaleY;
  });
  canvas.addEventListener("mousedown", () => { state.mouseDown = true; });
  window.addEventListener("mouseup", () => { state.mouseDown = false; });

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
    if (e.code === "Space") triggerDash();
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

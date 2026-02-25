export function startGame({ canvas, ctx, game, setStatusText }) {
  const state = {
    player: { x: canvas.width / 2, y: canvas.height - 60, r: 12, hp: 4 },
    keys: { left: false, right: false },
    aim: { x: canvas.width / 2, y: canvas.height / 2 },
    mouseDown: false,
    energy: 100,
    score: 0,
    oreCount: 0,
    killCount: 0,
    hitCount: 0,
    overchargeCd: 0,
    ores: [],
    drones: [],
    particles: [],
    spawnTimer: 0,
    drift: 0,
    running: true,
    over: false,
    lastTs: 0
  };

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function reset() {
    state.player.x = canvas.width / 2;
    state.player.y = canvas.height - 60;
    state.player.hp = 4;
    state.keys.left = false;
    state.keys.right = false;
    state.aim.x = canvas.width / 2;
    state.aim.y = canvas.height / 2;
    state.mouseDown = false;
    state.energy = 100;
    state.score = 0;
    state.oreCount = 0;
    state.killCount = 0;
    state.hitCount = 0;
    state.overchargeCd = 0;
    state.ores = [];
    state.drones = [];
    state.particles = [];
    state.spawnTimer = 0;
    state.drift = 0;
    state.running = true;
    state.over = false;
    setStatusText(
      "Score: 0",
      "Playing",
      "Left/Right move, Mouse aim + hold to fire laser, Space overcharge, Space restart on game over"
    );
  }

  function spawnEntity() {
    const laneX = rand(28, canvas.width - 28);
    if (Math.random() < 0.63) {
      state.ores.push({
        x: laneX,
        y: -18,
        r: 12 + Math.random() * 6,
        hp: 1 + (Math.random() < 0.35 ? 1 : 0),
        value: 20 + Math.floor(Math.random() * 18)
      });
    } else {
      state.drones.push({
        x: laneX,
        y: -18,
        r: 11,
        hp: 2,
        speed: 70 + Math.random() * 50
      });
    }
  }

  function norm(x, y) {
    const l = Math.hypot(x, y) || 1;
    return { x: x / l, y: y / l };
  }

  function pointSegDist(px, py, x1, y1, x2, y2) {
    const vx = x2 - x1;
    const vy = y2 - y1;
    const wx = px - x1;
    const wy = py - y1;
    const c1 = vx * wx + vy * wy;
    if (c1 <= 0) return Math.hypot(px - x1, py - y1);
    const c2 = vx * vx + vy * vy;
    if (c2 <= c1) return Math.hypot(px - x2, py - y2);
    const t = c1 / c2;
    const bx = x1 + vx * t;
    const by = y1 + vy * t;
    return Math.hypot(px - bx, py - by);
  }

  function applyLaser(dt) {
    if (!state.mouseDown || !state.running) return;
    const cost = dt * 14;
    if (state.energy <= 0) return;
    state.energy = Math.max(0, state.energy - cost);

    const p = state.player;
    const d = norm(state.aim.x - p.x, state.aim.y - p.y);
    const x1 = p.x;
    const y1 = p.y;
    const x2 = p.x + d.x * 720;
    const y2 = p.y + d.y * 720;

    for (const o of state.ores) {
      const hit = pointSegDist(o.x, o.y, x1, y1, x2, y2) <= o.r + 2;
      if (hit) {
        o.hp -= dt * 5;
        if (o.hp <= 0) {
          o.x = -999;
          state.oreCount += 1;
          state.score += o.value;
          state.energy = Math.min(100, state.energy + 4);
        }
      }
    }

    for (const d0 of state.drones) {
      const hit = pointSegDist(d0.x, d0.y, x1, y1, x2, y2) <= d0.r + 2;
      if (hit) {
        d0.hp -= dt * 7;
        if (d0.hp <= 0) {
          d0.x = -999;
          state.killCount += 1;
          state.score += 34;
          state.energy = Math.min(100, state.energy + 2);
        }
      }
    }
  }

  function overchargeShot() {
    if (!state.running || state.overchargeCd > 0 || state.energy < 24) return;
    state.overchargeCd = 3.2;
    state.energy -= 24;

    const p = state.player;
    const d = norm(state.aim.x - p.x, state.aim.y - p.y);
    const x1 = p.x;
    const y1 = p.y;
    const x2 = p.x + d.x * 760;
    const y2 = p.y + d.y * 760;

    for (const o of state.ores) {
      const hit = pointSegDist(o.x, o.y, x1, y1, x2, y2) <= o.r + 8;
      if (hit) {
        o.x = -999;
        state.oreCount += 1;
        state.score += o.value + 12;
      }
    }

    for (const d0 of state.drones) {
      const hit = pointSegDist(d0.x, d0.y, x1, y1, x2, y2) <= d0.r + 8;
      if (hit) {
        d0.x = -999;
        state.killCount += 1;
        state.score += 52;
      }
    }
  }

  function takeHit() {
    state.player.hp -= 1;
    state.hitCount += 1;
    state.energy = Math.max(0, state.energy - 8);
    if (state.player.hp <= 0) {
      state.running = false;
      state.over = true;
      setStatusText(
        `Score: ${Math.floor(state.score)} | Ore: ${state.oreCount} | Kills: ${state.killCount} | Energy: ${Math.floor(state.energy)}`,
        "Game Over - HP depleted (Space restart)"
      );
    }
  }

  function update(dt) {
    if (!state.running) return;

    state.drift += dt;
    state.overchargeCd = Math.max(0, state.overchargeCd - dt);

    const mv = (state.keys.right ? 1 : 0) - (state.keys.left ? 1 : 0);
    state.player.x += mv * 220 * dt;
    state.player.x = Math.max(20, Math.min(canvas.width - 20, state.player.x));

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnEntity();
      state.spawnTimer = Math.max(0.24, 0.6 - Math.min(0.25, state.score * 0.0004));
    }

    for (const o of state.ores) o.y += 74 * dt;
    for (const d of state.drones) {
      d.y += d.speed * dt;
      const nx = Math.sin((state.drift + d.y * 0.01) * 3.5);
      d.x += nx * 28 * dt;
    }

    applyLaser(dt);

    for (const o of state.ores) {
      if (Math.hypot(o.x - state.player.x, o.y - state.player.y) < o.r + state.player.r) {
        o.x = -999;
        state.oreCount += 1;
        state.score += o.value;
        state.energy = Math.min(100, state.energy + 6);
      }
    }

    for (const d of state.drones) {
      if (Math.hypot(d.x - state.player.x, d.y - state.player.y) < d.r + state.player.r) {
        d.x = -999;
        takeHit();
      }
    }

    state.ores = state.ores.filter((o) => o.x > -100 && o.y < canvas.height + 30);
    state.drones = state.drones.filter((d) => d.x > -100 && d.y < canvas.height + 40);

    state.energy = Math.max(0, state.energy - dt * 1.7);
    state.score += dt * 3;
    if (state.energy <= 0) {
      state.running = false;
      state.over = true;
      state.score += Math.floor(state.energy * 15);
      setStatusText(
        `Score: ${Math.floor(state.score)} | Ore: ${state.oreCount} | Kills: ${state.killCount}`,
        "Game Over - Energy depleted (Space restart)"
      );
      return;
    }

    setStatusText(
      `Score: ${Math.floor(state.score)} | Ore: ${state.oreCount} | Kills: ${state.killCount} | Energy: ${Math.floor(state.energy)} | OC:${state.overchargeCd > 0 ? "CD" : "Ready"}`,
      "Playing"
    );
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0a0d17";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < canvas.height; y += 36) {
      ctx.strokeStyle = "#19243f";
      ctx.beginPath();
      ctx.moveTo(0, (y + state.drift * 80) % (canvas.height + 40) - 20);
      ctx.lineTo(canvas.width, (y + state.drift * 80) % (canvas.height + 40) - 20);
      ctx.stroke();
    }

    for (const o of state.ores) {
      ctx.fillStyle = "#ffb86b";
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const d of state.drones) {
      ctx.fillStyle = "#ff5d73";
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }

    const p = state.player;
    ctx.fillStyle = "#5de4c7";
    ctx.fillRect(p.x - 12, p.y - 12, 24, 24);

    if (state.mouseDown && state.running) {
      const dir = norm(state.aim.x - p.x, state.aim.y - p.y);
      const x2 = p.x + dir.x * 720;
      const y2 = p.y + dir.y * 720;
      ctx.strokeStyle = "#8df6ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    if (state.overchargeCd > 3.0) {
      const dir = norm(state.aim.x - p.x, state.aim.y - p.y);
      const x2 = p.x + dir.x * 760;
      const y2 = p.y + dir.y * 760;
      ctx.strokeStyle = "#fff2a8";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    ctx.fillStyle = "#b6c8e7";
    ctx.font = "14px Segoe UI";
    ctx.fillText(game.title, 12, 24);

    const barW = 150;
    ctx.fillStyle = "#20365c";
    ctx.fillRect(12, 30, barW, 10);
    ctx.fillStyle = state.energy < 25 ? "#ff5d73" : "#5de4c7";
    ctx.fillRect(12, 30, (state.energy / 100) * barW, 10);

    if (state.over) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "18px Segoe UI";
      ctx.fillText("Game Over - Press Space", 102, 320);
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
    const r = canvas.getBoundingClientRect();
    const sx = canvas.width / r.width;
    const sy = canvas.height / r.height;
    state.aim.x = (e.clientX - r.left) * sx;
    state.aim.y = (e.clientY - r.top) * sy;
  });
  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 0) state.mouseDown = true;
  });
  window.addEventListener("mouseup", () => {
    state.mouseDown = false;
  });

  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (e.code === "Space" && state.over) {
      reset();
      return;
    }
    if (!state.running) return;
    if (key === "arrowleft" || key === "a") state.keys.left = true;
    if (key === "arrowright" || key === "d") state.keys.right = true;
    if (e.code === "Space") overchargeShot();
  });
  window.addEventListener("keyup", (e) => {
    const key = e.key.toLowerCase();
    if (key === "arrowleft" || key === "a") state.keys.left = false;
    if (key === "arrowright" || key === "d") state.keys.right = false;
  });

  reset();
  requestAnimationFrame(frame);
}

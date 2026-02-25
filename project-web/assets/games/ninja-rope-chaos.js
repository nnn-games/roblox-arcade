export function startGame({ canvas, ctx, game, setStatusText }) {
  const groundY = canvas.height - 28;

  const state = {
    player: { x: canvas.width / 2, y: canvas.height - 120, vx: 0, vy: 0, r: 10, hp: 3 },
    anchors: [],
    enemies: [],
    swing: null,
    switchCd: 0,
    attackT: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    airTime: 0,
    grounded: false,
    spawnT: 0,
    running: true,
    over: false,
    lastTs: 0
  };

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function reset() {
    state.player.x = canvas.width / 2;
    state.player.y = canvas.height - 120;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.hp = 3;
    state.anchors = [
      { id: 1, x: 80, y: 140, r: 12 },
      { id: 2, x: 210, y: 90, r: 12 },
      { id: 3, x: 340, y: 140, r: 12 },
      { id: 4, x: 130, y: 250, r: 12 },
      { id: 5, x: 290, y: 260, r: 12 }
    ];
    state.enemies = [];
    state.swing = null;
    state.switchCd = 0;
    state.attackT = 0;
    state.score = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.airTime = 0;
    state.grounded = false;
    state.spawnT = 0;
    state.running = true;
    state.over = false;
    setStatusText(
      "Score: 0",
      "Playing",
      "Click anchor to swing, Z air attack, Space restart after game over"
    );
  }

  function spawnEnemy() {
    const type = Math.random() < 0.5 ? "runner" : "flyer";
    state.enemies.push({
      type,
      x: Math.random() < 0.5 ? -20 : canvas.width + 20,
      y: type === "runner" ? groundY - 10 : rand(120, 280),
      r: type === "runner" ? 11 : 9,
      vx: type === "runner" ? (Math.random() < 0.5 ? 90 : -90) : (Math.random() < 0.5 ? 120 : -120),
      hp: 1
    });
  }

  function beginSwing(anchor) {
    if (!state.running || state.switchCd > 0) return;
    const p = state.player;
    const radius = Math.hypot(p.x - anchor.x, p.y - anchor.y);
    const startA = Math.atan2(p.y - anchor.y, p.x - anchor.x);
    const endA = startA + (p.x < anchor.x ? -1.0 : 1.0);
    state.swing = {
      anchorId: anchor.id,
      ax: anchor.x,
      ay: anchor.y,
      r: Math.max(44, Math.min(170, radius)),
      startA,
      endA,
      t: 0,
      dur: 0.42
    };
    state.switchCd = 0.25;
    state.grounded = false;
  }

  function attackAir() {
    if (!state.running) return;
    state.attackT = 0.18;
    const p = state.player;
    let kill = 0;
    for (const e of state.enemies) {
      const dist = Math.hypot(e.x - p.x, e.y - p.y);
      if (dist < 46) {
        e.hp = 0;
        kill += 1;
      }
    }
    if (kill > 0 && !state.grounded) {
      state.combo += kill;
      state.maxCombo = Math.max(state.maxCombo, state.combo);
      state.score += kill * (35 + state.combo * 3);
    }
  }

  function breakComboByGround() {
    state.combo = 0;
  }

  function takeHit() {
    state.player.hp -= 1;
    state.combo = 0;
    if (state.player.hp <= 0) {
      state.running = false;
      state.over = true;
      setStatusText(
        `Score: ${Math.floor(state.score)} | Max Combo: ${state.maxCombo} | Air: ${Math.floor(state.airTime)}s`,
        "Game Over - Press Space to restart"
      );
    }
  }

  function updatePlayer(dt) {
    const p = state.player;
    if (state.swing) {
      const s = state.swing;
      s.t += dt / s.dur;
      const t = Math.min(1, s.t);
      const ease = t * (2 - t);
      const ang = s.startA + (s.endA - s.startA) * ease;
      p.x = s.ax + Math.cos(ang) * s.r;
      p.y = s.ay + Math.sin(ang) * s.r;

      if (t >= 1) {
        p.vx = -Math.sin(ang) * 260;
        p.vy = Math.cos(ang) * 220 - 120;
        state.swing = null;
      }
      return;
    }

    p.vy += 1250 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.995;
    p.x = Math.max(12, Math.min(canvas.width - 12, p.x));

    if (p.y >= groundY - p.r) {
      if (!state.grounded) breakComboByGround();
      state.grounded = true;
      p.y = groundY - p.r;
      p.vy = 0;
      p.vx *= 0.88;
    } else {
      state.grounded = false;
    }
  }

  function updateEnemies(dt) {
    for (const e of state.enemies) {
      e.x += e.vx * dt;
      if (e.type === "flyer") {
        e.y += Math.sin((Date.now() * 0.004) + e.x * 0.02) * 26 * dt;
      }
    }

    const p = state.player;
    for (const e of state.enemies) {
      if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.r) {
        e.hp = 0;
        takeHit();
      }
    }

    state.enemies = state.enemies.filter((e) => e.hp > 0 && e.x > -40 && e.x < canvas.width + 40);
  }

  function update(dt) {
    if (!state.running) return;

    state.switchCd = Math.max(0, state.switchCd - dt);
    state.attackT = Math.max(0, state.attackT - dt);
    state.spawnT -= dt;
    if (state.spawnT <= 0) {
      spawnEnemy();
      state.spawnT = 0.45 + Math.random() * 0.4;
    }

    updatePlayer(dt);
    updateEnemies(dt);

    if (!state.grounded) state.airTime += dt;
    state.score += dt * (2 + state.combo * 0.4);

    setStatusText(
      `Score: ${Math.floor(state.score)} | Combo: ${state.combo} | Max: ${state.maxCombo} | Air: ${Math.floor(state.airTime)}s | HP:${state.player.hp}`,
      state.swing ? "Arc Move" : "Playing"
    );
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#070f1f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#1d2d52";
    ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

    for (const a of state.anchors) {
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (state.swing) {
      const p = state.player;
      ctx.strokeStyle = "#aef6ff";
      ctx.beginPath();
      ctx.moveTo(state.swing.ax, state.swing.ay);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }

    for (const e of state.enemies) {
      ctx.fillStyle = e.type === "runner" ? "#ff5d73" : "#f59e0b";
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
    }

    const p = state.player;
    ctx.fillStyle = "#5de4c7";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();

    if (state.attackT > 0) {
      ctx.strokeStyle = "#ffe38f";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 34, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = "#b6c8e7";
    ctx.font = "14px Segoe UI";
    ctx.fillText(game.title, 12, 24);

    if (state.over) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "18px Segoe UI";
      ctx.fillText("Game Over - Press Space", 103, 320);
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

  canvas.addEventListener("click", (e) => {
    if (!state.running) return;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * sx;
    const y = (e.clientY - rect.top) * sy;

    let picked = null;
    let best = 1e9;
    for (const a of state.anchors) {
      const d = Math.hypot(x - a.x, y - a.y);
      if (d < 26 && d < best) {
        best = d;
        picked = a;
      }
    }
    if (picked) beginSwing(picked);
  });

  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (e.code === "Space" && state.over) {
      reset();
      return;
    }
    if (!state.running) return;
    if (key === "z") attackAir();
  });

  reset();
  requestAnimationFrame(frame);
}

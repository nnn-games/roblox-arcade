export function startGame({ canvas, ctx, game, setStatusText }) {
  const state = {
    player: { x: canvas.width / 2, y: canvas.height - 130, vy: 0, r: 12, hp: 3 },
    anchors: [],
    linkMove: null,
    score: 0,
    distance: 0,
    combo: 0,
    maxCombo: 0,
    spawnTimer: 0,
    nextAnchorId: 1,
    running: true,
    over: false,
    hitFlash: 0,
    lastTs: 0
  };

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function reset() {
    state.player.x = canvas.width / 2;
    state.player.y = canvas.height - 130;
    state.player.vy = -120;
    state.player.hp = 3;
    state.anchors = [];
    state.linkMove = null;
    state.score = 0;
    state.distance = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.spawnTimer = 0;
    state.nextAnchorId = 1;
    state.running = true;
    state.over = false;
    state.hitFlash = 0;
    setStatusText(
      "Score: 0",
      "Playing",
      "Click anchor to snap. Miss click causes damage. Space restarts after game over."
    );
  }

  function spawnAnchor(yOverride) {
    if (state.anchors.length >= 3) return;
    state.anchors.push({
      id: state.nextAnchorId++,
      x: rand(60, canvas.width - 60),
      y: yOverride ?? rand(-80, canvas.height * 0.5),
      r: 14
    });
  }

  function breakCombo() {
    state.combo = 0;
  }

  function failHook() {
    state.player.hp -= 1;
    state.player.vy += 180;
    state.hitFlash = 0.35;
    breakCombo();
    if (state.player.hp <= 0) {
      state.running = false;
      state.over = true;
      setStatusText(
        `Score: ${Math.floor(state.score)} | Dist: ${Math.floor(state.distance)}m | Max Combo: ${state.maxCombo}`,
        "Game Over - HP depleted (Space to restart)"
      );
    }
  }

  function tryHookClick(mx, my) {
    if (!state.running) return;
    let hit = null;
    let best = 1e9;
    for (const a of state.anchors) {
      const dx = mx - a.x;
      const dy = my - a.y;
      const d = Math.hypot(dx, dy);
      if (d < 30 && d < best) {
        best = d;
        hit = a;
      }
    }

    if (!hit) {
      failHook();
      return;
    }

    const sx = state.player.x;
    const sy = state.player.y;
    const tx = hit.x;
    const ty = hit.y + 10;
    state.linkMove = {
      fromX: sx,
      fromY: sy,
      toX: tx,
      toY: ty,
      t: 0,
      dur: 0.24,
      anchorId: hit.id
    };
    state.anchors = state.anchors.filter((a) => a.id !== hit.id);
  }

  function updateAnchors(dt) {
    const scroll = 80 + Math.min(90, state.distance * 0.03);
    for (const a of state.anchors) {
      a.y += scroll * dt;
    }
    state.anchors = state.anchors.filter((a) => a.y < canvas.height + 40);

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      if (state.anchors.length < 3) spawnAnchor(rand(-60, 80));
      state.spawnTimer = 0.45 + Math.random() * 0.3;
    }
  }

  function updatePlayer(dt) {
    if (state.linkMove) {
      const m = state.linkMove;
      m.t += dt / m.dur;
      const t = Math.min(1, m.t);
      const curve = 1 - Math.pow(1 - t, 2);
      state.player.x = m.fromX + (m.toX - m.fromX) * curve;
      state.player.y = m.fromY + (m.toY - m.fromY) * curve - Math.sin(t * Math.PI) * 16;
      if (t >= 1) {
        state.linkMove = null;
        state.player.vy = -360;
        state.combo += 1;
        state.maxCombo = Math.max(state.maxCombo, state.combo);
        const gainDist = 16 + state.combo * 3;
        const gainScore = 35 + state.combo * 7;
        state.distance += gainDist;
        state.score += gainScore;
      }
      return;
    }

    state.player.vy += 760 * dt;
    state.player.y += state.player.vy * dt;
    if (state.player.y < 50) {
      const gain = (50 - state.player.y) * 0.3;
      state.distance += gain;
      state.score += gain * 1.8;
      state.player.y = 50;
      state.player.vy = Math.max(state.player.vy, -160);
    }
  }

  function update(dt) {
    if (!state.running) return;

    state.hitFlash = Math.max(0, state.hitFlash - dt);
    updateAnchors(dt);
    updatePlayer(dt);

    state.distance += dt * 5;
    state.score += dt * (3 + state.combo * 0.6);

    if (state.player.y > canvas.height + 24) {
      failHook();
      state.player.x = canvas.width / 2;
      state.player.y = canvas.height - 140;
      state.player.vy = -180;
      for (let i = state.anchors.length; i < 3; i += 1) {
        spawnAnchor(rand(40, canvas.height * 0.55));
      }
    }

    if (state.running) {
      setStatusText(
        `Score: ${Math.floor(state.score)} | Dist: ${Math.floor(state.distance)}m | Combo: ${state.combo} | HP: ${state.player.hp}`,
        "Playing"
      );
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#071021";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 18; i += 1) {
      const y = ((i * 40 + Date.now() * 0.07) % (canvas.height + 80)) - 40;
      ctx.strokeStyle = "#14284a";
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    for (const a of state.anchors) {
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a1d2e";
      ctx.beginPath();
      ctx.arc(a.x, a.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    const p = state.player;
    const flash = state.hitFlash > 0 && Math.floor(state.hitFlash * 20) % 2 === 0;
    ctx.fillStyle = flash ? "#ff9aa8" : "#72f1d1";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();

    if (state.linkMove) {
      ctx.strokeStyle = "#a7fff0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(state.linkMove.toX, state.linkMove.toY);
      ctx.stroke();
    }

    ctx.fillStyle = "#b6c8e7";
    ctx.font = "14px Segoe UI";
    ctx.fillText(game.title, 12, 24);

    if (state.over) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "18px Segoe UI";
      ctx.fillText("Game Over - Press Space", 105, 320);
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
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * sx;
    const y = (e.clientY - rect.top) * sy;
    tryHookClick(x, y);
  });

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && state.over) {
      reset();
    }
  });

  reset();
  for (let i = 0; i < 3; i += 1) spawnAnchor(rand(40, canvas.height * 0.6));
  requestAnimationFrame(frame);
}

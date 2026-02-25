export function startGame({ canvas, ctx, game, setStatusText }) {
  const gravity = 1700;
  const worldEnd = 2600;
  const timeLimit = 150;

  const state = {
    player: { x: 80, y: 0, w: 24, h: 34, vx: 0, vy: 0, hp: 3, onGround: false },
    keys: { left: false, right: false },
    platforms: [],
    traps: [],
    checkpoints: [],
    reachedCheckpoint: new Set(),
    goalX: worldEnd,
    score: 0,
    combo: 0,
    maxCombo: 0,
    timeLeft: timeLimit,
    hits: 0,
    done: false,
    running: true,
    over: false,
    win: false,
    lastTs: 0
  };

  function buildMap() {
    state.platforms = [
      { x: 0, y: 390, w: 340, h: 30 },
      { x: 380, y: 350, w: 150, h: 20 },
      { x: 580, y: 320, w: 140, h: 20 },
      { x: 760, y: 290, w: 120, h: 20 },
      { x: 920, y: 330, w: 160, h: 20 },
      { x: 1120, y: 300, w: 120, h: 20 },
      { x: 1300, y: 260, w: 180, h: 20 },
      { x: 1520, y: 320, w: 150, h: 20 },
      { x: 1710, y: 280, w: 130, h: 20 },
      { x: 1880, y: 240, w: 160, h: 20 },
      { x: 2090, y: 290, w: 130, h: 20 },
      { x: 2250, y: 250, w: 160, h: 20 },
      { x: 2450, y: 220, w: 180, h: 20 }
    ];

    state.traps = [
      { x: 350, y: 390, w: 20, h: 26 },
      { x: 540, y: 390, w: 22, h: 26 },
      { x: 700, y: 390, w: 24, h: 26 },
      { x: 1085, y: 390, w: 22, h: 26 },
      { x: 1490, y: 390, w: 24, h: 26 },
      { x: 1850, y: 390, w: 24, h: 26 },
      { x: 2220, y: 390, w: 24, h: 26 }
    ];

    state.checkpoints = [
      { id: 1, x: 620, y: 270 },
      { id: 2, x: 1360, y: 210 },
      { id: 3, x: 2140, y: 240 }
    ];
  }

  function reset() {
    buildMap();
    state.player.x = 80;
    state.player.y = 350;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.hp = 3;
    state.player.onGround = false;
    state.keys.left = false;
    state.keys.right = false;
    state.reachedCheckpoint = new Set();
    state.score = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.timeLeft = timeLimit;
    state.hits = 0;
    state.done = false;
    state.running = true;
    state.over = false;
    state.win = false;
    setStatusText(
      "Score: 0",
      "Playing",
      "Left/Right move, Space jump, Shift air adjust, reach checkpoints and goal"
    );
  }

  function rectOfPlayer() {
    return {
      x: state.player.x - state.player.w / 2,
      y: state.player.y - state.player.h,
      w: state.player.w,
      h: state.player.h
    };
  }

  function intersects(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function hitTrap() {
    state.player.hp -= 1;
    state.hits += 1;
    state.combo = 0;
    if (state.player.hp <= 0) {
      state.running = false;
      state.over = true;
      state.done = true;
      setStatusText(
        `Score: ${Math.floor(state.score)} | Checkpoints: ${state.reachedCheckpoint.size}/3 | Time: ${Math.ceil(state.timeLeft)}s`,
        "Game Over - Press Space to restart"
      );
    } else {
      state.player.x = Math.max(80, state.player.x - 70);
      state.player.y = 340;
      state.player.vx = 0;
      state.player.vy = -220;
    }
  }

  function applyPlatformCollision(prevBottom) {
    const p = rectOfPlayer();
    state.player.onGround = false;

    for (const pl of state.platforms) {
      const nowBottom = p.y + p.h;
      const withinX = p.x + p.w > pl.x && p.x < pl.x + pl.w;
      const crossingTop = prevBottom <= pl.y && nowBottom >= pl.y;
      if (withinX && crossingTop && state.player.vy >= 0) {
        state.player.y = pl.y;
        state.player.vy = 0;
        state.player.onGround = true;
        state.combo += 1;
        state.maxCombo = Math.max(state.maxCombo, state.combo);
        state.score += 4 + Math.min(14, state.combo);
        break;
      }
    }
  }

  function checkCheckpoint() {
    for (const cp of state.checkpoints) {
      if (state.reachedCheckpoint.has(cp.id)) continue;
      if (Math.abs(state.player.x - cp.x) < 26 && Math.abs(state.player.y - cp.y) < 60) {
        state.reachedCheckpoint.add(cp.id);
        const gain = 120 + Math.ceil(state.timeLeft) * 8;
        state.score += gain;
      }
    }
  }

  function checkGoal() {
    if (state.player.x >= state.goalX) {
      state.running = false;
      state.over = true;
      state.win = true;
      state.done = true;
      state.score += 300 + Math.ceil(state.timeLeft) * 20;
      setStatusText(
        `Score: ${Math.floor(state.score)} | Time Left: ${Math.ceil(state.timeLeft)}s | Max Combo: ${state.maxCombo}`,
        "Goal Reached - Press Space to restart"
      );
    }
  }

  function update(dt) {
    if (!state.running) return;
    state.timeLeft = Math.max(0, state.timeLeft - dt);
    if (state.timeLeft <= 0) {
      state.running = false;
      state.over = true;
      state.done = true;
      setStatusText(
        `Score: ${Math.floor(state.score)} | Progress: ${Math.floor((state.player.x / worldEnd) * 100)}%`,
        "Time Up - Press Space to restart"
      );
      return;
    }

    const move = (state.keys.right ? 1 : 0) - (state.keys.left ? 1 : 0);
    state.player.vx = move * 190;
    state.player.vy += gravity * dt;

    const prevBottom = state.player.y;
    state.player.x += state.player.vx * dt;
    state.player.y += state.player.vy * dt;
    state.player.x = Math.max(12, Math.min(worldEnd + 20, state.player.x));

    applyPlatformCollision(prevBottom);

    const pRect = rectOfPlayer();
    for (const t of state.traps) {
      const trapRect = { x: t.x, y: t.y, w: t.w, h: t.h };
      if (intersects(pRect, trapRect)) {
        hitTrap();
        break;
      }
    }

    if (state.player.y > canvas.height + 80) {
      hitTrap();
    }

    checkCheckpoint();
    checkGoal();

    if (state.running) {
      const progress = Math.floor((state.player.x / worldEnd) * 100);
      state.score += dt * 2;
      setStatusText(
        `Score: ${Math.floor(state.score)} | CP:${state.reachedCheckpoint.size}/3 | Combo:${state.combo} | HP:${state.player.hp} | Time:${Math.ceil(state.timeLeft)}s | ${progress}%`,
        "Playing"
      );
    }
  }

  function draw() {
    const camX = Math.max(0, Math.min(worldEnd - canvas.width + 120, state.player.x - canvas.width * 0.4));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0a101f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 20; i += 1) {
      const gx = (i * 140 - (camX * 0.2) % 140);
      ctx.strokeStyle = "#162543";
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, canvas.height);
      ctx.stroke();
    }

    for (const pl of state.platforms) {
      ctx.fillStyle = "#4f6ea0";
      ctx.fillRect(pl.x - camX, pl.y, pl.w, pl.h);
    }

    for (const t of state.traps) {
      ctx.fillStyle = "#ff5d73";
      ctx.fillRect(t.x - camX, t.y, t.w, t.h);
    }

    for (const cp of state.checkpoints) {
      const reached = state.reachedCheckpoint.has(cp.id);
      ctx.fillStyle = reached ? "#5de4c7" : "#ffd166";
      ctx.fillRect(cp.x - camX - 6, cp.y - 30, 12, 30);
    }

    ctx.fillStyle = "#ffb86b";
    ctx.fillRect(state.goalX - camX - 8, 170, 16, 210);

    const p = state.player;
    ctx.fillStyle = state.win ? "#f7ff8a" : "#7df9d1";
    ctx.fillRect(p.x - camX - p.w / 2, p.y - p.h, p.w, p.h);

    ctx.fillStyle = "#b6c8e7";
    ctx.font = "14px Segoe UI";
    ctx.fillText(game.title, 12, 24);

    if (state.over) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "18px Segoe UI";
      const msg = state.win ? "Goal Reached - Press Space" : "Run End - Press Space";
      ctx.fillText(msg, 104, 320);
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
    if ((e.code === "Space" || key === "w" || key === "arrowup") && state.player.onGround) {
      state.player.vy = -640;
      state.player.onGround = false;
    }
    if ((e.key === "Shift" || e.code === "ShiftLeft" || e.code === "ShiftRight") && !state.player.onGround) {
      state.player.vx += state.keys.right ? 120 : (state.keys.left ? -120 : 0);
      state.player.vy -= 80;
    }
  });

  window.addEventListener("keyup", (e) => {
    const key = e.key.toLowerCase();
    if (key === "arrowleft" || key === "a") state.keys.left = false;
    if (key === "arrowright" || key === "d") state.keys.right = false;
  });

  reset();
  requestAnimationFrame(frame);
}

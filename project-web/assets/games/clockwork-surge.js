export function startGame({ canvas, ctx, game, setStatusText }) {
  const gravity = 1700;
  const timeLimit = 180;

  const state = {
    player: { x: 120, y: 220, w: 28, h: 38, vx: 0, vy: 0, onGround: false, dir: 1 },
    keys: { left: false, right: false },
    dashCd: 0,
    timeLeft: timeLimit,
    score: 0,
    combo: 0,
    maxCombo: 0,
    captures: 0,
    falls: 0,
    running: true,
    over: false,
    gears: [],
    coreGearId: 0,
    lastTs: 0
  };

  function buildGears() {
    state.gears = [
      { id: 0, x: 90, y: 500, r: 54, spin: 0, spinSpeed: 0.8 },
      { id: 1, x: 230, y: 410, r: 46, spin: 0, spinSpeed: -1.2 },
      { id: 2, x: 360, y: 515, r: 58, spin: 0, spinSpeed: 1.0 },
      { id: 3, x: 300, y: 300, r: 42, spin: 0, spinSpeed: -1.6 },
      { id: 4, x: 130, y: 285, r: 40, spin: 0, spinSpeed: 1.4 }
    ];
  }

  function reset() {
    buildGears();
    state.player.x = 120;
    state.player.y = 220;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.onGround = false;
    state.player.dir = 1;
    state.keys.left = false;
    state.keys.right = false;
    state.dashCd = 0;
    state.timeLeft = timeLimit;
    state.score = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.captures = 0;
    state.falls = 0;
    state.running = true;
    state.over = false;
    state.coreGearId = 0;
    setStatusText(
      "Score: 0",
      "Playing",
      "Left/Right move, Space jump, Shift dash, Space restart after time up"
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

  function chooseNextCore() {
    let next = state.coreGearId;
    while (next === state.coreGearId) {
      next = Math.floor(Math.random() * state.gears.length);
    }
    state.coreGearId = next;
  }

  function tryCaptureCore() {
    const p = state.player;
    const gear = state.gears.find((g) => g.id === state.coreGearId);
    if (!gear) return;
    const dx = p.x - gear.x;
    const dy = (p.y - p.h * 0.5) - gear.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= gear.r + 8) {
      state.combo += 1;
      state.maxCombo = Math.max(state.maxCombo, state.combo);
      state.captures += 1;
      state.score += 80 + state.combo * 25;
      chooseNextCore();
    }
  }

  function applyMovement(dt) {
    const p = state.player;
    const move = (state.keys.left ? -1 : 0) + (state.keys.right ? 1 : 0);
    const targetVx = move * 240;
    const accel = p.onGround ? 1900 : 900;
    p.vx += Math.sign(targetVx - p.vx) * Math.min(Math.abs(targetVx - p.vx), accel * dt);
    if (move !== 0) p.dir = move;

    p.vy += gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.onGround = false;

    p.x = Math.max(12, Math.min(canvas.width - 12, p.x));
  }

  function resolveGearCollision() {
    const p = state.player;
    const feetY = p.y;
    for (const g of state.gears) {
      const dx = p.x - g.x;
      const dy = feetY - g.y;
      const dist = Math.hypot(dx, dy);
      const touch = g.r + 2;
      if (dist <= touch && p.vy >= 0) {
        const nx = dx / (dist || 1);
        const ny = dy / (dist || 1);
        p.x = g.x + nx * touch;
        p.y = g.y + ny * touch;
        p.vy = 0;
        if (ny < -0.1) p.onGround = true;
      }
    }
  }

  function update(dt) {
    if (!state.running) return;

    state.timeLeft = Math.max(0, state.timeLeft - dt);
    state.dashCd = Math.max(0, state.dashCd - dt);

    for (const g of state.gears) {
      g.spin += g.spinSpeed * dt;
    }

    applyMovement(dt);
    resolveGearCollision();
    tryCaptureCore();

    if (state.player.y > canvas.height + 80) {
      state.falls += 1;
      state.combo = 0;
      state.player.x = 120;
      state.player.y = 220;
      state.player.vx = 0;
      state.player.vy = 0;
    }

    state.score += dt * 7;

    if (state.timeLeft <= 0) {
      state.running = false;
      state.over = true;
      const timeBonus = Math.floor(state.timeLeft) * 20;
      state.score += timeBonus;
      setStatusText(
        `Score: ${Math.floor(state.score)} | Captures: ${state.captures} | Max Combo: ${state.maxCombo} | Falls: ${state.falls}`,
        "Time Up - Press Space to restart"
      );
      return;
    }

    setStatusText(
      `Score: ${Math.floor(state.score)} | Combo: ${state.combo} | Captures: ${state.captures} | Time: ${Math.ceil(state.timeLeft)}s`,
      "Playing"
    );
  }

  function drawGear(g, isCore) {
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.spin);

    ctx.strokeStyle = isCore ? "#ffe38f" : "#38557f";
    ctx.lineWidth = isCore ? 5 : 3;
    ctx.beginPath();
    ctx.arc(0, 0, g.r, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 8; i += 1) {
      ctx.rotate((Math.PI * 2) / 8);
      ctx.fillStyle = isCore ? "#ffbd59" : "#4f6ea0";
      ctx.fillRect(g.r - 4, -3, 12, 6);
    }

    if (isCore) {
      ctx.fillStyle = "#ffe38f";
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPlayer() {
    const p = playerRect();
    ctx.fillStyle = "#5de4c7";
    ctx.fillRect(p.x, p.y, p.w, p.h);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#081122";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const g of state.gears) {
      drawGear(g, g.id === state.coreGearId);
    }
    drawPlayer();

    ctx.fillStyle = "#b6c8e7";
    ctx.font = "14px Segoe UI";
    ctx.fillText(game.title, 12, 22);

    if (state.over) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "18px Segoe UI";
      ctx.fillText("Time Up - Press Space", 120, 320);
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

    if (key === "arrowleft" || key === "a") state.keys.left = true;
    if (key === "arrowright" || key === "d") state.keys.right = true;

    if (!state.running) return;

    if ((e.code === "Space" || key === "w") && state.player.onGround) {
      state.player.vy = -650;
      state.player.onGround = false;
    }

    if ((e.key === "Shift" || e.code === "ShiftLeft" || e.code === "ShiftRight") && state.dashCd <= 0) {
      state.player.vx += state.player.dir * 430;
      state.dashCd = 1.1;
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

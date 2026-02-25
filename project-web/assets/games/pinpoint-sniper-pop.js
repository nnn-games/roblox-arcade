export function startGame({ canvas, ctx, game, setStatusText }) {
  const limitSec = 90;

  const state = {
    timeLeft: limitSec,
    score: 0,
    shots: 0,
    hits: 0,
    headshots: 0,
    misses: 0,
    targets: [],
    spawnT: 0,
    cross: { x: canvas.width / 2, y: canvas.height / 2 },
    running: true,
    over: false,
    lastTs: 0
  };

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function reset() {
    state.timeLeft = limitSec;
    state.score = 0;
    state.shots = 0;
    state.hits = 0;
    state.headshots = 0;
    state.misses = 0;
    state.targets = [];
    state.spawnT = 0;
    state.running = true;
    state.over = false;
    setStatusText(
      "Score: 0",
      "Playing",
      "Move mouse to aim, left click to shoot, Space restart after time up"
    );
  }

  function spawnTarget() {
    const hard = Math.random() < 0.3;
    const r = hard ? rand(10, 13) : rand(14, 20);
    const life = hard ? rand(1.0, 1.6) : rand(1.4, 2.2);
    state.targets.push({
      x: rand(36, canvas.width - 36),
      y: rand(60, canvas.height - 90),
      r,
      life,
      hard
    });
  }

  function finishGame() {
    state.running = false;
    state.over = true;
    const acc = state.shots > 0 ? (state.hits / state.shots) * 100 : 0;
    setStatusText(
      `Score: ${Math.floor(state.score)} | Acc: ${acc.toFixed(1)}% | Headshots: ${state.headshots}`,
      "Time Up - Press Space to restart"
    );
  }

  function fire(x, y) {
    if (!state.running) return;
    state.shots += 1;
    let hitAny = false;

    for (const t of state.targets) {
      const d = Math.hypot(x - t.x, y - t.y);
      if (d <= t.r) {
        hitAny = true;
        t.life = -1;
        state.hits += 1;
        const head = d <= t.r * 0.35;
        if (head) {
          state.headshots += 1;
          state.score += t.hard ? 80 : 60;
        } else {
          state.score += t.hard ? 50 : 35;
        }
      }
    }

    if (!hitAny) {
      state.misses += 1;
      state.score = Math.max(0, state.score - 8);
    }
  }

  function update(dt) {
    if (!state.running) return;

    state.timeLeft = Math.max(0, state.timeLeft - dt);
    if (state.timeLeft <= 0) {
      finishGame();
      return;
    }

    state.spawnT -= dt;
    if (state.spawnT <= 0) {
      spawnTarget();
      const pace = Math.max(0.2, 0.75 - (limitSec - state.timeLeft) * 0.003);
      state.spawnT = pace;
    }

    for (const t of state.targets) t.life -= dt;
    state.targets = state.targets.filter((t) => t.life > 0);

    setStatusText(
      `Score: ${Math.floor(state.score)} | Time: ${Math.ceil(state.timeLeft)}s | Hits: ${state.hits}/${state.shots} | Headshots: ${state.headshots}`,
      "Playing"
    );
  }

  function drawTarget(t) {
    ctx.fillStyle = t.hard ? "#ff8a5b" : "#7aa8ff";
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe8d1";
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f7f7f7";
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCrosshair() {
    const { x, y } = state.cross;
    ctx.strokeStyle = "#d8f1ff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 12, y);
    ctx.lineTo(x + 12, y);
    ctx.moveTo(x, y - 12);
    ctx.lineTo(x, y + 12);
    ctx.stroke();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0b1020";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 16; i += 1) {
      const x = i * 28 + ((Date.now() / 30) % 28);
      ctx.strokeStyle = "#192743";
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (const t of state.targets) drawTarget(t);
    drawCrosshair();

    ctx.fillStyle = "#b6c8e7";
    ctx.font = "14px Segoe UI";
    ctx.fillText(game.title, 12, 24);

    if (state.over) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "18px Segoe UI";
      ctx.fillText("Time Up - Press Space", 118, 320);
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
    state.cross.x = (e.clientX - rect.left) * sx;
    state.cross.y = (e.clientY - rect.top) * sy;
  });
  canvas.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * sx;
    const y = (e.clientY - rect.top) * sy;
    fire(x, y);
  });

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && state.over) reset();
  });

  reset();
  requestAnimationFrame(frame);
}

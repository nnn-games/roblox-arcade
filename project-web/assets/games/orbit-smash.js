export function startGame({ canvas, ctx, game, setStatusText }) {
  const core = { x: canvas.width / 2, y: canvas.height / 2 };

  const state = {
    angle: -Math.PI / 2,
    dir: 1,
    orbitR: 92,
    hammerR: 12,
    hp: 4,
    score: 0,
    survival: 0,
    chain: 0,
    maxChain: 0,
    chainT: 0,
    overheatGauge: 0,
    overheatT: 0,
    frags: [],
    spawnT: 0,
    running: true,
    over: false,
    lastTs: 0
  };

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function reset() {
    state.angle = -Math.PI / 2;
    state.dir = 1;
    state.hp = 4;
    state.score = 0;
    state.survival = 0;
    state.chain = 0;
    state.maxChain = 0;
    state.chainT = 0;
    state.overheatGauge = 0;
    state.overheatT = 0;
    state.frags = [];
    state.spawnT = 0;
    state.running = true;
    state.over = false;
    setStatusText(
      "Score: 0",
      "Playing",
      "Click or Space to toggle rotation direction. Space restarts after game over."
    );
  }

  function hammerPos() {
    return {
      x: core.x + Math.cos(state.angle) * state.orbitR,
      y: core.y + Math.sin(state.angle) * state.orbitR
    };
  }

  function spawnFrag() {
    const a = rand(0, Math.PI * 2);
    const startR = 290;
    const speed = 62 + rand(0, 45) + state.survival * 0.7;
    state.frags.push({
      x: core.x + Math.cos(a) * startR,
      y: core.y + Math.sin(a) * startR,
      vx: -Math.cos(a) * speed,
      vy: -Math.sin(a) * speed,
      r: rand(7, 11),
      tough: Math.random() < 0.12
    });
  }

  function toggleDir() {
    if (!state.running) return;
    state.dir *= -1;
  }

  function addKillScore() {
    state.chain += 1;
    state.maxChain = Math.max(state.maxChain, state.chain);
    state.chainT = 1.2;
    state.overheatGauge = Math.min(100, state.overheatGauge + 8);
    const chainBonus = 1 + Math.min(2.2, state.chain * 0.1);
    const heatBonus = state.overheatT > 0 ? 1.8 : 1;
    state.score += Math.floor(22 * chainBonus * heatBonus);
  }

  function breakChain() {
    state.chain = 0;
    state.chainT = 0;
  }

  function takeCoreHit() {
    state.hp -= 1;
    breakChain();
    state.overheatGauge = Math.max(0, state.overheatGauge - 25);
    if (state.hp <= 0) {
      state.running = false;
      state.over = true;
      setStatusText(
        `Score: ${Math.floor(state.score)} | Survival: ${Math.floor(state.survival)}s | Max Chain: ${state.maxChain}`,
        "Game Over - Press Space to restart"
      );
    }
  }

  function update(dt) {
    if (!state.running) return;

    state.survival += dt;
    const baseSpin = state.overheatT > 0 ? 4.2 : 3.0;
    state.angle += state.dir * baseSpin * dt;

    state.chainT -= dt;
    if (state.chainT <= 0 && state.chain > 0) breakChain();

    if (state.overheatT > 0) {
      state.overheatT = Math.max(0, state.overheatT - dt);
    } else {
      state.overheatGauge = Math.max(0, state.overheatGauge - dt * 6);
      if (state.overheatGauge >= 100) {
        state.overheatGauge = 100;
        state.overheatT = 4.0;
      }
    }

    state.spawnT -= dt;
    if (state.spawnT <= 0) {
      spawnFrag();
      const pace = Math.max(0.14, 0.52 - Math.min(0.22, state.survival * 0.01));
      state.spawnT = pace;
    }

    const h = hammerPos();
    for (const f of state.frags) {
      f.x += f.vx * dt;
      f.y += f.vy * dt;

      const dh = Math.hypot(f.x - h.x, f.y - h.y);
      if (dh < f.r + state.hammerR) {
        if (f.tough && state.overheatT <= 0) {
          f.tough = false;
          f.vx *= -0.4;
          f.vy *= -0.4;
        } else {
          f.x = -999;
          addKillScore();
        }
      }

      const dc = Math.hypot(f.x - core.x, f.y - core.y);
      if (dc < f.r + 16) {
        f.x = -999;
        takeCoreHit();
      }
    }

    state.frags = state.frags.filter((f) => f.x > -200 && f.x < canvas.width + 200 && f.y > -200 && f.y < canvas.height + 200);

    state.score += dt * 10;
    setStatusText(
      `Score: ${Math.floor(state.score)} | HP:${state.hp} | Chain:${state.chain} | Heat:${Math.floor(state.overheatGauge)}%`,
      state.overheatT > 0 ? "Overheat" : "Playing"
    );
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#080d18";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#20375f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(core.x, core.y, state.orbitR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#6ee7ff";
    ctx.beginPath();
    ctx.arc(core.x, core.y, 16, 0, Math.PI * 2);
    ctx.fill();

    const h = hammerPos();
    ctx.strokeStyle = "#9dd6ff";
    ctx.beginPath();
    ctx.moveTo(core.x, core.y);
    ctx.lineTo(h.x, h.y);
    ctx.stroke();

    ctx.fillStyle = state.overheatT > 0 ? "#ffb86b" : "#ffd166";
    ctx.beginPath();
    ctx.arc(h.x, h.y, state.hammerR, 0, Math.PI * 2);
    ctx.fill();

    for (const f of state.frags) {
      ctx.fillStyle = f.tough ? "#ff5d73" : "#9b87f5";
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#b6c8e7";
    ctx.font = "14px Segoe UI";
    ctx.fillText(game.title, 12, 24);

    ctx.fillStyle = "#233c64";
    ctx.fillRect(12, 32, 150, 10);
    ctx.fillStyle = state.overheatT > 0 ? "#ffb86b" : "#5de4c7";
    ctx.fillRect(12, 32, (Math.min(100, state.overheatGauge) / 100) * 150, 10);

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

  canvas.addEventListener("click", () => {
    if (state.over) return;
    toggleDir();
  });

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && state.over) {
      reset();
      return;
    }
    if (e.code === "Space") toggleDir();
  });

  reset();
  requestAnimationFrame(frame);
}

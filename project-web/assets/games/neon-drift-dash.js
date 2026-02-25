export function startGame({ canvas, ctx, game, setStatusText }) {
  const laneX = [canvas.width * 0.24, canvas.width * 0.5, canvas.width * 0.76];
  const playerY = canvas.height - 84;

  const state = {
    lane: 1,
    hp: 3,
    score: 0,
    combo: 0,
    maxCombo: 0,
    nearMiss: 0,
    speed: 210,
    objs: [],
    spawnT: 0,
    slowT: 0,
    slowCd: 0,
    running: true,
    over: false,
    lastTs: 0
  };

  function reset() {
    state.lane = 1;
    state.hp = 3;
    state.score = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.nearMiss = 0;
    state.speed = 210;
    state.objs = [];
    state.spawnT = 0;
    state.slowT = 0;
    state.slowCd = 0;
    state.running = true;
    state.over = false;
    setStatusText(
      "Score: 0",
      "Playing",
      "A/D or Left/Right lane switch, Space slow-motion, Space restart after game over"
    );
  }

  function spawnObj() {
    const r = Math.random();
    const lane = Math.floor(Math.random() * 3);
    if (r < 0.52) {
      state.objs.push({ type: "obstacle", lane, y: -30, size: 30, nearGiven: false });
    } else if (r < 0.86) {
      state.objs.push({ type: "coin", lane, y: -24, size: 18 });
    } else {
      state.objs.push({ type: "booster", lane, y: -24, size: 20 });
    }
  }

  function takeHit() {
    state.hp -= 1;
    state.combo = 0;
    if (state.hp <= 0) {
      state.running = false;
      state.over = true;
      setStatusText(
        `Score: ${Math.floor(state.score)} | Near: ${state.nearMiss} | Max Combo: ${state.maxCombo}`,
        "Game Over - Press Space to restart"
      );
    }
  }

  function update(dt) {
    if (!state.running) return;

    state.slowT = Math.max(0, state.slowT - dt);
    state.slowCd = Math.max(0, state.slowCd - dt);

    const worldRate = state.slowT > 0 ? 0.45 : 1;
    const moveDt = dt * worldRate;

    state.speed = Math.min(420, state.speed + moveDt * 3.5);
    state.score += moveDt * 4 + state.combo * 0.2;

    state.spawnT -= moveDt;
    if (state.spawnT <= 0) {
      spawnObj();
      state.spawnT = Math.max(0.26, 0.72 - state.speed / 900);
    }

    for (const o of state.objs) {
      o.y += state.speed * moveDt;

      if (o.type === "obstacle" && !o.nearGiven) {
        const laneGap = Math.abs(o.lane - state.lane);
        if (laneGap === 1 && Math.abs(o.y - playerY) < 18) {
          o.nearGiven = true;
          state.nearMiss += 1;
          state.combo += 1;
          state.maxCombo = Math.max(state.maxCombo, state.combo);
          state.score += 22 + state.combo * 2;
        }
      }
    }

    for (const o of state.objs) {
      if (o.lane !== state.lane) continue;
      const dist = Math.abs(o.y - playerY);
      if (dist > 24) continue;

      if (o.type === "obstacle") {
        o.y = canvas.height + 999;
        takeHit();
      } else if (o.type === "coin") {
        o.y = canvas.height + 999;
        state.combo += 1;
        state.maxCombo = Math.max(state.maxCombo, state.combo);
        state.score += 18 + state.combo * 3;
      } else if (o.type === "booster") {
        o.y = canvas.height + 999;
        state.combo += 2;
        state.maxCombo = Math.max(state.maxCombo, state.combo);
        state.score += 40 + state.combo * 4;
        state.slowCd = Math.max(0, state.slowCd - 0.7);
      }
    }

    state.objs = state.objs.filter((o) => o.y < canvas.height + 40);

    setStatusText(
      `Score: ${Math.floor(state.score)} | Combo: ${state.combo} | HP: ${state.hp} | Near: ${state.nearMiss} | Slow:${state.slowCd > 0 ? "CD" : "Ready"}`,
      state.slowT > 0 ? "Slow Motion" : "Playing"
    );
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = state.slowT > 0 ? "#0a1630" : "#070d1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 1; i <= 2; i += 1) {
      const x = (canvas.width / 3) * i;
      ctx.strokeStyle = "#1f3a68";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (const o of state.objs) {
      const x = laneX[o.lane];
      if (o.type === "obstacle") {
        ctx.fillStyle = "#ff5d73";
        ctx.fillRect(x - o.size / 2, o.y - o.size / 2, o.size, o.size);
      } else if (o.type === "coin") {
        ctx.fillStyle = "#ffd166";
        ctx.beginPath();
        ctx.arc(x, o.y, o.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "#5de4c7";
        ctx.beginPath();
        ctx.moveTo(x, o.y - o.size / 2);
        ctx.lineTo(x - o.size / 2, o.y + o.size / 2);
        ctx.lineTo(x + o.size / 2, o.y + o.size / 2);
        ctx.closePath();
        ctx.fill();
      }
    }

    const px = laneX[state.lane];
    ctx.fillStyle = "#8df6ff";
    ctx.fillRect(px - 18, playerY - 18, 36, 36);

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

  function useSlow() {
    if (!state.running) return;
    if (state.slowCd > 0) return;
    state.slowT = 1.1;
    state.slowCd = 3.0;
  }

  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (e.code === "Space" && state.over) {
      reset();
      return;
    }
    if (!state.running) return;
    if (key === "arrowleft" || key === "a") state.lane = Math.max(0, state.lane - 1);
    if (key === "arrowright" || key === "d") state.lane = Math.min(2, state.lane + 1);
    if (e.code === "Space") useSlow();
  });

  reset();
  requestAnimationFrame(frame);
}

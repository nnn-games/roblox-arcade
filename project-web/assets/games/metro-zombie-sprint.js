export function startGame({ canvas, ctx, game, setStatusText }) {
  const laneX = [canvas.width * 0.25, canvas.width * 0.5, canvas.width * 0.75];
  const groundY = canvas.height - 72;

  const state = {
    lane: 1,
    y: groundY,
    vy: 0,
    width: 28,
    height: 48,
    sliding: false,
    slideT: 0,
    pushT: 0,
    hp: 3,
    speed: 230,
    distance: 0,
    score: 0,
    kills: 0,
    noHitTime: 0,
    objs: [],
    spawnT: 0,
    bossMode: false,
    bossT: 0,
    running: true,
    over: false,
    lastTs: 0
  };

  function reset() {
    state.lane = 1;
    state.y = groundY;
    state.vy = 0;
    state.width = 28;
    state.height = 48;
    state.sliding = false;
    state.slideT = 0;
    state.pushT = 0;
    state.hp = 3;
    state.speed = 230;
    state.distance = 0;
    state.score = 0;
    state.kills = 0;
    state.noHitTime = 0;
    state.objs = [];
    state.spawnT = 0;
    state.bossMode = false;
    state.bossT = 0;
    state.running = true;
    state.over = false;
    setStatusText(
      "Score: 0",
      "Playing",
      "Left/Right lane, Up jump, Down slide, Z push, Space restart after game over"
    );
  }

  function spawnObj() {
    if (state.bossMode) return;
    const r = Math.random();
    if (r < 0.48) {
      state.objs.push({
        type: "zombie",
        lane: Math.floor(Math.random() * 3),
        y: groundY,
        w: 28,
        h: 44,
        xOff: 0,
        hp: 1
      });
    } else if (r < 0.82) {
      state.objs.push({
        type: "barrier",
        lane: Math.floor(Math.random() * 3),
        y: groundY,
        w: 32,
        h: 58,
        xOff: 0
      });
    } else {
      state.objs.push({
        type: "lowbar",
        lane: Math.floor(Math.random() * 3),
        y: groundY - 38,
        w: 44,
        h: 18,
        xOff: 0
      });
    }
  }

  function enterBossSegment() {
    state.bossMode = true;
    state.bossT = 7.5;
    state.objs.push({
      type: "boss",
      lane: 1,
      y: groundY,
      w: 84,
      h: 74,
      xOff: canvas.width * 0.65,
      hp: 10
    });
  }

  function playerRect() {
    return {
      x: laneX[state.lane] - state.width / 2,
      y: state.y - state.height,
      w: state.width,
      h: state.height
    };
  }

  function intersects(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function pushAttack() {
    if (!state.running) return;
    state.pushT = 0.16;
    const p = playerRect();
    const atk = { x: p.x + p.w - 2, y: p.y + 8, w: 42, h: p.h - 12 };
    for (const o of state.objs) {
      const ox = laneX[o.lane] + (o.xOff || 0);
      const r = { x: ox - o.w / 2, y: o.y - o.h, w: o.w, h: o.h };
      if (!intersects(atk, r)) continue;
      if (o.type === "zombie") {
        o.hp = 0;
        state.kills += 1;
        state.score += 42;
      } else if (o.type === "boss") {
        o.hp -= 1;
        state.score += 14;
      }
    }
  }

  function takeHit() {
    state.hp -= 1;
    state.noHitTime = 0;
    if (state.hp <= 0) {
      state.running = false;
      state.over = true;
      setStatusText(
        `Score: ${Math.floor(state.score)} | Dist: ${Math.floor(state.distance)}m | Kills: ${state.kills}`,
        "Game Over - Press Space to restart"
      );
    }
  }

  function updatePlayer(dt) {
    state.pushT = Math.max(0, state.pushT - dt);

    if (state.sliding) {
      state.slideT -= dt;
      if (state.slideT <= 0) {
        state.sliding = false;
        state.height = 48;
      }
    }

    state.vy += 1700 * dt;
    state.y += state.vy * dt;
    if (state.y > groundY) {
      state.y = groundY;
      state.vy = 0;
    }
  }

  function updateObjects(dt) {
    for (const o of state.objs) {
      if (o.type === "boss") {
        o.xOff -= Math.max(90, state.speed * 0.55) * dt;
      } else {
        o.xOff -= state.speed * dt;
      }
    }

    const p = playerRect();
    for (const o of state.objs) {
      if (o.hp !== undefined && o.hp <= 0) continue;
      const ox = laneX[o.lane] + (o.xOff || 0);
      const r = { x: ox - o.w / 2, y: o.y - o.h, w: o.w, h: o.h };

      if (intersects(p, r)) {
        if (o.type === "lowbar" && state.sliding) {
          o.xOff = -999;
          state.score += 10;
        } else if (o.type === "barrier" && state.y < groundY - 8) {
          o.xOff = -999;
          state.score += 12;
        } else {
          o.xOff = -999;
          takeHit();
        }
      }
    }

    for (const o of state.objs) {
      if (o.type === "boss" && o.hp <= 0) {
        state.score += 280;
        o.xOff = -999;
        state.bossMode = false;
        state.bossT = 0;
      }
    }

    state.objs = state.objs.filter((o) => {
      const ox = laneX[o.lane] + (o.xOff || 0);
      return ox > -120 && (o.hp === undefined || o.hp > 0);
    });
  }

  function update(dt) {
    if (!state.running) return;

    state.speed = Math.min(430, state.speed + dt * 3.8);
    state.distance += (state.speed * dt) / 11;
    state.score += dt * 3 + (state.distance * 0.01);
    state.noHitTime += dt;
    if (state.noHitTime >= 12) {
      state.score += 28;
      state.noHitTime = 0;
    }

    if (!state.bossMode && state.distance > 0 && Math.floor(state.distance) % 700 < 5) {
      enterBossSegment();
    }
    if (state.bossMode) state.bossT -= dt;

    state.spawnT -= dt;
    if (state.spawnT <= 0 && !state.bossMode) {
      spawnObj();
      state.spawnT = Math.max(0.3, 0.88 - state.speed / 700);
    }

    updatePlayer(dt);
    updateObjects(dt);

    if (state.bossMode && state.bossT <= 0) {
      state.bossMode = false;
      state.objs = state.objs.filter((o) => o.type !== "boss");
      state.score += 90;
    }

    setStatusText(
      `Score: ${Math.floor(state.score)} | Dist: ${Math.floor(state.distance)}m | Kills: ${state.kills} | HP:${state.hp}`,
      state.bossMode ? "Boss Segment" : "Playing"
    );
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#070b14";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 3; i += 1) {
      const x = laneX[i];
      ctx.strokeStyle = "#1b335f";
      ctx.beginPath();
      ctx.moveTo(x - 36, 0);
      ctx.lineTo(x - 36, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 36, 0);
      ctx.lineTo(x + 36, canvas.height);
      ctx.stroke();
    }

    for (const o of state.objs) {
      const x = laneX[o.lane] + (o.xOff || 0);
      if (o.type === "zombie") ctx.fillStyle = "#98fb98";
      else if (o.type === "boss") ctx.fillStyle = "#ff9f43";
      else ctx.fillStyle = "#ff5d73";
      ctx.fillRect(x - o.w / 2, o.y - o.h, o.w, o.h);
      if (o.type === "boss") {
        ctx.fillStyle = "#1a1f30";
        ctx.fillRect(x - 38, o.y - o.h - 12, 76, 8);
        ctx.fillStyle = "#ffe08a";
        ctx.fillRect(x - 38, o.y - o.h - 12, (Math.max(0, o.hp) / 10) * 76, 8);
      }
    }

    const p = playerRect();
    ctx.fillStyle = "#5de4c7";
    ctx.fillRect(p.x, p.y, p.w, p.h);
    if (state.pushT > 0) {
      ctx.fillStyle = "#ffe38f";
      ctx.fillRect(p.x + p.w - 2, p.y + 8, 42, p.h - 12);
    }

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

  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (e.code === "Space" && state.over) {
      reset();
      return;
    }
    if (!state.running) return;

    if (key === "arrowleft" || key === "a") state.lane = Math.max(0, state.lane - 1);
    if (key === "arrowright" || key === "d") state.lane = Math.min(2, state.lane + 1);
    if ((key === "arrowup" || key === "w") && state.y >= groundY - 1) state.vy = -620;
    if (key === "arrowdown" || key === "s") {
      if (!state.sliding && state.y >= groundY - 1) {
        state.sliding = true;
        state.slideT = 0.5;
        state.height = 28;
      }
    }
    if (key === "z") pushAttack();
  });

  reset();
  requestAnimationFrame(frame);
}

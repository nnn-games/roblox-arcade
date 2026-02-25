export function startGame({ canvas, ctx, game, setStatusText }) {
  const laneX = [canvas.width * 0.34, canvas.width * 0.66];

  const state = {
    lane: 0,
    hp: 4,
    score: 0,
    wave: 1,
    kills: 0,
    hitCount: 0,
    playerBullets: [],
    enemyBullets: [],
    enemies: [],
    boss: null,
    shootCd: 0,
    shieldCd: 0,
    shieldT: 0,
    spawnTimer: 0,
    patternIndex: 0,
    running: true,
    over: false,
    lastTs: 0
  };

  function reset() {
    state.lane = 0;
    state.hp = 4;
    state.score = 0;
    state.wave = 1;
    state.kills = 0;
    state.hitCount = 0;
    state.playerBullets = [];
    state.enemyBullets = [];
    state.enemies = [];
    state.boss = null;
    state.shootCd = 0;
    state.shieldCd = 0;
    state.shieldT = 0;
    state.spawnTimer = 0;
    state.patternIndex = 0;
    state.running = true;
    state.over = false;
    setStatusText(
      "Score: 0",
      "Playing",
      "Left/Right switch lane, Z shoot, Space shield, Space restart after game over"
    );
  }

  function playerPos() {
    return { x: laneX[state.lane], y: canvas.height - 64 };
  }

  function spawnEnemyWave() {
    const count = 4 + state.wave;
    for (let i = 0; i < count; i += 1) {
      state.enemies.push({
        lane: Math.random() < 0.5 ? 0 : 1,
        y: -30 - i * 38,
        hp: 1 + Math.floor(state.wave / 3),
        fireT: 0.3 + Math.random() * 1.0
      });
    }
  }

  function spawnBoss() {
    state.boss = {
      x: canvas.width / 2,
      y: 120,
      hp: 42,
      phase: 1,
      fireT: 0.2,
      moveDir: 1
    };
  }

  function shoot() {
    if (!state.running || state.shootCd > 0) return;
    state.shootCd = 0.14;
    const p = playerPos();
    state.playerBullets.push({ x: p.x, y: p.y - 16, vy: -520, dmg: 1 });
  }

  function useShield() {
    if (!state.running || state.shieldCd > 0) return;
    state.shieldCd = 1.8;
    state.shieldT = 0.35;
  }

  function pushEnemyPattern() {
    if (state.enemyBullets.length > 120) return;
    const pId = state.patternIndex % 6;
    state.patternIndex += 1;
    const p = playerPos();

    const push = (x, y, vx, vy) => {
      if (state.enemyBullets.length >= 120) return;
      state.enemyBullets.push({ x, y, vx, vy, r: 5 });
    };

    if (pId === 0) {
      for (const x of laneX) push(x, 0, 0, 210);
    } else if (pId === 1) {
      push(laneX[0], 0, 0, 230);
      push(laneX[1], 40, 0, 230);
    } else if (pId === 2) {
      push(laneX[0], 0, 50, 210);
      push(laneX[1], 0, -50, 210);
    } else if (pId === 3) {
      push(p.x, 0, 0, 250);
      push(laneX[0], 30, 0, 230);
      push(laneX[1], 30, 0, 230);
    } else if (pId === 4) {
      for (let i = 0; i < 5; i += 1) push(i % 2 ? laneX[0] : laneX[1], -i * 20, 0, 230);
    } else {
      push(laneX[0], 0, 30, 220);
      push(laneX[1], 0, -30, 220);
      push((laneX[0] + laneX[1]) / 2, 20, 0, 240);
    }
  }

  function takeHit() {
    if (state.shieldT > 0) return;
    state.hp -= 1;
    state.hitCount += 1;
    if (state.hp <= 0) {
      state.running = false;
      state.over = true;
      setStatusText(
        `Score: ${Math.floor(state.score)} | Wave: ${state.wave} | Kills: ${state.kills}`,
        "Game Over - Press Space to restart"
      );
    }
  }

  function updateEnemies(dt) {
    for (const e of state.enemies) {
      e.y += (90 + state.wave * 8) * dt;
      e.fireT -= dt;
      if (e.fireT <= 0) {
        e.fireT = 1.4 + Math.random() * 0.6;
        if (state.enemyBullets.length < 120) {
          state.enemyBullets.push({ x: laneX[e.lane], y: e.y + 14, vx: 0, vy: 240, r: 5 });
        }
      }
    }
    state.enemies = state.enemies.filter((e) => e.y < canvas.height + 30 && e.hp > 0);
  }

  function updateBoss(dt) {
    const b = state.boss;
    if (!b) return;
    b.x += b.moveDir * 85 * dt;
    if (b.x < 110 || b.x > canvas.width - 110) b.moveDir *= -1;
    b.fireT -= dt;
    if (b.fireT <= 0) {
      b.fireT = b.phase === 1 ? 0.5 : 0.32;
      if (state.enemyBullets.length < 120) {
        if (b.phase === 1) {
          state.enemyBullets.push({ x: b.x - 60, y: b.y + 22, vx: -20, vy: 220, r: 6 });
          state.enemyBullets.push({ x: b.x + 60, y: b.y + 22, vx: 20, vy: 220, r: 6 });
        } else {
          state.enemyBullets.push({ x: b.x, y: b.y + 22, vx: 0, vy: 260, r: 6 });
          state.enemyBullets.push({ x: b.x - 50, y: b.y + 22, vx: -40, vy: 240, r: 6 });
          state.enemyBullets.push({ x: b.x + 50, y: b.y + 22, vx: 40, vy: 240, r: 6 });
        }
      }
    }
    if (b.hp <= 20) b.phase = 2;
    if (b.hp <= 0) {
      state.score += 600;
      state.boss = null;
      state.wave += 1;
      spawnEnemyWave();
    }
  }

  function updateBullets(dt) {
    for (const b of state.playerBullets) b.y += b.vy * dt;
    state.playerBullets = state.playerBullets.filter((b) => b.y > -30);

    for (const b of state.enemyBullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
    state.enemyBullets = state.enemyBullets.filter((b) => b.y < canvas.height + 30);
  }

  function handleCollisions() {
    const p = playerPos();
    for (const b of state.enemyBullets) {
      if (Math.hypot(b.x - p.x, b.y - p.y) < 16) {
        b.y = canvas.height + 999;
        takeHit();
      }
    }

    for (const pb of state.playerBullets) {
      for (const e of state.enemies) {
        if (e.lane !== (pb.x < canvas.width / 2 ? 0 : 1)) continue;
        if (Math.abs(pb.y - e.y) < 20) {
          e.hp -= pb.dmg;
          pb.y = -999;
          if (e.hp <= 0) {
            state.kills += 1;
            state.score += 50;
          }
        }
      }
      const b = state.boss;
      if (b && Math.abs(pb.x - b.x) < 80 && Math.abs(pb.y - b.y) < 28) {
        b.hp -= pb.dmg;
        pb.y = -999;
        state.score += 12;
      }
    }

    state.playerBullets = state.playerBullets.filter((b) => b.y > -100);
    state.enemyBullets = state.enemyBullets.filter((b) => b.y < canvas.height + 200);

    for (const e of state.enemies) {
      const ex = laneX[e.lane];
      if (Math.abs(ex - p.x) < 20 && Math.abs(e.y - p.y) < 20) {
        e.y = canvas.height + 999;
        takeHit();
      }
    }
  }

  function update(dt) {
    if (!state.running) return;

    state.shootCd = Math.max(0, state.shootCd - dt);
    state.shieldCd = Math.max(0, state.shieldCd - dt);
    state.shieldT = Math.max(0, state.shieldT - dt);

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      pushEnemyPattern();
      state.spawnTimer = Math.max(0.35, 1.0 - state.wave * 0.06);
    }

    if (state.enemies.length === 0 && !state.boss) {
      if (state.wave % 3 === 0) spawnBoss();
      else spawnEnemyWave();
    }

    updateEnemies(dt);
    updateBoss(dt);
    updateBullets(dt);
    handleCollisions();

    if (state.enemies.length === 0 && !state.boss) {
      state.score += 120 + state.wave * 25;
      state.wave += 1;
      if (state.wave % 3 === 0) spawnBoss();
      else spawnEnemyWave();
    }

    state.score += dt * 2;
    setStatusText(
      `Score: ${Math.floor(state.score)} | Wave: ${state.wave} | HP: ${state.hp} | Shield:${state.shieldCd > 0 ? "CD" : "Ready"}`,
      "Playing"
    );
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#070e1b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#223b66";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    for (const e of state.enemies) {
      ctx.fillStyle = "#ff5d73";
      const x = laneX[e.lane];
      ctx.fillRect(x - 14, e.y - 14, 28, 28);
    }

    if (state.boss) {
      ctx.fillStyle = "#ff9f43";
      ctx.fillRect(state.boss.x - 80, state.boss.y - 24, 160, 48);
      ctx.fillStyle = "#1a1f30";
      ctx.fillRect(state.boss.x - 64, state.boss.y - 10, 128, 12);
      ctx.fillStyle = "#ffe08a";
      ctx.fillRect(state.boss.x - 64, state.boss.y - 10, (state.boss.hp / 42) * 128, 12);
    }

    ctx.fillStyle = "#ffe38f";
    for (const b of state.playerBullets) ctx.fillRect(b.x - 2, b.y - 8, 4, 12);

    ctx.fillStyle = "#8fc7ff";
    for (const b of state.enemyBullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }

    const p = playerPos();
    ctx.fillStyle = state.shieldT > 0 ? "#9dfcff" : "#5de4c7";
    ctx.fillRect(p.x - 14, p.y - 14, 28, 28);
    if (state.shieldT > 0) {
      ctx.strokeStyle = "#b7ffff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
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

  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (e.code === "Space" && state.over) {
      reset();
      return;
    }
    if (!state.running) return;
    if (key === "arrowleft" || key === "a") state.lane = 0;
    if (key === "arrowright" || key === "d") state.lane = 1;
    if (key === "z") shoot();
    if (e.code === "Space") useShield();
  });

  reset();
  spawnEnemyWave();
  requestAnimationFrame(frame);
}

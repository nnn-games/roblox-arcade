function laneCenter(canvasWidth, laneIndex) {
  const laneWidth = canvasWidth / 3;
  return laneWidth * laneIndex + laneWidth / 2;
}

export function startGame({ canvas, ctx, game, setStatusText }) {
  const state = {
    lane: 1,
    hp: 3,
    score: 0,
    combo: 0,
    running: true,
    over: false,
    asteroids: [],
    bullets: [],
    spawnTimer: 0,
    cooldown: 0,
    lastTs: 0
  };

  function reset() {
    state.lane = 1;
    state.hp = 3;
    state.score = 0;
    state.combo = 0;
    state.running = true;
    state.over = false;
    state.asteroids = [];
    state.bullets = [];
    state.spawnTimer = 0;
    state.cooldown = 0;
    setStatusText(
      "Score: 0",
      "Playing",
      "Left/Right or A/D move lane, Space shoot. When game over, Space restarts."
    );
  }

  function shoot() {
    if (!state.running) return;
    if (state.cooldown > 0) return;
    state.cooldown = 0.16;
    state.bullets.push({
      lane: state.lane,
      y: canvas.height - 80,
      speed: 530
    });
  }

  function spawnAsteroid() {
    state.asteroids.push({
      lane: Math.floor(Math.random() * 3),
      y: -30,
      hp: 1,
      speed: 120 + Math.random() * 160
    });
  }

  function update(dt) {
    if (!state.running) return;

    state.spawnTimer -= dt;
    state.cooldown = Math.max(0, state.cooldown - dt);

    if (state.spawnTimer <= 0) {
      spawnAsteroid();
      const maxScoreFactor = Math.min(1.4, state.score / 1600);
      state.spawnTimer = 0.58 - maxScoreFactor * 0.2 + Math.random() * 0.24;
    }

    for (const b of state.bullets) b.y -= b.speed * dt;
    state.bullets = state.bullets.filter((b) => b.y > -30);

    for (const a of state.asteroids) a.y += a.speed * dt;

    for (const bullet of state.bullets) {
      for (const asteroid of state.asteroids) {
        if (bullet.lane !== asteroid.lane) continue;
        if (Math.abs(bullet.y - asteroid.y) > 24) continue;
        asteroid.hp -= 1;
        bullet.y = -999;
        if (asteroid.hp <= 0) {
          asteroid.y = canvas.height + 999;
          state.combo += 1;
          const gain = 20 + Math.min(80, state.combo * 3);
          state.score += gain;
        }
      }
    }

    state.bullets = state.bullets.filter((b) => b.y > -30);
    state.asteroids = state.asteroids.filter((a) => a.y < canvas.height + 40 && a.hp > 0);

    const playerY = canvas.height - 70;
    let damageTaken = false;
    for (const asteroid of state.asteroids) {
      if (asteroid.lane !== state.lane) continue;
      if (Math.abs(asteroid.y - playerY) < 28) {
        asteroid.y = canvas.height + 999;
        damageTaken = true;
      }
    }

    if (damageTaken) {
      state.hp -= 1;
      state.combo = 0;
      if (state.hp <= 0) {
        state.running = false;
        state.over = true;
        setStatusText(
          `Score: ${Math.floor(state.score)} | Combo: ${state.combo} | HP: 0`,
          "Game Over - Press Space to restart"
        );
      }
    }

    if (state.running) {
      state.score += dt * 5;
      setStatusText(
        `Score: ${Math.floor(state.score)} | Combo: ${state.combo} | HP: ${state.hp}`,
        "Playing"
      );
    }
  }

  function drawBackground() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#070d19";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let lane = 1; lane <= 2; lane += 1) {
      const x = (canvas.width / 3) * lane;
      ctx.strokeStyle = "#23406e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
  }

  function drawPlayer() {
    const x = laneCenter(canvas.width, state.lane);
    const y = canvas.height - 70;
    ctx.fillStyle = "#5de4c7";
    ctx.beginPath();
    ctx.moveTo(x, y - 20);
    ctx.lineTo(x - 16, y + 18);
    ctx.lineTo(x + 16, y + 18);
    ctx.closePath();
    ctx.fill();
  }

  function drawBullets() {
    ctx.fillStyle = "#ffeaa7";
    for (const b of state.bullets) {
      const x = laneCenter(canvas.width, b.lane);
      ctx.fillRect(x - 3, b.y - 12, 6, 18);
    }
  }

  function drawAsteroids() {
    ctx.fillStyle = "#ff5d73";
    for (const a of state.asteroids) {
      const x = laneCenter(canvas.width, a.lane);
      ctx.beginPath();
      ctx.arc(x, a.y, 14, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawHud() {
    ctx.fillStyle = "#b6c8e7";
    ctx.font = "14px Segoe UI";
    ctx.fillText(game.title, 12, 24);
    if (!state.running && state.over) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "18px Segoe UI";
      ctx.fillText("Press Space to Restart", 110, 320);
    }
  }

  function frame(ts) {
    if (!state.lastTs) state.lastTs = ts;
    const dt = Math.min(0.033, (ts - state.lastTs) / 1000);
    state.lastTs = ts;

    update(dt);
    drawBackground();
    drawPlayer();
    drawBullets();
    drawAsteroids();
    drawHud();
    requestAnimationFrame(frame);
  }

  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (key === "arrowleft" || key === "a") state.lane = Math.max(0, state.lane - 1);
    if (key === "arrowright" || key === "d") state.lane = Math.min(2, state.lane + 1);
    if (e.code === "Space" && state.over) {
      reset();
      return;
    }
    if (e.code === "Space") shoot();
  });

  reset();
  requestAnimationFrame(frame);
}

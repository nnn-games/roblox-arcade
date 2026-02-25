export function startGame({ canvas, ctx, game, setStatusText }) {
  const groundY = canvas.height - 26;

  const state = {
    player: { x: canvas.width / 2, y: groundY, w: 24, h: 34, vx: 0, vy: 0, hp: 3, invuln: 0 },
    keys: { left: false, right: false },
    stage: 1,
    timeLeft: 75,
    score: 0,
    hitCount: 0,
    slimes: [],
    shots: [],
    shootCd: 0,
    running: true,
    over: false,
    lastTs: 0
  };

  function spawnStage(stage) {
    state.slimes = [];
    const cnt = Math.min(4, 1 + Math.floor(stage / 2));
    for (let i = 0; i < cnt; i += 1) {
      const size = stage >= 3 ? 2 : 3;
      state.slimes.push({
        x: 80 + i * 90,
        y: 180,
        vx: i % 2 ? 120 : -120,
        vy: -220,
        size
      });
    }
    state.timeLeft = 70 + Math.max(0, 20 - stage * 3);
  }

  function slimeRadius(size) {
    if (size === 3) return 26;
    if (size === 2) return 18;
    return 12;
  }

  function reset() {
    state.player.x = canvas.width / 2;
    state.player.y = groundY;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.hp = 3;
    state.player.invuln = 0;
    state.keys.left = false;
    state.keys.right = false;
    state.stage = 1;
    state.timeLeft = 75;
    state.score = 0;
    state.hitCount = 0;
    state.slimes = [];
    state.shots = [];
    state.shootCd = 0;
    state.running = true;
    state.over = false;
    spawnStage(state.stage);
    setStatusText(
      "Score: 0",
      "Playing",
      "Left/Right move, Up jump, Z fire harpoon, Space restart after game over"
    );
  }

  function fire() {
    if (!state.running || state.shootCd > 0) return;
    state.shootCd = 0.2;
    state.shots.push({ x: state.player.x, y: state.player.y - state.player.h, h: 0, grow: 560 });
  }

  function splitSlime(index) {
    const s = state.slimes[index];
    if (!s) return;
    if (s.size > 1) {
      const ns = s.size - 1;
      const jump = ns === 2 ? -280 : -240;
      state.slimes.push({ x: s.x - 10, y: s.y, vx: -150, vy: jump, size: ns });
      state.slimes.push({ x: s.x + 10, y: s.y, vx: 150, vy: jump, size: ns });
      state.score += 40;
    } else {
      state.score += 65;
    }
    state.slimes.splice(index, 1);
  }

  function takeHit() {
    if (state.player.invuln > 0) return;
    state.player.hp -= 1;
    state.player.invuln = 1.0;
    state.hitCount += 1;
    state.score = Math.max(0, state.score - 25);
    if (state.player.hp <= 0) {
      state.running = false;
      state.over = true;
      setStatusText(
        `Score: ${Math.floor(state.score)} | Stage: ${state.stage} | Hits: ${state.hitCount}`,
        "Game Over - Press Space to restart"
      );
    }
  }

  function clearStage() {
    const bonus = Math.floor(state.timeLeft) * 25;
    state.score += 200 + state.stage * 60 + bonus;
    state.stage += 1;
    spawnStage(state.stage);
  }

  function updatePlayer(dt) {
    const p = state.player;
    p.invuln = Math.max(0, p.invuln - dt);

    const mv = (state.keys.right ? 1 : 0) - (state.keys.left ? 1 : 0);
    p.vx = mv * 190;
    p.vy += 1400 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.x = Math.max(12, Math.min(canvas.width - 12, p.x));
    if (p.y > groundY) {
      p.y = groundY;
      p.vy = 0;
    }
  }

  function updateSlimes(dt) {
    for (const s of state.slimes) {
      const r = slimeRadius(s.size);
      s.vy += 900 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      if (s.x < r || s.x > canvas.width - r) s.vx *= -1;
      if (s.y > groundY - r) {
        s.y = groundY - r;
        s.vy = -(230 + (4 - s.size) * 40);
      }
    }
  }

  function updateShots(dt) {
    for (const sh of state.shots) {
      sh.h += sh.grow * dt;
    }
    state.shots = state.shots.filter((sh) => sh.y - sh.h > -20);
  }

  function handleCollisions() {
    const p = state.player;
    for (let i = state.slimes.length - 1; i >= 0; i -= 1) {
      const s = state.slimes[i];
      const r = slimeRadius(s.size);
      const dx = s.x - p.x;
      const dy = s.y - (p.y - p.h / 2);
      if (Math.hypot(dx, dy) < r + p.w * 0.4) takeHit();
    }

    for (const sh of state.shots) {
      for (let i = state.slimes.length - 1; i >= 0; i -= 1) {
        const s = state.slimes[i];
        const r = slimeRadius(s.size);
        const withinX = Math.abs(sh.x - s.x) <= r + 2;
        const top = sh.y - sh.h;
        const bottom = sh.y;
        const withinY = s.y + r >= top && s.y - r <= bottom;
        if (withinX && withinY) {
          splitSlime(i);
          sh.h = 9999;
          break;
        }
      }
    }
    state.shots = state.shots.filter((sh) => sh.h < 9999);
  }

  function update(dt) {
    if (!state.running) return;
    state.shootCd = Math.max(0, state.shootCd - dt);
    state.timeLeft -= dt;
    if (state.timeLeft <= 0) {
      takeHit();
      state.timeLeft = 10;
    }

    updatePlayer(dt);
    updateSlimes(dt);
    updateShots(dt);
    handleCollisions();

    if (state.slimes.length === 0) clearStage();

    setStatusText(
      `Score: ${Math.floor(state.score)} | Stage: ${state.stage} | Time: ${Math.ceil(state.timeLeft)}s | HP:${state.player.hp}`,
      "Playing"
    );
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0b1120";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1a2e53";
    ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

    ctx.strokeStyle = "#c4f2ff";
    for (const sh of state.shots) {
      ctx.beginPath();
      ctx.moveTo(sh.x, sh.y);
      ctx.lineTo(sh.x, sh.y - sh.h);
      ctx.stroke();
    }

    for (const s of state.slimes) {
      const r = slimeRadius(s.size);
      ctx.fillStyle = s.size === 3 ? "#ff7c6b" : s.size === 2 ? "#ffd166" : "#7df9d1";
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const p = state.player;
    const flash = p.invuln > 0 && Math.floor(p.invuln * 20) % 2 === 0;
    ctx.fillStyle = flash ? "#ffffff" : "#5de4c7";
    ctx.fillRect(p.x - p.w / 2, p.y - p.h, p.w, p.h);

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
    if (key === "arrowleft" || key === "a") state.keys.left = true;
    if (key === "arrowright" || key === "d") state.keys.right = true;
    if ((key === "arrowup" || key === "w") && state.player.y >= groundY - 1) state.player.vy = -640;
    if (key === "z") fire();
  });
  window.addEventListener("keyup", (e) => {
    const key = e.key.toLowerCase();
    if (key === "arrowleft" || key === "a") state.keys.left = false;
    if (key === "arrowright" || key === "d") state.keys.right = false;
  });

  reset();
  requestAnimationFrame(frame);
}

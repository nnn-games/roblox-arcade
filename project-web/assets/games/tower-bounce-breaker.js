export function startGame({ canvas, ctx, game, setStatusText }) {
  const paddleY = canvas.height - 38;

  const state = {
    stage: 1,
    score: 0,
    chain: 0,
    shots: 0,
    blocks: [],
    ball: null,
    aiming: { active: false, sx: 0, sy: 0, ex: 0, ey: 0 },
    running: true,
    over: false,
    lastTs: 0
  };

  function spawnStage(stage) {
    state.blocks = [];
    const rows = Math.min(6, 3 + Math.floor(stage / 2));
    const cols = 8;
    const bw = 44;
    const bh = 20;
    const offsetX = (canvas.width - cols * bw) / 2;
    const offsetY = 70;

    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (Math.random() < 0.12) continue;
        const core = r === 0 && c === Math.floor(cols / 2) && stage % 3 === 0;
        state.blocks.push({
          x: offsetX + c * bw,
          y: offsetY + r * bh,
          w: bw - 2,
          h: bh - 2,
          hp: core ? 3 : 1 + Math.floor(stage / 3),
          core
        });
      }
    }
  }

  function reset() {
    state.stage = 1;
    state.score = 0;
    state.chain = 0;
    state.shots = 0;
    state.ball = null;
    state.aiming = { active: false, sx: canvas.width / 2, sy: paddleY, ex: canvas.width / 2, ey: paddleY - 60 };
    state.running = true;
    state.over = false;
    spawnStage(state.stage);
    setStatusText(
      "Score: 0",
      "Aiming",
      "Drag mouse to aim, click to fire, clear blocks, Space restart after game over"
    );
  }

  function launchBall(targetX, targetY) {
    if (state.ball || !state.running) return;
    const sx = canvas.width / 2;
    const sy = paddleY;
    const dx = targetX - sx;
    const dy = targetY - sy;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len;
    const ny = dy / len;
    if (ny > -0.15) return; // must shoot upward

    state.ball = { x: sx, y: sy, vx: nx * 320, vy: ny * 320, r: 8, life: 14 };
    state.shots += 1;
    state.chain = 0;
  }

  function collideBallRect(ball, rect) {
    const cx = Math.max(rect.x, Math.min(ball.x, rect.x + rect.w));
    const cy = Math.max(rect.y, Math.min(ball.y, rect.y + rect.h));
    const dx = ball.x - cx;
    const dy = ball.y - cy;
    return dx * dx + dy * dy <= ball.r * ball.r;
  }

  function reflectByRect(ball, rect) {
    const prevX = ball.x - ball.vx * 0.016;
    const prevY = ball.y - ball.vy * 0.016;
    const wasLeft = prevX < rect.x;
    const wasRight = prevX > rect.x + rect.w;
    const wasTop = prevY < rect.y;
    const wasBottom = prevY > rect.y + rect.h;

    if (wasLeft || wasRight) ball.vx *= -1;
    if (wasTop || wasBottom) ball.vy *= -1;
    if (!(wasLeft || wasRight || wasTop || wasBottom)) ball.vy *= -1;
  }

  function clearStage() {
    state.score += 180 + state.stage * 60;
    state.stage += 1;
    spawnStage(state.stage);
    state.ball = null;
    state.chain = 0;
  }

  function updateBall(dt) {
    const b = state.ball;
    if (!b) return;

    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;

    if (b.x < b.r) {
      b.x = b.r;
      b.vx *= -1;
      state.chain += 1;
    }
    if (b.x > canvas.width - b.r) {
      b.x = canvas.width - b.r;
      b.vx *= -1;
      state.chain += 1;
    }
    if (b.y < b.r) {
      b.y = b.r;
      b.vy *= -1;
      state.chain += 1;
    }

    for (let i = state.blocks.length - 1; i >= 0; i -= 1) {
      const blk = state.blocks[i];
      if (!collideBallRect(b, blk)) continue;
      reflectByRect(b, blk);
      blk.hp -= 1;
      if (blk.hp <= 0) {
        const gain = blk.core ? 260 : 30 + Math.min(120, state.chain * 2);
        state.score += gain;
        state.blocks.splice(i, 1);
        if (blk.core) {
          clearStage();
          return;
        }
      }
      state.chain += 1;
      break;
    }

    if (state.blocks.length === 0) {
      clearStage();
      return;
    }

    if (b.y > canvas.height + 30 || b.life <= 0) {
      state.ball = null;
      state.chain = 0;
    }
  }

  function update(dt) {
    if (!state.running) return;
    updateBall(dt);
    if (state.ball) {
      setStatusText(
        `Score: ${Math.floor(state.score)} | Stage: ${state.stage} | Chain:${state.chain} | Shots:${state.shots}`,
        "Ball Flying"
      );
    } else {
      setStatusText(
        `Score: ${Math.floor(state.score)} | Stage: ${state.stage} | Shots:${state.shots}`,
        "Aiming"
      );
    }
  }

  function drawAiming() {
    if (state.ball) return;
    const sx = canvas.width / 2;
    const sy = paddleY;
    const tx = state.aiming.ex;
    const ty = state.aiming.ey;
    ctx.strokeStyle = "#9dd6ff";
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0a1020";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const blk of state.blocks) {
      ctx.fillStyle = blk.core ? "#ff9f43" : "#6f86ff";
      ctx.fillRect(blk.x, blk.y, blk.w, blk.h);
      if (blk.hp > 1) {
        ctx.fillStyle = "#1a1f30";
        ctx.font = "12px Segoe UI";
        ctx.fillText(String(blk.hp), blk.x + blk.w / 2 - 3, blk.y + blk.h / 2 + 4);
      }
    }

    ctx.fillStyle = "#5de4c7";
    ctx.fillRect(canvas.width / 2 - 30, paddleY - 6, 60, 10);

    if (state.ball) {
      ctx.fillStyle = "#ffe38f";
      ctx.beginPath();
      ctx.arc(state.ball.x, state.ball.y, state.ball.r, 0, Math.PI * 2);
      ctx.fill();
    }

    drawAiming();

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

  canvas.addEventListener("mousedown", (e) => {
    if (!state.running) return;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    state.aiming.active = true;
    state.aiming.sx = (e.clientX - rect.left) * sx;
    state.aiming.sy = (e.clientY - rect.top) * sy;
    state.aiming.ex = state.aiming.sx;
    state.aiming.ey = state.aiming.sy;
  });
  canvas.addEventListener("mousemove", (e) => {
    if (!state.aiming.active) return;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    state.aiming.ex = (e.clientX - rect.left) * sx;
    state.aiming.ey = (e.clientY - rect.top) * sy;
  });
  window.addEventListener("mouseup", () => {
    if (!state.aiming.active) return;
    state.aiming.active = false;
    launchBall(state.aiming.ex, state.aiming.ey);
  });

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && state.over) reset();
  });

  reset();
  requestAnimationFrame(frame);
}

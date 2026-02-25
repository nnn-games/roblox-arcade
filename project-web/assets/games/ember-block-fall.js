export function startGame({ canvas, ctx, game, setStatusText }) {
  const cols = 10;
  const rows = 20;
  const cell = 28;
  const boardX = 70;
  const boardY = 40;

  const pieces = [
    { color: "#ff6b6b", cells: [[0, 0], [1, 0], [-1, 0], [-2, 0]] },
    { color: "#ffd166", cells: [[0, 0], [1, 0], [0, -1], [1, -1]] },
    { color: "#06d6a0", cells: [[0, 0], [1, 0], [-1, 0], [0, -1]] },
    { color: "#4cc9f0", cells: [[0, 0], [0, -1], [0, 1], [1, 1]] },
    { color: "#a78bfa", cells: [[0, 0], [0, -1], [0, 1], [-1, 1]] }
  ];

  const state = {
    board: [],
    current: null,
    score: 0,
    lines: 0,
    combo: 0,
    maxCombo: 0,
    overheat: 0,
    running: true,
    over: false,
    dropTimer: 0,
    lockDelay: 0,
    lastTs: 0
  };

  function emptyBoard() {
    return Array.from({ length: rows }, () => Array(cols).fill(null));
  }

  function copyPiece(p) {
    return { x: p.x, y: p.y, rot: p.rot, kind: p.kind };
  }

  function rotateCell(x, y, rot) {
    let rx = x;
    let ry = y;
    for (let i = 0; i < rot; i += 1) {
      const nx = -ry;
      const ny = rx;
      rx = nx;
      ry = ny;
    }
    return [rx, ry];
  }

  function getBlocks(piece) {
    const shape = pieces[piece.kind];
    return shape.cells.map(([cx, cy]) => {
      const [rx, ry] = rotateCell(cx, cy, piece.rot);
      return [piece.x + rx, piece.y + ry];
    });
  }

  function collides(piece) {
    const blocks = getBlocks(piece);
    for (const [x, y] of blocks) {
      if (x < 0 || x >= cols || y >= rows) return true;
      if (y >= 0 && state.board[y][x]) return true;
    }
    return false;
  }

  function spawn() {
    const kind = Math.floor(Math.random() * pieces.length);
    state.current = { x: 5, y: 1, rot: 0, kind };
    if (collides(state.current)) {
      state.running = false;
      state.over = true;
      setStatusText(
        `Score: ${state.score} | Lines: ${state.lines} | Heat: ${Math.floor(state.overheat)}`,
        "Game Over - Stack Out (Space restart)"
      );
    }
  }

  function tryMove(dx, dy) {
    const next = copyPiece(state.current);
    next.x += dx;
    next.y += dy;
    if (!collides(next)) {
      state.current = next;
      return true;
    }
    return false;
  }

  function tryRotate() {
    const next = copyPiece(state.current);
    next.rot = (next.rot + 1) % 4;
    if (!collides(next)) {
      state.current = next;
      return;
    }
    next.x += 1;
    if (!collides(next)) {
      state.current = next;
      return;
    }
    next.x -= 2;
    if (!collides(next)) state.current = next;
  }

  function lockPiece() {
    const shape = pieces[state.current.kind];
    for (const [x, y] of getBlocks(state.current)) {
      if (y >= 0 && y < rows && x >= 0 && x < cols) {
        state.board[y][x] = shape.color;
      }
    }
  }

  function clearLines() {
    let removed = 0;
    for (let y = rows - 1; y >= 0; y -= 1) {
      if (state.board[y].every(Boolean)) {
        state.board.splice(y, 1);
        state.board.unshift(Array(cols).fill(null));
        removed += 1;
        y += 1;
      }
    }

    if (removed > 0) {
      state.lines += removed;
      state.combo += 1;
      state.maxCombo = Math.max(state.maxCombo, state.combo);
      const base = [0, 100, 250, 450, 700][removed] || 0;
      const b2b = removed >= 2 ? 1.3 : 1.0;
      const comboBonus = 1 + Math.min(1.5, state.combo * 0.12);
      const gain = Math.floor(base * b2b * comboBonus);
      state.score += gain;
      state.overheat += 8 + removed * 10;
    } else {
      state.combo = 0;
      state.overheat = Math.max(0, state.overheat - 5.5);
    }
  }

  function hardDrop() {
    if (!state.running || !state.current) return;
    let steps = 0;
    while (tryMove(0, 1)) steps += 1;
    state.score += steps * 2;
    lockPiece();
    clearLines();
    spawn();
  }

  function reset() {
    state.board = emptyBoard();
    state.current = null;
    state.score = 0;
    state.lines = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.overheat = 0;
    state.running = true;
    state.over = false;
    state.dropTimer = 0;
    state.lockDelay = 0;
    setStatusText(
      "Score: 0",
      "Playing",
      "Left/Right move, Up rotate, Down soft drop, Space hard drop/restart"
    );
    spawn();
  }

  function update(dt) {
    if (!state.running) return;

    state.overheat = Math.max(0, state.overheat - dt * 2.5);
    if (state.overheat >= 100) {
      state.running = false;
      state.over = true;
      setStatusText(
        `Score: ${state.score} | Lines: ${state.lines} | Max Combo: ${state.maxCombo}`,
        "Game Over - Overheat (Space restart)"
      );
      return;
    }

    const speed = Math.max(0.08, 0.75 - state.lines * 0.015);
    state.dropTimer += dt;
    if (state.dropTimer >= speed) {
      state.dropTimer = 0;
      if (!tryMove(0, 1)) {
        state.lockDelay += dt;
        if (state.lockDelay > 0.08) {
          lockPiece();
          clearLines();
          spawn();
          state.lockDelay = 0;
        }
      } else {
        state.lockDelay = 0;
      }
    }

    setStatusText(
      `Score: ${state.score} | Lines: ${state.lines} | Combo: ${state.combo} | Heat: ${Math.floor(state.overheat)}%`,
      "Playing"
    );
  }

  function drawBoard() {
    ctx.fillStyle = "#091020";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#0f1a32";
    ctx.fillRect(boardX - 2, boardY - 2, cols * cell + 4, rows * cell + 4);

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const c = state.board[y][x];
        ctx.fillStyle = c || "#132241";
        ctx.fillRect(boardX + x * cell, boardY + y * cell, cell - 1, cell - 1);
      }
    }
  }

  function drawCurrent() {
    if (!state.current) return;
    const c = pieces[state.current.kind].color;
    ctx.fillStyle = c;
    for (const [x, y] of getBlocks(state.current)) {
      if (y < 0) continue;
      ctx.fillRect(boardX + x * cell, boardY + y * cell, cell - 1, cell - 1);
    }
  }

  function drawHud() {
    ctx.fillStyle = "#b6c8e7";
    ctx.font = "14px Segoe UI";
    ctx.fillText(game.title, 12, 24);

    const heatW = 140;
    ctx.fillStyle = "#223b66";
    ctx.fillRect(12, 34, heatW, 10);
    ctx.fillStyle = state.overheat > 75 ? "#ff5d73" : "#ffb86b";
    ctx.fillRect(12, 34, (Math.min(100, state.overheat) / 100) * heatW, 10);

    if (state.over) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "18px Segoe UI";
      ctx.fillText("Game Over - Press Space", 108, 320);
    }
  }

  function frame(ts) {
    if (!state.lastTs) state.lastTs = ts;
    const dt = Math.min(0.033, (ts - state.lastTs) / 1000);
    state.lastTs = ts;
    update(dt);
    drawBoard();
    drawCurrent();
    drawHud();
    requestAnimationFrame(frame);
  }

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && state.over) {
      reset();
      return;
    }
    if (!state.running || !state.current) return;

    const key = e.key.toLowerCase();
    if (key === "arrowleft" || key === "a") tryMove(-1, 0);
    if (key === "arrowright" || key === "d") tryMove(1, 0);
    if (key === "arrowup" || key === "w") tryRotate();
    if (key === "arrowdown" || key === "s") {
      if (tryMove(0, 1)) state.score += 1;
    }
    if (e.code === "Space") hardDrop();
  });

  reset();
  requestAnimationFrame(frame);
}

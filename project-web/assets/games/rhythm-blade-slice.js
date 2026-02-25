export function startGame({ canvas, ctx, game, setStatusText }) {
  const lanesX = [canvas.width * 0.25, canvas.width * 0.5, canvas.width * 0.75];
  const judgeY = canvas.height - 96;
  const bpm = 120;
  const beatSec = 60 / bpm;
  const songLenSec = 120;

  const state = {
    notes: [],
    songTime: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    perfect: 0,
    good: 0,
    miss: 0,
    offsetMs: 0,
    running: true,
    over: false,
    lastTs: 0
  };

  function makeChart() {
    state.notes = [];
    let t = 1.2;
    let i = 0;
    while (t < songLenSec - 0.8) {
      const lane = (i * 7 + Math.floor(i / 3)) % 3;
      state.notes.push({
        lane,
        hitAt: t,
        judged: false,
        result: "",
        hitErrMs: 0
      });
      if (i % 8 === 5) {
        state.notes.push({
          lane: (lane + 1) % 3,
          hitAt: t + beatSec * 0.5,
          judged: false,
          result: "",
          hitErrMs: 0
        });
      }
      t += beatSec;
      i += 1;
    }
  }

  function reset() {
    state.songTime = 0;
    state.score = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.perfect = 0;
    state.good = 0;
    state.miss = 0;
    state.offsetMs = 0;
    state.running = true;
    state.over = false;
    makeChart();
    setStatusText(
      "Score: 0",
      "Playing",
      "Left/Down/Right hit notes, [ and ] offset +/-10ms (max +/-150ms), Space restart after song end"
    );
  }

  function judgeLane(lane) {
    if (!state.running) return;
    const t = state.songTime + state.offsetMs / 1000;
    let candidate = null;
    let best = 1e9;
    for (const n of state.notes) {
      if (n.judged || n.lane !== lane) continue;
      const err = (t - n.hitAt) * 1000;
      const abs = Math.abs(err);
      if (abs < best) {
        best = abs;
        candidate = { note: n, err };
      }
      if (n.hitAt - t > 0.15) break;
    }

    if (!candidate) return;
    const a = Math.abs(candidate.err);
    const n = candidate.note;
    if (a <= 40) {
      n.judged = true;
      n.result = "Perfect";
      n.hitErrMs = candidate.err;
      state.perfect += 1;
      state.combo += 1;
      state.maxCombo = Math.max(state.maxCombo, state.combo);
      state.score += 100 + Math.floor(state.combo * 0.2);
    } else if (a <= 90) {
      n.judged = true;
      n.result = "Good";
      n.hitErrMs = candidate.err;
      state.good += 1;
      state.combo += 1;
      state.maxCombo = Math.max(state.maxCombo, state.combo);
      state.score += 60 + Math.floor(state.combo * 0.1);
    }
  }

  function update(dt) {
    if (!state.running) return;
    state.songTime += dt;

    const t = state.songTime + state.offsetMs / 1000;
    for (const n of state.notes) {
      if (n.judged) continue;
      if (t - n.hitAt > 0.09) {
        n.judged = true;
        n.result = "Miss";
        state.miss += 1;
        state.combo = 0;
      }
    }

    if (state.songTime >= songLenSec) {
      state.running = false;
      state.over = true;
      setStatusText(
        `Score: ${Math.floor(state.score)} | Perfect: ${state.perfect} | Good: ${state.good} | Miss: ${state.miss} | MaxCombo: ${state.maxCombo}`,
        "Song End - Press Space to restart"
      );
      return;
    }

    setStatusText(
      `Score: ${Math.floor(state.score)} | Combo: ${state.combo} | P:${state.perfect} G:${state.good} M:${state.miss} | Offset:${state.offsetMs}ms | Time:${Math.ceil(songLenSec - state.songTime)}s`,
      "Playing"
    );
  }

  function drawLanes() {
    for (let i = 1; i <= 2; i += 1) {
      const x = (canvas.width / 3) * i;
      ctx.strokeStyle = "#213a63";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = "#1a2f53";
      ctx.fillRect(lanesX[i] - 42, judgeY - 8, 84, 14);
    }
  }

  function drawNotes() {
    const t = state.songTime + state.offsetMs / 1000;
    for (const n of state.notes) {
      if (n.judged && n.result !== "Miss") continue;
      const dt = n.hitAt - t;
      if (dt < -0.2 || dt > 2.2) continue;
      const y = judgeY - dt * 260;
      const x = lanesX[n.lane];
      ctx.fillStyle = n.judged ? "#5b5f7a" : "#7df9d1";
      ctx.fillRect(x - 24, y - 10, 48, 20);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#070d1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawLanes();
    drawNotes();

    ctx.fillStyle = "#b6c8e7";
    ctx.font = "14px Segoe UI";
    ctx.fillText(game.title, 12, 24);
    ctx.fillText(`BPM ${bpm}`, 12, 44);

    if (state.over) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "18px Segoe UI";
      ctx.fillText("Song End - Press Space", 118, 320);
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
    if (key === "arrowleft" || key === "a") judgeLane(0);
    if (key === "arrowdown" || key === "s") judgeLane(1);
    if (key === "arrowright" || key === "d") judgeLane(2);
    if (key === "[") state.offsetMs = Math.max(-150, state.offsetMs - 10);
    if (key === "]") state.offsetMs = Math.min(150, state.offsetMs + 10);
  });

  reset();
  requestAnimationFrame(frame);
}

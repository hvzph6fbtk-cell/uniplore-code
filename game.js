(function () {
  "use strict";

  const COLS = 20;
  const ROWS = 20;
  const CELL = 30;
  const BOARD = COLS * CELL;
  const BEST_KEY = "snake.best";

  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const levelEl = document.getElementById("level");
  const overlay = document.getElementById("overlay");
  const panelKicker = document.getElementById("panelKicker");
  const panelTitle = document.getElementById("panelTitle");
  const panelDesc = document.getElementById("panelDesc");
  const primaryBtn = document.getElementById("primaryBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const restartBtn = document.getElementById("restartBtn");

  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };

  let snake = [];
  let direction = DIRS.right;
  let queue = [];
  let food = null;
  let score = 0;
  let best = Number(localStorage.getItem(BEST_KEY) || 0);
  let level = 1;
  let grow = 0;
  let state = "ready";
  let accumulator = 0;
  let lastFrame = 0;
  let foodPulse = 0;
  let deathFlash = 0;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = BOARD * dpr;
  canvas.height = BOARD * dpr;

  function cellOf(point) {
    return { x: point.x * CELL, y: point.y * CELL };
  }

  function sameCell(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  function isOpposite(a, b) {
    return a.x + b.x === 0 && a.y + b.y === 0;
  }

  function speedForLevel(lv) {
    return Math.max(70, 150 - (lv - 1) * 10);
  }

  function levelForScore(s) {
    return Math.floor(s / 50) + 1;
  }

  function resetGame() {
    snake = [
      { x: 9, y: 10 },
      { x: 8, y: 10 },
      { x: 7, y: 10 }
    ];
    direction = DIRS.right;
    queue = [];
    score = 0;
    level = 1;
    grow = 0;
    accumulator = 0;
    foodPulse = 0;
    deathFlash = 0;
    spawnFood();
    updateStats();
    updateOverlay("ready");
    state = "ready";
    pauseBtn.disabled = true;
    pauseBtn.textContent = "暂停";
  }

  function spawnFood() {
    const free = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!snake.some(function (s) { return s.x === x && s.y === y; })) {
          free.push({ x: x, y: y });
        }
      }
    }
    food = free.length ? free[Math.floor(Math.random() * free.length)] : null;
  }

  function updateStats() {
    scoreEl.textContent = String(score);
    bestEl.textContent = String(best);
    levelEl.textContent = String(level);
  }

  function updateOverlay(mode, isNewBest) {
    overlay.classList.toggle("hidden", mode === "hidden");
    if (mode === "ready") {
      panelKicker.textContent = "准备开始";
      panelTitle.textContent = "贪吃蛇";
      panelDesc.textContent = "方向键或 WASD 控制方向，吃到果实得 10 分。";
      primaryBtn.textContent = "开始游戏";
    } else if (mode === "paused") {
      panelKicker.textContent = "已暂停";
      panelTitle.textContent = "暂停中";
      panelDesc.textContent = "按空格或点击下方按钮继续游戏。";
      primaryBtn.textContent = "继续游戏";
    } else if (mode === "over") {
      panelKicker.textContent = "游戏结束";
      panelTitle.textContent = "本局得分 " + score;
      panelDesc.textContent = isNewBest
        ? "刷新了最高分，继续保持。"
        : "最高分 " + best + "，再试一次。";
      primaryBtn.textContent = "再来一局";
    }
  }

  function startGame() {
    if (state === "over") {
      resetGame();
    }
    state = "running";
    overlay.classList.add("hidden");
    pauseBtn.disabled = false;
    pauseBtn.textContent = "暂停";
    accumulator = 0;
    lastFrame = performance.now();
    resumeAudio();
  }

  function togglePause() {
    if (state === "running") {
      state = "paused";
      updateOverlay("paused");
      pauseBtn.textContent = "继续";
    } else if (state === "paused") {
      state = "running";
      overlay.classList.add("hidden");
      pauseBtn.textContent = "暂停";
      lastFrame = performance.now();
      accumulator = 0;
    }
  }

  function gameOver() {
    state = "over";
    deathFlash = 1;
    pauseBtn.disabled = true;
    pauseBtn.textContent = "暂停";
    const isNewBest = score > best;
    if (isNewBest) {
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
    }
    updateStats();
    updateOverlay("over", isNewBest);
    playTone(180, 0.16, "sawtooth", 0.05);
    setTimeout(function () { playTone(110, 0.24, "sawtooth", 0.05); }, 110);
  }

  function queueDirection(key) {
    const next = DIRS[key];
    if (!next) return;
    if (state === "ready") {
      startGame();
    }
    if (state !== "running") return;
    const last = queue.length ? queue[queue.length - 1] : direction;
    if (sameCell(last, next) || isOpposite(last, next)) return;
    if (queue.length < 2) queue.push(next);
  }

  function step() {
    if (queue.length) {
      direction = queue.shift();
    }

    const head = snake[0];
    const next = { x: head.x + direction.x, y: head.y + direction.y };

    if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) {
      gameOver();
      return;
    }

    const willEat = food && sameCell(next, food);
    const limit = willEat ? snake.length : snake.length - 1;
    for (let i = 0; i < limit; i++) {
      if (sameCell(snake[i], next)) {
        gameOver();
        return;
      }
    }

    snake.unshift(next);
    if (willEat) {
      score += 10;
      grow += 1;
      level = levelForScore(score);
      spawnFood();
      updateStats();
      playTone(620 + Math.min(level, 8) * 40, 0.07, "triangle", 0.035);
    }

    if (grow > 0) {
      grow -= 1;
    } else {
      snake.pop();
    }
  }

  function drawRoundRect(x, y, w, h, r) {
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    const radius = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function lerpChannel(a, b, t) {
    return Math.round(a + (b - a) * t);
  }

  function bodyColor(t) {
    const from = { r: 123, g: 243, b: 198 };
    const to = { r: 17, g: 138, b: 104 };
    return "rgb(" +
      lerpChannel(from.r, to.r, t) + "," +
      lerpChannel(from.g, to.g, t) + "," +
      lerpChannel(from.b, to.b, t) + ")";
  }

  function drawBoardBackground() {
    ctx.fillStyle = "#0d1526";
    ctx.fillRect(0, 0, BOARD, BOARD);

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if ((x + y) % 2 === 0) {
          ctx.fillStyle = "rgba(79, 140, 255, 0.035)";
          ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
        }
      }
    }

    ctx.strokeStyle = "rgba(120, 160, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let i = 1; i < COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL + 0.5, 0);
      ctx.lineTo(i * CELL + 0.5, BOARD);
      ctx.stroke();
    }
    for (let i = 1; i < ROWS; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * CELL + 0.5);
      ctx.lineTo(BOARD, i * CELL + 0.5);
      ctx.stroke();
    }
  }

  function drawFood(now) {
    if (!food) return;
    const center = cellOf(food);
    const cx = center.x + CELL / 2;
    const cy = center.y + CELL / 2;
    const pulse = 1 + Math.sin(now / 260) * 0.08;
    const radius = CELL * 0.3 * pulse;

    ctx.save();
    ctx.shadowColor = "rgba(255, 93, 115, 0.85)";
    ctx.shadowBlur = 18;
    const gradient = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, radius + 4);
    gradient.addColorStop(0, "#ff9aa8");
    gradient.addColorStop(0.55, "#ff5d73");
    gradient.addColorStop(1, "#d62f4c");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = "rgba(90, 240, 180, 0.9)";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx + 1, cy - radius - 1);
    ctx.quadraticCurveTo(cx + 6, cy - radius - 8, cx + 10, cy - radius - 6);
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.beginPath();
    ctx.arc(cx - radius * 0.32, cy - radius * 0.34, radius * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSnake() {
    const total = snake.length - 1 || 1;

    for (let i = snake.length - 1; i >= 0; i--) {
      const seg = snake[i];
      const pos = cellOf(seg);
      const t = total === 0 ? 0 : i / total;

      if (i === 0) {
        ctx.save();
        ctx.shadowColor = "rgba(55, 226, 161, 0.65)";
        ctx.shadowBlur = 16;
        ctx.fillStyle = "#8df7cf";
        drawRoundRect(pos.x + 1, pos.y + 1, CELL - 2, CELL - 2, 10);
        ctx.fill();
        ctx.restore();
        drawEyes(pos);
      } else {
        ctx.fillStyle = bodyColor(t);
        drawRoundRect(pos.x + 2, pos.y + 2, CELL - 4, CELL - 4, 9);
        ctx.fill();

        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        drawRoundRect(pos.x + 5, pos.y + 5, CELL - 10, (CELL - 10) * 0.42, 6);
        ctx.fill();
      }
    }
  }

  function drawEyes(pos) {
    const cx = pos.x + CELL / 2;
    const cy = pos.y + CELL / 2;
    const dx = direction.x;
    const dy = direction.y;
    const forward = CELL * 0.18;
    const side = CELL * 0.19;

    const centers = [
      { x: cx + dx * forward - dy * side, y: cy + dy * forward + dx * side },
      { x: cx + dx * forward + dy * side, y: cy + dy * forward - dx * side }
    ];

    centers.forEach(function (eye) {
      ctx.fillStyle = "#06301f";
      ctx.beginPath();
      ctx.arc(eye.x, eye.y, CELL * 0.11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(eye.x - 1, eye.y - 1, CELL * 0.04, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawDeathFlash(dt) {
    if (deathFlash <= 0) return;
    deathFlash = Math.max(0, deathFlash - dt / 320);
    ctx.fillStyle = "rgba(255, 93, 115, " + (deathFlash * 0.32) + ")";
    ctx.fillRect(0, 0, BOARD, BOARD);
  }

  function render(now, dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBoardBackground();
    drawFood(now);
    drawSnake();
    drawDeathFlash(dt);
  }

  function loop(now) {
    const dt = Math.min(now - lastFrame || 0, 200);
    lastFrame = now;

    if (state === "running") {
      accumulator += dt;
      const interval = speedForLevel(level);
      let guard = 0;
      while (accumulator >= interval && state === "running" && guard < 5) {
        step();
        accumulator -= interval;
        guard += 1;
      }
    }

    render(now, dt);
    requestAnimationFrame(loop);
  }

  let audioCtx = null;

  function resumeAudio() {
    try {
      if (!audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        audioCtx = new Ctx();
      }
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }
    } catch (err) {
      audioCtx = null;
    }
  }

  function playTone(freq, duration, type, volume) {
    if (!audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type || "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume || 0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (err) {
      /* ignore audio errors */
    }
  }

  const KEY_MAP = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    s: "down",
    a: "left",
    d: "right",
    W: "up",
    S: "down",
    A: "left",
    D: "right"
  };

  document.addEventListener("keydown", function (event) {
    const dirKey = KEY_MAP[event.key];
    if (dirKey) {
      event.preventDefault();
      queueDirection(dirKey);
      return;
    }

    if (event.key === " " || event.code === "Space") {
      event.preventDefault();
      if (state === "ready" || state === "over") {
        startGame();
      } else {
        togglePause();
      }
      return;
    }

    if (event.key === "r" || event.key === "R") {
      resetGame();
      startGame();
      return;
    }

    if (event.key === "Enter" && (state === "ready" || state === "over")) {
      startGame();
    }
  });

  primaryBtn.addEventListener("click", function () {
    if (state === "paused") {
      togglePause();
    } else {
      startGame();
    }
  });

  pauseBtn.addEventListener("click", togglePause);

  restartBtn.addEventListener("click", function () {
    resetGame();
    startGame();
  });

  document.querySelectorAll(".dpad-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      queueDirection(btn.dataset.dir);
    });
  });

  let touchStart = null;

  canvas.addEventListener("touchstart", function (event) {
    const touch = event.changedTouches[0];
    touchStart = { x: touch.clientX, y: touch.clientY };
  }, { passive: true });

  canvas.addEventListener("touchend", function (event) {
    if (!touchStart) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    touchStart = null;

    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      queueDirection(dx > 0 ? "right" : "left");
    } else {
      queueDirection(dy > 0 ? "down" : "up");
    }
  }, { passive: true });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden && state === "running") {
      togglePause();
    }
  });

  window.addEventListener("blur", function () {
    if (state === "running") {
      togglePause();
    }
  });

  resetGame();
  lastFrame = performance.now();
  requestAnimationFrame(loop);
})();
const COLS = 8;
const ROWS = 9;
const FRAME_W = 192;
const FRAME_H = 208;
const DRAG_THRESHOLD = 4;

const IDLE_FRAMES = [
  { rowIndex: 0, columnIndex: 0, frameDurationMs: 280 },
  { rowIndex: 0, columnIndex: 1, frameDurationMs: 110 },
  { rowIndex: 0, columnIndex: 2, frameDurationMs: 110 },
  { rowIndex: 0, columnIndex: 3, frameDurationMs: 140 },
  { rowIndex: 0, columnIndex: 4, frameDurationMs: 140 },
  { rowIndex: 0, columnIndex: 5, frameDurationMs: 320 }
];

const PETS = [
  {
    assetRef: "codex",
    displayName: "Codex",
    prompt: "I found a tiny loose thread in settings. Want me to tug it?",
    spritesheetUrl: "./assets/pets/codex-spritesheet.webp",
    state: "running"
  },
  {
    assetRef: "dewey",
    displayName: "Dewey",
    prompt: "I sorted the noisy bits into one neat little checklist.",
    spritesheetUrl: "./assets/pets/dewey-spritesheet.webp",
    state: "waving"
  },
  {
    assetRef: "fireball",
    displayName: "Fireball",
    prompt: "The build is warming up. I am keeping an eye on the sparks.",
    spritesheetUrl: "./assets/pets/fireball-spritesheet.webp",
    state: "running-right"
  },
  {
    assetRef: "rocky",
    displayName: "Rocky",
    prompt: "The diff is large, but I found a stable place to stand.",
    spritesheetUrl: "./assets/pets/rocky-spritesheet.webp",
    state: "waiting"
  },
  {
    assetRef: "seedy",
    displayName: "Seedy",
    prompt: "A new idea just sprouted from your last prompt.",
    spritesheetUrl: "./assets/pets/seedy-spritesheet.webp",
    state: "jumping"
  },
  {
    assetRef: "stacky",
    displayName: "Stacky",
    prompt: "I stacked the context by source, then started from the top.",
    spritesheetUrl: "./assets/pets/stacky-spritesheet.webp",
    state: "review"
  },
  {
    assetRef: "bsod",
    displayName: "BSOD",
    prompt: "Something tripped. I saved the exact error before retrying.",
    spritesheetUrl: "./assets/pets/bsod-spritesheet.webp",
    state: "failed"
  },
  {
    assetRef: "null-signal",
    displayName: "Null Signal",
    prompt: "No new alerts. I am still listening for the next signal.",
    spritesheetUrl: "./assets/pets/null-signal-spritesheet.webp",
    state: "running-left"
  }
];

const ANIMATIONS = {
  failed: frames(5, 8, 140, 240),
  idle: IDLE_FRAMES.map((frame) => ({
    ...frame,
    frameDurationMs: frame.frameDurationMs * 6
  })),
  jumping: frames(4, 5, 140, 280),
  review: frames(8, 6, 150, 280),
  running: frames(7, 6, 120, 220),
  "running-left": frames(2, 8, 120, 220),
  "running-right": frames(1, 8, 120, 220),
  waiting: frames(6, 6, 150, 260),
  waving: frames(3, 4, 140, 280)
};

const THREAD_TEXTS = {
  roam: [
    "Codex pets are optional animated companions for the app. In Settings, choose Pets to select a built-in pet or refresh custom pets from your local Codex home.",
    "The overlay keeps active Codex work visible while you use other apps. It shows the active thread, reflects whether Codex is running, waiting for input, or ready for review, and pairs that state with a short progress prompt.",
    "Here the pet is no longer just floating over the interface. It becomes part of the reading surface. Each line is measured, routed, and redrawn around the moving sprite so the active work stays visible."
  ].join(" "),
  scan: [
    "I am checking the settings section line by line, carrying the thread state into the text instead of covering it. The paragraph adapts as I pass through.",
    "The text engine prepares the copy once. During animation, every row asks how much width remains after the pet takes its little working lane."
  ].join(" "),
  orbit: [
    "A production version could connect the pet's movement to agent state: running, waiting, reviewing, or failed. The motion can point at the active paragraph without stealing the whole page.",
    "The fun bit is that this still behaves like readable product UI. The pet is expressive, but the layout is doing a practical job."
  ].join(" ")
};

const els = {
  canvas: document.getElementById("threadStage"),
  engineMetric: document.getElementById("engineMetric"),
  lineMetric: document.getElementById("lineMetric"),
  petMetric: document.getElementById("petMetric"),
  petSelector: document.getElementById("petSelector"),
  promptTitle: document.getElementById("promptTitle"),
  promptBody: document.getElementById("promptBody"),
  previewAvatar: document.getElementById("previewAvatar"),
  petBadge: document.getElementById("petBadge"),
  avatarButton: document.getElementById("avatarButton"),
  modeSelect: document.getElementById("modeSelect"),
  wakeToggle: document.getElementById("wakeToggle"),
  pauseToggle: document.getElementById("pauseToggle"),
  resetPath: document.getElementById("resetPath"),
  threadTitle: document.getElementById("threadTitle")
};

const ctx = els.canvas.getContext("2d");

const app = {
  dpr: 1,
  width: 0,
  height: 0,
  engine: null,
  prepared: null,
  selectedIndex: 0,
  images: new Map(),
  paused: false,
  awake: true,
  mode: "roam",
  fontSize: 22,
  lineHeight: 33,
  font: "500 22px Inter, Arial, sans-serif",
  pet: {
    x: 260,
    y: 210,
    targetX: 420,
    targetY: 240,
    vx: 0,
    vy: 0,
    radius: 58,
    pathSeed: 0
  },
  lastTime: performance.now(),
  elapsed: 0,
  frameTick: 0,
  renderedLines: 0,
  pointerActive: false
};

function frames(rowIndex, length, frameDurationMs, lastFrameDurationMs) {
  return Array.from({ length }, (_, columnIndex) => ({
    rowIndex,
    columnIndex,
    frameDurationMs: columnIndex === length - 1 ? lastFrameDurationMs : frameDurationMs
  }));
}

function framePosition(frame) {
  return `${(frame.columnIndex / (COLS - 1)) * 100}% ${(frame.rowIndex / (ROWS - 1)) * 100}%`;
}

function frameAt(state, elapsedMs) {
  const animation = ANIMATIONS[state] ?? ANIMATIONS.idle;
  const total = animation.reduce((sum, frame) => sum + frame.frameDurationMs, 0);
  let cursor = elapsedMs % total;
  for (const frame of animation) {
    if (cursor <= frame.frameDurationMs) return frame;
    cursor -= frame.frameDurationMs;
  }
  return animation[0];
}

function shouldFlip(assetRef, spriteState) {
  if (spriteState !== "running-left" && spriteState !== "running-right") return false;
  return assetRef === "bsod" ? spriteState === "running-right" : spriteState === "running-left";
}

function createFallbackEngine() {
  const measurer = document.createElement("canvas").getContext("2d");

  function prepareWithSegments(text, font) {
    measurer.font = font;
    const tokens = text
      .replace(/\s+/g, " ")
      .trim()
      .split(/(\s+)/)
      .filter(Boolean)
      .map((value) => ({ value, width: measurer.measureText(value).width }));
    return { tokens, font };
  }

  function layoutNextLineRange(prepared, start, maxWidth) {
    let index = start.tokenIndex ?? 0;
    while (prepared.tokens[index]?.value.trim() === "") index += 1;
    if (index >= prepared.tokens.length || maxWidth <= 20) return null;

    let end = index;
    let width = 0;
    let lastWordEnd = index;

    while (end < prepared.tokens.length) {
      const token = prepared.tokens[end];
      const nextWidth = width + token.width;
      if (end > index && nextWidth > maxWidth) break;
      width = nextWidth;
      if (token.value.trim() !== "") lastWordEnd = end + 1;
      end += 1;
    }

    end = Math.max(lastWordEnd, index + 1);
    const selected = prepared.tokens.slice(index, end);
    return {
      text: selected.map((token) => token.value).join("").trimEnd(),
      width: selected.reduce((sum, token) => sum + token.width, 0),
      start: { tokenIndex: index },
      end: { tokenIndex: end }
    };
  }

  return {
    name: "canvas",
    initialCursor: () => ({ tokenIndex: 0 }),
    prepareWithSegments,
    layoutNextLineRange,
    materializeLineRange: (_prepared, range) => range
  };
}

async function createEngine() {
  try {
    const pretext = await import("https://esm.sh/@chenglou/pretext?bundle");
    return {
      name: "Pretext",
      initialCursor: () => ({ segmentIndex: 0, graphemeIndex: 0 }),
      prepareWithSegments: pretext.prepareWithSegments,
      layoutNextLineRange: pretext.layoutNextLineRange,
      materializeLineRange: pretext.materializeLineRange
    };
  } catch (error) {
    console.warn("Pretext import failed; using canvas fallback.", error);
    return createFallbackEngine();
  }
}

function preloadImages() {
  return Promise.all(
    PETS.map(
      (pet) =>
        new Promise((resolve) => {
          const image = new Image();
          image.onload = () => {
            app.images.set(pet.assetRef, image);
            resolve();
          };
          image.onerror = () => resolve();
          image.src = pet.spritesheetUrl;
        })
    )
  );
}

function renderSelector() {
  els.petSelector.textContent = "";
  PETS.forEach((pet, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pet-option";
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", index === app.selectedIndex ? "true" : "false");
    button.dataset.index = String(index);

    const thumb = document.createElement("span");
    thumb.className = "pet-thumb";
    const frame = frameAt(pet.state, 0);
    thumb.style.backgroundImage = `url(${pet.spritesheetUrl})`;
    thumb.style.backgroundPosition = framePosition(frame);
    thumb.setAttribute("aria-hidden", "true");

    const name = document.createElement("span");
    name.className = "pet-option-name";
    name.textContent = pet.displayName;

    button.append(thumb, name);
    button.addEventListener("click", () => selectPet(index));
    els.petSelector.append(button);
  });
}

function selectPet(index) {
  app.selectedIndex = (index + PETS.length) % PETS.length;
  renderSelector();
  updatePetUI();
  resetPath();
}

function updatePetUI() {
  const pet = PETS[app.selectedIndex];
  els.promptTitle.textContent = pet.displayName;
  els.promptBody.textContent = pet.prompt;
  els.petBadge.textContent = `${app.selectedIndex + 1}/${PETS.length}`;
  els.petMetric.textContent = pet.displayName;
  els.previewAvatar.style.backgroundImage = `url(${pet.spritesheetUrl})`;
  els.avatarButton.setAttribute("aria-label", `Cycle to next Codex pet. ${pet.displayName} is selected.`);
}

function updatePreparedText() {
  if (!app.engine) return;
  app.prepared = app.engine.prepareWithSegments(THREAD_TEXTS[app.mode], app.font, {
    whiteSpace: "normal"
  });
}

function resizeCanvas() {
  const bounds = els.canvas.getBoundingClientRect();
  app.dpr = Math.min(window.devicePixelRatio || 1, 2);
  app.width = Math.max(320, Math.floor(bounds.width));
  app.height = Math.max(340, Math.floor(bounds.height));
  els.canvas.width = Math.floor(app.width * app.dpr);
  els.canvas.height = Math.floor(app.height * app.dpr);
  ctx.setTransform(app.dpr, 0, 0, app.dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;

  app.fontSize = clamp(app.width / 34, 17, 25);
  app.lineHeight = Math.round(app.fontSize * 1.48);
  app.font = `500 ${app.fontSize}px Inter, Arial, sans-serif`;
  app.pet.radius = clamp(app.width / 8, 48, 72);
  updatePreparedText();
  resetPath();
}

function resetPath() {
  const side = app.selectedIndex % 2 === 0 ? 0.26 : 0.74;
  app.pet.x = app.width * side;
  app.pet.y = app.height * 0.42;
  app.pet.targetX = app.width * (1 - side);
  app.pet.targetY = app.height * 0.54;
  app.pet.vx = 0;
  app.pet.vy = 0;
  app.pet.pathSeed = Math.random() * 1000;
}

function updatePetMotion(dt, elapsedMs) {
  if (!app.awake) return;

  const pet = app.pet;
  const t = elapsedMs / 1000 + pet.pathSeed;
  if (app.mode === "scan") {
    pet.targetX = app.width * (0.18 + 0.64 * ((Math.sin(t * 0.55) + 1) / 2));
    const row = Math.floor((t * 0.55) % 7);
    pet.targetY = 104 + row * app.lineHeight * 1.45;
  } else if (app.mode === "orbit") {
    pet.targetX = app.width * 0.5 + Math.cos(t * 0.65) * app.width * 0.3;
    pet.targetY = app.height * 0.47 + Math.sin(t * 0.9) * app.height * 0.24;
  } else if (!app.pointerActive) {
    pet.targetX = app.width * 0.5 + Math.cos(t * 0.38) * app.width * 0.33;
    pet.targetY = app.height * 0.48 + Math.sin(t * 0.62) * app.height * 0.26;
  }

  const dx = pet.targetX - pet.x;
  const dy = pet.targetY - pet.y;
  pet.vx = pet.vx * 0.86 + dx * 0.95 * dt;
  pet.vy = pet.vy * 0.86 + dy * 0.95 * dt;
  pet.x += pet.vx;
  pet.y += pet.vy;

  pet.x = clamp(pet.x, pet.radius * 0.72, app.width - pet.radius * 0.72);
  pet.y = clamp(pet.y, 78, app.height - pet.radius * 0.7);

  if (app.pointerActive && Math.hypot(dx, dy) < 12) {
    app.pointerActive = false;
  }
}

function drawBackground(elapsedMs) {
  ctx.clearRect(0, 0, app.width, app.height);
  ctx.fillStyle = "#f8f8f4";
  ctx.fillRect(0, 0, app.width, app.height);

  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = "#d8ddd4";
  ctx.lineWidth = 1;
  const gap = 36;
  const offset = (elapsedMs * 0.004) % gap;
  for (let x = -app.height + offset; x < app.width + gap; x += gap) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + app.height * 0.34, app.height);
    ctx.stroke();
  }
  ctx.restore();

  const gradient = ctx.createLinearGradient(0, 0, app.width, app.height);
  gradient.addColorStop(0, "rgba(16, 163, 127, 0.12)");
  gradient.addColorStop(0.42, "rgba(255, 255, 255, 0)");
  gradient.addColorStop(1, "rgba(239, 106, 168, 0.12)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, app.width, app.height);
}

function blockedIntervals(rowY) {
  if (!app.awake) return [];

  const pet = app.pet;
  const ry = pet.radius * 0.92;
  const dy = rowY - pet.y;
  if (Math.abs(dy) > ry) return [];

  const half = Math.sqrt(ry * ry - dy * dy) + 16;
  return [[pet.x - half, pet.x + half]];
}

function availableSegments(rowY, left, right) {
  const minWidth = clamp(app.fontSize * 5.2, 88, 150);
  const segments = [];
  let cursor = left;

  for (const [rawStart, rawEnd] of blockedIntervals(rowY)) {
    const start = clamp(rawStart, left, right);
    const end = clamp(rawEnd, left, right);
    if (start - cursor > minWidth) segments.push({ x: cursor, width: start - cursor });
    cursor = Math.max(cursor, end);
  }

  if (right - cursor > minWidth) segments.push({ x: cursor, width: right - cursor });
  return segments;
}

function drawText() {
  if (!app.prepared) return;

  const left = clamp(app.width * 0.08, 24, 70);
  const right = app.width - left;
  const top = clamp(app.height * 0.11, 58, 92);
  const maxRows = Math.floor((app.height - top - 34) / app.lineHeight);

  ctx.save();
  ctx.font = app.font;
  ctx.fillStyle = "rgba(16, 17, 16, 0.88)";
  ctx.textBaseline = "alphabetic";

  let cursor = app.engine.initialCursor();
  let done = false;
  let rows = 0;

  for (let row = 0; row < maxRows && !done; row += 1) {
    const baseline = top + row * app.lineHeight;
    const segments = availableSegments(baseline - app.lineHeight * 0.32, left, right);
    let rowDrew = false;

    for (const segment of segments) {
      const range = app.engine.layoutNextLineRange(app.prepared, cursor, segment.width);
      if (!range) {
        done = true;
        break;
      }
      const line = app.engine.materializeLineRange(app.prepared, range);
      ctx.fillText(line.text, segment.x, baseline);
      cursor = range.end;
      rowDrew = true;
    }

    if (rowDrew) rows += 1;
  }

  app.renderedLines = rows;
  ctx.restore();
}

function drawPet(elapsedMs) {
  if (!app.awake) return;

  const petData = PETS[app.selectedIndex];
  const image = app.images.get(petData.assetRef);
  if (!image) return;

  const movementState =
    Math.abs(app.pet.vx) > DRAG_THRESHOLD
      ? app.pet.vx < 0
        ? "running-left"
        : "running-right"
      : petData.state;
  const frame = frameAt(movementState, elapsedMs);
  const drawW = app.pet.radius * 1.62;
  const drawH = drawW * (FRAME_H / FRAME_W);
  const x = app.pet.x - drawW / 2;
  const y = app.pet.y - drawH * 0.52;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.18)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 12;
  ctx.translate(app.pet.x, app.pet.y);
  if (shouldFlip(petData.assetRef, movementState)) ctx.scale(-1, 1);
  ctx.drawImage(
    image,
    frame.columnIndex * FRAME_W,
    frame.rowIndex * FRAME_H,
    FRAME_W,
    FRAME_H,
    -drawW / 2,
    -drawH * 0.52,
    drawW,
    drawH
  );
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(16, 163, 127, 0.28)";
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 8]);
  ctx.beginPath();
  ctx.ellipse(app.pet.x, app.pet.y + drawH * 0.17, drawW * 0.37, 10, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function updatePreviewAvatar(elapsedMs) {
  const pet = PETS[app.selectedIndex];
  const frame = frameAt(pet.state, elapsedMs);
  els.previewAvatar.style.backgroundPosition = framePosition(frame);
  els.previewAvatar.dataset.flipped = shouldFlip(pet.assetRef, pet.state) ? "true" : "false";
}

function drawFrame(now) {
  const dt = Math.min(0.05, (now - app.lastTime) / 1000);
  app.lastTime = now;

  if (!app.paused) {
    app.elapsed += dt * 1000;
    updatePetMotion(dt, app.elapsed);
  }

  drawBackground(app.elapsed);
  drawText();
  drawPet(app.elapsed);
  updatePreviewAvatar(app.elapsed);

  app.frameTick += 1;
  if (app.frameTick % 12 === 0) {
    els.lineMetric.textContent = String(app.renderedLines);
  }

  requestAnimationFrame(drawFrame);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function installEvents() {
  els.avatarButton.addEventListener("click", () => selectPet(app.selectedIndex + 1));
  els.pauseToggle.addEventListener("click", () => {
    app.paused = !app.paused;
    els.pauseToggle.textContent = app.paused ? "Run" : "Pause";
  });
  els.resetPath.addEventListener("click", resetPath);
  els.wakeToggle.addEventListener("click", () => {
    app.awake = !app.awake;
    els.wakeToggle.textContent = app.awake ? "Tuck Away" : "Wake Pet";
  });
  els.modeSelect.addEventListener("change", () => {
    app.mode = els.modeSelect.value;
    els.threadTitle.textContent =
      app.mode === "scan"
        ? "Codex is scanning the text"
        : app.mode === "orbit"
          ? "Codex is orbiting the paragraph"
          : "Codex is exploring the text";
    updatePreparedText();
    resetPath();
  });
  els.canvas.addEventListener("pointerdown", (event) => {
    const rect = els.canvas.getBoundingClientRect();
    app.pet.targetX = event.clientX - rect.left;
    app.pet.targetY = event.clientY - rect.top;
    app.pointerActive = true;
  });

  const observer = new ResizeObserver(resizeCanvas);
  observer.observe(els.canvas);
  window.addEventListener("resize", resizeCanvas);
}

async function init() {
  renderSelector();
  updatePetUI();
  installEvents();
  app.engine = await createEngine();
  els.engineMetric.textContent = app.engine.name;
  await preloadImages();
  resizeCanvas();
  requestAnimationFrame(drawFrame);
}

init();

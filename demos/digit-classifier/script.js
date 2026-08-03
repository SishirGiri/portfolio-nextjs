/* ============================================================
   Digit Classifier
   - Trains a small NN in-browser on MNIST (TensorFlow.js)
   - Predicts user-drawn digits in real time
   ============================================================ */

// ---------- Config ----------
const MNIST_IMAGES_URL =
  "https://storage.googleapis.com/learnjs-data/model-builder/mnist_images.png";
const MNIST_LABELS_URL =
  "https://storage.googleapis.com/learnjs-data/model-builder/mnist_labels_uint8";

const NUM_CLASSES = 10;
const IMG_SIZE = 28;                 // 28 x 28
const PIXELS_PER_IMG = IMG_SIZE * IMG_SIZE; // 784

const TRAIN_SAMPLES = 10000;         // subset for fast training
const TEST_SAMPLES  = 2000;
const EPOCHS = 4;
const BATCH_SIZE = 128;

const DRAW_SIZE = 280;               // on-screen canvas
const BRUSH = 18;                    // brush radius (px)

// ---------- DOM ----------
const canvas        = document.getElementById("draw-canvas");
const ctx           = canvas.getContext("2d", { willReadFrequently: true });
const clearBtn      = document.getElementById("clear-btn");
const predDigitEl   = document.getElementById("pred-digit");
const predConfEl    = document.getElementById("pred-conf");
const histogramEl   = document.getElementById("histogram");
const statusState   = document.getElementById("status-state");
const statusEpoch   = document.getElementById("status-epoch");
const statusLoss    = document.getElementById("status-loss");
const statusAcc     = document.getElementById("status-acc");
const statusTestAcc = document.getElementById("status-test-acc");
const statusSamples = document.getElementById("status-samples");
const progressBar   = document.getElementById("progress-bar");
const galleryEl     = document.getElementById("gallery");
const galleryEmpty  = document.getElementById("gallery-empty");

// ---------- State ----------
let model = null;
let isTrained = false;
let isDrawing = false;
let lastPoint = null;
let predictTimer = null;
let lastNonZeroInput = null;   // remember last drawing for the gallery thumbnail
const recent = [];             // recent prediction records

// ============================================================
// Build the histogram bars (0–9)
// ============================================================
function buildHistogram() {
  histogramEl.innerHTML = "";
  for (let d = 0; d < NUM_CLASSES; d++) {
    const col = document.createElement("div");
    col.className = "bar-col";
    col.dataset.digit = d;
    col.innerHTML = `
      <div class="bar-track"><div class="bar-fill"></div></div>
      <div class="bar-label">${d}</div>`;
    histogramEl.appendChild(col);
  }
}

function updateHistogram(probs) {
  const cols = histogramEl.children;
  let top = 0;
  for (let i = 1; i < probs.length; i++) if (probs[i] > probs[top]) top = i;
  for (let d = 0; d < NUM_CLASSES; d++) {
    const col = cols[d];
    col.querySelector(".bar-fill").style.height = (probs[d] * 100).toFixed(1) + "%";
    col.classList.toggle("top", d === top);
  }
}

function clearHistogram() {
  for (const col of histogramEl.children) {
    col.classList.remove("top");
    col.querySelector(".bar-fill").style.height = "0%";
  }
}

// ============================================================
// Drawing canvas
// ============================================================
function resetCanvas() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, DRAW_SIZE, DRAW_SIZE);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = BRUSH;
}
resetCanvas();

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const point = e.touches ? e.touches[0] : e;
  return {
    x: (point.clientX - rect.left) * scaleX,
    y: (point.clientY - rect.top) * scaleY,
  };
}

function startDraw(e) {
  if (!isTrained) return;
  e.preventDefault();
  isDrawing = true;
  lastPoint = getPos(e);
  // dot for a single tap
  ctx.beginPath();
  ctx.arc(lastPoint.x, lastPoint.y, BRUSH / 2, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  schedulePredict();
}

function moveDraw(e) {
  if (!isDrawing) return;
  e.preventDefault();
  const p = getPos(e);
  ctx.beginPath();
  ctx.moveTo(lastPoint.x, lastPoint.y);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
  lastPoint = p;
  schedulePredict();
}

function endDraw() {
  if (!isDrawing) return;
  isDrawing = false;
  schedulePredict(/*force*/ true);
}

// Pointer + touch + mouse
canvas.addEventListener("mousedown", startDraw);
canvas.addEventListener("mousemove", moveDraw);
window.addEventListener("mouseup", endDraw);
canvas.addEventListener("touchstart", startDraw, { passive: false });
canvas.addEventListener("touchmove", moveDraw, { passive: false });
canvas.addEventListener("touchend", endDraw);
canvas.addEventListener("touchcancel", endDraw);

clearBtn.addEventListener("click", () => {
  resetCanvas();
  predDigitEl.textContent = "–";
  predConfEl.textContent = "0.0%";
  clearHistogram();
  lastNonZeroInput = null;
});

// Debounced real-time prediction
function schedulePredict(force = false) {
  if (!isTrained) return;
  if (predictTimer) clearTimeout(predictTimer);
  const delay = force ? 0 : 60;
  predictTimer = setTimeout(predictLive, delay);
}

// ============================================================
// Downsample drawing -> 28x28 grayscale (inverted to match MNIST)
// ============================================================
function getInputVector() {
  // draw current canvas scaled down into a 28x28 buffer
  const tmp = document.createElement("canvas");
  tmp.width = IMG_SIZE; tmp.height = IMG_SIZE;
  const tctx = tmp.getContext("2d", { willReadFrequently: true });
  tctx.fillStyle = "#000";
  tctx.fillRect(0, 0, IMG_SIZE, IMG_SIZE);
  tctx.drawImage(canvas, 0, 0, IMG_SIZE, IMG_SIZE);

  const imgData = tctx.getImageData(0, 0, IMG_SIZE, IMG_SIZE).data;
  const vec = new Float32Array(PIXELS_PER_IMG);
  let sum = 0;
  for (let i = 0; i < PIXELS_PER_IMG; i++) {
    // RGB are equal (white stroke on black); take R, normalize 0..1
    const v = imgData[i * 4] / 255;
    vec[i] = v;
    sum += v;
  }
  // If the canvas is essentially blank, don't pretend to predict.
  if (sum < 5) return null;
  return vec;
}

function predictLive() {
  const vec = getInputVector();
  if (!vec) return;
  lastNonZeroInput = vec;

  const probs = tf.tidy(() => {
    const input = tf.tensor4d(vec, [1, IMG_SIZE, IMG_SIZE, 1]);
    return model.predict(input).dataSync();
  });

  let top = 0;
  for (let i = 1; i < probs.length; i++) if (probs[i] > probs[top]) top = i;
  predDigitEl.textContent = top;
  predConfEl.textContent = (probs[top] * 100).toFixed(1) + "%";
  updateHistogram(probs);
}

// ============================================================
// MNIST loading
// Load the sprite PNG, decode pixels, and pair with labels.
// The learnjs sprite is a single image where pixel rows are the
// flattened 784-byte grayscale images (width=784, height=N).
// We read the R channel for grayscale.
// ============================================================
async function fetchLabels(count) {
  const res = await fetch(MNIST_LABELS_URL);
  if (!res.ok) throw new Error("MNIST labels HTTP " + res.status);
  const buf = await res.arrayBuffer();
  const all = new Uint8Array(buf);
  // First NUM_CLASSES bytes per label = one-hot; total entries = all.length/10
  const out = new Uint8Array(count * NUM_CLASSES);
  out.set(all.subarray(0, count * NUM_CLASSES));
  return out;
}

async function fetchImages(count) {
  // Load sprite into an offscreen canvas to read pixels.
  const res = await fetch(MNIST_IMAGES_URL);
  if (!res.ok) throw new Error("MNIST images HTTP " + res.status);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const img = await new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error("Failed to decode MNIST sprite image"));
    im.src = url;
  });

  // Sprite is laid out as rows of flattened images:
  //   width = 784, height = number of images (65000)
  const w = PIXELS_PER_IMG;       // 784
  const h = count;                // rows we need
  const tmp = document.createElement("canvas");
  tmp.width = w; tmp.height = h;
  const tctx = tmp.getContext("2d", { willReadFrequently: true });
  tctx.drawImage(img, 0, 0, w, h, 0, 0, w, h);
  URL.revokeObjectURL(url);

  const data = tctx.getImageData(0, 0, w, h).data; // RGBA
  const out = new Float32Array(count * PIXELS_PER_IMG);
  for (let i = 0; i < count * PIXELS_PER_IMG; i++) {
    out[i] = data[i * 4] / 255;   // R channel as grayscale
  }
  return out;
}

// Build tf.Tensor datasets from flat arrays.
function makeTensors(images, labels, count) {
  const xs = tf.tensor4d(images, [count, IMG_SIZE, IMG_SIZE, 1]);
  const ys = tf.tensor2d(labels, [count, NUM_CLASSES]);
  return { xs, ys };
}

// ============================================================
// Model definition + training
// ============================================================
function buildModel() {
  const m = tf.sequential();
  m.add(tf.layers.flatten({ inputShape: [IMG_SIZE, IMG_SIZE, 1] }));
  m.add(tf.layers.dense({ units: 128, activation: "relu" }));
  m.add(tf.layers.dropout({ rate: 0.2 }));
  m.add(tf.layers.dense({ units: NUM_CLASSES, activation: "softmax" }));
  m.compile({
    optimizer: tf.train.adam(),
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"],
  });
  return m;
}

async function train() {
  statusState.textContent = "Loading MNIST…";
  setStatusSamples("…");
  let trainImgs, trainLbls, testImgs, testLbls;
  try {
    [trainImgs, trainLbls, testImgs, testLbls] = await Promise.all([
      fetchImages(TRAIN_SAMPLES),
      fetchLabels(TRAIN_SAMPLES),
      fetchImages(TEST_SAMPLES),
      fetchLabels(TEST_SAMPLES),
    ]);
  } catch (err) {
    console.error("MNIST load failed:", err);
    showFatalError(
      "Could not load the MNIST dataset from the CDN. " +
      "This demo requires an internet connection to fetch training data. " +
      "Please check your connection and reload. Predictions are disabled until " +
      "the model can be trained on real data."
    );
    return;
  }

  statusSamples.textContent = TRAIN_SAMPLES.toLocaleString();
  statusState.textContent = "Building model…";
  model = buildModel();

  const { xs, ys } = makeTensors(trainImgs, trainLbls, TRAIN_SAMPLES);
  const { xs: xTest, ys: yTest } = makeTensors(testImgs, testLbls, TEST_SAMPLES);

  statusState.textContent = "Training…";
  await model.fit(xs, ys, {
    epochs: EPOCHS,
    batchSize: BATCH_SIZE,
    validationData: [xTest, yTest],
    shuffle: true,
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        const ep = epoch + 1;
        statusEpoch.textContent = ep + "/" + EPOCHS;
        statusLoss.textContent = logs.loss.toFixed(4);
        statusAcc.textContent = (logs.acc * 100).toFixed(2) + "%";
        progressBar.style.width = (ep / EPOCHS * 100) + "%";
        await tf.nextFrame();
      },
    },
  });

  // Final test accuracy on the held-out test set.
  statusState.textContent = "Evaluating…";
  const evalOut = model.evaluate(xTest, yTest, { batchSize: 256 });
  const testAcc = (await evalOut[1].data())[0];
  statusTestAcc.textContent = (testAcc * 100).toFixed(2) + "%";

  // free training tensors
  xs.dispose(); ys.dispose(); xTest.dispose(); yTest.dispose();

  isTrained = true;
  statusState.textContent = "Ready";
  statusState.style.color = "var(--green)";
}

function setStatusSamples(t) { statusSamples.textContent = t; }

function showFatalError(msg) {
  statusState.textContent = "MNIST failed";
  statusState.style.color = "var(--danger)";
  progressBar.style.width = "0%";
  const banner = document.createElement("div");
  banner.className = "error-banner";
  banner.textContent = msg;
  document.querySelector(".container").insertBefore(
    banner,
    document.querySelector(".status-panel")
  );
  // Disable drawing interactions
  canvas.style.opacity = "0.5";
  canvas.style.cursor = "not-allowed";
  clearBtn.disabled = true;
}

// ============================================================
// Recent predictions gallery
// ============================================================
// When drawing ends with a real stroke, snapshot into the gallery.
canvas.addEventListener("mouseup", () => maybeAddToGallery(), { passive: true });
canvas.addEventListener("touchend", () => maybeAddToGallery(), { passive: true });

function maybeAddToGallery() {
  if (!isTrained || !lastNonZeroInput) return;
  // Build a tiny preview canvas from the 28x28 vector (what the model saw).
  const rec = {
    vec: lastNonZeroInput,
    pred: parseInt(predDigitEl.textContent, 10),
    actual: null,
  };
  recent.unshift(rec);
  if (recent.length > 12) recent.pop();
  renderGallery();
}

function renderGallery() {
  if (recent.length === 0) {
    galleryEl.innerHTML = "";
    galleryEl.appendChild(galleryEmpty);
    return;
  }
  galleryEl.innerHTML = "";
  for (let idx = 0; idx < recent.length; idx++) {
    const rec = recent[idx];
    const card = document.createElement("div");
    card.className = "gallery-card" + (rec.actual !== null ? " confirmed" : "");

    const c = document.createElement("canvas");
    c.width = IMG_SIZE; c.height = IMG_SIZE;
    const cctx = c.getContext("2d");
    const id = cctx.createImageData(IMG_SIZE, IMG_SIZE);
    for (let i = 0; i < PIXELS_PER_IMG; i++) {
      const v = Math.round(rec.vec[i] * 255);
      id.data[i * 4] = v;
      id.data[i * 4 + 1] = v;
      id.data[i * 4 + 2] = v;
      id.data[i * 4 + 3] = 255;
    }
    cctx.putImageData(id, 0, 0);
    card.appendChild(c);

    const labels = document.createElement("div");
    labels.className = "labels";
    labels.innerHTML =
      `<span class="pred">Pred: ${rec.pred}</span>` +
      `<span class="actual">Actual: ${rec.actual === null ? "?" : rec.actual}</span>`;
    card.appendChild(labels);

    if (rec.actual === null) {
      const row = document.createElement("div");
      row.className = "confirm-row";
      for (let d = 0; d < NUM_CLASSES; d++) {
        const b = document.createElement("button");
        b.className = "btn btn-confirm";
        b.textContent = d;
        b.addEventListener("click", () => {
          rec.actual = d;
          renderGallery();
        });
        row.appendChild(b);
      }
      card.appendChild(row);
    }
    galleryEl.appendChild(card);
  }
}

// ============================================================
// Boot
// ============================================================
buildHistogram();
renderGallery();
window.addEventListener("load", () => {
  if (typeof tf === "undefined") {
    showFatalError(
      "TensorFlow.js failed to load from the CDN. Please check your internet " +
      "connection and reload. The model cannot run without it."
    );
    return;
  }
  train();
});

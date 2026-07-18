/* =============================================================
   Widgets — all interactive components live here.
   Exposed entry points:
     - renderAllWidgets()  : initial render of every widget
     - wireWidgetInputs()  : wire input/change/click events
     - onSlideChange(e)    : per-slide hooks (start/stop animations,
                             refit charts, etc.)
     - refitWidgets()      : called on Reveal resize
     - applyChartDefaults(): set Chart.js global defaults for dark theme
   ============================================================= */

if (!window.CLAIM_DATA) {
  throw new Error('claim-data.js must load before widgets.js');
}
const CLAIMS = window.CLAIM_DATA;

// ---------- Chart.js dark-theme defaults ----------
function applyChartDefaults() {
  if (typeof Chart === 'undefined') return;
  Chart.defaults.font.family = "'Inter', -apple-system, sans-serif";
  Chart.defaults.color = '#B6C0CE';
  Chart.defaults.borderColor = '#243049';
  Chart.defaults.plugins.legend.labels.color = '#E6EDF3';
  Chart.defaults.plugins.tooltip.backgroundColor = '#11172A';
  Chart.defaults.plugins.tooltip.titleColor = '#E6EDF3';
  Chart.defaults.plugins.tooltip.bodyColor = '#B6C0CE';
  Chart.defaults.plugins.tooltip.borderColor = '#243049';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
}

// Chart handles kept here so we can resize on slide change.
const CHARTS = {};
let PRESENTATION_ANIMATIONS_PAUSED = false;

function setPresentationAnimationsPaused(paused) {
  PRESENTATION_ANIMATIONS_PAUSED = Boolean(paused);
  if (PRESENTATION_ANIMATIONS_PAUSED) {
    if (window._matrixCycler) {
      clearInterval(window._matrixCycler);
      window._matrixCycler = null;
    }
    stopZoomOut();
    stopAgentLoopAnim();
    stopToolTypingAnim();
    stopMcpAutoCycle();
    stopWealthAutoCycle();
    const slide = document.querySelector('.reveal .slides > section.present');
    if (slide && slide.querySelector('#zoom-canvas')) renderZoomStatic();
    if (slide && slide.querySelector('.agent-loop')) showAgentLoopStatic();
  } else {
    const slide = document.querySelector('.reveal .slides > section.present');
    spawnMatrixBackdrop();
    if (slide) onSlideChange({ currentSlide: slide, previousSlide: null });
  }
}

// ============================================================
//  Slide 1 — Title slide: drifting matrix-multiply backdrop
// ============================================================
function spawnMatrixBackdrop() {
  const wraps = document.querySelectorAll('.matrix-bg');
  if (!wraps.length) return;

  const rand = (a, b) => Math.floor(a + Math.random() * (b - a));
  const exprText = () => {
    // [a b; c d] × [x; y] = [ax+by; cx+dy]
    const a = rand(0, 9), b = rand(0, 9), c = rand(0, 9), d = rand(0, 9);
    const x = rand(0, 9), y = rand(0, 9);
    const r1 = a * x + b * y, r2 = c * x + d * y;
    const styles = [
      `[${a} ${b}; ${c} ${d}] · [${x}; ${y}] = [${r1}; ${r2}]`,
      `(${a},${b}) × (${x},${y}) → ${r1}`,
      `W·x = [${a}·${x}+${b}·${y}; ${c}·${x}+${d}·${y}] = [${r1}; ${r2}]`,
    ];
    return styles[rand(0, styles.length)];
  };

  wraps.forEach((wrap) => {
    if (wrap.dataset.spawned) return;
    wrap.dataset.spawned = '1';

    const COUNT = 14;
    for (let i = 0; i < COUNT; i++) {
      const el = document.createElement('div');
      el.className = 'mexpr';
      el.textContent = exprText();
      const size = 0.65 + Math.random() * 0.55;  // em
      el.style.fontSize = size.toFixed(2) + 'em';
      el.style.left  = rand(2, 92) + '%';
      el.style.top   = rand(4, 90) + '%';
      el.style.animationDuration = (10 + Math.random() * 10).toFixed(1) + 's';
      el.style.animationDelay = (-Math.random() * 14).toFixed(1) + 's';
      // Avoid drawing right behind the centered title block (~30–70% width, 30–70% height)
      const left = parseFloat(el.style.left), top = parseFloat(el.style.top);
      if (left > 22 && left < 70 && top > 28 && top < 68) {
        el.style.left = (left < 46 ? rand(2, 18) : rand(74, 92)) + '%';
      }
      wrap.appendChild(el);
    }
  });

  // Periodically refresh expressions across all backdrops so values cycle
  if (!window._matrixCycler) {
    window._matrixCycler = setInterval(() => {
      const items = document.querySelectorAll('.matrix-bg .mexpr');
      if (!items.length) return;
      const pick = items[rand(0, items.length)];
      if (pick) pick.textContent = exprText();
    }, 1800);
  }
}

// ============================================================
//  Slide 4 — Linear Algebra ~~Review~~ → 101 scratch-out
//  Plays automatically on slide entry.
// ============================================================
function playReviewScratch() {
  const root = document.querySelector('.linalg-review');
  if (!root || root.dataset.played) return;
  root.dataset.played = '1';
  root.classList.add('animate-in');
}
function resetReviewScratch() {
  const root = document.querySelector('.linalg-review');
  if (!root) return;
  delete root.dataset.played;
  root.classList.remove('animate-in');
  // Force CSS animation restart by re-inserting the element
  const parent = root.parentNode;
  const next = root.nextSibling;
  parent.removeChild(root);
  parent.insertBefore(root, next);
}

// ============================================================
//  Slide 5b — Matrix-multiplication explainer (row-walk form)
//
//  Layout:     [input row 1×3]  ×  [W 3×3]  =  [output row 1×3]
//
//  W is laid out so each *row* maps the full input → one output.
//    rows    = outputs       (EAT / SLEEP / CHAT)
//    columns = input factors (hunger / tired / mood)
//  out[i] = sum_k v[k] * W[i][k]   (row i of W dotted with the input)
//
//  (Strictly the input would be a 3×1 column to make the shapes line up,
//   but we keep it as a row of 3 since it lines up 1-to-1 with each
//   matrix row's three weights — easier to follow visually.)
// ============================================================
const MM_M = [   // 3×3 weight matrix — rows are outputs, columns are input factors
  //  hunger, tired, mood
  [  0.5,    0.2,  -0.1],   // EAT   row
  [  0.1,    0.8,   0.1],   // SLEEP row
  [ -0.2,    0.0,   0.9],   // CHAT  row
];
const MM_V = [4, 7, 2];   // input vector (hunger / tired / mood)
const MM_LBL_IN  = ['hunger', 'tired', 'mood'];
const MM_LBL_OUT = ['EAT', 'SLEEP', 'CHAT'];

const MM_STATE = { step: 0, row: 0 };  // step = which output row of W; row = which term (column) within that row

function renderMatmul() {
  const root = document.getElementById('matmul-explainer');
  if (!root || root.dataset.built) return;
  root.dataset.built = '1';
  root.innerHTML = `
    <div class="mmx">
      <div class="mmx-eq">
        <div class="mmx-vec mmx-vec-row" id="mmx-vec">
          <div class="mmx-vlbl-row">${MM_LBL_IN.map(l => `<span class="mmx-vlbl">${l}</span>`).join('')}</div>
          <div class="mmx-vcells-row">${MM_V.map((v, i) => `<span class="mmx-vcell" data-i="${i}">${v}</span>`).join('')}</div>
        </div>
        <div class="mmx-times">×</div>
        <div class="mmx-mat" id="mmx-mat"><span class="model-tag floating">Model</span>
          ${MM_M.map((row, r) => `
            <div class="mmx-row" data-row="${r}">
              ${row.map((v, c) => `<span class="mmx-cell" data-r="${r}" data-c="${c}">${mmFmt(v)}</span>`).join('')}
            </div>`).join('')}
        </div>
        <div class="mmx-eq-sign">=</div>
        <div class="mmx-out mmx-vec-row" id="mmx-out">
          <div class="mmx-vlbl-row">${MM_LBL_OUT.map(l => `<span class="mmx-vlbl">${l}</span>`).join('')}</div>
          <div class="mmx-vcells-row">${MM_LBL_OUT.map((_, r) => `<span class="mmx-vcell out" data-out-val="${r}">·</span>`).join('')}</div>
        </div>
      </div>

      <div class="mmx-explain" id="mmx-explain">
        <div class="mmx-step-title">Click <strong>Next step</strong> to compute the first output.</div>
      </div>

      <div class="controls-actions mt-1">
        <button class="btn" id="mmx-next" type="button" data-step-btn>Next step →</button>
        <button class="btn ghost" id="mmx-reset" type="button">Reset</button>
      </div>
    </div>`;
}

function mmxRefresh() {
  const root = document.getElementById('matmul-explainer'); if (!root) return;
  // Clear highlights
  root.querySelectorAll('.mmx-cell, .mmx-vcell').forEach(el => el.classList.remove('hl', 'done'));
  root.querySelectorAll('.mmx-row').forEach(el => el.classList.remove('active'));

  const s = MM_STATE.step;        // current output index (row of W) [0..2]
  const r = MM_STATE.row;         // current term within that row (column of W) [0..2]

  // Mark all already-completed output cells
  for (let i = 0; i < s; i++) {
    const v = mmRowDot(MM_V, MM_M, i).toFixed(2);
    const out = root.querySelector(`[data-out-val="${i}"]`);
    if (out) { out.textContent = v; out.classList.add('done'); }
  }

  const explain = document.getElementById('mmx-explain');
  const nextBtn = document.getElementById('mmx-next');
  if (s >= MM_M.length) {
    if (nextBtn) nextBtn.disabled = true;
    // Find Travis's winning action
    const finalOuts = MM_M.map((_, i) => mmRowDot(MM_V, MM_M, i));
    let bestIdx = 0;
    for (let j = 1; j < finalOuts.length; j++) if (finalOuts[j] > finalOuts[bestIdx]) bestIdx = j;
    const ACTIONS = ['eat something', 'go to sleep', 'go chat with a neighbor'];
    explain.innerHTML = `
      <div class="mmx-step-title done">Done — Travis will most likely <strong>${ACTIONS[bestIdx]}</strong> next.</div>
      <div class="mmx-step-body">"${MM_LBL_OUT[bestIdx]}" scored highest (${finalOuts[bestIdx].toFixed(2)}). Each output is a <strong>weighted sum</strong> of all of Travis's needs — one ingredient that larger neural networks repeat across billions of learned weights.</div>`;
    return;
  }

  if (r < 0) {
    explain.innerHTML = `
      <div class="mmx-step-title">Ready · 0 of 9 multiply-and-add terms</div>
      <div class="mmx-step-body">Each click pairs one need with one weight. Three terms make one action score; three rows make all three scores.</div>`;
    if (nextBtn) {
      nextBtn.disabled = false;
      nextBtn.textContent = 'Start · 0 / 9 →';
    }
    return;
  }

  // Mark the active row of W, then highlight cells across that row
  const activeRow = root.querySelector(`.mmx-row[data-row="${s}"]`);
  if (activeRow) activeRow.classList.add('active');
  root.querySelectorAll(`.mmx-cell[data-r="${s}"]`).forEach((el, idx) => {
    if (idx < r) el.classList.add('done');
    else if (idx === r) el.classList.add('hl');
  });
  // Highlight the input vector entry that pairs with the current column
  root.querySelectorAll('.mmx-vcell:not(.out)').forEach((el, idx) => {
    if (idx < r) el.classList.add('done');
    else if (idx === r) el.classList.add('hl');
  });

  // Build running sum text
  const terms = [];
  for (let k = 0; k <= r; k++) {
    terms.push(`(${MM_V[k]} × ${MM_M[s][k].toFixed(1)})`);
  }
  let partial = 0;
  for (let k = 0; k <= r; k++) partial += MM_V[k] * MM_M[s][k];

  // Update output cell with the partial sum
  const out = root.querySelector(`[data-out-val="${s}"]`);
  if (out) { out.textContent = partial.toFixed(2); out.classList.add('hl'); }

  explain.innerHTML = `
    <div class="mmx-step-title">Output ${s + 1} ("${MM_LBL_OUT[s]}" — how much does Travis want to ${['eat', 'sleep', 'chat'][s]}?) — term ${r + 1} of ${MM_V.length}</div>
    <div class="mmx-step-body">
      <span class="mmx-formula">${terms.join(' + ')} = <strong>${partial.toFixed(2)}</strong></span>
    </div>
    <div class="mmx-step-hint small muted">Multiply each input by the matching weight in this row, then add them up.</div>`;
  if (nextBtn) {
    nextBtn.disabled = false;
    const completedTerms = s * MM_V.length + Math.max(0, r + 1);
    nextBtn.textContent = `Next step · ${Math.min(completedTerms, 9)} / 9 →`;
  }
}

function mmRowDot(v, M, row) {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * M[row][i];
  return s;
}
// Format a weight value so positive and negative numbers occupy the same
// visual width inside the pill — a leading figure-space (U+2007 has the same
// width as a digit in mono) stands in for the missing minus sign.
function mmFmt(v) {
  const s = v.toFixed(1);
  const sign = s.startsWith('-') ? '<span class="mmx-sign">\u2212</span>' : '<span class="mmx-sign"></span>';
  return sign + '<span class="mmx-num">' + s.replace('-', '') + '</span>';
}

function mmxNext() {
  MM_STATE.row++;
  if (MM_STATE.step === MM_M.length - 1 && MM_STATE.row === MM_V.length - 1) {
    MM_STATE.step = MM_M.length;
    MM_STATE.row = 0;
    mmxRefresh();
    return;
  }
  if (MM_STATE.row >= MM_V.length) { MM_STATE.row = 0; MM_STATE.step++; }
  if (MM_STATE.step > MM_M.length) { MM_STATE.step = MM_M.length; MM_STATE.row = 0; }
  mmxRefresh();
}
function mmxReset() { MM_STATE.step = 0; MM_STATE.row = -1; mmxRefresh(); }
function wireMatmul() {
  const root = document.getElementById('matmul-explainer'); if (!root) return;
  if (root.dataset.wired) return;
  root.dataset.wired = '1';
  document.getElementById('mmx-next').addEventListener('click', mmxNext);
  document.getElementById('mmx-reset').addEventListener('click', mmxReset);
  MM_STATE.step = 0; MM_STATE.row = -1; mmxRefresh();
}

// ============================================================
//  Slide 5 — Mood Mixer: 3 sliders × 3×3 matrix → 3 outputs
// ============================================================
const MOOD_DEFAULTS = {
  inputs: [4, 7, 2],
  weights: [
    [ 0.5,  0.2, -0.1],
    [ 0.1,  0.8,  0.1],
    [-0.2,  0.0,  0.9],
  ],
};
const MOOD_LABELS_IN  = ['Hunger', 'Tired', 'Mood'];
const MOOD_LABELS_OUT = ['Eat?', 'Sleep?', 'Chat?'];

function renderMoodMixer() {
  const root = document.getElementById('mood-mixer');
  if (!root || root.dataset.built) return;
  root.dataset.built = '1';

  const html = `
    <div class="mm-grid">
      <div class="mm-col mm-inputs">
        <h4>Inputs</h4>
        ${MOOD_LABELS_IN.map((label, i) => `
          <div class="field mm-field">
            <label>${label} <span class="val" id="mm-in-val-${i}">${MOOD_DEFAULTS.inputs[i]}</span></label>
            <input type="range" id="mm-in-${i}" min="0" max="10" step="1" value="${MOOD_DEFAULTS.inputs[i]}" aria-label="${label}">
          </div>`).join('')}
      </div>
      <div class="mm-col mm-weights">
        <h4>Weight matrix <span class="model-tag">Model</span></h4>
        <table class="mm-matrix">
          <thead><tr><th></th>${MOOD_LABELS_IN.map(l => `<th>${l}</th>`).join('')}</tr></thead>
          <tbody>
            ${MOOD_LABELS_OUT.map((rl, r) => `
              <tr data-row="${r}">
                <th>${rl}</th>
                ${MOOD_DEFAULTS.weights[r].map((v, c) => `
                  <td><input type="number" id="mm-w-${r}-${c}" step="0.1" value="${v}" aria-label="${rl} weight for ${MOOD_LABELS_IN[c]}"></td>
                `).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
        <div class="controls-actions">
          <button class="btn ghost" id="mm-reset">Reset</button>
          <span class="hint">Try editing the weights</span>
        </div>
      </div>
      <div class="mm-col mm-outputs">
        <h4>Outputs</h4>
        <div class="mm-out-grid">
        ${MOOD_LABELS_OUT.map((label, i) => `
          <div class="mm-out-row" id="mm-out-row-${i}" tabindex="0" role="group" aria-label="${label} output and matching weight row">
            <div class="mm-out-label">${label}</div>
            <div class="mm-bar-wrap"><div class="mm-bar" id="mm-bar-${i}"></div></div>
            <div class="mm-out-val" id="mm-out-val-${i}">0.00</div>
          </div>`).join('')}
        </div>
        <p class="small muted mt-2" id="mm-verdict" aria-live="polite">Adjust the sliders to see Travis's next action.</p>
        <p class="small muted mt-1" style="opacity:0.7;">→ Hover an output name to highlight its row in the weight matrix.</p>
      </div>
    </div>`;
  root.innerHTML = html;

  // Row hover highlights matrix row
  MOOD_LABELS_OUT.forEach((_, r) => {
    const row = document.getElementById(`mm-out-row-${r}`);
    if (!row) return;
    row.addEventListener('mouseenter', () => highlightMoodRow(r, true));
    row.addEventListener('mouseleave', () => highlightMoodRow(r, false));
    row.addEventListener('focus', () => highlightMoodRow(r, true));
    row.addEventListener('blur', () => highlightMoodRow(r, false));
  });

  computeMood();
}

function highlightMoodRow(r, on) {
  const tr = document.querySelector(`.mm-matrix tr[data-row="${r}"]`);
  if (tr) tr.classList.toggle('is-hot', on);
  const outRow = document.getElementById(`mm-out-row-${r}`);
  if (outRow) outRow.classList.toggle('is-hot', on);
}

function computeMood() {
  if (!document.getElementById('mood-mixer')) return;
  const inputs = [0, 1, 2].map(i => parseFloat(document.getElementById(`mm-in-${i}`).value) || 0);
  inputs.forEach((v, i) => {
    const el = document.getElementById(`mm-in-val-${i}`);
    if (el) el.textContent = v;
  });
  const W = [0, 1, 2].map(r => [0, 1, 2].map(c => parseFloat(document.getElementById(`mm-w-${r}-${c}`).value) || 0));
  const outs = W.map(row => row.reduce((a, w, c) => a + w * inputs[c], 0));

  // Determine display range across outputs for bar scaling
  const maxAbs = Math.max(1, ...outs.map(o => Math.abs(o)));
  let bestIdx = 0;
  outs.forEach((o, i) => {
    if (o > outs[bestIdx]) bestIdx = i;
    const valEl = document.getElementById(`mm-out-val-${i}`);
    const barEl = document.getElementById(`mm-bar-${i}`);
    if (valEl) valEl.textContent = o.toFixed(2);
    if (barEl) {
      const pct = (Math.abs(o) / maxAbs) * 100;
      barEl.style.width = pct.toFixed(1) + '%';
      barEl.classList.toggle('neg', o < 0);
    }
  });
  // Live verdict — name the action Travis is most likely to take next
  const verdict = document.getElementById('mm-verdict');
  if (verdict) {
    const ACTIONS = ['eat something', 'go to sleep', 'go chat with a neighbor'];
    if (outs[bestIdx] <= 0) {
      verdict.innerHTML = `Travis doesn't feel like doing anything right now.`;
    } else {
      verdict.innerHTML = `→ Travis will most likely <strong>${ACTIONS[bestIdx]}</strong> next (score <strong>${outs[bestIdx].toFixed(2)}</strong>).`;
    }
  }
}

function wireMoodMixer() {
  const root = document.getElementById('mood-mixer');
  if (!root) return;
  root.addEventListener('input', (e) => {
    if (e.target.matches('input[type="range"], input[type="number"]')) computeMood();
  });
  const reset = document.getElementById('mm-reset');
  if (reset) {
    reset.addEventListener('click', () => {
      MOOD_DEFAULTS.inputs.forEach((v, i) => {
        const el = document.getElementById(`mm-in-${i}`); if (el) el.value = v;
      });
      MOOD_DEFAULTS.weights.forEach((row, r) => row.forEach((v, c) => {
        const el = document.getElementById(`mm-w-${r}-${c}`); if (el) el.value = v;
      }));
      computeMood();
    });
  }
}

// ============================================================
//  Slide 6 — A genuine tiny decoder-only transformer
// ============================================================
// This one-layer, one-head model was trained on two examples:
//   C A -> T
//   B A -> D
// Because the latest token is A in both examples, the model must use causal
// self-attention to recover the first token. d_model=2 keeps every learned
// projection in the attention and MLP blocks at 2x2. The vocabulary embedding
// table is 5x2 and is tied to the output head.

const TT_TOKENS = ['C', 'B', 'A', 'T', 'D'];
const TT_MODEL = {
  positions: [[-0.215026, 0.574745], [-0.530145, -0.153110]],
  embeddings: [
    [ 0.073817, -1.144056],
    [ 0.541539, -0.998126],
    [ 0.622092,  1.542051],
    [-1.621297, -1.704078],
    [-1.147852,  2.913131],
  ],
  norm1: [1.592385, 1.197431],
  q: [[ 0.970285,  0.940455], [-0.446786, -0.744309]],
  k: [[-0.819539, -0.377791], [-0.220349,  0.928223]],
  v: [[ 0.023177, -0.102654], [-1.029031, -0.546534]],
  o: [[-0.202278, -0.396141], [-0.203585, -0.754599]],
  norm2: [0.879187, 1.334419],
  ff1: [[-0.432111, 0.581963], [-0.234796, 0.464147]],
  ff2: [[-0.729627, -1.432304], [-0.843985, -0.430868]],
};
const TT_STATE = { prefix: 'CA', phase: 0, showMath: false };

function ttDot(a, b) {
  return a.reduce((sum, value, i) => sum + value * b[i], 0);
}
function ttLinear(vector, weights) {
  return weights.map(row => ttDot(vector, row));
}
function ttAdd(a, b) {
  return a.map((value, i) => value + b[i]);
}
function ttRmsNorm(vector, scale) {
  const rms = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0) / vector.length + 1e-5);
  return vector.map((value, i) => (value / rms) * scale[i]);
}
function ttGelu(value) {
  return 0.5 * value * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (value + 0.044715 * value * value * value)));
}
function ttSoftmax(values) {
  const max = Math.max(...values);
  const exps = values.map(value => Math.exp(value - max));
  const sum = exps.reduce((acc, value) => acc + value, 0);
  return exps.map(value => value / sum);
}
function ttRun(prefix) {
  const ids = prefix === 'CA' ? [0, 2] : [1, 2];
  const labels = prefix.split('');
  const tokenEmbeddings = ids.map(id => TT_MODEL.embeddings[id]);
  const positionEmbeddings = ids.map((_, i) => TT_MODEL.positions[i]);
  const x = tokenEmbeddings.map((embedding, i) => ttAdd(embedding, positionEmbeddings[i]));
  const normalized = x.map(row => ttRmsNorm(row, TT_MODEL.norm1));
  const q = normalized.map(row => ttLinear(row, TT_MODEL.q));
  const k = normalized.map(row => ttLinear(row, TT_MODEL.k));
  const v = normalized.map(row => ttLinear(row, TT_MODEL.v));
  const scores = q.map((query, row) => k.map((key, col) => col > row ? -Infinity : ttDot(query, key) / Math.sqrt(2)));
  const attention = scores.map(ttSoftmax);
  const mixed = attention.map(weights => {
    return [0, 1].map(dim => weights.reduce((sum, weight, token) => sum + weight * v[token][dim], 0));
  });
  const attentionUpdates = mixed.map(row => ttLinear(row, TT_MODEL.o));
  const afterAttention = x.map((row, i) => ttAdd(row, attentionUpdates[i]));
  const mlpUpdates = afterAttention.map(row => {
    const hidden = ttLinear(ttRmsNorm(row, TT_MODEL.norm2), TT_MODEL.ff1).map(ttGelu);
    return ttLinear(hidden, TT_MODEL.ff2);
  });
  const afterMlp = afterAttention.map((row, i) => ttAdd(row, mlpUpdates[i]));
  const logits = TT_MODEL.embeddings.map(embedding => ttDot(afterMlp[1], embedding));
  const probabilities = ttSoftmax(logits);
  return {
    ids,
    labels,
    tokenEmbeddings,
    positionEmbeddings,
    x,
    q,
    k,
    v,
    scores,
    attention,
    mixed,
    attentionUpdates,
    afterAttention,
    mlpUpdates,
    afterMlp,
    logits,
    probabilities,
  };
}
function ttFmt(value, digits = 2) {
  if (!Number.isFinite(value)) return '−∞';
  const rounded = Math.abs(value) < 0.005 ? 0 : value;
  return rounded.toFixed(digits).replace('-', '−');
}
function ttMatrixHtml(matrix, rowLabels, colLabels, mode) {
  return `
    <div class="tt-table ${mode || ''}">
      <div class="tt-corner"></div>
      ${colLabels.map(label => `<div class="tt-axis-label">${label}</div>`).join('')}
      ${matrix.map((row, r) => `
        <div class="tt-axis-label row">${rowLabels[r]}</div>
        ${row.map((value, c) => {
          const masked = !Number.isFinite(value);
          const hot = r === 1 && c === 0 && mode === 'weights';
          return `<div class="tt-number ${masked ? 'masked' : ''} ${hot ? 'hot' : ''}">${mode === 'weights' && !masked ? Math.round(value * 100) + '%' : ttFmt(value)}</div>`;
        }).join('')}
      `).join('')}
    </div>`;
}
function ttVectorMatrixHtml(matrix, labels) {
  return `
    <div class="tt-table vectors">
      <div class="tt-corner"></div><div class="tt-axis-label">dim 1</div><div class="tt-axis-label">dim 2</div>
      ${matrix.map((row, r) => `
        <div class="tt-axis-label row">${labels[r]}</div>
        ${row.map(value => `<div class="tt-number">${ttFmt(value)}</div>`).join('')}
      `).join('')}
    </div>`;
}
function ttVectorHtml(vector) {
  return `<span class="tt-inline-vector">[${vector.map(value => ttFmt(value)).join(', ') }]</span>`;
}
function ttEmbeddingHtml(result) {
  return `
    <div class="tt-embed-intro"><strong>Embedding = learned lookup.</strong> A token selects one row from a table of vectors; position adds where it appeared.</div>
    <div class="tt-embed-grid">
      <div class="tt-embed-heading">token</div>
      <div class="tt-embed-heading">learned token vector</div>
      <div></div>
      <div class="tt-embed-heading">learned position vector</div>
      <div></div>
      <div class="tt-embed-heading">input vector</div>
      ${result.labels.map((label, i) => `
        <div class="tt-embed-token">${label}</div>
        ${ttVectorHtml(result.tokenEmbeddings[i])}
        <div class="tt-eq-symbol">+</div>
        <div class="tt-position-vector"><span>P${i + 1}</span>${ttVectorHtml(result.positionEmbeddings[i])}</div>
        <div class="tt-eq-symbol">=</div>
        ${ttVectorHtml(result.x[i])}
      `).join('')}
    </div>`;
}
function ttQueryKeyScoreHtml(result) {
  const queryA = result.q[1];
  const comparisons = [
    { keyLabel: result.labels[0], key: result.k[0], score: result.scores[1][0] },
    { keyLabel: result.labels[1], key: result.k[1], score: result.scores[1][1] },
  ];
  return `
    ${ttMatrixHtml(result.scores, result.labels, result.labels, 'scores')}
    <div class="tt-qk-examples">
      <div class="tt-qk-query"><span>Current query</span><strong>Q(${result.labels[1]})</strong>${ttVectorHtml(queryA)}</div>
      ${comparisons.map(item => `
        <div class="tt-key-row">
          <strong>K(${item.keyLabel})</strong>
          ${ttVectorHtml(item.key)}
          <em>dot ÷ √2</em>
          <strong>= ${ttFmt(item.score)}</strong>
        </div>
      `).join('')}
    </div>
    <p class="tt-caption">Rows are queries; columns are keys. The <span class="tt-mask-word">mask</span> blocks C from looking ahead to A.</p>`;
}
function ttContextHtml(result) {
  const last = 1;
  const weights = result.attention[last];
  return `
    <div class="tt-context-flow">
      <div class="tt-context-line">
        <span>Attention mix</span>
        <strong>${Math.round(weights[0] * 1000) / 10}% V(${result.labels[0]}) + ${Math.round(weights[1] * 1000) / 10}% V(A)</strong>
        ${ttVectorHtml(result.mixed[last])}
      </div>
      <div class="tt-context-line">
        <span>2×2 output projection</span>
        <strong>turns the mix into an update</strong>
        ${ttVectorHtml(result.attentionUpdates[last])}
      </div>
    </div>
    <div class="tt-residual-equation">
      <div><span>original A</span>${ttVectorHtml(result.x[last])}</div>
      <b>+</b>
      <div><span>context update</span>${ttVectorHtml(result.attentionUpdates[last])}</div>
      <b>=</b>
      <div class="result"><span>contextual A</span>${ttVectorHtml(result.afterAttention[last])}</div>
    </div>
    <p class="tt-caption"><strong>Residual connection:</strong> keep A's original state and add the information attention retrieved.</p>`;
}
function ttPredictionHtml(result, target, other) {
  const finalState = result.afterMlp[1];
  const targetIndex = TT_TOKENS.indexOf(target);
  const otherIndex = TT_TOKENS.indexOf(other);
  const candidateRow = index => {
    const vector = TT_MODEL.embeddings[index];
    const score = result.logits[index];
    return `
      <div class="tt-score-row ${index === targetIndex ? 'winner' : ''}">
        <span class="tt-score-token">${TT_TOKENS[index]}</span>
        ${ttVectorHtml(vector)}
        <span class="tt-dot">· final =</span>
        <strong>${ttFmt(score)}</strong>
      </div>`;
  };
  return `
    <div class="tt-residual-equation compact">
      <div><span>contextual A</span>${ttVectorHtml(result.afterAttention[1])}</div>
      <b>+</b>
      <div><span>MLP update</span>${ttVectorHtml(result.mlpUpdates[1])}</div>
      <b>=</b>
      <div class="result"><span>final state</span>${ttVectorHtml(finalState)}</div>
    </div>
    <div class="tt-score-explain">The output head asks: <strong>which token vector best aligns with that final state?</strong></div>
    <div class="tt-score-grid">
      ${candidateRow(targetIndex)}
      ${candidateRow(otherIndex)}
    </div>
    <p class="tt-caption">${ttVectorHtml(finalState)} · ${ttVectorHtml(TT_MODEL.embeddings[targetIndex])} = <strong>${ttFmt(result.logits[targetIndex])}</strong>. Softmax converts all five token scores into probabilities, so <strong>${target}</strong> wins.</p>`;
}

function ttEmbedSimpleHtml(result) {
  return `
    <div class="tt-simple">
      <p class="tt-simple-lead">Each letter has a fixed <strong>list of numbers</strong> the model learned — its "word-vector." (Position, where the letter sits, is folded in too.)</p>
      <div class="tt-simple-embed">
        ${result.labels.map((label, i) => `
          <div class="tt-simple-chip">
            <span class="tt-simple-letter">${label}</span>
            <span class="tt-simple-arrow">→</span>
            ${ttVectorHtml(result.x[i])}
          </div>`).join('')}
      </div>
      <p class="tt-caption">You don't need to read the numbers — the model does. The point: every letter is now a handful of numbers it can mix.</p>
    </div>`;
}
function ttAttentionSimpleHtml(result) {
  const weights = result.attention[1];
  const first = result.labels[0];
  const pctFirst = Math.round(weights[0] * 100);
  const pctA = Math.round(weights[1] * 100);
  return `
    <div class="tt-simple">
      <p class="tt-simple-lead">The last letter <strong>A</strong> looks back at the earlier letters and decides which one matters. That choice is <strong>attention</strong>.</p>
      <div class="tt-attn-bars">
        <div class="tt-attn-row hot">
          <span class="tt-attn-label">look back at ${first}</span>
          <span class="tt-attn-track"><span class="tt-attn-fill" style="width:${Math.max(2, pctFirst)}%"></span></span>
          <span class="tt-attn-val">${pctFirst}%</span>
        </div>
        <div class="tt-attn-row">
          <span class="tt-attn-label">stay on A</span>
          <span class="tt-attn-track"><span class="tt-attn-fill" style="width:${Math.max(2, pctA)}%"></span></span>
          <span class="tt-attn-val">${pctA}%</span>
        </div>
      </div>
      <p class="tt-caption">Without attention, <code>CA</code> and <code>BA</code> look identical — both end in <code>A</code>. Looking back at <strong>${first}</strong> is what lets the model tell them apart.</p>
    </div>`;
}
function ttPredictSimpleHtml(result, target, other) {
  const first = result.labels[0];
  const targetProb = result.probabilities[TT_TOKENS.indexOf(target)];
  return `
    <div class="tt-simple">
      <p class="tt-simple-lead">Having pulled in <strong>${first}</strong>, the model scores all five possible next letters and picks the best fit.</p>
      <div class="tt-simple-verdict">
        <span class="tt-simple-seq">${result.labels[0]} ${result.labels[1]} →</span>
        <span class="tt-simple-answer">${target}</span>
        <span class="tt-simple-prob">${(targetProb * 100).toFixed(0)}% sure</span>
      </div>
      <p class="tt-caption"><code>${first}A</code> leads to <strong>${target}</strong>; the other prefix would lead to <strong>${other}</strong>. Same last letter, different answer — because attention looked back.</p>
    </div>`;
}

function renderToyTransformer() {
  const root = document.getElementById('toy-transformer');
  if (!root || root.dataset.built) return;
  root.dataset.built = '1';
  root.innerHTML = `
    <div class="tt-demo">
      <div class="tt-stage">
        <div class="tt-prefix-control" role="group" aria-label="Choose the two-token prefix">
          <span class="tt-prefix-label">Try a prefix</span>
          <button class="tt-prefix is-active" type="button" data-prefix="CA" aria-pressed="true"><span>C</span><span>A</span></button>
          <button class="tt-prefix" type="button" data-prefix="BA" aria-pressed="false"><span>B</span><span>A</span></button>
        </div>
        <div class="tt-sequence" id="tt-sequence" aria-live="polite"></div>
        <div class="tt-focus-card">
          <div class="tt-focus-kicker" id="tt-focus-kicker">Ready</div>
          <div id="tt-focus" aria-live="polite"></div>
        </div>
        <div class="controls-actions">
          <button class="btn" id="tt-step" type="button" data-step-btn>Start →</button>
          <button class="btn ghost" id="tt-reset" type="button">Reset</button>
          <label class="tt-math-toggle"><input type="checkbox" id="tt-math"> Show the math</label>
          <span class="tt-step-count" id="tt-step-count">step 0 / 3</span>
        </div>
      </div>
      <div class="tt-story">
        <div class="tt-story-card">
          <div class="tt-story-title">Why a transformer is different</div>
          <p>Travis's brain was a single linear step — it only reacts to the current input. A transformer also <strong>looks back</strong> at earlier tokens and works them into the prediction, so the next token is more accurate. Here the latest letter is <code>A</code> in both cases — so it is the <strong>first</strong> letter that tells us everything.</p>
        </div>
        <div class="tt-pipeline three" aria-label="Tiny transformer pipeline">
          <span>embed the letters</span><span>look back (attention)</span><span>predict the letter</span>
        </div>
        <div class="tt-result-card">
          <div class="tt-story-title">Next-letter probabilities</div>
          <div id="tt-probabilities" class="tt-probabilities" aria-live="polite"></div>
        </div>
        <p class="tt-model-note">Five letters · one attention layer · trained on <code>CA→T</code> and <code>BA→D</code> · about 42 learned numbers</p>
      </div>
    </div>`;
  refreshToyTransformer();
}

function refreshToyTransformer() {
  const root = document.getElementById('toy-transformer');
  if (!root) return;
  const result = ttRun(TT_STATE.prefix);
  const target = TT_STATE.prefix === 'CA' ? 'T' : 'D';
  const other = target === 'T' ? 'D' : 'T';
  const phase = TT_STATE.phase;
  const showMath = TT_STATE.showMath;
  root.dataset.mathOpen = showMath ? '1' : '';
  const focus = document.getElementById('tt-focus');
  const kicker = document.getElementById('tt-focus-kicker');
  const sequence = document.getElementById('tt-sequence');
  const step = document.getElementById('tt-step');
  const count = document.getElementById('tt-step-count');
  const probabilities = document.getElementById('tt-probabilities');
  const mathToggle = document.getElementById('tt-math');
  if (mathToggle) mathToggle.checked = showMath;

  root.querySelectorAll('.tt-prefix').forEach(button => {
    const active = button.dataset.prefix === TT_STATE.prefix;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  root.querySelectorAll('.tt-pipeline span').forEach((span, i) => {
    span.classList.toggle('is-active', phase - 1 === i);
  });

  const revealed = phase === 3;
  sequence.innerHTML = `
    <span class="tt-token-chip">${result.labels[0]}</span>
    <span class="tt-token-chip">${result.labels[1]}</span>
    <span class="tt-token-arrow">→</span>
    <span class="tt-token-chip predicted ${revealed ? 'is-visible' : ''}">${revealed ? target : '?'}</span>`;

  const weightsMatrix = ttMatrixHtml(result.attention, result.labels, result.labels, 'weights');
  const phaseContent = [
    {
      kicker: 'The challenge',
      simple: `<div class="tt-prompt"><p>The current letter is <strong>A</strong> in both <code>CA</code> and <code>BA</code>. Which <em>earlier</em> letter should decide the answer?</p></div>`,
      math: '',
      button: 'Start →',
    },
    {
      kicker: '1 · Turn each letter into numbers',
      simple: ttEmbedSimpleHtml(result),
      math: ttEmbeddingHtml(result),
      button: 'Next: look back →',
    },
    {
      kicker: '2 · Look back and pick what matters',
      simple: ttAttentionSimpleHtml(result),
      math: `${ttQueryKeyScoreHtml(result)}${weightsMatrix}`,
      button: 'Next: predict →',
    },
    {
      kicker: '3 · Predict the next letter',
      simple: ttPredictSimpleHtml(result, target, other),
      math: `${ttContextHtml(result)}${ttPredictionHtml(result, target, other)}`,
      button: 'Prediction complete',
    },
  ][phase];

  kicker.textContent = phaseContent.kicker;
  focus.innerHTML = phaseContent.simple +
    (showMath && phaseContent.math
      ? `<div class="tt-math-detail"><span class="tt-math-detail-label">Under the hood</span>${phaseContent.math}</div>`
      : '');
  step.textContent = phaseContent.button;
  step.disabled = phase >= 3;
  count.textContent = `step ${phase} / 3`;

  const candidates = [
    { token: target, probability: result.probabilities[TT_TOKENS.indexOf(target)], winner: revealed },
    { token: other, probability: result.probabilities[TT_TOKENS.indexOf(other)], winner: false },
  ];
  probabilities.innerHTML = candidates.map(item => {
    const pct = item.probability * 100;
    return `
      <div class="tt-prob-row ${item.winner ? 'winner' : ''}">
        <span class="tt-prob-token">${item.token}</span>
        <span class="tt-prob-track"><span class="tt-prob-fill" style="width:${revealed ? Math.max(1, pct) : 0}%"></span></span>
        <span class="tt-prob-value">${revealed ? pct.toFixed(1) + '%' : '—'}</span>
      </div>`;
  }).join('');
}

function stepToyTransformer() {
  TT_STATE.phase = Math.min(3, TT_STATE.phase + 1);
  refreshToyTransformer();
}
function resetToyTransformer() {
  TT_STATE.phase = 0;
  refreshToyTransformer();
}
function wireToyTransformer() {
  const root = document.getElementById('toy-transformer');
  if (!root || root.dataset.wired) return;
  root.dataset.wired = '1';
  root.addEventListener('click', event => {
    const prefix = event.target.closest('[data-prefix]');
    if (prefix) {
      TT_STATE.prefix = prefix.dataset.prefix;
      TT_STATE.phase = 0;
      refreshToyTransformer();
      return;
    }
    if (event.target.closest('#tt-step')) stepToyTransformer();
    if (event.target.closest('#tt-reset')) resetToyTransformer();
  });
  root.addEventListener('change', event => {
    if (event.target.id === 'tt-math') {
      TT_STATE.showMath = event.target.checked;
      refreshToyTransformer();
    }
  });
}

// ============================================================
//  Slide — Cosmic scale zoom: toy model → frontier scale
//  "Powers of Ten" style continuous zoom. Each model is a glowing orb
//  whose radius is proportional to its parameter count; the camera zooms
//  out so each model fills the view in turn while earlier ones shrink to
//  specks at the centre — the way planet→star→galaxy videos convey scale.
// ============================================================
let ZOOM_ANIM = null;

const ZOOM_MODELS = [
  { name: 'Our toy transformer', params: 42,     year: 'this talk', color: [91, 233, 185] },
  { name: 'GPT-1',               params: 117e6,  year: '2018',      color: [122, 217, 229] },
  { name: 'GPT-2',               params: 1.5e9,  year: '2019',      color: [122, 217, 229] },
  { name: 'GPT-3',               params: 175e9,  year: '2020',      color: [181, 151, 240] },
  { name: 'Llama 3.1 405B',      params: 405e9,  year: '2024',      color: [242, 182, 90] },
  { name: 'Llama 4 Behemoth',    params: 2e12,   year: '2025',      color: [240, 138, 138], holdMs: 10000 },
  { name: "Today's frontier",    params: 1.2e13, year: '2025–26',   color: [190, 200, 255], undisclosed: true },
];
const ZOOM_LAST_KNOWN = 2e12;   // largest model with a published count (Llama 4)

function zoomFmt(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(n < 1e13 ? 1 : 0) + ' trillion';
  if (n >= 1e9)  return (n / 1e9).toFixed(n < 1e10 ? 1 : 0) + ' billion';
  if (n >= 1e6)  return (n / 1e6).toFixed(n < 1e7 ? 1 : 0) + ' million';
  if (n >= 1e3)  return (n / 1e3).toFixed(1) + ' thousand';
  return Math.round(n).toString();
}
function zoomFmtMult(x) {
  if (x >= 1e12) return '×' + (x / 1e12).toFixed(1) + ' trillion';
  if (x >= 1e9)  return '×' + (x / 1e9).toFixed(1) + ' billion';
  if (x >= 1e6)  return '×' + (x / 1e6).toFixed(1) + ' million';
  if (x >= 1e3)  return '×' + (x / 1e3).toFixed(0) + ' thousand';
  if (x >= 100)  return '×' + Math.round(x);
  return '×' + x.toFixed(1);
}
function zoomStar(i, W, H) {
  const rand = s => (((Math.sin(s) * 43758.5453) % 1) + 1) % 1;
  return { x: rand(i * 12.9898) * W, y: rand(i * 78.233) * H, r: rand(i * 3.17) * 1.0 + 0.25 };
}
function zoomRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Lazily build a small, deterministic node/edge "web" (unit-disk coords) per model
// so each orb has a subtle neural texture that scales with it.
function zoomWeb(i) {
  const m = ZOOM_MODELS[i];
  if (m._web) return m._web;
  const N = Math.round(12 + i * i * 13);   // super-linear: big models form a dense cloud
  const rng = zoomRng(i * 99991 + 17);
  const GA = Math.PI * (3 - Math.sqrt(5));
  const nodes = [];
  for (let k = 0; k < N; k++) {
    const rr = 0.86 * Math.sqrt((k + 0.5) / N);
    const ang = k * GA + (rng() - 0.5) * 0.6;
    nodes.push({ x: Math.cos(ang) * rr, y: Math.sin(ang) * rr, hub: rng() < 0.16 });
  }
  const seen = new Set();
  const edges = [];
  for (let a = 0; a < N; a++) {
    let d1 = Infinity, i1 = -1, d2 = Infinity, i2 = -1;
    for (let b = 0; b < N; b++) {
      if (b === a) continue;
      const dx = nodes[a].x - nodes[b].x, dy = nodes[a].y - nodes[b].y;
      const d = dx * dx + dy * dy;
      if (d < d1) { d2 = d1; i2 = i1; d1 = d; i1 = b; }
      else if (d < d2) { d2 = d; i2 = b; }
    }
    for (const b of [i1, i2]) {
      if (b < 0) continue;
      const key = a < b ? a + ',' + b : b + ',' + a;
      if (!seen.has(key)) { seen.add(key); edges.push([a, b]); }
    }
  }
  m._web = { nodes, edges };
  return m._web;
}
// Cached soft radial "glow" sprite per colour so nodes can be drawn additively
// (overlapping glows bloom into a luminous cloud) without per-frame gradients.
const ZOOM_GLOW_CACHE = {};
function zoomGlow(color) {
  const key = color.join(',');
  if (ZOOM_GLOW_CACHE[key]) return ZOOM_GLOW_CACHE[key];
  const S = 32, c = document.createElement('canvas');
  c.width = S; c.height = S;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grd.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},0.95)`);
  grd.addColorStop(0.32, `rgba(${color[0]},${color[1]},${color[2]},0.42)`);
  grd.addColorStop(1, `rgba(${color[0]},${color[1]},${color[2]},0)`);
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  ZOOM_GLOW_CACHE[key] = c;
  return c;
}

// Draw one full frame of the scene for a given zoom level (worldScale = px per param).
// Returns the index of the "featured" model so callers can update the caption.
function zoomScene(ctx, W, H, TARGET_R, worldScale, elapsed) {
  const cx = W / 2, cy = H / 2, minDim = Math.min(W, H);
  const scaleParams = TARGET_R / worldScale;   // param count that fills the view right now

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#06080F';
  ctx.fillRect(0, 0, W, H);

  // drifting starfield
  for (let i = 0; i < 220; i++) {
    const s = zoomStar(i, W, H);
    const a = 0.28 + 0.32 * Math.sin(elapsed * 0.002 + i);
    ctx.fillStyle = `rgba(150,190,220,${Math.max(0.06, a).toFixed(2)})`;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
  }

  // featured model = nearest in log space to the current scale
  let featured = 0, bestD = Infinity;
  for (let i = 0; i < ZOOM_MODELS.length; i++) {
    const d = Math.abs(Math.log(ZOOM_MODELS[i].params) - Math.log(scaleParams));
    if (d < bestD) { bestD = d; featured = i; }
  }

  // orbs, largest first so tiny "history" specks render on top
  ctx.globalCompositeOperation = 'lighter';
  for (let i = ZOOM_MODELS.length - 1; i >= 0; i--) {
    const m = ZOOM_MODELS[i];
    const [cr, cg, cb] = m.color;
    const sr = m.params * worldScale;   // on-screen radius, px

    if (sr > minDim * 2.2) {
      // too big to show as a ring — a looming next model tints the whole view
      if (m.params < scaleParams * 80) {
        ctx.fillStyle = `rgba(${cr},${cg},${cb},0.05)`;
        ctx.fillRect(0, 0, W, H);
      }
      continue;
    }
    if (sr < 1) {
      // already passed — a bright speck of "history" at the centre
      ctx.fillStyle = `rgba(${cr},${cg},${cb},0.85)`;
      ctx.beginPath(); ctx.arc(cx, cy, 1.4, 0, Math.PI * 2); ctx.fill();
      continue;
    }

    const focus = Math.exp(-Math.pow(Math.log(m.params) - Math.log(scaleParams), 2) / 0.9);
    if (m.undisclosed) {
      // hazy "nebula" for the undisclosed frontier — no crisp edge, dashed ring
      const neb = ctx.createRadialGradient(cx, cy, 0, cx, cy, sr);
      neb.addColorStop(0, `rgba(${cr},${cg},${cb},${(0.06 + 0.08 * focus).toFixed(3)})`);
      neb.addColorStop(0.6, `rgba(${cr},${cg},${cb},${(0.04 + 0.06 * focus).toFixed(3)})`);
      neb.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.fillStyle = neb;
      ctx.beginPath(); ctx.arc(cx, cy, sr, 0, Math.PI * 2); ctx.fill();
      ctx.setLineDash([7, 9]);
      ctx.lineWidth = 1 + 1.2 * focus;
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${(0.20 + 0.40 * focus).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(cx, cy, sr, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      continue;
    }
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, sr);
    glow.addColorStop(0, `rgba(${cr},${cg},${cb},${(0.09 + 0.11 * focus).toFixed(3)})`);
    glow.addColorStop(0.72, `rgba(${cr},${cg},${cb},${(0.04 + 0.07 * focus).toFixed(3)})`);
    glow.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, sr, 0, Math.PI * 2); ctx.fill();

    ctx.lineWidth = 1 + 1.8 * focus;
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},${(0.30 + 0.55 * focus).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(cx, cy, sr, 0, Math.PI * 2); ctx.stroke();

    if (sr < 7) {
      ctx.fillStyle = `rgba(${cr},${cg},${cb},0.9)`;
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(1.2, sr * 0.7), 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalCompositeOperation = 'source-over';

  // internal "neural web" texture on prominent orbs — fades with focus so the
  // scene never gets busy; only the model currently near screen-fill shows it.
  for (let i = 0; i < ZOOM_MODELS.length; i++) {
    const m = ZOOM_MODELS[i];
    const sr = m.params * worldScale;
    if (sr < 48 || sr > minDim * 1.7) continue;
    const focus = Math.exp(-Math.pow(Math.log(m.params) - Math.log(scaleParams), 2) / 0.9);
    if (focus < 0.14) continue;
    const [cr, cg, cb] = m.color;
    const web = zoomWeb(i);
    const a = Math.min(1, focus);
    const dens = web.nodes.length;
    const nodeR = Math.max(0.7, 1.35 - dens * 0.0016);   // shrink dots as the cloud thickens
    // faint mesh of connections (fades as density rises so it doesn't clutter)
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},${(0.15 * a * Math.max(0.45, 1 - dens * 0.0012)).toFixed(3)})`;
    ctx.beginPath();
    for (const [p, q] of web.edges) {
      const n1 = web.nodes[p], n2 = web.nodes[q];
      ctx.moveTo(cx + n1.x * sr, cy + n1.y * sr);
      ctx.lineTo(cx + n2.x * sr, cy + n2.y * sr);
    }
    ctx.stroke();
    // nodes drawn as additive glow sprites so dense clusters bloom into a cloud
    ctx.globalCompositeOperation = 'lighter';
    const glowSprite = zoomGlow(m.color);
    const warmSprite = zoomGlow([255, 214, 150]);
    const gN = Math.max(5, nodeR * 7);       // glow diameter, normal nodes
    const gH = Math.max(9, nodeR * 12);      // glow diameter, hub nodes
    for (const nd of web.nodes) {
      const nx = cx + nd.x * sr, ny = cy + nd.y * sr;
      if (nd.hub) {
        ctx.globalAlpha = 0.55 * a;
        ctx.drawImage(warmSprite, nx - gH / 2, ny - gH / 2, gH, gH);
      } else {
        ctx.globalAlpha = 0.36 * a;
        ctx.drawImage(glowSprite, nx - gN / 2, ny - gN / 2, gN, gN);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // HUD (top-left)
  const undisclosedNow = scaleParams > ZOOM_LAST_KNOWN * 1.1;
  const m = undisclosedNow ? ZOOM_MODELS[ZOOM_MODELS.length - 1] : ZOOM_MODELS[featured];
  const [cr, cg, cb] = m.color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#E6EDF3';
  ctx.font = '700 34px "Inter", system-ui, sans-serif';
  ctx.fillText(undisclosedNow ? '?  parameters' : zoomFmt(scaleParams) + ' parameters', 26, 50);
  ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
  ctx.font = '600 21px "Inter", system-ui, sans-serif';
  ctx.fillText(m.name + (m.year ? '   ·   ' + m.year : ''), 26, 82);
  ctx.fillStyle = 'rgba(230,237,243,0.75)';
  ctx.font = '500 15px "JetBrains Mono", monospace';
  if (undisclosedNow) {
    ctx.fillText('Claude · GPT-5 · Gemini — size undisclosed', 26, 108);
  } else if (featured > 0) {
    ctx.fillText(zoomFmtMult(m.params / ZOOM_MODELS[0].params) + ' the size of our toy model', 26, 108);
  }
  ctx.shadowBlur = 0;

  const cap = document.getElementById('zoom-caption');
  if (cap) {
    cap.textContent = undisclosedNow
      ? `${m.name} · ${m.year} — parameter count undisclosed (Claude, GPT-5, Gemini…)`
      : `${m.name}${m.year ? ' · ' + m.year : ''} — ${zoomFmt(m.params)} parameters`;
  }

  return featured;
}

function startZoomOut() {
  const canvas = document.getElementById('zoom-canvas');
  if (!canvas) return;
  stopZoomOut();
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = canvas.clientWidth, H = canvas.clientHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const TARGET_R = Math.min(W, H) * 0.40;      // px radius when a model "fills" the view
  const n = ZOOM_MODELS.length;
  const logScaleFor = i => Math.log(TARGET_R / ZOOM_MODELS[i].params);

  // Timeline: dwell on each model, then zoom to the next. Equal time per hop
  // keeps a steady cadence of reveals even though the log-distances differ.
  const HOLD = 1000, ZOOM = 1700, END_EXTRA = 4000;
  const kf = [];
  let t = 0;
  kf.push([t, logScaleFor(0)]);
  t += (ZOOM_MODELS[0].holdMs || HOLD); kf.push([t, logScaleFor(0)]);
  for (let i = 1; i < n; i++) {
    t += ZOOM; kf.push([t, logScaleFor(i)]);
    t += (ZOOM_MODELS[i].holdMs || HOLD) + (i === n - 1 ? END_EXTRA : 0); kf.push([t, logScaleFor(i)]);
  }
  const TOTAL = t;
  const easeInOut = u => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
  const lsAt = tt => {
    if (tt <= kf[0][0]) return kf[0][1];
    for (let i = 1; i < kf.length; i++) {
      if (tt <= kf[i][0]) {
        const [ta, la] = kf[i - 1], [tb, lb] = kf[i];
        if (tb === ta) return lb;
        return la + (lb - la) * easeInOut((tt - ta) / (tb - ta));
      }
    }
    return kf[kf.length - 1][1];
  };

  const start = performance.now();
  function frame(now) {
    const elapsed = now - start;
    const worldScale = Math.exp(lsAt(elapsed));
    zoomScene(ctx, W, H, TARGET_R, worldScale, elapsed);
    if (elapsed < TOTAL) ZOOM_ANIM = requestAnimationFrame(frame);
    else ZOOM_ANIM = null;   // rest on the final frame
  }
  ZOOM_ANIM = requestAnimationFrame(frame);
}

function stopZoomOut() {
  if (ZOOM_ANIM) { cancelAnimationFrame(ZOOM_ANIM); ZOOM_ANIM = null; }
}

function renderZoomStatic() {
  const canvas = document.getElementById('zoom-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = canvas.clientWidth, H = canvas.clientHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const TARGET_R = Math.min(W, H) * 0.40;
  const last = ZOOM_MODELS.length - 1;
  const worldScale = TARGET_R / ZOOM_MODELS[last].params;   // final model fills the view
  zoomScene(ctx, W, H, TARGET_R, worldScale, 0);   // caption set inside zoomScene
}

// ============================================================
//  Slide 9 — Architecture diagram: hover popovers
// ============================================================
function wireArchPopovers() {
  const root = document.getElementById('arch-diagram');
  if (!root || root.dataset.wired) return;
  root.dataset.wired = '1';
  const pop = root.querySelector('.arch-pop');
  if (!pop) return;
  pop.id = 'arch-popover';
  pop.setAttribute('role', 'status');
  pop.setAttribute('aria-live', 'polite');
  let pinned = null;
  const show = el => {
      const txt = el.getAttribute('data-arch-info');
      const title = el.getAttribute('data-arch-title') || '';
      pop.innerHTML = `<div class="arch-pop-title">${title}</div><div class="arch-pop-body">${txt}</div>`;
      pop.classList.add('is-on');
  };
  const hide = () => {
    if (!pinned) pop.classList.remove('is-on');
  };
  root.querySelectorAll('[data-arch-info]').forEach(el => {
    const title = el.getAttribute('data-arch-title') || 'Architecture component';
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `${title}. Press Enter for details.`);
    el.setAttribute('aria-controls', 'arch-popover');
    el.setAttribute('aria-pressed', 'false');
    el.addEventListener('mouseenter', () => show(el));
    el.addEventListener('mouseleave', hide);
    el.addEventListener('focus', () => show(el));
    el.addEventListener('blur', hide);
    el.addEventListener('click', () => {
      if (pinned === el) {
        pinned = null;
        el.setAttribute('aria-pressed', 'false');
        pop.classList.remove('is-on');
      } else {
        if (pinned) pinned.setAttribute('aria-pressed', 'false');
        pinned = el;
        el.setAttribute('aria-pressed', 'true');
        show(el);
      }
    });
    el.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      } else if (event.key === 'Escape') {
        pinned = null;
        el.setAttribute('aria-pressed', 'false');
        pop.classList.remove('is-on');
        el.blur();
      }
    });
  });
}

// ============================================================
//  Slide 12 — AI is good at code: SWE-bench timeline chart
// ============================================================
function renderSWEBench() {
  const canvas = document.getElementById('swebench-chart');
  if (!canvas || CHARTS.swebench) return;
  const data = {
    labels: CLAIMS.sweBenchVerified.labels,
    datasets: [
      {
        label: 'Selected SWE-bench Verified systems (% solved)',
        data: CLAIMS.sweBenchVerified.values,
        borderColor: '#5BE9B9',
        backgroundColor: 'rgba(91,233,185,0.18)',
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#5BE9B9',
        pointRadius: 5,
      }
    ]
  };
  CHARTS.swebench = new Chart(canvas, {
    type: 'line',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true },
        tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y}% of Verified tasks resolved` } }
      },
      scales: {
        y: { min: 0, max: 100, ticks: { callback: v => v + '%' }, grid: { color: '#1B2236' } },
        x: { grid: { color: '#1B2236' } }
      }
    }
  });
}

// ============================================================
//  Slide 17 — Hollowing-out: employment-by-age bar chart
// ============================================================
function renderHollowing() {
  const canvas = document.getElementById('hollow-chart');
  if (!canvas || CHARTS.hollow) return;
  // Stanford "Canaries in the Coal Mine" — relative employment change in
  // highly AI-exposed occupations after firm-level controls (2022-2025).
  CHARTS.hollow = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: CLAIMS.earlyCareerEmployment.labels,
      datasets: [{
        label: 'Relative employment change (%)',
        data: CLAIMS.earlyCareerEmployment.values,
        backgroundColor: ['#F08A8A', '#7AD9E5'],
        minBarLength: 8,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ctx.dataIndex === 1 ? 'Broadly stable (approximately 0%)' : `${ctx.parsed.y}% relative change`,
          },
        },
      },
      scales: {
        y: { ticks: { callback: v => (v > 0 ? '+' : '') + v + '%' }, grid: { color: '#1B2236' } },
        x: { grid: { display: false } }
      }
    }
  });
}

// ============================================================
//  Slide 19 — Energy slider
// ============================================================
const ENERGY_DEFAULTS = CLAIMS.energy;
function renderEnergy() {
  const root = document.getElementById('energy-widget');
  if (!root || root.dataset.built) return;
  root.dataset.built = '1';
  root.innerHTML = `
    <div class="field">
      <label for="en-tokens">Daily ChatGPT-class queries (millions) <span class="val" id="en-val">${ENERGY_DEFAULTS.defaultQueriesMillions.toLocaleString()}</span></label>
      <input type="range" id="en-tokens" min="10" max="5000" step="10" value="${ENERGY_DEFAULTS.defaultQueriesMillions}" aria-describedby="en-scope">
      <div class="en-tick small muted" id="en-scope" style="margin-top:0.3em;">Default = 2.5 billion prompts/day, reported July 2025. The estimate below covers inference compute only.</div>
    </div>
    <div class="stat-row mt-2">
      <div class="stat"><div class="stat-label">Energy / day</div><div class="stat-value phos" id="en-kwh">—</div></div>
      <div class="stat"><div class="stat-label">Equivalent household-days</div><div class="stat-value amber" id="en-homes">—</div></div>
      <div class="stat"><div class="stat-label">Electric cars fully charged</div><div class="stat-value cyan" id="en-cars">—</div></div>
      <div class="stat"><div class="stat-label">CO₂-equivalent / day (U.S. avg)</div><div class="stat-value rose" id="en-co2">—</div></div>
    </div>
    <p class="small muted mt-2">Assumptions: 0.3 Wh/query · 30 kWh/U.S. household-day · 70 kWh/EV full charge · 0.35 kg CO₂e/kWh. Cooling, networking, idle capacity, training, and non-U.S. grids are excluded.</p>`;
  computeEnergy();
}
function computeEnergy() {
  const root = document.getElementById('energy-widget'); if (!root) return;
  const m = parseFloat(document.getElementById('en-tokens').value) || 0;
  document.getElementById('en-val').textContent = m.toLocaleString();
  const kwhPerDay = (m * 1e6) * (ENERGY_DEFAULTS.wattHoursPerQuery / 1000);
  const homes = kwhPerDay / ENERGY_DEFAULTS.householdKwhPerDay;
  const cars = kwhPerDay / 70;
  const co2 = kwhPerDay * ENERGY_DEFAULTS.kilogramsCo2ePerKwh;
  document.getElementById('en-kwh').textContent  = fmtSI(kwhPerDay) + ' kWh';
  document.getElementById('en-homes').textContent = fmtSI(homes);
  document.getElementById('en-cars').textContent = fmtSI(cars);
  document.getElementById('en-co2').textContent  = fmtSI(co2) + ' kg';
}
function wireEnergy() {
  const root = document.getElementById('energy-widget'); if (!root) return;
  root.addEventListener('input', computeEnergy);
}
function fmtSI(n) {
  if (n >= 1e9) return (n/1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n/1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n/1e3).toFixed(1) + 'K';
  return Math.round(n).toLocaleString();
}

// ============================================================
//  Slide 20 — Wealth: dropdown comparing AI capex/mcap to countries
// ============================================================
const WEALTH_ITEMS = CLAIMS.capitalScale;
function renderWealth() {
  const root = document.getElementById('wealth-widget');
  if (!root || root.dataset.built) return;
  root.dataset.built = '1';
  root.innerHTML = `
    <div class="w-pills" id="w-pills">
      ${WEALTH_ITEMS.map((it, i) => `
        <button class="w-pill ${i === 0 ? 'is-active' : ''}" type="button" data-id="${it.id}">
          <span class="w-pill-label">${it.label}</span>
          <span class="w-pill-value">${it.displayValue || '$' + fmtUSD(it.usd)}</span>
        </button>`).join('')}
    </div>
    <div class="stat-row mt-2">
      <div class="stat"><div class="stat-label">Value</div><div class="stat-value amber" id="w-val">—</div></div>
      <div class="stat"><div class="stat-label">What this number measures</div><div class="stat-value phos" id="w-kind">—</div></div>
    </div>
    <p class="small muted mt-2" id="w-desc">—</p>`;
  WEALTH_STATE.pick = WEALTH_ITEMS[0].id;
  computeWealth();
}
const WEALTH_STATE = { pick: null, timer: null, idx: 0 };
function computeWealth() {
  const root = document.getElementById('wealth-widget'); if (!root) return;
  const pick = WEALTH_STATE.pick;
  const it = WEALTH_ITEMS.find(x => x.id === pick); if (!it) return;
  document.getElementById('w-val').textContent = it.displayValue || ('$' + fmtUSD(it.usd));
  document.getElementById('w-kind').textContent = it.kind;
  document.getElementById('w-desc').textContent = `${it.desc} · As of: ${it.asOf}.`;
  // sync active pill
  document.querySelectorAll('#w-pills .w-pill').forEach(p => {
    p.classList.toggle('is-active', p.dataset.id === pick);
  });
}
function wireWealth() {
  const root = document.getElementById('wealth-widget'); if (!root || root.dataset.wired) return;
  root.dataset.wired = '1';
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('.w-pill'); if (!btn) return;
    // user clicked → switch + restart auto-cycle from current position
    WEALTH_STATE.pick = btn.dataset.id;
    WEALTH_STATE.idx = WEALTH_ITEMS.findIndex(x => x.id === btn.dataset.id);
    computeWealth();
    restartWealthAutoCycle();
  });
}
function startWealthAutoCycle() {
  stopWealthAutoCycle();
  WEALTH_STATE.timer = setInterval(() => {
    WEALTH_STATE.idx = (WEALTH_STATE.idx + 1) % WEALTH_ITEMS.length;
    WEALTH_STATE.pick = WEALTH_ITEMS[WEALTH_STATE.idx].id;
    computeWealth();
  }, 6500);
}
function stopWealthAutoCycle() {
  if (WEALTH_STATE.timer) { clearInterval(WEALTH_STATE.timer); WEALTH_STATE.timer = null; }
}
function restartWealthAutoCycle() {
  if (WEALTH_STATE.timer) { stopWealthAutoCycle(); startWealthAutoCycle(); }
}
function fmtUSD(n) {
  if (n >= 1e12) return (n/1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return (n/1e9).toFixed(0)  + 'B';
  if (n >= 1e6)  return (n/1e6).toFixed(0)  + 'M';
  return n.toLocaleString();
}

// ============================================================
//  Orchestration
// ============================================================
function renderAllWidgets() {
  safe('matrix-bg',      spawnMatrixBackdrop);
  safe('mood-mixer',     renderMoodMixer);
  safe('matmul',         renderMatmul);
  safe('toy-transformer',renderToyTransformer);
  safe('swebench',       renderSWEBench);
  safe('hollow',         renderHollowing);
  safe('energy',         renderEnergy);
  safe('wealth',         renderWealth);
}
function wireWidgetInputs() {
  safe('wire mood',      wireMoodMixer);
  safe('wire matmul',    wireMatmul);
  safe('wire toy',       wireToyTransformer);
  safe('wire energy',    wireEnergy);
  safe('wire wealth',    wireWealth);
  safe('arch popovers',  wireArchPopovers);
}
function refitWidgets() {
  try { CHARTS.swebench && CHARTS.swebench.resize(); } catch {}
  try { CHARTS.hollow && CHARTS.hollow.resize(); } catch {}
}
function safe(name, fn) {
  try { fn(); } catch (e) { console.warn(`[widget:${name}]`, e); }
}

// ============================================================
//  Slide 10 — Agent loop: cycle nodes + populate event log
// ============================================================
let AL_CYCLE = null, AL_LOG_TIMER = null;
const AGENT_LOOP_LINES = [
  { cls: 'l-think', txt: '[think] User wants last quarter\'s revenue trend.' },
  { cls: 'l-act',   txt: '[act ] call get_financials(quarter="Q2 2026")' },
  { cls: 'l-obs',   txt: '[obs ] → $4.2B revenue, +12% YoY' },
  { cls: 'l-think', txt: '[think] Need a comparison chart.' },
  { cls: 'l-act',   txt: '[act ] call render_chart(data=…, type="line")' },
  { cls: 'l-obs',   txt: '[obs ] → chart.png saved' },
  { cls: 'l-think', txt: '[think] Draft answer with chart attached.' },
  { cls: 'l-act',   txt: '[act ] reply(text=…, attachment=chart.png)' },
  { cls: 'l-obs',   txt: '[obs ] ✓ Done.' },
];
function startAgentLoopAnim() {
  stopAgentLoopAnim();
  const stepIds  = ['al-think', 'al-act', 'al-obs', 'al-repeat'];
  const arrowIds = ['al-arr-0', 'al-arr-1', 'al-arr-2', 'al-arr-3'];
  let i = 0;
  function tick() {
    stepIds.forEach((id, idx) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('is-active', idx === i);
    });
    arrowIds.forEach((id, idx) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('is-active', idx === i);
    });
    i = (i + 1) % stepIds.length;
  }
  tick();
  AL_CYCLE = setInterval(tick, 1200);

  // Populate log lines progressively so the right panel "writes itself."
  const log = document.getElementById('al-log');
  if (log) {
    log.innerHTML = '';
    let j = 0;
    function next() {
      if (j >= AGENT_LOOP_LINES.length) { AL_LOG_TIMER = null; return; }
      const ln = AGENT_LOOP_LINES[j];
      const div = document.createElement('div');
      div.className = `l-line ${ln.cls}`;
      div.textContent = ln.txt;
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
      j++;
      AL_LOG_TIMER = setTimeout(next, 650);
    }
    next();
  }
}
function stopAgentLoopAnim() {
  if (AL_CYCLE) { clearInterval(AL_CYCLE); AL_CYCLE = null; }
  if (AL_LOG_TIMER) { clearTimeout(AL_LOG_TIMER); AL_LOG_TIMER = null; }
}
function showAgentLoopStatic() {
  const log = document.getElementById('al-log');
  if (!log) return;
  log.innerHTML = AGENT_LOOP_LINES.map(line => `<div class="l-line ${line.cls}" style="opacity:1">${line.txt}</div>`).join('');
  document.querySelectorAll('.al-node, .al-arrow').forEach(element => element.classList.remove('is-active'));
}

// ============================================================
//  Slide 14 — Agent "typing" animation + synchronised IDE pane
// ============================================================
let TT_TYPING_ANIM = null;
let TT_IDE_TIMERS = [];
// After the demo finishes, wait this long before replaying it so the audience
// can digest what happened — then loop so latecomers can watch it again.
const TOOL_TYPING_LOOP_DELAY = 10000;

// Files the IDE pane can show.  Each line is an array of [class, text] tokens
// so we can do simple syntax highlighting without a real parser.
const IDE_FILES = {
  routes: {
    path: 'src/routes.ts',
    initial: [
      [['k','import'], ['n',' { '], ['n','Router'], ['n',' } '], ['k','from'], ['s'," 'express'"], ['p',';']],
      [['k','export const'], ['n',' router'], ['n',' = '], ['f','Router'], ['p','()'], ['p',';']],
      [],
      [['n','router.'], ['f','get'], ['p','('], ['s',"'/users'"], ['p',', '], ['n','getUsers'], ['p',');']],
      [['n','router.'], ['f','post'], ['p','('], ['s',"'/users'"], ['p',', '], ['n','createUser'], ['p',');']],
      [['n','router.'], ['f','get'], ['p','('], ['s',"'/items'"], ['p',', '], ['n','getItems'], ['p',');']],
      [['n','router.'], ['f','post'], ['p','('], ['s',"'/items'"], ['p',', '], ['n','createItem'], ['p',');']],
    ],
    // Lines to APPEND when the agent edits the file.
    added: [
      [],
      [['n','router.'], ['f','get'], ['p','('], ['s',"'/health'"], ['p',', '], ['p','('], ['n','req'], ['p',', '], ['n','res'], ['p',') => {']],
      [['n','  res.'], ['f','json'], ['p','({']],
      [['n','    status: '], ['s',"'ok'"], ['p',',']],
      [['n','    uptime: '], ['n','process.'], ['f','uptime'], ['p','(),']],
      [['n','  });']],
      [['p','});']],
    ],
  },
  test: {
    path: 'test/health.test.ts',
    initial: [],
    added: [
      [['k','import'], ['n',' request '], ['k','from'], ['s'," 'supertest'"], ['p',';']],
      [['k','import'], ['n',' { '], ['n','app'], ['n',' } '], ['k','from'], ['s'," '../src/app'"], ['p',';']],
      [],
      [['f','describe'], ['p','('], ['s',"'GET /health'"], ['p',', () => {']],
      [['n','  '], ['f','it'], ['p','('], ['s',"'returns 200'"], ['p',', '], ['k','async'], ['p',' () => {']],
      [['n','    '], ['k','const'], ['n',' r = '], ['k','await'], ['n',' '], ['f','request'], ['p','('], ['n','app'], ['p',').'], ['f','get'], ['p','('], ['s',"'/health'"], ['p',');']],
      [['n','    '], ['f','expect'], ['p','('], ['n','r.status'], ['p',').'], ['f','toBe'], ['p','('], ['n','200'], ['p',');']],
      [['n','  });']],
      [],
      [['n','  '], ['f','it'], ['p','('], ['s',"'returns status ok'"], ['p',', '], ['k','async'], ['p',' () => {']],
      [['n','    '], ['k','const'], ['n',' r = '], ['k','await'], ['n',' '], ['f','request'], ['p','('], ['n','app'], ['p',').'], ['f','get'], ['p','('], ['s',"'/health'"], ['p',');']],
      [['n','    '], ['f','expect'], ['p','('], ['n','r.body.status'], ['p',').'], ['f','toBe'], ['p','('], ['s',"'ok'"], ['p',');']],
      [['n','  });']],
      [],
      [['n','  '], ['f','it'], ['p','('], ['s',"'returns uptime number'"], ['p',', '], ['k','async'], ['p',' () => {']],
      [['n','    '], ['k','const'], ['n',' r = '], ['k','await'], ['n',' '], ['f','request'], ['p','('], ['n','app'], ['p',').'], ['f','get'], ['p','('], ['s',"'/health'"], ['p',');']],
      [['n','    '], ['f','expect'], ['p','('], ['k','typeof'], ['n',' r.body.uptime'], ['p',').'], ['f','toBe'], ['p','('], ['s',"'number'"], ['p',');']],
      [['n','  });']],
      [['p','});']],
    ],
  },
};

// Open files registry — preserves "edit" state so re-opening a tab shows
// already-added lines.
let IDE_STATE = null;

function ideTokensToHTML(tokens) {
  if (!tokens || !tokens.length) return '&nbsp;';
  return tokens.map(([cls, txt]) => `<span class="${cls}">${txt.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</span>`).join('');
}

function ideRender() {
  const code = document.getElementById('ide-code');
  const tabs = document.getElementById('ide-tabs');
  const title = document.getElementById('ide-title');
  if (!code || !tabs) return;
  if (!IDE_STATE.activeKey) {
    code.innerHTML = '<span class="ide-empty">(waiting for the agent…)</span>';
    tabs.innerHTML = '';
    if (title) title.textContent = 'project';
    return;
  }
  // Tabs
  tabs.innerHTML = IDE_STATE.openOrder.map(k => {
    const f = IDE_FILES[k];
    const active = (k === IDE_STATE.activeKey) ? ' is-active' : '';
    const isNew = (k === IDE_STATE.justOpened) ? ' is-new' : '';
    return `<div class="ide-tab${active}${isNew}" data-key="${k}">${f.path}</div>`;
  }).join('');
  if (title) title.textContent = IDE_FILES[IDE_STATE.activeKey].path;
  // Lines
  const f = IDE_FILES[IDE_STATE.activeKey];
  const lines = f.initial.slice();
  const addedCount = IDE_STATE.added[IDE_STATE.activeKey] || 0;
  const justAdded = IDE_STATE.justAdded[IDE_STATE.activeKey] || 0;
  const baseLen = lines.length;
  for (let i = 0; i < addedCount; i++) lines.push(f.added[i]);
  code.innerHTML = lines.map((toks, idx) => {
    let cls = 'ide-line';
    if (idx >= baseLen) {
      cls += ' is-added';
      if (idx >= lines.length - justAdded) cls += ' is-just-added';
    }
    return `<div class="${cls}">${ideTokensToHTML(toks)}</div>`;
  }).join('');
  // Scroll to bottom if we just added
  if (justAdded > 0) code.parentElement.scrollTop = code.parentElement.scrollHeight;
}

function ideSetStatus(text, kind) {
  const el = document.getElementById('ide-status');
  if (!el) return;
  el.textContent = text;
  el.classList.remove('is-pass', 'is-run');
  if (kind) el.classList.add('is-' + kind);
}

function ideResetState() {
  // Clear pending IDE timers from a prior run
  TT_IDE_TIMERS.forEach(t => clearTimeout(t));
  TT_IDE_TIMERS = [];
  IDE_STATE = { openOrder: [], activeKey: null, justOpened: null, added: {}, justAdded: {} };
  ideRender();
  ideSetStatus('ready');
}

function ideOpen(key) {
  if (!IDE_STATE.openOrder.includes(key)) {
    IDE_STATE.openOrder.push(key);
    IDE_STATE.justOpened = key;
    setTimeout(() => { if (IDE_STATE) IDE_STATE.justOpened = null; }, 500);
  }
  IDE_STATE.activeKey = key;
  IDE_STATE.added[key] = IDE_STATE.added[key] || 0;
  IDE_STATE.justAdded[key] = 0;
  ideRender();
}

// Animate adding the `added` lines of a file, one at a time.
function ideAppendAll(key, lineDelay, onDone) {
  const f = IDE_FILES[key];
  const total = f.added.length;
  let i = 0;
  function step() {
    if (i >= total) { if (onDone) onDone(); return; }
    if (!IDE_STATE) return;
    IDE_STATE.added[key] = i + 1;
    IDE_STATE.justAdded[key] = 1;
    if (IDE_STATE.activeKey === key) ideRender();
    i++;
    const t = setTimeout(step, lineDelay);
    TT_IDE_TIMERS.push(t);
  }
  step();
}

function ideRunAction(act) {
  if (!act || !IDE_STATE) return;
  const [verb, key] = act.split(':');
  if (verb === 'open') {
    ideOpen(key);
    ideSetStatus('reading ' + IDE_FILES[key].path);
  } else if (verb === 'edit') {
    ideOpen(key);
    ideSetStatus('editing ' + IDE_FILES[key].path, 'run');
    ideAppendAll(key, 130, () => ideSetStatus('saved ' + IDE_FILES[key].path));
  } else if (verb === 'create') {
    ideOpen(key);
    ideSetStatus('creating ' + IDE_FILES[key].path, 'run');
    ideAppendAll(key, 95, () => ideSetStatus('saved ' + IDE_FILES[key].path));
  } else if (verb === 'run') {
    ideSetStatus('$ npm test  →  running…', 'run');
    const t = setTimeout(() => ideSetStatus('✓ 15 passed (3 new)', 'pass'), 1400);
    TT_IDE_TIMERS.push(t);
  }
}

function startToolTypingAnim() {
  const pre = document.getElementById('tool-typing-pre');
  if (!pre) return;
  stopToolTypingAnim();
  ideResetState();
  // Stash original spans the first time so resets work.
  if (!pre.dataset.original) pre.dataset.original = pre.innerHTML;
  const original = pre.dataset.original;
  // Tokenise by top-level <span>…</span> + newlines so we reveal one chunk
  // at a time.  Simple regex is enough for our hand-authored markup.
  const re = /(<span[^>]*>[\s\S]*?<\/span>|\n)/g;
  const chunks = original.match(re) || [original];
  pre.innerHTML = '';
  let i = 0;
  function tick() {
    if (i >= chunks.length) {
      // Loop the demo: pause so the audience can digest, then replay from the
      // top. Reuse TT_TYPING_ANIM so stopToolTypingAnim() cancels a pending
      // replay when the slide is left or animations are paused.
      TT_TYPING_ANIM = setTimeout(() => {
        if (PRESENTATION_ANIMATIONS_PAUSED) { TT_TYPING_ANIM = null; return; }
        startToolTypingAnim();
      }, TOOL_TYPING_LOOP_DELAY);
      return;
    }
    const chunk = chunks[i];
    pre.innerHTML += chunk;
    i++;
    // After inserting, find the last tool span and apply highlight + IDE action.
    const lastSpan = pre.querySelector('span.tool:last-of-type, span.tool-out:last-of-type, span.ai:last-of-type');
    // Active-tool highlight: only one tool line at a time.
    pre.querySelectorAll('span.tool.is-active').forEach(el => el.classList.remove('is-active'));
    if (chunk.includes('class="tool"')) {
      const tools = pre.querySelectorAll('span.tool');
      const last = tools[tools.length - 1];
      if (last) {
        last.classList.add('is-active');
        const act = last.getAttribute('data-act');
        if (act) ideRunAction(act);
      }
    }
    // Vary cadence: tool actions get longer pause so the IDE can animate.
    let delay = 65;
    if (chunk.includes('class="ai"')) delay = 450;
    else if (chunk.includes('class="tool-out"')) delay = 320;
    else if (chunk.includes('data-act="edit')) delay = 1300;
    else if (chunk.includes('data-act="create')) delay = 2200;
    else if (chunk.includes('data-act="run')) delay = 1700;
    else if (chunk.includes('class="tool"')) delay = 700;
    else if (chunk === '\n') delay = 90;
    TT_TYPING_ANIM = setTimeout(tick, delay);
  }
  tick();
}
function stopToolTypingAnim() {
  if (TT_TYPING_ANIM) { clearTimeout(TT_TYPING_ANIM); TT_TYPING_ANIM = null; }
  TT_IDE_TIMERS.forEach(t => clearTimeout(t));
  TT_IDE_TIMERS = [];
}

// ============================================================
//  Slide 15 — MCP spoke auto-highlight cycle
// ============================================================
let MCP_CYCLE = null;
function startMcpAutoCycle() {
  const root = document.querySelector('.mcp-hub');
  if (!root) return;
  stopMcpAutoCycle();
  const spokes = root.querySelectorAll('.mcp-spoke');
  const edges  = root.querySelectorAll('.mcp-edge');
  if (!spokes.length) return;
  let i = 0;
  function tick() {
    spokes.forEach((el, idx) => el.classList.toggle('is-active', idx === i));
    edges.forEach((el, idx) => el.classList.toggle('is-active', idx === i));
    i = (i + 1) % spokes.length;
  }
  tick();
  MCP_CYCLE = setInterval(tick, 1500);
}
function stopMcpAutoCycle() {
  if (MCP_CYCLE) { clearInterval(MCP_CYCLE); MCP_CYCLE = null; }
}

// per-slide hooks
function onSlideChange(e) {
  const slide = e && e.currentSlide;
  refitWidgets();
  // Title-slide backdrop: re-spawn if it lost its container after navigation back
  if (!PRESENTATION_ANIMATIONS_PAUSED) spawnMatrixBackdrop();
  // Slide 4: scratch-out animation plays AUTOMATICALLY on slide entry.
  // Reset (to restart from frame 0 even if revisited), then schedule the play
  // on the next frame so the reset's reflow lands first.
  if (slide && slide.querySelector('.linalg-review')) {
    resetReviewScratch();
    requestAnimationFrame(() => requestAnimationFrame(playReviewScratch));
  }
  // Slide 7: zoom-out — only run when on that slide
  if (slide && slide.querySelector('#zoom-canvas') && !PRESENTATION_ANIMATIONS_PAUSED) {
    startZoomOut();
  } else if (slide && slide.querySelector('#zoom-canvas')) {
    renderZoomStatic();
  } else {
    stopZoomOut();
  }
  // Slide 10: agent loop animation
  if (slide && slide.querySelector('.agent-loop') && !PRESENTATION_ANIMATIONS_PAUSED) {
    startAgentLoopAnim();
  } else if (slide && slide.querySelector('.agent-loop')) {
    showAgentLoopStatic();
  } else {
    stopAgentLoopAnim();
  }
  // Slide 14: agent typing animation
  if (slide && slide.querySelector('#tool-typing-pre') && !PRESENTATION_ANIMATIONS_PAUSED) {
    startToolTypingAnim();
  } else {
    stopToolTypingAnim();
  }
  // Slide 15: MCP spoke auto-cycle
  if (slide && slide.querySelector('.mcp-hub') && !PRESENTATION_ANIMATIONS_PAUSED) {
    startMcpAutoCycle();
  } else {
    stopMcpAutoCycle();
  }
  if (slide && slide.querySelector('#wealth-widget') && !PRESENTATION_ANIMATIONS_PAUSED) {
    startWealthAutoCycle();
  } else {
    stopWealthAutoCycle();
  }
  // Auto-fit-to-slide: scale down overflowing content so nothing is cut off.
  if (slide) requestAnimationFrame(() => autoFitSlide(slide));
}

// Flag overflow instead of silently shrinking an entire slide. Uniform scaling
// made text and citations unreadable while hiding content-density regressions.
function autoFitSlide(section) {
  if (!section) return;
  const cs = getComputedStyle(section);
  const padTop = parseFloat(cs.paddingTop) || 0;
  const padBot = parseFloat(cs.paddingBottom) || 0;
  const available = (section.clientHeight || 800) - padTop - padBot;
  const contentBottom = Array.from(section.children)
    .filter(child => !['absolute', 'fixed'].includes(getComputedStyle(child).position))
    .reduce((bottom, child) => Math.max(bottom, child.offsetTop + child.offsetHeight), 0);
  section.classList.toggle('has-layout-overflow', contentBottom > padTop + available + 1);
}

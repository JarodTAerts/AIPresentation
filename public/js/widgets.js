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

      <div class="controls-actions mt-2">
        <button class="btn" id="mmx-next" data-step-btn>Next step →</button>
        <button class="btn ghost" id="mmx-reset">Reset</button>
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
      <div class="mmx-step-body">"${MM_LBL_OUT[bestIdx]}" scored highest (${finalOuts[bestIdx].toFixed(2)}). Each output is a <strong>weighted sum</strong> of all of Travis's needs — the matrix rows are the "recipes." Real neural networks do exactly this, just with millions of weights instead of nine.</div>`;
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
  if (nextBtn) nextBtn.disabled = false;
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
  inputs: [8, 3, 6],
  weights: [
    [ 0.8,  0.1, -0.2],
    [ 0.1,  0.9,  0.0],
    [-0.1,  0.0,  0.7],
  ],
};
const MOOD_LABELS_IN  = ['Hunger', 'Tired', 'Mood'];
const MOOD_LABELS_OUT = ['Eat?', 'Sleep?', 'Socialize?'];

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
            <input type="range" id="mm-in-${i}" min="0" max="10" step="1" value="${MOOD_DEFAULTS.inputs[i]}">
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
                  <td><input type="number" id="mm-w-${r}-${c}" step="0.1" value="${v}"></td>
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
          <div class="mm-out-row" id="mm-out-row-${i}">
            <div class="mm-out-label">${label}</div>
            <div class="mm-bar-wrap"><div class="mm-bar" id="mm-bar-${i}"></div></div>
            <div class="mm-out-val" id="mm-out-val-${i}">0.00</div>
          </div>`).join('')}
        </div>
        <p class="small muted mt-2" id="mm-verdict">Adjust the sliders to see Travis's next action.</p>
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
    const ACTIONS = ['eat something', 'go to sleep', 'go socialize'];
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
//  Slide 6 — Toy Transformer that spells "CAT"
// ============================================================
// 4 tokens on the unit circle as 2D embeddings:
//   START = (1, 0)        C = (0, 1)        A = (-1, 0)        T = (0, -1)
// The "next-token" weights W (4×2) are the same vectors as rows.
// At each step, score each token by dot(state, token_emb); softmax → pick max.
// Hand-traced so the sequence START → C → A → T plays out cleanly.

const TOY_TOKENS = ['START', 'C', 'A', 'T'];
const TOY_EMB = {
  START: [ 1,  0],
  C:     [ 0,  1],
  A:     [-1,  0],
  T:     [ 0, -1],
};
// A simple "rotate 90° clockwise" state-update so that:
//   state=START(1,0)   → rotate → (0,1)=C
//   state=C(0,1)       → rotate → (-1,0)=A     (actually rotate 90° CCW for that)
// We want a single, simple update; use: nextState = R · state where R rotates by -90° (clockwise).
//   R = [[0, 1], [-1, 0]]
// Trace:
//   START (1,0)  → R·s = (0, -1) = T  ❌
// Use CCW rotation: R = [[0, -1], [1, 0]]
//   (1,0) → (0,1) = C ✓
//   (0,1) → (-1,0) = A ✓
//   (-1,0) → (0,-1) = T ✓
// Row-vector convention: new_state = state · W   (state is 1×2 row, W is 2×2)
// This matches how real models think of it: the input flows IN on the left,
// the weight matrix is on the right.  W is the transpose of the column-form R.
//   [1,0] · W = [0,1] = C  → W row 0 = [0, 1]
//   [0,1] · W = [-1,0] = A → W row 1 = [-1, 0]
const TOY_W = [[0, 1], [-1, 0]];

function toyRowMatVec(v, M) {
  // Row-vector × matrix.  out[j] = sum_i v[i] * M[i][j].
  return [v[0]*M[0][0] + v[1]*M[1][0], v[0]*M[0][1] + v[1]*M[1][1]];
}
function toyDot(a, b) { return a[0]*b[0] + a[1]*b[1]; }
function toySoftmax(scores) {
  const m = Math.max(...scores);
  const exps = scores.map(s => Math.exp(s - m));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sum);
}

const TOY_STATE = { step: 0, history: ['START'], state: TOY_EMB.START.slice() };

function renderToyTransformer() {
  const root = document.getElementById('toy-transformer');
  if (!root || root.dataset.built) return;
  root.dataset.built = '1';

  root.innerHTML = `
    <div class="tt-grid">
      <div class="tt-col tt-math-col">
        <div class="tt-output">
          <div class="tt-output-label">Output so far</div>
          <div class="tt-output-text" id="tt-output">START</div>
        </div>

        <div class="tt-eq" id="tt-eq">
          <!-- The big matrix-multiplication display.  R · state = new
               Each cell is a labelled tile so the math is readable from
               the back of the room.  Built / refreshed in refreshToyTransformer. -->
        </div>

        <div class="tt-explain" id="tt-explain">Press <strong>Predict next token</strong> to multiply the matrix.</div>

        <div class="controls-actions mt-2">
          <button class="btn" id="tt-step" data-step-btn>Predict next token →</button>
          <button class="btn ghost" id="tt-reset">Reset</button>
        </div>
      </div>

      <div class="tt-col tt-vis">
        <div class="tt-circle-label">State vector lands closest to…</div>
        <svg viewBox="-205 -180 410 360" class="tt-svg" preserveAspectRatio="xMidYMid meet">
          <defs>
            <marker id="tt-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L6,3 L0,6 z" fill="#5BE9B9"/>
            </marker>
          </defs>
          <circle cx="0" cy="0" r="100" fill="none" stroke="#243049" stroke-width="1.5"/>
          <line x1="-130" y1="0" x2="130" y2="0" stroke="#1B2236" stroke-width="0.8"/>
          <line x1="0" y1="-130" x2="0" y2="130" stroke="#1B2236" stroke-width="0.8"/>
          ${TOY_TOKENS.map(tok => {
            const [x, y] = TOY_EMB[tok];
            const X = x * 100, Y = -y * 100;
            // Push each label well off the unit circle, anchored away from the dot.
            const anchor = x > 0.5 ? 'start' : (x < -0.5 ? 'end' : 'middle');
            const padX = x > 0.5 ? 18 : (x < -0.5 ? -18 : 0);
            // When token sits on the top/bottom, push label far enough off the dot
            // so both the name AND the coord-line fit clear of the circle.
            const padY = y < -0.5 ? 30 : (y > 0.5 ? -34 : 0);
            const lx = X + padX;
            const ly = Y + padY;
            const coordStr = `(${x}, ${y})`;
            return `
              <g class="tt-token" data-tok="${tok}">
                <circle cx="${X}" cy="${Y}" r="8.5" fill="#11172A" stroke="#7AD9E5" stroke-width="2"/>
                <text x="${lx}" y="${ly}" text-anchor="${anchor}" dominant-baseline="central"
                      font-family="JetBrains Mono, monospace" font-size="16" fill="#E6EDF3" font-weight="600">${tok}</text>
                <text x="${lx}" y="${ly + 18}" text-anchor="${anchor}" dominant-baseline="central"
                      font-family="JetBrains Mono, monospace" font-size="11.5" fill="#8BA0B8">${coordStr}</text>
              </g>`;
          }).join('')}
          <line id="tt-state-vec" x1="0" y1="0" x2="100" y2="0" stroke="#5BE9B9" stroke-width="4" marker-end="url(#tt-arrow)"/>
        </svg>
      </div>
    </div>`;

  refreshToyTransformer();
}

function buildToyEqHTML(prev, W, result, highlight) {
  // highlight: -1 = none, 0 = col 0 active, 1 = col 1 active, 2 = both
  // Row-vector form:  [px py] · [[a b]   = [ px*a+py*c,  px*b+py*d ]
  //                              [c d]]
  const [a, b] = W[0], [c, d] = W[1];
  const [px, py] = prev;
  const c0Hot = highlight === 0 || highlight === 2;
  const c1Hot = highlight === 1 || highlight === 2;
  const stateHot = highlight !== -1;
  const out0 = (result && result[0] !== null && result[0] !== undefined) ? result[0] : 0;
  const out1 = (result && result[1] !== null && result[1] !== undefined) ? result[1] : 0;
  return `
    <div class="tt-eq-row">
      <div class="tt-eq-label">state (input)</div>
      <div class="tt-eq-label">×</div>
      <div class="tt-eq-label">weights W</div>
      <div class="tt-eq-label">=</div>
      <div class="tt-eq-label">new state</div>
    </div>
    <div class="tt-eq-row tt-eq-vals">
      <div class="tt-vec tt-vec-row">
        <div class="tt-vec-cell ${stateHot ? 'tt-vec-hot' : ''}">${px}</div>
        <div class="tt-vec-cell ${stateHot ? 'tt-vec-hot' : ''}">${py}</div>
      </div>
      <div class="tt-op">×</div>
      <div class="tt-mat tt-mat-cols">
        <span class="model-tag floating">Model</span>
        <div class="tt-mat-row">
          <span class="tt-cell tt-mt ${c0Hot ? 'tt-col-hot' : ''}">${a}</span>
          <span class="tt-cell tt-mt ${c1Hot ? 'tt-col-hot' : ''}">${b}</span>
        </div>
        <div class="tt-mat-row">
          <span class="tt-cell tt-mt ${c0Hot ? 'tt-col-hot' : ''}">${c}</span>
          <span class="tt-cell tt-mt ${c1Hot ? 'tt-col-hot' : ''}">${d}</span>
        </div>
      </div>
      <div class="tt-op">=</div>
      <div class="tt-vec tt-vec-row">
        <div class="tt-vec-cell ${c0Hot ? 'tt-out-hot' : ''}">${out0}</div>
        <div class="tt-vec-cell ${c1Hot ? 'tt-out-hot' : ''}">${out1}</div>
      </div>
    </div>`;
}

function refreshToyTransformer(opts) {
  opts = opts || {};
  const eq = document.getElementById('tt-eq');
  if (eq) {
    const prev = TOY_STATE.prevState || TOY_EMB.START;
    eq.innerHTML = buildToyEqHTML(prev, TOY_W, opts.result || null, opts.highlight === undefined ? -1 : opts.highlight);
  }

  const expl = document.getElementById('tt-explain');
  if (expl && opts.explain !== undefined) expl.innerHTML = opts.explain;

  const state = TOY_STATE.state;
  const vec = document.getElementById('tt-state-vec');
  if (vec) {
    vec.setAttribute('x2', (state[0] * 100).toFixed(2));
    vec.setAttribute('y2', (-state[1] * 100).toFixed(2));
  }
  const out = document.getElementById('tt-output');
  if (out) out.textContent = TOY_STATE.history.join(' → ');
}

// Per-click animation: highlight col 0 → col 1 → land on token.
let TT_ANIM = null;
function stepToyTransformer() {
  // If an animation is in flight, fast-forward it to completion first,
  // then fall through to start the NEXT prediction in the same click.
  if (TT_ANIM) finishToyTransformerAnim();
  if (TOY_STATE.history.length >= 4) return;
  const prev = TOY_STATE.state.slice();
  const next = toyRowMatVec(prev, TOY_W);
  let bestTok = TOY_TOKENS[0], bestDot = -Infinity;
  for (const t of TOY_TOKENS) {
    const d = toyDot(next, TOY_EMB[t]);
    if (d > bestDot) { bestDot = d; bestTok = t; }
  }

  TOY_STATE.prevState = prev;
  const [a, b] = TOY_W[0], [c, d] = TOY_W[1];
  const [px, py] = prev;

  // Stash everything the final phase needs so we can jump to it instantly
  // if the user clicks again while the animation is still playing.
  TOY_STATE.pendingFinal = {
    next, bestTok, bestDot,
    phase1: {
      highlight: 1,
      result: [next[0], next[1]],
      explain: `Column 2 of W · state = (${px})(${b}) + (${py})(${d}) = <strong class="ph">${next[1]}</strong>`,
    },
    phase2: {
      highlight: 2,
      result: [next[0], next[1]],
      explain: `new state <strong class="ph">[${next[0]}, ${next[1]}]</strong> matches token <strong>${bestTok}</strong> (dot product = ${bestDot.toFixed(0)}).`,
    },
  };

  // Phase 0: highlight column 0 → produces out[0]
  refreshToyTransformer({
    highlight: 0,
    result: [next[0], null],
    explain: `Column 1 of W · state = (${px})(${a}) + (${py})(${c}) = <strong class="ph">${next[0]}</strong>`,
  });

  TT_ANIM = setTimeout(() => {
    // Phase 1: highlight column 1 → produces out[1]
    refreshToyTransformer(TOY_STATE.pendingFinal.phase1);

    TT_ANIM = setTimeout(() => {
      // Phase 2: commit new state, animate vector
      commitToyFinalPhase();
    }, 1800);
  }, 1800);
}

// Apply the final-commit phase of the currently-in-flight prediction
// immediately and clear any pending timeouts.
function finishToyTransformerAnim() {
  if (TT_ANIM) { clearTimeout(TT_ANIM); TT_ANIM = null; }
  if (TOY_STATE.pendingFinal) commitToyFinalPhase();
}

function commitToyFinalPhase() {
  const pf = TOY_STATE.pendingFinal;
  if (!pf) return;
  TOY_STATE.state = pf.next;
  TOY_STATE.history.push(pf.bestTok);
  refreshToyTransformer(pf.phase2);
  TOY_STATE.pendingFinal = null;
  TT_ANIM = null;
  const sb = document.getElementById('tt-step');
  if (sb) sb.disabled = (TOY_STATE.history.length >= 4);
}
function resetToyTransformer() {
  if (TT_ANIM) { clearTimeout(TT_ANIM); TT_ANIM = null; }
  TOY_STATE.step = 0;
  TOY_STATE.history = ['START'];
  TOY_STATE.state = TOY_EMB.START.slice();
  TOY_STATE.prevState = null;
  TOY_STATE.pendingFinal = null;
  const sb = document.getElementById('tt-step');
  if (sb) sb.disabled = false;
  refreshToyTransformer({ highlight: -1, explain: 'Press <strong>Predict next token</strong> to multiply the matrix.' });
}
function wireToyTransformer() {
  const root = document.getElementById('toy-transformer');
  if (!root) return;
  const step = document.getElementById('tt-step');
  const reset = document.getElementById('tt-reset');
  if (step) step.addEventListener('click', stepToyTransformer);
  if (reset) reset.addEventListener('click', resetToyTransformer);
}

// ============================================================
//  Slide 7 — Zoom-out animation: 4 dots → trillion-param galaxy
// ============================================================
let ZOOM_ANIM = null;
let ZOOM_CACHE = null;   // { canvas: HTMLCanvasElement, caption: string } — set once the animation has played far enough
let ZOOM_START = 0;
let ZOOM_CAPTION_NOW = '';
const ZOOM_CACHE_AFTER_MS = 11000;   // once past this, treat the visible animation as "done" enough to cache
function startZoomOut() {
  const canvas = document.getElementById('zoom-canvas');
  if (!canvas) return;
  stopZoomOut();
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = canvas.clientWidth, H = canvas.clientHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.scale(dpr, dpr);

  // If we've already played the animation once this session, just paint the
  // cached final frame and restore the caption — no re-animation.
  if (ZOOM_CACHE && ZOOM_CACHE.canvas) {
    ctx.drawImage(ZOOM_CACHE.canvas, 0, 0, W, H);
    const cap = document.getElementById('zoom-caption');
    if (cap && ZOOM_CACHE.caption) cap.textContent = ZOOM_CACHE.caption;
    return;
  }

  // Each particle has a *parent* index — a previously-spawned particle in roughly
  // the same neighborhood.  We draw a thin line between every particle and its
  // parent to give the "neural web" feel.  Particles are spawned in the *outer
  // ring* of the currently visible area so as we zoom out they always appear
  // along the edge — leaving a uniformly populated universe behind us.
  const parts = [];
  const ANCHORS = [
    { x:  0.6, y:  0.0 },
    { x:  0.0, y:  0.6 },
    { x: -0.6, y:  0.0 },
    { x:  0.0, y: -0.6 },
  ];
  for (const a of ANCHORS) parts.push({ x: a.x, y: a.y, hue: 0.5, anchor: true, born: 0, parent: -1 });

  // Spatial bucketing — used to find "nearby" parents quickly when we add new
  // particles to grow the web.  Keyed by quantized (x, y) in model space.
  const BUCKET_BITS = 0;  // unused — we keep track via a sliding window instead.

  const labels = [
    { t: 0.00, txt: '4 numbers — a toy "word vector"' },
    { t: 0.20, txt: 'Scale up: hundreds of dimensions' },
    { t: 0.45, txt: 'A small model: ~100 million parameters' },
    { t: 0.75, txt: 'A modern model: ~1 trillion parameters' },
  ];

  const start = performance.now();
  ZOOM_START = start;
  const ZOOM_DURATION = 11000;      // hit max zoom after 11s (slower so it reads)
  const TOTAL_DURATION = 26000;     // keep filling for ~15s after that
  const R_FINAL = 140;
  // Use the LARGER dimension so the universe fills the whole wide rectangle
  // (not just an inscribed circle).  Diagonal factor is how far past the
  // visible edge we still need to spawn to populate the corners.
  const PX_PER_VR = Math.max(W, H) / 2 * 0.98;
  const DIAG_FACTOR = Math.sqrt(W*W + H*H) / Math.max(W, H);  // ~1.12 for 2:1

  // Target population given current view.  Floor is *very* low so we don't
  // pre-seed a dense central cluster that turns into a solid blob once we
  // zoom out.  Growth is quadratic in viewRadius (area scaling).
  const MAX_PARTS = 35000;
  function targetCount(viewRadius) {
    // Effectively 0 below r≈3, then grows ~ r².
    const ramp = Math.max(0, 2.4 * (viewRadius - 3) * (viewRadius - 3));
    return Math.min(MAX_PARTS, Math.round(ramp));
  }

  // Per-frame spawn budget — generous so the web fills even on slow machines.
  const SPAWN_PER_FRAME = 520;

  function frame(now) {
    const elapsed = now - start;
    const tZoom = Math.min(1, elapsed / ZOOM_DURATION);
    // Cubic ease-in: zoom accelerates outward.
    const eased = tZoom * tZoom * tZoom;
    const viewRadius = 1 + (R_FINAL - 1) * eased;

    // Spawn budget split:
    //   60% in the outer ring (0.62..1.15·viewRadius) → "expanding edge" feel
    //   40% uniformly across the whole disk via sqrt-area sampling so density
    //       stays constant everywhere and we DON'T leave a dark donut hole
    //       around the original 4 anchor particles.
    // The earlier "central blob" bug was caused by a non-zero targetCount
    // *floor* (180 particles dumped into a tiny radius before zoom started).
    // That floor is gone now, so backfilling the centre is safe.
    const target = targetCount(viewRadius);
    const need = Math.min(SPAWN_PER_FRAME, target - parts.length);
    const ringInner = viewRadius * 0.62;
    const ringOuter = viewRadius * 1.15;
    const fillOuter = viewRadius * 0.95;
    for (let i = 0; i < need; i++) {
      let r;
      if (Math.random() < 0.60) {
        // outer ring — uniform area inside the annulus
        r = Math.sqrt(ringInner*ringInner + Math.random() * (ringOuter*ringOuter - ringInner*ringInner));
      } else {
        // uniform across the whole visible disk (sqrt = constant area density).
        // Skip the tiny inner core so the 4 anchor particles stay distinct.
        const minR = 0.6; // model units
        r = Math.sqrt(minR*minR + Math.random() * (fillOuter*fillOuter - minR*minR));
      }
      const a = Math.random() * Math.PI * 2;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      // Find one or two parents: sample candidates from the last 120 particles
      // and pick the closest in MODEL space.  Two edges per node gives a denser
      // web without going N^2 expensive.
      let parent = -1, parent2 = -1;
      if (parts.length > 8) {
        const windowSize = Math.min(120, parts.length);
        const baseIdx = parts.length - windowSize;
        let bestD = Infinity, bestIdx = -1;
        let best2D = Infinity, best2Idx = -1;
        for (let k = 0; k < 8; k++) {
          const idx = baseIdx + (Math.random() * windowSize | 0);
          const q = parts[idx];
          const dx = q.x - x, dy = q.y - y;
          const d = dx*dx + dy*dy;
          if (d < bestD) { best2D = bestD; best2Idx = bestIdx; bestD = d; bestIdx = idx; }
          else if (d < best2D) { best2D = d; best2Idx = idx; }
        }
        const maxConnect = viewRadius * 0.22;
        const m2 = maxConnect * maxConnect;
        if (bestD < m2) parent = bestIdx;
        // ~50% of nodes get a second connection
        if (best2D < m2 && Math.random() < 0.55) parent2 = best2Idx;
      }
      // ~2% of spawns are "important" hub nodes — bigger, brighter, warm color.
      // These represent the bigger weights / important neurons in the model.
      const hub = (Math.random() < 0.022);
      parts.push({ x, y, hue: Math.random(), anchor: false, hub,
                   born: elapsed, parent, parent2,
                   pulseSeed: Math.random() * Math.PI * 2 });
    }

    ctx.clearRect(0, 0, W, H);
    const grd = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W, H) * 0.7);
    grd.addColorStop(0, 'rgba(91,233,185,0.07)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);

    const invVR = 1 / viewRadius;

    // --- pass 1: connecting lines ---
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 0.7;
    ctx.strokeStyle = 'rgba(91,233,185,0.20)';
    ctx.beginPath();
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const px = W/2 + p.x * invVR * PX_PER_VR;
      const py = H/2 + p.y * invVR * PX_PER_VR;
      // primary edge
      if (p.parent >= 0) {
        const q = parts[p.parent];
        const qx = W/2 + q.x * invVR * PX_PER_VR;
        const qy = H/2 + q.y * invVR * PX_PER_VR;
        if (!((px < -8 && qx < -8) || (px > W + 8 && qx > W + 8) ||
              (py < -8 && qy < -8) || (py > H + 8 && qy > H + 8))) {
          ctx.moveTo(px, py); ctx.lineTo(qx, qy);
        }
      }
      // secondary edge
      if (p.parent2 >= 0) {
        const q = parts[p.parent2];
        const qx = W/2 + q.x * invVR * PX_PER_VR;
        const qy = H/2 + q.y * invVR * PX_PER_VR;
        if (!((px < -8 && qx < -8) || (px > W + 8 && qx > W + 8) ||
              (py < -8 && qy < -8) || (py > H + 8 && qy > H + 8))) {
          ctx.moveTo(px, py); ctx.lineTo(qx, qy);
        }
      }
    }
    ctx.stroke();

    // --- pass 2: particle dots ---
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const px = W/2 + p.x * invVR * PX_PER_VR;
      const py = H/2 + p.y * invVR * PX_PER_VR;
      if (px < -6 || px > W + 6 || py < -6 || py > H + 6) continue;

      const age = elapsed - p.born;
      const fade = Math.min(1, age / 500);

      if (p.anchor) {
        const r = Math.max(1.4, 14 / Math.sqrt(viewRadius));
        ctx.fillStyle = `rgba(242,182,90,${fade.toFixed(2)})`;
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      } else if (p.hub) {
        // Important node: ~2.4x bigger, warm amber, gentle pulse + glow halo.
        const baseR = Math.max(1.6, 4.2 / Math.pow(viewRadius, 0.18));
        const pulse = 1 + 0.18 * Math.sin(elapsed * 0.004 + p.pulseSeed);
        const r = baseR * pulse;
        const a = Math.min(1, fade * 0.9);
        // halo
        const halo = ctx.createRadialGradient(px, py, 0, px, py, r * 3.2);
        halo.addColorStop(0, `rgba(242,182,90,${(0.45 * a).toFixed(2)})`);
        halo.addColorStop(1, 'rgba(242,182,90,0)');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(px, py, r * 3.2, 0, Math.PI * 2); ctx.fill();
        // core
        ctx.fillStyle = `rgba(255,210,140,${a.toFixed(2)})`;
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      } else {
        const r = Math.max(0.8, 2.2 / Math.pow(viewRadius, 0.18));
        const alpha = (0.45 + 0.30 * (1 - tZoom)) * fade;
        ctx.fillStyle = (p.hue < 0.5 ? 'rgba(120,245,200,' : 'rgba(150,225,240,') + alpha.toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    let cur = labels[0];
    for (const l of labels) if (tZoom >= l.t) cur = l;
    const cap = document.getElementById('zoom-caption');
    if (cap) cap.textContent = cur.txt;
    ZOOM_CAPTION_NOW = cur.txt;

    if (elapsed < TOTAL_DURATION) ZOOM_ANIM = requestAnimationFrame(frame);
    else {
      ZOOM_ANIM = null;
      // Snapshot the final frame to an offscreen canvas (synchronous — no
      // image-decode race) so future visits skip the animation.
      try {
        const off = document.createElement('canvas');
        off.width = canvas.width;
        off.height = canvas.height;
        off.getContext('2d').drawImage(canvas, 0, 0);
        ZOOM_CACHE = { canvas: off, caption: cur.txt };
      } catch (_) { /* canvas tainted — give up silently */ }
    }
  }
  ZOOM_ANIM = requestAnimationFrame(frame);
}
function stopZoomOut() {
  if (ZOOM_ANIM) { cancelAnimationFrame(ZOOM_ANIM); ZOOM_ANIM = null; }
  // If we made it past the visible zoom (~11s) and haven't already cached,
  // snapshot the canvas now so revisits skip re-animating.
  if (!ZOOM_CACHE && ZOOM_START && (performance.now() - ZOOM_START) >= ZOOM_CACHE_AFTER_MS) {
    const canvas = document.getElementById('zoom-canvas');
    if (canvas && canvas.width > 0 && canvas.height > 0) {
      try {
        const off = document.createElement('canvas');
        off.width = canvas.width;
        off.height = canvas.height;
        off.getContext('2d').drawImage(canvas, 0, 0);
        ZOOM_CACHE = { canvas: off, caption: ZOOM_CAPTION_NOW || '' };
      } catch (_) { /* ignore */ }
    }
  }
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
  root.querySelectorAll('[data-arch-info]').forEach(el => {
    el.addEventListener('mouseenter', (e) => {
      const txt = el.getAttribute('data-arch-info');
      const title = el.getAttribute('data-arch-title') || '';
      pop.innerHTML = `<div class="arch-pop-title">${title}</div><div class="arch-pop-body">${txt}</div>`;
      pop.classList.add('is-on');
    });
    el.addEventListener('mouseleave', () => pop.classList.remove('is-on'));
  });
}

// ============================================================
//  Slide 12 — AI is good at code: SWE-bench timeline chart
// ============================================================
function renderSWEBench() {
  const canvas = document.getElementById('swebench-chart');
  if (!canvas || CHARTS.swebench) return;
  const data = {
    labels: ['Mar 2024', 'Aug 2024', 'Dec 2024', 'Apr 2025', 'Aug 2025', 'Feb 2026'],
    datasets: [
      {
        label: 'SWE-bench Verified (% solved)',
        data: [13, 22, 49, 62, 70, 75],
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
        tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y}% real GitHub issues solved` } }
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
  // Stanford "Canaries in the Coal Mine" — employment change by age cohort
  // in AI-exposed occupations (2022-2025). Negative = jobs lost.
  CHARTS.hollow = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: ['22–25', '26–30', '31–40', '41–50', '51–60'],
      datasets: [{
        label: 'Employment change in AI-exposed roles (%)',
        data: [-16, -7, -1, +2, +3],
        backgroundColor: (ctx) => ctx.parsed.y < 0 ? '#F08A8A' : '#5BE9B9',
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => (ctx.parsed.y > 0 ? '+' : '') + ctx.parsed.y + '%' } } },
      scales: {
        y: { ticks: { callback: v => (v > 0 ? '+' : '') + v + '%' }, grid: { color: '#1B2236' } },
        x: { title: { display: true, text: 'Age bracket', color: '#7D8AA0' }, grid: { display: false } }
      }
    }
  });
}

// ============================================================
//  Slide 19 — Energy slider
// ============================================================
const ENERGY_DEFAULTS = { tokens: 2500 };  // ~2.5B ChatGPT messages/day (OpenAI, Aug 2025)
function renderEnergy() {
  const root = document.getElementById('energy-widget');
  if (!root || root.dataset.built) return;
  root.dataset.built = '1';
  root.innerHTML = `
    <div class="field">
      <label>Daily ChatGPT-class queries (millions) <span class="val" id="en-val">${ENERGY_DEFAULTS.tokens.toLocaleString()}</span></label>
      <input type="range" id="en-tokens" min="10" max="5000" step="10" value="${ENERGY_DEFAULTS.tokens}">
      <div class="en-tick small muted" style="margin-top:0.3em;">default = 2.5 billion / day — what OpenAI reported for ChatGPT in Aug 2025</div>
    </div>
    <div class="stat-row mt-2">
      <div class="stat"><div class="stat-label">Energy / day</div><div class="stat-value phos" id="en-kwh">—</div></div>
      <div class="stat"><div class="stat-label">≈ U.S. homes powered for a day</div><div class="stat-value amber" id="en-homes">—</div></div>
      <div class="stat"><div class="stat-label">CO₂ / day (US grid avg)</div><div class="stat-value rose" id="en-co2">—</div></div>
    </div>
    <p class="small muted mt-2">Per query: ~3 Wh (Epoch AI 2025 mid-estimate). U.S. home avg: 30 kWh/day. Grid avg: 0.37 kg CO₂/kWh.</p>`;
  computeEnergy();
}
function computeEnergy() {
  const root = document.getElementById('energy-widget'); if (!root) return;
  const m = parseFloat(document.getElementById('en-tokens').value) || 0;
  document.getElementById('en-val').textContent = m.toLocaleString();
  const kwhPerDay = (m * 1e6) * 0.003;                  // 3 Wh/query
  const homes = kwhPerDay / 30;
  const co2 = kwhPerDay * 0.37;
  document.getElementById('en-kwh').textContent  = fmtSI(kwhPerDay) + ' kWh';
  document.getElementById('en-homes').textContent = fmtSI(homes);
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
const WEALTH_ITEMS = [
  { id: 'nvda',  label: 'NVIDIA market cap',           usd: 5.2e12,
    desc: 'Larger than the entire UK stock market combined.' },
  { id: 'capex', label: '2026 hyperscaler AI capex',   usd: 3.0e11,
    desc: 'Microsoft + Google + Amazon + Meta combined — bigger than Portugal\'s GDP (~$290B).' },
  { id: 'stargate', label: 'OpenAI "Stargate" plan',   usd: 5.0e11,
    desc: '$500B over 4 years — comparable to the entire Apollo program (~$280B in 2024 dollars).' },
  { id: 'mag7gain', label: 'S&P "Magnificent 7" 2024 gain', usd: 5.5e12,
    desc: 'Seven AI-correlated stocks drove the majority of US equity gains.' },
];
const COUNTRY_GDP = [
  { name: 'Iceland',    usd: 32e9 },
  { name: 'Hungary',    usd: 207e9 },
  { name: 'Portugal',   usd: 290e9 },
  { name: 'Greece',     usd: 245e9 },
  { name: 'Switzerland',usd: 905e9 },
  { name: 'Spain',      usd: 1.6e12 },
  { name: 'France',     usd: 3.0e12 },
  { name: 'UK',         usd: 3.4e12 },
  { name: 'Japan',      usd: 4.2e12 },
];
function renderWealth() {
  const root = document.getElementById('wealth-widget');
  if (!root || root.dataset.built) return;
  root.dataset.built = '1';
  root.innerHTML = `
    <div class="w-pills" id="w-pills">
      ${WEALTH_ITEMS.map((it, i) => `
        <button class="w-pill ${i === 0 ? 'is-active' : ''}" data-id="${it.id}">
          <span class="w-pill-label">${it.label}</span>
          <span class="w-pill-value">$${fmtUSD(it.usd)}</span>
        </button>`).join('')}
    </div>
    <div class="stat-row mt-2">
      <div class="stat"><div class="stat-label">Value</div><div class="stat-value amber" id="w-val">—</div></div>
      <div class="stat"><div class="stat-label">≈ country GDP</div><div class="stat-value phos" id="w-eq">—</div></div>
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
  document.getElementById('w-val').textContent = '$' + fmtUSD(it.usd);
  let best = COUNTRY_GDP[0], bestD = Infinity;
  for (const c of COUNTRY_GDP) {
    const d = Math.abs(Math.log(c.usd) - Math.log(it.usd));
    if (d < bestD) { bestD = d; best = c; }
  }
  const ratio = (it.usd / best.usd);
  document.getElementById('w-eq').textContent = `${best.name} × ${ratio.toFixed(1)}`;
  document.getElementById('w-desc').textContent = it.desc;
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
  }, 3200);
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
  { cls: 'l-act',   txt: '[act ] call get_financials(quarter="Q1 2026")' },
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

// ============================================================
//  Slide 14 — Agent "typing" animation + synchronised IDE pane
// ============================================================
let TT_TYPING_ANIM = null;
let TT_IDE_TIMERS = [];

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
    if (i >= chunks.length) { TT_TYPING_ANIM = null; return; }
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
  spawnMatrixBackdrop();
  // Slide 4: scratch-out animation plays AUTOMATICALLY on slide entry.
  // Reset (to restart from frame 0 even if revisited), then schedule the play
  // on the next frame so the reset's reflow lands first.
  if (slide && slide.querySelector('.linalg-review')) {
    resetReviewScratch();
    requestAnimationFrame(() => requestAnimationFrame(playReviewScratch));
  }
  // Slide 7: zoom-out — only run when on that slide
  if (slide && slide.querySelector('#zoom-canvas')) {
    startZoomOut();
  } else {
    stopZoomOut();
  }
  // Slide 10: agent loop animation
  if (slide && slide.querySelector('.agent-loop')) {
    startAgentLoopAnim();
  } else {
    stopAgentLoopAnim();
  }
  // Slide 14: agent typing animation
  if (slide && slide.querySelector('#tool-typing-pre')) {
    startToolTypingAnim();
  } else {
    stopToolTypingAnim();
  }
  // Slide 15: MCP spoke auto-cycle
  if (slide && slide.querySelector('.mcp-hub')) {
    startMcpAutoCycle();
  } else {
    stopMcpAutoCycle();
  }
  // Slide 20: wealth pill auto-cycle
  if (slide && slide.querySelector('#wealth-widget')) {
    startWealthAutoCycle();
  } else {
    stopWealthAutoCycle();
  }
  // Auto-fit-to-slide: scale down overflowing content so nothing is cut off.
  if (slide) requestAnimationFrame(() => autoFitSlide(slide));
}

// Scale down a slide section's inner content if it would overflow the 800px box.
// We wrap children in a single .auto-fit-inner div the first time we see them,
// measure its scrollHeight, and apply a uniform transform: scale() if needed.
function autoFitSlide(section) {
  if (!section) return;
  // Title slides own their layout — leave them alone.
  if (section.classList.contains('title-slide')) return;
  // Read available content height = section height minus top/bottom padding.
  const cs = getComputedStyle(section);
  const padTop = parseFloat(cs.paddingTop) || 0;
  const padBot = parseFloat(cs.paddingBottom) || 0;
  // Reveal slides are 800px tall in slide-space.
  const SLIDE_H = section.clientHeight || 800;
  const available = SLIDE_H - padTop - padBot;
  // Wrap once.
  let inner = section.querySelector(':scope > .auto-fit-inner');
  if (!inner) {
    inner = document.createElement('div');
    inner.className = 'auto-fit-inner';
    inner.style.transformOrigin = 'top left';
    inner.style.width = '100%';
    // Move all non-absolute, non-fixed children into it (preserves order).
    const children = Array.from(section.children);
    for (const c of children) {
      const ccs = getComputedStyle(c);
      if (ccs.position === 'absolute' || ccs.position === 'fixed') continue;
      inner.appendChild(c);
    }
    section.appendChild(inner);
  }
  // Reset before measuring.
  inner.style.transform = '';
  inner.style.height = '';
  const need = inner.scrollHeight;
  if (need > available && available > 0) {
    const scale = Math.max(0.55, available / need);
    inner.style.transform = `scale(${scale.toFixed(4)})`;
    // Keep wrapper from claiming the unscaled space (prevents extra slide-height).
    inner.style.height = (need * scale) + 'px';
    inner.style.width = (100 / scale).toFixed(2) + '%';
  }
}

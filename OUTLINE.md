<!-- cspell:ignore Brynjolfsson Octoverse Kadrey Karpathy hyperscaler MirrorCode WeatherNext gotree GitHub Codex Codeium Windsurf Aider Claude OpenAI DeepSeek Llama nanoGPT minGPT Alammar Bloem Bycroft jalammar peterbloem bbycroft datacenter datacenters Stargate xAI Hynix TrendForce Octoverse Dario Anthropic Sonnet Opus -->
# 🤖 The State of AI — Slide Outline & Plan

A detailed, slide-by-slide plan for an interactive, browser-based presentation on the current state of Artificial Intelligence. Patterned on the existing FinancePresentation deck so it shares the same look-and-feel, but built as a fully static site that will be hosted on **Azure Static Web Apps**.

**Total slides:** 24 · **Target runtime:** ~30–40 min talk + Q&A
**Audience:** Friends, family, colleagues — **non-technical**, mostly never took linear algebra
**Hosting:** Static files only — no Node server. We **keep clean path-based URLs** like `/presentation/3` (matching the Finance deck) by using the History API on the client and an Azure Static Web Apps rewrite rule that sends every unknown path to `presentation.html`. Deep links, refresh, and the back button all work exactly like the Finance deck.

Legend: 🎤 = speaker talking point · 🎛 = interactive widget · 🎬 = required animation · 🔢 = default numbers

---

## Site architecture (mirrors FinancePresentation/public)

```
public/
  index.html                Landing page (hero + CTA cards) — like Binance index
  presentation.html         Reveal.js shell — loads slides via manifest
  staticwebapp.config.json  SPA fallback rewrite for Azure Static Web Apps
  css/
    theme.css               Site-wide deck theme (palette = "dark terminal / soft glow")
    landing.css             Landing-page-only styles
  js/
    slide-manifest.js       Ordered slide list
    slide-loader.js         Fetches slides & injects them
    widgets.js              All interactive widgets (matrix mixer, toy transformer, etc.)
    animations.js           Canvas/SVG animations (scratch-out, zoom-out, agent loop)
    main.js                 Reveal init + History-API path routing + SWA-friendly deep links
  slides/
    01-title.html → 24-thank-you.html
  images/                   Favicon, any photos
```

### Theme direction (different from Finance "spring meadow")
**"Dark terminal / soft glow"** — deep near-black background (#0B0F1A) with subtle navy gradient; primary accent **phosphor green** (#5BE9B9) used sparingly, secondary **soft cyan** (#7AD9E5), warm **amber** (#F2B65A) for highlights, and **off-white** (#E6EDF3) for body text — high contrast and easy to read at a distance. "Computery" vibe via faint terminal-grid background, monospaced accents on numbers/code, and occasional scanline shimmer — *never* loud enough to fight the content.

**Typography (easy to read first, vibey second):**
- Headings: **Inter** semi-bold (clean, modern sans — replaces Fraunces; serif feels wrong against a dark background)
- Body: **Inter** regular
- Numbers, code, matrix cells: **JetBrains Mono** (the "computery" touch lives here)

### Hosting tweak vs. Finance deck
- Finance deck uses an Express server to translate `/presentation/3` into a slide jump.
- We get the **same clean URLs on Azure SWA** with two pieces:
  1. `staticwebapp.config.json` rewrites `/presentation/*` → `/presentation.html` (so refresh + deep links work).
  2. `main.js` reads `window.location.pathname` on load, jumps Reveal to the right slide, and uses `history.pushState` as the user navigates — identical UX to Finance, zero backend.
- No backend, no DB, no Express. `npm` is only used locally for `http-server` if desired.

---

## Slide-by-slide outline

### 1. Title — *Generative AI: The good vibes and the bad* 🎬

**Visual:** Centered title on the dark background. **Behind the title, faint matrix-multiplication problems drift in and out of the distance** — small `[a b; c d] × [x; y] = [..; ..]` blocks at very low opacity (~10–15%), slow fade (8–12s per cycle), blurred slightly so they read as atmosphere, not content. Random positions, no overlap with the title block. Inspired by the "Matrix code rain" feel but using actual math rather than glyphs.

- Title (large, Inter semi-bold, off-white): **Generative AI: The good vibes and the bad**
- Subtitle (smaller, phosphor-green accent): *"What it is, how it works, and what it's already changing."*
- Footer prompt (mono, dim): `press → or click to begin`

🎬 **Required animation:** Background matrix-multiplication drift. ~10 problems on screen at any time, each fading in over 1s, holding for 4s, fading out over 3s, then a new one starts elsewhere. Pure CSS/SVG — no Canvas needed. Numbers cycle through hand-picked friendly values (mostly single digits) so it looks like real arithmetic, not noise.

🎤 *Welcome. The goal of the next ~30 minutes: walk you through what these models actually are, why they're suddenly everywhere, and what the trade-offs look like — without assuming any technical background.*

---

### 2. Hook — *In May 2026, half of America used AI last week*

**Layout:** Big stat on the left; three small "did you know" cards on the right.

- Big stat: **~50% of U.S. adults used AI in the past week.** [Epoch AI / Ipsos, Apr 2026]
- Card 1: *NVIDIA is now worth ~$5.2 trillion — more than the entire UK stock market.* [StockAnalysis.com, May 2026]
- Card 2: *Google, Meta, Microsoft, Amazon will spend **~$300B** on AI infrastructure in 2026 — bigger than Portugal's GDP.* [SEC 10-Ks]
- Card 3: *84% of developers now use AI tools daily or weekly.* [Stack Overflow Dev Survey 2025]

🎤 *Two years ago this was a curiosity. Today it's one of the biggest industrial investments in tech history. The next ~30 minutes will explain how something this consequential actually works — and what it's costing us.*

---

### 3. What we'll cover

**Visual:** Simple sectioned table of contents with 5 colored pills:
1. 🧮 The math underneath (Linear algebra → toy transformer → real systems)
2. 🏗️ What's actually inside a modern AI assistant
3. 💻 How AI is rewriting the rules of writing software
4. 🔌 The new plumbing: agents, MCP, skills
5. ⚖️ What it's already changing — and the costs

---

## Section I — The Math Underneath

### 4. Linear Algebra ~~Review~~ → 101 🎬

**Visual:** Title appears as "Linear Algebra **Review**" — then a hand-drawn scribble animation strikes through *"Review"* and writes *"101"* above it (CSS keyframe + SVG path; the "scribble" feels like a Sharpie).

- Subtitle (fades in after the scratch-out): *"For people who never took the class — including, probably, you."*
- Three plain-English sentences (one per line, faded in sequentially):
  1. **A vector is a list of numbers.** Like `[hunger 8, tired 3, mood 6]` — a snapshot.
  2. **A matrix is a table of numbers.** Each row is a "recipe."
  3. **Multiplying = weighted mixing.** Each output is a weighted blend of all the inputs.

🎤 *Hold on the scratch-out for a beat. Make the joke land.*

🎬 **Required animation:** SVG-path strikethrough of "Review" + handwritten "101" appears above. ~1.5s total.

---

### 5. Linear Algebra 101 — Mood Mixer 🎛

**Visual:** Three-column interactive widget.
- **Left:** 3 input sliders — Hunger, Tiredness, Mood (0–10). Show vector `[8, 3, 6]`.
- **Center:** Editable 3×3 weight matrix (clickable cells, defaults shown below).
- **Right:** 3 output bars — `Eat?`, `Sleep?`, `Socialize?` that update live.

🔢 **Default weight matrix:**
```
         Hunger  Tired  Mood
Eat?      0.8    0.1   -0.2
Sleep?    0.1    0.9    0.0
Socialize? -0.1   0.0   0.7
```

🎛 **Interaction:**
- Drag any slider → all three outputs update instantly.
- Click a matrix cell → small spinner appears; change the value.
- Hover over an output row name → that row highlights, with caption: *"This is the recipe for `Eat?` — mostly hunger (0.8), a little tiredness, slight negative weight on mood."*
- Reset button.

🎤 *"A neural network just stacks hundreds of these mixers, one on top of another. GPT-4 has 96 stacked layers, each with thousands of these recipes. That's it. That's the secret."*

📎 Inspiration: 3Blue1Brown's [Essence of Linear Algebra](https://www.3blue1brown.com/lessons/linear-transformations), [Immersive Math](http://immersivemath.com/ila/index.html).

---

### 6. Toy Transformer — Spelling "CAT" 🎛 🎬

**Visual:** Side-by-side. Left = 2D compass-point diagram of the 4 tokens (`START`, `C`, `A`, `T`) on a unit circle. Right = the 4×2 output matrix `W` displayed as a small grid.

**Concept:** The smallest possible transformer that actually does something. 4-token vocabulary, 2-dim embeddings, 1 attention head, ~24 hand-picked parameters.

🎛 **Interaction:**
- Big **"Next letter →"** button.
- Each click: animates the current embedding being multiplied by `W`, the four logit scores appearing, the softmax bars filling in, and the highest-probability letter being added to the output strip at the bottom.
- After 3 clicks: the strip shows **C → A → T** ✓
- A **"Reset"** button + a **"Show the math"** toggle that reveals the actual arithmetic for the current step.

🔢 **Embeddings (compass points):** START [1,0] · C [0,1] · A [−1,0] · T [0,−1]

🔢 **Output matrix W (rotates embedding 90° → predicts the *next* token on the circle):**
```
[[ 0, -1],   ← score START
 [ 1,  0],   ← score C
 [ 0,  1],   ← score A
 [-1,  0]]   ← score T
```

🎤 *"This is a real transformer. Same structure as GPT — just 24 numbers instead of 2 trillion. We just spelled a word using 4th-grade arithmetic."*

📎 Inspiration: [bbycroft.net/llm](https://bbycroft.net/llm) (live during talk if Wi-Fi), [Jay Alammar's Illustrated Transformer](https://jalammar.github.io/illustrated-transformer/), [3Blue1Brown attention](https://www.3blue1brown.com/lessons/attention).

---

### 7. Now Multiply That By A Trillion 🎬

**Visual:** Pure animation slide — no text input. The 4 compass-point dots from slide 6 stay on screen, then the camera "zooms out."

🎬 **Required 4-beat zoom-out animation (~25s, then loops gently):**
1. **0–4s** — 4 labeled dots (S/C/A/T) and 3 arrows, our toy. Label: **"4 tokens · 24 numbers · spelled 'CAT'"**.
2. **4–10s** — Zoom out. Dots multiply to ~50, labels disappear, arrows form a dense web. Label fades in: **"GPT-1 (2018) — 117 million parameters."**
3. **10–17s** — Zoom continues. 50 → ~500 dots, then beyond resolution: a shimmering luminous grid. Label: **"GPT-3 (2020) — 175 billion parameters."**
4. **17–25s** — Full galaxy-shot star field, faint connection lines everywhere. Label: **"GPT-5 / Claude Opus 4.7 / Gemini 3.5 (2026) — ~1–2 trillion parameters."** A single bright dot pulses in one corner with the caption: **"Our toy is still in there, somewhere."**

Implementation: HTML5 Canvas particle system with force layout + scale animation. ~150 lines of JS.

🎤 *Sit on beat 4 silently for 3 seconds. Then say: "This thing — at this scale — can pass the bar exam, write production code, and translate between 200 languages. From the same math you just watched."*

---

## Section II — What's Inside a Modern AI Assistant

### 8. Reveal Slide — *"A model alone is useless"*

**Visual:** Big quote-card style.

> *"What you call 'ChatGPT' or 'Claude' isn't a model. It's a model plus 15 other things wrapped around it."*

🎤 *Bridge: the next slide is intentionally overwhelming. That's the point. We'll demystify each box.*

---

### 9. The Anatomy of a Modern AI Assistant 🎬

**Visual:** Complex architecture diagram — the centerpiece of the deck. 5 horizontal "swim lanes" colored differently, with arrows showing data flow top → bottom and a feedback loop in the agent layer. Hovering or clicking any block opens a small popover with the plain-English explanation.

**Lane 1 (Input):** Your message · Multimodal encoder (vision/audio)
**Lane 2 (Safety in):** Jailbreak detector · Input policy classifier
**Lane 3 (Model Core):** Foundation LLM · MoE routing · Thinking/reasoning chain · KV cache
**Lane 4 (Tools / Knowledge):** RAG + vector DB · Long-term memory · Web browsing · MCP servers · Sandboxed code execution · **← loops back to model core**
**Lane 5 (Safety out + Output):** Output classifier · Citation check · Final reply

**Footer band (gray):** Training pipeline — RLHF · DPO · Constitutional AI · Red-teaming

🎛 **Interaction:**
- Hover any box → popover with 1-sentence plain-English description.
- Click a box → opens a 4-line "tell me more" panel with a single citation link.
- Optional "play" button → animates a fake user message traveling through every block.

🎤 Walk through 4–5 boxes only (don't read every one): **Safety gate**, **Tool loop**, **RAG**, **Reasoning model**, **MCP**. *"Each of these is hundreds of engineers' work. Together they're why the model in your phone feels like magic instead of a quirky autocomplete."*

📎 Sources for every block: see `files/research-architecture.md` in this repo.

---

### 10. The Agent Loop — Think · Act · Observe · Repeat 🎬

**Visual:** Animated loop diagram. Four nodes in a circle: **🧠 Think → 🔧 Act → 👁️ Observe → 🔁 Repeat → 🧠 Think...** A glowing dot circles the loop continuously.

- Inset example panel on the right, animating step-by-step:
  - User: *"Fix the login bug"*
  - Think: *"I should read the auth file first"* → Act: `read_file("auth.py")` → Observe: 200 lines returned →
  - Think: *"Let me check the failing test"* → Act: `run("pytest tests/auth")` → Observe: AssertionError on line 47 →
  - Think: *"Off-by-one error in the token expiry check"* → Act: `edit_file(...)` → Observe: tests pass →
  - Done: PR ready.

🎤 *"This is the difference between ChatGPT 2022 and Claude Code 2026. The model can now use tools and check its own work — a small change architecturally, a big one practically."*

---

## Section III — AI and Code

### 11. What *is* code, anyway? 🎬

**Visual:** Split panel.
- **Left:** A small illustration of a genie (lamp + smoke) with a speech bubble.
- **Right:** Big text.

**Lead-in text (one paragraph, animated word-by-word reveal):**
> Code is the art of talking to the world's most **literal genie**. The machine does exactly what you say — not what you mean. Ask it to *"sort the list"* without saying which list, and it crashes. Tell it to *"delete files older than 30 days"* with a wrong clock and it deletes everything.

**Bottom:** *"Translating fuzzy human goals into airtight machine instructions is genuinely hard. That's the entire job."*

🎬 Optional cute animation: the genie speech bubble misinterprets the wish each time (small comic strip).

---

### 12. AI is REALLY good at writing code 🎛

**Visual:** Three stat cards on top + one big interactive chart at the bottom.

**Top row stats (cards):**
- **72.7%** — Claude Sonnet 4 on SWE-bench Verified (real GitHub bug fixes) — *up from 12.5% in March 2024.* [Anthropic, June 2025]
- **46%** — of code in Copilot-enabled files written by AI. [GitHub, 934k user study]
- **2–17 weeks** — human-engineer time to reimplement a 16,000-line codebase. **Claude Opus 4.6 did it autonomously.** [Epoch AI MirrorCode, April 2026]

**Bottom chart (🎛 interactive):**
- A timeline chart of SWE-bench scores from March 2024 (12.5%) → today (>72%) with milestone markers (GPT-4, Claude 3.5, Claude 4, etc.).
- Toggle button to flip to a "Time-Horizon" chart from METR (the doubling-every-7-months trend line, extrapolated forward).

🎤 *"Two years ago, AI could solve about 1 in 8 real engineering tasks. Today it's 3 in 4. That's not improvement — that's a phase change."*

---

### 13. Honest counterpoint — AI doesn't always help

**Visual:** Single big stat + nuance text.

- **−19%** — How much AI tools *slowed down* experienced open-source developers in a randomized controlled trial. [METR, July 2025, arXiv:2507.09089]
- Devs *predicted* they'd be 24% faster. They were 19% slower. **They still thought they'd been faster.**
- The catch: it helps novices a lot. It can hurt seniors on huge mature codebases.

🎤 *"The picture is more interesting than 'AI does everything now.' It absolutely accelerates beginners, greenfield projects, and prototype work. On a 5-year-old codebase you've memorized? It can get in your way. Both stories are true."*

---

### 14. How AI Coding Tools Work 🎬

**Visual:** Three columns, each a stylized "screenshot" with annotations.

| Tool | Pattern |
|---|---|
| **GitHub Copilot** | Inline tab completion → Chat → Agent mode (autonomous PRs) |
| **Claude Code** | Terminal-first agent. Reads repo · edits files · runs shell · iterates |
| **Cursor / Windsurf** | Full IDE with agent inside |

**Bottom band:** *"Under the hood, all of them run the same agent loop you just saw. The differences are mostly in the UI."*

🎬 Light animation: each tool's "screenshot" types out a tiny sample interaction.

---

## Section IV — The New Plumbing

### 15. MCP — USB-C for AI 🎬

**Visual:** Animated diagram of a hub.
- Center node: **"Your AI assistant"**
- Spokes around it (each a labeled icon): GitHub · Slack · Postgres · Google Drive · Figma · Jira · Your custom tool

**Caption:** *Before MCP, every AI had a different cable for every service. Now there's one standard plug.*

- One-sentence quote: *"Think of MCP as USB-C for AI applications."* — Anthropic
- Stats: Created by Anthropic, Nov 2024. Now supported by Claude, ChatGPT, Cursor, VS Code/Copilot. **Thousands** of community servers exist.

🎬 Animation: spokes connect one-by-one, each accompanied by its icon "snapping" into the hub.

---

### 16. Skills — Reusable Expertise Packs

**Visual:** Stacked-cards visual showing 4 skill cards: 📊 Excel · 📝 PowerPoint · 📄 Contracts · 🏥 Medical-records intake.

**Text:**
- A "Skill" is a folder with a markdown instruction file. The AI loads only the name + 1-line description until it needs the full thing.
- Lets one AI assistant be an expert at a thousand specific tasks **without retraining**.
- Anthropic shipped Skills October 2025. Open standard.

**Bottom side-by-side mini-table:**

| | MCP | Skills |
|---|---|---|
| Gives the AI | Tools / live data | Instructions / know-how |
| Analogy | A phone | A training manual |

🎤 *"MCP is how AI talks to your stuff. Skills are how AI learns to do your specific job. Together they turn one model into a thousand specialists."*

---

## Section V — What It's Changing & What It Costs

### 17. The Hollowing of the Entry Level 🎛

**Visual:** Bar chart — employment change since gen-AI broke out, split by **age bracket** and **AI exposure**.

🎛 Interactive toggle: swap the chart between "Junior (22–25)" and "Senior (35+)" — the contrast is the point.

🔢 **Key numbers:**
- **−16%** relative employment decline for workers 22–25 in the most AI-exposed jobs. [Brynjolfsson et al., Stanford Digital Economy Lab, Nov 2025 — "Canaries in the Coal Mine"]
- **+34%** productivity boost from AI for *novices* in customer support. [Brynjolfsson, Li, Raymond NBER WP 31161]
- *Senior workers in the same jobs: stable.*

🎤 *"This is the most concrete labor-market finding we have. AI is, right now, a partial substitute for entry-level white-collar work and a partial complement for experienced workers. The ladder is getting harder to climb."*

---

### 18. Specific industries already shifting

**Visual:** 4 logo-style cards.
- **Klarna** — workforce shrunk by ~700 (Aug 2024; CEO statement; chatbot doing the work of 700 agents)
- **Duolingo** — went "AI-first," non-renewal of contractor work AI can do (April 2025)
- **BT Group** — 10,000+ AI/automation-linked cuts announced (May 2023)
- **IBM** — paused hiring of ~7,800 back-office roles (May 2023)

Tag-line: *"The headlines are real; the categories matter."*

---

## Section VI — The Costs

### 19. The Energy Cost 🎛

**Visual:** Big counter on top + two side-by-side widgets.

**Headline counter:** *"Extra US electricity demand added by data centers — vs. just one year ago: **+100 TWh** (the entire annual consumption of Hungary)."* [IEA Electricity 2025]

🎛 **Widget 1:** A small slider — "Number of data centers built per year" — feeding a bar of "extra GW of electricity needed" with a real-world comparison ("= X coal plants" / "= Y million homes").

🎛 **Widget 2:** A capacity-auction stat: **PJM Interconnection cleared at $269.92 / MW-day** in 2024 — up from **$34.13** the year before. **~8× spike.** "This shows up in your power bill."

🎤 *"This is the most under-discussed cost. Data centers are forcing utility rate cases all over the country. Northern Virginia, Ohio, Georgia. Your bill is going up partly because someone, somewhere, is asking ChatGPT to write a haiku."*

---

### 20. The Concentration of Wealth 🎛

**Visual:** Treemap or stacked bar showing where the gains went.

🔢 **Top stats:**
- **~60%** of S&P 500 returns in 2023 came from the "Magnificent 7." [Goldman Sachs]
- **NVIDIA**: ~$360B (Jan 2023) → **~$5.2T** (May 2026). **+$4.8T market cap in 3 years** — the largest single-company expansion in history. [StockAnalysis.com]
- **Big-3 hyperscaler 2026 capex guidance: ~$285–315B** — bigger than Portugal's GDP. [Alphabet/Meta 10-Ks]
- **Stargate** alone: **$500B**, 9 GW of new datacenters. [Epoch AI]

🎛 Interactive: a small "Compare to" dropdown — pick a country, see its GDP next to total US AI infrastructure spend.

🎤 *"This isn't a 'tech sector' story anymore. The American stock market essentially IS AI now."*

---

### 21. The Hardware Squeeze on Consumers

**Visual:** Side-by-side photos: a giant H100 GPU vs. a consumer RTX 5090, with red price arrows.

- **HBM (the special memory in AI chips):** SK Hynix and Samsung sold out through 2025. Consumer DRAM tighter as a result.
- **RTX 5090** ($1,999 MSRP, Jan 2025) — street price 20–50% over MSRP. TSMC prioritizing AI chips over gaming GPUs.
- **NAND/SSD:** AI server demand contributing to price volatility.

🎤 *"Even if you've never typed a single prompt, AI may already be in your wallet — through your power bill and the price of your next graphics card."*

---

### 22. Moral & Legal Issues

**Visual:** 4-column grid with a small icon + 1-line headline each.

- ⚖️ **Copyright in court.** NYT v. OpenAI (filed Dec 2023, ongoing). Music labels v. Suno/Udio. Authors v. Meta (fair-use win for Meta, June 25 2025; appeals continue).
- 🎭 **Deepfakes & elections.** AI Biden robocall, NH primary 2024. EU AI Act now in force.
- ⚖️ **Bias.** Documented in hiring AI, facial recognition (NIST FRVT studies), algorithmic rent-pricing (DOJ v. RealPage).
- 🏛️ **Power concentration.** Data + talent + compute concentrated in ~10 firms. FTC warning, June 2023.

🎤 *Brief touch — the field of AI ethics deserves its own talk. Just acknowledge the categories and move on.*

---

### 23. Two Honest Views — Existential Risk

**Visual:** Two-column "for / against" layout — quotes with photos.

- **Geoffrey Hinton** (Turing Award, "Godfather of Deep Learning"): *"10–20% chance AI leads to human extinction within 30 years."* Left Google 2023 to speak freely.
- **Yann LeCun** (Turing Award, Meta Chief AI Scientist): *"Current LLMs are fundamentally limited autocomplete. We are nowhere near AGI."*

Footer: *"The Turing-Award winners disagree. So can you."*

🎤 *"Reasonable, brilliant people are at opposite ends. That alone tells you no one knows yet. The right response is engaged skepticism — not panic, not dismissal."*

---

### 24. Takeaways + Thank You

**Visual:** Five takeaways as numbered cards, then a final "thank you" line.

1. **The math is simple.** Vectors, matrices, weighted mixing — stacked a trillion times.
2. **A model is the engine. Everything around it makes the car drive.** Safety, tools, RAG, memory.
3. **AI is now genuinely good at coding** — especially novice work, greenfield, and rote tasks. Less reliably useful on senior work on mature codebases.
4. **MCP + Skills = AI plug-and-play.** Why this gets useful faster every quarter.
5. **The costs are real.** Power bills, junior-level jobs, a few people getting unimaginably rich.

Closer: *"You don't need to learn to code to be part of this. You need to learn to ask sharp questions of a very literal genie."*

— *Thanks. Questions?*

---

## Interactive / Animation budget — what we actually have to build

| Slide | Type | Effort |
|---|---|---|
| 1. Title — matrix-multiplication ambient background | 🎬 Faint drifting matrix-multiply problems behind title | Small — pure CSS/SVG, ~60 LOC |
| 4. Linear Algebra ~~Review~~ → 101 | 🎬 SVG "scribble" scratch-out + handwritten "101" | Small — pure CSS/SVG keyframes |
| 5. Mood Mixer | 🎛 3 sliders + 3×3 editable matrix + 3 output bars | **Medium** — ~120 LOC of vanilla JS |
| 6. Toy Transformer "CAT" | 🎛 Step-through with math reveal, vector-on-circle visual | **Medium-large** — ~200 LOC + SVG diagram |
| 7. Zoom-out (toy → trillion) | 🎬 Canvas particle field with 4-beat zoom | **Large** — ~200 LOC of Canvas |
| 9. Architecture diagram | 🎬+🎛 SVG diagram with hover popovers + optional flow animation | **Large** — diagram authoring + JS popover wiring |
| 10. Agent loop | 🎬 Looping diagram + side panel animation | **Medium** — ~100 LOC + CSS keyframes |
| 11. Code = literal genie | 🎬 Cute comic strip (optional) | Small/optional |
| 12. AI is good at code | 🎛 Toggleable line chart (SWE-bench / METR time horizon) | **Medium** — Chart.js, ~80 LOC |
| 14. Coding tools | 🎬 Three stylized typing animations | Small — CSS only |
| 15. MCP hub | 🎬 Hub-and-spokes animation | Small — SVG keyframes |
| 17. Hollowing-out | 🎛 Bar chart with junior/senior toggle | Small — Chart.js |
| 19. Energy cost | 🎛 Slider → "X coal plants" comparison | Small — vanilla JS |
| 20. Wealth concentration | 🎛 "Compare to country GDP" dropdown | Small — vanilla JS |

Reuses Chart.js (already a CDN dep in Finance deck). Adds no new heavy dependencies.

---

## Implementation phases

**Phase 1 — Scaffolding (matches Finance deck structure):**
- `public/` folder with `index.html` (landing), `presentation.html` (Reveal shell), manifest, loader, theme, History-API path routing, and `staticwebapp.config.json`.
- `staticwebapp.config.json` (SPA fallback for Azure Static Web Apps).
- Empty slide stubs for all 24 slides + manifest list.

**Phase 2 — Static content slides:**
- 1, 2, 3, 8, 11, 13, 16, 18, 21, 22, 23, 24 (text-heavy, no widgets).

**Phase 3 — Animations:**
- 4 (scratch-out), 7 (zoom-out), 10 (agent loop), 11 (genie comic), 14 (typing), 15 (MCP hub).

**Phase 4 — Interactive widgets:**
- 5 (Mood Mixer), 6 (Toy Transformer), 9 (Architecture popovers), 12 (chart), 17 (chart), 19 (slider), 20 (dropdown).

**Phase 5 — Polish & Azure deploy:**
- Mobile/responsive pass · accessibility · `azure.yaml` or direct SWA deploy via `swa deploy` CLI · custom domain if desired.

---

## Source files (in `~/.copilot/session-state/.../files/`)

All research outputs from the parallel agents are saved for reference:
- `research-state.md` — Current state of AI (May 2026)
- `research-transformer.md` — Linear algebra & toy transformer designs
- `research-architecture.md` — 16-component AI assistant architecture
- `research-coding.md` — AI coding tools, MCP, Skills
- `research-impact.md` — Knowledge-work impact + negatives (energy, wealth, hardware, moral)

Every numeric claim in this outline is backed by a primary source in those files.

# Plan: "AI in 5 demos": interactive widgets for an undergrad intro-to-AI talk

## Context
Jim is giving a 1-hour-plus intro-to-AI talk to undergraduates of all majors. The talk goes from optimization → compression → generalization → attention → few-shot LLMs, and avoids brain metaphors and formal math. Each idea is carried by a live, graphical JS demo. The repo (`ai-in-5-demos`, currently just LICENSE/README/prompt.md/the PDF) will host every demo as static HTML pages on GitHub Pages. Each page has its own URL so it can be opened in a browser tab or embedded as a 16:9 slide. All pages share one visual language: the same panel positions, the same big readout, and the same history/loss plot. Pages carry almost no text (axis labels and button labels only).

Decisions already made with the user:
- **Demo 5 LLM**: OpenRouter has no base model with a live provider (the `meta-llama/llama-3.1-405b` base has `endpoints: []`). Instead the base model runs in **llama.cpp `llama-server` on the MacBook**.
- **Demo 4 translator**: train a **Bahdanau GRU encoder-decoder with one additive attention**, with word tokens, **English→French**, and an English embedding **initialized from GloVe-100d and fine-tuned**. It runs **in the browser in plain JS** from exported weights, so no Python server is needed.

## Repo layout (no build step)
```
index.html                       # links to every page (for tabs / PDF hyperlinks)
common/stage.css  common/stage.js   # 1600×900 stage scaled to the window, palette, buttons, popup overlay, page nav
common/plots.js                  # Readout (big number) + History panel (bars-fixed | bars-scroll | line-zoom)
common/image.js                  # the greyscale test image as an embedded base64 PNG (works over file://)
common/optim.js                  # small Adam implementation + seeded RNG + helpers
lib/tf.min.js                    # TensorFlow.js, vendored at a pinned exact version (works offline at the talk)
demo1-optimization/{1-simulation,2-random,3-optimize}.html   + brachistochrone.js
demo2-compression/{1-fourier-1d,2-fourier-image,3-logistic-1d,4-adaptive-image}.html
demo3-generalization/{1-overfit,2-circle,3-spirals}.html     + nn-common.js
demo4-attention/{1-embedding,2-translation}.html + seq2seq.js + model/{weights.bin,manifest.json,vocab_en.json,vocab_fr.json}
demo5-few-shot/1-complete.html + presets.js
training/                        # uv project (pinned deps) to train/export the Demo 4 model on this machine's RTX 3060
serve-llm.sh                     # one-liner to start llama-server for Demo 5 on the Mac
README.md                        # page URLs, how to run, data/image/model credits and licenses
```
Pages use classic `<script src>` tags rather than ES modules, so Demos 1–3 also work from `file://`. Demos 4 and 5 fetch files and need `python3 -m http.server` or GitHub Pages.

## Shared visual framework (`common/`)
- **Stage**: a fixed 1600×900 logical canvas, scaled with CSS `transform` to fit the window or iframe and letterboxed. Every page therefore has identical geometry at any size.
- **Standard regions**:
  - Main panel at the left (≈ x 20–1080, y 20–800).
  - Control bar below it (y ≈ 820–880).
  - Right column (x ≈ 1110–1580): **Readout** at the top (big monospace number: timer or loss) and the **History panel** at the bottom-right (y ≈ 300–880).
- **History panel**: one component with three modes.
  - `bars-fixed`: slots never move; used for Demo 1 p1.
  - `bars-scroll`: last 30, scrolls; used for Demo 1 p2.
  - `line-zoom`: line with a light area fill under it, so it reads as "the same bars, continuous"; the x-range grows to keep the whole history in view; used for every optimization page.
  - Same color, fonts, and axis labels ("time (s)" or "loss" vs "iteration") everywhere. Demo 3 adds a grey dotted out-of-sample line.
- **Palette**: deck-like white background, dark grey ink, one accent blue for fits and history. Orange #f59322 and blue #0877bd for classes, matching the TF playground.
- **Popup overlay** (Esc or × to close): used by Demo 2 p2 (difference image) and Demo 3 p2 (3D view).
- **Page nav**: tiny prev/next arrows and ←/→ keys. Hidden automatically inside an iframe (`window.self !== window.top`) or with `?embed`.

## Demo 1: Optimization (brachistochrone)
- **Geometry**: fixed start (upper-left) and end (lower-right) plus 15 interior nodes at equal x spacing with free heights. That makes 16 segments and 15 parameters. The window leaves room below the end point because the cycloid dips below it when Δx/Δy > π/2.
- **Smoothing**: each corner is replaced by a small circular fillet with radius ≥ ball radius and ≤ ½ the adjacent segment length. Fillets give a continuous tangent that is visually indistinguishable from the linestring. The curve is stored as a dense arc-length polyline, so near-vertical drops work.
- **Physics**: frictionless constrained motion along arc length: s̈ = −g·dy/ds, integrated with small fixed RK4 substeps. The rest start is handled analytically for the first few px. The ball (finite radius) is drawn at contact + r·n̂. It cannot leave the curve.
  - Presets: linear, ski jump (concave-up), two hills (both below the start height), immediate drop.
  - Each preset is checked offline to have normal force > 0 everywhere, so the no-bounce constraint never looks wrong.
  - g/scale are chosen so the discretized cycloid takes ≈ 0.9–1.0 s and the slowest preset < 5 s. A fast time-only evaluator (∫ds/v with v = √(2gΔy)) is used for p2/p3 and must agree with the RK4 sim.
- **p1**: animated ball. Big timer counts up (ms precision) from release until the ball crosses the right end. Then the timer stops and a bar appears in `bars-fixed` with a fixed 0–5 s scale. Buttons: preset shapes plus "go".
- **p2**: "random" button. Each press makes a random smooth shape: a sum of random Chebyshev T₀…T₆ terms sampled at the node x's, plus the straight line, and clamped below the start height so the ball always finishes. The readout shows the time instantly (no count-up). A bar is appended in `bars-scroll` (30 visible). History starts empty.
- **p3**: same button = random shape, clear history, start optimizing. Optimizer: gradient-free **(1+1)-ES with the 1/5 success rule** on the 15 heights. Proposals that rise above the start are rejected.
  - The current shape is drawn every frame, with a faint ghost of the proposal. History is `line-zoom` of the current best time.
  - About 1500–3000 iterations at a few per frame gives a few seconds of visible evolution.
  - A small toggle overlays the true cycloid as a faint dashed curve, for the "it found the cycloid" moment.

## Demo 2: Compression
- **1D data generator** (shared by p1 and p3): a smooth random function (squared-exponential Gaussian-process sample or random-walk-plus-smoothing) plus mild noise, on ~100 uniform x points.
  - Rejection sampling keeps a dataset only if both the 8-template cosine fit and the best 3-logistic fit reach R² in a "pretty good, not perfect" band (≈ 0.88–0.97).
  - Generator settings are tuned so rejection is rare.
- **p1**: templates are cos(kπx), k = 1…8 (DCT-style, so there is no endpoint mismatch). Amplitudes come from least squares. The fit line starts as the mean.
  - Button k animates the scaled template sliding down from above to mid-plot, then it fades and the fit curve morphs to include it. The button then greys out.
  - "new data" resets everything.
- **p2**: two square boxes: the 128×128 greyscale original and the fit. Basis: the 2D DCT (each template = one horizontal wave × one vertical wave), in JPEG zigzag order. The fit starts as the flat mean.
  - Clicks 1–10 add one template each. After that, it auto-advances with accelerating speed up to K (chosen so the result is "reasonable").
  - Loss = pixel SSE, shown in `line-zoom` plus the Readout. A small "templates: k" counter supports the parameter-count comparison with p4.
  - "difference" button opens a popup with the contrast-normalized (original − fit) image, symmetric grey, so the waves in flat regions show.
- **p3**: 3 narrow vertical panels on the left, one logistic each: y = A/(1+e^{−(x−x₀)/w}), plus a least-squares constant baseline. A wider panel shows the data and the sum.
  - Drag handles: midpoint (x₀), right-end asymptote (A), and the 90% point (w via x₀ + w·ln9).
  - "fit" runs Adam on (x₀, log w, A) for a few seconds, animated. Loss goes in the standard History panel.
  - "new data" re-randomizes and resets the logistics.
- **p4**: same two boxes plus loss history. N units f = A·tanh(s·u)·exp(−v²/2ℓ²), as specified: s = e^ρ, ℓ = e^λ, θ free, coordinates in [−1, 1], plus a bias. Full-batch Adam via **TF.js** (WebGL autodiff; pinned and vendored).
  - Initialization: (x₀, y₀) on a jittered uniform grid, θ uniform, ℓ ≈ 0.6–1.0 so every unit feels the whole image, moderate s, small random A.
  - N (≈ 100–200 → 6N parameters) is tuned so it reaches about p2's final loss with fewer numbers than p2's K, and converges in roughly 10–20 s.
  - "reset" and "run" buttons. The readout counter shows parameter count, matching p2.
- **Image**: chosen *after* p2 and p4 work. Shortlist: US-public-domain film-noir stills on Wikimedia Commons, e.g. *The Maltese Falcon* (1941) trailer, *D.O.A.* (1949), *Detour* (1945). Pick one with both fine detail (face, hat, lettering) and broad flat areas. Crop square, grey, embed in `common/image.js`, and credit it in the README.

## Demo 3: Generalization (TF.js, shared `nn-common.js`: heatmap renderer, data generators, training loop)
- **p1**: XOR of 4 noisy, partly overlapping Gaussian blobs, ~80 training points.
  - Model: 2→~500 hidden (ReLU or tanh)→1 sigmoid, Adam, no regularization. First-layer weights are initialized at a larger scale so sharp islands form within ~10–20 s of training.
  - Background is colored like the playground.
  - History: solid in-sample loss plus a grey dotted out-of-sample loss, computed on a fixed large sample (~2000) from the same distribution.
  - Buttons: "resample data" (model unchanged), "reset model", "train" (start/stop).
- **p2**: disk inside an annulus with little noise. Model 2→3 (tanh/sigmoid)→1.
  - Playground-style network diagram: input nodes and the 3 hidden nodes as mini heatmaps; edges colored orange/blue by sign with width ∝ |w|, updated live.
  - Initialization and learning rate are tuned so random starts converge in a few seconds (target ≥ 90% success).
  - "transform" button stops training and opens a popup: a hand-rotatable 3D view (canvas orthographic projection, mouse-drag rotation) of each point's hidden activations (h₁, h₂, h₃), the warped input grid drawn as a wireframe, and the output layer's separating plane drawn faintly.
- **p3**: the gist's 3-arm spirals (N = 300/class, angle noise 0.2) and its model: 2→100 ReLU→2 (inspection)→3, Adam, weight decay 1e-5.
  - Two equal panels: the input space (class regions + points) and the 2D inspection space (warped grid lines + points + the final linear layer's regions), with a smooth autoscale.
  - **Near-identity initialization**: hidden rows come in ±u pairs of evenly spread unit vectors with zero bias. Second-layer columns = (2/H)·u, so ReLU(u·x)u − ReLU(−u·x)(−u) sums to ≈ x. A small noise term is added. The space therefore starts un-twisted and warps as it trains.
  - A schematic diagram (2 → 100 → 2 → 3, no live weights). Standard loss history.

## Demo 4: Words and attention (trained here, runs in the browser)
- **Training** (`training/`, uv-pinned PyTorch, RTX 3060):
  - Data: Tatoeba eng–fra pairs from manythings.org/anki (CC-BY 2.0 FR, credited). Lowercase; word tokens with punctuation split; French elisions (l', j', d', qu') kept as tokens; ≤ 15 tokens; min-count vocabularies (~12k EN, ~12k FR).
  - Model: English embedding 100-d initialized from GloVe 6B-100d (PDDL) and fine-tuned at a reduced learning rate; bidirectional GRU encoder (256); GRU decoder (256) with **one Bahdanau additive attention**; output projection. Teacher forcing, ~15–20 epochs (< 1 h).
  - Export: float16 `weights.bin`, `manifest.json` (tensor offsets and shapes), and vocab JSON files, ≈ 10–15 MB. A Python reference decode is saved for a JS-parity test.
- **`seq2seq.js`**: plain-JS GRU, attention, and greedy/beam(4) decoding that returns tokens plus the attention matrix.
- **p1**: text field. On Enter, the 100-d vector is shown under it, rounded to 2 decimals in a compact monospace grid. Below that is a scatter plot: brute-force cosine kNN (15) over the embedding, then PCA of those 16 vectors (eigen-decomposition of the 16×16 Gram matrix), shown as labeled dots with the query at the center and axes fitted to all points. Out-of-vocabulary words get a subtle shake.
- **p2**: text field. On Enter, the French translation appears plus an attention matrix in the Figure 3 style (English across the top, French down the side, cell brightness = weight).
  - Acceptance: hand-checked examples show adjective reversal ("the red car" → "la voiture rouge") and article/adjective gender agreement attending to the noun.

## Demo 5: Few-shot learning (base model via local llama.cpp)
- **`serve-llm.sh`**: `llama-server -hf <base GGUF> --port 8080`. llama-server provides `/v1/completions` with SSE streaming and CORS.
  - Default model: **Qwen3-8B-Base Q4_K_M** (~5 GB, fast on Apple Silicon). Optional bigger model: Qwen3-30B-A3B-Base if the Mac has ≥ 32 GB.
  - The exact GGUF repo and file are pinned in the script after testing here (this machine has CUDA torch but no llama.cpp yet; install it into the scratch/uv environment for testing).
- **Page**: one large contenteditable box. The prompt is black and streamed completion tokens are blue spans. "complete" becomes "stop" while streaming.
  - Preset buttons down the side: country→capital, element→symbol, word→antonym, EN→FR, FR→EN, novel-term syllogisms (nonsense nouns, so they can't be memorized), verb-final English, and prepositions→postpositions.
  - Each preset has its own stop sequence and max_tokens (default: finish the current item, stop at the newline).
  - The endpoint URL (default `http://localhost:8080`) and an optional API key are set in a tiny gear dialog and stored in localStorage, never in the repo. This keeps OpenRouter usable if a base model reappears.
  - Note in the README: recommend Chrome. HTTPS GitHub Pages → `http://localhost` is allowed, but Chrome may show a one-time local-network permission prompt. Alternatively serve the pages locally.
- Prompts are tuned against the same GGUF on this machine until every preset completes correctly at temperature 0.

## Order of work
1. `common/` framework + `index.html`.
2. Demo 1 (p1→p3).
3. Demo 3.
4. Demo 2, then pick the image.
5. Kick off Demo 4 training in the background early (download data + GloVe, train), and build the JS inference and pages while it runs.
6. Demo 5.
7. README.

Libraries get pinned exact versions and are vendored in `lib/`. Nothing is committed until Jim asks; the work happens on a feature branch, not `main`.

## Verification
- Serve the repo with `python3 -m http.server` in the background and drive every page with **Chrome DevTools MCP**:
  - Screenshots at 1600×900 and 1280×720, plus an iframe test page, to confirm 16:9 scaling and consistent panel placement.
  - Click through every button.
  - Check `list_console_messages` for errors.
  - Read internal state via `evaluate_script` (each page exposes `window.demo`).
- **Numeric acceptance**:
  - D1: every preset < 5 s and N > 0 along it; the optimizer reaches within ~2% of the discretized cycloid in ≲ 5 s; the RK4 sim and the integral evaluator agree to < 1 ms.
  - D2: over 20 random datasets, the R² bands hold for both 8 cosines and 3 logistics; p4 reaches p2's final loss with fewer parameters.
  - D3: in p1, test loss rises while train loss falls; in p2, ≥ 90% of 20 random inits converge in < 10 s; in p3, accuracy > 95% with a visibly mild initial warp.
  - D4: JS decode matches the Python decode on 50 sentences; held-out translations are sensible; kNN sanity checks ("king", "dog", "red", "run").
  - D5: run llama-server locally with the chosen GGUF and confirm every preset completes correctly and streams in blue.

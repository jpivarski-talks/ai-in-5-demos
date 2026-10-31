# ai-in-5-demos

Interactive widgets for an introduction to AI: optimization → compression → generalization → attention → few-shot learning. Every page is a 16:9 stage (1600×900, scaled to fit the window or an `<iframe>`). They share one layout: the main view on the left, controls below it, the big readout at the top right, and the history plot at the bottom right.

Start at [`index.html`](index.html). ←/→ step between pages. The navigation arrows hide automatically inside an iframe, or with `?embed` in the URL.

There's no build step. Each page is plain HTML and JavaScript. The only library is TensorFlow.js 4.22.0, vendored in `lib/` so the pages work offline.

## Running

```bash
python3 -m http.server 8000        # then open http://localhost:8000/
```

or use GitHub Pages (Settings → Pages → deploy from the `main` branch, root folder). Demos 1–3 also work straight from `file://`. Demos 4 and 5 fetch files, so they need a server.

## The demos

| page | what's on it | controls |
|---|---|---|
| 1.1 `demo1-optimization/1-simulation.html` | frictionless ball on a 15-node slide, timer, bar history | presets, **release** (space); drag nodes by hand |
| 1.2 `…/2-random.html` | random smooth slides (Chebyshev), time computed without animation | **random** (space) |
| 1.3 `…/3-optimize.html` | gradient-free (1+1) evolution strategy on the 15 heights | **random + optimize** (space), **cycloid** overlay |
| 2.1 `demo2-compression/1-fourier-1d.html` | 8 cosine templates fit to data | **1…8** (or keys 1–8 / space), **new data** |
| 2.2 `…/2-fourier-image.html` | 2D cosine templates (JPEG-style), one frequency level per click; auto-advances after 10 | **add templates** (space), **difference**, **reset** |
| 2.3 `…/3-logistic-1d.html` | 3 logistics with draggable handles (midpoint, right end, 90% point) | **fit** (space), **new data** |
| 2.4 `…/4-adaptive-image.html` | 100 functions A·tanh(s·u)·exp(−v²/2ℓ²), fit with Adam | **run** (space), **difference**, **reset** |
| 3.1 `demo3-generalization/1-overfit.html` | 1 hidden layer × 1000 neurons overfitting noisy XOR; in-sample vs out-of-sample loss | **resample data**, **reset model**, **train** |
| 3.2 `…/2-circle.html` | 2 → 3 → 1 network with live weights | **new start**, **train**, **transform** (rotatable 3D view of the hidden layer) |
| 3.3 `…/3-spirals.html` | the gist's 2 → 100 → 2 → 3 network; right panel shows the 2D layer's warped space | **new start**, **train** |
| 4.1 `demo4-attention/1-embedding.html` | type a word + Enter: its 100-d vector and its 15 nearest words (PCA) | text field |
| 4.2 `…/2-translation.html` | type an English sentence + Enter: French translation and the attention matrix | text field |
| 5 `demo5-few-shot/1-complete.html` | base LLM completes the text box (completion in blue) | presets, **complete** (Ctrl/⌘-Enter; shift-click to let it run past the line), ⚙ settings |

Good Demo 4.2 sentences: *My older sister bought a beautiful blue car yesterday.* · *The white car is new.* · *He has a red bicycle and a black car.* · *The old man reads a book.*

## Demo 4's translator

There's no off-the-shelf English→French model with exactly one attention head, so `training/train_translator.py` trains one. It's the architecture of Bahdanau, Cho & Bengio (2014), [arXiv:1409.0473](https://arxiv.org/abs/1409.0473):
- a bidirectional GRU encoder;
- a GRU decoder;
- **one** additive attention between them.

Tokens are whole words. The English embedding (100-d) starts from GloVe and is fine-tuned. The model has 8.4M parameters and took 15 minutes to train on an RTX 3060. Its float16 weights (`demo4-attention/model/`, 17 MB) run in the browser in plain JavaScript (`demo4-attention/seq2seq.js`), so no Python server is needed. The JS output matches PyTorch's on the reference sentences (`model/reference.json`).

To retrain, put the data in `training/data/` and run the script with Python ≥ 3.10, `torch` 2.13, and `numpy` 2.5:
- `fra-eng/fra.txt`, from <https://www.manythings.org/anki/fra-eng.zip>;
- `glove.6B.100d.txt`, from `glove.6B.zip` at <https://nlp.stanford.edu/projects/glove/> (mirrored at <https://huggingface.co/stanfordnlp/glove>).

## Demo 5's base model

OpenRouter currently lists no base (pre-trained only) model with a live provider. Instead, the page talks to any OpenAI-compatible `/v1/completions` endpoint, by default llama.cpp on the presenting laptop:

```bash
brew install llama.cpp
./serve-llm.sh          # Qwen3-8B-Base, Q4_K_M (≈5 GB download the first time)
./serve-llm.sh big      # Qwen3-30B-A3B-Base, Q4_K_M (≈18 GB; needs ≥ 32 GB RAM)
```

All eight presets complete correctly with Qwen3-8B-Base at temperature 0. That was tested with the same GGUF file and llama.cpp b12017 on Linux/CUDA, not yet on a Mac. The ⚙ button changes the endpoint, model name, API key, temperature, and maximum tokens. These are stored only in the browser's localStorage. If a base model reappears on OpenRouter, set the endpoint to `https://openrouter.ai/api`, the model name, and your key.

Use Chrome. A page served from GitHub Pages (https) may call `http://localhost:8080`, but Chrome asks once for permission to reach the local network. Serving the pages locally (above) avoids that.

## Credits

- Demo 2 image: Preston Foster in *Kansas City Confidential* (1952), public domain, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Preston_Foster_in_Kansas_City_Confidential.jpg). Cropped, greyscale, 128×128.
- Demo 4 training data: [Tatoeba](https://tatoeba.org) sentence pairs via [manythings.org/anki](https://www.manythings.org/anki/), CC-BY 2.0 (France). The word vectors are [GloVe](https://nlp.stanford.edu/projects/glove/) (Pennington, Socher & Manning 2014), Public Domain Dedication and License.
- Demo 3.3 follows [this notebook](https://gist.github.com/jpivarski/f99371614ecaa48ace90a6025d430247), adapted from [Atcold/pytorch-Deep-Learning](https://github.com/Atcold/pytorch-Deep-Learning). The colors follow the [TensorFlow Playground](https://playground.tensorflow.org).
- Demo 5 model: [Qwen3](https://huggingface.co/Qwen/Qwen3-8B-Base) base models (Apache 2.0), GGUF quantizations by [mradermacher](https://huggingface.co/mradermacher).

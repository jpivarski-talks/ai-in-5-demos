# ai-in-5-demos

Interactive widgets for an introduction to AI: optimization → compression → generalization → attention → few-shot learning. Every page is a 16:9 stage (1600×900, scaled to fit the window or an `<iframe>`). They share one layout: the main view on the left, controls below it, the big readout at the top right, and the history plot at the bottom right.

[`index.html`](index.html) is the talk (below). [`demos.html`](demos.html) lists the demo pages on their own; ←/→ step between them. The navigation arrows hide automatically inside an iframe, or with `?embed` in the URL.

There's no build step. Each page is plain HTML and JavaScript. The only library is TensorFlow.js 4.22.0, vendored in `lib/` so the pages work offline.

## Running

```bash
python3 -m http.server 8000        # then open http://localhost:8000/ (the talk) or http://localhost:8000/demos.html
```

or use GitHub Pages (Settings → Pages → deploy from the `main` branch, root folder). Demos 1–3 also work straight from `file://`. Demos 4 and 5 fetch files, so they need a server.


## The talk

[`index.html`](index.html) is the slide deck: a title slide, then a placeholder slide before each demo, each demo as a full, interactive slide, and an empty slide at the end. It uses [reveal.js](https://revealjs.com) 6.0.2, vendored in `lib/reveal/` (MIT license), with `talk.css` matching the demos' look. Start the same server as above and open http://localhost:8000/ (the last demo also needs `./serve-llm.sh`). Comments at the top of `index.html` explain how to write slides: ordinary flowing text, `class="at"` with `left`/`top` in slide pixels for exact placement, `class="fragment"` for step-by-step reveals, and `<aside class="notes">` for speaker notes (press S).

Keys: → / PageDown next, ← / PageUp previous, also while a demo has the keyboard: the demos pass those keys to the deck (in `common/stage.js`), except arrows while you're typing in a text box. Arriving on a demo slide gives it the keyboard, so keys like the space bar work right away. A demo restarts each time you come back to it. Hold R (anywhere but a text box) to see the 1600×900 slide's outline and how many pixels the window is from 16:9, for sizing a window to design in; ? lists reveal.js's own keys.

## The demos

| page | what's on it | controls |
|---|---|---|
| 1.1 `demo1-optimization/1-simulation.html` | frictionless ball on a 15-node slide, timer, bar history | presets, **release** (space); drag nodes by hand |
| 1.2 `…/2-random.html` | random smooth slides (Chebyshev), time computed without animation | **random** (space) |
| 1.3 `…/3-optimize.html` | gradient-free (1+1) evolution strategy on the 15 heights | **randomize**, **optimize** (space; starts from the current slide), **show optimal** (the cycloid) |
| 2.1 `demo2-compression/1-fourier-1d.html` | 8 cosine templates fit to data | **1…8** (or keys 1–8 / space), **new data** |
| 2.2 `…/2-fourier-image.html` | 2D cosine templates (JPEG-style), one frequency level per click; auto-advances after 10, up to 2000 numbers | **add template** (space), **show difference**, **reset** |
| 2.3 `…/3-logistic-1d.html` | 5 logistics with draggable handles (midpoint, right end, 90% point) | **randomize** (the logistics start identical), **optimize** (space), **new data** |
| 2.4 `…/4-adaptive-image.html` | 333 adaptive functions, 1999 numbers (300 rotated Gaussian blobs A·exp(−u²/2a²−v²/2b²), 33 edges A·tanh(s·u)·exp(−v²/2ℓ²)), fit with Adam; the weakest are periodically moved to where the error is largest | **optimize** (space), **show difference**, **reset** |
| 3.1 `demo3-generalization/1-overfit.html` | 1 hidden layer × 1000 neurons overfitting noisy XOR; loss on this data vs new data | **resample data**, **reset model**, **optimize** |
| 3.2 `…/2-circle.html` | 2 → 3 → 1 network with live weights; the fit, the hidden layer's 3D space (drag to rotate), and the network | **new start**, **optimize** |
| 3.3 `…/3-spirals.html` | the gist's 2 → 100 → 2 → 3 network; the fit, the warped (u, v) space of the 2D layer, and the network | **new start**, **optimize** |
| 4.1 `demo4-attention/1-embedding.html` | type a word + Enter: its 100-d vector and the nearest words around it. Each word's distance from the center is its dissimilarity (1 − cosine similarity, minus the nearest word's) and the angles come from radius-constrained multidimensional scaling, so the plot is a crop of the whole vocabulary laid out that way, zoomed to about 40 readable words. Or type a sum/difference such as *king − man + woman*: the words' vectors are added (`-` or `−` subtracts) and the plot is centered on the result | text field |
| 4.2 `…/2-translation.html` | type an English sentence + Enter: French translation and the attention matrix ("hot" colormap) | text field |
| 5 `demo5-few-shot/1-complete.html` | base LLM completes the text box (completion in blue); starts empty, temperature 1 | presets (they only fill in the text box), **complete** (Ctrl/⌘-Enter; runs until **stop** unless max tokens is set in ⚙), temperature, ⚙ settings |

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
./serve-llm.sh          # Qwen3-8B-Base, Q4_K_M (≈5 GB download the first time); same as `qwen`
./serve-llm.sh llama    # Llama-3.1-8B (base), Q4_K_M (≈5 GB)
./serve-llm.sh big      # Qwen3-30B-A3B-Base, Q4_K_M (≈18 GB; needs ≥ 32 GB RAM)
```

The measurements in this paragraph are for Qwen3-8B-Base (the default); Llama-3.1-8B hasn't been tested on the presets yet. All seven presets complete correctly with Qwen3-8B-Base at temperature 0; *bicycles* reasons step by step for a few lines before reaching 8 wheels. A preset only fills in the text box, so completing it behaves exactly as if it had been typed: same temperature, same max tokens. With max tokens blank (the default) the model keeps writing until you press **stop**, and after answering it usually invents more examples of its own. The default is temperature 0.5. The temperature box is the only thing that controls randomness: the page turns off llama.cpp's built-in trimming of unlikely words (top-k 40, top-p 0.95, min-p 0.05), which otherwise mutes high temperatures. So temperature 2 really is gibberish, and temperature 1 is plain sampling from the model. At temperature 0.5, *capitals*, both translations, and *syllogisms* were right 8 times out of 8, and *bicycles* 6 of 8. *text → data* was right only 3 of 8 times (it often says Lima, where Diego was born, instead of Montreal), and *made-up language* 2 of 8 (it invents new words). Type 0 in the temperature box (next to **complete**) for those two. Their answers are *lives in=Montreal* and *Kina pim nam sula tal.* Left running, completions start repeating themselves: badly at temperature 0, noticeably at 0.5 after several hundred words, hardly at all at 1. That was tested with the same GGUF file and llama.cpp b12017 on Linux, not yet on a Mac. The ⚙ button changes the endpoint, model name, API key, and maximum tokens. These are stored only in the browser's localStorage. If a base model reappears on OpenRouter, set the endpoint to `https://openrouter.ai/api`, the model name, and your key.

Use Chrome. A page served from GitHub Pages (https) may call `http://localhost:8080`, but Chrome asks once for permission to reach the local network. Serving the pages locally (above) avoids that.

## Credits

- Demo 2 image: Preston Foster in *Kansas City Confidential* (1952), public domain, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Preston_Foster_in_Kansas_City_Confidential.jpg). Cropped, greyscale, 128×128.
- Demo 4 training data: [Tatoeba](https://tatoeba.org) sentence pairs via [manythings.org/anki](https://www.manythings.org/anki/), CC-BY 2.0 (France). The word vectors are [GloVe](https://nlp.stanford.edu/projects/glove/) (Pennington, Socher & Manning 2014), Public Domain Dedication and License.
- Demo 3.3 follows [this notebook](https://gist.github.com/jpivarski/f99371614ecaa48ace90a6025d430247), adapted from [Atcold/pytorch-Deep-Learning](https://github.com/Atcold/pytorch-Deep-Learning). The colors follow the [TensorFlow Playground](https://playground.tensorflow.org).
- Demo 5 models: [Llama 3.1 8B](https://huggingface.co/meta-llama/Llama-3.1-8B) base model (Llama 3.1 Community License) and [Qwen3](https://huggingface.co/Qwen/Qwen3-8B-Base) base models (Apache 2.0), GGUF conversions by [mradermacher](https://huggingface.co/mradermacher).

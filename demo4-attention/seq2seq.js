// In-browser inference for the Demo 4 translator: a bidirectional GRU encoder,
// a GRU decoder, and ONE additive (Bahdanau) attention head between them.
// Mirrors training/train_translator.py; weights are float16 in model/weights.bin.
(function (root) {
  "use strict";

  // ------------------------------------------------------------ float16 -> float32
  function halfToFloat(h) {
    const s = (h & 0x8000) ? -1 : 1, e = (h >> 10) & 0x1f, f = h & 0x3ff;
    if (e === 0) return s * Math.pow(2, -14) * (f / 1024);
    if (e === 31) return f ? NaN : s * Infinity;
    return s * Math.pow(2, e - 15) * (1 + f / 1024);
  }
  let HALF = null;
  function halfTable() {
    if (!HALF) { HALF = new Float32Array(65536); for (let i = 0; i < 65536; i++) HALF[i] = halfToFloat(i); }
    return HALF;
  }

  // ------------------------------------------------------------ tokenizers (same rules as Python)
  function normalize(s) {
    return s.normalize("NFC").replace(/[’‘]/g, "'").replace(/[  ]/g, " ")
      .replace(/[“”]/g, '"').replace(/…/g, "...").toLowerCase().trim();
  }
  const EN_RE = /n't|'s|'m|'re|'ve|'ll|'d|[a-z0-9]+(?:[.-][a-z0-9]+)*|[^\sa-z0-9]/g;
  function tokenizeEn(s) {
    const toks = [];
    for (const word of normalize(s).split(/\s+/).filter(Boolean)) {
      const m = word.match(/^(.*[a-z])(n't)$/);
      if (m) { toks.push(...(m[1].match(EN_RE) || []), "n't"); continue; }
      toks.push(...(word.match(EN_RE) || []));
    }
    return toks;
  }
  // French tokens back into text
  function detokenizeFr(toks) {
    let out = "";
    toks.forEach((t, i) => {
      const prev = i > 0 ? toks[i - 1] : null;
      // elisions (l', j', ...) attach to the next word; French keeps a space before ! ? : ;
      const glue = prev === null || prev.endsWith("'") || prev === "(" || /^(\.|,|\)|\.\.\.)$/.test(t);
      out += (glue ? "" : " ") + t;
    });
    return out.charAt(0).toUpperCase() + out.slice(1);
  }

  // ------------------------------------------------------------ linear algebra
  // y = W x (+ b), W row-major [rows, cols] starting at offset in a Float32Array
  function matvec(W, rows, cols, x, b, out) {
    const y = out || new Float32Array(rows);
    for (let r = 0; r < rows; r++) {
      let s = b ? b[r] : 0;
      const o = r * cols;
      for (let c = 0; c < cols; c++) s += W[o + c] * x[c];
      y[r] = s;
    }
    return y;
  }
  const sigmoid = (x) => 1 / (1 + Math.exp(-x));

  // PyTorch GRU cell: gates stacked as (r, z, n)
  function gru(p, x, h, H) {
    const gi = matvec(p.Wih, 3 * H, x.length, x, p.bih);
    const gh = matvec(p.Whh, 3 * H, H, h, p.bhh);
    const out = new Float32Array(H);
    for (let k = 0; k < H; k++) {
      const r = sigmoid(gi[k] + gh[k]);
      const z = sigmoid(gi[H + k] + gh[H + k]);
      const n = Math.tanh(gi[2 * H + k] + r * gh[2 * H + k]);
      out[k] = (1 - z) * n + z * h[k];
    }
    return out;
  }

  class Translator {
    static async load(base) {
      const [man, buf, en, fr] = await Promise.all([
        fetch(base + "manifest.json").then((r) => r.json()),
        fetch(base + "weights.bin").then((r) => r.arrayBuffer()),
        fetch(base + "vocab_en.json").then((r) => r.json()),
        fetch(base + "vocab_fr.json").then((r) => r.json()),
      ]);
      return new Translator(man, buf, en, fr);
    }
    constructor(man, buf, en, fr) {
      const u16 = new Uint16Array(buf), tab = halfTable();
      const T = {};
      for (const [name, info] of Object.entries(man.tensors)) {
        const n = info.shape.reduce((a, b) => a * b, 1), a = new Float32Array(n);
        for (let i = 0; i < n; i++) a[i] = tab[u16[info.offset + i]];
        T[name] = { data: a, shape: info.shape };
      }
      this.T = T;
      this.en = en; this.fr = fr;
      this.enIndex = new Map(en.map((w, i) => [w, i]));
      this.H = T["init_h.bias"].shape[0];
      this.dimEn = T["emb_en.weight"].shape[1];
      this.dimFr = T["emb_fr.weight"].shape[1];
      const g = (n) => T[n].data;
      this.encF = { Wih: g("encoder.weight_ih_l0"), Whh: g("encoder.weight_hh_l0"), bih: g("encoder.bias_ih_l0"), bhh: g("encoder.bias_hh_l0") };
      this.encB = { Wih: g("encoder.weight_ih_l0_reverse"), Whh: g("encoder.weight_hh_l0_reverse"), bih: g("encoder.bias_ih_l0_reverse"), bhh: g("encoder.bias_hh_l0_reverse") };
      this.dec = { Wih: g("decoder.weight_ih"), Whh: g("decoder.weight_hh"), bih: g("decoder.bias_ih"), bhh: g("decoder.bias_hh") };
      this.BOS = fr.indexOf("<s>"); this.EOS = fr.indexOf("</s>"); this.UNK = en.indexOf("<unk>");
    }

    // ---- the English word embedding
    vector(word) {
      const i = this.enIndex.get(word);
      if (i === undefined) return null;
      const d = this.dimEn;
      return this.T["emb_en.weight"].data.slice(i * d, (i + 1) * d);
    }
    // k nearest words by cosine similarity (skipping punctuation and special tokens)
    neighbors(word, k) {
      const E = this.T["emb_en.weight"].data, d = this.dimEn, n = this.en.length;
      if (!this.norms) {
        this.norms = new Float32Array(n);
        for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < d; j++) s += E[i * d + j] ** 2; this.norms[i] = Math.sqrt(s) || 1; }
      }
      const q = this.enIndex.get(word);
      const out = [];
      for (let i = 4; i < n; i++) {
        if (i === q || !/^[a-z][a-z-]*$/.test(this.en[i])) continue;
        let s = 0;
        for (let j = 0; j < d; j++) s += E[q * d + j] * E[i * d + j];
        out.push([s / (this.norms[q] * this.norms[i]), i]);
      }
      out.sort((a, b) => b[0] - a[0]);
      return out.slice(0, k).map(([s, i]) => ({ word: this.en[i], sim: s, vec: E.slice(i * d, (i + 1) * d) }));
    }

    // ---- translation (greedy decoding); returns tokens and the attention weights
    translate(text, maxLen) {
      const H = this.H, T = this.T;
      const src = tokenizeEn(text);
      const ids = src.map((w) => (this.enIndex.has(w) ? this.enIndex.get(w) : this.UNK));
      const n = ids.length;
      if (n === 0) return { src: [], tgt: [], att: [] };
      const E = T["emb_en.weight"].data, d = this.dimEn;
      const xs = ids.map((i) => E.subarray(i * d, (i + 1) * d));
      // bidirectional encoder
      const fwd = [], bwd = new Array(n);
      let h = new Float32Array(H);
      for (let t = 0; t < n; t++) { h = gru(this.encF, xs[t], h, H); fwd.push(h); }
      h = new Float32Array(H);
      for (let t = n - 1; t >= 0; t--) { h = gru(this.encB, xs[t], h, H); bwd[t] = h; }
      const ann = [];
      for (let t = 0; t < n; t++) { const a = new Float32Array(2 * H); a.set(fwd[t]); a.set(bwd[t], H); ann.push(a); }
      let s = matvec(T["init_h.weight"].data, H, H, bwd[0], T["init_h.bias"].data).map(Math.tanh);
      const A = T["att_W.weight"].shape[0];
      const UH = ann.map((a) => matvec(T["att_U.weight"].data, A, 2 * H, a, T["att_U.bias"].data));
      const v = T["att_v.weight"].data;
      const Ef = T["emb_fr.weight"].data, df = this.dimFr, V = this.fr.length;
      const tgt = [], att = [];
      let y = this.BOS;
      for (let step = 0; step < (maxLen || 25); step++) {
        const emb = Ef.subarray(y * df, (y + 1) * df);
        // the attention head: score every source word against the decoder state
        const Ws = matvec(T["att_W.weight"].data, A, H, s);
        const e = new Float32Array(n);
        for (let j = 0; j < n; j++) { let z = 0; for (let k = 0; k < A; k++) z += v[k] * Math.tanh(Ws[k] + UH[j][k]); e[j] = z; }
        const m = Math.max(...e);
        let sum = 0;
        for (let j = 0; j < n; j++) { e[j] = Math.exp(e[j] - m); sum += e[j]; }
        for (let j = 0; j < n; j++) e[j] /= sum;
        const c = new Float32Array(2 * H);
        for (let j = 0; j < n; j++) for (let k = 0; k < 2 * H; k++) c[k] += e[j] * ann[j][k];
        const inp = new Float32Array(df + 2 * H); inp.set(emb); inp.set(c, df);
        s = gru(this.dec, inp, s, H);
        const cat = new Float32Array(H + 2 * H + df); cat.set(s); cat.set(c, H); cat.set(emb, 3 * H);
        const t = matvec(T["pre_out.weight"].data, T["pre_out.bias"].shape[0], cat.length, cat, T["pre_out.bias"].data).map(Math.tanh);
        const logits = matvec(T["out.weight"].data, V, t.length, t, T["out.bias"].data);
        let best = 0;
        for (let k = 1; k < V; k++) if (logits[k] > logits[best]) best = k;
        if (best === this.EOS) break;
        tgt.push(this.fr[best]);
        att.push(Array.from(e));
        y = best;
      }
      return { src, tgt, att, unknown: src.filter((w) => !this.enIndex.has(w)) };
    }
  }

  root.Seq2Seq = { Translator, tokenizeEn, detokenizeFr };
})(typeof window !== "undefined" ? window : globalThis);

"""
Train a small English -> French translator with exactly one attention head
(Bahdanau et al. 2014, arXiv:1409.0473): a bidirectional GRU encoder, a GRU
decoder, and one additive attention between them. Tokens are whole words.

The English word embedding is initialized from GloVe 6B 100d and fine-tuned.

Inputs (see README.md in this directory):
    data/fra-eng/fra.txt      Tatoeba sentence pairs from manythings.org/anki
    data/glove.6B.100d.txt    GloVe vectors from Stanford NLP

Outputs (written to ../demo4-attention/model/):
    manifest.json, weights.bin, vocab_en.json, vocab_fr.json, reference.json
"""

import argparse
import json
import math
import random
import re
import time
import unicodedata
from collections import Counter
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.nn.utils.rnn import pack_padded_sequence, pad_packed_sequence

HERE = Path(__file__).resolve().parent
DATA = HERE / "data"
OUT = HERE.parent / "demo4-attention" / "model"
RUNS = HERE / "runs"

PAD, BOS, EOS, UNK = "<pad>", "<s>", "</s>", "<unk>"
SPECIALS = [PAD, BOS, EOS, UNK]
MAX_LEN = 15

# ---------------------------------------------------------------- tokenizers
# (the same rules are reimplemented in demo4-attention/seq2seq.js)


def normalize(s):
    s = unicodedata.normalize("NFC", s)
    s = s.replace("’", "'").replace("‘", "'").replace(" ", " ")
    s = s.replace(" ", " ").replace("“", '"').replace("”", '"')
    s = s.replace("…", "...")
    return s.lower().strip()


EN_RE = re.compile(r"n't|'s|'m|'re|'ve|'ll|'d|[a-z0-9]+(?:[.-][a-z0-9]+)*|[^\sa-z0-9]")


def tokenize_en(s):
    s = normalize(s)
    toks = []
    for word in s.split():
        # GloVe-style contractions: don't -> do n't, i'm -> i 'm
        m = re.match(r"^(.*[a-z])(n't)$", word)
        if m:
            toks += EN_RE.findall(m.group(1)) + ["n't"]
            continue
        toks += EN_RE.findall(word)
    return toks


FR_KEEP = {"aujourd'hui", "quelqu'un", "quelqu'une", "presqu'île", "prud'homme"}
FR_RE = re.compile(r"[a-zà-öø-ÿœæ0-9]+'|[a-zà-öø-ÿœæ0-9]+(?:[-.][a-zà-öø-ÿœæ0-9]+)*|[^\s]")


def tokenize_fr(s):
    s = normalize(s)
    toks = []
    for word in s.split():
        if word.strip(".,!?;:") in FR_KEEP:
            core = word.strip(".,!?;:")
            toks.append(core)
            toks += list(word[len(core):])
            continue
        toks += FR_RE.findall(word)
    return toks


# ---------------------------------------------------------------- data


def load_pairs():
    pairs = []
    with open(DATA / "fra-eng" / "fra.txt", encoding="utf-8") as f:
        for line in f:
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 2:
                continue
            en, fr = tokenize_en(parts[0]), tokenize_fr(parts[1])
            if 0 < len(en) <= MAX_LEN and 0 < len(fr) <= MAX_LEN:
                pairs.append((en, fr))
    return pairs


def build_vocab(seqs, min_count):
    c = Counter(t for s in seqs for t in s)
    words = [w for w, n in sorted(c.items(), key=lambda x: (-x[1], x[0])) if n >= min_count]
    itos = SPECIALS + words
    return itos, {w: i for i, w in enumerate(itos)}


def encode(seq, stoi):
    unk = stoi[UNK]
    return [stoi.get(t, unk) for t in seq]


def load_glove(itos, dim=100):
    want = set(itos)
    found = {}
    with open(DATA / "glove.6B.100d.txt", encoding="utf-8") as f:
        for line in f:
            w, rest = line.split(" ", 1)
            if w in want:
                found[w] = np.asarray(rest.split(), dtype=np.float32)
    std = np.std(np.stack(list(found.values())))
    rng = np.random.default_rng(0)
    E = rng.normal(0, std, size=(len(itos), dim)).astype(np.float32)
    for i, w in enumerate(itos):
        if w in found:
            E[i] = found[w]
    E[0] = 0
    return E, len(found)


# ---------------------------------------------------------------- model


class Translator(nn.Module):
    def __init__(self, n_en, n_fr, emb_en=100, emb_fr=128, hid=256, att=256, out=256, drop=0.2):
        super().__init__()
        self.hid = hid
        self.emb_en = nn.Embedding(n_en, emb_en, padding_idx=0)
        self.encoder = nn.GRU(emb_en, hid, batch_first=True, bidirectional=True)
        self.init_h = nn.Linear(hid, hid)  # from the backward state at the first word
        self.emb_fr = nn.Embedding(n_fr, emb_fr, padding_idx=0)
        self.decoder = nn.GRUCell(emb_fr + 2 * hid, hid)
        # the single attention head (additive / "concat" attention)
        self.att_W = nn.Linear(hid, att, bias=False)  # decoder state
        self.att_U = nn.Linear(2 * hid, att)  # encoder annotations
        self.att_v = nn.Linear(att, 1, bias=False)
        self.pre_out = nn.Linear(hid + 2 * hid + emb_fr, out)
        self.out = nn.Linear(out, n_fr)
        self.drop = nn.Dropout(drop)

    def encode(self, src, src_len):
        x = self.drop(self.emb_en(src))
        packed = pack_padded_sequence(x, src_len.cpu(), batch_first=True, enforce_sorted=False)
        H, _ = self.encoder(packed)
        H, _ = pad_packed_sequence(H, batch_first=True, total_length=src.shape[1])
        s0 = torch.tanh(self.init_h(H[:, 0, self.hid:]))
        return H, s0

    def attend(self, s, H, UH, mask):
        e = self.att_v(torch.tanh(self.att_W(s)[:, None, :] + UH)).squeeze(-1)
        e = e.masked_fill(~mask, -1e9)
        a = torch.softmax(e, dim=-1)
        c = torch.bmm(a[:, None, :], H).squeeze(1)
        return a, c

    def step(self, y_prev, s, H, UH, mask):
        emb = self.drop(self.emb_fr(y_prev))
        a, c = self.attend(s, H, UH, mask)
        s = self.decoder(torch.cat([emb, c], -1), s)
        t = torch.tanh(self.pre_out(self.drop(torch.cat([s, c, emb], -1))))
        return self.out(t), s, a

    def forward(self, src, src_len, tgt_in):
        H, s = self.encode(src, src_len)
        UH = self.att_U(H)
        mask = src != 0
        logits = []
        for t in range(tgt_in.shape[1]):
            lo, s, _ = self.step(tgt_in[:, t], s, H, UH, mask)
            logits.append(lo)
        return torch.stack(logits, 1)

    @torch.no_grad()
    def greedy(self, src_ids, bos, eos, max_len=MAX_LEN + 5):
        src = torch.tensor([src_ids], device=self.out.weight.device)
        H, s = self.encode(src, torch.tensor([len(src_ids)]))
        UH = self.att_U(H)
        mask = src != 0
        y = torch.tensor([bos], device=src.device)
        out, atts = [], []
        for _ in range(max_len):
            lo, s, a = self.step(y, s, H, UH, mask)
            y = lo.argmax(-1)
            atts.append(a[0].tolist())
            if y.item() == eos:
                break
            out.append(y.item())
        return out, atts


# ---------------------------------------------------------------- training


def batches(data, bs, shuffle=True):
    idx = list(range(len(data)))
    if shuffle:
        random.shuffle(idx)
    # bucket by length for speed
    chunks = [idx[i:i + bs * 50] for i in range(0, len(idx), bs * 50)]
    for ch in chunks:
        ch.sort(key=lambda i: len(data[i][0]))
        bl = [ch[i:i + bs] for i in range(0, len(ch), bs)]
        if shuffle:
            random.shuffle(bl)
        for b in bl:
            yield [data[i] for i in b]


def collate(b, bos, eos, device):
    ls = max(len(s) for s, _ in b)
    lt = max(len(t) for _, t in b) + 1
    src = torch.zeros(len(b), ls, dtype=torch.long)
    tin = torch.zeros(len(b), lt, dtype=torch.long)
    tout = torch.zeros(len(b), lt, dtype=torch.long)
    for i, (s, t) in enumerate(b):
        src[i, :len(s)] = torch.tensor(s)
        tin[i, :len(t) + 1] = torch.tensor([bos] + t)
        tout[i, :len(t) + 1] = torch.tensor(t + [eos])
    lens = torch.tensor([len(s) for s, _ in b])
    return src.to(device), lens, tin.to(device), tout.to(device)


PROBES = [
    "the red car is fast.",
    "i have a black cat.",
    "she bought a white dress.",
    "the little girl is happy.",
    "my mother is a doctor.",
    "we saw a big house near the river.",
    "the old man reads a book.",
    "he gave the green apple to his sister.",
    "they are going to the beach tomorrow.",
    "the european economic area was signed in august.",
    "i don't like this movie.",
    "where is the train station?",
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--epochs", type=int, default=18)
    ap.add_argument("--bs", type=int, default=128)
    ap.add_argument("--lr", type=float, default=1e-3)
    ap.add_argument("--emb-lr", type=float, default=2e-4)
    ap.add_argument("--min-en", type=int, default=2)
    ap.add_argument("--min-fr", type=int, default=3)
    args = ap.parse_args()

    random.seed(0)
    torch.manual_seed(0)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    pairs = load_pairs()
    print(f"{len(pairs)} pairs")
    en_itos, en_stoi = build_vocab([p[0] for p in pairs], args.min_en)
    fr_itos, fr_stoi = build_vocab([p[1] for p in pairs], args.min_fr)
    print(f"vocab en={len(en_itos)} fr={len(fr_itos)}")
    data = [(encode(e, en_stoi), encode(f, fr_stoi)) for e, f in pairs]
    random.shuffle(data)
    n_val = 3000
    val, train = data[:n_val], data[n_val:]

    E, n_glove = load_glove(en_itos)
    print(f"GloVe covers {n_glove}/{len(en_itos)} English words")

    model = Translator(len(en_itos), len(fr_itos)).to(device)
    with torch.no_grad():
        model.emb_en.weight.copy_(torch.from_numpy(E))
    emb_params = list(model.emb_en.parameters())
    other = [p for n, p in model.named_parameters() if not n.startswith("emb_en.")]
    opt = torch.optim.Adam([{"params": other, "lr": args.lr},
                            {"params": emb_params, "lr": args.emb_lr}])
    sched = torch.optim.lr_scheduler.MultiplicativeLR(opt, lambda e: 0.85 if e >= 8 else 1.0)
    print(sum(p.numel() for p in model.parameters()), "parameters")

    bos, eos = fr_stoi[BOS], fr_stoi[EOS]
    RUNS.mkdir(exist_ok=True)
    best = math.inf
    for epoch in range(args.epochs):
        model.train()
        t0, tot, cnt = time.time(), 0.0, 0
        for b in batches(train, args.bs):
            src, lens, tin, tout = collate(b, bos, eos, device)
            logits = model(src, lens, tin)
            loss = F.cross_entropy(logits.reshape(-1, logits.shape[-1]), tout.reshape(-1),
                                   ignore_index=0, label_smoothing=0.1)
            opt.zero_grad()
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step()
            tot += loss.item()
            cnt += 1
        sched.step()
        model.eval()
        with torch.no_grad():
            vt, vc = 0.0, 0
            for b in batches(val, 256, shuffle=False):
                src, lens, tin, tout = collate(b, bos, eos, device)
                logits = model(src, lens, tin)
                vt += F.cross_entropy(logits.reshape(-1, logits.shape[-1]), tout.reshape(-1),
                                      ignore_index=0).item()
                vc += 1
        vl = vt / vc
        print(f"epoch {epoch + 1}: train {tot / cnt:.3f}  val {vl:.3f}  ({time.time() - t0:.0f}s)")
        for s in PROBES[:4]:
            ids, _ = model.greedy(encode(tokenize_en(s), en_stoi), bos, eos)
            print("   ", s, "->", " ".join(fr_itos[i] for i in ids))
        if vl < best:
            best = vl
            torch.save(model.state_dict(), RUNS / "best.pt")

    model.load_state_dict(torch.load(RUNS / "best.pt"))
    model.eval()
    export(model.cpu(), en_itos, fr_itos)


def export(model, en_itos, fr_itos):
    OUT.mkdir(parents=True, exist_ok=True)
    sd = model.state_dict()
    names = [
        "emb_en.weight",
        "encoder.weight_ih_l0", "encoder.weight_hh_l0", "encoder.bias_ih_l0", "encoder.bias_hh_l0",
        "encoder.weight_ih_l0_reverse", "encoder.weight_hh_l0_reverse",
        "encoder.bias_ih_l0_reverse", "encoder.bias_hh_l0_reverse",
        "init_h.weight", "init_h.bias",
        "emb_fr.weight",
        "decoder.weight_ih", "decoder.weight_hh", "decoder.bias_ih", "decoder.bias_hh",
        "att_W.weight", "att_U.weight", "att_U.bias", "att_v.weight",
        "pre_out.weight", "pre_out.bias", "out.weight", "out.bias",
    ]
    manifest, chunks, offset = {"dtype": "float16", "tensors": {}}, [], 0
    for n in names:
        a = sd[n].numpy().astype(np.float16)
        manifest["tensors"][n] = {"shape": list(a.shape), "offset": offset}
        chunks.append(a.ravel())
        offset += a.size
    np.concatenate(chunks).tofile(OUT / "weights.bin")
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=1))
    (OUT / "vocab_en.json").write_text(json.dumps(en_itos, ensure_ascii=False))
    (OUT / "vocab_fr.json").write_text(json.dumps(fr_itos, ensure_ascii=False))

    # reference translations (from the float16-rounded weights) for a JS parity test
    with torch.no_grad():
        for n in names:
            sd[n].copy_(sd[n].half().float())
    model.load_state_dict(sd)
    en_stoi = {w: i for i, w in enumerate(en_itos)}
    bos, eos = fr_itos.index(BOS), fr_itos.index(EOS)
    ref = []
    for s in PROBES:
        ids = encode(tokenize_en(s), en_stoi)
        out, atts = model.greedy(ids, bos, eos)
        ref.append({"en": s, "src": [en_itos[i] for i in ids],
                    "fr": [fr_itos[i] for i in out], "att": atts})
        print(s, "->", " ".join(fr_itos[i] for i in out))
    (OUT / "reference.json").write_text(json.dumps(ref, ensure_ascii=False))
    print("exported", offset, "parameters to", OUT)


if __name__ == "__main__":
    main()

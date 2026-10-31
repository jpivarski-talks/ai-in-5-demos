#!/usr/bin/env bash
# Start a local base (not instruction-tuned) language model for Demo 5.
#
# Needs llama.cpp's llama-server: on a Mac, `brew install llama.cpp`
# (or download a release from https://github.com/ggml-org/llama.cpp/releases).
# The first run downloads the model (~5 GB) into llama.cpp's cache.
#
#   ./serve-llm.sh          Qwen3-8B-Base (needs ~6 GB of free memory)
#   ./serve-llm.sh big      Qwen3-30B-A3B-Base (needs ~20 GB; better at the harder prompts)
#
# Then open demo5-few-shot/1-complete.html; it talks to http://localhost:8080.
# --context-shift lets a completion run indefinitely: when the 4096-token context fills up,
# the oldest text is dropped instead of stopping.
set -euo pipefail

case "${1:-}" in
  big)
    REPO=mradermacher/Qwen3-30B-A3B-Base-GGUF   # revision c8063198732762d149f728f1e05021eeb3df95d1
    FILE=Qwen3-30B-A3B-Base.Q4_K_M.gguf
    ;;
  *)
    REPO=mradermacher/Qwen3-8B-Base-GGUF        # revision 11c0eaa7581c2cedab123814f676ff44da1bc7b0
    FILE=Qwen3-8B-Base.Q4_K_M.gguf
    ;;
esac

exec llama-server \
  --hf-repo "$REPO" --hf-file "$FILE" \
  --host 127.0.0.1 --port 8080 \
  --ctx-size 4096 \
  --context-shift \
  --n-gpu-layers 999

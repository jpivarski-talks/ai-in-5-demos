# Demo 5 (few-shot): model choice and candidate presets

## Recommendation: Llama-2-13B base

Use **Llama-2-13B** (base, not chat), `TheBloke/Llama-2-13B-GGUF`, file `llama-2-13b.Q4_K_M.gguf` (7.9 GB). It is now in `serve-llm.sh` as `./serve-llm.sh llama2` (the default is unchanged).

Why:

- **No instruction-tuning leakage in any test.** Its pretraining data ends in September 2022, before ChatGPT. Asked "Write a story about a dragon..." or "Can you write a short poem...", it writes what a web page would: a worksheet, a forum question, a link. It never writes the poem the way a chatbot would. Qwen3-8B opens with "Sure, here's a short poem" (3/3). Qwen3-30B wrote out an Orca-style system prompt ("You are an AI assistant. User will you give you a task...") and GSM8K-style "[Question] ... [Answer] ... The answer is" blocks.
- **It does both demos well.** Many book questions and task inputs score 7/8 or 8/8 at temperature 0.5, the demo's default. On the book questions it is the best of the models without chat leakage, with Mistral-7B close behind: Alice 48% (Mistral 40%, Llama 3.1 8B 37%) and Harry Potter 54% (Mistral 55%, Llama 3.1 8B 45%). Mistral is post-ChatGPT and adds web-page markdown, and it writes the dragon story when told to; Llama-2-13B does neither.
- **Small enough for the MacBook:** 7.9 GB file, about 9 GB of memory with the 4096-token context. It runs at 38 tokens/s on the RTX 3060, fully on the GPU. I did not measure the Mac.

Costs, so you can decide:

- **Qwen3-30B-A3B is more accurate overall:** Harry Potter 83%, Alice 67%, and 48/48 on "which is heavier" where Llama-2-13B gets 20/48. It is also the only model here that solves the current "bicycles" preset (3/3), but it does so by writing out "3 × 2 = 6 ..." steps. That is the instruction-data behavior you want to avoid.
- **Llama-2-13B fails some reasoning tasks.** "Which is heavier", "sort by size" and "which sense" are weak, so don't take audience inputs for those on this model. It also fails two current presets: "bicycles" (it answers "Four", 0/3) and "made-up language" (0/3 at temperature 0.5). Capitals, English → French and syllogisms all score 3/3.
- **No model knows Winnie-the-Pooh well** (5-14% on all six models). Use Alice and Harry Potter for goal 1.

## How this was tested

- **Harness and logs** are in the scratchpad: `/tmp/claude-1000/-home-jpivarski-dsi-ai-in-5-demos/47e3f3b5-2ec1-44a4-8932-061775a24a15/scratchpad/harness` (`prompts.py`, `run.py`, `grade.py`, `greps.py`, `leak.py`) and `.../scratchpad/logs`. Every raw completion is in `logs/<model>.jsonl` and every open-ended run in `logs/<model>.leak.jsonl`. The scratchpad is temporary, so copy it if you want to keep it.
- **Server:** llama-server with the same flags as `serve-llm.sh` (`--ctx-size 4096 --context-shift`), one model at a time.
- **Sampling** is the same as `1-complete.html`: `top_p 1, top_k 0, min_p 0`. Each prompt got 1 completion at temperature 0 and 8 at temperature 0.5. "k/8" below is the number of correct ones among the 8.
- **Stop sequence:** for testing, completions stopped at the end of the item (`\n`). A stop sequence doesn't change how the tokens before it are sampled, so the first line is distributed the same as in the demo, which has no stop.
- **Grading:** answers were graded by regular expressions against the expected answers. I then read the answers and tightened the regexes where they accepted wrong ones (e.g. "both wands are made of holly", "Eeyore ate the honey").
- **Models** were Q4_K_M quantizations. Abbreviations: L2-13B Llama-2-13B, L2-7B Llama-2-7B, L3.1-8B Meta-Llama-3.1-8B, M-7B Mistral-7B-v0.1, Q3-8B Qwen3-8B-Base, Q3-30B Qwen3-30B-A3B-Base.
- **Llama-2-7B was deleted early.** It was clearly weakest, and deleting it made room for Qwen3-30B. It is missing from the later additions (the verbatim openings, 3 Alice and 9 Harry Potter questions, 5 tasks, and the current-preset runs), marked "–".

## Models compared

| | L2-13B | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|
| Alice Q&A, T=0.5 | 48% (96/200) | 23% (41/176) | 37% (74/200) | 40% (79/200) | 36% (73/200) | 66% (133/200) |
| Pooh Q&A, T=0.5 | 11% (21/184) | 5% (10/184) | 14% (25/184) | 10% (19/184) | 9% (16/184) | 12% (22/184) |
| Harry Potter Q&A, T=0.5 | 54% (133/248) | 35% (61/176) | 45% (111/248) | 55% (136/248) | 49% (122/248) | 83% (205/248) |
| cloze sentences, T=0.5 | 52% (46/88) | 32% (28/88) | 43% (38/88) | 42% (37/88) | 26% (23/88) | 55% (48/88) |
| 25 tasks (goal 2), T=0.5 | 80% (1093/1360) | 75% (816/1088) | 81% (1097/1360) | 82% (1120/1360) | 87% (1184/1360) | 93% (1266/1360) |
| book items with ≥7/8 and T=0 right | 24/90 | 8/78 | 22/90 | 23/90 | 22/90 | 39/90 |
| task inputs with ≥7/8 and T=0 right | 123/170 | 89/136 | 123/170 | 125/170 | 141/170 | 150/170 |
| expected-failure tasks (letters, two hops), T=0.5 | 5% | 8% | 9% | 9% | 29% | 35% |
| generation speed on the RTX 3060, tokens/s (median) | 38 | 71 | 60 | 68 | 59 | 13 |
| file size (Q4_K_M) | 7.9 GB | ≈4.1 GB | 4.9 GB | ≈4.4 GB | 5.0 GB | ≈18.6 GB |
| memory needed, roughly | ~9 GB | ~5 GB | ~6 GB | ~5 GB | ~6 GB | ~20 GB |
| current presets, 3 samples at T=0.5: capitals / English→French / made-up language / syllogisms / bicycles | 3/3, 3/3, 0/3, 3/3, 0/3 | –, –, –, –, 0/3 | 3/3, 3/3, 2/3, 3/3, 0/3 | 3/3, 3/3, 0/3, 3/3, 0/3 | 3/3, 3/3, 1/3, 3/3, 2/3 | 3/3, 3/3, 0/3, 3/3, 3/3 |
| instruction-tuning leakage (hand-read, 18-39 open-ended runs of 150-200 tokens each) | none seen; instructions come back as worksheets, forum posts, links | one forum-style "Yes, you can write a short poem... Here is an example:" | no chat; exam boilerplate: "Explanation:" after answers, A/B/C/D options for "Explain why the sky is blue" (3/3) | no chat; web-page markdown ("## Top 10 Cities"), worksheet "### Instructions" | "Sure, here's a short poem" (3/3), "Step 1:" solutions, does what it's told on all 9 imperative prompts | Orca system prompt in a trivia answer, "[Question]/[Answer]... The answer is" (2/3), bold-markdown lists, does what it's told on all 9 imperative prompts |
| pretraining data | through Sept 2022 (before ChatGPT) | same | through end of 2023 | 2023 (released Sept 2023) | 2025 | 2025 |

Notes on the table:

- **Speed:** Qwen3-30B-A3B doesn't fit in the 3060's 12 GB, so part of it runs from CPU RAM. That's why it is slow here (13 tokens/s). On a Mac with enough unified memory it should be much faster, because only about 3B parameters are active per token. I did not measure this.
- **Ranking:** on the book questions, Llama-2-13B and Mistral-7B are roughly tied for second behind Qwen3-30B. On the 25 tasks it is slightly behind the other 7-8B models (80% vs 81-82%) and behind both Qwen models (87%, 93%), mostly because of the size/weight/sense tasks.
- **Licenses:** Llama 2 is under Meta's Llama 2 Community License, like Llama 3.1's license; the TheBloke conversion is ungated.

## Goal 1: the model contains the book, and you can ask it questions in plain English

- **Background:** Cooper et al. (2025), "Extracting memorized pieces of (copyrighted) books from open-weight language models", arXiv:2505.12546. They show that some open-weight models can reproduce long verbatim passages of some books; the strongest case is Llama 3.1 70B on the first Harry Potter book. The demo shows the other half of the analogy: unlike a digital book, the model answers paraphrased questions whose answers a word search can't find.
- **Prompt format.** Each Q&A prompt is a header line, three solved Q/A pairs from the same book, and the target question (the full text is shown for each candidate). For the cloze variants, a bare sentence is completed with no examples.
- **Texts and grep.** The texts are Project Gutenberg #11 (Alice) and #67098 (Winnie-the-Pooh, 1926). They were downloaded from the gutenberg.pglaf.org mirror because gutenberg.org was down for maintenance. Line numbers refer to those files. Each "Grep" line shows the search a reader would try with the question's own words (case-insensitive, one line at a time). It also shows how many matching lines have the answer word on the same line or within 2 lines, and where I confirmed the answer in the text. Harry Potter was not downloaded; those answers are judged from my knowledge of the books.
- **What the results say:**
  - Harry Potter is the best-known book on every model.
  - Alice is in between.
  - Winnie-the-Pooh is poorly known by every model, even though they all continue its first sentence verbatim.
  - Questions that grep can't answer work about as well as ones it can: alice-infant 7/8, alice-trial 6/8, hp-whydoe 8/8.

### Alice's Adventures in Wonderland

#### alice-baby: What did the baby that the Duchess was nursing turn into?

```
Questions and answers about Alice's Adventures in Wonderland by Lewis Carroll

Q: What was written on the little bottle that made Alice shrink?
A: DRINK ME.

Q: What is the name of Alice's cat?
A: Dinah.

Q: Why did Alice follow the White Rabbit down the hole?
A: She was curious, because she had never seen a rabbit with a waistcoat-pocket and a watch.

Q: What did the baby that the Duchess was nursing turn into?
A:
```

- Expected: a pig
- L2-13B at T=0: `A pig.` (right)
- L2-13B at T=0.5: **8/8**; other models k/8: L2-7B 8 · L3.1-8B 8 · M-7B 7 · Q3-8B 8 · Q3-30B 8
- Grep: `\bbaby\b.*\bturn` → 0 lines, 0 with the answer within 2 lines; `\binto\b.*\bbaby|\bbaby\b.*\binto\b` → 1 lines, 0 with the answer within 2 lines. Answer confirmed at line 1434.
- Note: Stated in Ch. VI, but not in one searchable sentence: the line with "turn into a pig" (1434) doesn't contain "baby".

#### alice-mushroom: Who told Alice that one side of the mushroom would make her grow taller?

```
Questions and answers about Alice's Adventures in Wonderland by Lewis Carroll

Q: What was written on the little bottle that made Alice shrink?
A: DRINK ME.

Q: What is the name of Alice's cat?
A: Dinah.

Q: Why did Alice follow the White Rabbit down the hole?
A: She was curious, because she had never seen a rabbit with a waistcoat-pocket and a watch.

Q: Who told Alice that one side of the mushroom would make her grow taller?
A:
```

- Expected: the Caterpillar
- L2-13B at T=0: `The Caterpillar.` (right)
- L2-13B at T=0.5: **8/8**; other models k/8: L2-7B 4 · L3.1-8B 1 · M-7B 4 · Q3-8B 8 · Q3-30B 3
- Grep: `taller` → 2 lines, 0 with the answer within 2 lines; `one side` → 5 lines, 0 with the answer within 2 lines. Answer confirmed at line 1092.
- Note: The speaker is only "it" in the matching sentence (line 1092, "merely remarking as it went"); "Caterpillar" is 3 lines earlier, outside every line that matches "one side" or "taller".

#### alice-queen: What does the Queen of Hearts shout over and over?

```
Questions and answers about Alice's Adventures in Wonderland by Lewis Carroll

Q: What was written on the little bottle that made Alice shrink?
A: DRINK ME.

Q: What is the name of Alice's cat?
A: Dinah.

Q: Why did Alice follow the White Rabbit down the hole?
A: She was curious, because she had never seen a rabbit with a waistcoat-pocket and a watch.

Q: What does the Queen of Hearts shout over and over?
A:
```

- Expected: "Off with his/her head!"
- L2-13B at T=0: `OFF WITH HER HEAD!` (right)
- L2-13B at T=0.5: **8/8**; other models k/8: L2-7B 7 · L3.1-8B 8 · M-7B 8 · Q3-8B 8 · Q3-30B 8
- Grep: `shout` → 11 lines, 3 with the answer within 2 lines. Answer confirmed at line 1733, 1987, 2012.
- Note: A frequency question: "Off with ..." is spread over 8 places; searching the question's word "shout" finds it 3 times out of 11.

#### alice-sleepy: Which guest at the tea-party kept falling asleep?

```
Questions and answers about Alice's Adventures in Wonderland by Lewis Carroll

Q: What was written on the little bottle that made Alice shrink?
A: DRINK ME.

Q: What is the name of Alice's cat?
A: Dinah.

Q: Why did Alice follow the White Rabbit down the hole?
A: She was curious, because she had never seen a rabbit with a waistcoat-pocket and a watch.

Q: Which guest at the tea-party kept falling asleep?
A:
```

- Expected: the Dormouse
- L2-13B at T=0: `The Dormouse.` (right)
- L2-13B at T=0.5: **8/8**; other models k/8: L2-7B 2 · L3.1-8B 7 · M-7B 4 · Q3-8B 8 · Q3-30B 8
- Grep: `asleep` → 8 lines, 6 with the answer within 2 lines. Answer confirmed at line 1561, 1564, 1616.
- Note: Easy for grep: most "asleep" lines mention the Dormouse. A control.

#### alice-key: What did Alice want to open with the little golden key?

```
Questions and answers about Alice's Adventures in Wonderland by Lewis Carroll

Q: What was written on the little bottle that made Alice shrink?
A: DRINK ME.

Q: What is the name of Alice's cat?
A: Dinah.

Q: Why did Alice follow the White Rabbit down the hole?
A: She was curious, because she had never seen a rabbit with a waistcoat-pocket and a watch.

Q: What did Alice want to open with the little golden key?
A:
```

- Expected: the little door (into the garden)
- L2-13B at T=0: `The door of the garden.` (right)
- L2-13B at T=0.5: **8/8**; other models k/8: L2-7B – · L3.1-8B 8 · M-7B 7 · Q3-8B 7 · Q3-30B 8
- Grep: `golden key` → 4 lines, 3 with the answer within 2 lines; `\bopen` → 20 lines, 7 with the answer within 2 lines. Answer confirmed at line 146, 1891.
- Note: Grep does fine here ("golden key" lands next to "door"); a control, not a strong example.

#### alice-grin: When the Cheshire Cat vanished, which part of it disappeared last?

```
Questions and answers about Alice's Adventures in Wonderland by Lewis Carroll

Q: What was written on the little bottle that made Alice shrink?
A: DRINK ME.

Q: What is the name of Alice's cat?
A: Dinah.

Q: Why did Alice follow the White Rabbit down the hole?
A: She was curious, because she had never seen a rabbit with a waistcoat-pocket and a watch.

Q: When the Cheshire Cat vanished, which part of it disappeared last?
A:
```

- Expected: its grin
- L2-13B at T=0: `Its grin.` (right)
- L2-13B at T=0.5: **8/8**; other models k/8: L2-7B – · L3.1-8B 3 · M-7B 8 · Q3-8B 8 · Q3-30B 8
- Grep: `vanish` → 5 lines, 1 with the answer within 2 lines; `disappear` → 2 lines, 0 with the answer within 2 lines; `\blast\b` → 33 lines, 0 with the answer within 2 lines. Answer confirmed at line 1538.
- Note: Partly findable: 1 of the 5 "vanish" lines is next to "ending with the grin" (line 1538); "disappear" and "last" never land near it.

#### alice-tarts: What was the Knave of Hearts accused of stealing?

```
Questions and answers about Alice's Adventures in Wonderland by Lewis Carroll

Q: What was written on the little bottle that made Alice shrink?
A: DRINK ME.

Q: What is the name of Alice's cat?
A: Dinah.

Q: Why did Alice follow the White Rabbit down the hole?
A: She was curious, because she had never seen a rabbit with a waistcoat-pocket and a watch.

Q: What was the Knave of Hearts accused of stealing?
A:
```

- Expected: the tarts
- L2-13B at T=0: `The tarts.` (right)
- L2-13B at T=0.5: **8/8**; other models k/8: L2-7B – · L3.1-8B 8 · M-7B 8 · Q3-8B 8 · Q3-30B 8
- Grep: `Knave` → 9 lines, 1 with the answer within 2 lines; `accus|stole|steal` → 6 lines, 3 with the answer within 2 lines. Answer confirmed at line 2898.
- Note: Easy for grep ("he stole those tarts" in the Knave's verse); a control.

#### alice-infant: What did the infant that Alice carried out of the noisy kitchen become?

```
Questions and answers about Alice's Adventures in Wonderland by Lewis Carroll

Q: What was written on the little bottle that made Alice shrink?
A: DRINK ME.

Q: What is the name of Alice's cat?
A: Dinah.

Q: Why did Alice follow the White Rabbit down the hole?
A: She was curious, because she had never seen a rabbit with a waistcoat-pocket and a watch.

Q: What did the infant that Alice carried out of the noisy kitchen become?
A:
```

- Expected: a pig
- L2-13B at T=0: `A pig.` (right)
- L2-13B at T=0.5: **7/8**; other models k/8: L2-7B 0 · L3.1-8B 8 · M-7B 8 · Q3-8B 7 · Q3-30B 8
- Grep: `infant` → 0 lines, 0 with the answer within 2 lines; `\bbecame\b|\bbecome\b` → 7 lines, 0 with the answer within 2 lines. Answer confirmed at line 1434.
- Note: Paraphrase with none of the book's words: "infant" never occurs, "became/become" never occurs near "pig".

#### alice-trial: Who was the defendant at the trial at the end of the book?

```
Questions and answers about Alice's Adventures in Wonderland by Lewis Carroll

Q: What was written on the little bottle that made Alice shrink?
A: DRINK ME.

Q: What is the name of Alice's cat?
A: Dinah.

Q: Why did Alice follow the White Rabbit down the hole?
A: She was curious, because she had never seen a rabbit with a waistcoat-pocket and a watch.

Q: Who was the defendant at the trial at the end of the book?
A:
```

- Expected: the Knave of Hearts
- L2-13B at T=0: `The Knave of Hearts.` (right)
- L2-13B at T=0.5: **6/8**; other models k/8: L2-7B 6 · L3.1-8B 7 · M-7B 3 · Q3-8B 1 · Q3-30B 8
- Grep: `defendant` → 0 lines, 0 with the answer within 2 lines; `\btrial\b` → 10 lines, 0 with the answer within 2 lines. Answer confirmed at line 1955, 1968, 1995.
- Note: "defendant" never occurs; none of the 10 "trial" lines has "Knave" within 2 lines.

#### alice-tortoise: Why did the Mock Turtle call his schoolmaster Tortoise, if he wasn't one?

```
Questions and answers about Alice's Adventures in Wonderland by Lewis Carroll

Q: What was written on the little bottle that made Alice shrink?
A: DRINK ME.

Q: What is the name of Alice's cat?
A: Dinah.

Q: Why did Alice follow the White Rabbit down the hole?
A: She was curious, because she had never seen a rabbit with a waistcoat-pocket and a watch.

Q: Why did the Mock Turtle call his schoolmaster Tortoise, if he wasn't one?
A:
```

- Expected: "because he taught us"
- L2-13B at T=0: `Because he taught him.` (right)
- L2-13B at T=0.5: **6/8**; other models k/8: L2-7B 0 · L3.1-8B 2 · M-7B 2 · Q3-8B 0 · Q3-30B 8
- Grep: `Tortoise` → 3 lines, 2 with the answer within 2 lines. Answer confirmed at line 2426.
- Note: Findable (the pun is right next to "Tortoise"), but a nice "why" question.

#### alice-dormouse: At the tea-party, where did the Hatter and the March Hare try to put the Dormouse?

```
Questions and answers about Alice's Adventures in Wonderland by Lewis Carroll

Q: What was written on the little bottle that made Alice shrink?
A: DRINK ME.

Q: What is the name of Alice's cat?
A: Dinah.

Q: Why did Alice follow the White Rabbit down the hole?
A: She was curious, because she had never seen a rabbit with a waistcoat-pocket and a watch.

Q: At the tea-party, where did the Hatter and the March Hare try to put the Dormouse?
A:
```

- Expected: into the teapot
- L2-13B at T=0: `In the teapot.` (right)
- L2-13B at T=0.5: **5/8**; other models k/8: L2-7B 7 · L3.1-8B 8 · M-7B 7 · Q3-8B 4 · Q3-30B 8
- Grep: `Dormouse` → 38 lines, 1 with the answer within 2 lines. Answer confirmed at line 1878.
- Note: "Dormouse" has 38 hits and only one is near "teapot"; you need to know to search for "teapot".

#### alice-caterpillar: How tall was the creature smoking a hookah on top of the mushroom?

```
Questions and answers about Alice's Adventures in Wonderland by Lewis Carroll

Q: What was written on the little bottle that made Alice shrink?
A: DRINK ME.

Q: What is the name of Alice's cat?
A: Dinah.

Q: Why did Alice follow the White Rabbit down the hole?
A: She was curious, because she had never seen a rabbit with a waistcoat-pocket and a watch.

Q: How tall was the creature smoking a hookah on top of the mushroom?
A:
```

- Expected: three inches
- L2-13B at T=0: `Three inches high.` (right)
- L2-13B at T=0.5: **5/8**; other models k/8: L2-7B 0 · L3.1-8B 1 · M-7B 0 · Q3-8B 0 · Q3-30B 1
- Grep: `hookah` → 5 lines, 0 with the answer within 2 lines; `\btall\b` → 0 lines, 0 with the answer within 2 lines. Answer confirmed at line 1079.
- Note: Paraphrase ("creature smoking a hookah"): none of the 5 "hookah" lines is near "three inches" (line 1079).

#### alice-sneeze: Why was everyone in the Duchess's kitchen sneezing?

```
Questions and answers about Alice's Adventures in Wonderland by Lewis Carroll

Q: What was written on the little bottle that made Alice shrink?
A: DRINK ME.

Q: What is the name of Alice's cat?
A: Dinah.

Q: Why did Alice follow the White Rabbit down the hole?
A: She was curious, because she had never seen a rabbit with a waistcoat-pocket and a watch.

Q: Why was everyone in the Duchess's kitchen sneezing?
A:
```

- Expected: too much pepper
- L2-13B at T=0: `Because the Duchess had just taken some pepper out of the pepper-pot and grated it over their heads.` (right)
- L2-13B at T=0.5: **5/8**; other models k/8: L2-7B 1 · L3.1-8B 1 · M-7B 1 · Q3-8B 1 · Q3-30B 7
- Grep: `sneez` → 11 lines, 3 with the answer within 2 lines. Answer confirmed at line 1312.
- Note: Partly findable: 3 of 11 "sneez" lines are near "pepper".

Other Alice's Adventures in Wonderland questions (same prompt as above with this question in the last "Q:" line), k/8 at T=0.5:

| id | question | expected | L2-13B | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B | L2-13B at T=0 |
|---|---|---|---|---|---|---|---|---|---|
| alice-pebbles | What did the pebbles thrown at Alice in the Rabbit's house turn into? | little cakes | 3 | 0 | 0 | 1 | 2 | 8 | `Into little cakes.` |
| alice-croquet | In the Queen's game, which two kinds of live animals were used as sports equipment? | flamingos (mallets) and hedgehogs (balls) | 2 | 1 | 3 | 7 | 0 | 6 | `Hedgehogs and croquet balls.` |
| alice-roses | Why were the gardeners painting the roses? | they had planted a white rose-tree by mistake; the Queen wanted red | 1 | 2 | 0 | 1 | 0 | 7 | `Because they were white with red rips.` |
| alice-thimble | What prize was Alice given at the end of the Caucus-race? | a thimble (her own) | 0 | 0 | 0 | 0 | 0 | 6 | `The prize for getting the farthest was, of course, a pair of` |
| alice-pool | Where did the water in the pool that Alice swam in come from? | Alice's own tears | 0 | 2 | 0 | 0 | 2 | 5 | `It came from her own tears.` |
| alice-chimney | What kind of animal did Alice kick out of the chimney? | a lizard (Bill) | 0 | 0 | 0 | 0 | 0 | 4 | `A mouse.` |
| alice-teatime | Why is it always tea-time for the Hatter? | the Hatter quarrelled with Time, so it is always six o'clock | 0 | 0 | 0 | 0 | 0 | 3 | `Because he is always late.` |
| alice-cheshire | Why couldn't the executioner cut off the Cheshire Cat's head? | only its head was there; no body to cut it off from | 0 | 1 | 1 | 1 | 0 | 3 | `Because it wasn't there.` |
| alice-prize | After the Caucus-race, where did the prize that Alice herself received come from? | it was her own thimble, from her own pocket | 0 | 0 | 0 | 1 | 0 | 0 | `It was a thimble.` |
| alice-leaves | When Alice woke up, what turned out to be the cards flying down on her face? | dead leaves falling from the trees | 0 | 0 | 0 | 1 | 1 | 0 | `The Queen of Hearts.` |
| alice-jar | While she was falling, Alice took a jar down from a shelf. What was in it? | nothing; it was empty | 0 | 0 | 0 | 0 | 0 | 0 | `Jam.` |
| alice-wakeup | Whose lap was Alice's head resting in when she woke up? | her sister's | 0 | 0 | 0 | 0 | 0 | 0 | `The White Rabbit's.` |

Grep results for these:

- alice-pebbles: `pebble` → 2 lines, 1 with the answer within 2 lines. Answer confirmed at line 854.
- alice-croquet: `sport` → 0 lines, 0 with the answer within 2 lines; `equipment` → 0 lines, 0 with the answer within 2 lines; `\bgame\b` → 13 lines, 3 with the answer within 2 lines. Answer confirmed at line 2063.
- alice-roses: `painting` → 2 lines, 1 with the answer within 2 lines; `\bpaint` → 3 lines, 1 with the answer within 2 lines. Answer confirmed at line 1938.
- alice-thimble: `\bprize` → 5 lines, 0 with the answer within 2 lines. Answer confirmed at line 571.
- alice-pool: `\bpool\b` → 12 lines, 4 with the answer within 2 lines; `swam|swim` → 11 lines, 1 with the answer within 2 lines. Answer confirmed at line 287.
- alice-chimney: `chimney` → 7 lines, 0 with the answer within 2 lines; `\bkick` → 3 lines, 0 with the answer within 2 lines. Answer confirmed at line 863.
- alice-teatime: `tea-time` → 2 lines, 0 with the answer within 2 lines; `always\b.*\btea` → 1 lines, 0 with the answer within 2 lines. Answer confirmed at line 1709, 1733.
- alice-cheshire: `executioner` → 6 lines, 1 with the answer within 2 lines. Answer confirmed at line 2184.
- alice-prize: `\bprize` → 5 lines, 0 with the answer within 2 lines. Answer confirmed at line 566, 571.
- alice-leaves: `\bcards\b` → 3 lines, 0 with the answer within 2 lines; `\bwoke\b|\bwake\b` → 3 lines, 1 with the answer within 2 lines. Answer confirmed at line 3323.
- alice-jar: `\bjar\b` → 2 lines, 2 with the answer within 2 lines. Answer confirmed at line 76.
- alice-wakeup: `\blap\b` → 2 lines, 1 with the answer within 2 lines; `\bwoke\b|\bwake\b` → 3 lines, 1 with the answer within 2 lines. Answer confirmed at line 3322.

### Winnie-the-Pooh

No Pooh question reaches 7/8 on Llama-2-13B (11% overall); every model does badly on this book (5-14%). The models do have the book's first sentence verbatim (see the verbatim section), so they "contain" some of the text, but they mix it up with the sequel and the Disney films (Tigger, Gopher, "Pooh Corner"). The Pooh items that work well on some model are the Woozle question (Llama 3.1 8B, 8/8), pooh-stuck (Llama 3.1 8B, 7/8) and the empty-pot cloze sentence (Qwen3-30B 8/8, in the cloze section). Shown in full here are the Pooh items that reach 6/8 on some model.

#### pooh-tailfinder: Who found the thing that Eeyore had lost?

```
Questions and answers about Winnie-the-Pooh by A. A. Milne

Q: What kind of animal is Eeyore?
A: An old grey donkey.

Q: What does Pooh love to eat more than anything?
A: Honey.

Q: Why does Pooh call himself a Bear of Very Little Brain?
A: Because he isn't clever, and long words bother him.

Q: Who found the thing that Eeyore had lost?
A:
```

- Expected: Pooh
- L2-13B at T=0: `Piglet.` (wrong)
- L2-13B at T=0.5: **5/8**; other models k/8: L2-7B 2 · L3.1-8B 5 · M-7B 5 · Q3-8B 1 · Q3-30B 1
- Grep: `\blost\b` → 3 lines, 1 with the answer within 2 lines. Answer confirmed at line 1210, 1214.
- Note: Paraphrase ("the thing that Eeyore had lost"); the chapter title says "Pooh finds one".

#### pooh-woozle: Whose footprints were Pooh and Piglet following when they hunted the Woozle?

```
Questions and answers about Winnie-the-Pooh by A. A. Milne

Q: What kind of animal is Eeyore?
A: An old grey donkey.

Q: What does Pooh love to eat more than anything?
A: Honey.

Q: Why does Pooh call himself a Bear of Very Little Brain?
A: Because he isn't clever, and long words bother him.

Q: Whose footprints were Pooh and Piglet following when they hunted the Woozle?
A:
```

- Expected: their own (Pooh's and Piglet's)
- L2-13B at T=0: `The footprints of a very small child.` (wrong)
- L2-13B at T=0.5: **0/8**; other models k/8: L2-7B 0 · L3.1-8B 8 · M-7B 0 · Q3-8B 1 · Q3-30B 3
- Grep: `footprint|foot-print` → 0 lines, 0 with the answer within 2 lines; `\bWoozle` → 12 lines, 0 with the answer within 2 lines; `\btracks\b` → 8 lines, 1 with the answer within 2 lines. Answer confirmed at line 977.
- Note: Never stated: the book says only that Pooh "fitted his paw into one of the Tracks" and "I have been Foolish and Deluded" (lines 976-984). "footprint" has 0 hits; none of the 12 "Woozle" lines is near the answer.

#### pooh-stuck: Why did Pooh get stuck in Rabbit's front door?

```
Questions and answers about Winnie-the-Pooh by A. A. Milne

Q: What kind of animal is Eeyore?
A: An old grey donkey.

Q: What does Pooh love to eat more than anything?
A: Honey.

Q: Why does Pooh call himself a Bear of Very Little Brain?
A: Because he isn't clever, and long words bother him.

Q: Why did Pooh get stuck in Rabbit's front door?
A:
```

- Expected: he had eaten too much
- L2-13B at T=0: `Because he was a bear of very little brain and he couldn't spell.` (wrong)
- L2-13B at T=0.5: **0/8**; other models k/8: L2-7B 3 · L3.1-8B 7 · M-7B 5 · Q3-8B 3 · Q3-30B 5
- Grep: `\bstuck\b` → 6 lines, 0 with the answer within 2 lines; `\bwhy\b` → 20 lines, 0 with the answer within 2 lines. Answer confirmed at line 733, 769.
- Note: Rabbit says it ("It all comes ... of eating too much", line ~732), but none of the 6 "stuck" lines is near it.

Other Winnie-the-Pooh questions (same prompt as above with this question in the last "Q:" line), k/8 at T=0.5:

| id | question | expected | L2-13B | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B | L2-13B at T=0 |
|---|---|---|---|---|---|---|---|---|---|
| pooh-balloon | What happened to the balloon that Piglet was bringing to Eeyore? | Piglet fell on it and it burst | 2 | 4 | 0 | 4 | 1 | 0 | `It popped.` |
| pooh-bottle | How did Piglet send for help when he was surrounded by water? | a message in a bottle | 1 | 0 | 4 | 0 | 0 | 4 | `He blew on a small red horn.` |
| pooh-emptypot | Why was the pot that Pooh gave Eeyore for his birthday empty? | Pooh ate the honey on the way | 3 | 1 | 0 | 3 | 0 | 3 | `Because Pooh had eaten all the honey.` |
| pooh-roo | Who took Baby Roo's place in Kanga's pocket? | Piglet | 0 | 0 | 0 | 0 | 3 | 0 | `Tigger.` |
| pooh-northpole | What did Christopher Robin say Pooh had discovered on the Expotition? | the North Pole | 3 | 0 | 0 | 0 | 3 | 1 | `A little black rain cloud.` |
| pooh-kangabath | What did Kanga do to Piglet when she found him in her pocket instead of Roo? | gave him a bath (and medicine) | 2 | 0 | 0 | 1 | 0 | 1 | `She gave him a good talking to.` |
| pooh-downsky | How did Christopher Robin get Pooh down from the sky? | shot the balloon with his pop-gun | 0 | 0 | 0 | 0 | 2 | 0 | `He climbed up the tree and got him down.` |
| pooh-week | How long was Pooh stuck in Rabbit's front door? | a week | 2 | 0 | 1 | 0 | 0 | 0 | `A whole week.` |
| pooh-heffalump | When Pooh got a honey-jar stuck on his head, what did Piglet think he was? | a Heffalump | 0 | 0 | 0 | 0 | 0 | 2 | `A bee.` |
| pooh-writer | Who wrote the birthday message on the pot that Pooh gave Eeyore? | Owl | 1 | 0 | 0 | 0 | 2 | 0 | `Christopher Robin.` |
| pooh-inpot | What did Eeyore put inside the pot he got for his birthday? | the burst balloon | 0 | 0 | 0 | 1 | 0 | 0 | `A thistle.` |
| pooh-mud | Why did Pooh roll in mud before he floated up to the bees' nest? | to look like a little black rain-cloud | 0 | 0 | 0 | 0 | 0 | 1 | `Because he was trying to be a bee.` |
| pooh-umbrella | What did Christopher Robin and Pooh sail in to rescue Piglet from the flood? | Christopher Robin's upside-down umbrella | 1 | 0 | 0 | 0 | 0 | 1 | `A very small boat.` |
| pooh-wol | How does Owl spell his own name? | WOL | 1 | 0 | 0 | 0 | 0 | 0 | `W-O-O-D.` |
| pooh-doorbell | What was Owl using as a doorbell cord? | Eeyore's tail | 0 | 0 | 0 | 0 | 0 | 0 | `A bell-rope.` |
| pooh-rescueroo | What did Pooh use to fish Roo out of the stream? | a pole | 0 | 0 | 0 | 0 | 0 | 0 | `A balloon.` |
| pooh-present | What present did Pooh get at the party Christopher Robin gave for him? | a Special Pencil Case | 0 | 0 | 0 | 0 | 0 | 0 | `A balloon.` |
| pooh-sanders | What name was written over the door of Pooh's house? | Sanders | 0 | 0 | 0 | 0 | 0 | 0 | `"WOLF'S HOUSE."` |
| pooh-grandfather | What did Piglet say his grandfather's name was? | Trespassers William | 0 | 0 | 0 | 0 | 0 | 0 | `Grandfather Pig.` |
| pooh-bluewhy | Why did Pooh choose the blue balloon instead of the green one? | so the bees would think he was part of the sky | 0 | 0 | 0 | 0 | 0 | 0 | `Because it was the one he liked best.` |

Grep results for these:

- pooh-balloon: `balloon` → 41 lines, 1 with the answer within 2 lines. Answer confirmed at line 1926.
- pooh-bottle: `\bhelp\b` → 18 lines, 1 with the answer within 2 lines; `surrounded` → 5 lines, 0 with the answer within 2 lines. Answer confirmed at line 811, 3050, 3052.
- pooh-emptypot: `\bempty\b` → 0 lines, 0 with the answer within 2 lines; `\bpot\b` → 17 lines, 2 with the answer within 2 lines. Answer confirmed at line 1743.
- pooh-roo: `\bplace\b` → 15 lines, 3 with the answer within 2 lines; `Kanga's pocket` → 4 lines, 3 with the answer within 2 lines. Answer confirmed at line 2356.
- pooh-northpole: `discover` → 21 lines, 4 with the answer within 2 lines. Answer confirmed at line 2586, 2588, 2674.
- pooh-kangabath: `Kanga.*Piglet|Piglet.*Kanga` → 11 lines, 1 with the answer within 2 lines; `\bfound\b` → 15 lines, 0 with the answer within 2 lines. Answer confirmed at line 565, 2414, 2417.
- pooh-downsky: `\bsky\b` → 10 lines, 0 with the answer within 2 lines; `come down|get down|got down` → 1 lines, 0 with the answer within 2 lines. Answer confirmed at line 505.
- pooh-week: `\bstuck\b` → 6 lines, 0 with the answer within 2 lines; `how long` → 1 lines, 1 with the answer within 2 lines. Answer confirmed at line 786.
- pooh-heffalump: `\bjar\b.*\bhead|\bhead\b.*\bjar\b` → 3 lines, 1 with the answer within 2 lines; `\bthink\b|\bthought\b` → 139 lines, 9 with the answer within 2 lines. Answer confirmed at line 545, 1226, 1236.
- pooh-writer: `\bwrite\b|\bwrote\b` → 14 lines, 8 with the answer within 2 lines. Answer confirmed at line 1813.
- pooh-inpot: `\binside\b` → 7 lines, 0 with the answer within 2 lines; `\bpot\b.*\bput|\bput\b.*\bpot\b` → 3 lines, 2 with the answer within 2 lines. Answer confirmed at line 342, 344, 347.
- pooh-mud: `\bmud` → 3 lines, 0 with the answer within 2 lines. Answer confirmed at line 381, 402.
- pooh-umbrella: `\bsail` → 2 lines, 0 with the answer within 2 lines; `rescue` → 10 lines, 0 with the answer within 2 lines; `flood` → 5 lines, 0 with the answer within 2 lines. Answer confirmed at line 436, 447, 453.
- pooh-wol: `\bspell` → 5 lines, 2 with the answer within 2 lines. Answer confirmed at line 1100.
- pooh-doorbell: `doorbell|door-bell` → 0 lines, 0 with the answer within 2 lines; `\bcord\b` → 0 lines, 0 with the answer within 2 lines; `\bbell` → 6 lines, 0 with the answer within 2 lines. Answer confirmed at line 1106, 1175, 1176.
- pooh-rescueroo: `\bfish` → 4 lines, 0 with the answer within 2 lines; `\bstream\b` → 11 lines, 0 with the answer within 2 lines. Answer confirmed at line 2828, 2830, 2831.
- pooh-present: `present` → 14 lines, 0 with the answer within 2 lines; `\bparty\b` → 21 lines, 0 with the answer within 2 lines. Answer confirmed at line 3580.
- pooh-sanders: `\bdoor\b` → 18 lines, 0 with the answer within 2 lines; `\bname\b` → 14 lines, 2 with the answer within 2 lines. Answer confirmed at line 253.
- pooh-grandfather: `grandfather` → 9 lines, 7 with the answer within 2 lines. Answer confirmed at line 837, 838.
- pooh-bluewhy: `\bblue\b` → 12 lines, 4 with the answer within 2 lines; `\bgreen\b` → 7 lines, 1 with the answer within 2 lines. Answer confirmed at line 374.

### Harry Potter

#### hp-firebolt: Who sent Harry the Firebolt?

```
Questions and answers about the Harry Potter books by J. K. Rowling

Q: What is the name of Harry's owl?
A: Hedwig.

Q: Which Hogwarts house is Harry sorted into?
A: Gryffindor.

Q: Why does Harry have a lightning-shaped scar?
A: Voldemort's killing curse rebounded when he tried to kill Harry as a baby.

Q: Who sent Harry the Firebolt?
A:
```

- Expected: Sirius Black
- L2-13B at T=0: `Sirius Black.` (right)
- L2-13B at T=0.5: **8/8**; other models k/8: L2-7B 5 · L3.1-8B 4 · M-7B 8 · Q3-8B 5 · Q3-30B 7
- Note: The broom arrives anonymously in book 3 and the sender is revealed at the very end: two distant passages.

#### hp-goblet: Who put Harry's name in the Goblet of Fire?

```
Questions and answers about the Harry Potter books by J. K. Rowling

Q: What is the name of Harry's owl?
A: Hedwig.

Q: Which Hogwarts house is Harry sorted into?
A: Gryffindor.

Q: Why does Harry have a lightning-shaped scar?
A: Voldemort's killing curse rebounded when he tried to kill Harry as a baby.

Q: Who put Harry's name in the Goblet of Fire?
A:
```

- Expected: Barty Crouch Jr. (as Moody)
- L2-13B at T=0: `Barty Crouch Jr.` (right)
- L2-13B at T=0.5: **8/8**; other models k/8: L2-7B 6 · L3.1-8B 1 · M-7B 5 · Q3-8B 7 · Q3-30B 8
- Note: Revealed at the end of book 4; the question's words aren't near the answer.

#### hp-patronus: What shape does Snape's Patronus take?

```
Questions and answers about the Harry Potter books by J. K. Rowling

Q: What is the name of Harry's owl?
A: Hedwig.

Q: Which Hogwarts house is Harry sorted into?
A: Gryffindor.

Q: Why does Harry have a lightning-shaped scar?
A: Voldemort's killing curse rebounded when he tried to kill Harry as a baby.

Q: What shape does Snape's Patronus take?
A:
```

- Expected: a doe
- L2-13B at T=0: `A doe.` (right)
- L2-13B at T=0.5: **8/8**; other models k/8: L2-7B 8 · L3.1-8B 8 · M-7B 8 · Q3-8B 7 · Q3-30B 8
- Note: Stated in book 7; a short, clean answer.

#### hp-whydoe: Why does Snape's Patronus have the same shape as Lily's?

```
Questions and answers about the Harry Potter books by J. K. Rowling

Q: What is the name of Harry's owl?
A: Hedwig.

Q: Which Hogwarts house is Harry sorted into?
A: Gryffindor.

Q: Why does Harry have a lightning-shaped scar?
A: Voldemort's killing curse rebounded when he tried to kill Harry as a baby.

Q: Why does Snape's Patronus have the same shape as Lily's?
A:
```

- Expected: he loved Lily
- L2-13B at T=0: `Snape loved Lily, and his Patronus is a doe, the same as Lily's.` (right)
- L2-13B at T=0.5: **8/8**; other models k/8: L2-7B 6 · L3.1-8B 5 · M-7B 8 · Q3-8B 5 · Q3-30B 7
- Note: A "why" answered by Snape's memories in book 7, not by one sentence.

#### hp-dobby: Who killed Dobby?

```
Questions and answers about the Harry Potter books by J. K. Rowling

Q: What is the name of Harry's owl?
A: Hedwig.

Q: Which Hogwarts house is Harry sorted into?
A: Gryffindor.

Q: Why does Harry have a lightning-shaped scar?
A: Voldemort's killing curse rebounded when he tried to kill Harry as a baby.

Q: Who killed Dobby?
A:
```

- Expected: Bellatrix Lestrange
- L2-13B at T=0: `Bellatrix Lestrange.` (right)
- L2-13B at T=0.5: **8/8**; other models k/8: L2-7B 1 · L3.1-8B 3 · M-7B 7 · Q3-8B 1 · Q3-30B 7
- Note: Bellatrix's thrown knife kills him; you have to connect the knife to the death.

#### hp-cupboard: Where did Harry sleep at the Dursleys' before he went to Hogwarts?

```
Questions and answers about the Harry Potter books by J. K. Rowling

Q: What is the name of Harry's owl?
A: Hedwig.

Q: Which Hogwarts house is Harry sorted into?
A: Gryffindor.

Q: Why does Harry have a lightning-shaped scar?
A: Voldemort's killing curse rebounded when he tried to kill Harry as a baby.

Q: Where did Harry sleep at the Dursleys' before he went to Hogwarts?
A:
```

- Expected: the cupboard under the stairs
- L2-13B at T=0: `In a cupboard under the stairs.` (right)
- L2-13B at T=0.5: **8/8**; other models k/8: L2-7B 8 · L3.1-8B 7 · M-7B 6 · Q3-8B 8 · Q3-30B 8
- Note: Stated in the first chapters of book 1; an easy control.

#### hp-nagini: Who killed Nagini?

```
Questions and answers about the Harry Potter books by J. K. Rowling

Q: What is the name of Harry's owl?
A: Hedwig.

Q: Which Hogwarts house is Harry sorted into?
A: Gryffindor.

Q: Why does Harry have a lightning-shaped scar?
A: Voldemort's killing curse rebounded when he tried to kill Harry as a baby.

Q: Who killed Nagini?
A:
```

- Expected: Neville
- L2-13B at T=0: `Neville Longbottom.` (right)
- L2-13B at T=0.5: **8/8**; other models k/8: L2-7B 8 · L3.1-8B 5 · M-7B 6 · Q3-8B 6 · Q3-30B 8
- Note: Book 7, with the sword from the Sorting Hat.

#### hp-hallows: Which three objects make up the Deathly Hallows?

```
Questions and answers about the Harry Potter books by J. K. Rowling

Q: What is the name of Harry's owl?
A: Hedwig.

Q: Which Hogwarts house is Harry sorted into?
A: Gryffindor.

Q: Why does Harry have a lightning-shaped scar?
A: Voldemort's killing curse rebounded when he tried to kill Harry as a baby.

Q: Which three objects make up the Deathly Hallows?
A:
```

- Expected: the Elder Wand, the Resurrection Stone, the Invisibility Cloak
- L2-13B at T=0: `The Elder Wand, the Resurrection Stone, and the Cloak of Invisibility.` (right)
- L2-13B at T=0.5: **8/8**; other models k/8: L2-7B – · L3.1-8B 8 · M-7B 8 · Q3-8B 8 · Q3-30B 8
- Note: Three-part answer from book 7.

#### hp-dudley: What did Hagrid give Dudley when they met in the hut on the rock?

```
Questions and answers about the Harry Potter books by J. K. Rowling

Q: What is the name of Harry's owl?
A: Hedwig.

Q: Which Hogwarts house is Harry sorted into?
A: Gryffindor.

Q: Why does Harry have a lightning-shaped scar?
A: Voldemort's killing curse rebounded when he tried to kill Harry as a baby.

Q: What did Hagrid give Dudley when they met in the hut on the rock?
A:
```

- Expected: a pig's tail
- L2-13B at T=0: `A pig's tail.` (right)
- L2-13B at T=0.5: **8/8**; other models k/8: L2-7B – · L3.1-8B 0 · M-7B 0 · Q3-8B 2 · Q3-30B 5
- Note: Paraphrase ("hut on the rock") of a book 1 scene.

#### hp-godson: Who is Harry's godson?

```
Questions and answers about the Harry Potter books by J. K. Rowling

Q: What is the name of Harry's owl?
A: Hedwig.

Q: Which Hogwarts house is Harry sorted into?
A: Gryffindor.

Q: Why does Harry have a lightning-shaped scar?
A: Voldemort's killing curse rebounded when he tried to kill Harry as a baby.

Q: Who is Harry's godson?
A:
```

- Expected: Teddy Lupin
- L2-13B at T=0: `Teddy Lupin.` (right)
- L2-13B at T=0.5: **8/8**; other models k/8: L2-7B – · L3.1-8B 0 · M-7B 8 · Q3-8B 0 · Q3-30B 8
- Note: Requires book 7 (Lupin and Tonks's son, Harry made godfather).

#### hp-norbert: What hatched from the egg that Hagrid won in a card game?

```
Questions and answers about the Harry Potter books by J. K. Rowling

Q: What is the name of Harry's owl?
A: Hedwig.

Q: Which Hogwarts house is Harry sorted into?
A: Gryffindor.

Q: Why does Harry have a lightning-shaped scar?
A: Voldemort's killing curse rebounded when he tried to kill Harry as a baby.

Q: What hatched from the egg that Hagrid won in a card game?
A:
```

- Expected: a dragon (Norbert)
- L2-13B at T=0: `A baby dragon.` (right)
- L2-13B at T=0.5: **7/8**; other models k/8: L2-7B – · L3.1-8B 8 · M-7B 8 · Q3-8B 1 · Q3-30B 8
- Note: Paraphrase ("won in a card game") of book 1.

#### hp-rab: Who was R.A.B.?

```
Questions and answers about the Harry Potter books by J. K. Rowling

Q: What is the name of Harry's owl?
A: Hedwig.

Q: Which Hogwarts house is Harry sorted into?
A: Gryffindor.

Q: Why does Harry have a lightning-shaped scar?
A: Voldemort's killing curse rebounded when he tried to kill Harry as a baby.

Q: Who was R.A.B.?
A:
```

- Expected: Regulus Arcturus Black
- L2-13B at T=0: `Regulus Arcturus Black, Sirius's brother.` (right)
- L2-13B at T=0.5: **7/8**; other models k/8: L2-7B – · L3.1-8B 8 · M-7B 5 · Q3-8B 0 · Q3-30B 8
- Note: Harry works it out from initials on a note in book 7: an inference, not a stated sentence.

#### hp-elder: Who was the true master of the Elder Wand at the end of the last book?

```
Questions and answers about the Harry Potter books by J. K. Rowling

Q: What is the name of Harry's owl?
A: Hedwig.

Q: Which Hogwarts house is Harry sorted into?
A: Gryffindor.

Q: Why does Harry have a lightning-shaped scar?
A: Voldemort's killing curse rebounded when he tried to kill Harry as a baby.

Q: Who was the true master of the Elder Wand at the end of the last book?
A:
```

- Expected: Harry
- L2-13B at T=0: `Harry Potter.` (right)
- L2-13B at T=0.5: **6/8**; other models k/8: L2-7B 6 · L3.1-8B 8 · M-7B 5 · Q3-8B 8 · Q3-30B 5
- Note: Follows from a chain across books 6-7 (Draco disarmed Dumbledore, Harry disarmed Draco), not one sentence.

#### hp-locket: Who destroyed the locket Horcrux?

```
Questions and answers about the Harry Potter books by J. K. Rowling

Q: What is the name of Harry's owl?
A: Hedwig.

Q: Which Hogwarts house is Harry sorted into?
A: Gryffindor.

Q: Why does Harry have a lightning-shaped scar?
A: Voldemort's killing curse rebounded when he tried to kill Harry as a baby.

Q: Who destroyed the locket Horcrux?
A:
```

- Expected: Ron
- L2-13B at T=0: `Ron Weasley.` (right)
- L2-13B at T=0.5: **6/8**; other models k/8: L2-7B 0 · L3.1-8B 8 · M-7B 2 · Q3-8B 8 · Q3-30B 8
- Note: Book 7.

Other Harry Potter questions (same prompt as above with this question in the last "Q:" line), k/8 at T=0.5:

| id | question | expected | L2-13B | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B | L2-13B at T=0 |
|---|---|---|---|---|---|---|---|---|---|
| hp-cloak | Who sent Harry the Invisibility Cloak for Christmas in his first year? | Dumbledore | 0 | 0 | 0 | 1 | 0 | 8 | `His godfather, Sirius Black.` |
| hp-scabbers | Who was Ron's pet rat really? | Peter Pettigrew | 0 | 4 | 6 | 7 | 8 | 8 | `Scabbers.` |
| hp-prince | Who was the Half-Blood Prince? | Snape | 2 | 4 | 6 | 3 | 8 | 8 | `Tom Riddle, aka Voldemort.` |
| hp-fluffy | How do you get past the three-headed dog guarding the trapdoor? | play music | 4 | 0 | 0 | 0 | 0 | 8 | `You have to answer a riddle.` |
| hp-hagrid | Why was Hagrid expelled from Hogwarts? | he was framed for opening the Chamber of Secrets | 4 | 3 | 0 | 6 | 1 | 8 | `He was accused of opening the Chamber of Secrets.` |
| hp-figg | What is unusual about Harry's neighbour Mrs Figg? | she is a Squib | 3 | 1 | 4 | 4 | 5 | 8 | `She is a witch, but she is not allowed to use magic.` |
| hp-sirius-fly | On what creature did Sirius Black escape from Hogwarts? | Buckbeak (a hippogriff) | 1 | 1 | 4 | 8 | 1 | 7 | `A flying motorcycle.` |
| hp-howmany | How many Horcruxes did Voldemort make on purpose? | six | 2 | 0 | 3 | 0 | 8 | 6 | `Six.` |
| hp-myrtle | Who was the student who died the first time the Chamber of Secrets was opened? | Moaning Myrtle | 0 | – | 0 | 8 | 3 | 8 | `Tom Riddle.` |
| hp-sword | What did Neville pull out of the Sorting Hat during the final battle? | the sword of Gryffindor | 4 | – | 6 | 8 | 7 | 8 | `A remembrall.` |
| hp-wands | What do Harry's wand and Voldemort's wand have in common? | twin cores: feathers from the same phoenix (Fawkes) | 1 | 0 | 1 | 2 | 7 | 5 | `They are both made of holly and phoenix feather.` |
| hp-polyjuice | What went wrong when Hermione drank the Polyjuice Potion in her second year? | she used a cat hair and turned partly into a cat | 2 | – | 7 | 4 | 3 | 6 | `She drank too much and turned into a cat.` |
| hp-boggart | What does Neville's boggart turn into? | Snape | 2 | 0 | 1 | 0 | 0 | 6 | `His grandmother.` |
| hp-ring | Whose ring had the Resurrection Stone set in it? | Marvolo Gaunt's | 0 | 0 | 0 | 0 | 5 | 5 | `Dumbledore's.` |
| hp-erised | What did Dumbledore tell Harry he saw in the Mirror of Erised? | a pair of thick, woolly socks | 0 | 0 | 0 | 0 | 0 | 2 | `"Your father's eyes."` |
| hp-dumbledore-death | Who asked Snape to kill Dumbledore? | Dumbledore himself | 2 | – | 0 | 0 | 0 | 0 | `Voldemort.` |
| hp-stone | At the end of the first book, how did the Philosopher's Stone get into Harry's pocket? | the Mirror of Erised gave it to him | 0 | 0 | 0 | 1 | 0 | 1 | `It was put there by Hagrid.` |

### Cloze sentences (no examples, no question format)

These are bare sentences for the model to finish. They work as presets too, but the model often keeps going with more sentences (see the no-stop runs below), so they are less tidy than the Q&A format.

#### cloze-alice-baby: In Alice's Adventures in Wonderland, the baby that the Duchess was nursing turned into a

```
In Alice's Adventures in Wonderland, the baby that the Duchess was nursing turned into a
```

- Expected: pig
- L2-13B at T=0: `pig` (right)
- L2-13B at T=0.5: **8/8**; other models k/8: L2-7B 8 · L3.1-8B 8 · M-7B 8 · Q3-8B 8 · Q3-30B 8
- Note: Same fact as alice-baby, as one sentence: no examples needed.

#### cloze-hp-firebolt: In Harry Potter and the Prisoner of Azkaban, the Firebolt that Harry got for Christmas had been sent by

```
In Harry Potter and the Prisoner of Azkaban, the Firebolt that Harry got for Christmas had been sent by
```

- Expected: Sirius Black
- L2-13B at T=0: `Sirius Black` (right)
- L2-13B at T=0.5: **8/8**; other models k/8: L2-7B 5 · L3.1-8B 8 · M-7B 7 · Q3-8B 7 · Q3-30B 6
- Note: Same as hp-firebolt, one sentence, no examples.

#### cloze-alice-croquet: In Alice's Adventures in Wonderland, at the Queen's croquet-ground the balls were live

```
In Alice's Adventures in Wonderland, at the Queen's croquet-ground the balls were live
```

- Expected: hedgehogs
- L2-13B at T=0: `hedgehogs, and the mallets live flamingos` (right)
- L2-13B at T=0.5: **7/8**; other models k/8: L2-7B 1 · L3.1-8B 4 · M-7B 7 · Q3-8B 7 · Q3-30B 8
- Note: Line 2063 says it, but the completion has to come from memory of that line.

#### cloze-hp-scabbers: In the Harry Potter books, Ron's pet rat Scabbers was really

```
In the Harry Potter books, Ron's pet rat Scabbers was really
```

- Expected: Peter Pettigrew
- L2-13B at T=0: `Peter Pettigrew in disguise` (right)
- L2-13B at T=0.5: **7/8**; other models k/8: L2-7B 7 · L3.1-8B 7 · M-7B 8 · Q3-8B 0 · Q3-30B 7
- Note: Same as hp-scabbers, one sentence, no examples.

#### cloze-alice-thimble: In Alice's Adventures in Wonderland, after the Caucus-race the Dodo solemnly presented Alice with

```
In Alice's Adventures in Wonderland, after the Caucus-race the Dodo solemnly presented Alice with
```

- Expected: a thimble
- L2-13B at T=0: `a thimble, advising her to begin her collection with it` (right)
- L2-13B at T=0.5: **6/8**; other models k/8: L2-7B 0 · L3.1-8B 0 · M-7B 0 · Q3-8B 0 · Q3-30B 8
- Note: Line 571; the Dodo presents Alice with her own thimble.

#### cloze-pooh-roo: In Winnie-the-Pooh, when Rabbit kidnapped Baby Roo, the animal hiding in Kanga's pocket instead was

```
In Winnie-the-Pooh, when Rabbit kidnapped Baby Roo, the animal hiding in Kanga's pocket instead was
```

- Expected: Piglet
- L2-13B at T=0: `a small, stuffed toy` (wrong)
- L2-13B at T=0.5: **5/8**; other models k/8: L2-7B 0 · L3.1-8B 2 · M-7B 0 · Q3-8B 0 · Q3-30B 0

Other cloze sentences, k/8 at T=0.5:

| id | prompt | expected | L2-13B | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| cloze-pooh-pot | In Winnie-the-Pooh, the honey pot that Pooh gave Eeyore for his birthday was empty because | Pooh had eaten the honey | 4 | 7 | 7 | 6 | 1 | 8 |
| cloze-hp-cloak | In Harry Potter and the Philosopher's Stone, the Invisibility Cloak that Harry got for Christmas had been sent by | Dumbledore | 1 | 0 | 2 | 0 | 0 | 3 |
| cloze-alice-cards | At the end of Alice's Adventures in Wonderland, the pack of cards flying down upon Alice's face turned out to be | dead leaves | 0 | 0 | 0 | 1 | 0 | 0 |
| cloze-pooh-tail | In Winnie-the-Pooh, the bell-rope hanging outside Owl's door turned out to be | Eeyore's tail | 0 | 0 | 0 | 0 | 0 | 0 |
| cloze-pooh-woozle | In Winnie-the-Pooh, the tracks that Pooh and Piglet followed around the spinney of larch trees were really | their own | 0 | 0 | 0 | 0 | 0 | 0 |

### Verbatim openings (for contrast)

Every model tested continues the first sentence of all three books word for word, 8/8 at T=0.5 (Llama-2-7B was deleted before this test). This is the kind of memorization Cooper et al. measure; it shows the text is in there, but a regex would find these too.

#### verbatim-alice: Alice was beginning to get very tired of sitting by her sister on the bank, and

```
Alice was beginning to get very tired of sitting by her sister on the bank, and
```

- Expected: of having nothing to do
- L2-13B at T=0: `of having nothing to do: once or twice she had peeped into the` (right)
- L2-13B at T=0.5: **8/8**; other models k/8: L2-7B – · L3.1-8B 8 · M-7B 8 · Q3-8B 8 · Q3-30B 8
- Note: First sentence of the book: proves the text is in there, but a regex would find it too.

#### verbatim-pooh: Here is Edward Bear, coming downstairs now, bump, bump, bump, on the

```
Here is Edward Bear, coming downstairs now, bump, bump, bump, on the
```

- Expected: back of his head, behind Christopher Robin
- L2-13B at T=0: `back of his head, behind Christopher Robin. It is, as far as he` (right)
- L2-13B at T=0.5: **8/8**; other models k/8: L2-7B – · L3.1-8B 8 · M-7B 8 · Q3-8B 8 · Q3-30B 8
- Note: First sentence of Chapter I.

#### verbatim-hp: Mr. and Mrs. Dursley, of number four, Privet Drive, were proud to say that they were perfectly

```
Mr. and Mrs. Dursley, of number four, Privet Drive, were proud to say that they were perfectly
```

- Expected: normal, thank you very much
- L2-13B at T=0: `normal, thank you very much. They were the last people you'd expect` (right)
- L2-13B at T=0.5: **8/8**; other models k/8: L2-7B – · L3.1-8B 8 · M-7B 8 · Q3-8B 8 · Q3-30B 8
- Note: First sentence of book 1 (a famous, widely quoted line).

## Goal 2: solving a new task from a few examples

- **Format:** each prompt is in the same arrow format as the capitals preset. There are 4-6 solved examples, then the new input. Each task was tried with 6-8 different inputs, for a total of 8 samples per input at T=0.5.
- **Order:** tasks are listed roughly from best to worst for the demo. The best ones use an invented notation, so the "rule" can't have been memorized as a list: `glorb(x) = color` and `apple:fruit:red`. Next come everyday reasoning tasks that wouldn't exist as flashcards ("flat tire → mechanic").
- **"No flashcards"** is my judgement in each note, not a search of the training data.

### glorb-color: made-up function name meaning "color of"

L2-13B: **56/56** at T=0.5 over 7 inputs. Others: L2-7B 47/56 · L3.1-8B 55/56 · M-7B 56/56 · Q3-8B 56/56 · Q3-30B 55/56.

```
glorb(apple) = red
glorb(sky) = blue
glorb(grass) = green
glorb(snow) = white
glorb(banana) = yellow
glorb(coal) =
```

Other inputs replace the last line's "coal".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| coal | black | `black` | 8 | 8 | 8 | 8 | 8 | 8 |
| carrot | orange | `orange` | 8 | 8 | 8 | 8 | 8 | 8 |
| tomato | red | `red` | 8 | 1 | 8 | 8 | 8 | 8 |
| pumpkin | orange | `orange` | 8 | 8 | 8 | 8 | 8 | 8 |
| lemon | yellow | `yellow` | 8 | 7 | 7 | 8 | 8 | 8 |
| crow | black | `black` | 8 | 8 | 8 | 8 | 8 | 8 |
| milk | white | `white` | 8 | 7 | 8 | 8 | 8 | 7 |

Note: "glorb" is not a word; the model has to infer from five examples that it means "color of". Any object from the audience works.

### triples: invented two-attribute format (category:color)

L2-13B: **56/56** at T=0.5 over 7 inputs. Others: L2-7B 45/56 · L3.1-8B 52/56 · M-7B 55/56 · Q3-8B 50/56 · Q3-30B 54/56.

```
apple:fruit:red
carrot:vegetable:orange
banana:fruit:yellow
spinach:vegetable:green
grape:fruit:purple
broccoli:
```

Other inputs replace the last line's "broccoli".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| broccoli | vegetable:green | `vegetable:green` | 8 | 1 | 8 | 8 | 6 | 8 |
| cherry | fruit:red | `fruit:red` | 8 | 8 | 8 | 8 | 6 | 8 |
| eggplant | vegetable / fruit:purple | `vegetable:purple` | 8 | 8 | 7 | 8 | 8 | 6 |
| lime | fruit:green | `fruit:green` | 8 | 4 | 8 | 8 | 6 | 8 |
| pumpkin | vegetable / fruit:orange | `vegetable:orange` | 8 | 8 | 8 | 7 | 8 | 8 |
| blueberry | fruit:blue | `fruit:blue` | 8 | 8 | 8 | 8 | 8 | 8 |
| lemon | fruit:yellow | `fruit:yellow` | 8 | 8 | 5 | 8 | 8 | 8 |

Note: An invented format that asks for two attributes at once; no list on the web looks like this.

### who-to-call: problem → who to call

L2-13B: **55/56** at T=0.5 over 7 inputs. Others: L2-7B 49/56 · L3.1-8B 55/56 · M-7B 56/56 · Q3-8B 52/56 · Q3-30B 51/56.

```
toothache → dentist
broken pipe → plumber
house on fire → firefighters
sick cat → veterinarian
burglar → police
flat tire →
```

Other inputs replace the last line's "flat tire".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| flat tire | mechanic / tow / garage | `tow truck` | 8 | 8 | 8 | 8 | 8 | 7 |
| broken leg | doctor / ambulance / hospital | `doctor` | 8 | 8 | 8 | 8 | 8 | 8 |
| power outage | electrician / electric / power company | `electrician` | 8 | 8 | 8 | 8 | 8 | 8 |
| clogged drain | plumber | `plumber` | 8 | 8 | 7 | 8 | 8 | 8 |
| leaky roof | roofer / roofing / contractor | `roofer` | 8 | 6 | 8 | 8 | 7 | 7 |
| dog with fleas | vet | `vet` | 7 | 3 | 8 | 8 | 5 | 5 |
| locked out of the house | locksmith | `locksmith` | 8 | 8 | 8 | 8 | 8 | 8 |

Note: Everyday reasoning about a new situation; the audience can suggest problems.

### sound-source: sound → what makes it

L2-13B: **54/56** at T=0.5 over 7 inputs. Others: L2-7B – · L3.1-8B 56/56 · M-7B 56/56 · Q3-8B 55/56 · Q3-30B 53/56.

```
woof → dog
moo → cow
tick-tock → clock
ding-dong → doorbell
vroom → car
achoo →
```

Other inputs replace the last line's "achoo".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| achoo | sneez / nose / person | `sneeze` | 8 | – | 8 | 8 | 8 | 6 |
| buzz | bee / fly / insect | `bee` | 7 | – | 8 | 8 | 8 | 8 |
| choo-choo | train | `train` | 8 | – | 8 | 8 | 8 | 8 |
| meow | cat / kitten | `cat` | 8 | – | 8 | 8 | 8 | 8 |
| splash | water / puddle / pool | `water` | 7 | – | 8 | 8 | 7 | 7 |
| knock knock | door | `door` | 8 | – | 8 | 8 | 8 | 8 |
| hiss | snake / cat / steam | `snake` | 8 | – | 8 | 8 | 8 | 8 |

Note: Reverse onomatopoeia; at temperature 0.5 it keeps inventing new sound → source pairs.

### room: object → room of the house

L2-13B: **56/56** at T=0.5 over 7 inputs. Others: L2-7B 56/56 · L3.1-8B 55/56 · M-7B 56/56 · Q3-8B 56/56 · Q3-30B 56/56.

```
toothbrush → bathroom
pillow → bedroom
frying pan → kitchen
sofa → living room
shampoo → bathroom
toaster →
```

Other inputs replace the last line's "toaster".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| toaster | kitchen | `kitchen` | 8 | 8 | 8 | 8 | 8 | 8 |
| shower curtain | bathroom | `bathroom` | 8 | 8 | 8 | 8 | 8 | 8 |
| alarm clock | bedroom | `bedroom` | 8 | 8 | 7 | 8 | 8 | 8 |
| dishwasher | kitchen | `kitchen` | 8 | 8 | 8 | 8 | 8 | 8 |
| coffee table | living room / lounge / family room | `living room` | 8 | 8 | 8 | 8 | 8 | 8 |
| nightstand | bedroom | `bedroom` | 8 | 8 | 8 | 8 | 8 | 8 |
| bathtub | bathroom | `bathroom` | 8 | 8 | 8 | 8 | 8 | 8 |

Note: Simple; ESL vocabulary lists of household objects exist, but not in this form.

### material: object → what it's made of

L2-13B: **53/56** at T=0.5 over 7 inputs. Others: L2-7B 51/56 · L3.1-8B 56/56 · M-7B 56/56 · Q3-8B 56/56 · Q3-30B 55/56.

```
window → glass
coin → metal
sweater → wool
candle → wax
tire → rubber
brick →
```

Other inputs replace the last line's "brick".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| brick | clay / mud / earth | `clay` | 8 | 8 | 8 | 8 | 8 | 7 |
| book | paper | `paper` | 8 | 8 | 8 | 8 | 8 | 8 |
| table | wood | `wood` | 8 | 8 | 8 | 8 | 8 | 8 |
| envelope | paper | `paper` | 8 | 8 | 8 | 8 | 8 | 8 |
| spoon | metal / steel / silver | `metal` | 8 | 8 | 8 | 8 | 8 | 8 |
| pencil | wood / graphite | `wood` | 5 | 3 | 8 | 8 | 8 | 8 |
| bottle | glass / plastic | `glass` | 8 | 8 | 8 | 8 | 8 | 8 |

Note: Simple; open-ended answers (pencil: wood or graphite) make a nice discussion.

### used-for: object → what it's for (a verb)

L2-13B: **55/56** at T=0.5 over 7 inputs. Others: L2-7B 55/56 · L3.1-8B 56/56 · M-7B 55/56 · Q3-8B 55/56 · Q3-30B 56/56.

```
scissors → cut
broom → sweep
pen → write
oven → bake
shovel → dig
needle →
```

Other inputs replace the last line's "needle".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| needle | sew / stitch | `sew` | 8 | 8 | 8 | 8 | 8 | 8 |
| key | unlock / open / lock | `unlock` | 8 | 8 | 8 | 8 | 8 | 8 |
| sponge | clean / wash / wipe | `wash` | 8 | 8 | 8 | 7 | 7 | 8 |
| ladder | climb | `climb` | 8 | 8 | 8 | 8 | 8 | 8 |
| towel | dry / wipe | `dry` | 8 | 8 | 8 | 8 | 8 | 8 |
| saw | cut / saw | `cut` | 8 | 8 | 8 | 8 | 8 | 8 |
| telescope | see / look / view | `see` | 7 | 7 | 8 | 8 | 8 | 8 |

Note: Answers are verbs, which shows it picked up the format, not just the topic.

### wear-where: clothing → body part

L2-13B: **52/56** at T=0.5 over 7 inputs. Others: L2-7B 52/56 · L3.1-8B 53/56 · M-7B 54/56 · Q3-8B 45/56 · Q3-30B 54/56.

```
glove → hand
sock → foot
hat → head
scarf → neck
earring → ear
ring →
```

Other inputs replace the last line's "ring".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| ring | finger | `finger` | 8 | 8 | 8 | 8 | 8 | 8 |
| watch | wrist | `wrist` | 7 | 8 | 8 | 8 | 7 | 8 |
| belt | waist / hips | `waist` | 8 | 8 | 8 | 8 | 8 | 8 |
| sunglasses | eyes / face / nose | `eyes` | 5 | 4 | 5 | 6 | 0 | 6 |
| boot | foot / feet / leg | `foot` | 8 | 8 | 8 | 8 | 6 | 8 |
| bracelet | wrist / arm | `wrist` | 8 | 8 | 8 | 8 | 8 | 8 |
| necklace | neck | `neck` | 8 | 8 | 8 | 8 | 8 | 8 |

Note: Simple and robust.

### animal-home: animal → its home

L2-13B: **50/56** at T=0.5 over 7 inputs. Others: L2-7B – · L3.1-8B 38/56 · M-7B 56/56 · Q3-8B 54/56 · Q3-30B 56/56.

```
bird → nest
bee → hive
spider → web
rabbit → burrow
fox →
```

Other inputs replace the last line's "fox".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| fox | den / burrow / hole | `den` | 8 | – | 8 | 8 | 8 | 8 |
| beaver | lodge / dam | `dam` | 8 | – | 8 | 8 | 7 | 8 |
| ant | ant hill / nest / colony | `anthill` | 8 | – | 4 | 8 | 8 | 8 |
| horse | stable / barn | `stable` | 8 | – | 2 | 8 | 8 | 8 |
| pig | sty / pen / barn | `sty` | 7 | – | 8 | 8 | 8 | 8 |
| dog | kennel / dog house | `kennel` | 3 | – | 0 | 8 | 7 | 8 |
| bat | cave / belfry / roost | `cave` | 8 | – | 8 | 8 | 8 | 8 |

Note: Children's worksheets with this exist; "dog" splits between kennel and den.

### covering: animal → what it's covered in

L2-13B: **45/56** at T=0.5 over 7 inputs. Others: L2-7B 43/56 · L3.1-8B 48/56 · M-7B 44/56 · Q3-8B 47/56 · Q3-30B 56/56.

```
dog → fur
parrot → feathers
snake → scales
sheep → wool
frog → skin
goldfish →
```

Other inputs replace the last line's "goldfish".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| goldfish | scales | `scales` | 8 | 8 | 7 | 8 | 8 | 8 |
| eagle | feathers | `feathers` | 8 | 6 | 8 | 6 | 8 | 8 |
| bear | fur | `fur` | 8 | 8 | 8 | 5 | 1 | 8 |
| lizard | scales | `scales` | 5 | 3 | 5 | 4 | 8 | 8 |
| penguin | feathers | `feathers` | 7 | 8 | 8 | 8 | 8 | 8 |
| rabbit | fur | `fur` | 8 | 8 | 8 | 8 | 7 | 8 |
| crocodile | scales | `skin` ✗ | 1 | 2 | 4 | 5 | 7 | 8 |

Note: Children's worksheets exist; crocodile → skin is a fun miss.

### season: thing → season

L2-13B: **48/56** at T=0.5 over 7 inputs. Others: L2-7B 49/56 · L3.1-8B 50/56 · M-7B 51/56 · Q3-8B 51/56 · Q3-30B 55/56.

```
snowman → winter
beach → summer
falling leaves → autumn
blooming flowers → spring
sledding →
```

Other inputs replace the last line's "sledding".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| sledding | winter | `winter` | 8 | 8 | 8 | 8 | 8 | 8 |
| pumpkin | autumn / fall | `Halloween` ✗ | 0 | 1 | 2 | 3 | 3 | 7 |
| swimming pool | summer | `summer` | 8 | 8 | 8 | 8 | 8 | 8 |
| ice skating | winter | `winter` | 8 | 8 | 8 | 8 | 8 | 8 |
| raking leaves | autumn / fall | `fall` | 8 | 8 | 8 | 8 | 8 | 8 |
| baby birds hatching | spring | `spring` | 8 | 8 | 8 | 8 | 8 | 8 |
| ice cream truck | summer | `summer` | 8 | 8 | 8 | 8 | 8 | 8 |

Note: "pumpkin → Halloween": it followed the topic but broke the format.

### ingredients: ingredients → dish

L2-13B: **46/48** at T=0.5 over 6 inputs. Others: L2-7B 48/48 · L3.1-8B 48/48 · M-7B 48/48 · Q3-8B 48/48 · Q3-30B 48/48.

```
flour, eggs, milk → pancakes
bread, cheese, butter → grilled cheese sandwich
dough, tomato sauce, cheese → pizza
lettuce, tomato, cucumber → salad
rice, seaweed, raw fish →
```

Other inputs replace the last line's "rice, seaweed, raw fish".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| rice, seaweed, raw fish | sushi | `sushi` | 8 | 8 | 8 | 8 | 8 | 8 |
| tortilla, beans, cheese | burrito / quesadilla / taco | `burrito` | 8 | 8 | 8 | 8 | 8 | 8 |
| pasta, tomato sauce, meatballs | spaghetti / pasta | `spaghetti and meatballs` | 7 | 8 | 8 | 8 | 8 | 8 |
| chicken, broth, noodles | soup | `chicken soup` | 8 | 8 | 8 | 8 | 8 | 8 |
| bread, peanut butter, jelly | sandwich / pb | `peanut butter and jelly sandwich` | 7 | 8 | 8 | 8 | 8 | 8 |
| milk, ice cream, chocolate syrup | milkshake / shake / sundae | `milkshake` | 8 | 8 | 8 | 8 | 8 | 8 |

Note: Fuzzy answers are all reasonable.

### compound: two words → compound word

L2-13B: **48/48** at T=0.5 over 6 inputs. Others: L2-7B – · L3.1-8B 40/48 · M-7B 48/48 · Q3-8B 42/48 · Q3-30B 40/48.

```
sun + flower → sunflower
rain + bow → rainbow
foot + ball → football
cup + cake → cupcake
butter + fly →
```

Other inputs replace the last line's "butter + fly".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| butter + fly | butterfly | `butterfly` | 8 | – | 8 | 8 | 8 | 8 |
| tooth + brush | toothbrush | `toothbrush` | 8 | – | 8 | 8 | 8 | 8 |
| snow + man | snowman | `snowman` | 8 | – | 8 | 8 | 8 | 8 |
| star + fish | starfish | `starfish` | 8 | – | 8 | 8 | 8 | 8 |
| pop + corn | popcorn | `popcorn` | 8 | – | 8 | 8 | 8 | 8 |
| fire + work | firework | `firework` | 8 | – | 0 | 8 | 2 | 0 |

Note: Lists of compound words exist (school worksheets), so weaker for the "no flashcards" point.

### category: two things → their category

L2-13B: **56/56** at T=0.5 over 7 inputs. Others: L2-7B 56/56 · L3.1-8B 56/56 · M-7B 56/56 · Q3-8B 56/56 · Q3-30B 56/56.

```
apple, banana → fruit
hammer, saw → tools
red, blue → colors
dog, cat → animals
shirt, pants → clothes
trumpet, violin →
```

Other inputs replace the last line's "trumpet, violin".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| trumpet, violin | instrument | `musical instruments` | 8 | 8 | 8 | 8 | 8 | 8 |
| Mars, Venus | planet | `planets` | 8 | 8 | 8 | 8 | 8 | 8 |
| oak, maple | tree | `trees` | 8 | 8 | 8 | 8 | 8 | 8 |
| carrot, potato | vegetable | `vegetables` | 8 | 8 | 8 | 8 | 8 | 8 |
| shark, salmon | fish | `fish` | 8 | 8 | 8 | 8 | 8 | 8 |
| rose, tulip | flower | `flowers` | 8 | 8 | 8 | 8 | 8 | 8 |
| Monday, Friday | day | `days of the week` | 8 | 8 | 8 | 8 | 8 | 8 |

Note: Very robust, but category lists are common.

### tool: profession → a tool

L2-13B: **53/56** at T=0.5 over 7 inputs. Others: L2-7B 53/56 · L3.1-8B 56/56 · M-7B 52/56 · Q3-8B 53/56 · Q3-30B 56/56.

```
carpenter → hammer
painter → brush
writer → pen
farmer → tractor
doctor → stethoscope
surgeon →
```

Other inputs replace the last line's "surgeon".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| surgeon | scalpel / knife | `scalpel` | 8 | 8 | 8 | 8 | 8 | 8 |
| photographer | camera | `camera` | 8 | 8 | 8 | 8 | 8 | 8 |
| barber | scissors / razor / clippers | `scissors` | 8 | 8 | 8 | 8 | 8 | 8 |
| plumber | wrench / plunger / spanner | `wrench` | 8 | 8 | 8 | 8 | 8 | 8 |
| gardener | shovel / rake / hoe | `shovel` | 8 | 8 | 8 | 7 | 7 | 8 |
| firefighter | hose / axe / ax | `fire hose` | 6 | 6 | 8 | 6 | 6 | 8 |
| chef | knife / pan / spatula | `spatula` | 7 | 7 | 8 | 7 | 8 | 8 |

Note: Robust.

### emotion: sentence → speaker's emotion

L2-13B: **36/40** at T=0.5 over 5 inputs. Others: L2-7B 34/40 · L3.1-8B 33/40 · M-7B 24/40 · Q3-8B 38/40 · Q3-30B 32/40.

```
I won the lottery! → happy
My dog ran away. → sad
Someone stole my bike! → angry
There's a spider on my pillow! → scared
I got an A on my test! →
```

Other inputs replace the last line's "I got an A on my test!".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| I got an A on my test! | happy / proud / excited | `proud` | 8 | 8 | 8 | 7 | 8 | 8 |
| My best friend moved away. | sad / lonely / upset | `lonely` | 8 | 8 | 5 | 7 | 8 | 8 |
| Somebody cut in front of me in line. | angry / annoyed / mad | `mad` | 8 | 6 | 7 | 6 | 7 | 8 |
| I heard footsteps in the empty house. | scared / afraid / frightened | `scared` | 5 | 4 | 5 | 0 | 8 | 8 |
| My grandma baked me cookies. | happy / grateful / loved | `happy` | 7 | 8 | 8 | 4 | 7 | 0 |

Note: Sentiment-style; several answers are acceptable.

### person-country-capital: person → birth country → capital (two hops)

L2-13B: **45/56** at T=0.5 over 7 inputs. Others: L2-7B 39/56 · L3.1-8B 41/56 · M-7B 43/56 · Q3-8B 32/56 · Q3-30B 44/56.

```
Mozart → Austria → Vienna
Shakespeare → England → London
Tolstoy → Russia → Moscow
Confucius → China → Beijing
Picasso →
```

Other inputs replace the last line's "Picasso".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| Picasso | spain → madrid | `Spain → Madrid` | 5 | 0 | 2 | 3 | 0 | 6 |
| Gandhi | india → new delhi | `India → New Delhi` | 8 | 8 | 7 | 8 | 0 | 8 |
| Frida Kahlo | mexico → mexico city | `Mexico → Mexico City` | 8 | 8 | 8 | 8 | 8 | 8 |
| Chopin | poland → warsaw | `Poland → Warsaw` | 8 | 7 | 8 | 8 | 8 | 8 |
| Pelé | brazil → bras[ií]lia | `Brazil → Rio de Janeiro` ✗ | 0 | 0 | 0 | 0 | 0 | 0 |
| Van Gogh | netherlands → amsterdam / holland → amsterdam | `Netherlands → Amsterdam` | 8 | 8 | 8 | 8 | 8 | 8 |
| Einstein | germany → berlin | `Germany → Berlin` | 8 | 8 | 8 | 8 | 8 | 6 |

Note: Two hops (birthplace, then capital). Pelé → Rio de Janeiro (wrong) is a nice miss: a famous city instead of the capital.

### rhyme-animal: word → a rhyming animal

L2-13B: **37/56** at T=0.5 over 7 inputs. Others: L2-7B 2/56 · L3.1-8B 31/56 · M-7B 32/56 · Q3-8B 0/56 · Q3-30B 40/56.

```
house → mouse
log → frog
hat → cat
boat → goat
chair → bear
rake →
```

Other inputs replace the last line's "rake".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| rake | snake | `snake` | 6 | 1 | 6 | 8 | 0 | 7 |
| big | pig | `pig` | 7 | 0 | 8 | 7 | 0 | 8 |
| box | fox / ox | `fox` | 8 | 1 | 8 | 8 | 0 | 8 |
| tree | bee / flea | `bee` | 8 | 0 | 6 | 1 | 0 | 6 |
| sail | whale / snail / quail | `whale` | 6 | 0 | 1 | 8 | 0 | 6 |
| juice | moose / goose | `deuce` ✗ | 0 | 0 | 2 | 0 | 0 | 5 |
| bug | pug / slug | `dog` ✗ | 2 | 0 | 0 | 0 | 0 | 0 |

Note: Rhyming is hard for a model that sees word pieces, not sounds; good discussion point.

### float: floats or sinks

L2-13B: **53/64** at T=0.5 over 8 inputs. Others: L2-7B 48/64 · L3.1-8B 51/64 · M-7B 50/64 · Q3-8B 63/64 · Q3-30B 64/64.

```
cork → floats
brick → sinks
leaf → floats
coin → sinks
beach ball → floats
rock → sinks
apple →
```

Other inputs replace the last line's "apple".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| apple | floats | `floats` | 7 | 7 | 0 | 7 | 7 | 8 |
| key | sinks | `sinks` | 6 | 4 | 8 | 4 | 8 | 8 |
| ice cube | floats | `floats` | 7 | 5 | 8 | 5 | 8 | 8 |
| anchor | sinks | `sinks` | 6 | 6 | 8 | 8 | 8 | 8 |
| rubber duck | floats | `floats` | 7 | 8 | 8 | 8 | 8 | 8 |
| hammer | sinks | `sinks` | 8 | 6 | 8 | 8 | 8 | 8 |
| log | floats | `sinks` ✗ | 4 | 7 | 4 | 4 | 8 | 8 |
| marble | sinks | `sinks` | 8 | 5 | 7 | 6 | 8 | 8 |

Note: "log → sinks" is a surprising miss.

### alive: alive or not alive

L2-13B: **46/56** at T=0.5 over 7 inputs. Others: L2-7B – · L3.1-8B 48/56 · M-7B 53/56 · Q3-8B 56/56 · Q3-30B 51/56.

```
dog → alive
rock → not alive
tree → alive
chair → not alive
worm → alive
spoon → not alive
mushroom →
```

Other inputs replace the last line's "mushroom".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| mushroom | alive | `not alive` ✗ | 3 | – | 8 | 8 | 8 | 8 |
| cloud | not alive | `not alive` | 8 | – | 1 | 8 | 8 | 8 |
| fire | not alive | `not alive` | 8 | – | 8 | 8 | 8 | 3 |
| jellyfish | alive | `not alive` ✗ | 4 | – | 8 | 8 | 8 | 8 |
| robot | not alive | `not alive` | 8 | – | 7 | 5 | 8 | 8 |
| moss | alive | `alive` | 7 | – | 8 | 8 | 8 | 8 |
| candle | not alive | `not alive` | 8 | – | 8 | 8 | 8 | 8 |

Note: Mushroom and jellyfish are borderline for the model; good discussion.

### sense: thing → which sense

L2-13B: **29/56** at T=0.5 over 7 inputs. Others: L2-7B 33/56 · L3.1-8B 20/56 · M-7B 31/56 · Q3-8B 52/56 · Q3-30B 56/56.

```
song → hearing
perfume → smell
rainbow → sight
sandpaper → touch
lemon → taste
thunder →
```

Other inputs replace the last line's "thunder".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| thunder | hearing | `sound` ✗ | 6 | 0 | 3 | 0 | 8 | 8 |
| rotten egg | smell | `taste` ✗ | 1 | 7 | 4 | 8 | 8 | 8 |
| painting | sight | `sight` | 6 | 8 | 0 | 4 | 8 | 8 |
| chili pepper | taste | `taste` | 7 | 7 | 3 | 6 | 8 | 8 |
| velvet | touch | `touch` | 4 | 5 | 0 | 8 | 4 | 8 |
| whistle | hearing | `sound` ✗ | 0 | 2 | 7 | 0 | 8 | 8 |
| fireworks | sight / hearing | `sound` ✗ | 5 | 4 | 3 | 5 | 8 | 8 |

Note: Llama-2-13B often answers "sound" instead of "hearing": it gets the idea, not the format.

### heavier: which of two is heavier

L2-13B: **20/48** at T=0.5 over 6 inputs. Others: L2-7B 27/48 · L3.1-8B 34/48 · M-7B 36/48 · Q3-8B 48/48 · Q3-30B 48/48.

```
a feather or a brick → a brick
a car or a bicycle → a car
a pencil or a chair → a chair
an elephant or a dog → an elephant
a cat or a horse →
```

Other inputs replace the last line's "a cat or a horse".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| a cat or a horse | horse | `a cat` ✗ | 1 | 0 | 5 | 8 | 8 | 8 |
| a watermelon or a grape | watermelon | `a watermelon` | 8 | 8 | 7 | 6 | 8 | 8 |
| a penny or a bowling ball | bowling | `a penny` ✗ | 1 | 2 | 8 | 8 | 8 | 8 |
| a truck or a skateboard | truck | `a truck` | 6 | 8 | 4 | 7 | 8 | 8 |
| a mouse or a cow | cow | `a mouse` ✗ | 0 | 2 | 4 | 7 | 8 | 8 |
| an anvil or a pillow | anvil | `a pillow` ✗ | 4 | 7 | 6 | 0 | 8 | 8 |

Note: Llama-2-13B gets this badly wrong ("a mouse or a cow → a mouse", 0/8), while Qwen3-30B is 48/48.

### sort-size: sort three things by size

L2-13B: **8/48** at T=0.5 over 6 inputs. Others: L2-7B 25/48 · L3.1-8B 27/48 · M-7B 29/48 · Q3-8B 46/48 · Q3-30B 39/48.

```
elephant, mouse, dog → mouse, dog, elephant
bus, bicycle, car → bicycle, car, bus
mountain, pebble, boulder → pebble, boulder, mountain
house, ant, car →
```

Other inputs replace the last line's "house, ant, car".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| house, ant, car | ant, car, house | `car, ant, house` ✗ | 0 | 6 | 5 | 8 | 8 | 8 |
| watermelon, grape, apple | grape, apple, watermelon | `grape, apple, watermelon` | 3 | 3 | 5 | 1 | 8 | 8 |
| sun, moon, earth | moon, earth, sun | `earth, sun, moon` ✗ | 1 | 0 | 5 | 6 | 8 | 7 |
| whale, goldfish, dolphin | goldfish, dolphin, whale | `dolphin, goldfish, whale` ✗ | 2 | 7 | 5 | 8 | 8 | 8 |
| giraffe, cat, horse | cat, horse, giraffe | `horse, cat, giraffe` ✗ | 1 | 4 | 7 | 4 | 8 | 8 |
| city, chair, coin | coin, chair, city | `chair, coin, city` ✗ | 1 | 5 | 0 | 2 | 6 | 0 |

Note: Hard for Llama-2-13B (8/48); Qwen3-8B 46/48.

### shoebox: bigger than a shoebox? (the rule is never stated)

L2-13B: **34/64** at T=0.5 over 8 inputs. Others: L2-7B 42/64 · L3.1-8B 48/64 · M-7B 33/64 · Q3-8B 58/64 · Q3-30B 37/64.

```
elephant → yes
pencil → no
car → yes
coin → no
sofa → yes
key → no
bicycle →
```

Other inputs replace the last line's "bicycle".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| bicycle | yes | `yes` | 7 | 8 | 8 | 8 | 8 | 8 |
| grape | no | `yes` ✗ | 1 | 4 | 2 | 0 | 6 | 1 |
| piano | yes | `yes` | 7 | 7 | 8 | 8 | 7 | 8 |
| spoon | no | `yes` ✗ | 3 | 4 | 4 | 1 | 5 | 2 |
| refrigerator | yes | `yes` | 7 | 8 | 8 | 7 | 8 | 8 |
| earring | no | `yes` ✗ | 1 | 3 | 6 | 1 | 8 | 1 |
| horse | yes | `yes` | 7 | 7 | 8 | 8 | 8 | 8 |
| button | no | `yes` ✗ | 1 | 1 | 4 | 0 | 8 | 1 |

Note: The rule is never stated; the models mostly say "yes" to small things. Ambiguous prompt; avoid.

### which-first: which comes first (examples always answer with the first option)

L2-13B: **33/56** at T=0.5 over 7 inputs. Others: L2-7B 32/56 · L3.1-8B 31/56 · M-7B 37/56 · Q3-8B 35/56 · Q3-30B 36/56.

```
breakfast or dinner → breakfast
seed or tree → seed
Monday or Wednesday → Monday
egg or bird → egg
caterpillar or butterfly →
```

Other inputs replace the last line's "caterpillar or butterfly".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| caterpillar or butterfly | caterpillar | `caterpillar` | 8 | 6 | 8 | 6 | 8 | 7 |
| sunset or sunrise | sunrise | `sunset` ✗ | 0 | 0 | 0 | 6 | 0 | 2 |
| tadpole or frog | tadpole | `tadpole` | 8 | 8 | 8 | 7 | 8 | 8 |
| teenager or toddler | toddler | `teenager` ✗ | 0 | 0 | 0 | 0 | 3 | 7 |
| Friday or Tuesday | tuesday | `Friday` ✗ | 1 | 2 | 0 | 3 | 0 | 1 |
| lightning or thunder | lightning | `lightning` | 8 | 8 | 7 | 8 | 8 | 6 |
| bread or toast | bread | `bread` | 8 | 8 | 8 | 7 | 8 | 5 |

Note: All four examples answer with the first option, and every model copies that pattern (sunset before sunrise, teenager before toddler): an instructive failure about spurious patterns.

### which-first-mixed: which comes first (mixed order in the examples)

L2-13B: **36/56** at T=0.5 over 7 inputs. Others: L2-7B – · L3.1-8B 38/56 · M-7B 22/56 · Q3-8B 38/56 · Q3-30B 37/56.

```
breakfast or dinner → breakfast
tree or seed → seed
Monday or Wednesday → Monday
bird or egg → egg
adult or baby → baby
caterpillar or butterfly →
```

Other inputs replace the last line's "caterpillar or butterfly".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| caterpillar or butterfly | caterpillar | `caterpillar` | 7 | – | 8 | 1 | 8 | 3 |
| sunset or sunrise | sunrise | `sunset` ✗ | 3 | – | 2 | 5 | 4 | 5 |
| frog or tadpole | tadpole | `tadpole` | 8 | – | 8 | 5 | 8 | 8 |
| teenager or toddler | toddler | `toddler` | 8 | – | 7 | 0 | 7 | 8 |
| Friday or Tuesday | tuesday | `Friday` ✗ | 1 | – | 4 | 4 | 2 | 8 |
| thunder or lightning | lightning | `lightning` | 3 | – | 5 | 3 | 1 | 0 |
| toast or bread | bread | `bread` | 6 | – | 4 | 4 | 8 | 5 |

Note: Same task with the examples' answers in mixed positions: better for teenager/toddler, still bad for Friday/Tuesday.

### zib-legs: made-up function name meaning "number of legs"

L2-13B: **0/56** at T=0.5 over 7 inputs. Others: L2-7B 4/56 · L3.1-8B 0/56 · M-7B 1/56 · Q3-8B 35/56 · Q3-30B 54/56.

```
zib(dog) = 4
zib(bird) = 2
zib(spider) = 8
zib(fish) = 0
zib(ant) = 6
zib(cat) =
```

Other inputs replace the last line's "cat".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| cat | 4 | `1` ✗ | 0 | 0 | 0 | 0 | 8 | 6 |
| chicken | 2 | `3` ✗ | 0 | 2 | 0 | 1 | 0 | 8 |
| beetle | 6 | `10` ✗ | 0 | 0 | 0 | 0 | 1 | 8 |
| snake | 0 | `1` ✗ | 0 | 1 | 0 | 0 | 8 | 8 |
| horse | 4 | `5` ✗ | 0 | 0 | 0 | 0 | 8 | 8 |
| kangaroo | 2 | `1` ✗ | 0 | 1 | 0 | 0 | 4 | 8 |
| penguin | 2 | `10` ✗ | 0 | 0 | 0 | 0 | 6 | 8 |

Note: Same idea as glorb, but numbers: only the Qwen models get it.

## Instructive failures

These fail on most models. They are worth showing only as "here is what it can't do": the model reads text as word pieces, not letters, and it has trouble doing two steps at once without writing out the middle step.

### capital-letter: country → first letter of its capital (two hops)

L2-13B: **2/56** at T=0.5 over 7 inputs. Others: L2-7B 6/56 · L3.1-8B 5/56 · M-7B 7/56 · Q3-8B 2/56 · Q3-30B 2/56.

```
France → P
Japan → T
Kenya → N
Canada → O
Argentina → B
Peru →
```

Other inputs replace the last line's "Peru".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| Peru | L | `C` ✗ | 0 | 0 | 2 | 0 | 1 | 0 |
| Egypt | C | `A` ✗ | 1 | 1 | 0 | 1 | 0 | 0 |
| Australia | C | `A` ✗ | 1 | 2 | 2 | 2 | 0 | 1 |
| Germany | B | `A` ✗ | 0 | 0 | 0 | 1 | 0 | 0 |
| Thailand | B | `C` ✗ | 0 | 0 | 0 | 1 | 0 | 0 |
| Italy | R | `A` ✗ | 0 | 0 | 0 | 2 | 1 | 1 |
| Russia | M | `R` ✗ | 0 | 3 | 1 | 0 | 0 | 0 |

Note: Fails on every model (≤12%): composing two easy steps is hard without writing out the middle step.

### legs-x2: animal → legs × 2 (two hops)

L2-13B: **3/56** at T=0.5 over 7 inputs. Others: L2-7B 0/56 · L3.1-8B 1/56 · M-7B 2/56 · Q3-8B 2/56 · Q3-30B 14/56.

```
dog → 8
chicken → 4
spider → 16
snake → 0
ant → 12
horse →
```

Other inputs replace the last line's "horse".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| horse | 8 | `10` ✗ | 0 | 0 | 0 | 0 | 0 | 1 |
| duck | 4 | `16` ✗ | 1 | 0 | 0 | 0 | 0 | 0 |
| cow | 8 | `10` ✗ | 0 | 0 | 0 | 0 | 0 | 0 |
| bee | 12 | `1` ✗ | 1 | 0 | 0 | 1 | 1 | 8 |
| ostrich | 4 | `0` ✗ | 1 | 0 | 0 | 1 | 0 | 0 |
| cat | 8 | `16` ✗ | 0 | 0 | 1 | 0 | 0 | 1 |
| beetle | 12 | `0` ✗ | 0 | 0 | 0 | 0 | 1 | 4 |

Note: Fails on every model (≤25%): Qwen3-30B mostly gives the number of legs and forgets to double it.

### letter-count: word → number of letters

L2-13B: **2/48** at T=0.5 over 6 inputs. Others: L2-7B 9/48 · L3.1-8B 2/48 · M-7B 7/48 · Q3-8B 39/48 · Q3-30B 43/48.

```
cat → 3
house → 5
elephant → 8
sun → 3
pencil → 6
giraffe →
```

Other inputs replace the last line's "giraffe".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| giraffe | 7 | `10` ✗ | 1 | 2 | 1 | 1 | 8 | 8 |
| banana | 6 | `4` ✗ | 0 | 1 | 1 | 0 | 3 | 8 |
| computer | 8 | `4` ✗ | 1 | 0 | 0 | 3 | 6 | 7 |
| strawberry | 10 | `4` ✗ | 0 | 1 | 0 | 0 | 8 | 8 |
| butterfly | 9 | `1` ✗ | 0 | 1 | 0 | 3 | 7 | 8 |
| umbrella | 8 | `1` ✗ | 0 | 4 | 0 | 0 | 7 | 4 |

Note: Classic failure for the Llama models (≤19%); the Qwen models do well (81-90%), so it's model-dependent.

### count-e: word → how many e's

L2-13B: **3/48** at T=0.5 over 6 inputs. Others: L2-7B 5/48 · L3.1-8B 6/48 · M-7B 5/48 · Q3-8B 12/48 · Q3-30B 9/48.

```
tree → 2
elephant → 2
cat → 0
cheese → 3
bed → 1
excellence →
```

Other inputs replace the last line's "excellence".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| excellence | 4 | `2` ✗ | 0 | 1 | 0 | 0 | 2 | 0 |
| seventeen | 4 | `1` ✗ | 0 | 0 | 0 | 0 | 0 | 1 |
| beekeeper | 5 | `1` ✗ | 0 | 0 | 0 | 0 | 0 | 0 |
| teeth | 2 | `0` ✗ | 1 | 2 | 2 | 2 | 3 | 4 |
| referee | 4 | `1` ✗ | 1 | 0 | 0 | 0 | 1 | 2 |
| bell | 1 | `0` ✗ | 1 | 2 | 4 | 3 | 6 | 2 |

Note: Fails on every model (≤25%).

### reverse: word → spelled backwards

L2-13B: **2/48** at T=0.5 over 6 inputs. Others: L2-7B 0/48 · L3.1-8B 8/48 · M-7B 2/48 · Q3-8B 19/48 · Q3-30B 22/48.

```
cat → tac
house → esuoh
pencil → licnep
water → retaw
garden →
```

Other inputs replace the last line's "garden".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| garden | nedrag | `dnagert` ✗ | 0 | 0 | 0 | 0 | 1 | 4 |
| monkey | yeknom | `enokym` ✗ | 0 | 0 | 4 | 0 | 5 | 3 |
| planet | tenalp | `etapno` ✗ | 0 | 0 | 2 | 1 | 0 | 1 |
| bottle | elttob | `tlebbor` ✗ | 1 | 0 | 1 | 1 | 6 | 3 |
| orange | egnaro | `egnaro` | 1 | 0 | 0 | 0 | 4 | 8 |
| window | wodniw | `nwinoet` ✗ | 0 | 0 | 1 | 0 | 3 | 3 |

Note: Fails on Llama-2-13B (2/48): the model sees word pieces, not letters.

### capital: country → capital (the current preset; flashcards exist)

L2-13B: **24/32** at T=0.5 over 4 inputs. Others: L2-7B 24/32 · L3.1-8B 31/32 · M-7B 25/32 · Q3-8B 32/32 · Q3-30B 32/32.

```
France → Paris
Japan → Tokyo
Kenya → Nairobi
Canada → Ottawa
Argentina → Buenos Aires
Peru →
```

Other inputs replace the last line's "Peru".

| input | expected | L2-13B T=0 | L2-13B k/8 | L2-7B | L3.1-8B | M-7B | Q3-8B | Q3-30B |
|---|---|---|---|---|---|---|---|---|
| Peru | lima | `Lima` | 8 | 8 | 8 | 8 | 8 | 8 |
| Egypt | cairo | `Cairo` | 8 | 8 | 8 | 8 | 8 | 8 |
| Australia | canberra | `Sydney` ✗ | 0 | 0 | 7 | 1 | 8 | 8 |
| Thailand | bangkok | `Bangkok` | 8 | 8 | 8 | 8 | 8 | 8 |

Note: Flashcards exist. Llama-2-13B says Sydney for Australia, a common human mistake.

## What the text box shows after the answer (no stop sequence)

The demo sends no stop sequence, so the model keeps writing after the answer until it hits max tokens or the end-of-text token. These are L2-13B completions with max_tokens 60 (T=0, then two at T=0.5), logged in `llama2-13b.nostop.jsonl`. It continues the pattern with new made-up items, or drifts into web-page text (StackOverflow-style `\end{code}`), never into chat. (T=0 isn't exactly repeatable in llama-server: for "flat tire" the graded T=0 run said "tow truck" and this one says "mechanic".)

- **alice-infant**
  - T=0.0: ` A pig. ⏎  ⏎ Q: What did the Duchess do to the baby? ⏎ A: She smacked it. ⏎  ⏎ Q: What did the Duchess do to the cook? ⏎ A: She boxed her ears. ⏎  ⏎ Q: What did the Duchess do`
  - T=0.5: ` A pig. ⏎  ⏎ Q: What did the Duchess do with her baby? ⏎ A: Fed it on bread-and-butter. ⏎  ⏎ Q: What did the Duchess do with her bread-and-butter? ⏎ A: Fed it to her baby. ⏎ `
  - T=0.5: ` A pig. ⏎  ⏎ Q: What is the name of the Duchess's cook? ⏎ A: The Duchess, herself. ⏎  ⏎ Q: What was the Queen's sentence for the Knave of Hearts? ⏎ A: Off with his head. ⏎  ⏎ Q`
- **hp-whydoe**
  - T=0.0: ` Snape loved Lily, and his Patronus is a doe, the same as Lily's. ⏎  ⏎ Q: What is the name of the book that Harry finds in the restricted section of the library? ⏎ A: The Tales`
  - T=0.5: ` Because Lily was Snape's true love. ⏎  ⏎ Q: What is the name of the headmaster of Hogwarts? ⏎ A: Albus Dumbledore. ⏎  ⏎ Q: What is the name of the Defense Against the Dark Arts te`
  - T=0.5: ` They were in love. ⏎  ⏎ Q: What is the name of the Dursleys' dog? ⏎ A: Vernon called it "Snuffles" but its real name was "Fluffy". ⏎  ⏎ Q: Why does Harry's hair grow back after he`
- **glorb-color:coal**
  - T=0.0: ` black ⏎ glorb(sand) = brown ⏎ glorb(water) = blue ⏎ glorb(dirt) = brown ⏎ glorb(stone) = grey ⏎ glorb(wood) = brown ⏎ glorb(brick) = red ⏎ glorb(metal) =`
  - T=0.5: ` black ⏎ \end{code} ⏎  ⏎ I'm trying to write a function that will take a string, and return the color it represents. ⏎  ⏎ \begin{code} ⏎ function getColor(string) { ⏎   if (string === `
  - T=0.5: ` black ⏎ glorb(earth) = brown ⏎ glorb(sun) = orange ⏎ glorb(moon) = grey ⏎ glorb(water) = blue ⏎  ⏎  ⏎  ⏎  ⏎  ⏎  ⏎  ⏎  ⏎  ⏎  ⏎  ⏎  ⏎  ⏎  ⏎  ⏎  ⏎  ⏎  ⏎  ⏎  ⏎  ⏎  ⏎  ⏎  ⏎ `
- **who-to-call:flat tire**
  - T=0.0: ` mechanic ⏎ car accident → police ⏎ broken leg → doctor ⏎ broken arm → doctor ⏎ broken bone → doctor ⏎ broken rib → doctor ⏎ broken nose → doctor ⏎ broken finger → doctor ⏎ broken tooth `
  - T=0.5: ` roadside assistance ⏎ I've been thinking about the meaning of these words. ⏎ "Plumber" is a noun. "Plumber" is a verb. ⏎ "Plumber" is a profession. ⏎ "Plumber" is a person. ⏎ "Plu`
  - T=0.5: ` roadside assistance ⏎ car accident → ambulance ⏎ car accident → tow truck ⏎ car accident → lawyer ⏎ car accident → insurance company ⏎ car accident → body shop ⏎ car accident → rent`
- **triples:broccoli**
  - T=0.0: `vegetable:green ⏎ apple:fruit:red ⏎ carrot:vegetable:orange ⏎ banana:fruit:yellow ⏎ spinach:vegetable:green ⏎ grape:fruit:purple ⏎ broccoli:vegetable:green ⏎ `
  - T=0.5: `vegetable:green ⏎ \end{code} ⏎  ⏎ I want to search the items in the list that contain the string "fruit" ⏎  ⏎ I tried: ⏎  ⏎ \begin{code} ⏎ df = df.loc[df['fruit'] == 'fruit'] ⏎ `
  - T=0.5: `vegetable:green ⏎ pear:fruit:green ⏎ eggplant:vegetable:purple ⏎ apple:fruit:red ⏎ carrot:vegetable:orange ⏎ banana:fruit:yellow ⏎ spinach:vegetable:green ⏎ `
- **cloze-alice-baby**
  - T=0.0: ` pig. ⏎ In Alice's Adventures in Wonderland, the baby that the Duchess was nursing turned into a pig. ⏎ In Alice's Adventures in Wonderland, the baby that the Duchess was nur`
  - T=0.5: ` pig. ⏎ In 1871, the first US patent for a typewriter was granted to Christopher Latham Sholes. ⏎ The first intercollegiate football game was played in 1869 between Rutgers a`
  - T=0.5: ` pig. The Duchess's "pig" is an example of ___________. ⏎ How does the Duchess's baby turn into a pig? ⏎ What is the "pig" doing when the Duchess is nursing it? ⏎ What is the "`
- **hp-dudley**
  - T=0.0: ` A pig's tail. ⏎  ⏎ Q: What is the name of the book that Harry finds in the library? ⏎ A: The Tales of Beedle the Bard. ⏎  ⏎ Q: What is the name of the book that Harry finds in the`
  - T=0.5: ` A pig's tail. ⏎  ⏎ Q: What is the name of the book that Harry buys at Flourish and Blotts? ⏎ A: Quidditch Through the Ages. ⏎  ⏎ Q: Who is the head of the Department of Mysteries `
  - T=0.5: ` A pig's tail. ⏎  ⏎ Q: What is the name of the character who was a ghost? ⏎ A: Nearly Headless Nick. ⏎  ⏎ Q: What is the name of the character who was a ghost? ⏎ A: Nearly Headless N`
- **sound-source:achoo**
  - T=0.0: ` sneeze ⏎ bang → gun ⏎ bark → dog ⏎ beep → car ⏎ boom → explosion ⏎ buzz → fly ⏎ clang → bell ⏎ cluck → chicken ⏎ crack → whip ⏎ crash → car ⏎ creep → spider ⏎ `
  - T=0.5: ` sneeze ⏎ pop → bubble ⏎ bang → gunshot ⏎ bloop → computer ⏎ beep → phone ⏎ bark → dog ⏎ moo → cow ⏎ tick-tock → clock ⏎ ding-dong → doorbell ⏎ vroom → car ⏎ achoo → s`
  - T=0.5: ` sneeze ⏎ pop → cork ⏎ bark → dog ⏎ yelp → cat ⏎ whoosh → wind ⏎ honk → horn ⏎ thump → door ⏎ tinkle → bell ⏎ hum → computer ⏎ buzz → alarm ⏎ flip → page ⏎ swish → fan`

## Top 5 for Llama-2-13B

1. **glorb-color** (goal 2): `glorb(apple) = red ... glorb(coal) =` → black. 56/56 at T=0.5 over 7 inputs. "glorb" is a made-up word, so the model has to infer the rule; ask the audience for objects.
2. **who-to-call** (goal 2): `toothache → dentist ... flat tire →` → tow truck/mechanic. 55/56. Everyday reasoning about a new situation; ask the audience for problems.
3. **triples** (goal 2): `apple:fruit:red ... broccoli:` → vegetable:green. 56/56. Invented format, two attributes at once.
4. **alice-infant** (goal 1): "What did the infant that Alice carried out of the noisy kitchen become?" → A pig. 7/8, T=0 right. The word "infant" never occurs in the book. (The plain cloze "the baby that the Duchess was nursing turned into a" is 8/8.)
5. **hp-whydoe** (goal 1): "Why does Snape's Patronus have the same shape as Lily's?" → he loved her. 8/8. A "why" question that no single sentence in the books answers.

Runners-up on Llama-2-13B, all 7/8 or better:
- goal 1: alice-mushroom (8/8; the matching line doesn't name the speaker), alice-grin, hp-firebolt, hp-goblet, hp-dudley (all 8/8)
- goal 2: sound-source (54/56), wear-where (52/56), compound (48/48)

## Not tested, or limits

- **Mac speed:** no model was run on the MacBook; speeds are from the RTX 3060 only.
- **Larger models:** Llama 3.1 70B (the model where Cooper et al. find the most Harry Potter memorization) and Llama-2-70B were not tried. A Q4 file is about 40 GB, which doesn't fit the 50 GB cache limit alongside the cached models.
- **Book texts:** The House at Pooh Corner and Through the Looking-Glass were not tested, and Harry Potter answers were not checked against the text.
- **Preset coverage:** the "French → English" preset was not run; only 3 samples were taken for each of the other current presets.
- **Model coverage:** Llama-2-7B was deleted before the later additions (verbatim openings, extra Alice/Harry Potter questions, 5 tasks, current presets).

## Disk cleanup

- **Deleted:** Llama-2-7B, Mistral-7B-v0.1 and Qwen3-30B-A3B-Base.
- **Qwen3-30B and `big`:** Qwen3-30B-A3B-Base was downloaded during this test. It is the `big` option in `serve-llm.sh`, which will download it again (18.6 GB) if you use it.
- **Kept:** Llama-2-13B (recommended) and the two models that were already cached.

## Addendum: math word problems with worked examples (bicycles)

Tested afterwards on Llama-2-13B (the same server settings as the page; temperature 0, then 8 samples at 0.5). The bare "bicycles" question fails (always "4"), and so does the same question after three examples that show only the answers. Showing **two worked examples** whose answers spell out the steps fixes it. This is few-shot "chain of thought" (Wei et al. 2022, arXiv:2201.11903): the model copies the form of the reasoning, not just the form of the answer.

```
Q: Tom has 4 cars and sells 1. How many wheels do his cars have now?
A: He has 4 - 1 = 3 cars. Each car has 4 wheels, so 3 cars have 3 × 4 = 12 wheels. The answer is 12.

Q: Ana has 2 tricycles and buys 2 more. How many wheels do her tricycles have?
A: She has 2 + 2 = 4 tricycles. Each tricycle has 3 wheels, so 4 tricycles have 4 × 3 = 12 wheels. The answer is 12.

Q: If Nebuchadnezzar has three bicycles and Qui-Gon Jinn gives him one more, how many wheels does Nebuchadnezzar have?
A:
```

| question (replaces the last Q) | expected | T=0 | k/8 at T=0.5 |
|---|---|---|---|
| Nebuchadnezzar, three bicycles, one more | 8 | `… 4 × 2 = 8 wheels. The answer is 8.` | 8 (7 in a second set of samples) |
| Hermione, five unicycles, gives two to Ron | 3 | `… 3 × 1 = 3 wheels. The answer is 3.` | 7 |
| a farmer, 3 cows, buys 2 more (legs) | 20 | `… 5 × 4 = 20 legs. The answer is 20.` | 8 |
| Gandalf, 6 spiders in a jar, 2 escape (legs left) | 32 | `… 4 × 8 = 32 legs. The answer is 32.` | 7 |

For comparison, with three answer-only examples ("A: 5", "A: 16", "A: 12") the bicycles question got 0/8 (always "4"). With three worked examples that included a trivial one first (apples, spiders, cars), it got 3/8, and its temperature-0 answer added the new bicycle to the wheel count ("6 + 1 = 7 wheels").

### Longer chains (2–4 steps)

Two worked examples with 2–3 steps each, then a new problem (numbers spelled out in the questions, as in the "chain of reasoning" preset):

```
Q: A baker makes three trays of muffins with twelve muffins on each tray. She sells twenty muffins and gives away four. How many muffins does she have left?
A: She makes 3 × 12 = 36 muffins. After selling 20, she has 36 - 20 = 16 muffins. After giving away 4, she has 16 - 4 = 12 muffins. The answer is 12.

Q: Leo buys four packs of pencils with six pencils in each pack. He shares them equally among himself and his two sisters. How many pencils does each of them get?
A: He has 4 × 6 = 24 pencils. There are 1 + 2 = 3 people, so each gets 24 ÷ 3 = 8 pencils. The answer is 8.

Q: Mia saves seven dollars a week for six weeks, then spends fifteen dollars on a book. How much money does she have left?
A:
```

| problem | steps | expected | Llama-2-13B T=0 | k/8 at T=0.5 |
|---|---|---|---|---|
| Mia saves $7/week for 6 weeks, spends $15 | 2 | 27 | right | 8 |
| 5 classes of 24, 18 absent, teams of 6 | 3 | 17 | right | 7 |
| 12 pages a day, 200-page book, after two weeks | 3 (two weeks = 14 days) | 32 | right | 6 |
| train: 8 cars × 40 seats, +150, then +37 and −12 | 4 | 145 | 133 (forgot the 12 who got off) | 3 |
| 3 fields × 9 rows × 8 trees × 5 baskets | 3 | 1080 | 1,920 (did the whole product in one step, wrongly) | 0 |
| 20 rows × 15 seats, $8 tickets, two shows | 3 | 4800 | 2,400 (forgot the second show) | 3 |

So on this model, 2–3 steps with small numbers work well, but 4 steps or a big multiplication don't. The failures are the classic ones: a step left out, and arithmetic done "in its head" instead of one operation at a time. The Llama 2 paper reports about 29% for Llama-2-13B on GSM8K grade-school word problems (8 worked examples). Qwen3-30B-A3B (`./serve-llm.sh big`) would very likely do better, but it was deleted after the model comparison, so it wasn't tested here.

# Snow White A-to-Z experiment

Prompt: Write the story of Snow White in 26 words, in which the initial letter of each word is in alphabetical order.

(Replaces the Cinderella version, whose example sentence is online; that record is in `cinderella-experiment.md`.)

## Slide 1: OpenAI gpt-5.4, no reasoning

Responses API, `reasoning.effort: "none"`, `temperature: 1`, no tools (no web search), 10 attempts. 2 of 10 correct.

| # | correct | words | initial letters | text |
|---|---|---|---|---|
| 1 | no | 23 | `abcdefghijklmnopqrstuvw` | A bashful child, deceived, eats fatal gift; hunters investigate, join kindly locals. Mysteriously, nobility overcomes poisoning; queen repents, serenity triumphs, until villains wane. |
| 2 | no | 23 | `abcdefghijklmnopqrstuvw` | A beauty chased, dwarfs entertained, fatefully given, hidden in jealousy, killed; later, magic nudged open poisoned queen's rage, sleeping transformed, undone, victoriously waking. |
| 3 | no | 25 | `abcdefghiklmnopqrstuvwxyz` | A beauty, cursed, dwells; envious foes give harmful injections. Kind love matures, nurturing one peaceful queen, resurrected, safe, thriving under vigilant woodland xenial youths' zeal. |
| 4 | yes | 26 | `abcdefghijklmnopqrstuvwxyz` | A bewitched child, deepens enchantment; fleeing, gains haven in jolly kingdom. Lurking malice nears, offering poisoned quince. Rescued, Snow triumphs; united victor weds xenial youth zealously. |
| 5 | no | 24 | `abcdefghijklmnqrstuvwxyz` | A beautiful captive dodges envy; forest gnomes house innocent jewelkeeper, kindling love. Meanwhile, nasty queen readies sleeping trick; until valiant woodsman x-rays youthful zest. |
| 6 | no | 23 | `abcdefghijklmnopqrstuvw` | A beauty, cursed, dwarfs encounter fairness; grim huntsman ignores jealousy, keeps living maiden nearby. One prince quietly revives sleeping treasure; united, villainess withers. |
| 7 | yes | 26 | `abcdefghijklmnopqrstuvwxyz` | A bashful child dwells, enchanted, fleeing grim huntsman; in jealous kingdom, lovely maiden nears ominous poisoned quietude, revived; seven tiny unicorns vanquish wicked xenial youth's zeal. |
| 8 | no | 22 | `abcdefghjklmpqrstuwxyz` | A beautiful child, doomed, escaped forests, gained haven; jealous kingdom lady made poisoned quince. Rescued, Snow triumphed; upon waking, xenial youths zigzagged. |
| 9 | no | 24 | `abcdefghijklmnopqrstuvwy` | Aged beauty, chased, deepens envy; fleeing, grieving, hidden in jungle, keeps low, meeting nurturing outcasts, poisoning quenched; revived, safe, triumphant, ultimately vindicating white youth. |
| 10 | no | 25 | `abcdefghijklmnopqrsuvwxyz` | A beautiful child, doomed, enchanted, fled; gentle huntsman intervened. Jealous kingdom lady mirrored, noting one peer: queenly refugee Snowed under, vexing wickedness. Xenial youths zealously. |

## Slide 2: gpt-oss-120b, with (raw) reasoning

OpenAI's open-weight reasoning model returns its whole chain of thought as text, unlike gpt-5.4 (encrypted, summary only) or Claude (summary only). It can't be run without reasoning ("Reasoning is mandatory for this endpoint"), which is why slide 1 stays on gpt-5.4.

Via OpenRouter (chat completions, `reasoning: {effort: "high"}`, `temperature: 1`). 19 attempts at high effort, 18 correct; at medium effort 1 of 9. Nearly all correct answers are strings of words rather than sentences; the slide uses the one that reads most like a story:

> Apple beguiles cursed, dwarfs enchant fair girl, huntsman intervenes; jealous king laments, mirror notes ominously, Prince quickly rescues Snowwhite through unbreakable victory, wicked xanthic yields zenith.

Its reasoning is 130,132 characters (22,044 words), saved in full in `snowwhite-gpt-oss-reasoning.txt`. The other correct answers, with the length of their reasoning:

- (high, 78,398 characters) Alabaster beauty cursed dwarfs evading forest guarded huntsman incites jealousy kiss love mirror nightly offering poisoned queen's rescuer slumber true union victory wedding xenial youthful zeal.
- (high, 110,448 characters) Apple becomes cursed dwarfs enchanted forest guard huntsman innocent jealous kind love mountain nurturing overcomes prince queen revives Snowwhite triumphs unites victorious wicked xenial yearns zeal.
- (high, 33,261 characters) Apple Beauty Cursed Dwarfs Evil Forest Glen Huntsman Innocent Jealous Kingdom Looming Mirror Noble Oblivious Poisoned Queen Rescues Snowwhite Tender Unending Victorious Widely Xenial Youthful Zeal.
- (high, 153,456 characters) Apple blighted cursed dwarfs enchanted forest greedy huntsman innocent jealous kiss love mirror noble old prince queen’s reversal Snowwhite toxic unites victorious weds xenial yearning zeal.
- (high, 47,768 characters) Altruistic beauty cunning dwarfs evil fruit grim huntsman innocent jeopardy kind love mirror noxious orchard prince queen ruthless snow triumph unending victory white xenial yearning zeal.
- (high, 130,132 characters) Apple beguiles cursed, dwarfs enchant fair girl, huntsman intervenes; jealous king laments, mirror notes ominously, Prince quickly rescues Snowwhite through unbreakable victory, wicked xanthic yields zenith.
- (high, 45,769 characters) Alabaster beauty cursed dwarfs escaped forest guarded hopeful innocent jealousy kisses love magical night offers poison queen revives Snow triumphs until valiant White xenial yearning zeal.
- (high, 78,091 characters) Alone beautiful cursed dwarves evil fruit gift hunter instructed jealous kingdom loving mirror noble old prince quietly rescues Snow tricks unfair victory wedded xenial yonder zenith.
- (medium, 9,503 characters) Apple Befriended Cunning Dwarfs, Enchanted Forest Guarding Hopeful Innocent Jealous King’s Lair, Malicious Noxious Oracle Plots Queen’s Revenge; Snow Triumphs Unscathed, Vowing Warm Xylophonic Yodels Zeal.
- (high, 49,556 characters) Apple bewitched cursed damsel escapes forest guardians harbor innocent jeopardy kiss lifts magic night overcome prince queen regrets Snowwhite triumphs unites vows wedding xenial yields zeal.
- (high, 109,210 characters) Apple bewitched cursed dwarfs enchanted forest guard huntsman in jealous kiss land mirror notes only princess queen ruthless Snow trance under venom White xanthic yields zenith.
- (high, 70,872 characters) Alabaster beauty charmed dwarfs envious fury grim huntsman ignoring journey kind lodge mirror noxious orchard poisoned queen rescuer Snowwhite triumphs unites victorious wedding xenial youthful zenith.
- (high, 45,345 characters) Adored beauty, cursed, dwarfs evading fleeing granted huntsman incites jealousy, kiss love, magical night, oblivious poisoned queen’s red SnowWhite trance unresponsive, victorious wake, Xanthic yearning zeal.
- (high, 92,347 characters) Alabaster beauty cottage dwarfs envy forest gloomy huntsman innocent jealous kiss love mirror now overcomes poisonedapple queen royal Snowwhite triumphs under victim wakes xanthic yearning zenith.
- (high, 72,067 characters) Alabaster beauty charms dwarves. Envious fury glares hears insult jeers. Kiss lifts mirror notes only poisoned-apple queen reigns SnowWhite trembles unconscious valiant wakes xenial youthful zeal.
- (high, 52,129 characters) Alas beauty crowned dwarves envious forest greedy huntsman instructed jealously killed love mirror noble old poisoned queen ruthless Snow trance under vile White xenial young zeal.
- (high, 60,106 characters) Alabaster beauty, crowned, dwarfs envious forest grants huntsman innocent joyous knight love mirror narrates orders poisoned queen revenge Snowwhite triumphs under victorious wedding, xenial youthful zenith.

## Also tried (for the question of visible reasoning)

- deepseek/deepseek-r1-0528: 0 of 2 correct (raw reasoning visible).
- qwen/qwen3-235b-a22b-thinking-2507: 2 of 2 correct (raw reasoning visible, 32,000-41,000 characters), but the stories were nonsense ("A beautiful child dies eating forbidden golden honey inside jars...").
- anthropic/claude-sonnet-5.5 at effort "low": it did no thinking at all (0 reasoning tokens) and floundered in its visible answer. Anthropic's API returns only a summary of Claude's thinking in any case.
- gpt-5.4 at reasoning effort "low": 3 of 3 correct (516-2,424 reasoning tokens, encrypted, summary only).

Cost: OpenRouter $0.22 for 35 calls; OpenAI 15 calls, 4,603 output tokens (a few cents).

Raw requests and responses: `snowwhite-openai.jsonl` (gpt-5.4) and `snowwhite-openrouter.jsonl` (everything else), in the order they were made.

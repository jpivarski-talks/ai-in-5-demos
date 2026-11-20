# Cinderella A-to-Z experiment (OpenAI gpt-5.4, Responses API)

Prompt: Write the story of Cinderella in 26 words, in which the initial letter of each word is in alphabetical order.

All calls: `gpt-5.4` (gpt-5.4-2026-03-05), `temperature: 1`, no tools (no web search), `store: false`. Checked by script: 26 words whose first letters are a, b, c, ... z in order (a word is anything between spaces that contains a letter; hyphenated words count as one).

## Slide 1: no reasoning (`reasoning.effort: "none"`), 10 attempts

| # | ok | words | initial letters | text |
|---|---|---|---|---|
| 1 | no | 44 | `abcdefghijklmнoacwvabcdefghijklmnpकrstuvwxyz` | Ashes became Cinderella; dawned enchantment, fairy godmother, hastening into jeweled kingdom. Lost midnight's нәzule?   ⏎ Oops—here’s a correct 26-word version: ⏎  ⏎ Ashes became Cinderella; dawn enchantment furnished glass heels. In jubilation, kind lady met noble prince; क्वickly romance sparked. Then united, victorious, wedded, xylophonic youth zested. |
| 2 | no | 24 | `abcdefghjklmnpकrstuvwxyz` | Ashen beauty charmed duke; enchanted footwear guided her. Jealous kin lost magic; noble prince क्वested, recognized silent, true, unmatched virtue; wedding, xenial youths zestfully. |
| 3 | no | 26 | `abcdefghjklmnopqrstouvwxyz` | Ashen beauty charmed duke; enchanted footwear granted happiness. Jealous kin lost magic; night obscured, prince quested, recognized slipper’s true owner, unveiling virtuous wife, xenial youth zestfully. |
| 4 | no | 25 | `abcdefghjklmnopकrstuvwxyz` | Abused, beleaguered Cinderella, dreaming endlessly, found godmother; hastily, jewels kindled. Later, midnight neared; one prince क्वietly rescued silent, timid urchin, vanquishing wicked xenophobic yahoos zealously. |
| 5 | yes | 26 | `abcdefghijklmnopqrstuvwxyz` | At ball, Cinderella danced elegantly; fairy godmother helped, inspiring joy. Kindly, love magically nurtured. One prince quietly recognized slipper; true union validated, wedding xenially yielded zest. |
| 6 | no | 22 | `acdefghijklmnopqrstuvw` | Ashes-bound Cinderella danced elegantly, fleeing grandly; hasty isolation justified kindness. Lovely magic nurtured opulence; prince questioned ragged stranger, then unveiled virtues. Wedding! |
| 7 | no | 25 | `abcdefghjklmnopqrstuvwxyz` | Ashes-bound beauty charmed dazzling earl, fleeing glass heel; jealous kin lost, magic night opened paths, queen recognized servant, transformed until vows wove xenial yesterdays, zealously. |
| 8 | no | 22 | `abcdefghijklmnpqrstuvw` | Ashen Belle, cursed drudge, enchanted fate; glass heels inspire joyous kingdom. Lost maiden nears prince; quest reveals slipper’s true union, validating wedding. |
| 9 | no | 26 | `abcdefghijklmnopकrstuvwxyz` | Ashes-bound beauty charms duke; evening flees, glass heel inspires joyful kingdom, love magically nurtures oppressed princess, क्वickly restored, slipper triumphs, union validates wonder, xenial youth zestfully. |
| 10 | no | 24 | `acdefghijklmnpकrstuvwxyz` | Ashes-born Cinderella danced, enchanting fate; glass heel inspired joy, kindled love, midnight neared. Prince क्वested, reunited, slipper tried; unveiled victory, wedding, xeric youth zest. |

## Slide 2: with reasoning (`reasoning.effort: "low"`, `summary: "detailed"`), one attempt

Answer (correct): As bullied Cinderella despaired, enchanting fairy godmother helped, introducing jeweled kindness. Later, midnight neared; one prince quietly retrieved slipper, then united vows, wedding xylophones yodeled zealously.

Usage: 564 output tokens, of which 516 reasoning tokens.

The reasoning itself is not available: the API returns it only as `encrypted_content` (7,544 characters, a Fernet token encrypted with OpenAI's key, meant only to be sent back to the API in a later request). What OpenAI does show is a summary, which is on the slide in full:

> **Creating a fairy tale**
>
> I’m brainstorming a whimsical story with a touch of humor. I want to use all 26 letters for a fun twist. 
>
> My initial thoughts include things like "A as," "B bullied," and "C Cinderella," building from there. The words seem to fit, but I’m stuck on "X." I think I'll use "xylophones," and for "Y," maybe "yodeled." 
>
> The overall sentence could end with a playful flourish like "Wedding xylophones yodeled zealously." It feels odd but fits the fairy tale vibe!

## Choosing the model and the reasoning effort (before the trials above)

These calls established that gpt-5.4 can solve the problem with reasoning, and how much reasoning is enough:

| effort | correct | reasoning tokens |
|---|---|---|
| low | yes | 492 |
| low | no | 656 |
| low | yes | 905 |
| low | yes | 505 |
| low | yes | 458 |
| low | yes | 800 |
| medium | yes | 2070 |
| medium | yes | 1236 |
| medium | yes | 3015 |

So effort "low" was enough (5 of 6 correct), and "medium" was 3 of 3. One more no-reasoning call was made first, to check the settings (it also failed, with a Devanagari "q" word).

Total for the whole experiment: 21 calls, 609 input tokens, 11,706 output tokens (well under $1).

The raw requests and responses are in `cinderella-experiment.jsonl`, one per line, in the order they were made.

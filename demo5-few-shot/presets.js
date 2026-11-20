// Prompts for Demo 5. A preset only fills in the text box: completing it behaves exactly as
// if it had been typed by hand (same temperature, same max tokens, no special stopping rules).
// The one exception is "verbatim", which also turns on a check of the completion against the
// book's own text (alice.js); typing in the box or choosing another preset turns it off.
// Chosen from prep/few-shot-candidates.md (tested on Llama-2-13B, the default in serve-llm.sh).
window.PRESETS = [
  {
    // the model contains the book, and can be asked about it in plain English
    // (alice-queen: "Off with her/his/their head(s)!"; 8/8 at temperature 0.5)
    label: "few-shot",
    prompt:
      "Questions and answers about Alice's Adventures in Wonderland by Lewis Carroll\n\n" +
      "Q: What was written on the little bottle that made Alice shrink?\nA: DRINK ME.\n\n" +
      "Q: What is the name of Alice's cat?\nA: Dinah.\n\n" +
      "Q: Why did Alice follow the White Rabbit down the hole?\n" +
      "A: She was curious, because she had never seen a rabbit with a waistcoat-pocket and a watch.\n\n" +
      "Q: What does the Queen of Hearts shout over and over?\nA:",
  },
  {
    // the same fact, as a sentence to finish, with no examples (8/8 at temperature 0.5)
    label: "cloze",
    prompt: "In Alice's Adventures in Wonderland, the Queen of Hearts often says,",
  },
  {
    // the first sentence of the book: the model continues it word for word, for pages
    label: "verbatim",
    prompt: "Alice was beginning to get very tired of sitting by her sister on the bank, and",
    verbatim: () => window.ALICE,
  },
  {
    // a task that doesn't exist as flashcards (46/48 at temperature 0.5 over 6 inputs);
    // other inputs: tortilla, beans, cheese · chicken, broth, noodles · milk, ice cream, chocolate syrup
    label: "ingredients",
    prompt:
      "flour, eggs, milk → pancakes\n" +
      "bread, cheese, butter → grilled cheese sandwich\n" +
      "dough, tomato sauce, cheese → pizza\n" +
      "lettuce, tomato, cucumber → salad\n" +
      "rice, seaweed, raw fish →",
  },
  {
    // 56/56 at temperature 0.5 over 7 inputs; other inputs: Mars, Venus · oak, maple · Monday, Friday
    label: "category",
    prompt:
      "apple, banana → fruit\n" +
      "hammer, saw → tools\n" +
      "red, blue → colors\n" +
      "dog, cat → animals\n" +
      "shirt, pants → clothes\n" +
      "trumpet, violin →",
  },
  {
    // 36/40 at temperature 0.5 over 5 inputs; other inputs: My best friend moved away. ·
    // Somebody cut in front of me in line.
    label: "emotion",
    prompt:
      "I won the lottery! → happy\n" +
      "My dog ran away. → sad\n" +
      "Someone stole my bike! → angry\n" +
      "There's a spider on my pillow! → scared\n" +
      "I got an A on my test! →",
  },
  {
    // few-shot "chain of thought" (Wei et al. 2022): the examples spell out the steps, and so does
    // the answer. The bare question always gets "4"; this way, 8/8 at temperature 0.5 (answer: 8)
    label: "chain of reasoning",
    prompt:
      "Q: Tom has four cars and sells one. How many wheels do his cars have now?\n" +
      "A: He has 4 - 1 = 3 cars. Each car has 4 wheels, so 3 cars have 3 × 4 = 12 wheels. The answer is 12.\n\n" +
      "Q: Ana has two tricycles and buys two more. How many wheels do her tricycles have?\n" +
      "A: She has 2 + 2 = 4 tricycles. Each tricycle has 3 wheels, so 4 tricycles have 4 × 3 = 12 wheels. The answer is 12.\n\n" +
      "Q: If Sam has three bicycles and Maria gives him one more, how many wheels does Sam have?\nA:",
  },
  {
    // an instructive failure: Llama-2 sees words as tokens, not letters (2/48; answer: 7)
    label: "letter count",
    prompt:
      "cat → 3\n" +
      "house → 5\n" +
      "elephant → 8\n" +
      "sun → 3\n" +
      "pencil → 6\n" +
      "giraffe →",
  },
];

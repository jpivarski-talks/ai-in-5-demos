// Few-shot prompts for Demo 5. Each completion stops at the end of the line
// (shift-click "complete" to let the model keep going).
window.PRESETS = [
  {
    label: "capitals",
    prompt: "France → Paris\nJapan → Tokyo\nKenya → Nairobi\nCanada → Ottawa\nArgentina → Buenos Aires\nPeru →",
  },
  {
    label: "English → French",
    prompt:
      "English: The cat is sleeping.\nFrench: Le chat dort.\n\n" +
      "English: Where is the train station?\nFrench: Où est la gare ?\n\n" +
      "English: We ate bread and cheese.\nFrench: Nous avons mangé du pain et du fromage.\n\n" +
      "English: My older sister bought a beautiful blue car yesterday.\nFrench:",
  },
  {
    label: "French → English",
    prompt:
      "French: Le chat dort.\nEnglish: The cat is sleeping.\n\n" +
      "French: Où est la gare ?\nEnglish: Where is the train station?\n\n" +
      "French: Nous avons mangé du pain et du fromage.\nEnglish: We ate bread and cheese.\n\n" +
      "French: La vieille femme a un petit chien blanc qui aboie toute la nuit.\nEnglish:",
  },
  {
    // a language that doesn't exist: vocabulary and word order come only from the examples
    // (adjective after the noun, as in French). Answer: Kina pim nam sula tal. Best at temperature 0.
    label: "made-up language",
    prompt:
      "English: The dog sleeps.\nZorbish: Kina dop.\n\n" +
      "English: The big dog sleeps.\nZorbish: Kina tal dop.\n\n" +
      "English: The dog sees the cat.\nZorbish: Kina vek moru.\n\n" +
      "English: The cat sees the big dog.\nZorbish: Moru vek kina tal.\n\n" +
      "English: The small cat eats the fish.\nZorbish: Moru pim nam sula.\n\n" +
      "English: The small dog eats the big fish.\nZorbish:",
  },
  {
    label: "verb at the end",
    prompt:
      "The cat sat on the mat. → The cat on the mat sat.\n" +
      "My brother plays the guitar every evening. → My brother the guitar every evening plays.\n" +
      "The students read three books last summer. → The students three books last summer read.\n" +
      "She opened the window. → She the window opened.\n" +
      "We painted the fence on Sunday. → We the fence on Sunday painted.\n" +
      "The old fisherman repaired his boat before the storm. →",
  },
  {
    label: "opposite day",
    prompt:
      "I love hot summer mornings. → I hate cold winter evenings.\n" +
      "The tall man walked slowly up the stairs. → The short woman ran quickly down the stairs.\n" +
      "Everybody laughed at my old joke. → Nobody cried at your new joke.\n" +
      "The little girl woke up early and felt happy. →",
  },
  {
    label: "syllogisms",
    prompt:
      "All blorks are frimmy. Zib is a blork. Therefore, Zib is frimmy.\n" +
      "All wugs can glorp. Tam is a wug. Therefore, Tam can glorp.\n" +
      "All quindles live under the sea. Mopsy is a quindle. Therefore, Mopsy lives under the sea.\n" +
      "All snerfs are made of plinth. This teapot is a snerf. Therefore,",
  },
  {
    // units that don't exist, so the answer can't be memorized: 3 × 17 × 13 = 663
    label: "made-up units",
    prompt:
      "Q: A zorp is worth 3 blinks, and a blink is worth 4 tams. How many tams is 2 zorps worth?\nA: The answer is 24.\n\n" +
      "Q: A flurb holds 5 snigs, and each snig holds 2 pebbles. How many pebbles are in 3 flurbs?\nA: The answer is 30.\n\n" +
      "Q: One quib costs 17 dollops, and one dollop costs 13 zents. How many zents do 3 quibs cost?\nA:",
  },
  {
    label: "what happens next",
    prompt:
      "I left a chocolate bar on the car dashboard in July. → It melted.\n" +
      "I forgot a banana in my backpack for two weeks. → It turned brown and mushy.\n" +
      "I dropped my phone into the bathtub. → It stopped working.\n" +
      "I put a full glass bottle of water in the freezer overnight. →",
  },
  {
    // the model has to track what Lena saw, not where the keys really are. Best at temperature 0.
    label: "what does she think?",
    prompt:
      "Priya hides her phone under the pillow and leaves for work. Her roommate moves it to the desk. " +
      "When Priya gets home, she looks for her phone under the pillow, because she didn't see it being moved.\n\n" +
      "Marco puts the milk in the fridge. While Marco watches, his son moves it to the counter. " +
      "When Marco wants the milk, he looks for it on the counter, because he saw it being moved.\n\n" +
      "Lena leaves her keys on the piano and goes to sleep. During the night, her cat knocks them into a flowerpot. " +
      "In the morning, Lena looks for her keys",
  },
  {
    // turning messy text into a table; the third example shows that it's about reading, not copying
    label: "text → data",
    prompt:
      "Sentence: Hi, I'm Maria, I'm 34 and I live in Lisbon.\nData: name=Maria; age=34; lives in=Lisbon\n\n" +
      "Sentence: Greetings from Osaka, where Kenji just celebrated his 50th birthday.\nData: name=Kenji; age=50; lives in=Osaka\n\n" +
      "Sentence: My grandmother Ingrid, who turns 80 next month, grew up in Bergen but has lived in Oslo since the war.\n" +
      "Data: name=Ingrid; age=79; lives in=Oslo\n\n" +
      "Sentence: Diego, twenty-seven, was born in Lima, but last spring he packed up and moved to Montreal.\nData:",
  },
];

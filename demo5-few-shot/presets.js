// Prompts for Demo 5. A preset only fills in the text box: completing it behaves exactly as
// if it had been typed by hand (same temperature, same max tokens, no special stopping rules).
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
    label: "syllogisms",
    prompt:
      "All blorks are frimmy. Zib is a blork. Therefore, Zib is frimmy.\n" +
      "All wugs can glorp. Tam is a wug. Therefore, Tam can glorp.\n" +
      "All quindles live under the sea. Mopsy is a quindle. Therefore, Mopsy lives under the sea.\n" +
      "All snerfs are made of plinth. This teapot is a snerf. Therefore,",
  },
  {
    // no examples at all (zero-shot), with names that make the question unlikely to have been seen.
    label: "bicycles",
    prompt:
      "Question: If Nebuchadnezzar has three bicycles and Qui-Gon Jinn gives him one more, how many wheels does Nebuchadnezzar have?\n" +
      "Answer:",
  },
];

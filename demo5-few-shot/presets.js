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
    label: "syllogisms",
    prompt:
      "All blorks are frimmy. Zib is a blork. Therefore, Zib is frimmy.\n" +
      "All wugs can glorp. Tam is a wug. Therefore, Tam can glorp.\n" +
      "All quindles live under the sea. Mopsy is a quindle. Therefore, Mopsy lives under the sea.\n" +
      "All snerfs are made of plinth. This teapot is a snerf. Therefore,",
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
];

// Few-shot prompts for Demo 5. Each completion stops at the end of the line
// (shift-click "complete" to let the model keep going).
window.PRESETS = [
  {
    label: "capitals",
    prompt: "France → Paris\nJapan → Tokyo\nKenya → Nairobi\nCanada → Ottawa\nArgentina → Buenos Aires\nPeru →",
  },
  {
    label: "elements",
    prompt: "hydrogen → H\ncarbon → C\nsodium → Na\nchlorine → Cl\niron → Fe\nsilver →",
  },
  {
    label: "antonyms",
    prompt: "hot → cold\ntall → short\nempty → full\nancient → modern\nquiet → loud\ngenerous →",
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
  {
    label: "postpositions",
    prompt:
      "The cat is on the mat. → The cat is the mat on.\n" +
      "We walked to the store after lunch. → We walked the store to lunch after.\n" +
      "She hid the key under a rock near the door. → She hid the key a rock under the door near.\n" +
      "The bird flew over the house. → The bird flew the house over.\n" +
      "He sat beside his friend during the movie. → He sat his friend beside the movie during.\n" +
      "They swam across the river with their dog. → They swam the river across their dog with.\n" +
      "The dog slept under the old wooden table. →",
  },
];

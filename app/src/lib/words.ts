export const WORDS: string[] = [
  "apple", "apricot", "avocado", "banana", "blackberry", "blueberry", "cantaloupe", "cherry",
  "coconut", "cranberry", "date", "fig", "grape", "grapefruit", "guava", "kiwi",
  "lemon", "lime", "lychee", "mango", "melon", "mulberry", "nectarine", "orange",
  "papaya", "peach", "pear", "pineapple", "plum", "pomegranate", "raspberry", "strawberry",
  "tangerine", "watermelon", "acorn", "almond", "chestnut", "hazelnut", "pecan", "walnut",
  "basil", "bay", "caraway", "cardamom", "cinnamon", "clove", "cumin", "dill",
  "fennel", "fenugreek", "ginger", "marioram", "mint", "nutmeg", "oregano", "paprika",
  "parsley", "pepper", "rosemary", "saffron", "sage", "salt", "tarragon", "thyme",
  "turmeric", "alligator", "antelope", "badger", "bear", "beaver", "bison", "buffalo",
  "butterfly", "camel", "cat", "cheetah", "chicken", "chimpanzee", "cobra", "coyote",
  "crab", "crane", "crocodile", "crow", "deer", "dog", "dolphin", "donkey",
  "dove", "dragonfly", "duck", "eagle", "eel", "elephant", "elk", "falcon",
  "ferret", "flamingo", "fox", "frog", "gazelle", "giraffe", "goat", "goose",
  "gorilla", "hamster", "hare", "hawk", "hedgehog", "heron", "hippo", "hornet",
  "horse", "hummingbird", "hyena", "jackal", "jaguar", "jellyfish", "kangaroo", "koala",
  "lemur", "leopard", "lion", "lizard", "llama", "lobster", "lynx", "macaw",
  "mole", "mongoose", "monkey", "moose", "mouse", "newt", "ocelot", "octopus",
  "opossum", "orangutan", "orca", "ostrich", "otter", "owl", "ox", "panda",
  "panther", "parrot", "peacock", "pelican", "penguin", "pig", "pigeon", "polar bear",
  "pony", "porcupine", "puma", "python", "rabbit", "raccoon", "ram", "rat",
  "raven", "rhino", "robin", "rooster", "salmon", "scorpion", "seagull", "seal",
  "shark", "sheep", "shrimp", "skunk", "sloth", "snail", "snake", "sparrow",
  "spider", "squid", "squirrel", "starfish", "stork", "swan", "tapir", "tiger",
  "toad", "tortoise", "trout", "turkey", "turtle", "vulture", "walrus", "wasp",
  "weasel", "whale", "wolf", "wombat", "wren", "yak", "zebra", "admiral",
  "ambassador", "architect", "artist", "astronaut", "athlete", "author", "baker", "barber",
  "butcher", "carpenter", "captain", "chemist", "chef", "cleric", "clown", "coach",
  "composer", "cook", "cowboy", "dancer", "dentist", "detective", "director", "doctor",
  "drummer", "economist", "editor", "engineer", "engraver", "explorer", "farmer", "firefighter",
  "fisherman", "gardener", "geologist", "guide", "hunter", "inventor", "journalist", "judge",
  "lawyer", "librarian", "magician", "mason", "mathematician", "mechanic", "merchant", "miner",
  "minister", "musician", "navigator", "nurse", "painter", "philosopher", "photographer", "physicist",
  "physician", "pilot", "plumber", "poet", "police", "priest", "printer", "professor",
  "rancher", "ranger", "sailor", "scholar", "scientist", "sculptor", "singer", "soldier",
  "spy", "student", "surgeon", "tailor", "teacher", "tinkerer", "translator", "traveler",
  "verminer", "veterinarian", "weaver", "writer", "academy", "avenue", "beach", "bridge",
  "brook", "canyon", "castle", "cave", "cliff", "country", "desert", "dungeon",
  "farm", "field", "forest", "fort", "garden", "grove", "harbor", "hill",
  "island", "jungle", "kingdom", "lake", "land", "market", "meadow", "mountain",
  "museum", "ocean", "palace", "park", "path", "peak", "plantation", "plain",
  "plateau", "pond", "prairie", "pumpkin", "railway", "reef", "river", "road",
  "rocket", "sanctuary", "savanna", "school", "sea", "shrine", "sky", "spire",
  "spring", "station", "stone", "stream", "summit", "swamp", "temple", "trail",
  "treasure", "tundra", "tunnel", "village", "vineyard", "volcano", "waterfall", "wilderness"
];

export function randomWord(): string {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

export function generateUsername(): string {
  return [randomWord(), randomWord(), randomWord()].join("-");
}
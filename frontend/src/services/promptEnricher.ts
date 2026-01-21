/**
 * Enriches child's simple prompt with 3D printing-safe modifiers
 * Includes EXTENSIVE Russian-to-English translations (~2000+ words coverage via stems)
 */

const SAFETY_MODIFIERS = [
    'solid thick walls',
    'flat bottom for 3D printing',
    'minimal overhangs',
    'simple smooth geometry', // Removed "low-poly" to allow better textures
    'chunky proportions',
    'no thin fragile parts',
    'toy style',
    'cute cartoon aesthetic'
];

const STYLE_MODIFIERS = [
    'colorful', // Added to force color
    'vibrant colors', // Added to force color
    'high quality texture', // Added to force color
    '3D printable model',
    'single piece design',
    'smooth surfaces'
];

// Command words to remove
const SKIP_WORDS = new Set([
    'нарисуй', 'сделай', 'хочу', 'создай', 'покажи',
    'напечатай', 'пожалуйста', 'мне', 'можешь', 'давай',
    'пусть', 'будет', 'теперь', 'ещё', 'еще', 'просто',
    'draw', 'make', 'want', 'create', 'show',
    'print', 'please', 'me', 'can', 'you', 'a', 'an', 'the'
]);

// Large dictionary mapping Russian stems to English
// Using stems allows coverage of cases (кошка, кошку, кошке -> кош)
const RU_TO_EN: Record<string, string> = {
    // --- ACTIONS/MODIFIERS (ДЕЙСТВИЯ) ---
    'дорисуй': 'add', 'добав': 'add', 'приделай': 'add',
    'нарису': 'add', 'прирису': 'add', 'трас': 'add', // "трасу" -> "add"
    'тряс': 'add', 'трис': 'add', 'трес': 'add', // Phonetic fixes for STT errors ("трясу" -> "add")
    'с': 'with', 'со': 'with', 'без': 'without',
    'ему': '', 'ей': '', 'им': '', // pronouns -> skip to avoid "add with wings" grammar issues

    // --- ANIMALS (ЖИВОТНЫЕ) ---
    'кош': 'cat', 'кот': 'cat', 'кис': 'cat',
    'собак': 'dog', 'пес': 'dog', 'пёс': 'dog', 'щен': 'puppy',
    'лев': 'lion', 'льв': 'lion',
    'тигр': 'tiger',
    'медвед': 'bear', 'миш': 'bear',
    'волк': 'wolf', 'волч': 'wolf',
    'лис': 'fox',
    'зай': 'rabbit', 'кроли': 'rabbit',
    'слон': 'elephant',
    'жираф': 'giraffe',
    'бегемот': 'hippo',
    'носорог': 'rhino',
    'зебр': 'zebra',
    'обезьян': 'monkey', 'мартыш': 'monkey',
    'панд': 'panda',
    'коал': 'koala',
    'кенгуру': 'kangaroo',
    'ёж': 'hedgehog', 'еж': 'hedgehog',
    'белк': 'squirrel',
    'бобр': 'beaver',
    'енот': 'raccoon',
    'мыш': 'mouse', 'мышь': 'mouse',
    'крыс': 'rat',
    'хомя': 'hamster',
    'свин': 'pig', 'поросе': 'piglet', 'хрю': 'pig',
    'коров': 'cow', 'бык': 'bull', 'телен': 'calf',
    'лошад': 'horse', 'конь': 'horse', 'жереб': 'horse',
    'пони': 'pony',
    'овец': 'sheep', 'овц': 'sheep', 'баран': 'sheep',
    'коз': 'goat',
    'олен': 'deer',
    'лос': 'moose',
    'верблюд': 'camel',
    'ламу': 'llama', 'лам': 'llama',
    'леопард': 'leopard',
    'гепард': 'cheetah',
    'пантер': 'panther',
    'рысь': 'lynx',
    'крокодил': 'crocodile',
    'аллигатор': 'alligator',
    'черепах': 'turtle',
    'зме': 'snake', 'удав': 'snake', 'кобр': 'cobra',
    'ящериц': 'lizard',
    'игуан': 'iguana',
    'хамелеон': 'chameleon',
    'лягуш': 'frog', 'жаб': 'toad',
    'динозавр': 'dinosaur', 'тирекс': 't-rex', 'раптор': 'raptor',
    'дракон': 'dragon',
    'единорог': 'unicorn',
    'пегас': 'pegasus',
    'грифон': 'griffin',
    'феникс': 'phoenix',
    'монстр': 'monster', 'чудовищ': 'monster',
    'чудищ': 'monster',

    // --- BIRDS (ПТИЦЫ) ---
    'птиц': 'bird', 'птич': 'bird',
    'попуга': 'parrot',
    'орел': 'eagle', 'орл': 'eagle',
    'сов': 'owl', 'филин': 'owl',
    'пингвин': 'penguin',
    'утк': 'duck', 'уточе': 'duck',
    'гус': 'goose',
    'крыл': 'wings', 'крыль': 'wings', 'пер': 'feathers',
    'клюв': 'beak',
    'хвост': 'tail', 'лап': 'paws',
    'рог': 'horns', 'рожк': 'horns',
    'лебед': 'swan',
    'фламинго': 'flamingo',
    'павлин': 'peacock',
    'петух': 'rooster',
    'куриц': 'hen', 'кур': 'chicken', 'цыпл': 'chick',
    'голуб': 'pigeon',
    'ворон': 'crow',
    'сорок': 'magpie',
    'синич': 'titmouse',
    'снегир': 'bullfinch',
    'дят': 'woodpecker',
    'страус': 'ostrich',
    'индек': 'turkey',

    // --- SEA LIFE (МОРСКИЕ) ---
    'рыб': 'fish',
    'акул': 'shark',
    'кит': 'whale',
    'дельфин': 'dolphin',
    'осьминог': 'octopus',
    'кальмар': 'squid',
    'краб': 'crab',
    'омар': 'lobster', 'рак': 'crayfish',
    'креветк': 'shrimp',
    'медуз': 'jellyfish',
    'скат': 'stingray',
    'морск': 'sea', // морской конек catches here
    'тюлен': 'seal',
    'морж': 'walrus',
    'выдр': 'otter',
    'косатк': 'orca',
    'улитк': 'snail',

    // --- INSECTS (НАСЕКОМЫЕ) ---
    'жук': 'beetle',
    'бабочк': 'butterfly',
    'паук': 'spider',
    'мурав': 'ant',
    'пчел': 'bee',
    'ос': 'wasp', 'оса': 'wasp',
    'шмел': 'bumblebee',
    'стрекоз': 'dragonfly',
    'бож': 'ladybug', // божья коровка
    'скорпион': 'scorpion',
    'гусениц': 'caterpillar',
    'черв': 'worm',

    // --- TOYS & CHARACTERS (ИГРУШКИ) ---
    'кукл': 'doll',
    'барби': 'Barbie doll',
    'кен': 'Ken doll',
    'робот': 'robot',
    'трансформер': 'transformer',
    'лего': 'lego',
    'конструктор': 'construction set',
    'мяч': 'ball',
    'кубик': 'cube block',
    'юл': 'spinning top',
    'неваляшк': 'tumbler toy',
    'матрешк': 'matryoshka',
    'чебурашк': 'Cheburashka',
    'миньон': 'minion',
    'покемон': 'pokemon', 'пикачу': 'Pikachu',
    'супергеро': 'superhero',
    'бэтмен': 'Batman',
    'спайдер': 'Spider-Man', // человек-паук (removed duplicate 'паук')
    'супермен': 'Superman',
    'халк': 'Hulk',
    'железн': 'Iron Man', // железный человек
    'принцесс': 'princess',
    'принц': 'prince',
    'корол': 'king', 'королев': 'queen',
    'рыцар': 'knight',
    'пират': 'pirate',
    'ниндзя': 'ninja',
    'самурай': 'samurai',
    'викинг': 'viking',
    'ковбой': 'cowboy',
    'индеец': 'indian chief',
    'солдат': 'soldier',
    'космонавт': 'astronaut', 'астронавт': 'astronaut',
    'инопланет': 'alien', 'пришелец': 'alien',
    'фе': 'fairy', // фея
    'эльф': 'elf',
    'гном': 'gnome dwarf',
    'тролл': 'troll',
    'орк': 'orc',
    'гоблин': 'goblin',
    'вампир': 'vampire',
    'зомби': 'zombie',
    'скелет': 'skeleton',
    'призрак': 'ghost', 'привидени': 'ghost',
    'ведьм': 'witch',
    'колдун': 'wizard', 'волшебни': 'wizard', 'маг': 'mage',
    'русалк': 'mermaid',
    'ангел': 'angel',
    'демон': 'demon', 'черт': 'imp',


    // --- VEHICLES (ТРАНСПОРТ) ---
    'машин': 'car', 'авто': 'car', 'тачк': 'car',
    'грузовик': 'truck', 'фур': 'truck', 'камаз': 'truck',
    'автобус': 'bus',
    'троллейбус': 'trolleybus',
    'трамвай': 'tram',
    'поезд': 'train', 'паровоз': 'steam train', 'локомотив': 'locomotive',
    'вагон': 'wagon',
    'метро': 'subway train',
    'самолет': 'airplane', 'самолёт': 'airplane', 'лайнер': 'airliner',
    'вертолет': 'helicopter', 'вертолёт': 'helicopter',
    'дрон': 'drone', 'квадрокоптер': 'quadcopter',
    'ракет': 'rocket', 'шаттл': 'space shuttle', 'кораб': 'ship',
    'спутник': 'satellite',
    'лодк': 'boat', 'катер': 'speedboat', 'яхт': 'yacht',
    'пароход': 'steamboat',
    'подводн': 'submarine', // подводная лодка
    'субмарин': 'submarine',
    'танк': 'tank',
    'бтр': 'armored vehicle',
    'джип': 'jeep',
    'гоночн': 'race car', 'болид': 'race car',
    'полиц': 'police car',
    'пожарн': 'firetruck',
    'скор': 'ambulance',
    'трактор': 'tractor',
    'экскаватор': 'excavator',
    'бульдозер': 'bulldozer',
    'кран': 'crane',
    'мотоцикл': 'motorcycle', 'байк': 'motorbike',
    'велосипед': 'bicycle',
    'самокат': 'scooter',
    'скейт': 'skateboard',

    // --- BUILDINGS (СТРОЕНИЯ) ---
    'дом': 'house', 'домик': 'cottage',
    'избушк': 'hut',
    'дворец': 'palace',
    'зам': 'castle', // замок
    'крепост': 'fortress',
    'башн': 'tower',
    'небоскреб': 'skyscraper',
    'здани': 'building',
    'школ': 'school',
    'магазин': 'shop',
    'больниц': 'hospital',
    'церк': 'church', 'храм': 'temple', 'мечет': 'mosque',

    'мост': 'bridge',
    'маяк': 'lighthouse',
    'мельниц': 'windmill',
    'забор': 'fence',
    'стен': 'wall',
    'ворот': 'gate',
    'фонтан': 'fountain',
    'стату': 'statue', 'памятник': 'monument',

    // --- FOOD (ЕДА) ---
    'яблок': 'apple',
    'груш': 'pear',
    'банан': 'banana',
    'апельсин': 'orange',
    'мандарин': 'tangerine',
    'лимон': 'lemon',
    'арбуз': 'watermelon',
    'дын': 'melon',
    'клубник': 'strawberry',
    'малин': 'raspberry',
    'вишн': 'cherry',
    'виноград': 'grape',
    'ананас': 'pineapple',
    'кокос': 'coconut',
    'овощ': 'vegetable',
    'огур': 'cucumber',
    'помидор': 'tomato', 'томат': 'tomato',
    'картош': 'potato',
    'морков': 'carrot',
    'гриб': 'mushroom',
    'хлеб': 'bread', 'бул': 'bun',
    'пирог': 'pie',
    'торт': 'cake', 'пирожн': 'cake',
    'кекс': 'cupcake',
    'пончик': 'donut',
    'печень': 'cookie',
    'конфет': 'candy', 'шоколад': 'chocolate',
    'морожен': 'ice cream',
    'пицц': 'pizza',
    'бургер': 'burger', 'гамбургер': 'hamburger',
    'хот-дог': 'hot dog',
    'бутерброд': 'sandwich', 'сэндвич': 'sandwich',
    'сыр': 'cheese',
    'колбас': 'sausage', 'сосис': 'sausage',
    'яйц': 'egg',
    // 'рыб': 'fish', removed duplicate (defined in ANIMALS section usually)
    'суш': 'sushi', 'ролл': 'sushi roll',
    'кофе': 'coffee cup',
    'чай': 'tea cup',
    'бутылк': 'bottle',
    'бан': 'jar can',

    // --- GEOMETRIC SHAPES (ГЕОМЕТРИЧЕСКИЕ ФИГУРЫ) ---
    'шар': 'sphere', 'сфер': 'sphere',
    'куб': 'cube', // 'кубик' is in toys
    'пирамид': 'pyramid',
    'конус': 'cone',
    'цилиндр': 'cylinder',
    'призм': 'prism',
    'тор': 'torus', 'бублик': 'torus donut',
    'овал': 'oval',
    'круг': 'circle',
    'квадрат': 'square',
    'треугольник': 'triangle',
    'звезд': 'star',
    'ромб': 'rhombus',
    'шестиугольник': 'hexagon',
    'многоугольник': 'polygon',
    'спирал': 'spiral',
    'сердц': 'heart shape',


    // --- PLANTS (РАСТЕНИЯ) ---
    'дерев': 'tree',
    'елк': 'christmas tree', 'ёлк': 'christmas tree', 'ель': 'spruce tree',
    'сосн': 'pine tree',
    'дуб': 'oak tree',
    'берез': 'birch tree',
    'пальм': 'palm tree',
    'куст': 'bush',
    'цвет': 'flower',
    'роз': 'rose',
    'тюльпан': 'tulip',
    'ромашк': 'daisy',
    'подсолнух': 'sunflower',
    'кактус': 'cactus',
    'лист': 'leaf',
    'трав': 'grass',

    // --- OBJECTS (ПРЕДМЕТЫ) ---
    'стол': 'table',
    'стул': 'chair',
    'кресл': 'armchair',
    'диван': 'sofa',
    'кроват': 'bed',
    'шкаф': 'cabinet wardrobe',
    'полк': 'shelf',
    'сундук': 'chest',
    'коробк': 'box', 'ящик': 'crate',
    'ламп': 'lamp', 'люстр': 'chandelier', 'светильник': 'light',
    'телевизор': 'tv set',
    'комп': 'computer', 'ноутбук': 'laptop',
    'телефон': 'phone', 'смартфон': 'smartphone',
    'планшет': 'tablet',
    'часы': 'clock watch',
    'книг': 'book',
    'ручк': 'pen', 'карандаш': 'pencil',
    'ножниц': 'scissors',
    'рюкзак': 'backpack',
    'сумк': 'bag',
    'зон': 'umbrella', // зонт
    'очк': 'glasses',
    'шапк': 'hat', 'шляп': 'hat', 'кепк': 'cap', 'шлем': 'helmet',
    'ботинк': 'boot', 'кроссов': 'sneaker', 'туфл': 'shoe',
    'перчатк': 'glove',
    'футболк': 't-shirt',
    'плать': 'dress',
    'куртк': 'jacket',
    'меч': 'sword',
    'щит': 'shield',
    'лук': 'bow weapon', // watch out for onion
    'топор': 'axe',
    'молот': 'hammer',
    'пистолет': 'pistol gun', 'ружь': 'rifle', 'автомат': 'machine gun',
    'пушк': 'cannon',
    'корон': 'crown',

    'гитар': 'guitar',
    'скрипк': 'violin',
    'барабан': 'drum',
    'пианино': 'piano', 'рояль': 'piano',
    'микрофон': 'microphone',
    'наушник': 'headphones',
    'камер': 'camera', 'фотоаппарат': 'camera',

    // --- MISC (РАЗНОЕ) ---


    'лун': 'moon', 'месяц': 'crescent moon',
    'солнц': 'sun',
    'облак': 'cloud',
    'молни': 'lightning',
    'огон': 'fire', 'плам': 'flame',
    'вод': 'water', 'капл': 'drop',
    'снежин': 'snowflake',
    'снеговик': 'snowman',
    'подар': 'gift box',
    'череп': 'skull',
    'кост': 'bone',
    'приз': 'prize',
    'маск': 'mask',
};

// Helper to check startsWith for stemming
function findTranslation(word: string): string | null {
    // 1. Direct match
    if (RU_TO_EN[word]) return RU_TO_EN[word];

    // 2. Stem matching (iterate stems)
    // This is O(N) but N is finite (dictionary size). 
    // Optimized: check only if word usually longer than stem
    for (const stem in RU_TO_EN) {
        if (word.startsWith(stem)) {
            return RU_TO_EN[stem];
        }
    }
    return null;
}

export function enrichPrompt(rawInput: string): string {
    // Normalize
    const input = rawInput.toLowerCase().trim();

    // Split into words
    const words = input.split(/\s+/);

    // Process words
    const translatedWords = words.map(word => {
        // Remove non-letters/digits for matching
        const cleanWord = word.replace(/[^а-я0-9a-z]/gi, '');

        if (SKIP_WORDS.has(cleanWord)) return '';

        // Try to translate
        const translated = findTranslation(cleanWord);
        if (translated) return translated;

        // Keep original if no translation found (names etc)
        // Keep original if no translation found (names etc)
        // Check if it looks like Russian (cyrillic)
        if (/[а-я]/.test(cleanWord)) {
            // STRIP unknown Russian words to avoid confusing the AI
            // "Mutilated face" fix: leftover cyrillic noise = glitches
            return '';
        }

        return word; // Keep English/numbers as is
    }).filter(w => w.length > 0);

    // Join
    let prompt = translatedWords.join(' ').trim();

    // Default
    if (!prompt) prompt = 'cute toy';

    // Add Modifiers
    const safetyMods = SAFETY_MODIFIERS.join(', ');
    const styleMods = STYLE_MODIFIERS.join(', ');

    const enrichedPrompt = `A cute ${prompt}, ${safetyMods}, ${styleMods}`;

    console.log('📝 Prompt enrichment:', {
        original: rawInput,
        translated: prompt,
        enriched: enrichedPrompt
    });

    return enrichedPrompt;
}

export function detectLanguage(text: string): 'ru' | 'en' {
    const cyrillicPattern = /[\u0400-\u04FF]/;
    return cyrillicPattern.test(text) ? 'ru' : 'en';
}

/**
 * Enriches child's simple prompt with 3D printing-safe modifiers
 * Transforms: "машинка" → "A cute toy car, chunky design..."
 */

const SAFETY_MODIFIERS = [
    'solid thick walls',
    'flat bottom for 3D printing',
    'minimal overhangs',
    'simple low-poly geometry',
    'chunky proportions',
    'no thin fragile parts',
    'toy style',
    'cute cartoon aesthetic'
];

const STYLE_MODIFIERS = [
    '3D printable model',
    'single piece design',
    'smooth surfaces'
];

// Common Russian words/roots to English translations
// Using word roots to catch variations like кот, кота, котик, котика
const RU_TO_EN: [RegExp, string][] = [
    // Animals
    [/кош[каеу]*/gi, 'cat'],
    [/кот[аиуо]*/gi, 'cat'],
    [/котик[аиуо]*/gi, 'cute cat'],
    [/соба[каеуой]*/gi, 'dog'],
    [/драко[нва]*/gi, 'dragon'],
    [/динозавра?/gi, 'dinosaur'],
    [/медвед[ья]*/gi, 'bear'],
    [/зай[ацчкяи]*/gi, 'rabbit'],
    [/слон[аеуо]*/gi, 'elephant'],
    [/лошад[ьиейку]*/gi, 'horse'],
    [/единорог[аеуо]*/gi, 'unicorn'],
    [/рыб[аукеой]*/gi, 'fish'],
    [/птиц[аеуой]*/gi, 'bird'],
    [/бабочк[аеуой]*/gi, 'butterfly'],
    [/черепах[аеуой]*/gi, 'turtle'],

    // Vehicles
    [/машин[аку]*/gi, 'toy car'],
    [/самол[её]т[аеу]*/gi, 'airplane'],
    [/ракет[аеуой]*/gi, 'rocket'],
    [/кораб[ле]*/gi, 'ship'],
    [/танк[аеуо]*/gi, 'tank'],
    [/поезд[аеу]*/gi, 'train'],
    [/вертол[её]т[аеу]*/gi, 'helicopter'],

    // Objects
    [/цепоч[каеуой]*/gi, 'chain necklace'],
    [/цеп[ьию]*/gi, 'chain'],
    [/кольц[оаеу]*/gi, 'ring'],
    [/ключ[аеиуо]*/gi, 'key'],
    [/мяч[аиуо]*/gi, 'ball'],
    [/шар[аеу]*/gi, 'sphere ball'],
    [/куб[аеиу]*/gi, 'cube'],
    [/звезд[аеуой]*/gi, 'star'],
    [/сердц[аеуо]*/gi, 'heart'],
    [/цвето?к?[аеуо]*/gi, 'flower'],
    [/дерев[оаеу]*/gi, 'tree'],
    [/гриб[аеуо]*/gi, 'mushroom'],

    // Buildings
    [/дом[аеуо]*/gi, 'house'],
    [/замо?к?[аеуо]*/gi, 'castle'],
    [/башн[яюией]*/gi, 'tower'],

    // Characters
    [/робот[аеуо]*/gi, 'robot'],
    [/принцес[саеуой]*/gi, 'princess'],
    [/рыцар[ья]*/gi, 'knight'],
    [/пират[аеуо]*/gi, 'pirate'],
    [/инопланетян[аеуиом]*/gi, 'alien'],

    // Weapons/Items
    [/меч[аеуо]*/gi, 'sword'],
    [/щит[аеуо]*/gi, 'shield'],
    [/корон[аеуой]*/gi, 'crown'],
    [/чаш[аеукой]*/gi, 'cup'],

    // Skip common non-object words
    [/нарисуй/gi, ''],
    [/сделай/gi, ''],
    [/хочу/gi, ''],
    [/создай/gi, ''],
    [/покажи/gi, ''],
    [/напечатай/gi, ''],
];

export function enrichPrompt(rawInput: string): string {
    // Normalize input
    let prompt = rawInput.toLowerCase().trim();

    // Translate Russian to English using regex patterns
    for (const [pattern, replacement] of RU_TO_EN) {
        prompt = prompt.replace(pattern, replacement);
    }

    // Clean up extra spaces
    prompt = prompt.replace(/\s+/g, ' ').trim();

    // If prompt is empty after cleanup, use default
    if (!prompt) {
        prompt = 'cute toy';
    }

    // Build enhanced prompt
    const safetyMods = SAFETY_MODIFIERS.join(', ');
    const styleMods = STYLE_MODIFIERS.join(', ');

    const enrichedPrompt = `A cute ${prompt}, ${safetyMods}, ${styleMods}`;

    console.log('📝 Prompt enrichment:', { original: rawInput, enriched: enrichedPrompt });

    return enrichedPrompt;
}

export function detectLanguage(text: string): 'ru' | 'en' {
    // Simple Cyrillic detection
    const cyrillicPattern = /[\u0400-\u04FF]/;
    return cyrillicPattern.test(text) ? 'ru' : 'en';
}

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

// Common Russian words to English translations for better AI understanding
const RU_TO_EN: Record<string, string> = {
    'машинка': 'toy car',
    'машина': 'car',
    'дракон': 'dragon',
    'кошка': 'cat',
    'кот': 'cat',
    'собака': 'dog',
    'робот': 'robot',
    'динозавр': 'dinosaur',
    'самолёт': 'airplane',
    'самолет': 'airplane',
    'ракета': 'rocket',
    'звезда': 'star',
    'сердце': 'heart',
    'цветок': 'flower',
    'дом': 'house',
    'замок': 'castle',
    'корабль': 'ship',
    'танк': 'tank',
    'медведь': 'bear',
    'заяц': 'rabbit',
    'слон': 'elephant',
    'лошадь': 'horse',
    'единорог': 'unicorn',
    'принцесса': 'princess',
    'рыцарь': 'knight',
    'меч': 'sword',
    'щит': 'shield'
};

export function enrichPrompt(rawInput: string): string {
    // Normalize input
    let prompt = rawInput.toLowerCase().trim();

    // Translate common Russian words
    for (const [ru, en] of Object.entries(RU_TO_EN)) {
        if (prompt.includes(ru)) {
            prompt = prompt.replace(ru, en);
        }
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

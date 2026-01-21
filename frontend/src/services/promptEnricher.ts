/**
 * Enriches child's simple prompt with 3D printing-safe modifiers
 * Passes Russian text directly to Tripo AI (it understands Russian!)
 * Only removes command words like "нарисуй", "сделай"
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

// Command words to remove (not objects) - these are just prefixes
const SKIP_WORDS = new Set([
    // Russian
    'нарисуй', 'сделай', 'хочу', 'создай', 'покажи',
    'напечатай', 'пожалуйста', 'мне', 'можешь', 'давай',
    'пусть', 'будет', 'теперь', 'ещё', 'еще',
    // English
    'draw', 'make', 'want', 'create', 'show',
    'print', 'please', 'me', 'can', 'you', 'a', 'an', 'the'
]);

export function enrichPrompt(rawInput: string): string {
    // Step 1: Normalize
    const input = rawInput.toLowerCase().trim();

    // Step 2: Split by whitespace and filter out command words
    const words = input.split(/\s+/).filter(word => {
        // Keep word if it's NOT in skip list
        return !SKIP_WORDS.has(word);
    });

    // Step 3: Join back
    let prompt = words.join(' ').trim();

    // If nothing left, use default
    if (!prompt) {
        prompt = 'cute toy';
    }

    // Step 4: Build enhanced prompt with 3D printing modifiers
    const safetyMods = SAFETY_MODIFIERS.join(', ');
    const styleMods = STYLE_MODIFIERS.join(', ');

    const enrichedPrompt = `A cute ${prompt}, ${safetyMods}, ${styleMods}`;

    console.log('📝 Prompt enrichment:', { original: rawInput, cleaned: prompt, enriched: enrichedPrompt });

    return enrichedPrompt;
}

export function detectLanguage(text: string): 'ru' | 'en' {
    const cyrillicPattern = /[\u0400-\u04FF]/;
    return cyrillicPattern.test(text) ? 'ru' : 'en';
}

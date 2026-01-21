/**
 * Enriches child's simple prompt with 3D printing-safe modifiers
 * Now works with ANY language - Tripo AI understands Russian, English, and more!
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

// Words to remove (command words that aren't objects)
const SKIP_WORDS = [
    /\b(нарисуй|сделай|хочу|создай|покажи|напечатай|пожалуйста|мне|а)\b/gi,
    /\b(draw|make|want|create|show|print|please|me|a|an|the)\b/gi,
];

export function enrichPrompt(rawInput: string): string {
    // Normalize input
    let prompt = rawInput.toLowerCase().trim();

    // Remove command words
    for (const pattern of SKIP_WORDS) {
        prompt = prompt.replace(pattern, '');
    }

    // Clean up extra spaces
    prompt = prompt.replace(/\s+/g, ' ').trim();

    // If prompt is empty after cleanup, use default
    if (!prompt) {
        prompt = 'cute toy';
    }

    // Build enhanced prompt - keep original language, AI understands it!
    const safetyMods = SAFETY_MODIFIERS.join(', ');
    const styleMods = STYLE_MODIFIERS.join(', ');

    // Add "cute" prefix + original text + 3D printing modifiers
    const enrichedPrompt = `A cute ${prompt}, ${safetyMods}, ${styleMods}`;

    console.log('📝 Prompt enrichment:', { original: rawInput, enriched: enrichedPrompt });

    return enrichedPrompt;
}

export function detectLanguage(text: string): 'ru' | 'en' {
    // Simple Cyrillic detection
    const cyrillicPattern = /[\u0400-\u04FF]/;
    return cyrillicPattern.test(text) ? 'ru' : 'en';
}

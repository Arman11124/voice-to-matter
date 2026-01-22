/**
 * Prompt Enricher - Simple version
 * Adds 3D printing modifiers to user's prompt WITHOUT translation
 * Tripo AI supports Russian natively
 */

// 3D safety modifiers for printability
const SAFETY_MODIFIERS = [
    'solid thick walls',
    'minimal overhangs',
    'organic sculpted forms',
    'no thin fragile parts'
];

// Style modifiers for better results
const STYLE_MODIFIERS = [
    'figurine style',
    'character design aesthetic',
    'colorful',
    'vibrant colors',
    'high quality texture',
    '3D printable model',
    'single piece design',
    'smooth surfaces',
    'high fidelity',
    'detailed'
];

/**
 * Enrich prompt with 3D printing modifiers
 * No translation - passes Russian directly to Tripo AI
 */
export function enrichPrompt(rawInput: string): string {
    const prompt = rawInput.trim();

    if (!prompt) {
        return 'cute toy figurine';
    }

    const safetyMods = SAFETY_MODIFIERS.join(', ');
    const styleMods = STYLE_MODIFIERS.join(', ');

    // Pass user's prompt directly (Russian or English) + add modifiers
    const enrichedPrompt = `${prompt}, ${safetyMods}, ${styleMods}`;

    console.log('📝 Prompt enrichment:', {
        original: rawInput,
        enriched: enrichedPrompt
    });

    return enrichedPrompt;
}

export function detectLanguage(text: string): 'ru' | 'en' {
    const cyrillicPattern = /[\u0400-\u04FF]/;
    return cyrillicPattern.test(text) ? 'ru' : 'en';
}

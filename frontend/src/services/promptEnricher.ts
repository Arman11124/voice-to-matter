/**
 * Prompt Enricher - Simple version
 * Adds 3D printing modifiers to user's prompt WITHOUT translation
 * Tripo AI supports Russian natively
 */

// 3D safety modifiers for printability
const SAFETY_MODIFIERS = [
    'solid thick walls',
    'minimal overhangs',
    'no thin fragile parts',
    'flat bottom', // Ensure model sits flat
    'thick grounded legs', // Better contact with base
    'sturdy construction'
];

// Style modifiers for better results
const STYLE_MODIFIERS = [
    'figurine style',
    'toy aesthetic',
    'colorful',
    'vibrant colors',
    'high quality texture',
    '3D printable model',
    'smooth surfaces',
    'high fidelity'
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

    // Check if user specifically requested a shape that conflicts with realism
    const isStylized = /shar|ball|sphere|cube|box|square|circle|round|stylized|cartoon|chibi/i.test(prompt) ||
        /шар|куб|квадрат|круг|сфера|мульт|чиби/i.test(prompt);

    const safetyMods = [...SAFETY_MODIFIERS];

    // If not explicitly stylized, we can add some balancing terms, 
    // but we generally avoid "realistic proportions" to allow for "ball dogs"
    if (!isStylized) {
        safetyMods.push('balanced dimensions');
    }

    // Combine: User Prompt + Minimal Base + Safety + Style
    // Changed "solid round pedestal base" to "small thin base" to avoid statue look
    const enrichedPrompt = `${prompt}, standing on a small thin base, ${safetyMods.join(', ')}, ${STYLE_MODIFIERS.join(', ')}`;

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

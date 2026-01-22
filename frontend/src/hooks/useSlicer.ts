/**
 * Slicer Hook - Uses fast naive slicer
 * CuraEngine disabled due to VPS performance limitations
 */
import { useState, useCallback } from 'react';
import { sliceModelReal } from '../services/slicer/realSlicer';
import { shareGcode } from '../services/slicer/fileShare';

export function useSlicer() {
    const [isSlicing, setIsSlicing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [slicerEngine, setSlicerEngine] = useState<'cura' | 'fallback' | null>(null);

    const sliceAndShare = useCallback(async (modelUrl: string, filename: string) => {
        setIsSlicing(true);
        setProgress(0);
        setError(null);

        try {
            // Use fast naive slicer (CuraEngine disabled - too slow on VPS)
            console.log('🔪 Using fast slicer');
            setSlicerEngine('fallback');
            const gcode = await sliceModelReal(modelUrl, setProgress);

            // Share G-code to Anycubic App
            setProgress(95);
            await shareGcode(gcode, filename + '.gcode');
            setProgress(100);

        } catch (e) {
            console.error('Slicing error:', e);
            setError(e instanceof Error ? e.message : 'Ошибка подготовки файла');
        } finally {
            setIsSlicing(false);
        }
    }, []);

    return {
        isSlicing,
        progress,
        error,
        slicerEngine,
        sliceAndShare
    };
}

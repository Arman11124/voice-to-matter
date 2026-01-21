/**
 * Slicer Hook - Uses CuraEngine backend for professional slicing
 * Fallback: naive realSlicer if backend unavailable
 */
import { useState, useCallback } from 'react';
import { sliceWithCura, checkSlicerStatus } from '../services/slicer/curaSlicerService';
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
            let gcode: string;

            // Try CuraEngine backend first (professional quality)
            const curaAvailable = await checkSlicerStatus();

            if (curaAvailable) {
                console.log('🔪 Using CuraEngine backend (professional)');
                setSlicerEngine('cura');
                const result = await sliceWithCura(modelUrl, filename, setProgress);
                gcode = result.gcode;
            } else {
                // Fallback to naive slicer
                console.log('⚠️ CuraEngine unavailable, using fallback slicer');
                setSlicerEngine('fallback');
                gcode = await sliceModelReal(modelUrl, setProgress);
            }

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

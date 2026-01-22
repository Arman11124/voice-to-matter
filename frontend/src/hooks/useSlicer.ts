/**
 * Slicer Hook - Uses Kiri:Moto browser slicer (primary)
 * Fallback: naive realSlicer if Kiri not loaded
 */
import { useState, useCallback } from 'react';
import { sliceWithKiri, isKiriAvailable } from '../services/slicer/kiriSlicerService';
import { sliceModelReal } from '../services/slicer/realSlicer';
import { shareGcode } from '../services/slicer/fileShare';

export function useSlicer() {
    const [isSlicing, setIsSlicing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [slicerEngine, setSlicerEngine] = useState<'kiri' | 'fallback' | null>(null);

    const sliceAndShare = useCallback(async (modelUrl: string, filename: string) => {
        setIsSlicing(true);
        setProgress(0);
        setError(null);

        try {
            let gcode: string;

            // Try Kiri:Moto browser slicer first (professional quality)
            if (isKiriAvailable()) {
                console.log('🔪 Using Kiri:Moto browser slicer (professional)');
                setSlicerEngine('kiri');

                try {
                    const result = await sliceWithKiri(modelUrl, filename, setProgress);
                    gcode = result.gcode;
                } catch (kiriError) {
                    // Kiri failed - fallback to naive slicer
                    console.warn('⚠️ Kiri:Moto failed, using fallback:', kiriError);
                    setSlicerEngine('fallback');
                    setProgress(10);
                    gcode = await sliceModelReal(modelUrl, setProgress);
                }
            } else {
                // Kiri not available - use fallback
                console.log('⚠️ Kiri:Moto not loaded, using fallback slicer');
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

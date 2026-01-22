/**
 * Slicer Hook - Uses Kiri:Moto browser slicer (primary)
 * Fallback: naive realSlicer if Kiri not loaded
 */
import { useState, useCallback } from 'react';
import { sliceWithKiri } from '../services/slicer/kiriSlicerService';
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

            // Try Kiri:Moto browser slicer first (has internal wait for loading)
            console.log('🔪 Trying Kiri:Moto browser slicer...');
            setSlicerEngine('kiri');

            try {
                const result = await sliceWithKiri(modelUrl, filename, setProgress);
                gcode = result.gcode;
                console.log('✅ Kiri:Moto slicing complete');
            } catch (kiriError) {
                // Kiri failed - fallback to naive slicer
                console.warn('⚠️ Kiri:Moto failed, using fallback:', kiriError);
                setSlicerEngine('fallback');
                setProgress(10);
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

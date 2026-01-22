/**
 * Slicer Hook - Uses CuraEngine backend with timeout fallback
 * If CuraEngine times out (>60s), falls back to naive realSlicer
 */
import { useState, useCallback } from 'react';
import { sliceWithCura, checkSlicerStatus } from '../services/slicer/curaSlicerService';
import { sliceModelReal } from '../services/slicer/realSlicer';
import { shareGcode } from '../services/slicer/fileShare';

const CURA_TIMEOUT_MS = 60000; // 60 seconds timeout for CuraEngine

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

            // Try CuraEngine backend first with timeout
            const curaAvailable = await checkSlicerStatus();

            if (curaAvailable) {
                console.log('🔪 Using CuraEngine backend (professional)');
                setSlicerEngine('cura');

                try {
                    // Race between CuraEngine and timeout
                    const result = await Promise.race([
                        sliceWithCura(modelUrl, filename, setProgress),
                        new Promise<never>((_, reject) =>
                            setTimeout(() => reject(new Error('CuraEngine timeout')), CURA_TIMEOUT_MS)
                        )
                    ]);
                    gcode = result.gcode;
                } catch (curaError) {
                    // CuraEngine failed or timed out - fallback to naive slicer
                    console.warn('⚠️ CuraEngine timeout/error, using fast fallback:', curaError);
                    setSlicerEngine('fallback');
                    setProgress(10);
                    gcode = await sliceModelReal(modelUrl, setProgress);
                }
            } else {
                // CuraEngine not available - use fallback
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

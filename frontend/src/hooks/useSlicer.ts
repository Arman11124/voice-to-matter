
import { useState, useCallback } from 'react';
import { sliceModelReal } from '../services/slicer/realSlicer';
import { shareGcode } from '../services/slicer/fileShare';

export function useSlicer() {
    const [isSlicing, setIsSlicing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const sliceAndShare = useCallback(async (modelUrl: string, filename: string) => {
        setIsSlicing(true);
        setProgress(0);
        setError(null);

        try {
            // 1. Slice (Generate Real G-code)
            const gcode = await sliceModelReal(modelUrl, (p) => setProgress(p));

            // 2. Share (Send to App)
            await shareGcode(gcode, filename + '.gcode');

        } catch (e) {
            console.error('Slicing error:', e);
            setError('Ошибка подготовки файла');
        } finally {
            setIsSlicing(false);
        }
    }, []);

    return {
        isSlicing,
        progress,
        error,
        sliceAndShare
    };
}

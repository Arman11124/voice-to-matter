/**
 * Slicer Hook - Smart platform detection
 * Mobile: Share STL to apps
 * Desktop: Download + open Kiri:Moto
 */
import { useState, useCallback } from 'react';
import { exportForSlicing } from '../services/slicer/kiriSlicerService';

export function useSlicer() {
    const [isSlicing, setIsSlicing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [slicerEngine, setSlicerEngine] = useState<'kiri' | 'share' | 'download' | null>(null);

    const sliceAndShare = useCallback(async (modelUrl: string, filename: string) => {
        setIsSlicing(true);
        setProgress(0);
        setError(null);

        try {
            console.log('🔪 Exporting for slicing...');
            const result = await exportForSlicing(modelUrl, filename, setProgress);
            setSlicerEngine(result.method);
            console.log(`✅ Export complete via: ${result.method}`);
        } catch (e) {
            console.error('Export error:', e);
            setError(e instanceof Error ? e.message : 'Ошибка экспорта');
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

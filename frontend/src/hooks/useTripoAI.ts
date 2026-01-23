import { useState, useCallback } from 'react';

// API base URL from environment variable
const API_BASE = import.meta.env.VITE_API_URL || '';

export type GenerationStatus = 'idle' | 'generating' | 'success' | 'error';

interface UseTripoAIReturn {
    status: GenerationStatus;
    progress: number;
    modelUrl: string | null;
    error: string | null;
    generate: (prompt: string) => Promise<string | null>;
    refine: (imageBase64: string, prompt: string) => Promise<string | null>;
    loadModel: (url: string) => void;
    reset: () => void;
}

export function useTripoAI(): UseTripoAIReturn {
    const [status, setStatus] = useState<GenerationStatus>('idle');
    const [progress, setProgress] = useState(0);
    const [modelUrl, setModelUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const pollStatus = useCallback(async (taskId: string): Promise<string> => {
        const maxAttempts = 60; // 2 minutes max
        let attempts = 0;

        while (attempts < maxAttempts) {
            const response = await fetch(`${API_BASE}/api/status/${taskId}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Status check failed');
            }

            setProgress(data.progress || 0);

            if (data.status === 'success' && data.modelUrl) {
                return data.modelUrl;
            }

            if (data.status === 'failed') {
                throw new Error(data.error || 'Generation failed');
            }

            // Wait 2 seconds before next poll
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;
        }

        throw new Error('Generation timed out');
    }, []);

    const generate = useCallback(async (prompt: string): Promise<string | null> => {
        setStatus('generating');
        setProgress(0);
        setModelUrl(null);
        setError(null);

        try {
            console.log('🚀 [TRIPO] Starting generation with prompt:', prompt);

            // Step 1: Create task
            const createResponse = await fetch(`${API_BASE}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            const createData = await createResponse.json();

            if (!createResponse.ok) {
                throw new Error(createData.error || 'Failed to start generation');
            }

            const { taskId } = createData;
            console.log('📋 [TRIPO] Task created:', taskId);

            // Step 2: Poll for completion
            const originalUrl = await pollStatus(taskId);

            // Use proxy to avoid CORS issues with model-viewer
            const proxiedUrl = `${API_BASE}/api/model-proxy?url=${encodeURIComponent(originalUrl)}`;

            console.log('✅ [TRIPO] Model ready:', originalUrl);
            setModelUrl(proxiedUrl);
            setStatus('success');
            setProgress(100);

            return proxiedUrl;

        } catch (e) {
            console.error('[TRIPO] Generation error:', e);
            setError(e instanceof Error ? e.message : 'Unknown error');
            setStatus('error');
            return null;
        }
    }, [pollStatus]);

    // Refine existing model using screenshot + new prompt
    const refine = useCallback(async (imageBase64: string, prompt: string): Promise<string | null> => {

        setStatus('generating');
        setProgress(0);
        setError(null);

        try {
            console.log('📸 Starting refinement with screenshot and prompt:', prompt);

            // Step 1: Upload screenshot
            const uploadResponse = await fetch(`${API_BASE}/api/upload-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imageBase64 })
            });

            const uploadData = await uploadResponse.json();

            if (!uploadResponse.ok) {
                throw new Error(uploadData.error || 'Failed to upload screenshot');
            }

            const { imageToken } = uploadData;
            console.log('✅ Screenshot uploaded, token:', imageToken);

            // Step 2: Create image-to-model task
            const refineResponse = await fetch(`${API_BASE}/api/refine`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageToken, prompt })
            });

            const refineData = await refineResponse.json();

            if (!refineResponse.ok) {
                throw new Error(refineData.error || 'Failed to start refinement');
            }

            const { taskId } = refineData;
            console.log('📋 Refine task created:', taskId);

            // Step 3: Poll for completion
            const originalUrl = await pollStatus(taskId);

            // Use proxy to avoid CORS issues
            const proxiedUrl = `${API_BASE}/api/model-proxy?url=${encodeURIComponent(originalUrl)}`;

            console.log('✅ Refined model ready:', originalUrl);
            setModelUrl(proxiedUrl);
            setStatus('success');
            setProgress(100);

            return proxiedUrl;

        } catch (e) {
            console.error('Refinement error:', e);
            setError(e instanceof Error ? e.message : 'Unknown error');
            setStatus('error');
            return null;
        }
    }, [pollStatus]);

    const reset = useCallback(() => {
        setStatus('idle');
        setProgress(0);
        setModelUrl(null);
        setError(null);
    }, []);

    // Load a saved model URL directly
    const loadModel = useCallback((url: string) => {
        setModelUrl(url);
        setStatus('success');
        setProgress(100);
        setError(null);
    }, []);

    return {
        status,
        progress,
        modelUrl,
        error,
        generate,
        refine,
        loadModel,
        reset
    };
}

import { useState, useCallback } from 'react';

// Cloudflare Tunnel HTTPS proxy to VPS backend
const API_BASE = 'https://johnston-arbitration-maiden-capacity.trycloudflare.com';

export type GenerationStatus = 'idle' | 'generating' | 'success' | 'error';

interface UseTripoAIReturn {
    status: GenerationStatus;
    progress: number;
    modelUrl: string | null;
    error: string | null;
    generate: (prompt: string) => Promise<string | null>;
    reset: () => void;
}

export function useTripoAI(): UseTripoAIReturn {
    const [status, setStatus] = useState<GenerationStatus>('idle');
    const [progress, setProgress] = useState(0);
    const [modelUrl, setModelUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const pollStatus = useCallback(async (taskId: string): Promise<string> => {
        const maxAttempts = 60; // 2 minutes max (2s interval)
        let attempts = 0;

        while (attempts < maxAttempts) {
            try {
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

            } catch (e) {
                throw e;
            }
        }

        throw new Error('Generation timed out');
    }, []);

    const generate = useCallback(async (prompt: string): Promise<string | null> => {
        setStatus('generating');
        setProgress(0);
        setModelUrl(null);
        setError(null);

        try {
            console.log('🚀 Starting generation with prompt:', prompt);

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
            console.log('📋 Task created:', taskId);

            // Step 2: Poll for completion
            const originalUrl = await pollStatus(taskId);

            // Use proxy to avoid CORS issues with model-viewer
            const proxiedUrl = `${API_BASE}/api/model-proxy?url=${encodeURIComponent(originalUrl)}`;

            console.log('✅ Model ready:', originalUrl);
            console.log('🔄 Using proxied URL:', proxiedUrl);
            setModelUrl(proxiedUrl);
            setStatus('success');
            setProgress(100);

            return proxiedUrl;

        } catch (e) {
            console.error('Generation error:', e);
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

    return {
        status,
        progress,
        modelUrl,
        error,
        generate,
        reset
    };
}

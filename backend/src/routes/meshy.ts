import { Router, Request, Response } from 'express';

const router = Router();

const MESHY_API_BASE = 'https://api.meshy.ai/v2';
const getApiKey = () => process.env.MESHY_API_KEY;

// Generate 3D model from text using Meshy AI
router.post('/generate', async (req: Request, res: Response) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            res.status(400).json({ error: 'Prompt is required' });
            return;
        }

        if (!getApiKey()) {
            res.status(500).json({ error: 'Meshy API key not configured' });
            return;
        }

        console.log(`🎨 [Meshy] Generating 3D model for: "${prompt}"`);

        // Meshy Text-to-3D API v2
        const response = await fetch(`${MESHY_API_BASE}/text-to-3d`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getApiKey()}`
            },
            body: JSON.stringify({
                mode: 'preview', // 'preview' is faster, 'refine' is higher quality
                prompt: prompt,
                art_style: 'realistic',
                negative_prompt: 'low quality, blurry, distorted'
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[Meshy] API error:', data);
            res.status(response.status).json({ error: data.message || 'Meshy API error' });
            return;
        }

        console.log(`✅ [Meshy] Task created: ${data.result}`);
        res.json({
            taskId: data.result, // Meshy returns task ID in 'result' field
            status: 'queued'
        });

    } catch (error) {
        console.error('[Meshy] Generate error:', error);
        res.status(500).json({ error: 'Failed to generate model with Meshy' });
    }
});

// Check task status
router.get('/status/:taskId', async (req: Request, res: Response) => {
    try {
        const { taskId } = req.params;

        if (!getApiKey()) {
            res.status(500).json({ error: 'Meshy API key not configured' });
            return;
        }

        const response = await fetch(`${MESHY_API_BASE}/text-to-3d/${taskId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${getApiKey()}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            res.status(response.status).json({ error: data.message || 'Status check failed' });
            return;
        }

        // Map Meshy status to our standard format
        // Meshy statuses: PENDING, IN_PROGRESS, SUCCEEDED, FAILED, EXPIRED
        const statusMap: Record<string, string> = {
            'PENDING': 'queued',
            'IN_PROGRESS': 'running',
            'SUCCEEDED': 'success',
            'FAILED': 'failed',
            'EXPIRED': 'failed'
        };

        const result: {
            status: string;
            progress?: number;
            modelUrl?: string;
            error?: string;
        } = {
            status: statusMap[data.status] || data.status,
            progress: data.progress || 0
        };

        // If completed, get the GLB model URL
        if (data.status === 'SUCCEEDED' && data.model_urls?.glb) {
            result.modelUrl = data.model_urls.glb;
            result.progress = 100;
            console.log(`✅ [Meshy] Model ready: ${data.model_urls.glb.substring(0, 50)}...`);
        }

        // If failed
        if (data.status === 'FAILED' || data.status === 'EXPIRED') {
            result.error = data.task_error?.message || 'Generation failed';
        }

        res.json(result);

    } catch (error) {
        console.error('[Meshy] Status check error:', error);
        res.status(500).json({ error: 'Failed to check Meshy status' });
    }
});

export default router;

import { Router, Request, Response } from 'express';

const router = Router();

const TRIPO_API_BASE = 'https://api.tripo3d.ai/v2/openapi';
const getApiKey = () => process.env.TRIPO_API_KEY;

// Generate 3D model from text
router.post('/generate', async (req: Request, res: Response) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            res.status(400).json({ error: 'Prompt is required' });
            return;
        }

        if (!getApiKey()) {
            res.status(500).json({ error: 'API key not configured' });
            return;
        }

        console.log(`🎨 Generating 3D model for: "${prompt}"`);

        const response = await fetch(`${TRIPO_API_BASE}/task`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getApiKey()}`
            },
            body: JSON.stringify({
                type: 'text_to_model',
                prompt: prompt
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Tripo API error:', data);
            res.status(response.status).json({ error: data.message || 'Tripo API error' });
            return;
        }

        console.log(`✅ Task created: ${data.data?.task_id}`);
        res.json({
            taskId: data.data?.task_id,
            status: 'queued'
        });

    } catch (error) {
        console.error('Generate error:', error);
        res.status(500).json({ error: 'Failed to generate model' });
    }
});

// Check task status
router.get('/status/:taskId', async (req: Request, res: Response) => {
    try {
        const { taskId } = req.params;

        if (!getApiKey()) {
            res.status(500).json({ error: 'API key not configured' });
            return;
        }

        const response = await fetch(`${TRIPO_API_BASE}/task/${taskId}`, {
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

        const taskData = data.data;
        const result: {
            status: string;
            progress?: number;
            modelUrl?: string;
            error?: string;
        } = {
            status: taskData.status,
            progress: taskData.progress || 0
        };

        // If completed, include model URL (Tripo uses pbr_model)
        if (taskData.status === 'success' && taskData.output?.pbr_model) {
            result.modelUrl = taskData.output.pbr_model;
        }

        // If failed, include error
        if (taskData.status === 'failed') {
            result.error = taskData.output?.message || 'Generation failed';
        }

        res.json(result);

    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ error: 'Failed to check status' });
    }
});

export default router;

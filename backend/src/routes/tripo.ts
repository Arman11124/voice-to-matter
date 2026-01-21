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
        console.log(`📝 FULL PROMPT BEING SENT TO TRIPO:`, JSON.stringify(prompt));

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

// Proxy model download to avoid CORS issues
router.get('/model-proxy', async (req: Request, res: Response) => {
    try {
        const { url } = req.query;

        if (!url || typeof url !== 'string') {
            res.status(400).json({ error: 'URL parameter is required' });
            return;
        }

        console.log('📦 Proxying model from:', url.substring(0, 80) + '...');

        const response = await fetch(url);

        if (!response.ok) {
            res.status(response.status).json({ error: 'Failed to fetch model' });
            return;
        }

        // Get the content as array buffer
        const buffer = await response.arrayBuffer();

        // Set CORS and content type headers
        res.set({
            'Content-Type': 'model/gltf-binary',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=3600'
        });

        res.send(Buffer.from(buffer));

    } catch (error) {
        console.error('Model proxy error:', error);
        res.status(500).json({ error: 'Failed to proxy model' });
    }
});

// Upload image and get file token for image-to-model
router.post('/upload-image', async (req: Request, res: Response) => {
    try {
        const { image } = req.body; // base64 image data

        if (!image) {
            res.status(400).json({ error: 'Image data is required' });
            return;
        }

        if (!getApiKey()) {
            res.status(500).json({ error: 'API key not configured' });
            return;
        }

        // Extract base64 data (remove data:image/png;base64, prefix if present)
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        console.log('📤 Uploading image for refinement, size:', imageBuffer.length);

        // Upload to Tripo
        const formData = new FormData();
        const blob = new Blob([imageBuffer], { type: 'image/png' });
        formData.append('file', blob, 'screenshot.png');

        const uploadResponse = await fetch(`${TRIPO_API_BASE}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getApiKey()}`
            },
            body: formData
        });

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok) {
            console.error('Upload error:', uploadData);
            res.status(uploadResponse.status).json({ error: uploadData.message || 'Upload failed' });
            return;
        }

        console.log('✅ Image uploaded, token:', uploadData.data?.image_token);
        res.json({
            imageToken: uploadData.data?.image_token
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload image' });
    }
});

// Generate 3D model from image (for refinement)
router.post('/refine', async (req: Request, res: Response) => {
    try {
        const { imageToken, prompt } = req.body;

        if (!imageToken) {
            res.status(400).json({ error: 'Image token is required' });
            return;
        }

        if (!getApiKey()) {
            res.status(500).json({ error: 'API key not configured' });
            return;
        }

        console.log(`🔄 Refining model with image and prompt: "${prompt || 'no prompt'}"`);

        const requestBody: {
            type: string;
            file: { type: string; file_token: string };
            prompt?: string;
        } = {
            type: 'image_to_model',
            file: {
                type: 'png',
                file_token: imageToken
            }
        };

        // Add prompt if provided
        if (prompt) {
            requestBody.prompt = prompt;
        }

        const response = await fetch(`${TRIPO_API_BASE}/task`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getApiKey()}`
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Refine API error:', data);
            res.status(response.status).json({ error: data.message || 'Refine failed' });
            return;
        }

        console.log(`✅ Refine task created: ${data.data?.task_id}`);
        res.json({
            taskId: data.data?.task_id,
            status: 'queued'
        });

    } catch (error) {
        console.error('Refine error:', error);
        res.status(500).json({ error: 'Failed to refine model' });
    }
});

export default router;

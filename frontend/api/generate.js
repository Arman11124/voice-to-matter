export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const API_KEY = process.env.TRIPO_API_KEY;

    if (!API_KEY) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        const response = await fetch('https://api.tripo3d.ai/v2/openapi/task', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                type: 'text_to_model',
                prompt: prompt,
                model_version: 'v2.0-20240919'
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                error: data.message || 'Tripo API error'
            });
        }

        return res.status(200).json({
            taskId: data.data?.task_id,
            status: 'queued'
        });
    } catch (error) {
        console.error('Generate error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

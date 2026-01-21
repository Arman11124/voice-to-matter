export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const API_KEY = process.env.TRIPO_API_KEY;
    const { taskId } = req.query;

    if (!API_KEY) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    if (!taskId) {
        return res.status(400).json({ error: 'Task ID is required' });
    }

    try {
        const response = await fetch(`https://api.tripo3d.ai/v2/openapi/task/${taskId}`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                error: data.message || 'Tripo API error'
            });
        }

        const taskData = data.data;

        return res.status(200).json({
            taskId: taskData.task_id,
            status: taskData.status,
            progress: taskData.progress || 0,
            modelUrl: taskData.output?.pbr_model || taskData.output?.model || null
        });
    } catch (error) {
        console.error('Status error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

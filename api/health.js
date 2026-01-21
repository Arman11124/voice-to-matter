export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({
        status: 'ok',
        service: 'voice-to-matter-api',
        timestamp: new Date().toISOString()
    });
}

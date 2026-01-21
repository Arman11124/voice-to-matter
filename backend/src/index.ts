import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import tripoRoutes from './routes/tripo';

// Load .env from backend directory
dotenv.config({ path: path.join(process.cwd(), '.env') });

console.log('🔑 API Key loaded:', process.env.TRIPO_API_KEY ? 'Yes' : 'No');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: '*', // Allow all origins for development
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Routes
app.use('/api', tripoRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'voice-to-matter-proxy' });
});

app.listen(PORT, () => {
    console.log(`🚀 Voice-to-Matter Proxy running on port ${PORT}`);
    console.log(`📡 Tripo AI proxy ready at http://localhost:${PORT}/api`);
});

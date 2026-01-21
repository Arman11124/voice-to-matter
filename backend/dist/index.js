"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const tripo_1 = __importDefault(require("./routes/tripo"));
const sync_1 = __importDefault(require("./routes/sync"));
const slice_1 = __importDefault(require("./routes/slice"));
// Load .env from backend directory
dotenv_1.default.config({ path: path_1.default.join(process.cwd(), '.env') });
console.log('🔑 API Key loaded:', process.env.TRIPO_API_KEY ? 'Yes' : 'No');
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)({
    origin: '*', // Allow all origins for development
    methods: ['GET', 'POST', 'HEAD'],
    allowedHeaders: ['Content-Type']
}));
app.use(express_1.default.json({ limit: '50mb' })); // Increased limit for STL data
// Routes
app.use('/api', tripo_1.default);
app.use('/api/sync', sync_1.default);
app.use('/api/slice', slice_1.default);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'voice-to-matter-proxy' });
});
app.listen(PORT, () => {
    console.log(`🚀 Voice-to-Matter Proxy running on port ${PORT}`);
    console.log(`📡 Tripo AI proxy ready at http://localhost:${PORT}/api`);
    console.log(`💾 Sync API ready at http://localhost:${PORT}/api/sync`);
});

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const tripo_js_1 = __importDefault(require("./routes/tripo.js"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)({
    origin: '*', // Allow all origins for development
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(express_1.default.json());
// Routes
app.use('/api', tripo_js_1.default);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'voice-to-matter-proxy' });
});
app.listen(PORT, () => {
    console.log(`🚀 Voice-to-Matter Proxy running on port ${PORT}`);
    console.log(`📡 Tripo AI proxy ready at http://localhost:${PORT}/api`);
});

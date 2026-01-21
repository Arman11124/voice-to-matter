"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const router = (0, express_1.Router)();
// Data file path
const DATA_DIR = path.join(process.cwd(), 'data');
const MODELS_FILE = path.join(DATA_DIR, 'saved-models.json');
// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
// Initialize empty file if doesn't exist
if (!fs.existsSync(MODELS_FILE)) {
    fs.writeFileSync(MODELS_FILE, JSON.stringify({}));
}
function loadData() {
    try {
        const data = fs.readFileSync(MODELS_FILE, 'utf-8');
        return JSON.parse(data);
    }
    catch {
        return {};
    }
}
function saveData(data) {
    fs.writeFileSync(MODELS_FILE, JSON.stringify(data, null, 2));
}
// Get models by PIN
router.get('/:pin', (req, res) => {
    try {
        const { pin } = req.params;
        // Validate PIN format (4-6 digits)
        if (!/^\d{4,6}$/.test(pin)) {
            res.status(400).json({ error: 'PIN must be 4-6 digits' });
            return;
        }
        const data = loadData();
        const models = data[pin] || [];
        console.log(`📂 Loaded ${models.length} models for PIN ${pin}`);
        res.json({ models });
    }
    catch (error) {
        console.error('Load error:', error);
        res.status(500).json({ error: 'Failed to load models' });
    }
});
// Save models with PIN
router.post('/:pin', (req, res) => {
    try {
        const { pin } = req.params;
        const { models } = req.body;
        // Validate PIN format
        if (!/^\d{4,6}$/.test(pin)) {
            res.status(400).json({ error: 'PIN must be 4-6 digits' });
            return;
        }
        // Validate models array
        if (!Array.isArray(models)) {
            res.status(400).json({ error: 'Models must be an array' });
            return;
        }
        const data = loadData();
        data[pin] = models;
        saveData(data);
        console.log(`💾 Saved ${models.length} models for PIN ${pin}`);
        res.json({ success: true, count: models.length });
    }
    catch (error) {
        console.error('Save error:', error);
        res.status(500).json({ error: 'Failed to save models' });
    }
});
// Check if PIN exists
router.head('/:pin', (req, res) => {
    try {
        const { pin } = req.params;
        if (!/^\d{4,6}$/.test(pin)) {
            res.status(400).send();
            return;
        }
        const data = loadData();
        const exists = pin in data && data[pin].length > 0;
        res.status(exists ? 200 : 404).send();
    }
    catch {
        res.status(500).send();
    }
});
exports.default = router;

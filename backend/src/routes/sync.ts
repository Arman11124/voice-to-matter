import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

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

interface SavedModel {
    id: string;
    prompt: string;
    modelUrl: string;
    thumbnail?: string;
    createdAt: number;
}

interface ModelsData {
    [pin: string]: SavedModel[];
}

function loadData(): ModelsData {
    try {
        const data = fs.readFileSync(MODELS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}

function saveData(data: ModelsData): void {
    fs.writeFileSync(MODELS_FILE, JSON.stringify(data, null, 2));
}

// Get models by PIN
router.get('/:pin', (req: Request, res: Response) => {
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

    } catch (error) {
        console.error('Load error:', error);
        res.status(500).json({ error: 'Failed to load models' });
    }
});

// Save models with PIN
router.post('/:pin', (req: Request, res: Response) => {
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

    } catch (error) {
        console.error('Save error:', error);
        res.status(500).json({ error: 'Failed to save models' });
    }
});

// Check if PIN exists
router.head('/:pin', (req: Request, res: Response) => {
    try {
        const { pin } = req.params;

        if (!/^\d{4,6}$/.test(pin)) {
            res.status(400).send();
            return;
        }

        const data = loadData();
        const exists = pin in data && data[pin].length > 0;

        res.status(exists ? 200 : 404).send();

    } catch {
        res.status(500).send();
    }
});

export default router;

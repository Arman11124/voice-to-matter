import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

const router = Router();

const MODELS_DIR = path.join(process.cwd(), 'public', 'models');
const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');

// Ensure directories exist
if (!fs.existsSync(MODELS_DIR)) fs.mkdirSync(MODELS_DIR, { recursive: true });
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

router.post('/save-model', async (req: Request, res: Response) => {
    try {
        const { modelUrl, thumbnailUrl, prompt } = req.body;

        if (!modelUrl) {
            return res.status(400).json({ error: 'Missing modelUrl' });
        }

        const id = uuidv4();
        const modelFilename = `${id}.glb`;
        const imageFilename = `${id}.png`;

        console.log(`💾 Saving persistent model: ${prompt} (${id})`);

        // 1. Download Model
        const modelPath = path.join(MODELS_DIR, modelFilename);
        const modelRes = await fetch(modelUrl);
        if (!modelRes.ok) throw new Error(`Failed to fetch model: ${modelRes.statusText}`);
        const modelBuffer = await modelRes.buffer();
        fs.writeFileSync(modelPath, modelBuffer);
        console.log(`✅ Model saved to ${modelPath}`);

        // 2. Download Thumbnail (if exists)
        let finalImageUrl = thumbnailUrl;
        if (thumbnailUrl && thumbnailUrl.startsWith('http')) {
            const imagePath = path.join(IMAGES_DIR, imageFilename);
            const imageRes = await fetch(thumbnailUrl);
            if (imageRes.ok) {
                const imageBuffer = await imageRes.buffer();
                fs.writeFileSync(imagePath, imageBuffer);
                console.log(`✅ Image saved to ${imagePath}`);
                // Construct relative URL
                finalImageUrl = `/images/${imageFilename}`;
            } else {
                console.warn('⚠️ Failed to save thumbnail, keeping original URL');
            }
        }

        // Construct permanent URLs
        // The frontend will prepend the API_BASE, so we return relative paths (or full paths if needed)
        // Here we return paths relative to the server root
        const permModelUrl = `/models/${modelFilename}`;

        res.json({
            success: true,
            id,
            modelUrl: permModelUrl,
            thumbnail: finalImageUrl
        });

    } catch (error) {
        console.error('Save error:', error);
        res.status(500).json({ error: 'Failed to save persistent model' });
    }
});

export const storageRoutes = router;

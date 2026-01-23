import { useState, useCallback, useEffect } from 'react';

export interface SavedModel {
    id: string;
    prompt: string;
    modelUrl: string;
    thumbnail?: string;
    createdAt: number;
}

const STORAGE_KEY = 'voice-to-matter-saved-models';

interface UseSavedModelsReturn {
    models: SavedModel[];
    saveModel: (prompt: string, modelUrl: string, thumbnail?: string, id?: string, createdAt?: number) => void;
    deleteModel: (id: string) => void;
    renameModel: (id: string, newName: string) => void;
    clearAll: () => void;
}

export function useSavedModels(): UseSavedModelsReturn {
    // ... (state init unchanged) ...
    const [models, setModels] = useState<SavedModel[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) return [];

            // Fix legacy Cloudflare URLs on load
            const parsed = JSON.parse(saved);
            return parsed.map((m: any) => ({
                ...m,
                modelUrl: m.modelUrl.replace('https://spotlight-interior-medical-carey.trycloudflare.com', 'http://localhost:3001')
            }));
        } catch (e) {
            console.error('Failed to load saved models:', e);
            return [];
        }
    });

    // ... (useEffect unchanged) ...
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(models));
        } catch (e) {
            console.error('Failed to save models:', e);
        }
    }, [models]);

    const saveModel = useCallback(async (prompt: string, modelUrl: string, thumbnailUrl?: string, id?: string, createdAt?: number) => {
        try {
            console.log('💾 Saving persistent model...', prompt);

            // 1. Call backend to download and store files
            // Use hardcoded localhost for dev, but in prod this should be relative or env based
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

            const response = await fetch(`${API_BASE}/api/save-model`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ modelUrl, thumbnailUrl, prompt })
            });

            if (!response.ok) throw new Error('Failed to persist model on server');

            const data = await response.json();
            const permanentModelUrl = `${API_BASE}${data.modelUrl}`;
            const permanentThumbnailUrl = data.thumbnail ? `${API_BASE}${data.thumbnail}` : thumbnailUrl;

            // 2. Save metadata to localStorage with PERMANENT URLs
            const newModel: SavedModel = {
                id: data.id, // Use server-generated ID
                prompt,
                modelUrl: permanentModelUrl,
                thumbnail: permanentThumbnailUrl,
                createdAt: createdAt || Date.now()
            };

            setModels(prev => {
                // Check for duplicates
                if (prev.some(m => m.id === newModel.id)) return prev;
                return [newModel, ...prev].slice(0, 20);
            });
            console.log('✅ Model saved permanently:', newModel);

        } catch (e) {
            console.error('Save error:', e);
            // Fallback (unsafe): Save original URL if server fails
            alert('Ошибка сохранения на сервере. Сохранено локально (ненадолго).');
            const newModel: SavedModel = {
                id: id || Date.now().toString(),
                prompt,
                modelUrl,
                thumbnail: thumbnailUrl,
                createdAt: createdAt || Date.now()
            };
            setModels(prev => [newModel, ...prev].slice(0, 20));
        }
    }, []);

    const deleteModel = useCallback((id: string) => {
        setModels(prev => prev.filter(m => m.id !== id));
    }, []);

    const renameModel = useCallback((id: string, newName: string) => {
        setModels(prev => prev.map(m =>
            m.id === id ? { ...m, prompt: newName } : m
        ));
    }, []);

    const clearAll = useCallback(() => {
        setModels([]);
    }, []);

    return {
        models,
        saveModel,
        deleteModel,
        renameModel,
        clearAll
    };
}

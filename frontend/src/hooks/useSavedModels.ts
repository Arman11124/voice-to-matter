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
    saveModel: (prompt: string, modelUrl: string, thumbnail?: string) => void;
    deleteModel: (id: string) => void;
    clearAll: () => void;
}

export function useSavedModels(): UseSavedModelsReturn {
    const [models, setModels] = useState<SavedModel[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Failed to load saved models:', e);
            return [];
        }
    });

    // Save to localStorage whenever models change
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(models));
        } catch (e) {
            console.error('Failed to save models:', e);
        }
    }, [models]);

    const saveModel = useCallback((prompt: string, modelUrl: string, thumbnail?: string) => {
        const newModel: SavedModel = {
            id: Date.now().toString(),
            prompt,
            modelUrl,
            thumbnail,
            createdAt: Date.now()
        };

        setModels(prev => [newModel, ...prev].slice(0, 20)); // Keep max 20 models
        console.log('💾 Model saved:', prompt);
    }, []);

    const deleteModel = useCallback((id: string) => {
        setModels(prev => prev.filter(m => m.id !== id));
    }, []);

    const clearAll = useCallback(() => {
        setModels([]);
    }, []);

    return {
        models,
        saveModel,
        deleteModel,
        clearAll
    };
}

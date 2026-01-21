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
            return saved ? JSON.parse(saved) : [];
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

    const saveModel = useCallback((prompt: string, modelUrl: string, thumbnail?: string, id?: string, createdAt?: number) => {
        const newModel: SavedModel = {
            id: id || Date.now().toString(),
            prompt,
            modelUrl,
            thumbnail,
            createdAt: createdAt || Date.now()
        };

        setModels(prev => {
            // Check for duplicates if ID is provided
            if (id && prev.some(m => m.id === id)) {
                return prev;
            }
            return [newModel, ...prev].slice(0, 20); // Keep max 20 models
        });
        console.log('💾 Model saved:', prompt);
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

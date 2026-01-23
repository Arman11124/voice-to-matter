import { useState, useCallback, useEffect } from 'react';
import type { SavedModel } from './useSavedModels';

// API base URL from environment variable
const API_BASE = import.meta.env.VITE_API_URL || '';
const PIN_STORAGE_KEY = 'voice-to-matter-pin';

interface UseCloudSyncReturn {
    pin: string | null;
    isLoading: boolean;
    error: string | null;
    setPin: (pin: string) => void;
    clearPin: () => void;
    syncToCloud: (models: SavedModel[], pinOverride?: string) => Promise<boolean>;
    loadFromCloud: (pinOverride?: string) => Promise<SavedModel[] | null>;
    checkPinExists: (pin: string) => Promise<boolean>;
}

export function useCloudSync(): UseCloudSyncReturn {
    const [pin, setStoredPin] = useState<string | null>(() => {
        return localStorage.getItem(PIN_STORAGE_KEY);
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Save PIN to localStorage when it changes
    useEffect(() => {
        if (pin) {
            localStorage.setItem(PIN_STORAGE_KEY, pin);
        }
    }, [pin]);

    const setPin = useCallback((newPin: string) => {
        if (!/^\d{4,6}$/.test(newPin)) {
            setError('PIN должен быть 4-6 цифр');
            return;
        }
        setStoredPin(newPin);
        setError(null);
    }, []);

    const clearPin = useCallback(() => {
        localStorage.removeItem(PIN_STORAGE_KEY);
        setStoredPin(null);
    }, []);

    const checkPinExists = useCallback(async (checkPin: string): Promise<boolean> => {
        try {
            const response = await fetch(`${API_BASE}/api/sync/${checkPin}`, {
                method: 'HEAD'
            });
            return response.status === 200;
        } catch {
            return false;
        }
    }, []);

    const syncToCloud = useCallback(async (models: SavedModel[], pinOverride?: string): Promise<boolean> => {
        const activePin = pinOverride || pin;
        if (!activePin) {
            setError('PIN не установлен');
            return false;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/api/sync/${activePin}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ models })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Sync failed');
            }

            console.log('☁️ Synced to cloud:', data.count, 'models');
            return true;

        } catch (e) {
            const message = e instanceof Error ? e.message : 'Sync failed';
            setError(message);
            console.error('Cloud sync error:', e);
            return false;

        } finally {
            setIsLoading(false);
        }
    }, [pin]);

    const loadFromCloud = useCallback(async (pinOverride?: string): Promise<SavedModel[] | null> => {
        const activePin = pinOverride || pin;
        if (!activePin) {
            setError('PIN не установлен');
            return null;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/api/sync/${activePin}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Load failed');
            }

            console.log('☁️ Loaded from cloud:', data.models?.length || 0, 'models');

            // Return models as-is (legacy URL fix removed - no longer needed)
            return data.models || [];

        } catch (e) {
            const message = e instanceof Error ? e.message : 'Load failed';
            setError(message);
            console.error('Cloud load error:', e);
            return null;

        } finally {
            setIsLoading(false);
        }
    }, [pin]);

    return {
        pin,
        isLoading,
        error,
        setPin,
        clearPin,
        syncToCloud,
        loadFromCloud,
        checkPinExists
    };
}

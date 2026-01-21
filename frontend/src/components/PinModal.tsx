import { useState } from 'react';
import './PinModal.css';

interface PinModalProps {
    isOpen: boolean;
    currentPin: string | null;
    onSetPin: (pin: string) => void;
    onClearPin: () => void;
    onClose: () => void;
    onSync: () => void;
    onRestore: () => void;
    isLoading: boolean;
    error: string | null;
}

export function PinModal({
    isOpen,
    currentPin,
    onSetPin,
    onClearPin,
    onClose,
    onSync,
    onRestore,
    isLoading,
    error
}: PinModalProps) {
    const [inputPin, setInputPin] = useState('');
    const [mode, setMode] = useState<'set' | 'restore'>('set');

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (inputPin.length >= 4 && inputPin.length <= 6) {
            if (mode === 'set') {
                onSetPin(inputPin);
                onSync();
            } else {
                onSetPin(inputPin);
                onRestore();
            }
            setInputPin('');
        }
    };

    return (
        <div className="pin-modal-overlay" onClick={onClose}>
            <div className="pin-modal" onClick={e => e.stopPropagation()}>
                <button className="pin-close" onClick={onClose}>✕</button>

                <h2>☁️ Облачная синхронизация</h2>

                {currentPin ? (
                    <div className="pin-current">
                        <p>Ваш PIN-код:</p>
                        <div className="pin-display">{currentPin}</div>
                        <p className="pin-hint">Запомни этот код для восстановления на других устройствах!</p>

                        <div className="pin-actions">
                            <button
                                className="pin-btn sync-btn"
                                onClick={onSync}
                                disabled={isLoading}
                            >
                                {isLoading ? '⏳' : '☁️'} Синхронизировать
                            </button>
                            <button
                                className="pin-btn clear-btn"
                                onClick={onClearPin}
                            >
                                🗑️ Сбросить PIN
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="pin-setup">
                        <div className="pin-tabs">
                            <button
                                className={`tab ${mode === 'set' ? 'active' : ''}`}
                                onClick={() => setMode('set')}
                            >
                                🆕 Новый PIN
                            </button>
                            <button
                                className={`tab ${mode === 'restore' ? 'active' : ''}`}
                                onClick={() => setMode('restore')}
                            >
                                📥 Восстановить
                            </button>
                        </div>

                        <p className="pin-description">
                            {mode === 'set'
                                ? 'Придумай 4-6 цифр для синхронизации моделей'
                                : 'Введи PIN для загрузки сохранённых моделей'
                            }
                        </p>

                        <input
                            type="tel"
                            className="pin-input"
                            placeholder="1234"
                            value={inputPin}
                            onChange={e => setInputPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            maxLength={6}
                            autoFocus
                        />

                        <button
                            className="pin-btn submit-btn"
                            onClick={handleSubmit}
                            disabled={inputPin.length < 4 || isLoading}
                        >
                            {isLoading ? '⏳ Загрузка...' : mode === 'set' ? '✓ Создать' : '📥 Загрузить'}
                        </button>
                    </div>
                )}

                {error && <div className="pin-error">{error}</div>}
            </div>
        </div>
    );
}

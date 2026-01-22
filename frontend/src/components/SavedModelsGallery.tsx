import { useState } from 'react';
import type { SavedModel } from '../hooks/useSavedModels';
import './SavedModelsGallery.css';

interface SavedModelsGalleryProps {
    models: SavedModel[];
    onSelect: (model: SavedModel) => void;
    onDelete: (id: string) => void;
    onRename: (id: string, newName: string) => void;
}

export function SavedModelsGallery({ models, onSelect, onDelete, onRename }: SavedModelsGalleryProps) {
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    if (models.length === 0) {
        return null;
    }

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short'
        });
    };

    const handleRename = (model: SavedModel) => {
        const newName = window.prompt('Новое название:', model.prompt);
        if (newName && newName.trim() && newName !== model.prompt) {
            onRename(model.id, newName.trim());
        }
    };

    const handleDeleteClick = (modelId: string) => {
        if (pendingDeleteId === modelId) {
            // Second click - confirm delete
            onDelete(modelId);
            setPendingDeleteId(null);
        } else {
            // First click - show confirmation
            setPendingDeleteId(modelId);
            // Auto-reset after 3 seconds
            setTimeout(() => {
                setPendingDeleteId((current) => current === modelId ? null : current);
            }, 3000);
        }
    };

    return (
        <div className="saved-gallery">
            <h3 className="gallery-title">📁 Сохранённые модели</h3>
            <div className="gallery-scroll">
                {models.map(model => (
                    <div key={model.id} className="saved-card">
                        <div className="card-preview" onClick={() => onSelect(model)}>
                            {model.thumbnail ? (
                                <img src={model.thumbnail} alt={model.prompt} />
                            ) : (
                                <span className="placeholder-icon">🎨</span>
                            )}
                        </div>
                        <div className="card-info">
                            <span className="card-prompt">{model.prompt}</span>
                            <span className="card-date">{formatDate(model.createdAt)}</span>
                        </div>
                        <div className="card-actions">
                            <button
                                className="action-btn rename-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRename(model);
                                }}
                                title="Переименовать"
                            >
                                ✏️
                            </button>
                            <button
                                className="action-btn print-btn"
                                onClick={() => onSelect(model)}
                                title="Открыть для печати"
                            >
                                🖨️
                            </button>
                            <button
                                className={`action-btn delete-btn ${pendingDeleteId === model.id ? 'confirm-delete' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(model.id);
                                }}
                                title={pendingDeleteId === model.id ? "Нажми ещё раз для удаления!" : "Удалить"}
                            >
                                {pendingDeleteId === model.id ? '✓ Удалить?' : '✕'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

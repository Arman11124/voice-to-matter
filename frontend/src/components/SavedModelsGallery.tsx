import type { SavedModel } from '../hooks/useSavedModels';
import './SavedModelsGallery.css';

interface SavedModelsGalleryProps {
    models: SavedModel[];
    onSelect: (model: SavedModel) => void;
    onDelete: (id: string) => void;
}

export function SavedModelsGallery({ models, onSelect, onDelete }: SavedModelsGalleryProps) {
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
                                className="action-btn print-btn"
                                onClick={() => onSelect(model)}
                                title="Открыть для печати"
                            >
                                🖨️
                            </button>
                            <button
                                className="action-btn delete-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm('Точно удалить эту модель?')) {
                                        onDelete(model.id);
                                    }
                                }}
                                title="Удалить"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

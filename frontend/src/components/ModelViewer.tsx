import '@google/model-viewer';
import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import './ModelViewer.css';

interface ModelViewerProps {
    modelUrl: string | null;
    isLoading?: boolean;
}

export const ModelViewer = forwardRef<HTMLElement | null, ModelViewerProps>(
    ({ modelUrl, isLoading = false }, ref) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const viewerRef = useRef<HTMLElement | null>(null);

        // Expose the model-viewer element to parent via ref
        useImperativeHandle(ref, () => viewerRef.current, [modelUrl]);

        useEffect(() => {
            if (!containerRef.current || !modelUrl) return;

            // Clear previous content
            containerRef.current.innerHTML = '';

            // Create model-viewer element
            const viewer = document.createElement('model-viewer');
            viewer.setAttribute('src', modelUrl);
            viewer.setAttribute('alt', '3D модель');
            viewer.setAttribute('auto-rotate', '');
            viewer.setAttribute('camera-controls', '');
            viewer.setAttribute('shadow-intensity', '1');
            viewer.setAttribute('loading', 'eager');
            viewer.style.width = '100%';
            viewer.style.height = '100%';

            containerRef.current.appendChild(viewer);
            viewerRef.current = viewer;

            return () => {
                if (containerRef.current) {
                    containerRef.current.innerHTML = '';
                }
                viewerRef.current = null;
            };
        }, [modelUrl]);

        if (isLoading) {
            return (
                <div className="model-viewer-container loading">
                    <div className="loading-spinner">
                        <span className="spinner-icon">🎨</span>
                        <span className="spinner-text">Создаём 3D модель...</span>
                    </div>
                </div>
            );
        }

        if (!modelUrl) {
            return (
                <div className="model-viewer-container empty">
                    <span className="empty-icon">🖼️</span>
                    <span className="empty-text">Здесь появится твоя модель</span>
                </div>
            );
        }

        return (
            <div className="model-viewer-container">
                <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
            </div>
        );
    }
);

ModelViewer.displayName = 'ModelViewer';


import { useTranslation } from 'react-i18next';
import './PrinterPanel.css';

type PrinterStatus = 'disconnected' | 'connecting' | 'connected' | 'printing' | 'error';

interface PrinterPanelProps {
    status: PrinterStatus;
    progress: number;
    error: string | null;
    isSupported: boolean;
    onConnect: () => void;
    onDisconnect: () => void;
    onPrint: () => void;
    canPrint: boolean;
    hideUnsupportedError?: boolean;
}

export function PrinterPanel({
    status,
    progress,
    error,
    isSupported,
    onConnect,
    onDisconnect,
    onPrint,
    canPrint,
    hideUnsupportedError = false
}: PrinterPanelProps) {
    const { t } = useTranslation();

    const getStatusIcon = () => {
        switch (status) {
            case 'connected': return '✅';
            case 'connecting': return '🔄';
            case 'printing': return '🖨️';
            case 'error': return '❌';
            default: return '🔌';
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'connected': return t('printer.connected');
            case 'connecting': return t('printer.connecting');
            case 'printing': return `${t('voice.printing')} ${progress}%`;
            case 'error': return error || 'Error';
            default: return t('printer.notConnected');
        }
    };

    if (!isSupported) {
        if (hideUnsupportedError) return null;

        return (
            <div className="printer-panel not-supported">
                <span className="status-icon">⚠️</span>
                <span className="status-text">
                    Используй Chrome или Edge для подключения принтера
                </span>
            </div>
        );
    }

    return (
        <div className={`printer-panel ${status}`}>
            <div className="printer-status">
                <span className="status-icon">{getStatusIcon()}</span>
                <span className="status-text">{getStatusText()}</span>
            </div>

            {status === 'printing' && (
                <div className="progress-bar">
                    <div
                        className="progress-fill"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            <div className="printer-actions">
                {status === 'disconnected' && (
                    <button className="btn-connect" onClick={onConnect}>
                        {t('buttons.connect')}
                    </button>
                )}

                {status === 'connected' && (
                    <>
                        <button
                            className="btn-print"
                            onClick={onPrint}
                            disabled={!canPrint}
                        >
                            {t('buttons.print')}
                        </button>
                        <button className="btn-disconnect" onClick={onDisconnect}>
                            {t('buttons.disconnect')}
                        </button>
                    </>
                )}

                {status === 'error' && (
                    <button className="btn-connect" onClick={onConnect}>
                        Попробовать снова
                    </button>
                )}
            </div>
        </div>
    );
}

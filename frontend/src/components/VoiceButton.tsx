import { useTranslation } from 'react-i18next';
import './VoiceButton.css';

interface VoiceButtonProps {
    state: 'idle' | 'listening' | 'processing' | 'error';
    transcript: string;
    onPress: () => void;
    onRelease: () => void;
    disabled?: boolean;
}

export function VoiceButton({
    state,
    transcript,
    onPress,
    onRelease,
    disabled = false
}: VoiceButtonProps) {
    const { t } = useTranslation();

    const getButtonText = () => {
        switch (state) {
            case 'listening':
                return transcript || t('voice.listening');
            case 'processing':
                return t('voice.processing');
            default:
                return t('buttons.speak');
        }
    };

    const getButtonClass = () => {
        let className = 'voice-button';
        if (state === 'listening') className += ' listening';
        if (state === 'processing') className += ' processing';
        if (state === 'error') className += ' error';
        if (disabled) className += ' disabled';
        return className;
    };

    return (
        <div className="voice-button-container">
            <button
                className={getButtonClass()}
                onMouseDown={!disabled ? onPress : undefined}
                onMouseUp={!disabled ? onRelease : undefined}
                onTouchStart={!disabled ? onPress : undefined}
                onTouchEnd={!disabled ? onRelease : undefined}
                disabled={disabled || state === 'processing'}
                aria-label={t('buttons.speak')}
            >
                <span className="button-icon">
                    {state === 'listening' ? '🎤' : state === 'processing' ? '⏳' : '🎙️'}
                </span>
                <span className="button-text">{getButtonText()}</span>
            </button>

            {state === 'idle' && (
                <p className="voice-hint">{t('voice.idle')}</p>
            )}
        </div>
    );
}

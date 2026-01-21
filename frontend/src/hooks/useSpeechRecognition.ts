import { useState, useCallback, useRef, useEffect } from 'react';

export type RecognitionState = 'idle' | 'listening' | 'processing' | 'error';

interface UseSpeechRecognitionReturn {
    state: RecognitionState;
    transcript: string;
    error: string | null;
    isSupported: boolean;
    startListening: () => void;
    stopListening: () => void;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
    const [state, setState] = useState<RecognitionState>('idle');
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);

    const recognitionRef = useRef<SpeechRecognition | null>(null);

    // Check browser support
    const isSupported = typeof window !== 'undefined' &&
        ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

    useEffect(() => {
        if (!isSupported) return;

        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        const recognition = new SpeechRecognition();

        // Configure for child-friendly single-phrase capture
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        // Auto-detect language (Russian or English)
        recognition.lang = navigator.language.startsWith('ru') ? 'ru-RU' : 'en-US';

        recognition.onstart = () => {
            setState('listening');
            setError(null);
            console.log('🎤 Speech recognition started');
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            const results = event.results;
            const lastResult = results[results.length - 1];
            const transcriptText = lastResult[0].transcript;

            setTranscript(transcriptText);

            if (lastResult.isFinal) {
                setState('processing');
                console.log('📝 Final transcript:', transcriptText);
            }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error:', event.error);
            setState('error');

            switch (event.error) {
                case 'no-speech':
                    setError('Я не услышал. Попробуй ещё раз!');
                    break;
                case 'audio-capture':
                    setError('Микрофон не работает. Проверь подключение!');
                    break;
                case 'not-allowed':
                    setError('Разреши использовать микрофон!');
                    break;
                default:
                    setError('Что-то пошло не так. Попробуй ещё раз!');
            }
        };

        recognition.onend = () => {
            if (state === 'listening') {
                setState('idle');
            }
            console.log('🎤 Speech recognition ended');
        };

        recognitionRef.current = recognition;

        return () => {
            recognition.abort();
        };
    }, [isSupported]);

    const startListening = useCallback(() => {
        if (!recognitionRef.current) return;

        setTranscript('');
        setError(null);

        try {
            recognitionRef.current.start();
        } catch (e) {
            console.error('Failed to start recognition:', e);
        }
    }, []);

    const stopListening = useCallback(() => {
        if (!recognitionRef.current) return;
        recognitionRef.current.stop();
    }, []);

    return {
        state,
        transcript,
        error,
        isSupported,
        startListening,
        stopListening
    };
}

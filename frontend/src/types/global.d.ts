/// <reference types="vite/client" />

export { }; // Make this file a module

declare global {
    // Web Speech API Types
    interface SpeechRecognition extends EventTarget {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        maxAlternatives: number;

        start(): void;
        stop(): void;
        abort(): void;

        onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
        onend: ((this: SpeechRecognition, ev: Event) => void) | null;
        onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
        onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
    }

    interface SpeechRecognitionEvent extends Event {
        readonly resultIndex: number;
        readonly results: SpeechRecognitionResultList;
    }

    interface SpeechRecognitionErrorEvent extends Event {
        readonly error: 'no-speech' | 'audio-capture' | 'not-allowed' | 'aborted' | 'network' | 'bad-grammar' | 'language-not-supported';
        readonly message: string;
    }

    interface SpeechRecognitionResultList {
        readonly length: number;
        item(index: number): SpeechRecognitionResult;
        [index: number]: SpeechRecognitionResult;
    }

    interface SpeechRecognitionResult {
        readonly length: number;
        readonly isFinal: boolean;
        item(index: number): SpeechRecognitionAlternative;
        [index: number]: SpeechRecognitionAlternative;
    }

    interface SpeechRecognitionAlternative {
        readonly transcript: string;
        readonly confidence: number;
    }

    interface Window {
        webkitSpeechRecognition: new () => SpeechRecognition;
        SpeechRecognition: new () => SpeechRecognition;
    }

    // Web Serial API Types
    interface SerialPort {
        readonly readable: ReadableStream<Uint8Array> | null;
        readonly writable: WritableStream<Uint8Array> | null;

        open(options: SerialOptions): Promise<void>;
        close(): Promise<void>;
        getInfo(): SerialPortInfo;
    }

    interface SerialOptions {
        baudRate: number;
        dataBits?: 7 | 8;
        stopBits?: 1 | 2;
        parity?: 'none' | 'even' | 'odd';
        bufferSize?: number;
        flowControl?: 'none' | 'hardware';
    }

    interface SerialPortInfo {
        usbVendorId?: number;
        usbProductId?: number;
    }

    interface Serial {
        requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
        getPorts(): Promise<SerialPort[]>;
    }

    interface SerialPortRequestOptions {
        filters?: SerialPortFilter[];
    }

    interface SerialPortFilter {
        usbVendorId?: number;
        usbProductId?: number;
    }

    interface Navigator {
        readonly serial: Serial;
    }

    // Model Viewer Web Component
    namespace JSX {
        interface IntrinsicElements {
            'model-viewer': React.DetailedHTMLProps<
                React.HTMLAttributes<HTMLElement> & {
                    src?: string;
                    alt?: string;
                    'auto-rotate'?: boolean;
                    'camera-controls'?: boolean;
                    'shadow-intensity'?: string;
                    'environment-image'?: string;
                    ar?: boolean;
                    loading?: 'auto' | 'lazy' | 'eager';
                    poster?: string;
                },
                HTMLElement
            >;
        }
    }
}

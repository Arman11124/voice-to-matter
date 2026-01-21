import { useState, useCallback, useRef } from 'react';

export type PrinterStatus = 'disconnected' | 'connecting' | 'connected' | 'printing' | 'error';

interface UseWebSerialReturn {
    status: PrinterStatus;
    progress: number;
    error: string | null;
    isSupported: boolean;
    connect: (baudRate?: number) => Promise<void>;
    disconnect: () => Promise<void>;
    print: (gcode: string) => Promise<void>;
}

export function useWebSerial(): UseWebSerialReturn {
    const [status, setStatus] = useState<PrinterStatus>('disconnected');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const portRef = useRef<SerialPort | null>(null);
    const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
    const writerRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(null);

    // Check browser support
    const isSupported = typeof navigator !== 'undefined' && 'serial' in navigator;

    const connect = useCallback(async (baudRate = 115200) => {
        if (!isSupported) {
            setError('Web Serial не поддерживается. Используй Chrome или Edge!');
            return;
        }

        try {
            setStatus('connecting');
            setError(null);

            // Request port (browser will show selection dialog)
            const port = await navigator.serial.requestPort();

            // Open connection
            await port.open({ baudRate });

            portRef.current = port;

            // Setup reader
            if (port.readable) {
                readerRef.current = port.readable.getReader();
            }

            // Setup writer
            if (port.writable) {
                writerRef.current = port.writable.getWriter();
            }

            setStatus('connected');
            console.log('🔌 Printer connected at', baudRate, 'baud');

        } catch (e) {
            console.error('Connection error:', e);
            setStatus('error');

            if (e instanceof Error) {
                if (e.name === 'NotFoundError') {
                    setError('Принтер не выбран');
                } else {
                    setError(`Ошибка подключения: ${e.message}`);
                }
            }
        }
    }, [isSupported]);

    const disconnect = useCallback(async () => {
        try {
            if (readerRef.current) {
                await readerRef.current.cancel();
                readerRef.current.releaseLock();
                readerRef.current = null;
            }

            if (writerRef.current) {
                await writerRef.current.close();
                writerRef.current = null;
            }

            if (portRef.current) {
                await portRef.current.close();
                portRef.current = null;
            }

            setStatus('disconnected');
            console.log('🔌 Printer disconnected');

        } catch (e) {
            console.error('Disconnect error:', e);
        }
    }, []);

    // Wait for "ok" response from printer (Ping-Pong protocol)
    const waitForOk = useCallback(async (timeoutMs = 30000): Promise<boolean> => {
        if (!readerRef.current) return false;

        const decoder = new TextDecoder();
        let buffer = '';
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
            try {
                const { value, done } = await readerRef.current.read();

                if (done) break;

                if (value) {
                    buffer += decoder.decode(value, { stream: true });

                    // Check for "ok" response
                    if (buffer.includes('ok')) {
                        return true;
                    }

                    // Check for error
                    if (buffer.toLowerCase().includes('error')) {
                        console.warn('Printer error:', buffer);
                        return false;
                    }
                }
            } catch (e) {
                console.error('Read error:', e);
                return false;
            }
        }

        return false;
    }, []);

    const print = useCallback(async (gcode: string) => {
        if (!writerRef.current) {
            setError('Принтер не подключён!');
            return;
        }

        const encoder = new TextEncoder();
        const lines = gcode.split('\n').filter(line => {
            const trimmed = line.trim();
            // Skip empty lines and comments
            return trimmed.length > 0 && !trimmed.startsWith(';');
        });

        setStatus('printing');
        setProgress(0);

        console.log(`🖨️ Starting print: ${lines.length} commands`);

        try {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                // Send command with newline
                await writerRef.current.write(encoder.encode(line + '\n'));

                // Wait for acknowledgment (Ping-Pong)
                const ok = await waitForOk();

                if (!ok) {
                    console.warn(`No OK for line ${i}: ${line}`);
                    // Continue anyway - some printers are slow to respond
                }

                // Update progress
                const newProgress = Math.round(((i + 1) / lines.length) * 100);
                if (newProgress !== progress) {
                    setProgress(newProgress);
                }

                // Log every 100 lines
                if (i % 100 === 0) {
                    console.log(`📤 Progress: ${newProgress}% (${i}/${lines.length})`);
                }
            }

            setStatus('connected');
            setProgress(100);
            console.log('✅ Print complete!');

        } catch (e) {
            console.error('Print error:', e);
            setStatus('error');
            setError(e instanceof Error ? e.message : 'Ошибка печати');
        }
    }, [waitForOk, progress]);

    return {
        status,
        progress,
        error,
        isSupported,
        connect,
        disconnect,
        print
    };
}

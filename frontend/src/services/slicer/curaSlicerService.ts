/**
 * Professional Slicer Service using CuraEngine Backend
 * Sends GLB model to backend for slicing with Kobra 2 Pro profile
 */
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://spotlight-interior-medical-carey.trycloudflare.com';

/**
 * Convert GLB URL to STL ArrayBuffer
 */
async function glbToStl(glbUrl: string): Promise<ArrayBuffer> {
    const loader = new GLTFLoader();
    const gltf = await new Promise<any>((resolve, reject) => {
        loader.load(glbUrl, resolve, undefined, reject);
    });

    // Update world matrices
    gltf.scene.updateMatrixWorld(true);

    // Export to STL (binary format)
    const exporter = new STLExporter();
    const stlResult = exporter.parse(gltf.scene, { binary: true });

    // STLExporter with binary:true returns DataView, extract the ArrayBuffer
    if (stlResult instanceof DataView) {
        return stlResult.buffer;
    }
    // Fallback for non-binary (string)
    const encoder = new TextEncoder();
    return encoder.encode(stlResult as string).buffer;
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export interface SliceResult {
    gcode: string;
    stats: {
        layers: number;
        timeMs: number;
        filename: string;
    };
}

/**
 * Slice GLB model using CuraEngine backend
 * @param modelUrl URL to GLB model
 * @param filename Model name for the output file
 * @param onProgress Progress callback (0-100)
 */
export async function sliceWithCura(
    modelUrl: string,
    filename: string,
    onProgress?: (percent: number) => void
): Promise<SliceResult> {
    try {
        onProgress?.(5);
        console.log('🔄 Converting GLB to STL...');

        // Step 1: Convert GLB to STL
        const stlBuffer = await glbToStl(modelUrl);
        const stlBase64 = arrayBufferToBase64(stlBuffer);
        onProgress?.(30);
        console.log(`📦 STL size: ${(stlBuffer.byteLength / 1024).toFixed(1)} KB`);

        // Step 2: Send to CuraEngine backend
        console.log('🚀 Sending to CuraEngine backend...');
        onProgress?.(40);

        const response = await fetch(`${BACKEND_URL}/api/slice`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                stlData: stlBase64,
                filename: filename
            })
        });

        onProgress?.(80);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.details || error.error || 'Slicing failed');
        }

        const result = await response.json();
        onProgress?.(100);

        console.log(`✅ Slicing complete: ${result.stats.layers} layers`);
        return result;

    } catch (error) {
        console.error('❌ CuraEngine slicing failed:', error);
        throw error;
    }
}

/**
 * Check if CuraEngine backend is available
 */
export async function checkSlicerStatus(): Promise<boolean> {
    try {
        const response = await fetch(`${BACKEND_URL}/api/slice/status`);
        if (response.ok) {
            const status = await response.json();
            console.log('🔪 Slicer status:', status);
            return status.status === 'ready';
        }
        return false;
    } catch {
        console.warn('CuraEngine backend not available');
        return false;
    }
}

/**
 * Kiri:Moto Browser Slicer Service
 * Uses Kiri:Moto Engine API for in-browser G-code generation
 * No server required - runs entirely in browser via WebWorker
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Kobra 2 Pro device settings for Kiri:Moto
const KOBRA_2_PRO_DEVICE = {
    bedWidth: 220,
    bedDepth: 220,
    maxHeight: 250,
    nozzleSize: 0.4,
    filamentSize: 1.75,
    deviceZMax: 250,
    originCenter: false,
    gcodePre: [
        'G28 ; Home all axes',
        'M104 S200 ; Set nozzle temp',
        'M140 S60 ; Set bed temp',
        'M109 S200 ; Wait for nozzle',
        'M190 S60 ; Wait for bed',
        'G92 E0 ; Reset extruder'
    ].join('\n'),
    gcodePost: [
        'G91 ; Relative positioning',
        'G1 E-2 F2700 ; Retract',
        'G1 Z10 F3000 ; Raise Z',
        'G90 ; Absolute positioning',
        'G1 X0 Y220 F5000 ; Move to front',
        'M104 S0 ; Turn off hotend',
        'M140 S0 ; Turn off bed',
        'M84 ; Disable motors'
    ].join('\n')
};

// Kinder Surprise process settings (hollow with thick walls)
const KINDER_PROCESS = {
    sliceHeight: 0.2,          // Layer height
    sliceShells: 3,            // Wall line count
    sliceTopLayers: 3,         // Top layers
    sliceBottomLayers: 3,      // Bottom layers
    sliceFillSparse: 0,        // 0% infill (hollow)
    sliceSupportEnable: true,  // Auto supports
    sliceSupportDensity: 0.15, // Support density
    firstSliceHeight: 0.3,     // First layer height
    outputFeedrate: 60,        // Print speed mm/s
    outputSeekrate: 100,       // Travel speed mm/s
    outputTemp: 200,           // Nozzle temp
    outputBedTemp: 60,         // Bed temp
    outputRetractDist: 5,      // Retraction distance
    outputRetractSpeed: 45,    // Retraction speed
};

// Global type for Kiri:Moto engine
declare global {
    interface Window {
        kiri?: {
            newEngine: () => KiriEngine;
        };
    }
}

interface KiriEngine {
    setListener: (fn: (event: KiriEvent) => void) => KiriEngine;
    setDevice: (device: object) => KiriEngine;
    setProcess: (process: object) => KiriEngine;
    setMode: (mode: string) => KiriEngine;
    load: (url: string) => Promise<KiriEngine>;
    parse: (data: ArrayBuffer) => Promise<KiriEngine>;
    slice: () => Promise<KiriEngine>;
    prepare: () => Promise<KiriEngine>;
    export: () => Promise<string>;
    clear: () => void;
}

interface KiriEvent {
    loaded?: { vertices: number };
    parsed?: { vertices: number };
    slice?: string;
    prepare?: { update?: number; done?: boolean };
    export?: { segment?: string; done?: string };
}

export interface SliceResult {
    gcode: string;
    stats: {
        layers: number;
        timeMs: number;
    };
}

/**
 * Convert GLB model URL to STL ArrayBuffer
 * Properly handles complex scenes by merging all meshes
 */
async function glbToStl(glbUrl: string): Promise<ArrayBuffer> {
    const loader = new GLTFLoader();
    const gltf = await new Promise<any>((resolve, reject) => {
        loader.load(glbUrl, resolve, undefined, reject);
    });

    // Update world matrices for proper transforms
    gltf.scene.updateMatrixWorld(true);

    // Collect all geometries with applied transforms
    const geometries: THREE.BufferGeometry[] = [];

    gltf.scene.traverse((child: THREE.Object3D) => {
        if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const geometry = mesh.geometry.clone();

            // Apply world transform to geometry
            geometry.applyMatrix4(mesh.matrixWorld);

            geometries.push(geometry);
        }
    });

    if (geometries.length === 0) {
        throw new Error('No meshes found in model');
    }

    console.log(`📐 Found ${geometries.length} meshes, merging...`);

    // Merge all geometries into one
    const mergedGeometry = mergeGeometries(geometries, false);

    if (!mergedGeometry) {
        throw new Error('Failed to merge geometries');
    }

    // Center the geometry on XY and place on Z=0
    mergedGeometry.computeBoundingBox();
    const bbox = mergedGeometry.boundingBox!;
    const center = new THREE.Vector3();
    bbox.getCenter(center);

    // Move to center of bed and bottom at Z=0
    mergedGeometry.translate(-center.x, -center.y, -bbox.min.z);

    // Scale if too big for bed (220x220x250)
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 200) {
        const scale = 200 / maxDim;
        mergedGeometry.scale(scale, scale, scale);
        console.log(`📏 Scaled model by ${(scale * 100).toFixed(0)}% to fit bed`);
    }

    // Create a temporary mesh for STL export
    const tempMesh = new THREE.Mesh(mergedGeometry);

    const exporter = new STLExporter();
    const stlResult = exporter.parse(tempMesh, { binary: true });

    // Cleanup
    mergedGeometry.dispose();
    geometries.forEach(g => g.dispose());

    if (stlResult instanceof DataView) {
        return stlResult.buffer;
    }

    const encoder = new TextEncoder();
    return encoder.encode(stlResult as string).buffer;
}

/**
 * Check if Kiri:Moto engine is available
 */
export function isKiriAvailable(): boolean {
    return typeof window !== 'undefined' && window.kiri !== undefined;
}

/**
 * Wait for Kiri:Moto to become available (with timeout)
 */
async function waitForKiri(timeoutMs: number = 5000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
        if (isKiriAvailable()) {
            console.log('✅ Kiri:Moto engine ready');
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.warn('⚠️ Kiri:Moto not loaded after timeout');
    return false;
}

/**
 * Slice GLB model using Kiri:Moto browser engine
 */
export async function sliceWithKiri(
    modelUrl: string,
    _filename: string,
    onProgress?: (percent: number) => void
): Promise<SliceResult> {
    // Wait for Kiri:Moto to load (up to 5 seconds)
    const kiriReady = await waitForKiri(5000);

    if (!kiriReady) {
        throw new Error('Kiri:Moto engine not loaded');
    }

    const startTime = Date.now();
    onProgress?.(5);

    // Convert GLB to STL with proper geometry handling
    console.log('🔄 Converting GLB to STL for Kiri:Moto...');
    const stlBuffer = await glbToStl(modelUrl);
    console.log(`📦 STL size: ${(stlBuffer.byteLength / 1024).toFixed(1)} KB`);
    onProgress?.(15);

    // Create Kiri engine instance
    const kiri = window.kiri!.newEngine();

    return new Promise((resolve, reject) => {
        let gcode = '';
        let lastProgress = 15;

        // Set up event listener for progress
        kiri.setListener((event: KiriEvent) => {
            if (event.parsed) {
                console.log(`📐 Parsed ${event.parsed.vertices} vertices`);
                onProgress?.(20);
                lastProgress = 20;
            }
            if (event.slice) {
                console.log(`🔪 Slicing: ${event.slice}`);
                const progress = Math.min(lastProgress + 5, 50);
                onProgress?.(progress);
                lastProgress = progress;
            }
            if (event.prepare?.update !== undefined) {
                const progress = 50 + Math.floor(event.prepare.update * 30);
                onProgress?.(progress);
                lastProgress = progress;
            }
            if (event.prepare?.done) {
                console.log('✅ Preparation complete');
                onProgress?.(80);
                lastProgress = 80;
            }
            if (event.export?.segment) {
                gcode += event.export.segment;
            }
            if (event.export?.done) {
                gcode = event.export.done;
                console.log('✅ G-code export complete');
                onProgress?.(95);
            }
        });

        // Configure and run slicer
        kiri
            .setMode('FDM')
            .setDevice(KOBRA_2_PRO_DEVICE)
            .setProcess(KINDER_PROCESS)
            .parse(stlBuffer)
            .then(() => {
                console.log('🔪 Starting Kiri:Moto slice...');
                return kiri.slice();
            })
            .then(() => {
                console.log('🛠️ Preparing toolpath...');
                return kiri.prepare();
            })
            .then(() => {
                console.log('📝 Exporting G-code...');
                return kiri.export();
            })
            .then((exportedGcode: string) => {
                const endTime = Date.now();
                const layerCount = (exportedGcode.match(/;LAYER:/g) || []).length;

                console.log(`✅ Kiri:Moto complete: ${layerCount} layers in ${endTime - startTime}ms`);

                resolve({
                    gcode: exportedGcode,
                    stats: {
                        layers: layerCount,
                        timeMs: endTime - startTime
                    }
                });
            })
            .catch((error: Error) => {
                console.error('❌ Kiri:Moto error:', error);
                reject(error);
            });
    });
}

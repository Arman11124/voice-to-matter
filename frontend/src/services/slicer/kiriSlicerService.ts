/**
 * Smart Slicer Service
 * - Mobile: Share STL to slicing apps (Anycubic, Cura)
 * - Desktop: Download STL + open Kiri:Moto
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Detect if running on mobile device
 */
function isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Convert GLB model URL to STL Blob
 */
async function glbToStlBlob(glbUrl: string): Promise<Blob> {
    const loader = new GLTFLoader();
    const gltf = await new Promise<any>((resolve, reject) => {
        loader.load(glbUrl, resolve, undefined, reject);
    });

    gltf.scene.updateMatrixWorld(true);

    const geometries: THREE.BufferGeometry[] = [];

    gltf.scene.traverse((child: THREE.Object3D) => {
        if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const geometry = mesh.geometry.clone();
            geometry.applyMatrix4(mesh.matrixWorld);
            geometries.push(geometry);
        }
    });

    if (geometries.length === 0) {
        throw new Error('No meshes found in model');
    }

    console.log(`📐 Found ${geometries.length} meshes, merging...`);

    // Import mergeVertices for mesh cleanup
    const { mergeVertices } = await import('three/examples/jsm/utils/BufferGeometryUtils.js');

    let mergedGeometry = mergeGeometries(geometries, false);

    if (!mergedGeometry) {
        throw new Error('Failed to merge geometries');
    }

    // Mesh cleanup for better slicing compatibility
    console.log('🔧 Cleaning up mesh...');

    // 1. Merge duplicate vertices (fixes gaps in mesh)
    mergedGeometry = mergeVertices(mergedGeometry);

    // 2. Recompute normals (fixes inverted faces)
    mergedGeometry.computeVertexNormals();

    // 3. Remove skinning attributes that can cause issues
    mergedGeometry.deleteAttribute('skinIndex');
    mergedGeometry.deleteAttribute('skinWeight');

    console.log('✅ Mesh cleanup complete');

    // Center and place on Z=0
    mergedGeometry.computeBoundingBox();
    const bbox = mergedGeometry.boundingBox!;
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    mergedGeometry.translate(-center.x, -center.y, -bbox.min.z);

    // Kobra 2 Pro bed: 220 x 220 x 250 mm (20mm safety margin)
    const BED_X = 200; // mm
    const BED_Y = 200; // mm
    const BED_Z = 200; // mm

    // Scale if model exceeds bed limits
    mergedGeometry.computeBoundingBox();
    const newBbox = mergedGeometry.boundingBox!;
    const size = new THREE.Vector3();
    newBbox.getSize(size);

    const scaleX = size.x > BED_X ? BED_X / size.x : 1;
    const scaleY = size.y > BED_Y ? BED_Y / size.y : 1;
    const scaleZ = size.z > BED_Z ? BED_Z / size.z : 1;
    const scale = Math.min(scaleX, scaleY, scaleZ);

    if (scale < 1) {
        mergedGeometry.scale(scale, scale, scale);
        console.log(`📏 Scaled to ${(scale * 100).toFixed(0)}% to fit Kobra 2 Pro bed (${BED_X}x${BED_Y}x${BED_Z}mm)`);

        // Re-center on Z=0 after scaling (critical fix!)
        mergedGeometry.computeBoundingBox();
        const scaledBbox = mergedGeometry.boundingBox!;
        mergedGeometry.translate(0, 0, -scaledBbox.min.z);
        console.log(`📍 Re-centered on Z=0 after scaling`);
    } else {
        console.log(`✅ Model fits bed: ${size.x.toFixed(1)}x${size.y.toFixed(1)}x${size.z.toFixed(1)}mm`);
    }

    // Final verification - ensure nothing below Z=0
    mergedGeometry.computeBoundingBox();
    const finalBbox = mergedGeometry.boundingBox!;
    if (finalBbox.min.z < 0) {
        mergedGeometry.translate(0, 0, -finalBbox.min.z);
        console.log(`⚠️ Fixed negative Z: lifted by ${(-finalBbox.min.z).toFixed(2)}mm`);
    }

    const tempMesh = new THREE.Mesh(mergedGeometry);
    const exporter = new STLExporter();
    const stlResult = exporter.parse(tempMesh, { binary: true });

    mergedGeometry.dispose();
    geometries.forEach(g => g.dispose());

    if (stlResult instanceof DataView) {
        // Cast to any to handle three.js version mismatch with ArrayBuffer types
        return new Blob([stlResult.buffer as any], { type: 'model/stl' });
    }
    return new Blob([stlResult], { type: 'model/stl' });
}

/**
 * Download file to device
 */
function downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Share STL file on mobile via Web Share API
 */
async function shareStlFile(blob: Blob, filename: string): Promise<boolean> {
    const file = new File([blob], filename, { type: 'model/stl' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                files: [file],
                title: '3D Model for Printing',
                text: 'Open in Anycubic Slicer or Cura'
            });
            return true;
        } catch (e) {
            console.log('Share cancelled or failed:', e);
            return false;
        }
    }
    return false;
}

/**
 * Smart export - detects platform and uses best method
 */
export interface ExportResult {
    method: 'share' | 'download' | 'kiri';
    filename: string;
    instructions: string[];
    slicerUrl?: string;
}

export async function exportForSlicing(
    modelUrl: string,
    filename: string,
    onProgress?: (percent: number) => void
): Promise<ExportResult> {
    onProgress?.(10);

    console.log('🔄 Converting GLB to STL...');
    const stlBlob = await glbToStlBlob(modelUrl);
    const stlFilename = filename.replace(/\.[^/.]+$/, '') + '.stl';
    console.log(`📦 STL: ${(stlBlob.size / 1024).toFixed(1)} KB`);
    onProgress?.(60);

    const KIRI_URL = 'https://grid.space/kiri/#mode=FDM';

    if (isMobile()) {
        // Mobile: Try to share, fallback to download
        console.log('📱 Mobile detected - using Share API');
        const shared = await shareStlFile(stlBlob, stlFilename);

        if (shared) {
            console.log('✅ Shared to app!');
            onProgress?.(100);
            return {
                method: 'share',
                filename: stlFilename,
                instructions: [
                    '✅ Файл отправлен!',
                    '1️⃣ Выбери слайсер (Cura, PrusaSlicer)',
                    '2️⃣ Нарежь модель',
                    '3️⃣ Сохрани G-code на USB → Печатай!'
                ]
            };
        } else {
            // Fallback: download
            downloadFile(stlBlob, stlFilename);
            console.log('📥 Downloaded (share cancelled)');
            onProgress?.(100);
            return {
                method: 'download',
                filename: stlFilename,
                instructions: [
                    `📥 Скачан: ${stlFilename}`,
                    '1️⃣ Открой grid.space/kiri в браузере',
                    '2️⃣ Перетащи STL файл в слайсер',
                    '3️⃣ Нажми Slice → Export G-code',
                    '4️⃣ Сохрани на USB → Печатай!'
                ],
                slicerUrl: KIRI_URL
            };
        }
    } else {
        // Desktop: Download + open Kiri:Moto
        console.log('💻 Desktop detected - downloading + opening Kiri:Moto');
        downloadFile(stlBlob, stlFilename);
        onProgress?.(80);

        // Open Kiri:Moto in new tab
        window.open(KIRI_URL, '_blank');
        console.log('🌐 Opened Kiri:Moto - drag your STL file to slice!');
        onProgress?.(100);

        return {
            method: 'kiri',
            filename: stlFilename,
            instructions: [
                `📥 Скачан: ${stlFilename}`,
                '1️⃣ Перетащи файл в Kiri:Moto (открылся в новой вкладке)',
                '2️⃣ Нажми Slice → Export',
                '3️⃣ Сохрани G-code на USB → Печатай!'
            ],
            slicerUrl: KIRI_URL
        };
    }
}

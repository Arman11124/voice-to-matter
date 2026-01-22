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

    const mergedGeometry = mergeGeometries(geometries, false);

    if (!mergedGeometry) {
        throw new Error('Failed to merge geometries');
    }

    // Center and place on Z=0
    mergedGeometry.computeBoundingBox();
    const bbox = mergedGeometry.boundingBox!;
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    mergedGeometry.translate(-center.x, -center.y, -bbox.min.z);

    // Scale if too big
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 200) {
        const scale = 200 / maxDim;
        mergedGeometry.scale(scale, scale, scale);
        console.log(`📏 Scaled to ${(scale * 100).toFixed(0)}%`);
    }

    const tempMesh = new THREE.Mesh(mergedGeometry);
    const exporter = new STLExporter();
    const stlResult = exporter.parse(tempMesh, { binary: true });

    mergedGeometry.dispose();
    geometries.forEach(g => g.dispose());

    if (stlResult instanceof DataView) {
        return new Blob([stlResult.buffer], { type: 'model/stl' });
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
export async function exportForSlicing(
    modelUrl: string,
    filename: string,
    onProgress?: (percent: number) => void
): Promise<{ method: 'share' | 'download' | 'kiri' }> {
    onProgress?.(10);

    console.log('🔄 Converting GLB to STL...');
    const stlBlob = await glbToStlBlob(modelUrl);
    const stlFilename = filename.replace(/\.[^/.]+$/, '') + '.stl';
    console.log(`📦 STL: ${(stlBlob.size / 1024).toFixed(1)} KB`);
    onProgress?.(60);

    if (isMobile()) {
        // Mobile: Try to share, fallback to download
        console.log('📱 Mobile detected - using Share API');
        const shared = await shareStlFile(stlBlob, stlFilename);

        if (shared) {
            console.log('✅ Shared to app!');
            onProgress?.(100);
            return { method: 'share' };
        } else {
            // Fallback: download
            downloadFile(stlBlob, stlFilename);
            console.log('📥 Downloaded (share cancelled)');
            onProgress?.(100);
            return { method: 'download' };
        }
    } else {
        // Desktop: Download + open Kiri:Moto
        console.log('💻 Desktop detected - downloading + opening Kiri:Moto');
        downloadFile(stlBlob, stlFilename);
        onProgress?.(80);

        // Open Kiri:Moto in new tab
        window.open('https://grid.space/kiri/#mode=FDM', '_blank');
        console.log('🌐 Opened Kiri:Moto - drag your STL file to slice!');
        onProgress?.(100);

        return { method: 'kiri' };
    }
}

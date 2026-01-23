/**
 * Convert GLB model to STL for Kiri:Moto compatibility
 * Fixed: Direct mesh export without broken geometry merging
 */
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { Box3, Vector3 } from 'three';

export async function convertGlbToStl(glbUrl: string): Promise<Blob> {
    // 1. Load GLB
    const loader = new GLTFLoader();
    const gltf = await new Promise<any>((resolve, reject) => {
        loader.load(glbUrl, resolve, undefined, reject);
    });

    // 2. Auto-scale logic (Fix "Object too small")
    // Tripo models are ~1 unit (meters). Slicers expect mm.
    gltf.scene.updateMatrixWorld(true);
    const box = new Box3().setFromObject(gltf.scene);
    const size = new Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);

    // If model is effectively < 5cm (50 units), scale it up to 15cm (150mm) - SAFER for 220x220 bed
    if (maxDim < 50) {
        const TARGET_SIZE_MM = 150; // 15cm (Safe buffer for Kobra 2 Pro)
        const scaleFactor = TARGET_SIZE_MM / maxDim;

        console.log(`📏 Auto-scaling model: ${maxDim.toFixed(2)} units -> 150mm (x${scaleFactor.toFixed(2)})`);
        gltf.scene.scale.set(scaleFactor, scaleFactor, scaleFactor);

        // Center the model at 0,0,0 (helpful for slicers)
        // Re-calculate box after scale implies simplified centering logic or just export as is (slicers usually center auto)
        // But updating matrix world is CRITICAL
        gltf.scene.updateMatrixWorld(true);
    } else {
        gltf.scene.updateMatrixWorld(true);
    }

    // 3. Export the entire scene directly (STLExporter handles scene traversal)
    const exporter = new STLExporter();
    const stlBuffer = exporter.parse(gltf.scene, { binary: true });

    // 4. Return as Blob (binary STL)
    return new Blob([stlBuffer], { type: 'model/stl' });
}

export async function downloadAsStl(glbUrl: string, filename: string) {
    try {
        const blob = await convertGlbToStl(glbUrl);
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename.endsWith('.stl') ? filename : `${filename}.stl`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('STL export error:', error);
        alert('Ошибка экспорта STL. Попробуйте скачать GLB.');
    }
}

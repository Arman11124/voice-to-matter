/**
 * Convert GLB model to STL for Kiri:Moto compatibility
 * Fixed: Direct mesh export without broken geometry merging
 */
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';

export async function convertGlbToStl(glbUrl: string): Promise<Blob> {
    // 1. Load GLB
    const loader = new GLTFLoader();
    const gltf = await new Promise<any>((resolve, reject) => {
        loader.load(glbUrl, resolve, undefined, reject);
    });

    // 2. Update world matrices
    gltf.scene.updateMatrixWorld(true);

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

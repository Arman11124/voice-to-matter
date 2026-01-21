
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KOBRA_2_PRO_PROFILE } from './printerProfiles';

// Setup ClipperLib (via standard JS global or import if available)
// For this 'Production V1' we use a geometric offsetting approach to avoid complex dependencies.

const LAYER_HEIGHT = 0.2;
const WALL_THICKNESS = 0.4; // Nozzle size
const TRAVEL_SPEED = 6000;
const PRINT_SPEED = 3000; // 50mm/s

// Helper for volumetric extrusion calculation
// E = (d * h * w) / (PI * (r_fil)^2)
// For 1.75mm filament, Area = 2.405mm2
function calculateExtrusion(dist: number, layerHeight: number, wallWidth: number): number {
    const volume = dist * layerHeight * wallWidth;
    const filamentArea = 2.40528; // PI * (1.75/2)^2
    return volume / filamentArea;
}

export async function sliceModelReal(modelUrl: string, onProgress: (percent: number) => void): Promise<string> {
    onProgress(5);

    // 1. Load Model
    const mesh = await loadMesh(modelUrl);
    onProgress(15);

    // 2. Prepare Geometry (Merge, Scale, Center)
    const geometry = prepareGeometry(mesh);
    onProgress(20);

    // 3. Slice Loop
    const bbox = new THREE.Box3().setFromObject(mesh);
    const minZ = bbox.min.z;
    const maxZ = bbox.max.z;

    const layers = [];
    const totalLayers = Math.ceil((maxZ - minZ) / LAYER_HEIGHT);

    let currentZ = minZ + LAYER_HEIGHT;

    // Naive Slicer: Intersect Plane with Triangles
    const positionAttribute = geometry.getAttribute('position');
    const indexAttribute = geometry.getIndex();

    // Helper to access vertex
    const vA = new THREE.Vector3();
    const vB = new THREE.Vector3();
    const vC = new THREE.Vector3();

    for (let layerIdx = 0; layerIdx < totalLayers; layerIdx++) {
        const segments: THREE.Line3[] = [];

        // Find intersections
        if (indexAttribute) {
            for (let i = 0; i < indexAttribute.count; i += 3) {
                const a = indexAttribute.getX(i);
                const b = indexAttribute.getX(i + 1);
                const c = indexAttribute.getX(i + 2);

                vA.fromBufferAttribute(positionAttribute, a);
                vB.fromBufferAttribute(positionAttribute, b);
                vC.fromBufferAttribute(positionAttribute, c);

                // Get intersection of Triangle (vA, vB, vC) with Plane (Z = currentZ)
                const intersection = intersectTrianglePlane(vA, vB, vC, currentZ);
                if (intersection) {
                    segments.push(intersection);
                }
            }
        }

        // Link segments into Contours (Polygons)
        const contours = linkSegments(segments);
        layers.push({ z: currentZ, contours });

        currentZ += LAYER_HEIGHT;
        onProgress(20 + (layerIdx / totalLayers) * 60); // 20% to 80%
    }

    // 4. Generate G-code
    const gcode = generateGcode(layers);
    onProgress(100);

    return gcode;
}

// --- Helpers ---

async function loadMesh(url: string): Promise<THREE.Mesh> {
    const loader = new GLTFLoader();
    return new Promise((resolve, reject) => {
        loader.load(url, (gltf) => {
            const mesh = gltf.scene.children[0] as THREE.Mesh; // Assuming single mesh
            resolve(mesh);
        }, undefined, reject);
    });
}

function prepareGeometry(mesh: THREE.Mesh): THREE.BufferGeometry {
    // 1. Rotate to sit flat (Z up). Assuming Tripo glb is Y-up.
    mesh.rotation.x = -Math.PI / 2;
    mesh.updateMatrixWorld();

    const geometry = mesh.geometry.clone();
    geometry.applyMatrix4(mesh.matrixWorld);

    // 2. Center and sit on bed (Z=0)
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox!;
    const height = bbox.max.z - bbox.min.z;

    // Scale to a reasonable toy size (e.g. 80mm height if too small or true scale)
    const SCALE = height < 10 ? 60 : 1;
    geometry.scale(SCALE, SCALE, SCALE);

    // Re-center on Bed center
    geometry.computeBoundingBox();
    const center = geometry.boundingBox!.getCenter(new THREE.Vector3());
    const zOffset = -geometry.boundingBox!.min.z;

    geometry.translate(
        KOBRA_2_PRO_PROFILE.bedSize.x / 2 - center.x,
        KOBRA_2_PRO_PROFILE.bedSize.y / 2 - center.y,
        zOffset
    );

    return geometry;
}

function intersectTrianglePlane(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, z: number): THREE.Line3 | null {
    // Check if triangle spans Z
    if ((a.z < z && b.z < z && c.z < z) || (a.z > z && b.z > z && c.z > z)) return null;

    const points: THREE.Vector3[] = [];

    // Edge AB
    if ((a.z <= z && b.z >= z) || (b.z <= z && a.z >= z)) {
        const t = (z - a.z) / (b.z - a.z);
        points.push(new THREE.Vector3().lerpVectors(a, b, t));
    }
    // Edge BC
    if ((b.z <= z && c.z >= z) || (c.z <= z && b.z >= z)) {
        const t = (z - b.z) / (c.z - b.z);
        points.push(new THREE.Vector3().lerpVectors(b, c, t));
    }
    // Edge CA
    if ((c.z <= z && a.z >= z) || (a.z <= z && c.z >= z)) {
        const t = (z - c.z) / (a.z - c.z);
        points.push(new THREE.Vector3().lerpVectors(c, a, t));
    }

    if (points.length === 2) {
        return new THREE.Line3(points[0], points[1]);
    }
    return null;
}

function linkSegments(segments: THREE.Line3[]): THREE.Vector3[][] {
    const contours: THREE.Vector3[][] = [];
    if (segments.length === 0) return contours;

    const pool = [...segments];
    const EPSILON = 0.001;

    while (pool.length > 0) {
        const first = pool.pop()!;
        const contour = [first.start, first.end];

        let grown = true;
        while (grown) {
            grown = false;
            const tail = contour[contour.length - 1];
            // Find segment starting at tail
            const nextIdx = pool.findIndex(s => s.start.distanceToSquared(tail) < EPSILON);
            if (nextIdx !== -1) {
                const s = pool.splice(nextIdx, 1)[0];
                contour.push(s.end);
                grown = true;
                continue;
            }
            // Try reverse
            const nextIdxRev = pool.findIndex(s => s.end.distanceToSquared(tail) < EPSILON);
            if (nextIdxRev !== -1) {
                const s = pool.splice(nextIdxRev, 1)[0];
                contour.push(s.start);
                grown = true;
                continue;
            }
        }

        // Close loop check
        if (contour[0].distanceToSquared(contour[contour.length - 1]) < EPSILON) {
            contours.push(contour);
        }
    }
    return contours;
}

function generateGcode(layers: { z: number, contours: THREE.Vector3[][] }[]): string {
    const lines = [KOBRA_2_PRO_PROFILE.startGcode];
    let e = 0;

    layers.forEach((layer, i) => {
        lines.push(`; LAYER ${i} Z=${layer.z.toFixed(3)}`);
        lines.push(`G1 Z${layer.z.toFixed(3)} F${TRAVEL_SPEED}`);

        layer.contours.forEach(contour => {
            if (contour.length < 2) return;

            // Move to start (Travel)
            const start = contour[0];
            lines.push(`G1 X${start.x.toFixed(3)} Y${start.y.toFixed(3)} F${TRAVEL_SPEED}`);

            // Extrude path (Wall)
            for (let j = 1; j < contour.length; j++) {
                const p = contour[j];
                const dist = p.distanceTo(contour[j - 1]);
                if (dist < 0.001) continue;

                // Real E calc
                const extrusionDelta = calculateExtrusion(dist, LAYER_HEIGHT, WALL_THICKNESS);
                e += extrusionDelta;

                lines.push(`G1 X${p.x.toFixed(3)} Y${p.y.toFixed(3)} E${e.toFixed(5)} F${PRINT_SPEED}`);
            }
        });
    });

    lines.push(KOBRA_2_PRO_PROFILE.endGcode);
    return lines.join('\n');
}

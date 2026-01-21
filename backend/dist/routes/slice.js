"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Professional Slicer Endpoint using CuraEngine WASM
 * Converts STL/GLB to G-code with Kobra 2 Pro profile
 */
const express_1 = __importDefault(require("express"));
const cura_wasm_1 = require("cura-wasm");
const cura_wasm_definitions_1 = require("cura-wasm-definitions");
const router = express_1.default.Router();
// Kobra 2 Pro slicer settings (Kinder Surprise style - hollow with thick walls)
// Format: { scope: 'e0' | undefined, key: 'setting_name', value: 'string_value' }
const KOBRA_2_PRO_OVERRIDES = [
    // Quality
    { scope: undefined, key: 'layer_height', value: '0.2' },
    { scope: undefined, key: 'layer_height_0', value: '0.3' },
    // Shell (thick walls for strength)
    { scope: undefined, key: 'wall_thickness', value: '1.2' },
    { scope: undefined, key: 'wall_line_count', value: '3' },
    { scope: undefined, key: 'top_layers', value: '3' },
    { scope: undefined, key: 'bottom_layers', value: '3' },
    // Infill (hollow inside like Kinder Surprise)
    { scope: undefined, key: 'infill_sparse_density', value: '0' },
    // Speed
    { scope: undefined, key: 'speed_print', value: '100' },
    { scope: undefined, key: 'speed_travel', value: '150' },
    { scope: undefined, key: 'speed_layer_0', value: '30' },
    // Temperature
    { scope: 'e0', key: 'material_print_temperature', value: '200' },
    { scope: undefined, key: 'material_bed_temperature', value: '60' },
    // Retraction
    { scope: undefined, key: 'retraction_enable', value: 'true' },
    { scope: 'e0', key: 'retraction_amount', value: '5' },
    { scope: 'e0', key: 'retraction_speed', value: '45' },
    // Support (auto-generated for overhangs)
    { scope: undefined, key: 'support_enable', value: 'true' },
    { scope: undefined, key: 'support_type', value: 'everywhere' },
    { scope: undefined, key: 'support_angle', value: '50' },
    // Adhesion
    { scope: undefined, key: 'adhesion_type', value: 'skirt' },
    { scope: undefined, key: 'skirt_line_count', value: '2' },
    // Machine dimensions (Kobra 2 Pro)
    { scope: undefined, key: 'machine_width', value: '220' },
    { scope: undefined, key: 'machine_depth', value: '220' },
    { scope: undefined, key: 'machine_height', value: '250' },
];
/**
 * POST /api/slice
 * Body: { stlData: string (base64), filename: string }
 * Returns: { gcode: string, stats: { layers, time } }
 */
router.post('/', async (req, res) => {
    try {
        const { stlData, filename } = req.body;
        if (!stlData) {
            return res.status(400).json({ error: 'STL data required (base64)' });
        }
        console.log(`🔪 Slicing ${filename || 'model'} with CuraEngine WASM...`);
        // Initialize CuraEngine WASM
        const slicer = new cura_wasm_1.CuraWASM({
            definition: (0, cura_wasm_definitions_1.resolveDefinition)('fdmprinter'),
            overrides: KOBRA_2_PRO_OVERRIDES,
            verbose: true
        });
        // Convert base64 to ArrayBuffer
        const binary = Buffer.from(stlData, 'base64');
        const modelBuffer = binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength);
        // Slice the model
        const startTime = Date.now();
        const result = await slicer.slice(modelBuffer, 'stl');
        const sliceTime = Date.now() - startTime;
        // Cleanup
        await slicer.destroy();
        // Convert ArrayBuffer to string
        const decoder = new TextDecoder('utf-8');
        const gcodeString = decoder.decode(result.gcode);
        // Parse G-code stats
        const lines = gcodeString.split('\n');
        const layerCount = lines.filter((l) => l.includes(';LAYER:')).length;
        console.log(`✅ Slicing complete: ${layerCount} layers in ${sliceTime}ms`);
        res.json({
            gcode: gcodeString,
            stats: {
                layers: layerCount,
                timeMs: sliceTime,
                filename: filename || 'model'
            }
        });
    }
    catch (error) {
        console.error('❌ Slicing error:', error);
        res.status(500).json({
            error: 'Slicing failed',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * GET /api/slice/status
 * Returns slicer status and capabilities
 */
router.get('/status', (_req, res) => {
    res.json({
        status: 'ready',
        engine: 'CuraEngine WASM',
        profile: 'Anycubic Kobra 2 Pro',
        settings: {
            infill: '0% (hollow)',
            walls: '3 (1.2mm)',
            supports: 'auto'
        }
    });
});
exports.default = router;

/**
 * Universal G-code generator for 99% of home FDM printers
 * Uses conservative, safe settings compatible with Marlin/RepRap firmware
 */

// Universal Start G-code (safe for any printer with 200x200+ bed)
const START_GCODE = `
; === Voice to Matter - Start G-code ===
G90 ; Absolute positioning
M82 ; Absolute extrusion
G28 ; Home all axes
G1 Z5.0 F3000 ; Lift nozzle for safety

; Heat up (PLA settings)
M104 S200 ; Set nozzle temp (no wait)
M140 S60 ; Set bed temp (no wait)
M190 S60 ; Wait for bed
M109 S200 ; Wait for nozzle

; Reset extruder
G92 E0

; Purge line (draws a line on the side)
G1 X10.1 Y20 Z0.3 F5000.0 ; Move to start
G1 X10.1 Y200.0 Z0.3 F1500.0 E15 ; Draw first line
G1 X10.4 Y200.0 Z0.3 F5000.0 ; Move side
G1 X10.4 Y20.0 Z0.3 F1500.0 E30 ; Draw second line

G92 E0 ; Reset extruder
G1 Z2.0 F3000 ; Lift before travel
; === Start printing ===
`.trim();

// Universal End G-code
const END_GCODE = `
; === Voice to Matter - End G-code ===
G91 ; Relative positioning
G1 E-2 F2700 ; Retract filament
G1 Z10 F3000 ; Lift nozzle

G90 ; Absolute positioning
G1 X0 Y200 F3000 ; Present print (move to front)

; Cool down
M104 S0 ; Turn off nozzle
M140 S0 ; Turn off bed
M84 ; Disable motors

; Done! 🎉
`.trim();

/**
 * Wraps model G-code with universal start/end sequences
 */
export function wrapGcode(modelGcode: string): string {
    return `${START_GCODE}\n\n${modelGcode}\n\n${END_GCODE}`;
}

/**
 * Generates simple estimation based on G-code
 */
export function estimatePrint(gcode: string): {
    layers: number;
    estimatedMinutes: number;
    filamentMm: number;
} {
    const lines = gcode.split('\n');

    let layers = 0;
    let maxE = 0;

    for (const line of lines) {
        // Count layer changes
        if (line.includes(';LAYER:') || line.includes('; layer')) {
            layers++;
        }

        // Track extrusion for filament estimate
        const eMatch = line.match(/E([\d.]+)/);
        if (eMatch) {
            const e = parseFloat(eMatch[1]);
            if (e > maxE) maxE = e;
        }
    }

    // Rough estimate: ~2 minutes per layer at 0.28mm layer height
    const estimatedMinutes = Math.max(5, layers * 1.5);

    return {
        layers: layers || 1,
        estimatedMinutes: Math.round(estimatedMinutes),
        filamentMm: Math.round(maxE)
    };
}

/**
 * Universal Safe Profile settings for Kiri:Moto
 * These are conservative values that work with 99% of printers
 */
export const SAFE_PROFILE = {
    // Device settings (generic 200x200x200 printer)
    device: {
        bedWidth: 200,
        bedDepth: 200,
        maxHeight: 200,
        nozzleSize: 0.4,
        filamentDiameter: 1.75
    },

    // Print settings (conservative for reliability)
    process: {
        sliceHeight: 0.28,        // Draft quality, fast
        sliceShells: 2,           // Wall thickness
        sliceFillSparse: 0.15,    // 15% infill
        sliceFillType: 'grid',    // Simple grid pattern

        // Speeds (conservative)
        outputFeedrate: 45,       // 45mm/s - safe for any printer
        firstLayerRate: 0.5,      // 50% speed for first layer

        // Temperature (PLA)
        outputTemp: 200,
        outputBedTemp: 60,
        firstLayerNozzleTemp: 205,

        // Supports OFF - rely on prompt engineering
        sliceSupportEnable: false,

        // Adhesion - Brim for better adhesion
        outputBrimCount: 5,       // 5-line brim

        // Retraction
        outputRetractDist: 5,
        outputRetractSpeed: 45
    },

    // Target size for models (60mm cube max)
    maxSize: 60
};

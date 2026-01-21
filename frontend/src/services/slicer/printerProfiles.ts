
export const KOBRA_2_PRO_PROFILE = {
    name: 'Anycubic Kobra 2 Pro',
    baudRate: 115200,
    nozzleSize: 0.4,
    filamentDiameter: 1.75,
    bedSize: { x: 220, y: 220, z: 250 },
    startGcode: `
; Anycubic Kobra 2 Pro Start G-code
M140 S60 ; Set Heat Bed temperature
M104 S200 ; Set Extruder temperature
G28 ; Home all axes
G90 ; Absolute positioning
M83 ; Extruder relative mode
M190 S60 ; Wait for Heat Bed temperature
M109 S200 ; Wait for Extruder temperature
G1 Z2.0 F3000 ; Move Z Axis up little to prevent scratching of Heat Bed
G1 X0.1 Y20 Z0.3 F5000.0 ; Move to start position
G1 X0.1 Y200.0 Z0.3 F1500.0 E15 ; Draw the first line
G1 X0.4 Y200.0 Z0.3 F5000.0 ; Move to side a little
G1 X0.4 Y20.0 Z0.3 F1500.0 E30 ; Draw the second line
G92 E0 ; Reset Extruder
G1 Z2.0 F3000 ; Move Z Axis up little to prevent scratching of Heat Bed
G1 F2400 E-0.5 ; Retract
    `.trim(),
    endGcode: `
; Anycubic Kobra 2 Pro End G-code
M104 S0 ; Turn-off hotend
M140 S0 ; Turn-off bed
M84 X Y E ; Disable all steppers but Z
G91 ; Relative positioning
G1 E-2 F2700 ; Retract a bit
G1 E-2 Z0.2 F2400 ; Retract and raise Z
G1 X5 Y5 F3000 ; Wipe out
G1 Z10 ; Raise Z more
G90 ; Absolute positioning
G1 X0 Y220 ; Present print
M82 ; Absolute extrusion mode
M106 S0 ; Turn-off fan
    `.trim()
};

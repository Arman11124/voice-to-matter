
import { KOBRA_2_PRO_PROFILE } from './printerProfiles';

export async function sliceModelMock(_modelUrl: string, onProgress: (percent: number) => void): Promise<string> {
    // Simulate downloading and processing time
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
        await new Promise(r => setTimeout(r, 200)); // 2 seconds total
        onProgress(i * 10);
    }

    // Combine Profile Start + "Mock Object" + Profile End
    const gcode = [
        KOBRA_2_PRO_PROFILE.startGcode,
        '; MOCK PRINT OBJECT - TEST MODE',
        'G1 Z10 F3000 ; Move up',
        'G1 X100 Y100 F5000 ; Move to center',
        'G1 Z0.3 F3000 ; Move down',
        'G1 X120 Y120 E10 F1500 ; Print a small diagonal line test',
        'G1 Z10 F3000 ; Move up',
        KOBRA_2_PRO_PROFILE.endGcode
    ].join('\n');

    return gcode;
}

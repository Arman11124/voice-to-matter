
// import { KOBRA_2_PRO_PROFILE } from './printerProfiles';

export interface SliceJob {
    file: Blob; // The G-code file
    filename: string;
}

/**
 * Downloads G-code file to device
 */
function downloadGcode(gcode: string, filename: string): void {
    const blob = new Blob([gcode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export async function shareGcode(gcode: string, filename: string = 'model.gcode'): Promise<boolean> {
    const blob = new Blob([gcode], { type: 'text/plain' });
    const file = new File([blob], filename, { type: 'text/plain' });

    // Try Web Share API first (requires user gesture)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                files: [file],
                title: '3D Print Model',
                text: 'Sent from Voice-to-Matter'
            });
            return true;
        } catch (error) {
            // NotAllowedError or user cancelled - fallback to download
            console.log('Share failed, falling back to download:', error);
            downloadGcode(gcode, filename);
            return true;
        }
    } else {
        // No Web Share API - direct download
        downloadGcode(gcode, filename);
        return true;
    }
}

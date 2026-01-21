
// import { KOBRA_2_PRO_PROFILE } from './printerProfiles';

export interface SliceJob {
    file: Blob; // The G-code file
    filename: string;
}

export async function shareGcode(gcode: string, filename: string = 'model.gcode'): Promise<boolean> {
    const blob = new Blob([gcode], { type: 'text/plain' }); // G-code is text
    // Some apps prefer .txt or specific mime types, but .gcode is standard. 
    // Android "Share" often works best with files.

    const file = new File([blob], filename, { type: 'text/plain' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                files: [file],
                title: '3D Print Model',
                text: 'Sent from Voice-to-Matter'
            });
            return true;
        } catch (error) {
            console.error('Error sharing:', error);
            return false;
        }
    } else {
        // Fallback: Download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
    }
}

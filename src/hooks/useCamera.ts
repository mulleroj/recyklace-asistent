
import { useState, useCallback, useRef } from 'react';
import { compressImage } from '../../utils/imageCompression';

export const useCamera = () => {
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const startCamera = useCallback(async (isOnline: boolean) => {
        if (!isOnline) {
            setError('Focení vyžaduje připojení k internetu pro AI analýzu.');
            return;
        }
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });
            setCameraStream(stream);
            setIsCameraOpen(true);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            setError('Nepodařilo se zapnout kameru.');
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setIsCameraOpen(false);
    }, [cameraStream]);

    const capturePhoto = useCallback(async (onCapture: (base64: string) => void) => {
        if (!videoRef.current || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const rawBase64 = canvas.toDataURL('image/jpeg', 0.9);

        stopCamera();

        // Compress image before sending
        try {
            const compressedBase64 = await compressImage(rawBase64, 1024, 1024, 0.8);
            onCapture(compressedBase64);
        } catch (err) {
            console.error('Image compression failed, using original:', err);
            // Fallback to uncompressed if compression fails
            const base64Data = rawBase64.split(',')[1];
            onCapture(base64Data);
        }
    }, [stopCamera]);

    return {
        isCameraOpen,
        videoRef,
        canvasRef,
        error,
        setError,
        startCamera,
        stopCamera,
        capturePhoto
    };
};

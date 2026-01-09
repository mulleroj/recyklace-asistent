
import React from 'react';

interface CameraViewProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    onCapture: () => void;
    onClose: () => void;
}

const CameraView: React.FC<CameraViewProps> = ({ videoRef, onCapture, onClose }) => {
    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-0 border-[20px] border-white/20 pointer-events-none"></div>
            <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-8 px-10">
                <button onClick={onClose} className="bg-white/20 text-white px-8 py-6 rounded-3xl font-bold text-xl backdrop-blur-md">ZPĚT</button>
                <button onClick={onCapture} className="w-24 h-24 bg-white rounded-full border-[10px] border-emerald-500 shadow-2xl active:scale-90 transition-all" aria-label="Vyfotit"></button>
            </div>
        </div>
    );
};

export default CameraView;

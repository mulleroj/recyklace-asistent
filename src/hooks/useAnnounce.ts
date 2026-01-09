
import { useCallback } from 'react';

export const useAnnounce = (soundEnabled: boolean) => {
    const announceResult = useCallback((category: string) => {
        if (!soundEnabled) return;

        // 1. Zvukový signál (Earcon)
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const playNote = (freq: number, startTime: number, duration: number) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.frequency.setValueAtTime(freq, startTime);
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(startTime);
                osc.stop(startTime + duration);
            };
            playNote(523.25, audioCtx.currentTime, 0.2); // Krátký tón C5
            setTimeout(() => audioCtx.close(), 1000);
        } catch (e) {
            console.warn("Audio Context error:", e);
        }

        // 2. Hlasové oznámení barvy
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();

            const colorToSpeak = category.includes(':')
                ? category.split(':')[0].trim()
                : category;

            const utterance = new SpeechSynthesisUtterance(colorToSpeak);
            utterance.lang = 'cs-CZ';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    }, [soundEnabled]);

    // Funkce pro přečtení libovolného textu (přístupnost)
    const speakText = useCallback((text: string) => {
        if (!text) return;

        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'cs-CZ';
            utterance.rate = 0.9; // Pomalejší pro lepší srozumitelnost
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    }, []);

    return { announceResult, speakText };
};

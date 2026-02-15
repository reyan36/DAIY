"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface UseSpeechSynthesisOptions {
    rate?: number;
    pitch?: number;
    onEnd?: () => void;
    onError?: (error: string) => void;
}

interface UseSpeechSynthesisReturn {
    isSpeaking: boolean;
    isSupported: boolean;
    speak: (text: string) => void;
    stop: () => void;
    toggle: (text: string) => void;
}

/**
 * Strip markdown formatting so TTS reads clean text.
 */
function stripMarkdown(text: string): string {
    return (
        text
            // Remove code blocks
            .replace(/```[\s\S]*?```/g, "")
            // Remove inline code
            .replace(/`([^`]+)`/g, "$1")
            // Remove bold/italic markers
            .replace(/\*\*(.+?)\*\*/g, "$1")
            .replace(/\*(.+?)\*/g, "$1")
            .replace(/__(.+?)__/g, "$1")
            .replace(/_(.+?)_/g, "$1")
            // Remove markdown links, keep text
            .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
            // Remove images
            .replace(/!\[([^\]]*)\]\([^)]+\)/g, "")
            // Remove headings markers
            .replace(/#{1,6}\s+/g, "")
            // Remove horizontal rules
            .replace(/^[-*_]{3,}$/gm, "")
            // Remove list markers
            .replace(/^[\s]*[-*+]\s+/gm, "")
            .replace(/^[\s]*\d+\.\s+/gm, "")
            // Remove blockquotes
            .replace(/^>\s+/gm, "")
            // Remove special tags like [BREAKTHROUGH], [TIMELINE:...]
            .replace(/\[BREAKTHROUGH\]/g, "")
            .replace(/\[TIMELINE:[^\]]*\]/g, "")
            // Collapse multiple newlines
            .replace(/\n{3,}/g, "\n\n")
            .trim()
    );
}

export function useSpeechSynthesis(
    options: UseSpeechSynthesisOptions = {}
): UseSpeechSynthesisReturn {
    const { rate = 1.0, pitch = 1.0, onEnd, onError } = options;

    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Check support on mount
    useEffect(() => {
        const supported =
            typeof window !== "undefined" && "speechSynthesis" in window;
        setIsSupported(supported);
    }, []);

    /**
     * Pick the best available voice.
     * Prefers natural/Google voices, falls back to any English voice.
     */
    const getPreferredVoice = useCallback((): SpeechSynthesisVoice | null => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) return null;

        // Prefer Google / natural English voices
        const preferred = voices.find(
            (v) =>
                v.lang.startsWith("en") &&
                (v.name.includes("Google") || v.name.includes("Natural"))
        );
        if (preferred) return preferred;

        // Any English voice
        const english = voices.find((v) => v.lang.startsWith("en"));
        if (english) return english;

        // Fallback to default
        return voices[0];
    }, []);

    const stop = useCallback(() => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        utteranceRef.current = null;
    }, []);

    const speak = useCallback(
        (text: string) => {
            if (!isSupported) {
                onError?.("Text-to-speech is not supported in this browser.");
                return;
            }

            // Stop any existing speech
            stop();

            const cleanText = stripMarkdown(text);
            if (!cleanText) return;

            // SpeechSynthesis has a bug in some browsers where long text gets cut off.
            // We split into chunks of ~200 characters at sentence boundaries.
            const chunks = splitIntoChunks(cleanText, 200);
            let chunkIndex = 0;

            const speakNext = () => {
                if (chunkIndex >= chunks.length) {
                    setIsSpeaking(false);
                    onEnd?.();
                    return;
                }

                const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
                utterance.rate = rate;
                utterance.pitch = pitch;

                const voice = getPreferredVoice();
                if (voice) utterance.voice = voice;

                utterance.onend = () => {
                    chunkIndex++;
                    speakNext();
                };

                utterance.onerror = (event) => {
                    if (event.error === "canceled" || event.error === "interrupted") return;
                    onError?.(`Speech synthesis error: ${event.error}`);
                    setIsSpeaking(false);
                };

                utteranceRef.current = utterance;
                window.speechSynthesis.speak(utterance);
            };

            setIsSpeaking(true);
            speakNext();
        },
        [isSupported, rate, pitch, getPreferredVoice, stop, onEnd, onError]
    );

    const toggle = useCallback(
        (text: string) => {
            if (isSpeaking) {
                stop();
            } else {
                speak(text);
            }
        },
        [isSpeaking, speak, stop]
    );

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            window.speechSynthesis?.cancel();
        };
    }, []);

    return {
        isSpeaking,
        isSupported,
        speak,
        stop,
        toggle,
    };
}

/**
 * Split text into chunks at sentence boundaries.
 */
function splitIntoChunks(text: string, maxLen: number): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
    const chunks: string[] = [];
    let current = "";

    for (const sentence of sentences) {
        if (current.length + sentence.length > maxLen && current) {
            chunks.push(current.trim());
            current = sentence;
        } else {
            current += sentence;
        }
    }
    if (current.trim()) chunks.push(current.trim());

    return chunks;
}

"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// Extend Window for vendor-prefixed SpeechRecognition
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message?: string;
}

interface ISpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    onstart: (() => void) | null;
}

declare global {
    interface Window {
        SpeechRecognition: new () => ISpeechRecognition;
        webkitSpeechRecognition: new () => ISpeechRecognition;
    }
}

interface UseSpeechRecognitionOptions {
    lang?: string;
    onTranscript?: (transcript: string) => void;
    onError?: (error: string) => void;
}

interface UseSpeechRecognitionReturn {
    isListening: boolean;
    isSupported: boolean;
    transcript: string;
    startListening: () => void;
    stopListening: () => void;
    toggleListening: () => void;
}

export function useSpeechRecognition(
    options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
    const { lang = "en-US", onTranscript, onError } = options;

    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [isSupported, setIsSupported] = useState(false);

    const recognitionRef = useRef<ISpeechRecognition | null>(null);
    const finalTranscriptRef = useRef("");

    // Check support on mount
    useEffect(() => {
        const supported =
            typeof window !== "undefined" &&
            ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
        setIsSupported(supported);
    }, []);

    const startListening = useCallback(() => {
        if (!isSupported) {
            onError?.("Speech recognition is not supported in this browser.");
            return;
        }

        // Stop any existing instance
        if (recognitionRef.current) {
            recognitionRef.current.abort();
        }

        const SpeechRecognition =
            window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = lang;

        recognition.onstart = () => {
            setIsListening(true);
            finalTranscriptRef.current = "";
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interim = "";
            let final = "";

            for (let i = 0; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    final += result[0].transcript;
                } else {
                    interim += result[0].transcript;
                }
            }

            finalTranscriptRef.current = final;
            const currentTranscript = final + interim;
            setTranscript(currentTranscript);
            onTranscript?.(currentTranscript);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            // "aborted" is expected when we manually stop
            if (event.error === "aborted") return;

            if (event.error === "not-allowed") {
                onError?.("Microphone access was denied. Please allow microphone permissions.");
            } else if (event.error === "no-speech") {
                onError?.("No speech detected. Try again.");
            } else {
                onError?.(`Speech recognition error: ${event.error}`);
            }
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;

        try {
            recognition.start();
        } catch {
            onError?.("Failed to start speech recognition.");
            setIsListening(false);
        }
    }, [isSupported, lang, onTranscript, onError]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsListening(false);
    }, []);

    const toggleListening = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            setTranscript("");
            startListening();
        }
    }, [isListening, startListening, stopListening]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    return {
        isListening,
        isSupported,
        transcript,
        startListening,
        stopListening,
        toggleListening,
    };
}

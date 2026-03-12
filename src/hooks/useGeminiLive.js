"use client";
import { useState, useEffect, useRef, useCallback } from 'react';

const GEMINI_WS_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

export function useGeminiLive(apiKey, initialAgent, onEscalateToFaro) {
    const [status, setStatus] = useState('disconnected'); // disconnected, connecting, connected
    const [agent, setAgent] = useState(initialAgent);
    const [transcripts, setTranscripts] = useState([]);
    const [error, setError] = useState(null);

    const wsRef = useRef(null);
    const audioContextRef = useRef(null);
    const audioInputRef = useRef(null);
    const processorRef = useRef(null);
    const audioQueueRef = useRef([]); // Playback queue
    const isPlayingRef = useRef(false);

    // Setup WebSocket connection
    const connect = useCallback(async () => {
        if (!apiKey) {
            setError("API Key missing");
            return;
        }

        setStatus('connecting');
        setError(null);
        setTranscripts([]);

        try {
            const safeApiKey = typeof apiKey === 'string' ? apiKey.trim() : "";
            const url = `${GEMINI_WS_URL}?key=${safeApiKey}`;
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                setStatus('connected');
                // Gemini Multimodal Live API requires an initial "setup" message 
                // to configure the model, system prompt, and tools.
                const setupMessage = {
                    setup: {
                        model: "models/gemini-2.5-flash-native-audio-latest",
                        generationConfig: {
                            responseModalities: ["AUDIO"]
                        },
                        systemInstruction: {
                            parts: [{ text: agent.systemPrompt }]
                        },
                        tools: [
                            {
                                functionDeclarations: [
                                    {
                                        name: "escalate_to_crisis_faro",
                                        description: "Call this tool IMMEDIATELY if the user expresses suicidal thoughts, self-harm, or severe distress. Do not hesitate."
                                    }
                                ]
                            }
                        ]
                    }
                };
                ws.send(JSON.stringify(setupMessage));
                // Small delay to ensure setup is acknowledged before blasting audio
                setTimeout(() => {
                    startAudioCapture();
                }, 500);
            };

            ws.onmessage = async (event) => {
                try {
                    // Gemini returns JSON for setup, but real data might be Blob or text JSON
                    const dataStr = event.data instanceof Blob ? await event.data.text() : event.data;
                    const msg = JSON.parse(dataStr);

                    // Handle server content (audio out & text out)
                    if (msg.serverContent?.modelTurn?.parts) {
                        const parts = msg.serverContent.modelTurn.parts;

                        for (const part of parts) {
                            // Extract Audio
                            if (part.inlineData?.mimeType?.startsWith('audio/pcm') && part.inlineData?.data) {
                                playPcmAudio(part.inlineData.data);
                            }
                            // Extract Text Transcripts
                            if (part.text) {
                                setTranscripts(prev => [...prev, { text: part.text, sender: 'ai' }]);
                            }
                        }
                    }

                    // Handle Tool Calls (Faro Bypass)
                    if (msg.toolCall?.functionCalls) {
                        const faroCall = msg.toolCall.functionCalls.find(f => f.name === 'escalate_to_crisis_faro');
                        if (faroCall) {
                            console.warn("⚠️ TOXICITY/CRISIS DETECTED BY MODEL. ESCALATING TO FARO.");
                            ws.send(JSON.stringify({
                                toolResponse: {
                                    functionResponses: [{
                                        name: "escalate_to_crisis_faro",
                                        id: faroCall.id,
                                        response: { result: "TRANSFERRED_TO_FARO_SUCCESS", instructions: "You are now FARO. Enter crisis management mode immediately. Tone: Firm, deeply compassionate, direct. Tell them they are safe and provide the hotline details." }
                                    }]
                                }
                            }));
                            if (onEscalateToFaro) onEscalateToFaro();
                        }
                    }

                } catch (e) {
                    console.error("Message parsing error:", e, "Raw data:", event.data);
                }
            };

            ws.onerror = (e) => {
                console.error("WebSocket Error:", e);
                // Extract error message from event if available
                const errorMessage = e && e.message ? e.message : "Ensure your API Key is valid and supports the Multimodal Live API. Check API Key restrictions.";
                setError(`WebSocket connection failed. ${errorMessage}`);
                setStatus('disconnected');
                cleanupAudio();
            };

            ws.onclose = (event) => {
                console.log(`WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`);
                if (event.code !== 1000 && event.code !== 1005) {
                    setError(`WebSocket closed abnormally: ${event.code} ${event.reason}`);
                }
                setStatus('disconnected');
                cleanupAudio();
            };

        } catch (err) {
            setError(err.message);
            setStatus('disconnected');
        }
    }, [apiKey, agent.systemPrompt, onEscalateToFaro]);

    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        cleanupAudio();
        setStatus('disconnected');
    }, []);

    // Audio Capture using ScriptProcessor (compatible and doesn't require separate worklet file)
    const startAudioCapture = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            audioContextRef.current = audioCtx;

            const source = audioCtx.createMediaStreamSource(stream);
            audioInputRef.current = source;

            // Deprecated but works seamlessly without bundling a worklet blob URL in Next.js
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    const inputData = e.inputBuffer.getChannelData(0);
                    // Convert Float32Array (-1.0 to 1.0) to Int16Array
                    const pcm16 = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                        let s = Math.max(-1, Math.min(1, inputData[i]));
                        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                    }
                    
                    // Convert to Base64 safely without call stack limits
                    let binary = '';
                    const bytes = new Uint8Array(pcm16.buffer);
                    for (let i = 0; i < bytes.byteLength; i++) {
                        binary += String.fromCharCode(bytes[i]);
                    }
                    const base64Audio = btoa(binary);

                    wsRef.current.send(JSON.stringify({
                        realtimeInput: { mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: base64Audio }] }
                    }));
                }
            };

            source.connect(processor);
            processor.connect(audioCtx.destination);

        } catch (err) {
            console.error("Microphone access failed:", err);
            setError("Microphone access denied or failed.");
        }
    };

    // Playback queue processing
    const playPcmAudio = (base64Audio) => {
        try {
            const binaryString = atob(base64Audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Gemini sends 24000Hz PCM
            const int16Array = new Int16Array(bytes.buffer);
            const float32Array = new Float32Array(int16Array.length);
            for (let i = 0; i < int16Array.length; i++) {
                float32Array[i] = int16Array[i] / 32768.0;
            }

            if (!audioContextRef.current) return;

            const audioBuffer = audioContextRef.current.createBuffer(1, float32Array.length, 24000);
            audioBuffer.getChannelData(0).set(float32Array);

            audioQueueRef.current.push(audioBuffer);
            processAudioQueue();

        } catch (e) {
            console.error("Audio playback error:", e);
        }
    };

    const processAudioQueue = async () => {
        if (isPlayingRef.current || audioQueueRef.current.length === 0 || !audioContextRef.current) return;

        isPlayingRef.current = true;
        const buffer = audioQueueRef.current.shift();

        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);

        source.onended = () => {
            isPlayingRef.current = false;
            processAudioQueue();
        };

        source.start(0);
    };

    const cleanupAudio = () => {
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (audioInputRef.current) {
            audioInputRef.current.disconnect();
            audioInputRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        audioQueueRef.current = [];
        isPlayingRef.current = false;
    };

    return {
        status,
        agent,
        setAgent, // allows updating the agent dynamically (e.g. for Faro bypass)
        transcripts,
        error,
        connect,
        disconnect
    };
}

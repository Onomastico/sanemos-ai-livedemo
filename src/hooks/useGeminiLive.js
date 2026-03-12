"use client";
import { useState, useEffect, useRef, useCallback } from 'react';

const GEMINI_WS_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

function buildSystemPrompt(basePrompt, userContext, userCountry) {
    if (!userContext?.detail) return basePrompt;
    const country = userCountry || userContext.country || 'desconocido';
    return `CONTEXTO DEL USUARIO CON QUIEN ESTÁS HABLANDO: ${userContext.detail}\nPaís del usuario: ${country}.\nAdapta tu respuesta al contexto cultural y emocional de esta persona.\n\n${basePrompt}`;
}

function buildFunctionDeclarations(agentId) {
    const declarations = [
        {
            name: "escalate_to_crisis_faro",
            description: "Call this tool IMMEDIATELY if the user expresses suicidal thoughts, self-harm, or severe distress. Do not hesitate."
        },
        {
            name: "report_emotion",
            description: "Report the primary emotion detected in the user's last message. Call silently after each user turn. Never mention this tool to the user.",
            parameters: {
                type: "OBJECT",
                properties: {
                    emotion: {
                        type: "STRING",
                        enum: ["sadness", "anger", "fear", "guilt", "hope", "calm", "love", "numbness"]
                    },
                    intensity: {
                        type: "INTEGER",
                        description: "Intensity from 1 (mild) to 5 (overwhelming)"
                    }
                },
                required: ["emotion", "intensity"]
            }
        }
    ];

    if (agentId === 'serena') {
        declarations.push(
            {
                name: "start_breathing_exercise",
                description: "Start a synchronized breathing exercise visualization for the user. Call this when guiding a breathing exercise.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        type: { type: "STRING", enum: ["box", "478", "simple"], description: "Exercise type: box (4-4-4-4), 478 (4-7-8), or simple (4-0-4)" },
                        inhale_seconds: { type: "INTEGER", description: "Seconds to inhale" },
                        hold_seconds: { type: "INTEGER", description: "Seconds to hold (0 if none)" },
                        exhale_seconds: { type: "INTEGER", description: "Seconds to exhale" },
                        cycles: { type: "INTEGER", description: "Number of repetitions" }
                    },
                    required: ["type", "inhale_seconds", "exhale_seconds", "cycles"]
                }
            },
            {
                name: "stop_breathing_exercise",
                description: "Stop the current breathing exercise visualization."
            }
        );
    }

    return declarations;
}

export function useGeminiLive(apiKey, initialAgent, onEscalateToFaro, userContext, userCountry) {
    const [status, setStatus] = useState('disconnected'); // disconnected, connecting, connected
    const [agent, setAgent] = useState(initialAgent);
    const [messages, setMessages] = useState([]);         // completed full messages
    const [currentMessage, setCurrentMessage] = useState(null); // in-progress message {text, sender}
    const currentMsgRef = useRef(null); // accumulator ref (avoids stale closure in ws.onmessage)
    const [error, setError] = useState(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const [emotion, setEmotion] = useState(null);               // { emotion, intensity } from report_emotion
    const [breathingExercise, setBreathingExercise] = useState(null); // breathing params from Serena
    const [cameraEnabled, setCameraEnabled] = useState(false);

    const wsRef = useRef(null);
    const audioContextRef = useRef(null);
    const playbackContextRef = useRef(null);
    const audioInputRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const processorRef = useRef(null);
    const nextPlayTimeRef = useRef(0);
    const activeSourcesRef = useRef(0);
    const speakingTimeoutRef = useRef(null);
    const pendingSwitchRef = useRef(false);
    const pendingSwitchContextRef = useRef(null);
    const videoStreamRef = useRef(null);
    const canvasRef = useRef(null);
    const frameIntervalRef = useRef(null);
    const onEscalateToFaroRef = useRef(onEscalateToFaro);
    onEscalateToFaroRef.current = onEscalateToFaro;
    const userContextRef = useRef(userContext);
    userContextRef.current = userContext;
    const userCountryRef = useRef(userCountry);
    userCountryRef.current = userCountry;

    const turnCompleteTimerRef = useRef(null);

    // Finalize the current in-progress message → push to completed messages
    const finalizeCurrentMessage = () => {
        const cur = currentMsgRef.current;
        if (cur && cur.text.trim()) {
            setMessages(prev => [...prev, { text: cur.text.trim(), sender: cur.sender }]);
        }
        currentMsgRef.current = null;
        setCurrentMessage(null);
    };

    // Schedule finalization with a short delay to let trailing transcription fragments arrive
    const scheduleFinalizeAiMessage = () => {
        clearTimeout(turnCompleteTimerRef.current);
        turnCompleteTimerRef.current = setTimeout(() => {
            if (currentMsgRef.current?.sender === 'ai') {
                finalizeCurrentMessage();
            }
        }, 600);
    };

    // Strip control character artifacts from transcription (e.g. <ctrl46>)
    const cleanTranscript = (text) => text.replace(/<ctrl\d+>/gi, '').trim();

    // Append a transcription fragment to the current message, or start a new one
    const appendFragment = (text, sender) => {
        const cleaned = cleanTranscript(text);
        if (!cleaned) return; // Skip empty/control-only fragments

        const cur = currentMsgRef.current;
        if (cur && cur.sender === sender) {
            // Same speaker — accumulate
            cur.text += ' ' + cleaned;
        } else {
            // Different speaker — finalize previous, start new
            if (cur && cur.text.trim()) {
                clearTimeout(turnCompleteTimerRef.current);
                setMessages(prev => [...prev, { text: cur.text.trim(), sender: cur.sender }]);
            }
            currentMsgRef.current = { text: cleaned, sender };
        }
        setCurrentMessage({ ...currentMsgRef.current });
    };

    // Setup WebSocket connection
    const connect = useCallback(async () => {
        if (!apiKey) {
            setError("API Key missing");
            return;
        }

        setStatus('connecting');
        setError(null);
        setMessages([]);
        setCurrentMessage(null);
        currentMsgRef.current = null;

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
                        model: "models/gemini-2.5-flash-native-audio-preview-12-2025",
                        generationConfig: {
                            responseModalities: ["AUDIO"],
                            speechConfig: {
                                voiceConfig: {
                                    prebuiltVoiceConfig: {
                                        voiceName: agent.voiceName || 'Aoede'
                                    }
                                }
                            }
                        },
                        systemInstruction: {
                            parts: [{ text: buildSystemPrompt(agent.systemPrompt, userContextRef.current, userCountryRef.current) }]
                        },
                        tools: [
                            {
                                functionDeclarations: buildFunctionDeclarations(agent.id)
                            }
                        ],
                        inputAudioTranscription: {},
                        outputAudioTranscription: {}
                    }
                };
                ws.send(JSON.stringify(setupMessage));
                // Small delay to ensure setup is acknowledged before blasting audio
                setTimeout(() => {
                    startAudioCapture();
                    // If this is an agent switch, send a context message to prime the new agent
                    if (pendingSwitchContextRef.current) {
                        const contextMsg = pendingSwitchContextRef.current;
                        pendingSwitchContextRef.current = null;
                        setTimeout(() => {
                            if (ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({
                                    clientContent: {
                                        turns: [{ role: "user", parts: [{ text: contextMsg }] }],
                                        turnComplete: true
                                    }
                                }));
                            }
                        }, 150);
                    }
                }, 250);
            };

            ws.onmessage = async (event) => {
                try {
                    // Gemini returns JSON for setup, but real data might be Blob or text JSON
                    const dataStr = event.data instanceof Blob ? await event.data.text() : event.data;
                    const msg = JSON.parse(dataStr);

                    // Handle audio playback from model
                    if (msg.serverContent?.modelTurn?.parts) {
                        for (const part of msg.serverContent.modelTurn.parts) {
                            if (part.inlineData?.mimeType?.startsWith('audio/pcm') && part.inlineData?.data) {
                                playPcmAudio(part.inlineData.data);
                            }
                        }
                    }

                    // Handle transcriptions — accumulate fragments into full messages
                    const sc = msg.serverContent;
                    const inputText = (sc?.inputTranscription?.text || sc?.input_transcription?.text || '').trim();
                    const outputText = (sc?.outputTranscription?.text || sc?.output_transcription?.text || '').trim();

                    if (inputText) appendFragment(inputText, 'user');
                    if (outputText) appendFragment(outputText, 'ai');

                    // turnComplete signals end of AI turn — schedule finalize with delay
                    // to let trailing transcription fragments arrive
                    if (sc?.turnComplete && currentMsgRef.current?.sender === 'ai') {
                        scheduleFinalizeAiMessage();
                    }

                    // Handle Tool Calls — dispatch each call and send toolResponse
                    if (msg.toolCall?.functionCalls) {
                        const responses = [];
                        for (const call of msg.toolCall.functionCalls) {
                            if (call.name === 'escalate_to_crisis_faro') {
                                console.warn("⚠️ CRISIS DETECTED. RECONNECTING AS FARO.");
                                if (onEscalateToFaroRef.current) onEscalateToFaroRef.current();
                                return; // WS will be torn down, no response needed
                            }
                            if (call.name === 'report_emotion') {
                                const args = call.args || {};
                                setEmotion({ emotion: args.emotion, intensity: args.intensity || 3 });
                            }
                            if (call.name === 'start_breathing_exercise') {
                                const args = call.args || {};
                                setBreathingExercise({
                                    type: args.type || 'box',
                                    inhale_seconds: Math.max(args.inhale_seconds || 4, 4),
                                    hold_seconds: args.hold_seconds || 4,
                                    exhale_seconds: Math.max(args.exhale_seconds || 4, 4),
                                    cycles: Math.max(args.cycles || 4, 4)
                                });
                            }
                            if (call.name === 'stop_breathing_exercise') {
                                setBreathingExercise(null);
                            }
                            // Queue toolResponse for non-escalation calls
                            responses.push({
                                id: call.id,
                                response: { result: { success: true } }
                            });
                        }
                        // Send all toolResponses so the model continues
                        if (responses.length > 0 && ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({
                                toolResponse: { functionResponses: responses }
                            }));
                        }
                    }

                } catch (e) {
                    console.error("Message parsing error:", e, "Raw data:", event.data);
                }
            };

            ws.onerror = (e) => {
                // Ignore errors from stale WebSocket (e.g. React strict mode double-mount)
                if (wsRef.current !== ws) return;
                console.error("WebSocket Error:", e);
                const errorMessage = e && e.message ? e.message : "Ensure your API Key is valid and supports the Multimodal Live API. Check API Key restrictions.";
                setError(`WebSocket connection failed. ${errorMessage}`);
                setStatus('disconnected');
                cleanupAudio();
            };

            ws.onclose = (event) => {
                // Ignore close from stale WebSocket (e.g. React strict mode double-mount)
                if (wsRef.current !== ws) return;
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
    }, [apiKey, agent.systemPrompt]);

    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        cleanupAudio();
        setStatus('disconnected');
    }, []);

    // Switch to a new agent: disconnect current session and reconnect with new system prompt
    const switchAgent = useCallback((newAgent, contextMessage) => {
        setAgent(newAgent);
        setBreathingExercise(null);
        setEmotion(null);
        if (contextMessage) {
            pendingSwitchContextRef.current = contextMessage;
        }
        // Agent state update triggers connect to use new systemPrompt via dependency
        // We need to disconnect first, then reconnect after state settles
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        cleanupAudio();
        pendingSwitchRef.current = true;
    }, []);

    // Reconnect after agent switch
    useEffect(() => {
        if (pendingSwitchRef.current) {
            pendingSwitchRef.current = false;
            connect();
        }
    }, [agent, connect]);

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
            mediaStreamRef.current = stream;

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

                    // Detect voice activity from RMS level
                    let sum = 0;
                    for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
                    const rms = Math.sqrt(sum / inputData.length);
                    if (rms > 0.01) {
                        setIsSpeaking(true);
                        clearTimeout(speakingTimeoutRef.current);
                        speakingTimeoutRef.current = setTimeout(() => setIsSpeaking(false), 400);
                    }

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

    // Gapless audio playback using scheduled start times
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

            // Use a separate playback context at 24kHz for correct sample rate
            if (!playbackContextRef.current) {
                playbackContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
            }
            const ctx = playbackContextRef.current;

            const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
            audioBuffer.getChannelData(0).set(float32Array);

            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);

            // Schedule gaplessly: each chunk starts exactly when the previous ends
            const now = ctx.currentTime;
            const startTime = Math.max(now, nextPlayTimeRef.current);
            nextPlayTimeRef.current = startTime + audioBuffer.duration;

            activeSourcesRef.current++;
            setIsAiSpeaking(true);

            source.onended = () => {
                activeSourcesRef.current--;
                if (activeSourcesRef.current <= 0) {
                    activeSourcesRef.current = 0;
                    setIsAiSpeaking(false);
                }
            };

            source.start(startTime);

        } catch (e) {
            console.error("Audio playback error:", e);
        }
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
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (playbackContextRef.current) {
            playbackContextRef.current.close();
            playbackContextRef.current = null;
        }
        // Cleanup video capture
        if (frameIntervalRef.current) {
            clearInterval(frameIntervalRef.current);
            frameIntervalRef.current = null;
        }
        if (videoStreamRef.current) {
            videoStreamRef.current.getTracks().forEach(track => track.stop());
            videoStreamRef.current = null;
        }
        canvasRef.current = null;
        setCameraEnabled(false);

        nextPlayTimeRef.current = 0;
        activeSourcesRef.current = 0;
        setIsSpeaking(false);
        setIsAiSpeaking(false);
    };

    // Video capture for camera input
    const startVideoCapture = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
            videoStreamRef.current = stream;
            const canvas = document.createElement('canvas');
            canvas.width = 320;
            canvas.height = 240;
            canvasRef.current = canvas;
            const ctx = canvas.getContext('2d');
            const video = document.createElement('video');
            video.srcObject = stream;
            video.playsInline = true;
            video.muted = true;

            // Wait for video to be ready before starting frame capture
            await new Promise((resolve) => {
                video.onloadeddata = resolve;
                video.play();
            });

            frameIntervalRef.current = setInterval(() => {
                try {
                    if (wsRef.current?.readyState === WebSocket.OPEN && video.readyState >= 2) {
                        ctx.drawImage(video, 0, 0, 320, 240);
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                        const base64Data = dataUrl.split(',')[1];
                        if (base64Data) {
                            wsRef.current.send(JSON.stringify({
                                realtimeInput: { mediaChunks: [{ mimeType: "image/jpeg", data: base64Data }] }
                            }));
                        }
                    }
                } catch (e) {
                    console.warn("Frame capture error:", e);
                }
            }, 1000);
        } catch (err) {
            console.error("Camera access failed:", err);
            setError("Camera access denied or failed.");
        }
    };

    const stopVideoCapture = () => {
        if (frameIntervalRef.current) {
            clearInterval(frameIntervalRef.current);
            frameIntervalRef.current = null;
        }
        if (videoStreamRef.current) {
            videoStreamRef.current.getTracks().forEach(t => t.stop());
            videoStreamRef.current = null;
        }
        canvasRef.current = null;
    };

    const toggleCamera = useCallback(() => {
        if (cameraEnabled) {
            stopVideoCapture();
            setCameraEnabled(false);
        } else {
            startVideoCapture();
            setCameraEnabled(true);
        }
    }, [cameraEnabled]);

    return {
        status,
        agent,
        switchAgent,
        messages,
        currentMessage,
        error,
        isSpeaking,
        isAiSpeaking,
        emotion,
        breathingExercise,
        setBreathingExercise,
        cameraEnabled,
        toggleCamera,
        videoStreamRef,
        connect,
        disconnect
    };
}

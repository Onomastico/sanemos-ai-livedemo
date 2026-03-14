"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { resetPIIMappings } from '@/lib/piiScrubber';
import { getAvailableSlots, bookAppointment } from '@/lib/therapist';
import { GoogleGenAI, Modality } from '@google/genai';

function buildSystemPrompt(basePrompt, userContext, userCountry, locale, agentId) {
    const lang = locale === 'es' ? 'Spanish' : 'English';
    const langInstruction = `LANGUAGE INSTRUCTION: You MUST respond in ${lang}. This is non-negotiable — always speak and respond in ${lang} regardless of the language of the context below.\n\n`;

    let prompt = basePrompt;

    // Inject first visit logic for Sofia — read from localStorage for fresh value
    if (agentId === 'sofia') {
        let firstVisit = true;
        try { firstVisit = localStorage.getItem('sanemos_onboarding_done') !== 'true'; } catch {}
        if (firstVisit) {
            prompt = prompt.replace('This is the user\'s FIRST visit', 'This is the user\'s FIRST visit — ask if they want a guided tour');
        } else {
            prompt = prompt.replace(
                /FIRST VISIT LOGIC:[\s\S]*?(?=AGENT ROUTING:)/,
                'FIRST VISIT LOGIC:\nThis is a RETURNING user. Do NOT offer a tour. Greet briefly and ask what support they need today.\n\n'
            );
        }
    }

    if (!userContext?.detail) return langInstruction + prompt;
    const country = userCountry || userContext.country || 'Unknown';
    return `${langInstruction}USER CONTEXT: ${userContext.detail}\nUser country: ${country}.\nAdapt your response to this person's cultural and emotional context.\n\n${prompt}`;
}

function buildFunctionDeclarations(agentId, emotionToolMode = 'unified') {
    const emotionEnum = ["sadness", "anger", "fear", "guilt", "hope", "calm", "love", "numbness"];

    const declarations = [];

    // Faro should NOT be able to escalate to itself
    if (agentId !== 'faro') {
        declarations.push({
            name: "escalate_to_crisis_faro",
            description: "Call this tool IMMEDIATELY if the user expresses suicidal thoughts, self-harm, or severe distress. Do not hesitate."
        });
    }

    declarations.push(
        {
            name: "end_session",
            description: "Call this tool when the user wants to end the conversation, leave the session, or says goodbye. Say a warm farewell message BEFORE calling this tool."
        },
        {
            name: "switch_agent",
            description: "Switch to another companion when the user requests it. Acknowledge briefly before calling.",
            parameters: {
                type: "OBJECT",
                properties: {
                    agent_id: {
                        type: "STRING",
                        enum: ["sofia", "luna", "marco", "serena", "alma", "nora", "iris"],
                        description: "Agent ID: sofia (receptionist), luna, marco, serena, alma, nora, or iris"
                    }
                },
                required: ["agent_id"]
            }
        }
    );

    // Emotion tools — NOT available for Sofia (receptionist)
    if (agentId !== 'sofia') {
        if (emotionToolMode === 'unified') {
            declarations.push({
                name: "report_emotions",
                description: "Report detected emotions from text content, voice tone, and optionally facial expression. Call once silently after each user turn. Never mention this tool.",
                behavior: "NON_BLOCKING",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        text_emotion: { type: "STRING", enum: emotionEnum, description: "Emotion from word content/meaning" },
                        text_intensity: { type: "INTEGER", description: "Intensity 1 (mild) to 5 (overwhelming)" },
                        voice_emotion: { type: "STRING", enum: emotionEnum, description: "Emotion from tone of voice" },
                        voice_intensity: { type: "INTEGER", description: "Intensity 1 (mild) to 5 (overwhelming)" },
                        facial_emotion: { type: "STRING", enum: emotionEnum, description: "Emotion from facial expression (only if camera active)" },
                        facial_intensity: { type: "INTEGER", description: "Intensity 1 (mild) to 5 (overwhelming)" }
                    },
                    required: ["text_emotion", "text_intensity", "voice_emotion", "voice_intensity"]
                }
            });
        } else {
            declarations.push(
                {
                    name: "report_text_emotion",
                    description: "Report the primary emotion detected from the CONTENT/MEANING of the user's words. Call silently after each user turn. Never mention this tool to the user.",
                    behavior: "NON_BLOCKING",
                    parameters: { type: "OBJECT", properties: { emotion: { type: "STRING", enum: emotionEnum }, intensity: { type: "INTEGER", description: "Intensity from 1 (mild) to 5 (overwhelming)" } }, required: ["emotion", "intensity"] }
                },
                {
                    name: "report_voice_emotion",
                    description: "Report the emotion detected from the user's TONE OF VOICE. Call silently after each user turn. Never mention this tool.",
                    behavior: "NON_BLOCKING",
                    parameters: { type: "OBJECT", properties: { emotion: { type: "STRING", enum: emotionEnum }, intensity: { type: "INTEGER", description: "Intensity from 1 (mild) to 5 (overwhelming)" } }, required: ["emotion", "intensity"] }
                },
                {
                    name: "report_facial_emotion",
                    description: "Report the emotion detected from the user's FACIAL EXPRESSION. Only call when camera is active. Call silently. Never mention this tool.",
                    behavior: "NON_BLOCKING",
                    parameters: { type: "OBJECT", properties: { emotion: { type: "STRING", enum: emotionEnum }, intensity: { type: "INTEGER", description: "Intensity from 1 (mild) to 5 (overwhelming)" } }, required: ["emotion", "intensity"] }
                }
            );
        }
    }

    // UI tools — available to all agents except Faro
    if (agentId !== 'faro') {
        declarations.push(
            {
                name: "generate_social_post",
                description: "Show a popup with a social media post you wrote for the user. Use for commemorative dates, memorials, birthdays, etc.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        platform: { type: "STRING", enum: ["facebook", "instagram", "twitter", "general"], description: "Target social network" },
                        post_text: { type: "STRING", description: "The full post text ready to copy, with emojis if appropriate" },
                        occasion: { type: "STRING", description: "Brief label: birthday, anniversary, memorial, etc." }
                    },
                    required: ["platform", "post_text"]
                }
            },
            {
                name: "copy_to_clipboard",
                description: "Copy text to the user's clipboard. Use when they ask to copy something.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        text: { type: "STRING", description: "Text to copy" }
                    },
                    required: ["text"]
                }
            },
            {
                name: "open_url",
                description: "Open a URL in a new browser tab. Use when the user asks to open a website.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        url: { type: "STRING", description: "Full URL starting with https://" }
                    },
                    required: ["url"]
                }
            },
            {
                name: "dismiss_modal",
                description: "Close any open popup/modal on screen. Use when the user says to close it or continue."
            },
            {
                name: "show_diary",
                description: "Open the user's personal diary so they can view their saved entries. Call when the user asks to see their diary, journal, or past entries."
            },
            {
                name: "show_appointments",
                description: "Open the user's appointments view so they can see their scheduled appointments. Call when the user asks to see their appointments, upcoming visits, or booked sessions."
            }
        );

        // Diary & Therapist tools — available to all except Faro
        // Sofia gets them too for post-session review (operates on previous session data)
        if (agentId !== 'faro') {
            declarations.push(
                {
                    name: "save_diary_entry",
                    description: agentId === 'sofia'
                        ? "Save the previous session to the user's diary. Call when the user wants to save their session or you suggest it."
                        : "Save a diary entry from this session. Call when the user wants to save their thoughts or when offering to save.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            title: { type: "STRING", description: "Title for the diary entry (optional, e.g. 'Sesión sobre pérdida')" }
                        }
                    }
                },
                {
                    name: "send_to_therapist",
                    description: agentId === 'sofia'
                        ? "Send a summary of the previous session to a therapist. Prepare a brief, professional summary."
                        : "Send a summary of this session to a therapist. Prepare a brief, professional summary text.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            summary_text: { type: "STRING", description: "Summary of the session to send" }
                        },
                        required: ["summary_text"]
                    }
                },
                {
                    name: "schedule_appointment",
                    description: "Open the appointment booking interface so the user can pick a time visually."
                },
                {
                    name: "book_appointment",
                    description: "Directly book an appointment for a specific date and time. Use this when the user tells you their preferred day and time (e.g., 'Monday at 5pm'). Available slots are next 3 business days at 10:00, 15:00, 17:00.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            preferred_day: { type: "STRING", description: "Day of week or date the user wants (e.g. 'lunes', 'Monday', 'March 16')" },
                            preferred_time: { type: "STRING", description: "Time the user wants (e.g. '17:00', '5pm', '10 de la mañana')" }
                        },
                        required: ["preferred_day", "preferred_time"]
                    }
                }
            );
        }

        // Sofia-specific tool: mark onboarding as done
        if (agentId === 'sofia') {
            declarations.push({
                name: "mark_onboarding_done",
                description: "Mark the onboarding as done. Call this IMMEDIATELY after the tour finishes OR when the user declines the tour."
            });
        }
    }

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

export function useGeminiLive(apiKey, initialAgent, onEscalateToFaro, onEndSession, onSwitchAgent, userContext, userCountry, settings, locale) {
    const [status, setStatus] = useState('disconnected'); // disconnected, connecting, connected
    const [agent, setAgent] = useState(initialAgent);
    const [messages, setMessages] = useState([]);         // completed full messages
    const messagesRef = useRef([]);                        // ref mirror for stale-closure-safe access in ws.onmessage
    const [currentMessage, setCurrentMessage] = useState(null); // in-progress message {text, sender}
    const currentMsgRef = useRef(null); // accumulator ref (avoids stale closure in ws.onmessage)
    const [error, setError] = useState(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const [emotion, setEmotion] = useState(null);               // { text, voice, facial } multi-source emotion
    const [breathingExercise, setBreathingExercise] = useState(null); // breathing params from Serena
    const [cameraEnabled, setCameraEnabled] = useState(false);
    const [socialPost, setSocialPost] = useState(null);         // { platform, post_text, occasion }
    const [uiToast, setUiToast] = useState(null);               // toast message string
    const [latency, setLatency] = useState(null);                // WebSocket latency in ms
    const [emotionHistory, setEmotionHistory] = useState([]);    // emotion timeline data
    const [diaryAction, setDiaryAction] = useState(null);       // { type: 'save', title }
    const [therapistAction, setTherapistAction] = useState(null); // { type: 'send', summary_text }
    const [showAppointment, setShowAppointment] = useState(false); // show appointment booking modal
    const dismissSummaryCallbackRef = useRef(null); // callback to close SessionSummary from voice commands
    const [showDiaryModal, setShowDiaryModal] = useState(false); // show diary viewer modal
    const [showAppointmentsModal, setShowAppointmentsModal] = useState(false); // show appointments viewer modal
    const lastSessionDataRef = useRef(null); // stores previous session data for Sofia post-session review

    const wsRef = useRef(null);
    const lastAudioSentRef = useRef(null);                       // timestamp of last audio send
    const latencyHistoryRef = useRef([]);                         // recent latency samples
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
    const pendingSwitchAgentIdRef = useRef(null);
    const pauseAudioInputRef = useRef(false);
    const closingIntentionallyRef = useRef(false);
    const videoStreamRef = useRef(null);
    const canvasRef = useRef(null);
    const frameIntervalRef = useRef(null);
    const onEscalateToFaroRef = useRef(onEscalateToFaro);
    onEscalateToFaroRef.current = onEscalateToFaro;
    const onEndSessionRef = useRef(onEndSession);
    onEndSessionRef.current = onEndSession;
    const onSwitchAgentRef = useRef(onSwitchAgent);
    onSwitchAgentRef.current = onSwitchAgent;
    messagesRef.current = messages;
    const userContextRef = useRef(userContext);
    userContextRef.current = userContext;
    const userCountryRef = useRef(userCountry);
    userCountryRef.current = userCountry;
    const settingsRef = useRef(settings);
    settingsRef.current = settings;
    const localeRef = useRef(locale);
    localeRef.current = locale;

    const turnCompleteTimerRef = useRef(null);
    const autoReconnectRef = useRef(false);
    const autoReconnectJustHappenedRef = useRef(false);
    const reconnectCountRef = useRef(0);
    const reconnectStabilityTimerRef = useRef(null);
    const sessionIdCounterRef = useRef(0);
    const activeSessionIdRef = useRef(0);

    // Finalize the current in-progress message → push to completed messages
    const finalizeCurrentMessage = () => {
        const cur = currentMsgRef.current;
        if (cur && cur.text.trim()) {
            setMessages(prev => [...prev, { text: cur.text.trim(), sender: cur.sender, timestamp: cur.timestamp || Date.now() }]);
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
                setMessages(prev => [...prev, { text: cur.text.trim(), sender: cur.sender, timestamp: cur.timestamp || Date.now() }]);
            }
            currentMsgRef.current = { text: cleaned, sender, timestamp: Date.now() };
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
        // On auto-reconnect (1008/1011), preserve transcript history
        if (autoReconnectRef.current) {
            autoReconnectRef.current = false;
        } else {
            setMessages([]);
        }
        setCurrentMessage(null);
        currentMsgRef.current = null;
        // Don't reset closingIntentionallyRef here — old WS onclose may still fire.
        // It resets in ws.onopen when the new connection is actually established.
        resetPIIMappings();

        try {
            const safeApiKey = typeof apiKey === 'string' ? apiKey.trim() : "";
            const ai = new GoogleGenAI({ apiKey: safeApiKey });

            const s = settingsRef.current || {};
            const config = {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: agent.voiceName || 'Aoede'
                        }
                    }
                },
                systemInstruction: buildSystemPrompt(agent.systemPrompt, userContextRef.current, userCountryRef.current, localeRef.current, agent.id),
                tools: [{ functionDeclarations: buildFunctionDeclarations(agent.id, s.emotionToolMode || 'unified') }]
            };
            // Apply tuning parameters from settings
            if (s.temperature !== undefined) config.temperature = s.temperature;
            if (s.topK !== undefined) config.topK = s.topK;
            if (s.topP !== undefined) config.topP = s.topP;
            if (s.thinkingBudget !== undefined) config.thinkingConfig = { thinkingBudget: s.thinkingBudget };
            // Transcription — conditional based on settings
            if (s.transcription !== false) {
                config.inputAudioTranscription = {};
                config.outputAudioTranscription = {};
            }

            // Session ID for stale callback detection (replaces wsRef.current !== ws pattern)
            const mySessionId = ++sessionIdCounterRef.current;
            activeSessionIdRef.current = mySessionId;

            const session = await ai.live.connect({
                model: "models/gemini-2.5-flash-native-audio-preview-12-2025",
                config,
                callbacks: {
                    onopen: () => {
                        // SDK handles setup message internally
                    },
                    onmessage: (msg) => {
                        try {
                            if (activeSessionIdRef.current !== mySessionId) return;

                            // Debug: log message types received
                            const msgKeys = [];
                            if (msg.serverContent?.modelTurn) msgKeys.push('modelTurn');
                            if (msg.serverContent?.inputTranscription || msg.serverContent?.input_transcription) msgKeys.push('inputTranscript');
                            if (msg.serverContent?.outputTranscription || msg.serverContent?.output_transcription) msgKeys.push('outputTranscript');
                            if (msg.serverContent?.turnComplete) msgKeys.push('turnComplete');
                            if (msg.toolCall) msgKeys.push('toolCall:' + (msg.toolCall.functionCalls?.map(c => c.name).join(',') || '?'));
                            if (msgKeys.length) console.log(`📩 [${new Date().toLocaleTimeString()}] ${msgKeys.join(' | ')}`);

                            // Handle audio playback from model + latency measurement
                            if (msg.serverContent?.modelTurn?.parts) {
                                // Measure latency on first audio chunk of a response
                                if (lastAudioSentRef.current) {
                                    const rtt = Math.round(performance.now() - lastAudioSentRef.current);
                                    lastAudioSentRef.current = null;
                                    latencyHistoryRef.current.push(rtt);
                                    if (latencyHistoryRef.current.length > 5) latencyHistoryRef.current.shift();
                                    const avg = Math.round(latencyHistoryRef.current.reduce((a, b) => a + b, 0) / latencyHistoryRef.current.length);
                                    setLatency(avg);
                                }
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

                            if (inputText) {
                                console.log(`🗣️ [${new Date().toLocaleTimeString()}] USER transcript: "${inputText}"`);
                                appendFragment(inputText, 'user');
                            }
                            if (outputText) {
                                console.log(`🤖 [${new Date().toLocaleTimeString()}] AI transcript: "${outputText}"`);
                                appendFragment(outputText, 'ai');
                            }

                            // turnComplete signals end of AI turn — schedule finalize with delay
                            // to let trailing transcription fragments arrive
                            if (sc?.turnComplete && currentMsgRef.current?.sender === 'ai') {
                                console.log(`✅ [${new Date().toLocaleTimeString()}] AI turnComplete — scheduling finalize`);
                                scheduleFinalizeAiMessage();

                            }

                            // Handle Tool Calls — dispatch each call and send toolResponse
                            if (msg.toolCall?.functionCalls) {
                                const responses = [];
                                for (const call of msg.toolCall.functionCalls) {
                                    if (call.name === 'escalate_to_crisis_faro') {
                                        console.warn("⚠️ CRISIS DETECTED. RECONNECTING AS FARO.");
                                        pauseAudioInputRef.current = true;
                                        if (onEscalateToFaroRef.current) onEscalateToFaroRef.current();
                                        return; // Session will be torn down, no response needed
                                    }
                                    if (call.name === 'end_session') {
                                        console.log("🚪 END SESSION requested by agent.");
                                        pauseAudioInputRef.current = true;
                                        closingIntentionallyRef.current = true;
                                        // Wait for farewell audio to finish playing, then exit
                                        let checks = 0;
                                        const waitForAudio = () => {
                                            checks++;
                                            if (activeSourcesRef.current <= 0 || checks > 24) {
                                                // Audio done or 12s max — exit
                                                if (onEndSessionRef.current) onEndSessionRef.current();
                                            } else {
                                                setTimeout(waitForAudio, 500);
                                            }
                                        };
                                        // Initial delay to let audio chunks start arriving
                                        setTimeout(waitForAudio, 1500);
                                        return; // Don't send toolResponse — session is ending
                                    }
                                    if (call.name === 'switch_agent') {
                                        const agentId = call.args?.agent_id;
                                        console.log(`🔄 SWITCH AGENT requested: ${agentId}`);
                                        pauseAudioInputRef.current = true;
                                        pendingSwitchAgentIdRef.current = agentId;
                                        closingIntentionallyRef.current = true;
                                        // Send toolResponse so the server doesn't crash with 1011
                                        if (wsRef.current) {
                                            try {
                                                wsRef.current.sendToolResponse({ functionResponses: [{
                                                    id: call.id,
                                                    name: call.name,
                                                    response: { result: { success: true } }
                                                }] });
                                            } catch (_) {}
                                        }
                                        // Wait for farewell audio to finish, then switch
                                        let switchChecks = 0;
                                        const waitAndSwitch = () => {
                                            switchChecks++;
                                            if (activeSourcesRef.current <= 0 || switchChecks > 20) {
                                                pendingSwitchAgentIdRef.current = null; // Clear — switch completing normally
                                                if (onSwitchAgentRef.current) onSwitchAgentRef.current(agentId);
                                            } else {
                                                setTimeout(waitAndSwitch, 500);
                                            }
                                        };
                                        setTimeout(waitAndSwitch, 1000);
                                        return;
                                    }
                                    // Unified emotion tool (1 call per turn)
                                    if (call.name === 'report_emotions') {
                                        const args = call.args || {};
                                        const now = Date.now();
                                        const newEmotion = {};
                                        if (args.text_emotion) {
                                            const e = { emotion: args.text_emotion, intensity: args.text_intensity || 3 };
                                            newEmotion.text = e;
                                            setEmotionHistory(prev => [...prev, { timestamp: now, source: 'text', ...e }]);
                                        }
                                        if (args.voice_emotion) {
                                            const e = { emotion: args.voice_emotion, intensity: args.voice_intensity || 3 };
                                            newEmotion.voice = e;
                                            setEmotionHistory(prev => [...prev, { timestamp: now, source: 'voice', ...e }]);
                                        }
                                        if (args.facial_emotion) {
                                            const e = { emotion: args.facial_emotion, intensity: args.facial_intensity || 3 };
                                            newEmotion.facial = e;
                                            setEmotionHistory(prev => [...prev, { timestamp: now, source: 'facial', ...e }]);
                                        }
                                        setEmotion(prev => ({ ...prev, ...newEmotion }));
                                    }
                                    // Separate emotion tools (3 calls per turn — legacy mode)
                                    if (call.name === 'report_text_emotion') {
                                        const args = call.args || {};
                                        const entry = { emotion: args.emotion, intensity: args.intensity || 3 };
                                        setEmotion(prev => ({ ...prev, text: entry }));
                                        setEmotionHistory(prev => [...prev, { timestamp: Date.now(), source: 'text', ...entry }]);
                                    }
                                    if (call.name === 'report_voice_emotion') {
                                        const args = call.args || {};
                                        const entry = { emotion: args.emotion, intensity: args.intensity || 3 };
                                        setEmotion(prev => ({ ...prev, voice: entry }));
                                        setEmotionHistory(prev => [...prev, { timestamp: Date.now(), source: 'voice', ...entry }]);
                                    }
                                    if (call.name === 'report_facial_emotion') {
                                        const args = call.args || {};
                                        const entry = { emotion: args.emotion, intensity: args.intensity || 3 };
                                        setEmotion(prev => ({ ...prev, facial: entry }));
                                        setEmotionHistory(prev => [...prev, { timestamp: Date.now(), source: 'facial', ...entry }]);
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
                                    if (call.name === 'generate_social_post') {
                                        const args = call.args || {};
                                        setSocialPost({ platform: args.platform || 'general', post_text: args.post_text || '', occasion: args.occasion || '' });
                                    }
                                    if (call.name === 'copy_to_clipboard') {
                                        const text = call.args?.text || '';
                                        navigator.clipboard.writeText(text).catch(e => console.warn('Clipboard failed:', e));
                                        setUiToast('Copiado al portapapeles');
                                        setTimeout(() => setUiToast(null), 3000);
                                    }
                                    if (call.name === 'open_url') {
                                        const url = call.args?.url || '';
                                        if (url.startsWith('http://') || url.startsWith('https://')) {
                                            window.open(url, '_blank');
                                            setUiToast('Abriendo enlace...');
                                            setTimeout(() => setUiToast(null), 3000);
                                        }
                                    }
                                    if (call.name === 'dismiss_modal') {
                                        setSocialPost(null);
                                        setShowDiaryModal(false);
                                        setShowAppointmentsModal(false);
                                        setShowAppointment(false);
                                        if (dismissSummaryCallbackRef.current) dismissSummaryCallbackRef.current();
                                    }
                                    if (call.name === 'show_diary') {
                                        setShowDiaryModal(true);
                                    }
                                    if (call.name === 'show_appointments') {
                                        setShowAppointmentsModal(true);
                                    }
                                    if (call.name === 'save_diary_entry') {
                                        const args = call.args || {};
                                        // Safety check: use messagesRef (not messages) to avoid stale closure
                                        // Also accept if lastSessionDataRef has data (Sofia post-session review)
                                        if (currentMsgRef.current || messagesRef.current.length > 2 || lastSessionDataRef.current) {
                                            setDiaryAction({ type: 'save', title: args.title });
                                        } else {
                                            setUiToast('No hay sesión para guardar');
                                            setTimeout(() => setUiToast(null), 3000);
                                        }
                                    }
                                    if (call.name === 'send_to_therapist') {
                                        const args = call.args || {};
                                        if (currentMsgRef.current || messagesRef.current.length > 2 || lastSessionDataRef.current) {
                                            setTherapistAction({ type: 'send', summary_text: args.summary_text });
                                        } else {
                                            setUiToast('No hay sesión para enviar');
                                            setTimeout(() => setUiToast(null), 3000);
                                        }
                                    }
                                    if (call.name === 'schedule_appointment') {
                                        // Schedule can happen anytime — open visual picker
                                        setShowAppointment(true);
                                    }
                                    if (call.name === 'book_appointment') {
                                        // Try to auto-book by matching preferred day/time to available slots
                                        const args = call.args || {};
                                        const dayPref = (args.preferred_day || '').toLowerCase().replace(/[,.\-]/g, ' ').replace(/\s+/g, ' ').trim();
                                        const timePref = (args.preferred_time || '').toLowerCase();
                                        const slots = getAvailableSlots();
                                        // Normalize time to HH:MM
                                        let targetTime = null;
                                        const timeMatch = timePref.match(/(\d{1,2})[:\s]*(\d{2})?/);
                                        if (timeMatch) {
                                            let h = parseInt(timeMatch[1]);
                                            const m = timeMatch[2] || '00';
                                            if (timePref.includes('pm') && h < 12) h += 12;
                                            if (timePref.includes('am') && h === 12) h = 0;
                                            targetTime = `${String(h).padStart(2, '0')}:${m}`;
                                        }
                                        // Match slot by day name/date and time
                                        // Normalize displayDate too (remove commas/punctuation) for reliable matching
                                        const matched = slots.find(s => {
                                            const dStr = s.displayDate.toLowerCase().replace(/[,.\-]/g, ' ').replace(/\s+/g, ' ');
                                            // Check if all words in dayPref appear in the display date
                                            const dayWords = dayPref.split(' ').filter(Boolean);
                                            const dayMatch = dayWords.length > 0 && dayWords.every(w => dStr.includes(w));
                                            // Also try matching against the raw date string (YYYY-MM-DD)
                                            const dateMatch = dayPref && s.date.includes(dayPref);
                                            const timeOk = !targetTime || s.displayTime === targetTime;
                                            return (dayMatch || dateMatch) && timeOk;
                                        });
                                        if (matched) {
                                            bookAppointment(matched);
                                            setShowAppointment(false);
                                        } else {
                                            // No match — open the manual picker as fallback
                                            setShowAppointment(true);
                                        }
                                    }
                                    if (call.name === 'mark_onboarding_done') {
                                        // Mark onboarding as done in localStorage
                                        localStorage.setItem('sanemos_onboarding_done', 'true');
                                        setUiToast('¡Bienvenido/a!');
                                        setTimeout(() => setUiToast(null), 3000);
                                    }
                                    // Observation tools (NON_BLOCKING): send toolResponse immediately
                                    // with scheduling: "SILENT" so model absorbs result without
                                    // restarting or interrupting its current audio generation
                                    const silentTools = [
                                        'report_emotions',
                                        'report_text_emotion',
                                        'report_voice_emotion',
                                        'report_facial_emotion',
                                        'generate_social_post',
                                        'save_diary_entry',
                                        'send_to_therapist',
                                        'schedule_appointment',
                                        'book_appointment',
                                        'show_diary',
                                        'show_appointments',
                                        'copy_to_clipboard',
                                        'open_url',
                                        'dismiss_modal',
                                        'start_breathing_exercise',
                                        'stop_breathing_exercise',
                                        'mark_onboarding_done'
                                    ];
                                    if (silentTools.includes(call.name)) {
                                        console.log(`👁️ [${new Date().toLocaleTimeString()}] Sending SILENT toolResponse for: ${call.name}`);
                                        try {
                                            wsRef.current.sendToolResponse({ functionResponses: [{
                                                id: call.id,
                                                name: call.name,
                                                response: { result: { success: true } },
                                                scheduling: "SILENT"
                                            }] });
                                        } catch (err) {
                                            console.warn('👁️ SILENT sendToolResponse failed:', err.message || err);
                                        }
                                        continue;
                                    }
                                    // Queue toolResponse for non-escalation, non-observation calls
                                    responses.push({
                                        id: call.id,
                                        name: call.name,
                                        response: { result: { success: true } }
                                    });
                                }
                                // Send all toolResponses so the model continues
                                if (responses.length > 0 && wsRef.current) {
                                    console.log(`🔧 [${new Date().toLocaleTimeString()}] Sending toolResponse for: ${responses.map(r => r.name).join(', ')}`);
                                    try {
                                        wsRef.current.sendToolResponse({ functionResponses: responses });
                                    } catch (err) {
                                        console.error('🔧 sendToolResponse FAILED:', err.message || err);
                                    }
                                }
                            }

                        } catch (e) {
                            console.error("Message handling error:", e);
                        }
                    },
                    onerror: (e) => {
                        if (activeSessionIdRef.current !== mySessionId || closingIntentionallyRef.current) return;
                        console.error("Session Error:", e);
                        const errorMessage = e && e.message ? e.message : "Ensure your API Key is valid and supports the Multimodal Live API. Check API Key restrictions.";
                        setError(`Connection failed. ${errorMessage}`);
                        setStatus('disconnected');
                        cleanupAudio();
                    },
                    onclose: (event) => {
                        if (activeSessionIdRef.current !== mySessionId) return;
                        // If closing intentionally but there's a pending switch that hasn't completed,
                        // let the 1011/1008 handler complete the switch instead of dropping it
                        const hasPendingSwitch = !!pendingSwitchAgentIdRef.current;
                        if (closingIntentionallyRef.current && !hasPendingSwitch) return;
                        const code = event?.code || 0;
                        const reason = event?.reason || '';
                        console.log(`Session closed. Code: ${code}, Reason: ${reason}`);
                        // 1008 = session expired/not found, 1011 = server internal error
                        // Auto-reconnect transparently for both
                        if (code === 1008 || code === 1011) {
                            // If there's a pending switch_agent, complete the switch instead of reconnecting as same agent
                            if (pendingSwitchAgentIdRef.current) {
                                const targetAgentId = pendingSwitchAgentIdRef.current;
                                pendingSwitchAgentIdRef.current = null;
                                closingIntentionallyRef.current = false;
                                console.log(`🔄 WS ${code} during switch — completing switch to ${targetAgentId}`);
                                cleanupAudio();
                                wsRef.current = null;
                                if (onSwitchAgentRef.current) onSwitchAgentRef.current(targetAgentId);
                                return;
                            }
                            reconnectCountRef.current += 1;
                            const count = reconnectCountRef.current;
                            if (count > 5) {
                                console.warn(`Too many reconnects (${count}), stopping.`);
                                setError('Connection lost after multiple retries. Please reconnect manually.');
                                setStatus('disconnected');
                                cleanupAudio();
                                reconnectCountRef.current = 0;
                                return;
                            }
                            const delay = Math.min(2000 * Math.pow(2, count - 1), 8000);
                            console.log(`Server error (${code}), auto-reconnecting in ${delay}ms (attempt ${count}/5)...`);
                            cleanupAudio();
                            wsRef.current = null;
                            // Finalize any in-progress message before reconnect to prevent duplication
                            const pending = currentMsgRef.current;
                            if (pending && pending.text.trim()) {
                                setMessages(prev => [...prev, { text: pending.text.trim(), sender: pending.sender, timestamp: pending.timestamp || Date.now() }]);
                            }
                            currentMsgRef.current = null;
                            setCurrentMessage(null);
                            clearTimeout(turnCompleteTimerRef.current);
                            autoReconnectRef.current = true;
                            autoReconnectJustHappenedRef.current = true;
                            setTimeout(() => connect(), delay);
                            return;
                        }
                        if (code !== 1000 && code !== 1005) {
                            setError(`Connection closed abnormally: ${code} ${reason}`);
                        }
                        setStatus('disconnected');
                        cleanupAudio();
                    }
                }
            });

            wsRef.current = session;
            closingIntentionallyRef.current = false;
            pauseAudioInputRef.current = false;
            // Only reset reconnect counter for fresh connects, not auto-reconnects.
            // For auto-reconnects, reset after 30s of stable connection to prevent infinite loops.
            if (!autoReconnectJustHappenedRef.current) {
                reconnectCountRef.current = 0;
            } else {
                clearTimeout(reconnectStabilityTimerRef.current);
                reconnectStabilityTimerRef.current = setTimeout(() => { reconnectCountRef.current = 0; }, 30000);
            }
            setStatus('connected');

            // Start audio capture
            startAudioCapture();

            // Send a context message to prime the agent to speak first
            const contextMsg = pendingSwitchContextRef.current;
            pendingSwitchContextRef.current = null;
            // For Sofia on initial connect (no switch context), auto-greet
            // On auto-reconnect, don't re-greet — just resume
            const isReconnect = autoReconnectJustHappenedRef.current;
            autoReconnectJustHappenedRef.current = false;
            let primeMsg = contextMsg || null;
            if (!primeMsg) {
                if (isReconnect) {
                    // On auto-reconnect, send a resume prime so the agent re-engages
                    primeMsg = 'The session was briefly interrupted by a network issue. Continue the conversation naturally — greet the user again briefly and ask how you can help.';
                } else if (agent.isReceptionist) {
                    primeMsg = 'The user just arrived. Greet them warmly and start the conversation.';
                }
            }
            if (primeMsg) {
                setTimeout(() => {
                    if (wsRef.current) {
                        try {
                            wsRef.current.sendClientContent({
                                turns: [{ role: "user", parts: [{ text: primeMsg }] }],
                                turnComplete: true
                            });
                        } catch (_) {}
                    }
                }, 150);
            }

        } catch (err) {
            setError(err.message);
            setStatus('disconnected');
        }
    }, [apiKey, agent.systemPrompt]);

    const disconnect = useCallback(() => {
        closingIntentionallyRef.current = true;
        activeSessionIdRef.current = 0; // invalidate old session callbacks
        if (wsRef.current) {
            try { wsRef.current.close(); } catch (_) {}
            wsRef.current = null;
        }
        cleanupAudio();
        setStatus('disconnected');
    }, []);

    // Switch to a new agent: disconnect current session and reconnect with new system prompt
    const switchAgent = useCallback((newAgent, contextMessage) => {
        pendingSwitchAgentIdRef.current = null; // Clear — switch is being executed
        setAgent(newAgent);
        setBreathingExercise(null);
        setEmotion(null);
        reconnectCountRef.current = 0;
        if (contextMessage) {
            pendingSwitchContextRef.current = contextMessage;
        }
        // Invalidate old session callbacks and close to prevent late 1011/1008 errors
        closingIntentionallyRef.current = true;
        activeSessionIdRef.current = 0;
        if (wsRef.current) {
            try { wsRef.current.close(); } catch (_) {}
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

    // Audio Capture using AudioWorklet (runs on separate thread — immune to main thread jank)
    const startAudioCapture = async () => {
        // Clean up any existing audio pipeline first (React Strict Mode double-mounts)
        if (processorRef.current || audioContextRef.current) {
            console.log('🎤 Cleaning up existing audio pipeline before creating new one');
            if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
            if (audioInputRef.current) { audioInputRef.current.disconnect(); audioInputRef.current = null; }
            if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null; }
            if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
        }
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

            const audioCtx = new AudioContext({ sampleRate: 16000 });
            audioContextRef.current = audioCtx;

            // Register AudioWorklet processor via inline Blob URL (no separate file needed)
            const workletCode = `
                class PcmCaptureProcessor extends AudioWorkletProcessor {
                    constructor() {
                        super();
                        this._buffer = new Float32Array(0);
                        this._bufferSize = 2048;
                    }
                    process(inputs) {
                        const input = inputs[0];
                        if (!input || !input[0]) return true;
                        const channelData = input[0]; // 128 samples per call at 16kHz

                        // Accumulate samples until we have bufferSize worth
                        const newBuf = new Float32Array(this._buffer.length + channelData.length);
                        newBuf.set(this._buffer);
                        newBuf.set(channelData, this._buffer.length);
                        this._buffer = newBuf;

                        while (this._buffer.length >= this._bufferSize) {
                            const chunk = this._buffer.slice(0, this._bufferSize);
                            this._buffer = this._buffer.slice(this._bufferSize);

                            // Convert Float32 to Int16 PCM
                            const pcm16 = new Int16Array(chunk.length);
                            for (let i = 0; i < chunk.length; i++) {
                                let s = Math.max(-1, Math.min(1, chunk[i]));
                                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                            }

                            // Compute RMS for voice activity detection
                            let sum = 0;
                            for (let i = 0; i < chunk.length; i++) sum += chunk[i] * chunk[i];
                            const rms = Math.sqrt(sum / chunk.length);

                            this.port.postMessage({ pcm16: pcm16.buffer, rms }, [pcm16.buffer]);
                        }
                        return true;
                    }
                }
                registerProcessor('pcm-capture-processor', PcmCaptureProcessor);
            `;
            const blob = new Blob([workletCode], { type: 'application/javascript' });
            const workletUrl = URL.createObjectURL(blob);
            await audioCtx.audioWorklet.addModule(workletUrl);
            URL.revokeObjectURL(workletUrl);

            const source = audioCtx.createMediaStreamSource(stream);
            audioInputRef.current = source;

            const workletNode = new AudioWorkletNode(audioCtx, 'pcm-capture-processor');
            processorRef.current = workletNode;

            // Receive PCM data from the worklet thread
            let audioFrameCount = 0;
            let audioErrorCount = 0;
            let lastAudioLog = 0;
            workletNode.port.onmessage = (e) => {
                if (!wsRef.current) return;
                const { pcm16, rms } = e.data;

                // Voice activity detection on main thread (lightweight — just state update)
                if (rms > 0.01) {
                    setIsSpeaking(true);
                    clearTimeout(speakingTimeoutRef.current);
                    speakingTimeoutRef.current = setTimeout(() => setIsSpeaking(false), 400);
                }

                // Convert Int16 PCM buffer to base64
                const bytes = new Uint8Array(pcm16);
                const chunks = [];
                for (let i = 0; i < bytes.length; i += 8192) {
                    chunks.push(String.fromCharCode.apply(null, bytes.subarray(i, i + 8192)));
                }
                const base64Audio = btoa(chunks.join(''));

                audioFrameCount++;
                const now = performance.now();
                if (now - lastAudioLog > 5000) {
                    console.log(`🎤 Audio (Worklet): ${audioFrameCount} frames sent, ${audioErrorCount} errors, RMS=${rms.toFixed(4)}`);
                    audioFrameCount = 0;
                    audioErrorCount = 0;
                    lastAudioLog = now;
                }

                lastAudioSentRef.current = now;
                // Pause audio input during destructive tool calls to prevent VAD barge-in canceling the tool call (causes 1011)
                if (pauseAudioInputRef.current) return;
                try {
                    wsRef.current.sendRealtimeInput({ audio: { mimeType: "audio/pcm;rate=16000", data: base64Audio } });
                } catch (err) {
                    audioErrorCount++;
                    if (audioErrorCount <= 3) console.error('🎤 sendRealtimeInput error:', err.message || err);
                }
            };

            source.connect(workletNode);
            // AudioWorkletNode doesn't need to connect to destination (no output needed)

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

            const vidInterval = settingsRef.current?.videoInterval || 2000;
            const vidQuality = settingsRef.current?.videoQuality || 0.4;
            frameIntervalRef.current = setInterval(() => {
                try {
                    if (wsRef.current && video.readyState >= 2) {
                        ctx.drawImage(video, 0, 0, 320, 240);
                        const dataUrl = canvas.toDataURL('image/jpeg', vidQuality);
                        const base64Data = dataUrl.split(',')[1];
                        if (base64Data) {
                            wsRef.current.sendRealtimeInput({ video: { mimeType: "image/jpeg", data: base64Data } });
                        }
                    }
                } catch (e) {
                    console.warn("Frame capture error:", e);
                }
            }, vidInterval);
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
        socialPost,
        setSocialPost,
        uiToast,
        setUiToast,
        latency,
        emotionHistory,
        diaryAction,
        setDiaryAction,
        therapistAction,
        setTherapistAction,
        showAppointment,
        setShowAppointment,
        showDiaryModal,
        setShowDiaryModal,
        showAppointmentsModal,
        setShowAppointmentsModal,
        lastSessionDataRef,
        dismissSummaryCallbackRef,
        connect,
        disconnect
    };
}

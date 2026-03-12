"use client";

import { useEffect, useRef, useState } from 'react';
import { useGeminiLive } from '@/hooks/useGeminiLive';
import { getAgent } from '@/lib/agents';
import { maskPII } from '@/lib/piiScrubber';
import BreathingVisualizer from './BreathingVisualizer';
import SessionSummary from './SessionSummary';
import SocialPostModal from './SocialPostModal';

const EMOTION_COLORS = {
    sadness: '#4A90D9', anger: '#D94A4A', fear: '#9B59B6',
    guilt: '#7F8C8D', hope: '#2ECC71', calm: '#1ABC9C',
    love: '#E91E8F', numbness: '#636E72'
};

const EMOTION_LABELS = {
    sadness: 'Tristeza', anger: 'Enojo', fear: 'Miedo',
    guilt: 'Culpa', hope: 'Esperanza', calm: 'Calma',
    love: 'Amor', numbness: 'Vacío'
};

export default function GeminiLiveSession({ agent: initialAgent, apiKey, userContext, userCountry, onClose }) {
    const [isFaroMode, setIsFaroMode] = useState(false);
    const [showSidePanel, setShowSidePanel] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [activeTooltip, setActiveTooltip] = useState(null);
    const sidePanelRef = useRef(null);
    const videoPipRef = useRef(null);
    const handleExitRef = useRef(null);

    const handleEscalateToFaro = () => {
        setIsFaroMode(true);
        const faroAgent = getAgent('faro');
        if (faroAgent) switchAgent(faroAgent, "El usuario acaba de ser transferido porque expresó pensamientos de hacerse daño. Preséntate como Faro, el agente de crisis, y responde con empatía inmediata en español. Hazle saber que estás aquí para ayudarle.");
    };

    const handleSwitchAgent = (agentId) => {
        const newAgent = getAgent(agentId);
        if (!newAgent) return;
        if (agentId === 'faro') return; // Faro only via crisis escalation
        setIsFaroMode(false);
        switchAgent(newAgent, `El usuario pidió cambiar a hablar contigo. Preséntate brevemente como ${newAgent.name} y continúa la conversación con naturalidad en español.`);
    };

    const {
        status, agent, messages, currentMessage, error,
        isSpeaking, isAiSpeaking, emotion, breathingExercise, setBreathingExercise,
        cameraEnabled, toggleCamera, videoStreamRef,
        socialPost, setSocialPost, uiToast,
        switchAgent, connect, disconnect
    } = useGeminiLive(apiKey, initialAgent, handleEscalateToFaro, () => handleExitRef.current?.(), handleSwitchAgent, userContext, userCountry);

    useEffect(() => {
        connect();
        return () => {
            disconnect();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-scroll side panel
    useEffect(() => {
        if (sidePanelRef.current) {
            sidePanelRef.current.scrollTop = sidePanelRef.current.scrollHeight;
        }
    }, [messages]);

    // Attach video stream to PIP element — poll briefly because stream is created async
    useEffect(() => {
        if (!cameraEnabled) return;
        let attempts = 0;
        const tryAttach = () => {
            if (videoPipRef.current && videoStreamRef.current) {
                videoPipRef.current.srcObject = videoStreamRef.current;
            } else if (attempts < 20) {
                attempts++;
                setTimeout(tryAttach, 150);
            }
        };
        tryAttach();
    }, [cameraEnabled]);

    const activeColor = isFaroMode ? '#E85D75' : agent.color;
    const activeName = isFaroMode ? 'Faro (Crisis Agent)' : agent.name;
    const primaryEmotion = emotion?.text || emotion?.voice || emotion?.facial || null;
    const emotionColor = primaryEmotion ? EMOTION_COLORS[primaryEmotion.emotion] : null;
    const emotionOpacity = primaryEmotion ? Math.min(primaryEmotion.intensity / 5, 1) * 0.3 : 0;

    // Exit handler — show summary if meaningful conversation happened
    const handleExit = () => {
        if (messages.length > 2) {
            disconnect();
            setShowSummary(true);
        } else {
            onClose();
        }
    };
    handleExitRef.current = handleExit;

    // Show summary screen
    if (showSummary) {
        return (
            <SessionSummary
                messages={messages}
                agentName={activeName}
                agentColor={activeColor}
                apiKey={apiKey}
                onClose={onClose}
            />
        );
    }

    return (
        <div className="fixed inset-0 bg-black z-50 flex overflow-hidden" style={{ '--dynamic-color': activeColor }}>
            {/* Background Glow — blends agent color + emotion color */}
            <div
                className="absolute inset-0 transition-all duration-1000 opacity-20 pointer-events-none"
                style={{ background: `radial-gradient(circle at center, var(--dynamic-color) 0%, transparent 70%)` }}
            />
            {emotionColor && (
                <div
                    className="absolute inset-0 transition-all duration-2000 pointer-events-none"
                    style={{
                        background: `radial-gradient(circle at center, ${emotionColor} 0%, transparent 60%)`,
                        opacity: emotionOpacity
                    }}
                />
            )}

            {isFaroMode && (
                <div className="absolute top-0 w-full bg-[#E85D75] text-white py-2 px-4 shadow-lg text-center font-bold z-50 text-sm">
                    MODO DE RIESGO VITAL ACTIVADO. Por favor, si estas en peligro inminente llama al *4141 en Chile o acude a urgencias.
                </div>
            )}

            {/* ===== SIDE PANEL — Conversation History ===== */}
            <div className={`
                z-30 flex flex-col border-r border-white/[0.06] bg-black/80 backdrop-blur-md shrink-0 transition-all duration-300
                fixed md:relative inset-y-0 left-0
                ${showSidePanel ? 'w-80 translate-x-0' : 'w-0 -translate-x-full md:w-80 md:translate-x-0'}
            `}>
                <div className="p-4 border-b border-white/[0.06] flex items-center justify-between shrink-0">
                    <h3 className="text-sm font-semibold text-gray-400">Historial</h3>
                    <button
                        onClick={() => setShowSidePanel(false)}
                        className="md:hidden text-gray-500 hover:text-gray-300 text-xs"
                    >
                        Cerrar
                    </button>
                </div>
                <div
                    ref={sidePanelRef}
                    className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scroll-smooth"
                >
                    {messages.length === 0 && (
                        <p className="text-gray-600 text-xs text-center mt-8">La conversación aparecerá aquí...</p>
                    )}
                    {messages.map((m, i) => (
                        <div key={i} className={`flex w-full ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                                    m.sender === 'user'
                                        ? 'bg-white/[0.08] text-white/70 rounded-br-sm'
                                        : 'text-gray-300 rounded-bl-sm'
                                }`}
                                style={m.sender === 'ai' ? { backgroundColor: activeColor + '15' } : {}}
                            >
                                {m.sender === 'ai' && (
                                    <span className="text-[10px] font-medium block mb-1" style={{ color: activeColor + '90' }}>
                                        {activeName}
                                    </span>
                                )}
                                {m.sender === 'user' && (
                                    <span className="text-[10px] font-medium block mb-1 text-white/40">
                                        Tú
                                    </span>
                                )}
                                {maskPII(m.text)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ===== CENTER — Avatar + Live Message ===== */}
            <div className="flex-1 flex flex-col items-center overflow-hidden relative">

                {/* Header */}
                <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <button
                                onClick={handleExit}
                                onMouseEnter={() => setActiveTooltip('exit')}
                                onMouseLeave={() => setActiveTooltip(null)}
                                className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-white backdrop-blur-md transition-colors text-sm font-medium mt-8 sm:mt-0"
                            >
                                Salir de la sala
                            </button>
                            {activeTooltip === 'exit' && status === 'connected' && (
                                <div className="absolute top-full mt-2 left-0 w-60 bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-xl px-3.5 py-2.5 text-[11px] text-gray-300 leading-relaxed shadow-xl z-50">
                                    <span className="font-medium text-white block mb-0.5">Finalizar sesión</span>
                                    También puedes decir: <span className="italic" style={{ color: activeColor }}>&quot;Terminemos la sesión&quot;</span> o <span className="italic" style={{ color: activeColor }}>&quot;Quiero volver a la sala&quot;</span>
                                </div>
                            )}
                        </div>
                        {/* Mobile: toggle side panel */}
                        <button
                            onClick={() => setShowSidePanel(!showSidePanel)}
                            className="md:hidden bg-white/10 hover:bg-white/20 px-3 py-2 rounded-full text-white backdrop-blur-md transition-colors text-xs font-medium mt-8 sm:mt-0"
                        >
                            Historial
                        </button>
                    </div>
                    <div className="flex items-center gap-2 mt-8 sm:mt-0 flex-wrap justify-end">
                        {/* Feature hints */}
                        {!isFaroMode && status === 'connected' && (
                            <>
                                <div className="relative">
                                    <button
                                        onClick={() => setActiveTooltip(activeTooltip === 'post' ? null : 'post')}
                                        onMouseEnter={() => setActiveTooltip('post')}
                                        onMouseLeave={() => setActiveTooltip(null)}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-full backdrop-blur-md transition-colors text-xs font-medium border bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                                    >
                                        <span className="text-sm">📝</span>
                                        Post
                                    </button>
                                    {activeTooltip === 'post' && (
                                        <div className="absolute top-full mt-2 right-0 w-56 bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-xl px-3.5 py-2.5 text-[11px] text-gray-300 leading-relaxed shadow-xl z-50">
                                            <span className="font-medium text-white block mb-0.5">Genera un post</span>
                                            Intenta decir: <span className="italic" style={{ color: activeColor }}>&quot;Genérame un post para Facebook&quot;</span> o <span className="italic" style={{ color: activeColor }}>&quot;Ayúdame a escribir algo para Instagram&quot;</span>
                                        </div>
                                    )}
                                </div>
                                {agent.id === 'serena' && (
                                    <div className="relative">
                                        <button
                                            onClick={() => setActiveTooltip(activeTooltip === 'breathing' ? null : 'breathing')}
                                            onMouseEnter={() => setActiveTooltip('breathing')}
                                            onMouseLeave={() => setActiveTooltip(null)}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-full backdrop-blur-md transition-colors text-xs font-medium border bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                                        >
                                            <span className="text-sm">🌬️</span>
                                            Respirar
                                        </button>
                                        {activeTooltip === 'breathing' && (
                                            <div className="absolute top-full mt-2 right-0 w-56 bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-xl px-3.5 py-2.5 text-[11px] text-gray-300 leading-relaxed shadow-xl z-50">
                                                <span className="font-medium text-white block mb-0.5">Ejercicio de respiración</span>
                                                Intenta decir: <span className="italic" style={{ color: activeColor }}>&quot;Hagamos un ejercicio de respiración&quot;</span> o <span className="italic" style={{ color: activeColor }}>&quot;Necesito relajarme&quot;</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                        {/* Camera toggle */}
                        <button
                            onClick={toggleCamera}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-full backdrop-blur-md transition-colors text-xs font-medium border ${
                                cameraEnabled
                                    ? 'bg-green-500/20 border-green-500/40 text-green-300'
                                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                            }`}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                            </svg>
                            {cameraEnabled ? 'Cam' : 'Cam'}
                        </button>
                        {/* Status indicator */}
                        <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full backdrop-blur-md border border-white/10">
                            <div className={`w-3 h-3 rounded-full ${status === 'connected' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
                            <span className="text-white text-sm font-medium capitalize">{status}</span>
                        </div>
                    </div>
                </div>

                {/* Main Avatar Area */}
                <div className="relative z-10 flex flex-col items-center mt-28 sm:mt-20 mb-4 shrink-0">
                    <div
                        className="w-40 h-40 sm:w-48 sm:h-48 rounded-full relative overflow-hidden shadow-2xl transition-all duration-300"
                        style={{
                            boxShadow: isAiSpeaking
                                ? `0 0 120px ${activeColor}90, 0 0 60px ${activeColor}60${emotionColor ? `, 0 0 80px ${emotionColor}40` : ''}`
                                : `0 0 80px ${activeColor}50`,
                            border: `2px solid ${isAiSpeaking ? activeColor : activeColor + '80'}`,
                            transform: isAiSpeaking ? 'scale(1.03)' : 'scale(1)'
                        }}
                    >
                        <div className="absolute inset-0 flex items-center justify-center text-7xl z-0 bg-black/50">{isFaroMode ? '' : agent.emoji}</div>
                        <img
                            src={isFaroMode ? '/faro.png' : agent.avatar}
                            alt={activeName}
                            className="w-full h-full object-cover z-10 relative pointer-events-none"
                        />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mt-5 mb-1 transition-colors duration-500">
                        {activeName}
                    </h2>
                    <p className="text-gray-400 text-sm">
                        {status !== 'connected'
                            ? 'Conectando...'
                            : isAiSpeaking
                                ? <span style={{ color: activeColor }}>Hablando...</span>
                                : isSpeaking
                                    ? <span className="text-white">Te estoy escuchando...</span>
                                    : isFaroMode
                                        ? 'Estoy aquí contigo...'
                                        : 'Esperando...'}
                    </p>

                    {/* Emotion badges — multi-source */}
                    {emotion && !isFaroMode && (
                        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                            {emotion.text && (
                                <div
                                    className="px-2.5 py-1 rounded-full text-[10px] font-medium transition-all duration-700 border flex items-center gap-1"
                                    style={{
                                        color: EMOTION_COLORS[emotion.text.emotion],
                                        backgroundColor: EMOTION_COLORS[emotion.text.emotion] + '15',
                                        borderColor: EMOTION_COLORS[emotion.text.emotion] + '30'
                                    }}
                                >
                                    <span className="opacity-50">💬</span>
                                    {EMOTION_LABELS[emotion.text.emotion] || emotion.text.emotion}
                                    <span className="ml-0.5 opacity-50">{'●'.repeat(Math.min(emotion.text.intensity, 5))}</span>
                                </div>
                            )}
                            {emotion.voice && (
                                <div
                                    className="px-2.5 py-1 rounded-full text-[10px] font-medium transition-all duration-700 border flex items-center gap-1"
                                    style={{
                                        color: EMOTION_COLORS[emotion.voice.emotion],
                                        backgroundColor: EMOTION_COLORS[emotion.voice.emotion] + '15',
                                        borderColor: EMOTION_COLORS[emotion.voice.emotion] + '30'
                                    }}
                                >
                                    <span className="opacity-50">🎙️</span>
                                    {EMOTION_LABELS[emotion.voice.emotion] || emotion.voice.emotion}
                                    <span className="ml-0.5 opacity-50">{'●'.repeat(Math.min(emotion.voice.intensity, 5))}</span>
                                </div>
                            )}
                            {emotion.facial && (
                                <div
                                    className="px-2.5 py-1 rounded-full text-[10px] font-medium transition-all duration-700 border flex items-center gap-1"
                                    style={{
                                        color: EMOTION_COLORS[emotion.facial.emotion],
                                        backgroundColor: EMOTION_COLORS[emotion.facial.emotion] + '15',
                                        borderColor: EMOTION_COLORS[emotion.facial.emotion] + '30'
                                    }}
                                >
                                    <span className="opacity-50">👁️</span>
                                    {EMOTION_LABELS[emotion.facial.emotion] || emotion.facial.emotion}
                                    <span className="ml-0.5 opacity-50">{'●'.repeat(Math.min(emotion.facial.intensity, 5))}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="mt-3 bg-red-500/20 text-red-200 border border-red-500/50 rounded-lg px-4 py-2 text-xs max-w-sm text-center">
                            {error}
                        </div>
                    )}
                </div>

                {/* Breathing Visualizer (Serena only) */}
                {breathingExercise && agent.id === 'serena' && (
                    <div className="z-10 w-full max-w-md px-6">
                        <BreathingVisualizer
                            exercise={breathingExercise}
                            agentColor={activeColor}
                            onComplete={() => setBreathingExercise(null)}
                        />
                    </div>
                )}

                {/* Live message bubble — single growing message */}
                <div className="z-10 w-full max-w-lg px-6 flex-1 min-h-0 flex flex-col items-center gap-3 mb-36 overflow-y-auto">
                    {currentMessage && (
                        <div className={`w-full flex ${currentMessage.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                                    currentMessage.sender === 'user'
                                        ? 'bg-white/[0.08] text-white/80 rounded-br-sm'
                                        : 'text-gray-200 rounded-bl-sm'
                                }`}
                                style={currentMessage.sender === 'ai' ? { backgroundColor: activeColor + '20' } : {}}
                            >
                                {currentMessage.sender === 'ai' && (
                                    <span className="text-[11px] font-medium block mb-1" style={{ color: activeColor }}>
                                        {activeName}
                                    </span>
                                )}
                                {currentMessage.sender === 'user' && (
                                    <span className="text-[11px] font-medium block mb-1 text-white/50">
                                        Tú
                                    </span>
                                )}
                                {maskPII(currentMessage.text)}
                                <span className="inline-block w-1.5 h-4 ml-1 rounded-sm animate-pulse" style={{ backgroundColor: currentMessage.sender === 'ai' ? activeColor : 'rgba(255,255,255,0.5)' }} />
                            </div>
                        </div>
                    )}
                    {!currentMessage && messages.length === 0 && status === 'connected' && (
                        <p className="text-gray-600 text-xs mt-4">
                            {isFaroMode ? 'Faro va a hablar contigo en un momento...' : 'Comienza a hablar...'}
                        </p>
                    )}
                </div>

                {/* Camera PIP preview */}
                {cameraEnabled && (
                    <div className="absolute bottom-36 right-4 z-30 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg">
                        <video
                            ref={videoPipRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-[120px] h-[90px] object-cover mirror"
                            style={{ transform: 'scaleX(-1)' }}
                        />
                    </div>
                )}

                {/* Voice Visualizer at bottom */}
                <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-black via-black/80 to-transparent z-20 flex flex-col justify-end items-center pb-6 pointer-events-none gap-3">
                    {isSpeaking && status === 'connected' && (
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-1.5 border border-white/20">
                            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                            <span className="text-white/80 text-xs font-medium">Mic activo</span>
                        </div>
                    )}
                    {status === 'connected' && (
                        <div className="flex items-end gap-1.5 h-12 w-full max-w-sm justify-center">
                            {[...Array(15)].map((_, i) => (
                                <div
                                    key={i}
                                    className="w-2 rounded-t-full origin-bottom"
                                    style={{
                                        backgroundColor: isSpeaking ? '#ffffff' : activeColor,
                                        height: (isSpeaking || isAiSpeaking)
                                            ? `${Math.random() * 60 + 20}%`
                                            : '10%',
                                        opacity: (isSpeaking || isAiSpeaking) ? 0.8 : 0.3,
                                        transition: 'height 0.15s ease-in-out, opacity 0.3s, background-color 0.3s'
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Social Post Modal */}
            {socialPost && (
                <SocialPostModal
                    post={socialPost}
                    agentColor={activeColor}
                    onClose={() => setSocialPost(null)}
                />
            )}

            {/* UI Toast */}
            {uiToast && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[70] animate-fade-in">
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-5 py-2 text-white text-sm font-medium shadow-lg">
                        {uiToast}
                    </div>
                </div>
            )}
        </div>
    );
}

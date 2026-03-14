"use client";

import { useEffect, useRef, useState } from 'react';
import { useGeminiLive } from '@/hooks/useGeminiLive';
import { getAgent } from '@/lib/agents';
import { maskPII } from '@/lib/piiScrubber';
import { saveDiaryEntry } from '@/lib/diary';
import { useI18n } from '@/i18n/I18nContext';
import BreathingVisualizer from './BreathingVisualizer';
import SocialPostModal from './SocialPostModal';
import DiaryModal from './DiaryModal';
import TherapistModal from './TherapistModal';
import AppointmentModal from './AppointmentModal';
import AppointmentsViewModal from './AppointmentsViewModal';
import SessionSummary from './SessionSummary';
import LanguageToggle from './LanguageToggle';
import ThemeToggle from './ThemeToggle';

const EMOTION_COLORS = {
    sadness: '#4A90D9', anger: '#D94A4A', fear: '#9B59B6',
    guilt: '#7F8C8D', hope: '#2ECC71', calm: '#1ABC9C',
    love: '#E91E8F', numbness: '#636E72'
};

export default function GeminiLiveSession({ agent: initialAgent, apiKey, userContext, userCountry, geminiSettings, onClose, isFirstVisit }) {
    const { t, locale } = useI18n();
    const [isFaroMode, setIsFaroMode] = useState(false);
    const [showSidePanel, setShowSidePanel] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [showTherapist, setShowTherapist] = useState(false);
    const [activeTooltip, setActiveTooltip] = useState(null);
    const sidePanelRef = useRef(null);
    const videoPipRef = useRef(null);
    const handleExitRef = useRef(null);

    const handleEscalateToFaro = () => {
        setIsFaroMode(true);
        const faroAgent = getAgent('faro');
        if (faroAgent) switchAgent(faroAgent, t('session.faroEscalationContext'));
    };

    const handleSwitchAgent = (agentId) => {
        const newAgent = getAgent(agentId);
        if (!newAgent) return;
        if (agentId === 'faro') return;
        setIsFaroMode(false);

        // When switching to Sofia from a therapeutic agent, capture session data and show summary
        if (agentId === 'sofia' && !agent.isReceptionist && messages.length > 2) {
            const transcript = messages
                .map(m => `[${m.sender === 'user' ? t('summary.promptUser') : agent.name}]: ${m.text}`)
                .join('\n');
            lastSessionDataRef.current = {
                messages: [...messages],
                agentName: agent.name,
                agentId: agent.id,
                agentColor: agent.color,
                emotionHistory: [...emotionHistory]
            };
            setShowSummary(true);
            switchAgent(newAgent, t('session.sofiaPostSessionContext', {
                name: agent.name,
                transcript: transcript.slice(0, 3000)
            }));
        } else {
            switchAgent(newAgent, t('session.switchContext', { name: newAgent.name }));
        }
    };

    // Use i18n-translated context detail so the system prompt matches the selected language
    const translatedContext = userContext?.id ? { ...userContext, detail: t(`contexts.${userContext.id}.detail`) } : userContext;

    const {
        status, agent, messages, currentMessage, error,
        isSpeaking, isAiSpeaking, emotion, breathingExercise, setBreathingExercise,
        cameraEnabled, toggleCamera, videoStreamRef,
        socialPost, setSocialPost, uiToast, setUiToast,
        latency, emotionHistory,
        diaryAction, setDiaryAction,
        therapistAction, setTherapistAction,
        showAppointment, setShowAppointment,
        showDiaryModal, setShowDiaryModal,
        showAppointmentsModal, setShowAppointmentsModal,
        lastSessionDataRef,
        dismissSummaryCallbackRef,
        switchAgent, connect, disconnect
    } = useGeminiLive(apiKey, initialAgent, handleEscalateToFaro, () => handleExitRef.current?.(), handleSwitchAgent, translatedContext, userCountry, geminiSettings, locale, isFirstVisit);

    // Register callback so dismiss_modal voice command can close all component-level modals
    useEffect(() => {
        dismissSummaryCallbackRef.current = () => {
            setShowSummary(false);
            setShowTherapist(false);
        };
        return () => { dismissSummaryCallbackRef.current = null; };
    }, [dismissSummaryCallbackRef]);

    useEffect(() => {
        connect();
        return () => {
            disconnect();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle diary save action — use lastSessionData if Sofia is reviewing a previous session
    useEffect(() => {
        if (diaryAction?.type === 'save') {
            const prev = lastSessionDataRef.current;
            if (prev) {
                saveDiaryEntry({
                    title: diaryAction.title || `Sesión con ${prev.agentName}`,
                    agentName: prev.agentName,
                    agentId: prev.agentId,
                    summary: '',
                    emotionTimeline: prev.emotionHistory,
                    messages: prev.messages
                });
                // Don't nullify lastSessionDataRef — it's needed to render SessionSummary
            } else {
                saveDiaryEntry({
                    title: diaryAction.title,
                    agentName: agent.name,
                    agentId: agent.id,
                    summary: '',
                    emotionTimeline: emotionHistory,
                    messages
                });
            }
            setDiaryAction(null);
            // Visual feedback
            setUiToast('📔 Guardado en tu diario');
            setTimeout(() => setUiToast(null), 3000);
        }
    }, [diaryAction, agent, emotionHistory, messages, setDiaryAction, setUiToast]);

    // Handle therapist action
    useEffect(() => {
        if (therapistAction?.type === 'send') {
            setShowTherapist(true);
            setTherapistAction(null);
        }
    }, [therapistAction, setTherapistAction]);

    // Auto-scroll side panel
    useEffect(() => {
        if (sidePanelRef.current) {
            sidePanelRef.current.scrollTop = sidePanelRef.current.scrollHeight;
        }
    }, [messages]);

    // Attach video stream to PIP element
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

    // Exit handler — skip summary for Sofia (receptionist, no therapeutic session)
    // Instead of showing SessionSummary, return to Sofia with session context so she can review it
    const handleExit = () => {
        if (messages.length > 2 && !agent.isReceptionist) {
            // Store previous session data and show summary + switch to Sofia
            const transcript = messages
                .map(m => `[${m.sender === 'user' ? t('summary.promptUser') : agent.name}]: ${m.text}`)
                .join('\n');
            lastSessionDataRef.current = {
                messages: [...messages],
                agentName: agent.name,
                agentId: agent.id,
                agentColor: agent.color,
                emotionHistory: [...emotionHistory]
            };
            setShowSummary(true);
            const sofia = getAgent('sofia');
            if (sofia) {
                setIsFaroMode(false);
                switchAgent(sofia, t('session.sofiaPostSessionContext', {
                    name: agent.name,
                    transcript: transcript.slice(0, 3000)
                }));
            }
        } else {
            onClose();
        }
    };
    handleExitRef.current = handleExit;

    // Handle send to therapist — use lastSessionData if available (Sofia post-session review)
    const handleSendToTherapist = (summaryText) => {
        setTherapistAction({ type: 'send', summary_text: summaryText });
        setShowTherapist(true);
    };

    return (
        <div className="fixed inset-0 bg-bg z-50 flex overflow-hidden" style={{ '--dynamic-color': activeColor }}>
            {/* Background Glow */}
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
                <div className="absolute top-0 w-full bg-[#E85D75] text-fg py-2 px-4 shadow-lg text-center font-bold z-50 text-sm">
                    {t('session.crisisBanner')}
                </div>
            )}

            {/* ===== SIDE PANEL ===== */}
            <div className={`
                z-30 flex flex-col border-r border-fg/6 bg-bg/80 backdrop-blur-md shrink-0 transition-all duration-300
                fixed md:relative inset-y-0 left-0
                ${showSidePanel ? 'w-80 translate-x-0' : 'w-0 -translate-x-full md:w-80 md:translate-x-0'}
            `}>
                <div className="p-4 border-b border-fg/6 flex items-center justify-between shrink-0">
                    <h3 className="text-sm font-semibold text-fg-secondary">{t('session.history')}</h3>
                    <button
                        onClick={() => setShowSidePanel(false)}
                        className="md:hidden text-fg-secondary hover:text-fg text-xs"
                    >
                        {t('session.close')}
                    </button>
                </div>
                <div
                    ref={sidePanelRef}
                    className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scroll-smooth"
                >
                    {messages.length === 0 && (
                        <p className="text-fg-secondary/60 text-xs text-center mt-8">{t('session.conversationWillAppear')}</p>
                    )}
                    {messages.map((m, i) => (
                        <div key={i} className={`flex w-full ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                                    m.sender === 'user'
                                        ? 'bg-fg/8 text-fg/70 rounded-br-sm'
                                        : 'text-fg/80 rounded-bl-sm'
                                }`}
                                style={m.sender === 'ai' ? { backgroundColor: activeColor + '15' } : {}}
                            >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    {m.sender === 'ai' && (
                                        <span className="text-[10px] font-medium" style={{ color: activeColor + '90' }}>
                                            {activeName}
                                        </span>
                                    )}
                                    {m.sender === 'user' && (
                                        <span className="text-[10px] font-medium text-fg/40">
                                            {t('session.you')}
                                        </span>
                                    )}
                                    {m.timestamp && (
                                        <span className="text-[9px] text-fg/30 tabular-nums">
                                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                    )}
                                </div>
                                {maskPII(m.text)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ===== CENTER ===== */}
            <div className="flex-1 flex flex-col items-center overflow-hidden relative">

                {/* Header */}
                <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <button
                                onClick={handleExit}
                                onMouseEnter={() => setActiveTooltip('exit')}
                                onMouseLeave={() => setActiveTooltip(null)}
                                className="bg-fg/10 hover:bg-fg/15 px-4 py-2 rounded-full text-fg backdrop-blur-md transition-colors text-sm font-medium mt-8 sm:mt-0"
                            >
                                {t('session.exitRoom')}
                            </button>
                            {activeTooltip === 'exit' && status === 'connected' && (
                                <div className="absolute top-full mt-2 left-0 w-60 bg-surface/95 backdrop-blur-md border border-fg/8 rounded-xl px-3.5 py-2.5 text-[11px] text-fg/80 leading-relaxed shadow-xl z-50">
                                    <span className="font-medium text-fg block mb-0.5">{t('session.endSessionTitle')}</span>
                                    {t('session.endSessionHint')}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setShowSidePanel(!showSidePanel)}
                            className="md:hidden bg-fg/10 hover:bg-fg/15 px-3 py-2 rounded-full text-fg backdrop-blur-md transition-colors text-xs font-medium mt-8 sm:mt-0"
                        >
                            {t('session.history')}
                        </button>
                    </div>
                    <div className="flex items-center gap-2 mt-8 sm:mt-0 flex-wrap justify-end">
                        {/* Feature hints */}
                        {!isFaroMode && status === 'connected' && (
                            <>
                                {/* Voice command hints — dashed border, not directly clickable */}
                                <div className="relative">
                                    <button
                                        onClick={() => setActiveTooltip(activeTooltip === 'post' ? null : 'post')}
                                        onMouseEnter={() => setActiveTooltip('post')}
                                        onMouseLeave={() => setActiveTooltip(null)}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-full backdrop-blur-md transition-colors text-xs font-medium border border-dashed border-fg/15 text-fg-secondary/70 hover:text-fg-secondary hover:border-fg/25 cursor-help"
                                    >
                                        <span className="text-sm opacity-70">📝</span>
                                        {t('session.post')}
                                    </button>
                                    {activeTooltip === 'post' && (
                                        <div className="absolute top-full mt-2 right-0 w-56 bg-surface/95 backdrop-blur-md border border-fg/8 rounded-xl px-3.5 py-2.5 text-[11px] text-fg/80 leading-relaxed shadow-xl z-50">
                                            <span className="font-medium text-fg block mb-0.5">{t('session.postHintTitle')}</span>
                                            {t('session.postHint')}
                                        </div>
                                    )}
                                </div>
                                {agent.id === 'serena' && (
                                    <div className="relative">
                                        <button
                                            onClick={() => setActiveTooltip(activeTooltip === 'breathing' ? null : 'breathing')}
                                            onMouseEnter={() => setActiveTooltip('breathing')}
                                            onMouseLeave={() => setActiveTooltip(null)}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-full backdrop-blur-md transition-colors text-xs font-medium border border-dashed border-fg/15 text-fg-secondary/70 hover:text-fg-secondary hover:border-fg/25 cursor-help"
                                        >
                                            <span className="text-sm opacity-70">🌬️</span>
                                            {t('session.breathe')}
                                        </button>
                                        {activeTooltip === 'breathing' && (
                                            <div className="absolute top-full mt-2 right-0 w-56 bg-surface/95 backdrop-blur-md border border-fg/8 rounded-xl px-3.5 py-2.5 text-[11px] text-fg/80 leading-relaxed shadow-xl z-50">
                                                <span className="font-medium text-fg block mb-0.5">{t('session.breatheHintTitle')}</span>
                                                {t('session.breatheHint')}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {/* Action buttons — solid style, directly clickable */}
                                <button
                                    onClick={() => setShowDiaryModal(true)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-full backdrop-blur-md transition-colors text-xs font-medium border border-fg/10 bg-fg/5 text-fg-secondary hover:bg-fg/10 hover:text-fg cursor-pointer"
                                >
                                    <span className="text-sm">📔</span>
                                    {t('session.diary')}
                                </button>
                                <button
                                    onClick={() => setShowAppointmentsModal(true)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-full backdrop-blur-md transition-colors text-xs font-medium border border-fg/10 bg-fg/5 text-fg-secondary hover:bg-fg/10 hover:text-fg cursor-pointer"
                                >
                                    <span className="text-sm">📅</span>
                                    {t('session.appointments')}
                                </button>
                            </>
                        )}
                        {/* Language toggle */}
                        <LanguageToggle />
                        <ThemeToggle />
                        {/* Camera toggle */}
                        <button
                            onClick={toggleCamera}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-full backdrop-blur-md transition-colors text-xs font-medium border ${
                                cameraEnabled
                                    ? 'bg-accent/15 border-accent/30 text-accent'
                                    : 'bg-fg/5 border-fg/8 text-fg-secondary hover:bg-fg/10'
                            }`}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                            </svg>
                            {t('session.cam')}
                        </button>
                        {/* Status indicator + latency */}
                        <div className="flex items-center gap-3 bg-fg/5 px-4 py-2 rounded-full backdrop-blur-md border border-fg/8">
                            <div className={`w-3 h-3 rounded-full ${status === 'connected' ? 'bg-accent animate-pulse' : 'bg-yellow-400'}`} />
                            <span className="text-fg text-sm font-medium capitalize">{status}</span>
                            {latency !== null && status === 'connected' && (
                                <span className={`text-[10px] font-mono ${
                                    latency < 200 ? 'text-green-400' : latency < 500 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                    {Math.round(latency)}ms
                                </span>
                            )}
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
                        <div className="absolute inset-0 flex items-center justify-center text-7xl z-0 bg-bg/50">{isFaroMode ? '' : agent.emoji}</div>
                        <img
                            src={isFaroMode ? '/faro.png' : agent.avatar}
                            alt={activeName}
                            className="w-full h-full object-cover z-10 relative pointer-events-none"
                        />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-fg mt-5 mb-1 transition-colors duration-500">
                        {activeName}
                    </h2>
                    <p className="text-fg-secondary text-sm">
                        {status !== 'connected'
                            ? t('session.connecting')
                            : isAiSpeaking
                                ? <span style={{ color: activeColor }}>{t('session.speaking')}</span>
                                : isSpeaking
                                    ? <span className="text-fg">{t('session.listening')}</span>
                                    : isFaroMode
                                        ? t('session.faroWaiting')
                                        : t('session.waiting')}
                    </p>

                    {/* Emotion badges */}
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
                                    {t(`emotions.${emotion.text.emotion}`) || emotion.text.emotion}
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
                                    {t(`emotions.${emotion.voice.emotion}`) || emotion.voice.emotion}
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
                                    {t(`emotions.${emotion.facial.emotion}`) || emotion.facial.emotion}
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

                {/* Live message bubble */}
                <div className="z-10 w-full max-w-lg px-6 flex-1 min-h-0 flex flex-col items-center gap-3 mb-36 overflow-y-auto">
                    {currentMessage && (
                        <div className={`w-full flex ${currentMessage.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                                    currentMessage.sender === 'user'
                                        ? 'bg-fg/8 text-fg/80 rounded-br-sm'
                                        : 'text-fg/90 rounded-bl-sm'
                                }`}
                                style={currentMessage.sender === 'ai' ? { backgroundColor: activeColor + '20' } : {}}
                            >
                                {currentMessage.sender === 'ai' && (
                                    <span className="text-[11px] font-medium block mb-1" style={{ color: activeColor }}>
                                        {activeName}
                                    </span>
                                )}
                                {currentMessage.sender === 'user' && (
                                    <span className="text-[11px] font-medium block mb-1 text-fg/50">
                                        {t('session.you')}
                                    </span>
                                )}
                                {maskPII(currentMessage.text)}
                                <span className="inline-block w-1.5 h-4 ml-1 rounded-sm animate-pulse" style={{ backgroundColor: currentMessage.sender === 'ai' ? activeColor : 'var(--fg-secondary)' }} />
                            </div>
                        </div>
                    )}
                    {!currentMessage && messages.length === 0 && status === 'connected' && (
                        <p className="text-fg-secondary/60 text-xs mt-4">
                            {isFaroMode ? t('session.faroPrompt') : t('session.startSpeaking')}
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
                <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-bg via-bg/80 to-transparent z-20 flex flex-col justify-end items-center pb-6 pointer-events-none gap-3">
                    {isSpeaking && status === 'connected' && (
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-1.5 border border-white/20">
                            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                            <span className="text-fg/80 text-xs font-medium">{t('session.micActive')}</span>
                        </div>
                    )}
                    {status === 'connected' && (
                        <div className="flex items-end gap-1.5 h-12 w-full max-w-sm justify-center">
                            {[...Array(15)].map((_, i) => (
                                <div
                                    key={i}
                                    className="w-2 rounded-t-full origin-bottom"
                                    style={{
                                        backgroundColor: isSpeaking ? 'var(--fg)' : activeColor,
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
                    apiKey={apiKey}
                    onClose={() => setSocialPost(null)}
                />
            )}

            {/* Diary Modal */}
            <DiaryModal
                isOpen={showDiaryModal}
                onClose={() => setShowDiaryModal(false)}
                locale={locale}
            />

            {/* Appointments View Modal */}
            <AppointmentsViewModal
                isOpen={showAppointmentsModal}
                onClose={() => setShowAppointmentsModal(false)}
                locale={locale}
            />

            {/* Therapist Modal */}
            <TherapistModal
                isOpen={showTherapist}
                onClose={() => setShowTherapist(false)}
                summaryText={therapistAction?.summary_text || ''}
                locale={locale}
                setUiToast={setUiToast}
            />

            {/* Appointment Modal */}
            <AppointmentModal
                isOpen={showAppointment}
                onClose={() => setShowAppointment(false)}
                locale={locale}
                onBooking={() => {
                    setShowAppointment(false);
                    setUiToast('📅 Cita agendada');
                    setTimeout(() => setUiToast(null), 3000);
                }}
            />

            {/* Session Summary overlay (shown when returning to Sofia from another agent) */}
            {showSummary && lastSessionDataRef.current && (
                <SessionSummary
                    messages={lastSessionDataRef.current.messages}
                    agentName={lastSessionDataRef.current.agentName}
                    agentColor={lastSessionDataRef.current.agentColor}
                    apiKey={apiKey}
                    emotionHistory={lastSessionDataRef.current.emotionHistory}
                    locale={locale}
                    onClose={() => setShowSummary(false)}
                    onSaveDiary={(summary) => {
                        saveDiaryEntry({
                            title: `Sesión con ${lastSessionDataRef.current.agentName}`,
                            agentName: lastSessionDataRef.current.agentName,
                            agentId: lastSessionDataRef.current.agentId,
                            summary,
                            emotionTimeline: lastSessionDataRef.current.emotionHistory,
                            messages: lastSessionDataRef.current.messages
                        });
                        setUiToast('📔 Guardado en tu diario');
                        setTimeout(() => setUiToast(null), 3000);
                    }}
                    onSendToTherapist={(summary) => {
                        setShowSummary(false);
                        setTherapistAction({ type: 'send', summary_text: summary });
                        setShowTherapist(true);
                    }}
                />
            )}

            {/* UI Toast */}
            {uiToast && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[70] animate-fade-in">
                    <div className="bg-surface/80 backdrop-blur-md border border-fg/10 rounded-full px-5 py-2 text-fg text-sm font-medium shadow-lg">
                        {uiToast}
                    </div>
                </div>
            )}

        </div>
    );
}

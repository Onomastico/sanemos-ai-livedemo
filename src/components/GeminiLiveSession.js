"use client";

import { useEffect, useRef, useState } from 'react';
import { useGeminiLive } from '@/hooks/useGeminiLive';
import { maskPII } from '@/lib/piiScrubber';

export default function GeminiLiveSession({ agent: initialAgent, apiKey, onClose }) {
    const [isFaroMode, setIsFaroMode] = useState(false);
    const containerRef = useRef(null);

    const handleEscalateToFaro = () => {
        setIsFaroMode(true);
    };

    const { status, agent, transcripts, error, connect, disconnect } = useGeminiLive(apiKey, initialAgent, handleEscalateToFaro);

    useEffect(() => {
        connect();
        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [transcripts]);

    // Determine active colors
    const activeColor = isFaroMode ? '#E85D75' : agent.color;
    const activeName = isFaroMode ? 'Faro (Crisis Agent)' : agent.name;

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center overflow-hidden" style={{ '--dynamic-color': activeColor }}>
            {/* Background Glow */}
            <div
                className="absolute inset-0 transition-all duration-1000 opacity-20"
                style={{ background: `radial-gradient(circle at center, var(--dynamic-color) 0%, transparent 70%)` }}
            />

            {isFaroMode && (
                <div className="absolute top-0 w-full bg-[#E85D75] text-white py-2 px-4 shadow-lg text-center font-bold z-50 text-sm">
                    🚨 MODO DE RIESGO VITAL ACTIVADO. Por favor, si estás en peligro inminente llama al *4141 en Chile o acude a urgencias.
                </div>
            )}

            {/* Header */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20">
                <button
                    onClick={onClose}
                    className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-white backdrop-blur-md transition-colors text-sm font-medium z-50 mt-8 sm:mt-0"
                >
                    ← Salir de la sala
                </button>
                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full backdrop-blur-md border border-white/10 mt-8 sm:mt-0">
                    <div className={`w-3 h-3 rounded-full ${status === 'connected' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
                    <span className="text-white text-sm font-medium capitalize">{status}</span>
                </div>
            </div>

            {/* Main Avatar Area */}
            <div className="relative z-10 flex flex-col items-center mt-24 sm:mt-12 mb-8">
                <div
                    className="w-48 h-48 sm:w-64 sm:h-64 rounded-full relative overflow-hidden shadow-2xl transition-all duration-1000"
                    style={{
                        boxShadow: `0 0 80px ${activeColor}50`,
                        border: `2px solid ${activeColor}80`
                    }}
                >
                    <div className="absolute inset-0 flex items-center justify-center text-7xl z-0 bg-black/50">{isFaroMode ? '🚨' : agent.emoji}</div>
                    {/* We import normal img since Next/Image requires configured domains, but these are local so it's fine */}
                    <img
                        src={isFaroMode ? '/faro.png' : agent.avatar}
                        alt={activeName}
                        className="w-full h-full object-cover z-10 relative pointer-events-none"
                    />
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mt-8 mb-2 transition-colors duration-500">
                    {activeName}
                </h2>
                <p className="text-gray-400 text-sm">{status === 'connected' ? 'Escuchando y hablando...' : 'Conectando...'}</p>

                {error && (
                    <div className="mt-4 bg-red-500/20 text-red-200 border border-red-500/50 rounded-lg px-4 py-3 text-sm max-w-md text-center">
                        {error}
                    </div>
                )}
            </div>

            {/* Transcripts Area (Scrubbed) */}
            <div
                ref={containerRef}
                className="z-10 w-full max-w-2xl px-6 flex-1 overflow-y-auto pb-24 flex flex-col gap-4 scroll-smooth"
            >
                {transcripts.length === 0 && status === 'connected' && (
                    <div className="text-center text-gray-500 italic mt-8 text-sm">
                        Comienza a hablar con naturalidad...
                    </div>
                )}
                {transcripts.map((t, i) => (
                    <div key={i} className={`flex w-full ${t.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                            className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed ${t.sender === 'user'
                                    ? 'bg-white/10 text-white rounded-br-none border border-white/5'
                                    : 'bg-black/40 text-gray-200 rounded-bl-none border border-white/10'
                                }`}
                        >
                            {maskPII(t.text)}
                        </div>
                    </div>
                ))}
            </div>

            {/* Voice Visualizer Mock at bottom */}
            <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-black via-black/80 to-transparent z-20 flex justify-center items-end pb-8 pointer-events-none">
                {status === 'connected' && (
                    <div className="flex items-end gap-1.5 h-16 w-full max-w-sm justify-center">
                        {[...Array(15)].map((_, i) => (
                            <div
                                key={i}
                                className="w-2 rounded-t-full origin-bottom"
                                style={{
                                    backgroundColor: activeColor,
                                    height: `${Math.random() * 60 + 20}%`,
                                    opacity: 0.8,
                                    transition: 'height 0.2s ease-in-out'
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

"use client";

import { useState, useEffect } from 'react';
import { maskPII } from '@/lib/piiScrubber';

export default function SessionSummary({ messages, agentName, agentColor, apiKey, onClose }) {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        generateSummary();
    }, []);

    const generateSummary = async () => {
        try {
            setLoading(true);
            setError(null);

            const transcript = messages
                .map(m => `[${m.sender === 'user' ? 'Usuario' : agentName}]: ${m.text}`)
                .join('\n');

            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `Eres un asistente de apoyo emocional. Analiza esta transcripción de una sesión de apoyo emocional y genera un resumen compasivo EN ESPAÑOL con exactamente estas 4 secciones (usa estos títulos exactos):

RESUMEN EMOCIONAL
Un breve resumen gentil del arco emocional de la conversación (2-3 oraciones).

TEMAS PRINCIPALES
Los temas clave que surgieron (como lista con viñetas, 3-5 puntos).

RECURSOS
Recursos o próximos pasos relevantes basados en lo discutido (2-3 sugerencias).

MENSAJE DE CIERRE
Un mensaje cálido de cierre para el usuario (1-2 oraciones).

Transcripción:\n${transcript}`
                            }]
                        }],
                        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
                    })
                }
            );

            if (!res.ok) throw new Error(`API error: ${res.status}`);
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error('No summary generated');
            setSummary(maskPII(text));
        } catch (err) {
            console.error('Summary generation failed:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        if (summary) {
            await navigator.clipboard.writeText(summary);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Parse summary sections for styled rendering
    const parseSections = (text) => {
        const sectionTitles = ['RESUMEN EMOCIONAL', 'TEMAS PRINCIPALES', 'RECURSOS', 'MENSAJE DE CIERRE'];
        const sections = [];
        const lines = text.split('\n');
        let currentSection = null;
        let currentBody = [];

        for (const line of lines) {
            // Strip markdown formatting: ### headers, ** bold **, leading/trailing symbols
            const cleaned = line.trim().replace(/^#{1,4}\s*/, '').replace(/\*{1,2}/g, '').trim();
            const matchedTitle = sectionTitles.find(s => cleaned.toUpperCase().startsWith(s));
            if (matchedTitle) {
                if (currentSection) sections.push({ title: currentSection, body: currentBody.join('\n').trim() });
                currentSection = matchedTitle;
                currentBody = [];
            } else {
                currentBody.push(line);
            }
        }
        if (currentSection) sections.push({ title: currentSection, body: currentBody.join('\n').trim() });

        return sections.length > 0 ? sections : [{ title: 'Resumen', body: text }];
    };

    const sectionEmojis = {
        'RESUMEN EMOCIONAL': '💙',
        'TEMAS PRINCIPALES': '📋',
        'RECURSOS': '🔗',
        'MENSAJE DE CIERRE': '🌱'
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center p-6 overflow-y-auto">
            <div className="w-full max-w-2xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl"
                        style={{ backgroundColor: agentColor + '20', border: `2px solid ${agentColor}40` }}>
                        📝
                    </div>
                    <h2 className="text-2xl font-bold text-white">Resumen de tu sesión</h2>
                    <p className="text-gray-500 text-sm mt-1">con {agentName}</p>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="text-center py-12">
                        <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-4"
                            style={{ borderColor: `${agentColor}40`, borderTopColor: agentColor }} />
                        <p className="text-gray-400 text-sm">Generando tu resumen...</p>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="text-center py-8">
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                            <p className="text-red-300 text-sm">{error}</p>
                        </div>
                        <button
                            onClick={generateSummary}
                            className="text-sm px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                            Reintentar
                        </button>
                    </div>
                )}

                {/* Summary content */}
                {summary && (
                    <div className="flex flex-col gap-4">
                        {parseSections(summary).map((section, i) => (
                            <div key={i} className="rounded-xl p-5 bg-white/[0.03] border border-white/[0.06]">
                                <h3 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"
                                    style={{ color: agentColor }}>
                                    <span>{sectionEmojis[section.title] || '•'}</span>
                                    {section.title}
                                </h3>
                                <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                                    {section.body}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-center gap-3 mt-8 mb-8">
                    {summary && (
                        <button
                            onClick={handleCopy}
                            className="px-5 py-2.5 rounded-full text-sm font-medium border transition-all"
                            style={{
                                borderColor: agentColor + '60',
                                color: agentColor,
                                backgroundColor: copied ? agentColor + '20' : 'transparent'
                            }}
                        >
                            {copied ? 'Copiado!' : 'Copiar resumen'}
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
                    >
                        Volver al inicio
                    </button>
                </div>
            </div>
        </div>
    );
}

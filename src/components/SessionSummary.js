"use client";

import { useState, useEffect } from 'react';
// Note: summary is AI-generated text, not raw user input — no PII scrubbing needed
import { useI18n } from '@/i18n/I18nContext';
import EmotionTimeline from './EmotionTimeline';

export default function SessionSummary({ messages, agentName, agentColor, apiKey, emotionHistory, onClose, onSaveDiary, onSendToTherapist, locale }) {
    const { t } = useI18n();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);
    const isEs = locale === 'es';

    useEffect(() => {
        generateSummary();
    }, []);

    const generateSummary = async () => {
        try {
            setLoading(true);
            setError(null);

            const transcript = messages
                .map(m => `[${m.sender === 'user' ? t('summary.promptUser') : agentName}]: ${m.text}`)
                .join('\n');

            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: t('summary.prompt') + transcript
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
            setSummary(text);
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

    const parseSections = (text) => {
        const sectionTitles = [
            t('summary.sectionEmotional'),
            t('summary.sectionThemes'),
            t('summary.sectionResources'),
            t('summary.sectionClosing')
        ];
        const sections = [];
        const lines = text.split('\n');
        let currentSection = null;
        let currentBody = [];

        for (const line of lines) {
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

        return sections.length > 0 ? sections : [{ title: t('summary.fallbackTitle'), body: text }];
    };

    const sectionEmojis = {
        [t('summary.sectionEmotional')]: '💙',
        [t('summary.sectionThemes')]: '📋',
        [t('summary.sectionResources')]: '🔗',
        [t('summary.sectionClosing')]: '🌱'
    };

    return (
        <div className="fixed inset-0 bg-bg z-50 overflow-y-auto">
            <div className="min-h-full flex items-center justify-center p-6">
            <div className="w-full max-w-2xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl"
                        style={{ backgroundColor: agentColor + '20', border: `2px solid ${agentColor}40` }}>
                        📝
                    </div>
                    <h2 className="text-2xl font-bold text-fg">{t('summary.title')}</h2>
                    <p className="text-fg-secondary text-sm mt-1">{t('summary.with', { name: agentName })}</p>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="text-center py-12">
                        <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-4"
                            style={{ borderColor: `${agentColor}40`, borderTopColor: agentColor }} />
                        <p className="text-fg-secondary text-sm">{t('summary.generating')}</p>
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
                            className="text-sm px-4 py-2 rounded-full bg-fg/10 hover:bg-fg/15 text-fg transition-colors"
                        >
                            {t('summary.retry')}
                        </button>
                    </div>
                )}

                {/* Summary content */}
                {summary && (
                    <div className="flex flex-col gap-4">
                        {parseSections(summary).map((section, i) => (
                            <div key={i} className="rounded-xl p-5 bg-fg/3 border border-fg/6">
                                <h3 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"
                                    style={{ color: agentColor }}>
                                    <span>{sectionEmojis[section.title] || '•'}</span>
                                    {section.title}
                                </h3>
                                <div className="font-ai text-fg/80 text-sm leading-relaxed whitespace-pre-line">
                                    {section.body}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Emotion Timeline */}
                {emotionHistory && emotionHistory.length >= 2 && (
                    <div className="rounded-xl p-5 bg-fg/3 border border-fg/6 mt-4">
                        <EmotionTimeline emotionHistory={emotionHistory} agentColor={agentColor} />
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-3 mt-8 mb-8">
                    {summary && (
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                            <button
                                onClick={handleCopy}
                                className="px-5 py-2.5 rounded-full text-sm font-medium border transition-all"
                                style={{
                                    borderColor: agentColor + '60',
                                    color: agentColor,
                                    backgroundColor: copied ? agentColor + '20' : 'transparent'
                                }}
                            >
                                {copied ? t('summary.copied') : t('summary.copySummary')}
                            </button>
                            {onSaveDiary && (
                                <button
                                    onClick={() => onSaveDiary(summary)}
                                    className="px-5 py-2.5 rounded-full text-sm font-medium border border-amber-500/60 text-amber-300 hover:bg-amber-500/10 transition-all"
                                >
                                    📔 {isEs ? 'Guardar en Diario' : 'Save to Diary'}
                                </button>
                            )}
                            {onSendToTherapist && (
                                <button
                                    onClick={() => onSendToTherapist(summary)}
                                    className="px-5 py-2.5 rounded-full text-sm font-medium border border-blue-500/60 text-blue-300 hover:bg-blue-500/10 transition-all"
                                >
                                    👩‍⚕️ {isEs ? 'Enviar a Terapeuta' : 'Send to Therapist'}
                                </button>
                            )}
                        </div>
                    )}
                    <div className="flex items-center justify-center">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-full bg-fg/10 hover:bg-fg/15 text-fg text-sm font-medium transition-colors"
                        >
                            {t('summary.backHome')}
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
}

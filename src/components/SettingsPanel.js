"use client";

import { useState, useCallback } from 'react';
import { useI18n } from '@/i18n/I18nContext';

const DEFAULTS = {
    thinkingBudget: 0,
    temperature: 0.7,
    topK: 20,
    topP: 0.95,
    audioBufferSize: 2048,
    transcription: true,
    videoInterval: 2000,
    videoQuality: 0.4,
    emotionToolMode: 'unified',
};

const STORAGE_KEY = 'sanemos_settings';

export function loadSettings() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {}
    return { ...DEFAULTS };
}

function saveSettings(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

// Slider row component
function SliderRow({ label, hint, value, min, max, step, format, onChange }) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-300">{label}</span>
                <span className="text-xs font-mono text-white/80 bg-white/10 px-2 py-0.5 rounded">
                    {format ? format(value) : value}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={e => onChange(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-white/80"
                style={{ background: `linear-gradient(to right, rgba(255,255,255,0.4) ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) ${((value - min) / (max - min)) * 100}%)` }}
            />
            <p className="text-[10px] text-gray-500 leading-tight">{hint}</p>
        </div>
    );
}

export default function SettingsPanel({ settings, onChange }) {
    const { t } = useI18n();
    const [demoReset, setDemoReset] = useState(false);

    const update = useCallback((key, value) => {
        const next = { ...settings, [key]: value };
        onChange(next);
        saveSettings(next);
    }, [settings, onChange]);

    const resetDefaults = () => {
        onChange({ ...DEFAULTS });
        saveSettings({ ...DEFAULTS });
    };

    const resetDemo = () => {
        try { localStorage.removeItem('sanemos_onboarding_done'); } catch {}
        setDemoReset(true);
        setTimeout(() => setDemoReset(false), 3000);
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-white">{t('settings.title')}</h3>
                        <p className="text-[10px] text-gray-500 mt-0.5">{t('settings.subtitle')}</p>
                    </div>
                    <button
                        onClick={resetDefaults}
                        className="text-[10px] px-3 py-1 rounded-full border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        {t('settings.resetDefaults')}
                    </button>
                </div>

                {/* Grid */}
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Thinking Budget */}
                    <SliderRow
                        label={t('settings.thinkingBudget')}
                        hint={t('settings.thinkingBudgetHint')}
                        value={settings.thinkingBudget}
                        min={0} max={8192} step={256}
                        onChange={v => update('thinkingBudget', v)}
                    />

                    {/* Temperature */}
                    <SliderRow
                        label={t('settings.temperature')}
                        hint={t('settings.temperatureHint')}
                        value={settings.temperature}
                        min={0} max={2} step={0.1}
                        format={v => v.toFixed(1)}
                        onChange={v => update('temperature', v)}
                    />

                    {/* Top-K */}
                    <SliderRow
                        label={t('settings.topK')}
                        hint={t('settings.topKHint')}
                        value={settings.topK}
                        min={1} max={100} step={1}
                        onChange={v => update('topK', v)}
                    />

                    {/* Top-P */}
                    <SliderRow
                        label={t('settings.topP')}
                        hint={t('settings.topPHint')}
                        value={settings.topP}
                        min={0.1} max={1.0} step={0.05}
                        format={v => v.toFixed(2)}
                        onChange={v => update('topP', v)}
                    />

                    {/* Audio Buffer */}
                    <div className="space-y-1.5">
                        <span className="text-xs font-medium text-gray-300">{t('settings.audioBuffer')}</span>
                        <div className="flex gap-2">
                            {[1024, 2048, 4096].map(size => (
                                <button
                                    key={size}
                                    onClick={() => update('audioBufferSize', size)}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                                        settings.audioBufferSize === size
                                            ? 'bg-white/15 text-white border border-white/20'
                                            : 'bg-white/5 text-gray-500 border border-white/5 hover:bg-white/10'
                                    }`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-gray-500 leading-tight">{t('settings.audioBufferHint')}</p>
                    </div>

                    {/* Transcription toggle */}
                    <div className="space-y-1.5">
                        <span className="text-xs font-medium text-gray-300">{t('settings.transcription')}</span>
                        <button
                            onClick={() => update('transcription', !settings.transcription)}
                            className={`w-full py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                settings.transcription
                                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                    : 'bg-white/5 text-gray-500 border border-white/5'
                            }`}
                        >
                            {settings.transcription ? t('settings.on') : t('settings.off')}
                        </button>
                        <p className="text-[10px] text-gray-500 leading-tight">{t('settings.transcriptionHint')}</p>
                    </div>

                    {/* Video Interval */}
                    <SliderRow
                        label={t('settings.videoInterval')}
                        hint={t('settings.videoIntervalHint')}
                        value={settings.videoInterval}
                        min={500} max={5000} step={250}
                        format={v => `${v}ms`}
                        onChange={v => update('videoInterval', v)}
                    />

                    {/* Video Quality */}
                    <SliderRow
                        label={t('settings.videoQuality')}
                        hint={t('settings.videoQualityHint')}
                        value={settings.videoQuality}
                        min={0.1} max={1.0} step={0.1}
                        format={v => v.toFixed(1)}
                        onChange={v => update('videoQuality', v)}
                    />

                    {/* Emotion Tools mode */}
                    <div className="space-y-1.5 sm:col-span-2">
                        <span className="text-xs font-medium text-gray-300">{t('settings.emotionTools')}</span>
                        <div className="flex gap-2">
                            {['unified', 'separate'].map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => update('emotionToolMode', mode)}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                        settings.emotionToolMode === mode
                                            ? 'bg-white/15 text-white border border-white/20'
                                            : 'bg-white/5 text-gray-500 border border-white/5 hover:bg-white/10'
                                    }`}
                                >
                                    {t(`settings.${mode}`)}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-gray-500 leading-tight">{t('settings.emotionToolsHint')}</p>
                    </div>
                </div>

                {/* Reset Demo */}
                <div className="px-5 py-4 border-t border-white/[0.06] flex items-center justify-between">
                    <div>
                        <span className="text-xs font-medium text-gray-300">{t('settings.resetDemo')}</span>
                        <p className="text-[10px] text-gray-500 mt-0.5">{t('settings.resetDemoHint')}</p>
                    </div>
                    <button
                        onClick={resetDemo}
                        className={`text-[10px] px-3 py-1 rounded-full border transition-colors shrink-0 ml-4 ${
                            demoReset
                                ? 'bg-green-500/20 border-green-500/30 text-green-300'
                                : 'border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        {demoReset ? t('settings.resetDemoDone') : t('settings.resetDemo')}
                    </button>
                </div>
            </div>
        </div>
    );
}

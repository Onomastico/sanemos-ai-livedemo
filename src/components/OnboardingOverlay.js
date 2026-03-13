"use client";

import { useState } from 'react';
import { useI18n } from '@/i18n/I18nContext';

const STEPS = [
    { key: 2, emoji: '👤' },
    { key: 1, emoji: '🤖' },
    { key: 3, emoji: '🎙️' },
    { key: 4, emoji: '💬' },
    { key: 5, emoji: '⚙️' },
];

export default function OnboardingOverlay({ onClose }) {
    const { t } = useI18n();
    const [step, setStep] = useState(0);

    const handleNext = () => {
        if (step < STEPS.length - 1) {
            setStep(step + 1);
        } else {
            onClose();
        }
    };

    const current = STEPS[step];
    const isLast = step === STEPS.length - 1;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Card */}
            <div
                className="relative w-full max-w-sm mx-4 rounded-2xl border border-white/10 overflow-hidden"
                style={{ background: 'rgba(15, 15, 20, 0.95)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Step indicator dots */}
                <div className="flex justify-center gap-2 pt-5">
                    {STEPS.map((_, i) => (
                        <div
                            key={i}
                            className="w-2 h-2 rounded-full transition-all duration-300"
                            style={{
                                backgroundColor: i === step ? '#fff' : 'rgba(255,255,255,0.15)',
                                transform: i === step ? 'scale(1.3)' : 'scale(1)'
                            }}
                        />
                    ))}
                </div>

                {/* Content */}
                <div className="px-6 py-8 text-center">
                    <div className="text-5xl mb-4">{current.emoji}</div>
                    <h3 className="text-xl font-bold text-white mb-2">
                        {t(`onboarding.step${current.key}Title`)}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                        {t(`onboarding.step${current.key}`)}
                    </p>
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-full text-sm font-medium text-gray-500 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                        {t('onboarding.skip')}
                    </button>
                    <button
                        onClick={handleNext}
                        className="flex-1 py-2.5 rounded-full text-sm font-medium text-black bg-white hover:bg-gray-200 transition-colors"
                    >
                        {isLast ? t('onboarding.start') : t('onboarding.next')}
                    </button>
                </div>
            </div>
        </div>
    );
}

"use client";

import { useState, useEffect, useRef } from 'react';
import { useI18n } from '@/i18n/I18nContext';

export default function BreathingVisualizer({ exercise, agentColor, onComplete }) {
    const { t } = useI18n();
    const [phase, setPhase] = useState('inhale');
    const [currentCycle, setCurrentCycle] = useState(1);
    const [scale, setScale] = useState(0.4);
    const [done, setDone] = useState(false);
    const timerRef = useRef(null);
    const cycleRef = useRef(1);

    const PHASE_LABELS = {
        inhale: t('breathing.inhale'),
        hold: t('breathing.hold'),
        exhale: t('breathing.exhale'),
        rest: t('breathing.rest'),
        done: t('breathing.done')
    };

    useEffect(() => {
        if (!exercise) return;

        const { inhale_seconds, hold_seconds, exhale_seconds, cycles } = exercise;
        const rest_seconds = 2;
        cycleRef.current = 1;
        setCurrentCycle(1);
        setDone(false);

        const runCycle = () => {
            setPhase('inhale');
            setScale(1);

            timerRef.current = setTimeout(() => {
                if (hold_seconds > 0) {
                    setPhase('hold');
                    timerRef.current = setTimeout(() => {
                        setPhase('exhale');
                        setScale(0.4);
                        timerRef.current = setTimeout(() => {
                            cycleRef.current++;
                            if (cycleRef.current <= cycles) {
                                setPhase('rest');
                                setCurrentCycle(cycleRef.current);
                                timerRef.current = setTimeout(() => {
                                    runCycle();
                                }, rest_seconds * 1000);
                            } else {
                                setPhase('done');
                                setDone(true);
                            }
                        }, exhale_seconds * 1000);
                    }, hold_seconds * 1000);
                } else {
                    setPhase('exhale');
                    setScale(0.4);
                    timerRef.current = setTimeout(() => {
                        cycleRef.current++;
                        if (cycleRef.current <= cycles) {
                            setPhase('rest');
                            setCurrentCycle(cycleRef.current);
                            timerRef.current = setTimeout(() => {
                                runCycle();
                            }, rest_seconds * 1000);
                        } else {
                            setPhase('done');
                            setDone(true);
                        }
                    }, exhale_seconds * 1000);
                }
            }, inhale_seconds * 1000);
        };

        setScale(0.4);
        setPhase('inhale');
        timerRef.current = setTimeout(() => runCycle(), 500);

        return () => {
            clearTimeout(timerRef.current);
        };
    }, [exercise]);

    if (!exercise) return null;

    const { inhale_seconds, hold_seconds, exhale_seconds, cycles } = exercise;
    const currentDuration = phase === 'inhale' ? inhale_seconds
        : phase === 'hold' ? hold_seconds
        : phase === 'exhale' ? exhale_seconds
        : phase === 'rest' ? 2
        : 0;

    return (
        <div className="flex flex-col items-center gap-4 py-4">
            {/* Breathing circle */}
            <div className="relative flex items-center justify-center w-48 h-48">
                <div
                    className="absolute inset-0 rounded-full opacity-20"
                    style={{
                        backgroundColor: agentColor,
                        transform: `scale(${done ? 0.7 : scale * 1.15})`,
                        transition: `transform ${currentDuration || 1}s ease-in-out`,
                        filter: 'blur(20px)'
                    }}
                />
                <div
                    className="absolute inset-4 rounded-full border-2 flex items-center justify-center"
                    style={{
                        borderColor: agentColor,
                        backgroundColor: agentColor + '15',
                        transform: `scale(${done ? 0.7 : scale})`,
                        transition: `transform ${currentDuration || 1}s ease-in-out`
                    }}
                >
                    <div className="text-center">
                        <p className={`font-medium text-white ${done ? 'text-sm' : 'text-lg'}`}>
                            {PHASE_LABELS[phase]}
                        </p>
                        {!done && phase !== 'rest' && (
                            <p className="text-xs text-gray-400 mt-1">{currentDuration}s</p>
                        )}
                        {done && (
                            <button
                                onClick={() => { if (onComplete) onComplete(); }}
                                className="mt-2 text-[10px] px-3 py-1 rounded-full border transition-colors"
                                style={{ borderColor: agentColor + '60', color: agentColor }}
                            >
                                {t('breathing.close')}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Cycle counter */}
            <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                    {done ? t('breathing.completed') : t('breathing.cycleOf', { current: currentCycle, total: cycles })}
                </span>
                <div className="flex gap-1">
                    {[...Array(cycles)].map((_, i) => (
                        <div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full transition-colors duration-300"
                            style={{
                                backgroundColor: i < currentCycle ? agentColor : 'rgba(255,255,255,0.15)'
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Exercise type label */}
            <span className="text-[10px] text-gray-600 uppercase tracking-wider">
                {exercise.type === 'box' ? t('breathing.boxBreathing') : exercise.type === '478' ? t('breathing.technique478') : t('breathing.simpleBreathing')}
            </span>
        </div>
    );
}
